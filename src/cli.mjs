#!/usr/bin/env node

import { analyzeNeed } from './analyze.mjs'
import { buildBrief, formatBriefAgent, formatBriefMarkdown } from './brief.mjs'
import { formatIntelligenceStatus, preflightIntelligence } from './intelligence.mjs'
import { findPlugins } from './search.mjs'
import { SCHEMA_VERSION } from './schema.mjs'
import { loadAliases, loadSnapshot, snapshotFreshness } from './snapshot.mjs'

const VERSION = '0.1.0'

function usage() {
  return `DSH Landscape ${VERSION}

Usage:
  dsh-landscape analyze <need> [--json] [--limit <n>] [--fresh] [--snapshot <path-or-url>] [--host-agent <name>]
  dsh-landscape find <query> [--json] [--limit <n>] [--snapshot <path-or-url>]
  dsh-landscape brief <need> [--json] [--format markdown|agent] [--fresh] [--snapshot <path-or-url>] [--host-agent <name>]
  dsh-landscape status [--json] [--host-agent <name>]

Full standalone semantic analysis uses DSH_LANDSCAPE_API_KEY,
DSH_LANDSCAPE_BASE_URL, and DSH_LANDSCAPE_MODEL. Search works without them.
`
}

function parseArguments(argv) {
  const command = argv[0]
  const values = []
  const options = { json: false, fresh: false, limit: 10, format: 'markdown' }
  const valueOptions = new Map([
    ['--limit', 'limit'],
    ['--snapshot', 'snapshot'],
    ['--host-agent', 'hostAgent'],
    ['--format', 'format'],
  ])
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--json') options.json = true
    else if (argument === '--fresh') options.fresh = true
    else if (argument === '--help' || argument === '-h') options.help = true
    else if (argument === '--version' || argument === '-v') options.version = true
    else if (valueOptions.has(argument)) {
      if (index + 1 >= argv.length) throw new Error(`${argument} requires a value`)
      options[valueOptions.get(argument)] = argv[index + 1]
      index += 1
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`)
    } else {
      values.push(argument)
    }
  }
  options.limit = Number(options.limit)
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100) {
    throw new Error('--limit must be an integer from 1 to 100')
  }
  if (!['markdown', 'agent'].includes(options.format)) throw new Error('--format must be markdown or agent')
  return { command, query: values.join(' ').trim(), options }
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

function emitStatus(intelligence, options) {
  const line = formatIntelligenceStatus(intelligence)
  if (options.json || options.format === 'agent') process.stderr.write(`${line}\n`)
  else process.stdout.write(`${line}\n\n`)
}

function formatFindHuman(query, results, snapshot, provenance) {
  const lines = ['DSH Landscape', '', `Query: ${query}`, `Snapshot: ${snapshot.generatedAt} (${provenance})`, '']
  if (results.length === 0) return `${lines.join('\n')}No matching projects in the current snapshot.\n`
  for (const match of results) {
    lines.push(`${match.rank}. ${match.repository} — ${match.maturity}`)
    lines.push(`   ${match.description || 'No repository description.'}`)
    lines.push(`   Matched: ${[...match.matchedCapabilities, ...match.matchedTerms].join(', ') || 'metadata'}`)
    lines.push(`   ${match.url}`)
  }
  return `${lines.join('\n')}\n`
}

function formatAnalysisHuman(analysis) {
  const live = analysis.coverage.liveVerification
  const lines = [
    'DSH Landscape', '', 'Need', analysis.query, '', 'Verdict',
    `${analysis.verdict.toUpperCase()}${analysis.provisional ? ' — provisional' : ''}`,
    '', 'Existing coverage',
  ]
  if (analysis.matches.length === 0) lines.push('- No related implementation was established.')
  for (const match of analysis.matches.slice(0, 5)) {
    lines.push(`- ${match.repository} — ${match.maturity} — ${match.description || 'No description.'}`)
  }
  lines.push('', 'Missing capability')
  lines.push(...(analysis.missingCapabilities.length > 0
    ? analysis.missingCapabilities.map((item) => `- ${item}`)
    : ['- No missing capability was established.']))
  lines.push('', 'Confidence')
  lines.push(`${analysis.confidence} — sources ${analysis.coverage.complete ? 'complete' : 'incomplete'}; snapshot ${analysis.coverage.fresh ? 'fresh' : 'stale'}${live ? `; fresh verification ${live.complete ? 'complete' : 'incomplete'}` : ''}`)
  lines.push('', 'Recommendation', analysis.recommendation.toUpperCase())
  if (analysis.semanticError) lines.push('', `Semantic provider failed safely: ${analysis.semanticError}`)
  return `${lines.join('\n')}\n`
}

async function runFind(query, options) {
  const aliasData = await loadAliases()
  const { snapshot, provenance } = await loadSnapshot({ source: options.snapshot })
  const results = findPlugins(query, { snapshot, aliasData, limit: options.limit })
  if (options.json) {
    writeJson({
      schemaVersion: SCHEMA_VERSION,
      query,
      snapshot: { generatedAt: snapshot.generatedAt, provenance, coverage: snapshot.coverage },
      results,
    })
  } else process.stdout.write(formatFindHuman(query, results, snapshot, provenance))
}

async function analysisContext(query, options) {
  const preflight = preflightIntelligence({ hostAgent: options.hostAgent })
  emitStatus(preflight.intelligence, options)
  const aliasData = await loadAliases()
  const { snapshot, provenance } = await loadSnapshot({ source: options.snapshot })
  const analysis = await analyzeNeed(query, {
    snapshot,
    aliasData,
    limit: options.limit,
    fresh: options.fresh,
    intelligence: preflight.intelligence,
    providerConfig: preflight.providerConfig,
  })
  analysis.snapshot = {
    generatedAt: snapshot.generatedAt,
    provenance,
    freshness: snapshotFreshness(snapshot),
  }
  return analysis
}

async function runAnalyze(query, options) {
  const analysis = await analysisContext(query, options)
  if (options.json) writeJson(analysis)
  else process.stdout.write(formatAnalysisHuman(analysis))
}

async function runBrief(query, options) {
  const analysis = await analysisContext(query, options)
  const brief = buildBrief(analysis)
  if (options.json) writeJson(brief)
  else if (options.format === 'agent') process.stdout.write(formatBriefAgent(brief))
  else process.stdout.write(formatBriefMarkdown(brief))
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(usage())
    return
  }
  if (argv.length === 1 && ['--version', '-v'].includes(argv[0])) {
    process.stdout.write(`${VERSION}\n`)
    return
  }
  const { command, query, options } = parseArguments(argv)
  if (options.version) {
    process.stdout.write(`${VERSION}\n`)
    return
  }
  if (command === 'status') {
    const { intelligence } = preflightIntelligence({ hostAgent: options.hostAgent })
    if (options.json) writeJson({ schemaVersion: SCHEMA_VERSION, intelligence })
    else process.stdout.write(`${formatIntelligenceStatus(intelligence)}\n`)
    return
  }
  if (!['analyze', 'find', 'brief'].includes(command)) throw new Error(`Unknown command: ${command ?? '(none)'}`)
  if (!query) throw new Error(`${command} requires a natural-language need or query`)
  if (command === 'find') await runFind(query, options)
  else if (command === 'analyze') await runAnalyze(query, options)
  else await runBrief(query, options)
}

main().catch((error) => {
  process.stderr.write(`dsh-landscape: ${error.message}\n`)
  process.exitCode = 1
})
