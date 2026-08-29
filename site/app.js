import { analyzeStaticNeed } from './core/site-analysis.mjs'

const form = document.querySelector('#analysis-form')
const input = document.querySelector('#need')
const resultSection = document.querySelector('#result')
const submitButton = form.querySelector('button[type="submit"]')
const analysisStatus = document.querySelector('#analysis-status')
let loadedSnapshot = null
let loadedAliases = null
let loadPromise = null

async function fetchJson(path) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Snapshot request failed with HTTP ${response.status}`)
  return response.json()
}

function setAnalysisStatus(message, state) {
  analysisStatus.textContent = message
  analysisStatus.dataset.state = state
}

function loadSnapshotData() {
  if (loadedSnapshot && loadedAliases) return Promise.resolve(true)
  if (loadPromise) return loadPromise
  form.setAttribute('aria-busy', 'true')
  setAnalysisStatus('Loading current snapshot…', 'loading')
  loadPromise = Promise.all([
    fetchJson('./api/v1/snapshot.json'),
    fetchJson('./api/v1/capabilities.json'),
    fetchJson('./api/v1/gaps.json'),
  ])
    .then(([snapshot, aliases, gaps]) => {
      loadedSnapshot = snapshot
      loadedAliases = aliases
      renderDashboard(snapshot, gaps)
      setAnalysisStatus(`Ready · ${snapshot.plugins.length.toLocaleString()} projects indexed.`, 'ready')
      return true
    })
    .catch(() => {
      document.querySelector('#freshness').textContent = 'unavailable'
      setAnalysisStatus('Snapshot unavailable. Check your connection, then run preflight again. No result was inferred.', 'error')
      return false
    })
    .finally(() => {
      form.removeAttribute('aria-busy')
      loadPromise = null
    })
  return loadPromise
}

function appendTextList(target, values, fallback) {
  target.replaceChildren()
  for (const value of values.length > 0 ? values : [fallback]) {
    const item = document.createElement('li')
    item.textContent = value
    target.append(item)
  }
}

function truncate(value, limit = 180) {
  const text = String(value ?? '').trim()
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text
}

function renderMatch(match) {
  const item = document.createElement('li')
  const link = document.createElement('a')
  link.href = match.url
  link.textContent = match.repository
  link.rel = 'noreferrer'
  const meta = document.createElement('small')
  const terms = [...match.matchedCapabilities, ...match.matchedTerms].slice(0, 5).join(', ')
  meta.textContent = `${match.maturity} · ${terms || 'metadata match'} · ${truncate(match.description || 'No description')}`
  item.append(link, meta)
  return item
}

function quoteShell(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`
}

function renderAnalysis(analysis) {
  document.querySelector('#result-title').textContent = analysis.query
  document.querySelector('#decision').textContent = analysis.decision
  document.querySelector('#result-note').textContent = analysis.verdict === 'unknown'
    ? 'The static site cannot establish a negative result. Use the Agent path for fresh, host-aware review—no separate Landscape key required.'
    : 'This browser result is a provisional ecosystem preflight. Runtime environment inspection is available only inside a compatible host.'
  const matches = document.querySelector('#matches')
  matches.replaceChildren()
  if (analysis.matches.length === 0) {
    const item = document.createElement('li')
    item.textContent = 'No related project was established in the current snapshot.'
    matches.append(item)
  } else analysis.matches.forEach((match) => matches.append(renderMatch(match)))
  document.querySelector('#environment').textContent = `${analysis.environment.status.toUpperCase()} · static snapshot`
  appendTextList(document.querySelector('#risks'), analysis.risks.map((risk) => `${risk.level.toUpperCase()}: ${risk.summary}`), 'No evidence-backed risk was established.')
  appendTextList(document.querySelector('#do-not-build'), analysis.doNotBuild.map((item) => item.split(':')[0]), 'No mature overlap was established.')
  appendTextList(document.querySelector('#build-only'), analysis.buildOnly, 'Nothing is safe to build from this result.')
  document.querySelector('#next-action').textContent = analysis.nextAction
  document.querySelector('#confidence').textContent = `Evidence verdict ${analysis.verdict.toUpperCase()} · legacy recommendation ${analysis.recommendation.toUpperCase()} · confidence ${analysis.confidence} · sources ${analysis.coverage.complete ? 'complete' : 'incomplete'} · snapshot ${analysis.coverage.fresh ? 'fresh' : 'stale'}`
  const agentCommand = `npx -y skills use cyanseek/dsh-landscape --skill dsh-landscape --agent codex`
  const briefCommand = `npx -y github:cyanseek/dsh-landscape brief ${quoteShell(analysis.query)} --format agent --host-agent codex --fresh`
  document.querySelector('#agent-command').textContent = agentCommand
  document.querySelector('#brief-command').textContent = briefCommand
  resultSection.hidden = false
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function renderDashboard(snapshot, gaps) {
  document.querySelector('#plugin-count').textContent = snapshot.plugins.length.toLocaleString()
  document.querySelector('#source-count').textContent = snapshot.coverage.sources.length
  const generated = new Date(snapshot.generatedAt)
  document.querySelector('#freshness').textContent = Number.isNaN(generated.valueOf()) ? 'unknown' : generated.toLocaleString()

  const opportunities = document.querySelector('#opportunities')
  opportunities.replaceChildren()
  for (const lead of gaps.opportunities) {
    const row = document.createElement('div')
    const title = document.createElement('strong')
    title.textContent = lead.query
    const meta = document.createElement('span')
    meta.textContent = `${lead.verdict.toUpperCase()} · ${lead.label}`
    row.append(title, meta)
    opportunities.append(row)
  }

  const recent = document.querySelector('#recent')
  recent.replaceChildren()
  snapshot.plugins
    .filter((plugin) => plugin.updatedAt)
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    .slice(0, 6)
    .forEach((plugin) => {
      const link = document.createElement('a')
      link.href = plugin.url
      link.rel = 'noreferrer'
      const title = document.createElement('strong')
      title.textContent = plugin.id
      const meta = document.createElement('span')
      meta.textContent = `${plugin.maturity} · observed ${new Date(plugin.updatedAt).toLocaleDateString()}`
      link.append(title, meta)
      recent.append(link)
    })
}

loadSnapshotData()

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const query = input.value.trim()
  if (!query) return
  submitButton.disabled = true
  setAnalysisStatus('Checking current snapshot…', 'loading')
  try {
    if (!await loadSnapshotData()) {
      input.focus()
      return
    }
    renderAnalysis(analyzeStaticNeed(query, {
      snapshot: loadedSnapshot,
      aliasData: loadedAliases,
      limit: 4,
    }))
    setAnalysisStatus('Preflight complete. The result is read-only and provisional.', 'ready')
  } catch {
    setAnalysisStatus('Preflight could not be completed. No result was inferred; try again.', 'error')
  } finally {
    submitButton.disabled = false
  }
})

document.querySelectorAll('[data-example]').forEach((button) => {
  button.addEventListener('click', () => {
    input.value = button.dataset.example
    form.requestSubmit()
  })
})

document.querySelector('#copy-command').addEventListener('click', async (event) => {
  const value = document.querySelector('#agent-command').textContent
  try {
    await navigator.clipboard.writeText(value)
    event.currentTarget.textContent = 'Copied'
  } catch {
    event.currentTarget.textContent = 'Select command'
  }
})
