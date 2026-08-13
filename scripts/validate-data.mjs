#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateSnapshot } from '../src/schema.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const snapshot = JSON.parse(await readFile(resolve(ROOT, 'data', 'snapshot.json'), 'utf8'))
const aliases = JSON.parse(await readFile(resolve(ROOT, 'data', 'capability-aliases.json'), 'utf8'))
const errors = validateSnapshot(snapshot)
const ids = new Set()
for (const capability of aliases.capabilities ?? []) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(capability.id)) errors.push(`invalid capability id: ${capability.id}`)
  if (ids.has(capability.id)) errors.push(`duplicate capability id: ${capability.id}`)
  ids.add(capability.id)
  if (!Array.isArray(capability.aliases) || capability.aliases.length === 0) errors.push(`capability ${capability.id} has no aliases`)
}
for (const plugin of snapshot.plugins ?? []) {
  if (plugin.maturity === 'verified' && !plugin.maturityEvidence.some((item) => item.kind === 'runtime-acceptance')) {
    errors.push(`${plugin.id} is verified without runtime acceptance evidence`)
  }
}
if (errors.length > 0) throw new Error(`Data validation failed:\n- ${errors.join('\n- ')}`)
process.stdout.write(`Data valid: ${snapshot.plugins.length} plugins, ${ids.size} capabilities, ${snapshot.coverage.sources.length} sources.\n`)
