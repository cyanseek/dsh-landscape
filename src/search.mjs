import {
  aliasesForCapability,
  interpretCapabilities,
  meaningfulTerms,
  normalizeText,
  tokenize,
} from './capabilities.mjs'
import { maturityWeight } from './maturity.mjs'

function pluginText(plugin) {
  return normalizeText([
    plugin.id,
    plugin.name,
    plugin.description,
    ...(plugin.topics ?? []),
    ...(plugin.capabilities ?? []),
    plugin.readmeSummary,
  ].filter(Boolean).join(' '))
}

function termWeight(term, plugin, text) {
  const name = normalizeText(plugin.name)
  const repo = normalizeText(plugin.repo)
  const topics = new Set((plugin.topics ?? []).map(normalizeText))
  if (name === term || repo === term) return 28
  if (name.includes(term) || repo.includes(term)) return 12
  if (topics.has(term)) return 8
  if (text.includes(term)) return 3
  return 0
}

export function scorePlugin(plugin, query, aliasData) {
  const normalizedQuery = normalizeText(query)
  const text = pluginText(plugin)
  const queryTokens = meaningfulTerms(query)
  const interpreted = interpretCapabilities(query, aliasData)
  const matchedTerms = []
  const matchedCapabilities = []
  let score = 0

  if (normalizedQuery && [normalizeText(plugin.id), normalizeText(plugin.name)].includes(normalizedQuery)) {
    score += 100
  } else if (normalizedQuery.length > 2 && text.includes(normalizedQuery)) {
    score += 30
  }

  for (const term of queryTokens) {
    const weight = termWeight(term, plugin, text)
    if (weight > 0) {
      score += weight
      matchedTerms.push(term)
    }
  }

  for (const capability of interpreted) {
    const aliases = aliasesForCapability(capability.id, aliasData)
    const explicit = (plugin.capabilities ?? []).includes(capability.id)
    const aliasMatches = aliases.filter((alias) => {
      const tokens = tokenize(text)
      return alias.includes(' ') ? text.includes(alias) : tokens.includes(alias)
    })
    if (explicit || aliasMatches.length > 0) {
      score += explicit ? 24 : 10
      matchedCapabilities.push(capability.id)
      matchedTerms.push(...aliasMatches)
    }
  }

  if (plugin.archived) score *= 0.2
  if (plugin.fork) score *= 0.75
  score *= 0.65 + (maturityWeight(plugin.maturity) * 0.35)

  return {
    score: Math.round(score * 100) / 100,
    matchedTerms: [...new Set(matchedTerms)].sort(),
    matchedCapabilities: [...new Set(matchedCapabilities)].sort(),
  }
}

export function findPlugins(query, options = {}) {
  const { snapshot, aliasData, limit = 10, includeArchived = false } = options
  if (!snapshot || !aliasData) throw new Error('findPlugins requires snapshot and aliasData')
  if (!String(query).trim()) throw new Error('A non-empty query is required')

  return snapshot.plugins
    .filter((plugin) => includeArchived || !plugin.archived)
    .map((plugin) => ({ plugin, ...scorePlugin(plugin, query, aliasData) }))
    .filter((match) => match.score > 0)
    .sort((left, right) => (
      right.score - left.score
      || Number(right.plugin.stars ?? 0) - Number(left.plugin.stars ?? 0)
      || left.plugin.id.localeCompare(right.plugin.id)
    ))
    .slice(0, Math.max(1, Math.min(Number(limit) || 10, 100)))
    .map((match, index) => ({
      rank: index + 1,
      repository: match.plugin.id,
      url: match.plugin.url,
      description: match.plugin.description,
      maturity: match.plugin.maturity,
      archived: Boolean(match.plugin.archived),
      fork: Boolean(match.plugin.fork),
      stars: match.plugin.stars ?? null,
      updatedAt: match.plugin.updatedAt ?? null,
      matchedTerms: match.matchedTerms,
      matchedCapabilities: match.matchedCapabilities,
      score: match.score,
      sources: match.plugin.sources,
      maturityEvidence: match.plugin.maturityEvidence,
      install: match.plugin.install ?? { kind: 'unknown' },
    }))
}
