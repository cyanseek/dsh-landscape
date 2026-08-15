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
  'dsh plugin --profile web add github:cyanseek/dsh-landscape#2d3570aadbbd291dbfc58e2484e287bd14fa92e0',
  'dsh --profile web --dump-config',
  'dsh plugin --profile web remove dsh-landscape',
  'npx -y skills use cyanseek/dsh-landscape --skill dsh-landscape --agent codex',
  'npx -y skills add cyanseek/dsh-landscape --skill dsh-landscape -g -a codex -y',
  'npx -y github:cyanseek/dsh-landscape "Should I install browser automation for DSH?"',
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
    .filter((line) => /^(?:dsh |npx |export |npm )/.test(line))
  assert.deepEqual(commands(english), commands(chinese))
})

test('READMEs do not claim an unpublished npm latest command', () => {
  assert.ok(!english.includes('npx -y dsh-landscape@latest'))
  assert.ok(!chinese.includes('npx -y dsh-landscape@latest'))
})

test('README first screens lead with one need, four examples, and no required Landscape setup', () => {
  assert.match(english, /Adding or building something for DeepSeek Harness\? Run Landscape first\./)
  assert.match(chinese, /给 DeepSeek Harness 加能力之前，先问 Landscape。/)
  for (const phrase of ['Should I install browser automation', 'Compare the GitHub integrations', 'replace my current search plugin', 'Before we build a Linear integration']) {
    assert.ok(english.includes(phrase), `English README missing first-screen example: ${phrase}`)
  }
  assert.match(english, /No Landscape account\. No API key\. No initialization\. No required configuration\./)
  assert.match(chinese, /不需要 Landscape 账号，不需要 API Key，不需要初始化，也没有必填配置。/)
  assert.ok(english.indexOf('## Quick start') < english.indexOf('DSH_LANDSCAPE_API_KEY'))
  assert.ok(chinese.indexOf('## 快速开始') < chinese.indexOf('DSH_LANDSCAPE_API_KEY'))
})

test('public READMEs describe the trust boundary without exposing local implementation notes', () => {
  for (const document of [english, chinese]) {
    assert.ok(!document.includes('loader.entries'))
    assert.ok(!document.includes('tools.schemas'))
    assert.ok(!document.includes('/mnt/e/'))
    assert.ok(!document.includes('E:\\Project'))
  }
})

test('local documentation is ignored and not linked publicly', () => {
  assert.match(ignore, /^mydoc_local_landscape\/$/m)
  assert.ok(!english.includes('mydoc_local'))
  assert.ok(!chinese.includes('mydoc_local'))
})

test('site rendering does not inject external metadata as HTML', () => {
  assert.ok(!site.includes('innerHTML'))
  for (const selector of ['#decision', '#environment', '#risks', '#do-not-build', '#build-only', '#next-action']) {
    assert.ok(site.includes(selector), `site renderer missing ${selector}`)
  }
})
