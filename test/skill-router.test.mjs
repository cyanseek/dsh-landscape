import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const router = await readFile(new URL('../skills/dsh-landscape/scripts/query.mjs', import.meta.url), 'utf8')

test('Windows Skill fallback executes npx through Node without a command shell', () => {
  assert.match(router, /npx-cli\.js/)
  assert.ok(!router.includes('npx.cmd'))
  assert.match(router, /shell:\s*false/)
})
