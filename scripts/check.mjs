#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOTS = ['src', 'scripts', 'test', 'skills/dsh-landscape/scripts', 'site']

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const target = resolve(path, entry.name)
    if (entry.isDirectory()) files.push(...await collect(target))
    else if (['.js', '.mjs', '.cjs'].includes(extname(entry.name))) files.push(target)
  }
  return files
}

function check(path) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['--check', path], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`${path}\n${stderr}`)))
  })
}

const files = (await Promise.all(ROOTS.map((path) => collect(resolve(ROOT, path))))).flat().sort()
for (const file of files) await check(file)
process.stdout.write(`Syntax check passed for ${files.length} JavaScript files.\n`)
