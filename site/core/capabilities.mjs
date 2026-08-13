const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'can', 'do', 'does', 'for', 'from', 'have', 'i',
  'if', 'in', 'into', 'is', 'it', 'me', 'my', 'native', 'of', 'on', 'or', 'plugin', 'support',
  'that', 'the', 'to', 'want', 'with', 'dsh', 'deepseek', 'harness',
])

export function normalizeText(value = '') {
  return String(value)
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenize(value = '') {
  const normalized = normalizeText(value)
  const english = normalized.match(/[a-z0-9][a-z0-9+#.-]*/g) ?? []
  const cjkSegments = normalized.match(/[\p{Script=Han}]{2,}/gu) ?? []
  const cjk = []
  for (const segment of cjkSegments) {
    cjk.push(segment)
    for (const width of [2, 3, 4]) {
      for (let index = 0; index <= segment.length - width; index += 1) {
        cjk.push(segment.slice(index, index + width))
      }
    }
  }
  return [...new Set([...english, ...cjk])]
}

function containsAlias(text, tokens, alias) {
  const normalizedAlias = normalizeText(alias)
  if (!normalizedAlias) return false
  if (/^[a-z0-9+#.-]+$/.test(normalizedAlias)) return tokens.includes(normalizedAlias)
  return text.includes(normalizedAlias)
}

export function interpretCapabilities(query, aliasData) {
  const text = normalizeText(query)
  const tokens = tokenize(text)
  const capabilities = []

  for (const definition of aliasData.capabilities ?? []) {
    const matchedAliases = (definition.aliases ?? []).filter((alias) => containsAlias(text, tokens, alias))
    if (matchedAliases.length > 0) {
      capabilities.push({
        id: definition.id,
        label: definition.label,
        labelZh: definition.labelZh,
        matchedAliases: [...new Set(matchedAliases.map(normalizeText))],
      })
    }
  }

  return capabilities
}

export function meaningfulTerms(query) {
  return tokenize(query).filter((term) => term.length > 1 && !STOP_WORDS.has(term))
}

export function aliasesForCapability(capabilityId, aliasData) {
  const definition = (aliasData.capabilities ?? []).find((item) => item.id === capabilityId)
  return definition ? [definition.id, ...(definition.aliases ?? [])].map(normalizeText) : [capabilityId]
}

export function inferPluginCapabilities(plugin, aliasData) {
  const text = normalizeText([
    plugin.name,
    plugin.description,
    ...(plugin.topics ?? []),
    plugin.readmeSummary,
  ].filter(Boolean).join(' '))
  return interpretCapabilities(text, aliasData).map((item) => item.id)
}
