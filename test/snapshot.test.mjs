import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { loadSnapshot, snapshotFreshness } from '../src/snapshot.mjs'

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve(server.address()))
  })
}

test('bundled snapshot is valid and has a bounded freshness policy', async () => {
  const { snapshot, provenance } = await loadSnapshot({ offline: true })
  const freshness = snapshotFreshness(snapshot, Date.parse(snapshot.generatedAt) + 3_600_000)
  assert.ok(snapshot.plugins.length > 0)
  assert.match(provenance, /snapshot\.json$/)
  assert.equal(freshness.ageHours, 1)
  assert.equal(freshness.fresh, true)
})

test('remote snapshot rejects an oversized declared response before parsing', async (context) => {
  const server = createServer((request, response) => {
    response.writeHead(200, {
      'content-type': 'application/json',
      'content-length': '8000001',
    })
    response.end()
  })
  context.after(() => server.close())
  const address = await listen(server)
  await assert.rejects(
    loadSnapshot({ source: `http://127.0.0.1:${address.port}/snapshot.json` }),
    /too large/,
  )
})
