import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { findPlugins } from '../src/search.mjs'
import { loadAliases } from '../src/snapshot.mjs'

const snapshot = JSON.parse(await readFile(new URL('./fixtures/snapshot.json', import.meta.url), 'utf8'))
const aliasData = await loadAliases()

test('exact repository match ranks first', () => {
  const [match] = findPlugins('acme/browser-kit', { snapshot, aliasData })
  assert.equal(match.repository, 'acme/browser-kit')
})

test('English aliases find the relevant capability', () => {
  const [match] = findPlugins('web automation', { snapshot, aliasData })
  assert.equal(match.repository, 'acme/browser-kit')
  assert.ok(match.matchedCapabilities.includes('browser'))
})

test('Chinese need maps to English ecosystem evidence', () => {
  const [match] = findPlugins('我需要浏览器自动化', { snapshot, aliasData })
  assert.equal(match.repository, 'acme/browser-kit')
  assert.ok(match.matchedCapabilities.includes('browser'))
})

test('irrelevant repositories rank below relevant repositories', () => {
  const matches = findPlugins('browser', { snapshot, aliasData })
  assert.equal(matches[0].repository, 'acme/browser-kit')
  assert.ok(!matches.some((match) => match.repository === 'acme/linear-placeholder'))
})

test('archived repositories are excluded by default', () => {
  const matches = findPlugins('browser', { snapshot, aliasData })
  assert.ok(!matches.some((match) => match.repository === 'acme/old-browser'))
})
