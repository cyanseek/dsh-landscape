import { interpretCapabilities, meaningfulTerms, normalizeText } from './capabilities.mjs'
import { isMature } from './maturity.mjs'
import { findPlugins } from './search.mjs'
import { competitionFor, confidenceFor, recommendationFor, verdictFor } from './verdict.mjs'
import { notApplicableEnvironment } from './environment.mjs'
import { enrichPreflight } from './preflight.mjs'

export function analyzeStaticNeed(query, options) {
  const { snapshot, aliasData, limit = 5 } = options
  const interpretedCapabilities = interpretCapabilities(query, aliasData).map((item) => item.id)
  const matches = findPlugins(query, { snapshot, aliasData, limit: Math.max(12, limit) })
  const ageHours = Math.max(0, (Date.now() - Date.parse(snapshot.generatedAt)) / 3_600_000)
  const coverage = {
    complete: Boolean(snapshot.coverage.complete),
    fresh: ageHours <= Number(snapshot.coverage.staleAfterHours ?? 24),
    generatedAt: snapshot.generatedAt,
    sources: snapshot.coverage.sources,
  }
  const verdict = verdictFor(matches, interpretedCapabilities, coverage, 'search-only')
  const mature = matches.filter((match) => isMature(match.maturity))
  const coveredCapabilities = [...new Set(mature.flatMap((match) => match.matchedCapabilities))]
  const missingCapabilities = interpretedCapabilities.filter((id) => !coveredCapabilities.includes(id))
  if (interpretedCapabilities.length === 0 && matches.length === 0) {
    missingCapabilities.push(...meaningfulTerms(query).slice(0, 5))
  }
  return enrichPreflight({
    query,
    normalizedNeed: normalizeText(query),
    interpretedCapabilities,
    verdict,
    confidence: confidenceFor(verdict, matches, coverage),
    matches: matches.slice(0, limit),
    coveredCapabilities,
    missingCapabilities,
    competition: competitionFor(matches),
    recommendation: recommendationFor(verdict),
    coverage,
    provisional: true,
  }, { environment: notApplicableEnvironment() })
}
