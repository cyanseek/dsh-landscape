#!/usr/bin/env node

import { readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inferPluginCapabilities } from '../src/capabilities.mjs'
import { mergePluginRecords, pluginFromGitHub } from '../src/github.mjs'
import { classifyMaturity } from '../src/maturity.mjs'
import { assertValidSnapshot, SCHEMA_VERSION } from '../src/schema.mjs'
import { loadAliases } from '../src/snapshot.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_OUTPUT = resolve(ROOT, 'data', 'snapshot.json')
const AWESOME_RAW = 'https://raw.githubusercontent.com/0xsline/awesome-deepseek-harness/main/CATALOG.md'
const AWESOME_PUBLIC = 'https://github.com/0xsline/awesome-deepseek-harness/blob/main/CATALOG.md'
const SOURCE_RESPONSE_LIMIT = 5_000_000
const ENRICHMENT_FILE_LIMIT = 750_000

function parseArgs(argv) {
  const options = { output: DEFAULT_OUTPUT, maxEnrich: 140 }
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--output') options.output = resolve(process.cwd(), argv[++index])
    else if (argv[index] === '--max-enrich') options.maxEnrich = Number(argv[++index])
    else throw new Error(`Unknown option: ${argv[index]}`)
  }
  if (!Number.isInteger(options.maxEnrich) || options.maxEnrich < 0 || options.maxEnrich > 1000) {
    throw new Error('--max-enrich must be an integer from 0 to 1000')
  }
  return options
}

function githubHeaders() {
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'dsh-landscape-scanner/0.1.0',
  }
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return headers
}

async function readResponseText(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`response exceeds ${maxBytes} bytes`)
  }
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error(`response exceeds ${maxBytes} bytes`)
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks, total).toString('utf8')
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    headers: options.headers ?? { 'user-agent': 'dsh-landscape-scanner/0.1.0' },
    signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
  })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return readResponseText(response, options.maxBytes ?? SOURCE_RESPONSE_LIMIT)
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url, { headers: githubHeaders(), timeoutMs: 15_000 }))
}

async function scanTopic(observedAt, aliasData) {
  const repositories = new Map()
  let totalCount = 0
  let passes = 0
  for (let pass = 1; pass <= 2; pass += 1) {
    passes = pass
    let passReceived = 0
    for (let page = 1; page <= 10; page += 1) {
      const url = new URL('https://api.github.com/search/repositories')
      url.searchParams.set('q', 'topic:dsh-plugin')
      url.searchParams.set('per_page', '100')
      url.searchParams.set('page', String(page))
      // Stable ordering matters for complete pagination; each repository still carries its own updatedAt.
      url.searchParams.set('sort', 'stars')
      url.searchParams.set('order', 'desc')
      const payload = await fetchJson(url)
      totalCount = payload.total_count ?? 0
      const items = payload.items ?? []
      passReceived += items.length
      for (const repository of items) {
        repositories.set(repository.full_name.toLocaleLowerCase('en-US'), repository)
      }
      if (passReceived >= totalCount || items.length === 0) break
    }
    if (totalCount > 1000 || repositories.size >= totalCount) break
  }
  const unique = [...repositories.values()]
  return {
    repositories: unique,
    plugins: unique.map((repo) => pluginFromGitHub(repo, { aliasData, observedAt })),
    source: {
      id: 'github-topic',
      url: 'https://github.com/topics/dsh-plugin',
      observedAt,
      status: 'ok',
      complete: totalCount <= 1000 && unique.length >= totalCount,
      itemCount: unique.length,
      reportedTotal: totalCount,
      passes,
    },
  }
}

function plainDescription(value) {
  return String(value)
    .replace(/<!--.*?-->/g, '')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
}

