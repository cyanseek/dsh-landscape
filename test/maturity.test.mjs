import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyMaturity } from '../src/maturity.mjs'

const base = { id: 'acme/example', repositoryUrl: 'https://example.test/acme/example', defaultBranch: 'main' }

test('empty repository is placeholder', () => {
  assert.equal(classifyMaturity({ ...base, size: 0 }).maturity, 'placeholder')
})

test('source-only WIP is prototype when implementation exists', () => {
  assert.equal(classifyMaturity({ ...base, size: 8, description: 'experimental source' }).maturity, 'prototype')
})

test('clear DSH package install path is installable', () => {
  const result = classifyMaturity({ ...base, size: 8, packageData: { dsh: { bundle: { patch: 'cordis.patch.yml' } } } })
  assert.equal(result.maturity, 'installable')
  assert.equal(result.install.kind, 'dsh-bundle')
})

test('meaningful tests plus install path are tested', () => {
  const result = classifyMaturity({
    ...base,
    size: 8,
    packageData: { dsh: { bundle: { patch: 'cordis.patch.yml' } }, scripts: { test: 'node --test' } },
  })
  assert.equal(result.maturity, 'tested')
})

test('static classifier never assigns verified', () => {
  const result = classifyMaturity({
    ...base,
    size: 8,
    hasWorkflow: true,
    packageData: { bin: { example: './cli.mjs' }, scripts: { test: 'node --test' } },
  })
  assert.notEqual(result.maturity, 'verified')
})
