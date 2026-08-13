import { analyzeNeed } from './analyze.mjs'
import { preflightIntelligence } from './intelligence.mjs'
import { loadAliases, loadSnapshot } from './snapshot.mjs'

export const name = 'dsh-landscape'
export const inject = ['tools']

const PARAMETERS = {
  type: 'object',
  properties: {
    need: {
      type: 'string',
      description: 'Capability or integration needed in the DeepSeek Harness ecosystem.',
    },
    limit: {
      type: 'integer',
      description: 'Maximum number of matching projects to return (1-20).',
      default: 10,
    },
    fresh: {
      type: 'boolean',
      description: 'Verify negative or uncertain results with a live GitHub search.',
      default: true,
    },
  },
  required: ['need'],
  additionalProperties: false,
}

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    schemaVersion: { type: 'string' },
    query: { type: 'string' },
    normalizedNeed: { type: 'string' },
    interpretedCapabilities: { type: 'array', items: { type: 'string' } },
    verdict: {
      type: 'string',
      enum: ['covered', 'partial', 'crowded', 'placeholder-only', 'gap', 'unknown'],
    },
    confidence: { type: 'number' },
    matches: { type: 'array', items: { type: 'object' } },
    coveredCapabilities: { type: 'array', items: { type: 'string' } },
    missingCapabilities: { type: 'array', items: { type: 'string' } },
    competition: { type: 'string' },
    recommendation: {
      type: 'string',
      enum: ['use', 'extend', 'build', 'avoid-duplication', 'investigate'],
    },
    coverage: { type: 'object' },
    evidence: { type: 'array', items: { type: 'object' } },
    intelligence: { type: 'object' },
    semanticReasoningPerformed: { type: 'boolean' },
    provisional: { type: 'boolean' },
  },
  required: [
    'schemaVersion',
    'query',
    'normalizedNeed',
    'interpretedCapabilities',
    'verdict',
    'confidence',
    'matches',
    'coveredCapabilities',
    'missingCapabilities',
    'competition',
    'recommendation',
    'coverage',
    'evidence',
    'intelligence',
    'semanticReasoningPerformed',
    'provisional',
  ],
  additionalProperties: true,
}

function validateArgs(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new TypeError('dsh_landscape arguments must be an object')
  }
  const need = String(args.need ?? '').trim()
  if (!need) throw new TypeError('dsh_landscape need must be a non-empty string')
  const limit = args.limit ?? 10
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new TypeError('dsh_landscape limit must be an integer from 1 to 20')
  }
  const fresh = args.fresh ?? true
  if (typeof fresh !== 'boolean') throw new TypeError('dsh_landscape fresh must be a boolean')
  return { need, limit, fresh }
}

function renderEvidence(_args, value) {
  const matches = value.matches
    .slice(0, 5)
    .map((match) => `${match.repository} (${match.maturity})`)
    .join(', ') || 'none'
  const missing = value.missingCapabilities.join(', ') || 'none identified'
  const coverage = `${value.coverage.complete ? 'complete' : 'incomplete'}, ${value.coverage.fresh ? 'fresh' : 'stale'}`
  return [{
    type: 'text',
    text: [
      `DSH Landscape evidence: ${value.verdict.toUpperCase()} (${Math.round(value.confidence * 100)}% confidence).`,
      `Matches: ${matches}.`,
      `Missing capabilities: ${missing}.`,
      `Discovery coverage: ${coverage}.`,
      'Use this structured evidence for the final semantic decision; verify cited sources before a build recommendation.',
    ].join('\n'),
  }]
}

export function createLandscapeTool(options = {}) {
  const loadAliasesFn = options.loadAliases ?? loadAliases
  const loadSnapshotFn = options.loadSnapshot ?? loadSnapshot
  return {
    name: 'dsh_landscape',
    description: 'Find evidence for a DeepSeek Harness capability need before recommending, extending, or building a plugin. Negative results remain provisional unless discovery coverage is complete and fresh.',
    parameters: PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
      render: renderEvidence,
    },
    async execute(rawArgs, exec = {}) {
      const args = validateArgs(rawArgs)
      exec.signal?.throwIfAborted()
      const [{ snapshot }, aliasData] = await Promise.all([
        loadSnapshotFn({ offline: true }),
        loadAliasesFn(),
      ])
      exec.signal?.throwIfAborted()
      const { intelligence } = preflightIntelligence({ hostAgent: 'dsh', env: {} })
      return analyzeNeed(args.need, {
        snapshot,
        aliasData,
        limit: args.limit,
        fresh: args.fresh,
        intelligence,
        signal: exec.signal,
        now: options.now,
        freshTimeoutMs: options.freshTimeoutMs,
      })
    },
  }
}

export function apply(ctx) {
  ctx.tools.register(createLandscapeTool())
}
