export const SCHEMA_VERSION = '1.0.0'

export const MATURITY_LEVELS = Object.freeze([
  'placeholder',
  'prototype',
  'installable',
  'tested',
  'verified',
  'unknown',
])

export const VERDICTS = Object.freeze([
  'covered',
  'partial',
  'crowded',
  'placeholder-only',
  'gap',
  'unknown',
])

export const RECOMMENDATIONS = Object.freeze([
  'use',
  'extend',
  'build',
  'avoid-duplication',
  'investigate',
])

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function validatePlugin(plugin, index = '?') {
  const errors = []
  const at = `plugins[${index}]`
  if (!isObject(plugin)) return [`${at} must be an object`]
  if (!/^[^/\s]+\/[^/\s]+$/.test(plugin.id ?? '')) errors.push(`${at}.id must be owner/repo`)
  if (plugin.repo !== plugin.id) errors.push(`${at}.repo must equal id`)
  if (!isHttpUrl(plugin.url)) errors.push(`${at}.url must be an HTTP(S) URL`)
  if (typeof plugin.name !== 'string' || plugin.name.length === 0) errors.push(`${at}.name is required`)
  if (typeof plugin.description !== 'string') errors.push(`${at}.description must be a string`)
  if (!Array.isArray(plugin.topics)) errors.push(`${at}.topics must be an array`)
  if (!Array.isArray(plugin.sources) || plugin.sources.length === 0) errors.push(`${at}.sources must not be empty`)
  if (!Array.isArray(plugin.capabilities)) errors.push(`${at}.capabilities must be an array`)
  if (!MATURITY_LEVELS.includes(plugin.maturity)) errors.push(`${at}.maturity is invalid`)
  if (!Array.isArray(plugin.maturityEvidence)) errors.push(`${at}.maturityEvidence must be an array`)
  return errors
}

export function validateSnapshot(snapshot) {
  const errors = []
  if (!isObject(snapshot)) return ['snapshot must be an object']
  if (snapshot.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}`)
  if (Number.isNaN(Date.parse(snapshot.generatedAt))) errors.push('generatedAt must be an ISO date')
  if (!isObject(snapshot.coverage)) {
    errors.push('coverage must be an object')
  } else {
    if (typeof snapshot.coverage.complete !== 'boolean') errors.push('coverage.complete must be boolean')
    if (!Array.isArray(snapshot.coverage.sources) || snapshot.coverage.sources.length < 2) {
      errors.push('coverage.sources must contain at least two sources')
    }
  }
  if (!Array.isArray(snapshot.plugins)) {
    errors.push('plugins must be an array')
  } else {
    const ids = new Set()
    snapshot.plugins.forEach((plugin, index) => {
      errors.push(...validatePlugin(plugin, index))
      if (ids.has(plugin.id)) errors.push(`plugins[${index}].id is duplicated`)
      ids.add(plugin.id)
    })
  }
  return errors
}

export function assertValidSnapshot(snapshot) {
  const errors = validateSnapshot(snapshot)
  if (errors.length > 0) {
    throw new Error(`Invalid DSH Landscape snapshot:\n- ${errors.join('\n- ')}`)
  }
  return snapshot
}

export function publicIntelligence(value) {
  const allowed = [
    'mode',
    'state',
    'hostAgent',
    'provider',
    'model',
    'configured',
    'verified',
    'semanticAnalysisAvailable',
    'reason',
  ]
  return Object.fromEntries(allowed.map((key) => [key, value?.[key] ?? null]))
}
