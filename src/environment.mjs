const PHASES = ['pending', 'loading', 'active', 'failed', 'disposed', 'unloading']

function safeIdentifier(value, fallback) {
  const text = String(value ?? '').trim()
  if (!text) return fallback
  const looksLikePath = text.startsWith('file:')
    || text.startsWith('.')
    || text.startsWith('/')
    || text.startsWith('\\')
    || /^[a-z]:[\\/]/i.test(text)
    || /(?:^|[\\/])node_modules(?:[\\/]|$)/i.test(text)
  if (looksLikePath) return fallback
  return text.replace(/[\r\n\t]/g, ' ').slice(0, 120)
}

function duplicateValues(values) {
  const counts = new Map()
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts].filter(([, count]) => count > 1).map(([value]) => value).sort()
}

function runtimeSummary() {
  return {
    nodeVersion: typeof process === 'undefined' ? null : process.version,
    operatingSystem: typeof process === 'undefined' ? null : process.platform,
  }
}

export function unavailableEnvironment(reason = 'DSH runtime inventory is not available on this surface.') {
  return {
    status: 'unavailable',
    source: 'ecosystem-only',
    profile: null,
    dshVersion: null,
    ...runtimeSummary(),
    bundles: [],
    plugins: [],
    availableTools: [],
    duplicateModules: [],
    duplicateEntryIds: [],
    limitations: [reason],
  }
}

export function notApplicableEnvironment(reason = 'A browser snapshot has no active DSH runtime to inspect.') {
  return {
    ...unavailableEnvironment(reason),
    status: 'not-applicable',
    source: 'static-snapshot',
    nodeVersion: null,
    operatingSystem: null,
  }
}

function phaseFor(entry) {
  const state = entry?.fiber?.state
  return Number.isInteger(state) && PHASES[state] ? PHASES[state] : null
}

function projectEntry(entry) {
  return {
    entryId: safeIdentifier(entry?.id ?? entry?.options?.id, '[private-entry]'),
    moduleName: safeIdentifier(entry?.options?.name, '[local-plugin]'),
    enabled: !Boolean(entry?.disabled),
    phase: phaseFor(entry),
  }
}

function readService(ctx, name) {
  try {
    if (ctx?.[name]) return ctx[name]
  } catch {
    // Some service proxies throw when an optional service is not injected.
  }
  if (typeof ctx?.get !== 'function') return null
  try {
    return ctx.get(name) ?? null
  } catch {
    return null
  }
}

export async function detectDshEnvironment(ctx) {
  const base = unavailableEnvironment()
  const limitations = []
  let loaderReadable = false
  let toolsReadable = false
  let plugins = []
  let availableTools = []

  const loader = readService(ctx, 'loader')
  if (typeof loader?.entries === 'function') {
    try {
      plugins = [...loader.entries()]
        .filter((entry) => !entry?.options?.group)
        .map(projectEntry)
      loaderReadable = true
    } catch {
      limitations.push('The DSH loader inventory could not be read; ecosystem analysis continued.')
    }
  } else {
    limitations.push('The DSH loader inventory is not exposed to this plugin context.')
  }

  const tools = readService(ctx, 'tools')
  if (typeof tools?.schemas === 'function') {
    try {
      availableTools = tools.schemas()
        .map((schema) => safeIdentifier(schema?.name, '[private-tool]'))
        .filter(Boolean)
        .sort()
      toolsReadable = true
    } catch {
      limitations.push('The active tool inventory could not be read; ecosystem analysis continued.')
    }
  } else {
    limitations.push('The active tool inventory is not exposed on this surface.')
  }

  if (!loaderReadable && !toolsReadable) {
    return { ...base, limitations: [...new Set(limitations)] }
  }

  limitations.push(
    'The active profile name is not exposed by the current public runtime API.',
    'DSH version, bundle provenance, and peer compatibility are not exposed by the current public runtime API.',
  )
  return {
    ...base,
    status: 'partial',
    source: 'dsh-runtime',
    plugins,
    availableTools,
    duplicateModules: duplicateValues(plugins.map((plugin) => plugin.moduleName)),
    duplicateEntryIds: duplicateValues(plugins.map((plugin) => plugin.entryId)),
    limitations: [...new Set(limitations)],
  }
}
