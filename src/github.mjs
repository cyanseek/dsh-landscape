import { inferPluginCapabilities } from './capabilities.mjs'
import { classifyMaturity } from './maturity.mjs'

export function pluginFromGitHub(repository, options = {}) {
  const observedAt = options.observedAt ?? new Date().toISOString()
  const id = String(repository.full_name ?? repository.id ?? '').toLocaleLowerCase('en-US')
  const url = repository.html_url ?? `https://github.com/${id}`
  const base = {
    id,
    repo: id,
    url,
    name: repository.name ?? id.split('/').at(-1),
    description: repository.description ?? '',
    topics: [...new Set(repository.topics ?? [])].sort(),
    sources: options.sources ?? [{ source: 'github-topic', url, observedAt }],
    capabilities: [],
    maturity: 'unknown',
    maturityEvidence: [],
    updatedAt: repository.pushed_at ?? repository.updated_at ?? null,
    archived: Boolean(repository.archived),
    fork: Boolean(repository.fork),
    stars: Number.isFinite(repository.stargazers_count) ? repository.stargazers_count : null,
    defaultBranch: repository.default_branch ?? 'main',
    readmeSummary: options.readmeSummary ?? '',
    install: { kind: 'unknown' },
  }
  const classified = classifyMaturity({
    id,
    size: repository.size,
    description: base.description,
    readme: options.readme ?? '',
    packageData: options.packageData ?? null,
    hasWorkflow: options.hasWorkflow ?? false,
    repositoryUrl: url,
    defaultBranch: base.defaultBranch,
  })
  Object.assign(base, classified)
  base.capabilities = inferPluginCapabilities(base, options.aliasData ?? { capabilities: [] })
  return base
}

export function mergePluginRecords(records) {
  const merged = new Map()
  for (const record of records) {
    if (!record?.id) continue
    const id = record.id.toLocaleLowerCase('en-US')
    const existing = merged.get(id)
    if (!existing) {
      merged.set(id, { ...record, id, repo: id })
      continue
    }
    const sourceKey = (source) => `${source.source}|${source.url}`
    const sources = [...(existing.sources ?? []), ...(record.sources ?? [])]
    const maturityRank = { unknown: 0, placeholder: 1, prototype: 2, installable: 3, tested: 4, verified: 5 }
    const stronger = (maturityRank[record.maturity] ?? 0) > (maturityRank[existing.maturity] ?? 0) ? record : existing
    merged.set(id, {
      ...existing,
      description: existing.description || record.description,
      topics: [...new Set([...(existing.topics ?? []), ...(record.topics ?? [])])].sort(),
      sources: [...new Map(sources.map((source) => [sourceKey(source), source])).values()]
        .sort((left, right) => sourceKey(left).localeCompare(sourceKey(right))),
      capabilities: [...new Set([...(existing.capabilities ?? []), ...(record.capabilities ?? [])])].sort(),
      maturity: stronger.maturity,
      maturityEvidence: stronger.maturityEvidence,
      install: stronger.install,
      readmeSummary: existing.readmeSummary || record.readmeSummary,
      archived: Boolean(existing.archived || record.archived),
      fork: Boolean(existing.fork || record.fork),
      stars: Math.max(existing.stars ?? 0, record.stars ?? 0),
      updatedAt: [existing.updatedAt, record.updatedAt].filter(Boolean).sort().at(-1) ?? null,
    })
  }
  return [...merged.values()].sort((left, right) => left.id.localeCompare(right.id))
}
