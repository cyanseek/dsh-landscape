import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { analyzeNeed } from '../src/analyze.mjs'
import { preflightIntelligence } from '../src/intelligence.mjs'
import { loadAliases } from '../src/snapshot.mjs'

const aliasData = await loadAliases()
const observedAt = '2099-01-01T00:00:00.000Z'
const emptySnapshot = {
  schemaVersion: '1.0.0',
  generatedAt: observedAt,
  coverage: {
    complete: true,
    staleAfterHours: 24,
    sources: [
      { id: 'one', status: 'ok', complete: true, observedAt, itemCount: 0 },
      { id: 'two', status: 'ok', complete: true, observedAt, itemCount: 0 },
    ],
  },
  plugins: [],
}

test('explicit host signal enables host-Agent mode', () => {
  const result = preflightIntelligence({ hostAgent: 'Codex', env: {} })
  assert.equal(result.intelligence.mode, 'host-agent')
  assert.equal(result.intelligence.hostAgent, 'codex')
  assert.equal(result.providerConfig, null)
})

test('search-only is a normal no-key state', () => {
  const result = preflightIntelligence({ env: {} })
  assert.equal(result.intelligence.mode, 'search-only')
  assert.equal(result.intelligence.state, 'limited')
})

test('explicit provider is configured but not verified and secret is not serializable', () => {
  const result = preflightIntelligence({
    env: {
      DSH_LANDSCAPE_API_KEY: 'synthetic-secret',
      DSH_LANDSCAPE_BASE_URL: 'https://example.test/v1',
      DSH_LANDSCAPE_MODEL: 'test-model',
    },
  })
  assert.equal(result.intelligence.configured, true)
  assert.equal(result.intelligence.verified, false)
  assert.ok(!JSON.stringify(result.intelligence).includes('synthetic-secret'))
  assert.equal(result.providerConfig.apiKey, 'synthetic-secret')
})

test('real compatible provider response transitions to ready', async (t) => {
  let authorization = ''
  const server = createServer((request, response) => {
    authorization = request.headers.authorization
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      normalizedNeed: 'native quantum teleportation',
      interpretedCapabilities: ['quantum-teleportation'],
      verdict: 'gap',
      confidence: 0.9,
      coveredCapabilities: [],
      missingCapabilities: ['quantum-teleportation'],
      competition: 'none',
      recommendation: 'build',
      rationale: 'No matching evidence in complete sources.',
    }) } }] }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => server.close())
  const address = server.address()
  const preflight = preflightIntelligence({
    env: {
      DSH_LANDSCAPE_API_KEY: 'synthetic-secret',
      DSH_LANDSCAPE_BASE_URL: `http://127.0.0.1:${address.port}`,
      DSH_LANDSCAPE_MODEL: 'test-model',
    },
  })
  const result = await analyzeNeed('quantum teleportation', {
    snapshot: emptySnapshot,
    aliasData,
    intelligence: preflight.intelligence,
    providerConfig: preflight.providerConfig,
  })
  assert.equal(authorization, 'Bearer synthetic-secret')
  assert.equal(result.intelligence.state, 'ready')
  assert.equal(result.intelligence.verified, true)
  assert.equal(result.semanticReasoningPerformed, true)
  assert.ok(!JSON.stringify(result).includes('synthetic-secret'))
})

test('provider failure degrades a negative verdict to unknown', async (t) => {
  const server = createServer((_request, response) => {
    response.statusCode = 503
    response.end('unavailable')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => server.close())
  const address = server.address()
  const preflight = preflightIntelligence({
    env: {
      DSH_LANDSCAPE_API_KEY: 'synthetic-secret',
      DSH_LANDSCAPE_BASE_URL: `http://127.0.0.1:${address.port}`,
      DSH_LANDSCAPE_MODEL: 'test-model',
    },
  })
  const result = await analyzeNeed('quantum teleportation', {
    snapshot: emptySnapshot,
    aliasData,
    intelligence: preflight.intelligence,
    providerConfig: preflight.providerConfig,
  })
  assert.equal(result.verdict, 'unknown')
  assert.equal(result.intelligence.state, 'failed')
  assert.equal(result.intelligence.semanticAnalysisAvailable, false)
})
