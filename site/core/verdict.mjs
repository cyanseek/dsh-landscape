import { isMature } from './maturity.mjs'

export function competitionFor(matches) {
  const mature = matches.filter((match) => isMature(match.maturity) && !match.archived)
  if (mature.length >= 3) return 'high'
  if (mature.length === 2) return 'medium'
  if (mature.length === 1) return 'low'
  return matches.length > 0 ? 'low' : 'none'
}

export function verdictFor(matches, capabilityIds, coverage, intelligenceMode) {
  if (matches.length === 0) {
    if (intelligenceMode !== 'search-only' && coverage.complete && coverage.fresh) return 'gap'
    return 'unknown'
  }
  const mature = matches.filter((match) => isMature(match.maturity) && !match.archived)
  const unresolved = matches.filter((match) => match.maturity === 'unknown')
  const onlyEarly = matches.every((match) => ['placeholder', 'prototype'].includes(match.maturity))
  if (mature.length >= 3) return 'crowded'
  if (mature.length > 0) {
    if (capabilityIds.length === 0) return 'covered'
    const covered = new Set(mature.flatMap((match) => match.matchedCapabilities))
    return capabilityIds.every((id) => covered.has(id)) ? 'covered' : 'partial'
  }
  if (onlyEarly) return 'placeholder-only'
  if (unresolved.length > 0) return 'unknown'
  return 'partial'
}

export function recommendationFor(verdict) {
  return {
    covered: 'use',
    partial: 'extend',
    crowded: 'avoid-duplication',
    'placeholder-only': 'build',
    gap: 'build',
    unknown: 'investigate',
  }[verdict]
}

export function confidenceFor(verdict, matches, coverage) {
  let confidence = coverage.complete ? 0.68 : 0.42
  if (coverage.fresh) confidence += 0.12
  if (matches[0]?.score >= 30) confidence += 0.1
  if (['gap', 'placeholder-only'].includes(verdict) && !coverage.complete) confidence = Math.min(confidence, 0.45)
  if (verdict === 'unknown') confidence = Math.min(confidence, 0.5)
  return Math.max(0.1, Math.min(0.96, Math.round(confidence * 100) / 100))
}
