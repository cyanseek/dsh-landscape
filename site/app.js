import { analyzeStaticNeed } from './core/site-analysis.mjs'

const form = document.querySelector('#analysis-form')
const input = document.querySelector('#need')
const resultSection = document.querySelector('#result')
let loadedSnapshot = null
let loadedAliases = null
const snapshotPromise = Promise.all([
  fetch('./api/v1/snapshot.json').then((response) => response.json()),
  fetch('./api/v1/capabilities.json').then((response) => response.json()),
  fetch('./api/v1/gaps.json').then((response) => response.json()),
])

function appendTextList(target, values, fallback) {
  target.replaceChildren()
  for (const value of values.length > 0 ? values : [fallback]) {
    const item = document.createElement('li')
    item.textContent = value
    target.append(item)
  }
}

function renderMatch(match) {
  const item = document.createElement('li')
  const link = document.createElement('a')
  link.href = match.url
  link.textContent = match.repository
  link.rel = 'noreferrer'
  const meta = document.createElement('small')
  const terms = [...match.matchedCapabilities, ...match.matchedTerms].slice(0, 5).join(', ')
  meta.textContent = `${match.maturity} · ${terms || 'metadata match'} · ${match.description || 'No description'}`
  item.append(link, meta)
  return item
}

function quoteShell(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`
}

function renderAnalysis(analysis) {
  document.querySelector('#result-title').textContent = analysis.normalizedNeed || analysis.query
  document.querySelector('#verdict').textContent = analysis.verdict.toUpperCase()
  document.querySelector('#result-note').textContent = analysis.verdict === 'unknown'
    ? 'The static site is search-only. An Agent can perform semantic review and fresh negative verification without a separate Landscape key.'
    : 'This is a deterministic, provisional retrieval verdict. Use the Agent path for full semantic review.'
  const matches = document.querySelector('#matches')
  matches.replaceChildren()
  if (analysis.matches.length === 0) {
    const item = document.createElement('li')
    item.textContent = 'No related project was established in the current snapshot.'
    matches.append(item)
  } else analysis.matches.forEach((match) => matches.append(renderMatch(match)))
  appendTextList(document.querySelector('#missing'), analysis.missingCapabilities, 'No missing sub-capability was established.')
  document.querySelector('#recommendation').textContent = analysis.recommendation.toUpperCase()
  document.querySelector('#confidence').textContent = `Confidence ${analysis.confidence} · sources ${analysis.coverage.complete ? 'complete' : 'incomplete'} · snapshot ${analysis.coverage.fresh ? 'fresh' : 'stale'}`
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

snapshotPromise
  .then(([snapshot, aliases, gaps]) => {
    loadedSnapshot = snapshot
    loadedAliases = aliases
    renderDashboard(snapshot, gaps)
  })
  .catch(() => {
    document.querySelector('#freshness').textContent = 'unavailable'
  })

form.addEventListener('submit', (event) => {
  event.preventDefault()
  const query = input.value.trim()
  if (!query || !loadedSnapshot || !loadedAliases) return
  renderAnalysis(analyzeStaticNeed(query, {
    snapshot: loadedSnapshot,
    aliasData: loadedAliases,
    limit: 5,
  }))
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
