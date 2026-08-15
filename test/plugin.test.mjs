import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { apply, createLandscapeTool, inject, name } from '../src/plugin.mjs'
import { loadAliases } from '../src/snapshot.mjs'

const observedAt = '2099-01-01T00:00:00.000Z'
const syntheticSnapshot = {
  schemaVersion: '1.0.0',
  generatedAt: observedAt,
  coverage: {
    complete: true,
    staleAfterHours: 24,
    sources: [
      { id: 'one', status: 'ok', complete: true, observedAt, itemCount: 1 },
      { id: 'two', status: 'ok', complete: true, observedAt, itemCount: 1 },
    ],
  },
  plugins: [{
    id: 'acme/browser-kit',
    repo: 'acme/browser-kit',
    url: 'https://example.test/acme/browser-kit',
    name: 'browser-kit',
    description: 'Browser automation integration',
    topics: ['browser'],
    sources: [{ source: 'synthetic', url: 'https://example.test/acme/browser-kit', observedAt }],
    capabilities: ['browser'],
    maturity: 'installable',
    maturityEvidence: [{ kind: 'synthetic', detail: 'Test evidence.' }],
    updatedAt: observedAt,
    archived: false,
    fork: false,
    stars: 1,
    defaultBranch: 'main',
    readmeSummary: '',
    install: { kind: 'dsh-bundle' },
  }],
}

test('registers the DSH runtime tool through the tools service', () => {
  let definition
  apply({ tools: { register(candidate) { definition = candidate } } })
  assert.equal(name, 'dsh-landscape')
  assert.deepEqual(inject, ['tools'])
  assert.equal(definition.name, 'dsh_landscape')
  assert.ok(definition.output.schema.required.includes('verdict'))
  assert.ok(definition.output.schema.required.includes('decision'))
  assert.deepEqual(definition.output.schema.properties.decision.enum, [
    'USE', 'INSTALL', 'COMPOSE', 'EXTEND', 'BUILD', 'WAIT', 'DISABLE', 'INVESTIGATE',
  ])
  assert.ok(!JSON.stringify(definition.output.schema).includes('"required":true'))
})

test('executes an evidence lookup with injected deterministic data', async () => {
  const aliasData = await loadAliases()
  const tool = createLandscapeTool({
    loadAliases: async () => aliasData,
    loadSnapshot: async () => ({ snapshot: syntheticSnapshot, provenance: 'synthetic' }),
    now: Date.parse('2099-01-01T01:00:00.000Z'),
  })
  const result = await tool.execute(
    { need: 'browser automation', limit: 5, fresh: false },
    { signal: new AbortController().signal },
  )
  assert.equal(result.verdict, 'covered')
  assert.equal(result.matches[0].repository, 'acme/browser-kit')
  assert.equal(result.intelligence.mode, 'host-agent')
  assert.equal(result.intelligence.hostAgent, 'dsh')
  assert.equal(result.provisional, true)
  assert.match(tool.output.render({}, result)[0].text, /COVERED/)
})

test('only need is required and environment inspection is best-effort', async () => {
  const aliasData = await loadAliases()
  const tool = createLandscapeTool({
    loadAliases: async () => aliasData,
    loadSnapshot: async () => ({ snapshot: syntheticSnapshot, provenance: 'synthetic' }),
    detectEnvironment: async () => ({
      status: 'detected', source: 'synthetic-runtime', profile: 'test', dshVersion: 'test',
      nodeVersion: process.version, operatingSystem: process.platform, bundles: [], plugins: [],
      availableTools: ['dsh_landscape'], duplicateModules: [], duplicateEntryIds: [], limitations: [],
    }),
    now: Date.parse('2099-01-01T01:00:00.000Z'),
  })
  const result = await tool.execute({ need: 'browser automation' }, { signal: new AbortController().signal })
  assert.equal(result.verdict, 'covered')
  assert.equal(result.environment.status, 'detected')
  assert.equal(result.decision, 'USE')
})

test('rejects invalid model arguments before lookup', async () => {
  const tool = createLandscapeTool()
  await assert.rejects(tool.execute({ need: '', limit: 99 }, {}), /non-empty string/)
})

test('declares a build-free DSH bundle that mounts the plugin export', async () => {
  const [manifestText, patchText] = await Promise.all([
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
    readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8'),
  ])
  const manifest = JSON.parse(manifestText)
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.exports['./plugin'], './src/plugin.mjs')
  assert.ok(manifest.files.includes('cordis.patch.yml'))
  assert.match(patchText, /name: 'dsh-landscape\/plugin'/)
  assert.equal(manifest.scripts.prepare, undefined)
  assert.equal(manifest.scripts.prepack, undefined)
  assert.ok(manifest.scripts['release:check'])
})
