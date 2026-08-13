import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeNeedDeterministic } from '../src/analyze.mjs'
import { loadAliases } from '../src/snapshot.mjs'

const aliasData = await loadAliases()
const observedAt = '2026-08-14T00:00:00.000Z'
const host = {
  mode: 'host-agent', state: 'available', hostAgent: 'codex', provider: null, model: null,
  configured: true, verified: false, semanticAnalysisAvailable: true, reason: 'host-agent-signal',
}

function plugin(id, capability, maturity = 'installable') {
  return {
    id,
    repo: id,
    url: `https://example.test/${id}`,
    name: id.split('/')[1],
    description: `${capability} integration`,
    topics: [capability],
    sources: [{ source: 'synthetic', url: `https://example.test/${id}`, observedAt }],
    capabilities: [capability],
    maturity,
    maturityEvidence: [{ kind: 'synthetic', detail: 'Test evidence.' }],
    updatedAt: observedAt,
    archived: false,
    fork: false,
    stars: 1,
    defaultBranch: 'main',
    readmeSummary: '',
    install: maturity === 'placeholder' ? { kind: 'unknown' } : { kind: 'dsh-bundle' },
  }
}

function snapshot(plugins, complete = true, generatedAt = observedAt) {
  return {
    schemaVersion: '1.0.0',
    generatedAt,
    coverage: {
      complete,
      staleAfterHours: 24,
      sources: [
        { id: 'one', status: 'ok', complete, observedAt, itemCount: plugins.length },
        { id: 'two', status: 'ok', complete, observedAt, itemCount: plugins.length },
      ],
    },
    plugins,
  }
}

function analyze(query, plugins, options = {}) {
  return analyzeNeedDeterministic(query, {
    snapshot: snapshot(plugins, options.complete, options.generatedAt),
    aliasData,
    intelligence: host,
    now: Date.parse('2026-08-14T01:00:00.000Z'),
  })
}

test('strong mature match is covered', () => {
  assert.equal(analyze('browser', [plugin('acme/browser', 'browser')]).verdict, 'covered')
})

test('missing sub-capability is partial', () => {
  const result = analyze('browser and GitHub operations', [plugin('acme/browser', 'browser')])
  assert.equal(result.verdict, 'partial')
  assert.ok(result.missingCapabilities.includes('github'))
})

test('three equivalent mature implementations are crowded', () => {
  const result = analyze('browser', [
    plugin('acme/browser-one', 'browser'),
    plugin('acme/browser-two', 'browser'),
    plugin('acme/browser-three', 'browser'),
  ])
  assert.equal(result.verdict, 'crowded')
})

test('only empty or early projects are placeholder-only', () => {
  assert.equal(analyze('linear', [plugin('acme/linear', 'linear', 'placeholder')]).verdict, 'placeholder-only')
})

test('no match with complete fresh coverage is gap in semantic mode', () => {
  assert.equal(analyze('quantum teleportation', []).verdict, 'gap')
})

test('no match with incomplete coverage is unknown', () => {
  assert.equal(analyze('quantum teleportation', [], { complete: false }).verdict, 'unknown')
})

test('no match with stale coverage is unknown', () => {
  assert.equal(analyze('quantum teleportation', [], { generatedAt: '2026-07-01T00:00:00.000Z' }).verdict, 'unknown')
})
