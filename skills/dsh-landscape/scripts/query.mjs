#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function usage() {
  return 'Usage: node scripts/query.mjs <analyze|find|brief> <need> [--host-agent <name>] [--limit <n>] [--snapshot <path-or-url>]\n'
}

function parse(argv) {
  const command = argv[0]
  if (!['analyze', 'find', 'brief'].includes(command)) throw new Error(usage().trim())
  const need = []
  const passthrough = []
  let hostAgent = ''
  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--host-agent') {
      hostAgent = argv[++index] ?? ''
      if (!hostAgent) throw new Error('--host-agent requires the current host name')
    } else if (['--limit', '--snapshot'].includes(value)) {
      const optionValue = argv[++index]
      if (!optionValue) throw new Error(`${value} requires a value`)
      passthrough.push(value, optionValue)
    } else if (value.startsWith('-')) throw new Error(`Unsupported query option: ${value}`)
    else need.push(value)
  }
  if (need.length === 0) throw new Error('A natural-language DSH need is required')
  if (command !== 'find' && !hostAgent) {
    throw new Error('Pass --host-agent <name>; the Agent supplies this automatically, not the human')
  }
  return { command, need: need.join(' '), hostAgent, passthrough }
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function main() {
  const parsed = parse(process.argv.slice(2))
  const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const localCli = resolve(skillDir, '..', '..', 'src', 'cli.mjs')
  const args = [parsed.command, parsed.need, ...parsed.passthrough]
  if (parsed.command === 'analyze') args.push('--json', '--fresh', '--host-agent', parsed.hostAgent)
  if (parsed.command === 'brief') args.push('--format', 'agent', '--fresh', '--host-agent', parsed.hostAgent)
  if (parsed.command === 'find') args.push('--json')

  let executable
  let commandArgs
  if (await exists(localCli)) {
    executable = process.execPath
    commandArgs = [localCli, ...args]
  } else if (process.platform === 'win32') {
    const candidates = [
      process.env.npm_execpath
        ? resolve(dirname(process.env.npm_execpath), 'npx-cli.js')
        : null,
      resolve(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    ].filter(Boolean)
    const npxCli = (await Promise.all(candidates.map(async (path) => await exists(path) ? path : null)))
      .find(Boolean)
    if (!npxCli) {
      throw new Error('Could not locate npm npx-cli.js beside the current Windows Node installation')
    }
    executable = process.execPath
    commandArgs = [npxCli, '-y', 'github:cyanseek/dsh-landscape', ...args]
  } else {
    executable = 'npx'
    commandArgs = ['-y', 'github:cyanseek/dsh-landscape', ...args]
  }

  const child = spawn(executable, commandArgs, { stdio: 'inherit', shell: false })
  child.on('error', (error) => {
    process.stderr.write(`dsh-landscape query router could not start the CLI: ${error.message}\n`)
    process.exitCode = 1
  })
  child.on('exit', (code, signal) => {
    if (signal) process.stderr.write(`dsh-landscape query router stopped by ${signal}\n`)
    process.exitCode = code ?? 1
  })
}

main().catch((error) => {
  process.stderr.write(`dsh-landscape query router: ${error.message}\n`)
  process.exitCode = 1
})
