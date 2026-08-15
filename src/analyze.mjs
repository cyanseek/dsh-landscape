import { interpretCapabilities, meaningfulTerms, normalizeText } from './capabilities.mjs'
import { verifyNeedFresh } from './fresh.mjs'
import { mergePluginRecords } from './github.mjs'
import { isMature } from './maturity.mjs'
import { requestSemanticAnalysis } from './llm.mjs'
import { findPlugins } from './search.mjs'
import { publicIntelligence, SCHEMA_VERSION } from './schema.mjs'
import { snapshotFreshness } from './snapshot.mjs'
import { competitionFor, confidenceFor, recommendationFor, verdictFor } from './verdict.mjs'
import { enrichPreflight } from './preflight.mjs'

function sourceCoverage(snapshot, freshness) {
  return {
    complete: Boolean(snapshot.coverage?.complete),
    fresh: freshness.fresh,
    generatedAt: snapshot.generatedAt,
    ageHours: freshness.ageHours,
    staleAfterHours: freshness.staleAfterHours,
    sources: snapshot.coverage?.sources ?? [],
  }
}

export function analyzeNeedDeterministic(query, options = {}) {
  const { snapshot, aliasData, limit = 10, intelligence } = options
  const interpreted = interpretCapabilities(query, aliasData)
  const capabilityIds = interpreted.map((item) => item.id)
  const matches = findPlugins(query, { snapshot, aliasData, limit: Math.max(limit, 12) })
  const freshness = snapshotFreshness(snapshot, options.now)
  const coverage = sourceCoverage(snapshot, freshness)
  const verdict = verdictFor(matches, capabilityIds, coverage, intelligence?.mode ?? 'search-only')
  const matureMatches = matches.filter((match) => isMature(match.maturity))
  const coveredCapabilities = [...new Set(matureMatches.flatMap((match) => match.matchedCapabilities))]
    .filter((id) => capabilityIds.length === 0 || capabilityIds.includes(id))
  const missingCapabilities = capabilityIds.filter((id) => !coveredCapabilities.includes(id))
  if (capabilityIds.length === 0 && matches.length === 0) {
    missingCapabilities.push(...meaningfulTerms(query).slice(0, 5))
  }

  return enrichPreflight({
    schemaVersion: SCHEMA_VERSION,
    query,
    normalizedNeed: normalizeText(query),
    interpretedCapabilities: capabilityIds,
    verdict,
    confidence: confidenceFor(verdict, matches, coverage),
    matches: matches.slice(0, limit),
    coveredCapabilities,
    missingCapabilities,
    competition: competitionFor(matches),
    recommendation: recommendationFor(verdict),
    coverage,
    evidence: matches.slice(0, 5).flatMap((match) => match.sources.map((source) => ({
      kind: 'repository-source',
      repository: match.repository,
      source: source.source,
      url: source.url,
      observedAt: source.observedAt,
    }))),
    intelligence: publicIntelligence(intelligence),
    semanticReasoningPerformed: false,
    provisional: true,
  }, options)
}

function mergeLiveSnapshot(snapshot, verification) {
  return {
    ...snapshot,
    plugins: mergePluginRecords([...snapshot.plugins, ...verification.plugins]),
    coverage: {
      ...snapshot.coverage,
      complete: Boolean(snapshot.coverage.complete && verification.complete),
      liveVerification: {
        observedAt: verification.observedAt,
        complete: verification.complete,
        attempts: verification.attempts,
      },
    },
  }
}

function applyLlmResult(analysis, semantic, intelligence) {
  let verdict = semantic.verdict
  if (['gap', 'placeholder-only'].includes(verdict) && (!analysis.coverage.complete || !analysis.coverage.fresh)) {
    verdict = 'unknown'
  }
  if (['covered', 'partial', 'crowded'].includes(verdict) && analysis.matches.length === 0) {
    verdict = 'unknown'
  }
  return enrichPreflight({
    ...analysis,
    ...semantic,
    verdict,
    recommendation: verdict === semantic.verdict ? semantic.recommendation : 'investigate',
    intelligence: publicIntelligence({
      ...intelligence,
      state: 'ready',
      verified: true,
      semanticAnalysisAvailable: true,
      reason: 'provider-request-succeeded',
    }),
    semanticReasoningPerformed: true,
    provisional: false,
  }, { environment: analysis.environment, intent: analysis.intent })
}

export async function analyzeNeed(query, options = {}) {
  let workingSnapshot = options.snapshot
  let analysis = analyzeNeedDeterministic(query, options)
  if (options.fresh && ['gap', 'placeholder-only', 'unknown'].includes(analysis.verdict)) {
    const verifyFresh = options.verifyFresh ?? verifyNeedFresh
    const verification = await verifyFresh(query, {
      aliasData: options.aliasData,
      capabilities: interpretCapabilities(query, options.aliasData),
      env: options.env,
      signal: options.signal,
      timeoutMs: options.freshTimeoutMs,
    })
    workingSnapshot = mergeLiveSnapshot(workingSnapshot, verification)
    analysis = analyzeNeedDeterministic(query, { ...options, snapshot: workingSnapshot })
    analysis.coverage.liveVerification = workingSnapshot.coverage.liveVerification
  }

  if (options.intelligence?.mode === 'standalone-llm' && options.providerConfig) {
    try {
      const semantic = await requestSemanticAnalysis(options.providerConfig, analysis, options)
      return applyLlmResult(analysis, semantic, options.intelligence)
    } catch (error) {
      const safeAnalysis = analysis.verdict === 'gap'
        ? { ...analysis, verdict: 'unknown', recommendation: 'investigate', confidence: Math.min(analysis.confidence, 0.45) }
        : analysis
      return enrichPreflight({
        ...safeAnalysis,
        intelligence: publicIntelligence({
          ...options.intelligence,
          state: 'failed',
          verified: false,
          semanticAnalysisAvailable: false,
          reason: 'provider-request-failed',
        }),
        semanticError: error.message,
        semanticReasoningPerformed: false,
        provisional: true,
      }, { environment: analysis.environment, intent: analysis.intent })
    }
  }

  return analysis
}
