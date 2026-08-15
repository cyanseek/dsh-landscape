import { analyzeNeed } from './analyze.mjs'
import { detectDshEnvironment, unavailableEnvironment } from './environment.mjs'
import { preflightIntelligence } from './intelligence.mjs'
import { formatPreflightText } from './preflight.mjs'
import { loadAliases, loadSnapshot } from './snapshot.mjs'

export const name = 'dsh-landscape'
export const inject = ['tools']

const PARAMETERS = {
  type: 'object',
  properties: {
    need: {
      type: 'string',
      description: 'Natural-language DSH capability change to check before installing, replacing, upgrading, or building.',
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
    intent: { type: 'object' },
    environment: { type: 'object' },
    decision: {
      type: 'string',
      enum: ['USE', 'INSTALL', 'COMPOSE', 'EXTEND', 'BUILD', 'WAIT', 'DISABLE', 'INVESTIGATE'],
    },
    risks: { type: 'array', items: { type: 'object' } },
    doNotBuild: { type: 'array', items: { type: 'string' } },
    buildOnly: { type: 'array', items: { type: 'string' } },
    nextAction: { type: 'string' },
    limitations: { type: 'array', items: { type: 'string' } },
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
    'intent',
    'environment',
    'decision',
    'risks',
    'doNotBuild',
    'buildOnly',
    'nextAction',
    'limitations',
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
  try {
    return [{ type: 'text', text: formatPreflightText(value) }]
  } catch {
    return [{ type: 'text', text: 'DSH Capability Preflight\n\nThe structured result is available, but its text projection could not be rendered.' }]
  }
}

export function createLandscapeTool(options = {}) {
  const loadAliasesFn = options.loadAliases ?? loadAliases
  const loadSnapshotFn = options.loadSnapshot ?? loadSnapshot
  const detectEnvironmentFn = options.detectEnvironment ?? (() => unavailableEnvironment())
  return {
    name: 'dsh_landscape',
    description: 'Run a read-only DSH capability preflight before adding, installing, comparing, replacing, upgrading, or building. It inspects available runtime inventory when exposed, checks ecosystem evidence, avoids duplicate work, and degrades safely when environment or discovery data is unavailable.',
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
      let environment
      try {
        environment = await detectEnvironmentFn()
      } catch {
        environment = unavailableEnvironment('DSH runtime inspection failed; ecosystem analysis continued without it.')
      }
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
        verifyFresh: options.verifyFresh,
        environment,
      })
    },
  }
}

export function apply(ctx) {
  ctx.tools.register(createLandscapeTool({ detectEnvironment: () => detectDshEnvironment(ctx) }))
}
