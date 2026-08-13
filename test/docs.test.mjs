import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('..', import.meta.url)
const [english, chinese, ignore, site] = await Promise.all([
  readFile(new URL('README.md', root), 'utf8'),
  readFile(new URL('README.zh-CN.md', root), 'utf8'),
  readFile(new URL('.gitignore', root), 'utf8'),
  readFile(new URL('site/app.js', root), 'utf8'),
])
const requiredCommands = [
  'npx -y skills use cyanseek/dsh-landscape --skill dsh-landscape --agent codex',
  'npx -y skills add cyanseek/dsh-landscape --skill dsh-landscape -g -a codex -y',
  'npx -y github:cyanseek/dsh-landscape find "browser automation"',
  'npx -y github:cyanseek/dsh-landscape status --json',
]

test('English and Chinese READMEs share required tested commands', () => {
  for (const command of requiredCommands) {
    assert.ok(english.includes(command), `English README missing ${command}`)
    assert.ok(chinese.includes(command), `Chinese README missing ${command}`)
  }
})

test('English and Chinese READMEs keep all shell examples aligned', () => {
  const commands = (document) => document
    .split(/\r?\n/)
    .filter((line) => /^(?:npx |export |mkdir |cp )/.test(line))
  assert.deepEqual(commands(english), commands(chinese))
})

test('READMEs do not claim an unpublished npm latest command', () => {
  assert.ok(!english.includes('npx -y dsh-landscape@latest'))
  assert.ok(!chinese.includes('npx -y dsh-landscape@latest'))
})

test('local documentation is ignored and not linked publicly', () => {
  assert.match(ignore, /^mydoc_local_landscape\/$/m)
  assert.ok(!english.includes('mydoc_local'))
  assert.ok(!chinese.includes('mydoc_local'))
})

test('site rendering does not inject external metadata as HTML', () => {
  assert.ok(!site.includes('innerHTML'))
})
