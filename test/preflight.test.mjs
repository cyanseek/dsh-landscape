import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { analyzeNeed, analyzeNeedDeterministic } from '../src/analyze.mjs'
import { buildBrief } from '../src/brief.mjs'
import { detectDshEnvironment } from '../src/environment.mjs'
import { inferPreflightIntent } from '../src/intent.mjs'
import { loadAliases } from '../src/snapshot.mjs'

const aliasData = await loadAliases()
const snapshot = JSON.parse(await readFile(new URL('fixtures/snapshot.json', import.meta.url), 'utf8'))
const host = {
  mode: 'host-agent', state: 'available', hostAgent: 'dsh', provider: null, model: null,
  configured: true, verified: false, semanticAnalysisAvailable: true, reason: 'host-agent-signal',
}
const now = Date.parse('2099-01-01T01:00:00.000Z')

function analyze(query, options = {}) {
  return analyzeNeedDeterministic(query, { snapshot, aliasData, intelligence: host, now, ...options })
}

test('infers change intent from English and Chinese without a mode argument', () => {
  assert.equal(inferPreflightIntent('Install browser automation for DSH').kind, 'install')
  assert.equal(inferPreflightIntent('升级当前的浏览器插件').kind, 'upgrade')
  assert.equal(inferPreflightIntent('Should we build a Linear integration?').kind, 'build')
  assert.equal(inferPreflightIntent('看看浏览器能力').kind, 'assess')
})
test('one need produces additive preflight fields and preserves the legacy contract', () => {
  const result = analyze('Install browser automation for DSH')
  assert.equal(result.intent.kind, 'install')
  assert.equal(result.environment.status, 'unavailable')
  assert.equal(result.decision, 'INSTALL')
  assert.match(result.nextAction, /acme\/browser-kit/)
  assert.ok(result.doNotBuild.some((item) => item.includes('acme/browser-kit')))

  const legacyKeys = [
    'schemaVersion', 'query', 'normalizedNeed', 'interpretedCapabilities', 'verdict', 'confidence',
    'matches', 'coveredCapabilities', 'missingCapabilities', 'competition', 'recommendation',
    'coverage', 'evidence', 'intelligence', 'semanticReasoningPerformed', 'provisional',
  ]
  for (const key of legacyKeys) assert.ok(Object.hasOwn(result, key), `legacy field missing: ${key}`)
})

test('an old brief consumer still works when all new fields are absent', () => {
  const result = analyze('browser automation')
  for (const key of ['intent', 'environment', 'decision', 'risks', 'doNotBuild', 'buildOnly', 'nextAction', 'limitations']) {
    delete result[key]
  }
  const brief = buildBrief(result)
  assert.equal(brief.verdict, 'covered')
  assert.equal(brief.decision, null)
  assert.deepEqual(brief.risks, [])
})

test('read-only DSH inventory is sanitized and reports duplicates without mutations', async () => {
  const calls = { entries: 0, schemas: 0, create: 0, update: 0, remove: 0 }
  const entries = [
    { id: '/Users/private/profile-entry', options: { name: 'file:///Users/private/local-plugin.mjs', config: { token: 'TOP-SECRET' } }, disabled: false, fiber: { state: 2 } },
    { id: 'browser-one', options: { name: '@acme/browser' }, disabled: false, fiber: { state: 2 } },
    { id: 'browser-two', options: { name: '@acme/browser' }, disabled: true },
  ]
  const environment = await detectDshEnvironment({
    loader: {
      entries() { calls.entries += 1; return entries },
      create() { calls.create += 1 },
      update() { calls.update += 1 },
      remove() { calls.remove += 1 },
    },
    tools: { schemas() { calls.schemas += 1; return [{ name: 'dsh_landscape' }, { name: 'browser' }] } },
  })

  assert.equal(environment.status, 'partial')
  assert.equal(environment.plugins[0].entryId, '[private-entry]')
  assert.equal(environment.plugins[0].moduleName, '[local-plugin]')
  assert.deepEqual(environment.duplicateModules, ['@acme/browser'])
  assert.deepEqual(calls, { entries: 1, schemas: 1, create: 0, update: 0, remove: 0 })
  const serialized = JSON.stringify(environment)
  assert.ok(!serialized.includes('/Users/private'))
  assert.ok(!serialized.includes('TOP-SECRET'))
})

test('runtime detection failure downgrades to unavailable and ecosystem analysis continues', async () => {
  const environment = await detectDshEnvironment({
    loader: { entries() { throw new Error('private failure detail') } },
    tools: { schemas() { throw new Error('another private detail') } },
  })
  assert.equal(environment.status, 'unavailable')
  assert.ok(!JSON.stringify(environment).includes('private failure detail'))
  const result = analyze('browser automation', { environment })
  assert.equal(result.verdict, 'covered')
  assert.equal(result.environment.status, 'unavailable')
})

test('failed fresh discovery cannot turn an uncertain negative result into a gap', async () => {
  const result = await analyzeNeed('quantum teleportation for DSH', {
    snapshot,
    aliasData,
    intelligence: host,
    now,
    fresh: true,
    verifyFresh: async () => ({
      plugins: [], complete: false, observedAt: '2099-01-01T01:00:00.000Z',
      attempts: [{ source: 'github-search', status: 'failed' }],
    }),
  })
  assert.equal(result.verdict, 'unknown')
  assert.equal(result.recommendation, 'investigate')
  assert.equal(result.decision, 'INVESTIGATE')
  assert.equal(result.coverage.liveVerification.complete, false)
})
