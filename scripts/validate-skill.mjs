#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL_ROOT = resolve(ROOT, 'skills', 'dsh-landscape')
const required = [
  'SKILL.md',
  'agents/openai.yaml',
  'scripts/query.mjs',
  'references/methodology.md',
  'references/result-format.md',
  'references/dsh-extension-map.md',
]
for (const path of required) await access(resolve(SKILL_ROOT, path))
const skill = await readFile(resolve(SKILL_ROOT, 'SKILL.md'), 'utf8')
const match = skill.match(/^---\n([^]*?)\n---\n/)
if (!match) throw new Error('SKILL.md must start with YAML frontmatter')
if (!/^name:\s*dsh-landscape\s*$/m.test(match[1])) throw new Error('Skill name must be dsh-landscape')
const description = match[1].match(/^description:\s*>-\n((?:\s{2}.+\n?)+)/m)?.[1]?.replace(/^\s{2}/gm, '').replace(/\s+/g, ' ').trim()
if (!description || description.length > 1024) throw new Error('Skill description must contain 1–1024 characters')
if (!/^license:\s*MIT\s*$/m.test(match[1])) throw new Error('Skill license must be MIT')
if (skill.split(/\r?\n/).length > 500) throw new Error('SKILL.md must remain under 500 lines')
if (!skill.includes('--host-agent codex')) throw new Error('Skill must explicitly signal host-Agent mode')
const openai = await readFile(resolve(SKILL_ROOT, 'agents', 'openai.yaml'), 'utf8')
if (!openai.includes('$dsh-landscape')) throw new Error('openai.yaml default_prompt must mention $dsh-landscape')
process.stdout.write('Agent Skill structure and metadata are valid.\n')
