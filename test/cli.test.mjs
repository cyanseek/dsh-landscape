import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const cli = resolve(root, 'src', 'cli.mjs')
const fixture = resolve(root, 'test', 'fixtures', 'snapshot.json')

function run(args) {
  return new Promise((resolvePromise, reject) => {
    const env = { ...process.env, DSH_LANDSCAPE_OFFLINE: '1' }
    for (const key of [
      'DSH_LANDSCAPE_API_KEY', 'DSH_LANDSCAPE_BASE_URL', 'DSH_LANDSCAPE_MODEL',
      'DSH_LANDSCAPE_HOST_AGENT', 'DSH_LANDSCAPE_HOST_AGENT_NAME',
      'DEEPSEEK_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY',
    ]) delete env[key]
    const child = spawn(process.execPath, [cli, ...args], { cwd: root, env })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('exit', (code) => resolvePromise({ code, stdout, stderr }))
  })
}

test('find --json emits parseable JSON only on stdout', async () => {
  const result = await run(['find', 'browser', '--json', '--snapshot', fixture])
  assert.equal(result.code, 0)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.results[0].repository, 'acme/browser-kit')
})

test('analyze --json keeps status on stderr and intelligence in JSON', async () => {
  const result = await run(['analyze', 'browser', '--json', '--snapshot', fixture])
  assert.equal(result.code, 0)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.intelligence.mode, 'search-only')
  assert.equal(payload.provisional, true)
  assert.match(result.stderr, /^Intelligence: Search-only/)
})

test('host-Agent signal is explicit and machine-readable', async () => {
  const result = await run(['analyze', 'browser', '--json', '--snapshot', fixture, '--host-agent', 'codex'])
  assert.equal(result.code, 0)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.intelligence.mode, 'host-agent')
  assert.equal(payload.intelligence.hostAgent, 'codex')
})

test('brief search-only JSON is a limited evidence packet', async () => {
  const result = await run(['brief', 'Linear integration', '--json', '--snapshot', fixture])
  assert.equal(result.code, 0)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.kind, 'limited-evidence-packet')
  assert.deepEqual(payload.proposedMvp, [])
})

test('a natural-language need is the zero-configuration CLI entry', async () => {
  const result = await run(['Install browser automation for DSH', '--json', '--snapshot', fixture])
  assert.equal(result.code, 0)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.intent.kind, 'install')
  assert.equal(payload.environment.status, 'unavailable')
  assert.equal(payload.decision, 'INSTALL')
  assert.equal(result.stderr, '')
})
