import { publicIntelligence } from './schema.mjs'

function normalizeAgent(value) {
  const normalized = String(value ?? '').trim().toLocaleLowerCase('en-US')
  const aliases = {
    'claude': 'claude-code',
    'claudecode': 'claude-code',
    'deepseek-harness': 'dsh',
    'open-code': 'opencode',
  }
  return aliases[normalized] ?? normalized.replace(/[^a-z0-9-]/g, '')
}

function providerResult(provider, model, baseUrl, apiKey, reason) {
  return {
    intelligence: publicIntelligence({
      mode: 'standalone-llm',
      state: 'configured',
      hostAgent: null,
      provider,
      model,
      configured: true,
      verified: false,
      semanticAnalysisAvailable: true,
      reason,
    }),
    providerConfig: { provider, model, baseUrl, apiKey },
  }
}

function searchOnly(reason, extra = {}) {
  return {
    intelligence: publicIntelligence({
      mode: 'search-only',
      state: 'limited',
      hostAgent: null,
      provider: extra.provider ?? null,
      model: extra.model ?? null,
      configured: false,
      verified: false,
      semanticAnalysisAvailable: false,
      reason,
    }),
    providerConfig: null,
  }
}

export function preflightIntelligence(options = {}) {
  const env = options.env ?? process.env
  const explicitHost = normalizeAgent(options.hostAgent)
  const signaledHost = env.DSH_LANDSCAPE_HOST_AGENT === '1'
    ? normalizeAgent(env.DSH_LANDSCAPE_HOST_AGENT_NAME || 'agent')
    : ''
  const hostAgent = explicitHost || signaledHost

  if (hostAgent) {
    return {
      intelligence: publicIntelligence({
        mode: 'host-agent',
        state: 'available',
        hostAgent,
        provider: null,
        model: null,
        configured: true,
        verified: false,
        semanticAnalysisAvailable: true,
        reason: explicitHost ? 'host-agent-signal' : 'host-agent-environment-signal',
      }),
      providerConfig: null,
    }
  }

  if (env.DSH_LANDSCAPE_API_KEY) {
    if (!env.DSH_LANDSCAPE_BASE_URL || !env.DSH_LANDSCAPE_MODEL) {
      return searchOnly('incomplete-landscape-provider-config', {
        provider: 'custom-openai-compatible',
        model: env.DSH_LANDSCAPE_MODEL ?? null,
      })
    }
    return providerResult(
      'custom-openai-compatible',
      env.DSH_LANDSCAPE_MODEL,
      env.DSH_LANDSCAPE_BASE_URL,
      env.DSH_LANDSCAPE_API_KEY,
      'explicit-landscape-provider-config',
    )
  }

  if (env.DEEPSEEK_API_KEY) {
    return providerResult(
      'deepseek',
      env.DSH_LANDSCAPE_MODEL || 'deepseek-v4-flash',
      env.DSH_LANDSCAPE_BASE_URL || 'https://api.deepseek.com',
      env.DEEPSEEK_API_KEY,
      'deepseek-provider-detected',
    )
  }

  if (env.OPENAI_API_KEY) {
    if (!env.DSH_LANDSCAPE_MODEL) return searchOnly('openai-model-required', { provider: 'openai' })
    return providerResult(
      'openai',
      env.DSH_LANDSCAPE_MODEL,
      env.DSH_LANDSCAPE_BASE_URL || 'https://api.openai.com/v1',
      env.OPENAI_API_KEY,
      'openai-provider-detected',
    )
  }

  if (env.OPENROUTER_API_KEY) {
    if (!env.DSH_LANDSCAPE_MODEL) return searchOnly('openrouter-model-required', { provider: 'openrouter' })
    return providerResult(
      'openrouter',
      env.DSH_LANDSCAPE_MODEL,
      env.DSH_LANDSCAPE_BASE_URL || 'https://openrouter.ai/api/v1',
      env.OPENROUTER_API_KEY,
      'openrouter-provider-detected',
    )
  }

  return searchOnly('no-llm-capability')
}

export function formatIntelligenceStatus(intelligence) {
  if (intelligence.mode === 'host-agent') {
    const name = intelligence.hostAgent === 'dsh'
      ? 'DSH'
      : intelligence.hostAgent === 'codex'
        ? 'Codex'
        : intelligence.hostAgent === 'claude-code'
          ? 'Claude Code'
          : intelligence.hostAgent
    return `Intelligence: Host Agent (${name}) — semantic workflow available; no Landscape API key required.`
  }
  if (intelligence.mode === 'standalone-llm') {
    return `Intelligence: Standalone LLM — ${intelligence.provider} / ${intelligence.model} configured; verification pending.`
  }
  const suffix = intelligence.reason === 'no-llm-capability'
    ? 'Run this as an Agent Skill, or configure DSH_LANDSCAPE_API_KEY / BASE_URL / MODEL.'
    : `Configuration is incomplete (${intelligence.reason}).`
  return `Intelligence: Search-only — plugin discovery and repository evidence are available, but full semantic gap analysis is not. ${suffix}`
}