function parseAwesome(markdown, observedAt, aliasData) {
  const plugins = []
  const seen = new Set()
  const listLink = /^\s*[-*]\s+\[([^\]]+)\]\((https:\/\/github\.com\/([^/\s)]+)\/([^/#\s)]+)(?:#[^)]+)?)\)\s*(?:[-–—:]\s*)?(.*)$/i
  const tableLink = /^\s*\|\s*\[([^\]]+)\]\((https:\/\/github\.com\/([^/\s)]+)\/([^/#\s)]+)(?:#[^)]+)?)\)\s*\|\s*(.*?)\s*\|\s*$/i
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(listLink) ?? line.match(tableLink)
    if (!match) continue
    const owner = match[3]
    const repoName = match[4].replace(/\.git$/i, '')
    const id = `${owner}/${repoName}`.toLocaleLowerCase('en-US')
    if (seen.has(id)) continue
    seen.add(id)
    const description = plainDescription(match[5])
    const base = {
      id,
      repo: id,
      url: `https://github.com/${owner}/${repoName}`,
      name: match[1],
      description,
      topics: [],
      sources: [{ source: 'awesome-catalog', url: AWESOME_PUBLIC, observedAt }],
      capabilities: [],
      maturity: 'unknown',
      maturityEvidence: [{ kind: 'insufficient-evidence', detail: 'Catalog listing alone does not establish implementation maturity.', url: AWESOME_PUBLIC }],
      updatedAt: null,
      archived: false,
      fork: false,
      stars: null,
      defaultBranch: 'main',
      readmeSummary: '',
      install: { kind: 'unknown' },
    }
    if (/\b(?:placeholder|wip|work in progress)\b|占位|占坑/i.test(description)) {
      base.maturity = 'placeholder'
      base.maturityEvidence = [{ kind: 'catalog-claim', detail: 'The catalog explicitly labels this project placeholder/WIP.', url: AWESOME_PUBLIC }]
    }
    base.capabilities = inferPluginCapabilities(base, aliasData)
    plugins.push(base)
  }
  return plugins
}

async function scanAwesome(observedAt, aliasData) {
  const markdown = await fetchText(AWESOME_RAW)
  const plugins = parseAwesome(markdown, observedAt, aliasData)
  if (plugins.length === 0) throw new Error('Awesome catalog parser found no repository entries')
  return {
    plugins,
    source: {
      id: 'awesome-catalog',
      url: AWESOME_PUBLIC,
      observedAt,
      status: 'ok',
      complete: true,
      itemCount: plugins.length,
    },
  }
}

async function rawFile(plugin, path) {
  const branches = [...new Set([plugin.defaultBranch, 'main', 'master'].filter(Boolean))]
  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${plugin.id}/${encodeURIComponent(branch)}/${path}`
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'dsh-landscape-scanner/0.1.0' },
        signal: AbortSignal.timeout(5000),
      })
      if (response.ok) return { content: await readResponseText(response, ENRICHMENT_FILE_LIMIT), branch }
      if (response.status !== 404) return null
    } catch {
      return null
    }
  }
  return null
}

function readmeSummary(markdown) {
  const lines = markdown
    .replace(/<!--[^]*?-->/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !/^\[?!?\[/.test(line) && !line.startsWith('<'))
  return plainDescription(lines.slice(0, 4).join(' ')).slice(0, 600)
}

async function enrichPlugin(plugin, repository) {
  const [packageFile, readmeFile] = await Promise.all([
    rawFile(plugin, 'package.json'),
    rawFile(plugin, 'README.md'),
  ])
  let packageData = null
  if (packageFile) {
    try {
      packageData = JSON.parse(packageFile.content)
    } catch {
      // Invalid external JSON remains evidence-free rather than failing the scan.
    }
  }
  const readme = readmeFile?.content ?? ''
  const classified = classifyMaturity({
    id: plugin.id,
    size: repository?.size ?? null,
    description: plugin.description,
    readme,
    packageData,
    repositoryUrl: plugin.url,
    defaultBranch: packageFile?.branch ?? readmeFile?.branch ?? plugin.defaultBranch,
  })
  const enriched = {
    ...plugin,
    ...classified,
    defaultBranch: packageFile?.branch ?? readmeFile?.branch ?? plugin.defaultBranch,
    readmeSummary: readmeSummary(readme),
  }
  return enriched
}

async function mapConcurrent(items, concurrency, callback) {
  const output = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      output[index] = await callback(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return output
}

function stripVolatile(value) {
  if (Array.isArray(value)) return value.map(stripVolatile)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['generatedAt', 'observedAt'].includes(key))
    .map(([key, item]) => [key, stripVolatile(item)]))
}

async function readExisting(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return null
  }
}

async function writeAtomic(path, value) {
  const temporary = `${path}.tmp-${process.pid}`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`)
  await rename(temporary, path)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const aliasData = await loadAliases()
  const observedAt = new Date().toISOString()
  const existing = await readExisting(options.output)
  const failures = []
  let topic = null
  let awesome = null
  try {
    topic = await scanTopic(observedAt, aliasData)
  } catch (error) {
    failures.push({ source: 'github-topic', error: error.message })
  }
  try {
    awesome = await scanAwesome(observedAt, aliasData)
  } catch (error) {
    failures.push({ source: 'awesome-catalog', error: error.message })
  }

  const previousAwesome = existing?.coverage?.sources?.find((source) => source.id === 'awesome-catalog')
  if (awesome && Number(previousAwesome?.itemCount) >= 20 && awesome.plugins.length < previousAwesome.itemCount * 0.75) {
    failures.push({
      source: 'awesome-catalog',
      error: `parsed item count fell from ${previousAwesome.itemCount} to ${awesome.plugins.length}`,
    })
    awesome = null
  }

  if (failures.length > 0 && existing) {
    process.stderr.write(`Snapshot preserved because a source failed: ${failures.map((item) => `${item.source}: ${item.error}`).join('; ')}\n`)
    process.exitCode = 2
    return
  }
  if (!topic && !awesome) throw new Error('All ecosystem sources failed and no previous snapshot exists')

  let plugins = mergePluginRecords([...(topic?.plugins ?? []), ...(awesome?.plugins ?? [])])
  const repositories = new Map((topic?.repositories ?? []).map((repo) => [repo.full_name.toLocaleLowerCase('en-US'), repo]))
  const priority = [...plugins].sort((left, right) => {
    const leftCatalog = left.sources.some((source) => source.source === 'awesome-catalog') ? 1 : 0
    const rightCatalog = right.sources.some((source) => source.source === 'awesome-catalog') ? 1 : 0
    return rightCatalog - leftCatalog || Number(right.stars ?? 0) - Number(left.stars ?? 0) || left.id.localeCompare(right.id)
  }).slice(0, options.maxEnrich)
  const enriched = await mapConcurrent(priority, 12, (plugin) => enrichPlugin(plugin, repositories.get(plugin.id)))
  plugins = mergePluginRecords([
    ...plugins.filter((plugin) => !priority.some((candidate) => candidate.id === plugin.id)),
    ...enriched.map((plugin) => ({ ...plugin, capabilities: inferPluginCapabilities(plugin, aliasData) })),
  ])

  const sources = [
    topic?.source ?? { id: 'github-topic', url: 'https://github.com/topics/dsh-plugin', observedAt, status: 'failed', complete: false, itemCount: 0 },
    awesome?.source ?? { id: 'awesome-catalog', url: AWESOME_PUBLIC, observedAt, status: 'failed', complete: false, itemCount: 0 },
  ]
  const snapshot = assertValidSnapshot({
    schemaVersion: SCHEMA_VERSION,
    generatedAt: observedAt,
    project: 'dsh-landscape',
    coverage: {
      complete: sources.every((source) => source.status === 'ok' && source.complete),
      staleAfterHours: 12,
      sources,
      enrichment: { attempted: priority.length, boundedLimit: options.maxEnrich },
    },
    plugins,
  })

  if (existing && JSON.stringify(stripVolatile(existing)) === JSON.stringify(stripVolatile(snapshot))) {
    process.stdout.write(`Snapshot unchanged (${plugins.length} plugins); existing generatedAt preserved.\n`)
    return
  }
  await writeAtomic(options.output, snapshot)
  process.stdout.write(`Wrote ${plugins.length} plugins from ${sources.length} sources to ${options.output}.\n`)
}

main().catch((error) => {
  process.stderr.write(`scan: ${error.message}\n`)
  process.exitCode = 1
})
