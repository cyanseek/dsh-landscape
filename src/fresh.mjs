import { meaningfulTerms } from './capabilities.mjs'
import { mergePluginRecords, pluginFromGitHub } from './github.mjs'

function headers(env) {
  const value = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'dsh-landscape/0.1.0',
  }
  if (env.GITHUB_TOKEN) value.authorization = `Bearer ${env.GITHUB_TOKEN}`
  return value
}

function safeQueryTerm(value) {
  return String(value).replace(/[^\p{L}\p{N}_.+-]/gu, ' ').trim().slice(0, 80)
}

function requestSignal(signal, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

export async function verifyNeedFresh(query, options = {}) {
  const env = options.env ?? process.env
  const observedAt = new Date().toISOString()
  const capabilityTerms = (options.capabilities ?? []).map((item) => item.id)
  const terms = [...new Set([...capabilityTerms, ...meaningfulTerms(query)])]
    .map(safeQueryTerm)
    .filter(Boolean)
    .slice(0, 3)
  const queries = terms.length > 0 ? terms : [safeQueryTerm(query)]
  const plugins = []
  const attempts = []

  for (const term of queries) {
    const search = `topic:dsh-plugin ${term}`.trim()
    const url = new URL('https://api.github.com/search/repositories')
    url.searchParams.set('q', search)
    url.searchParams.set('per_page', '100')
    url.searchParams.set('sort', 'updated')
    url.searchParams.set('order', 'desc')
    try {
      const response = await fetch(url, {
        headers: headers(env),
        signal: requestSignal(options.signal, options.timeoutMs ?? 7000),
      })
      if (!response.ok) throw new Error(`GitHub search returned HTTP ${response.status}`)
      const payload = await response.json()
      const complete = Number(payload.total_count ?? 0) <= (payload.items ?? []).length
      attempts.push({ query: search, status: 'ok', complete, totalCount: payload.total_count ?? 0 })
      for (const repository of payload.items ?? []) {
        plugins.push(pluginFromGitHub(repository, {
          aliasData: options.aliasData,
          observedAt,
          sources: [{ source: 'github-search', url: repository.html_url, observedAt }],
        }))
      }
    } catch (error) {
      attempts.push({ query: search, status: 'failed', complete: false, error: error.message })
    }
  }

  return {
    observedAt,
    complete: attempts.length > 0 && attempts.every((item) => item.status === 'ok' && item.complete),
    attempts,
    plugins: mergePluginRecords(plugins),
  }
}
