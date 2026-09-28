import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

test('unchanged successful scans renew freshness; source failure preserves the snapshot', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-landscape-scan-'))
  const output = join(directory, 'snapshot.json')
  const preload = join(directory, 'network-fixture.mjs')
  await writeFile(preload, `
    const RealDate = Date
    globalThis.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : [process.env.SCAN_FIXTURE_TIME])) }
    }
    globalThis.fetch = async (input) => {
      const url = String(input)
      if (url.startsWith('https://api.github.com/search/repositories?')) {
        if (process.env.SCAN_FIXTURE_FAIL) return new Response('unavailable', { status: 503 })
        return Response.json({ total_count: 0, items: [] })
      }
      if (url.endsWith('/CATALOG.md')) return new Response('- [Fixture](https://github.com/example/fixture) - synthetic test plugin')
      throw new Error('Unexpected fixture request: ' + url)
    }
  `)
  const run = (time, fail = '') => spawnSync(process.execPath, [
    '--import', pathToFileURL(preload).href,
    fileURLToPath(new URL('../scripts/scan.mjs', import.meta.url)),
    '--output', output, '--max-enrich', '0',
  ], { encoding: 'utf8', env: { ...process.env, SCAN_FIXTURE_TIME: time, SCAN_FIXTURE_FAIL: fail } })
  const first = run('2026-09-01T00:00:00.000Z')
  assert.equal(first.status, 0, first.stderr)
  const second = run('2026-09-02T00:00:00.000Z')
  assert.equal(second.status, 0, second.stderr)
  assert.match(second.stdout, /Catalog unchanged/)
  const refreshed = await readFile(output, 'utf8')
  assert.equal(JSON.parse(refreshed).generatedAt, '2026-09-02T00:00:00.000Z')
  assert.ok(JSON.parse(refreshed).coverage.sources.every(source => source.observedAt === '2026-09-02T00:00:00.000Z'))
  const failure = run('2026-09-03T00:00:00.000Z', 'true')
  assert.equal(failure.status, 2)
  assert.match(failure.stderr, /Snapshot preserved/)
  assert.equal(await readFile(output, 'utf8'), refreshed)
})
