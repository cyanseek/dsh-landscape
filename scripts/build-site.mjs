#!/usr/bin/env node

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeNeedDeterministic } from '../src/analyze.mjs'
import { assertValidSnapshot, SCHEMA_VERSION } from '../src/schema.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const API = resolve(ROOT, 'site', 'api', 'v1')
const CORE = resolve(ROOT, 'site', 'core')
const snapshot = assertValidSnapshot(JSON.parse(await readFile(resolve(ROOT, 'data', 'snapshot.json'), 'utf8')))
const aliases = JSON.parse(await readFile(resolve(ROOT, 'data', 'capability-aliases.json'), 'utf8'))
await mkdir(API, { recursive: true })
await mkdir(CORE, { recursive: true })

async function writeJson(name, value) {
  await writeFile(resolve(API, name), `${JSON.stringify(value, null, 2)}\n`)
}

const capabilityCounts = Object.fromEntries(aliases.capabilities.map((capability) => [
  capability.id,
  snapshot.plugins.filter((plugin) => plugin.capabilities.includes(capability.id)).length,
]))
const intelligence = {
  mode: 'search-only', state: 'limited', hostAgent: null, provider: null, model: null,
  configured: false, verified: false, semanticAnalysisAvailable: false, reason: 'static-site',
}
const opportunityQueries = ['Linear integration', 'Jira integration', 'Kubernetes operations', 'Notion integration']
const opportunities = opportunityQueries.map((query) => analyzeNeedDeterministic(query, {
  snapshot,
  aliasData: aliases,
  limit: 3,
  intelligence,
})).map((analysis) => ({
  query: analysis.query,
  verdict: analysis.verdict,
  confidence: analysis.confidence,
  missingCapabilities: analysis.missingCapabilities,
  closestProjects: analysis.matches.map((match) => match.repository),
  label: 'snapshot-derived lead; not a universal gap claim',
}))

await writeJson('snapshot.json', snapshot)
await writeJson('plugins.json', { schemaVersion: SCHEMA_VERSION, generatedAt: snapshot.generatedAt, plugins: snapshot.plugins })
await writeJson('capabilities.json', { ...aliases, generatedAt: snapshot.generatedAt, counts: capabilityCounts })
await writeJson('gaps.json', { schemaVersion: SCHEMA_VERSION, generatedAt: snapshot.generatedAt, opportunities })

for (const name of ['capabilities.mjs', 'maturity.mjs', 'search.mjs', 'site-analysis.mjs', 'verdict.mjs']) {
  await copyFile(resolve(ROOT, 'src', name), resolve(CORE, name))
}
process.stdout.write(`Built static API for ${snapshot.plugins.length} plugins and ${opportunities.length} opportunity leads.\n`)
