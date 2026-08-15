import { SCHEMA_VERSION } from './schema.mjs'

function uniqueUrls(analysis) {
  return [...new Set([
    ...analysis.matches.flatMap((match) => match.sources.map((source) => source.url)),
    ...analysis.evidence.map((item) => item.url),
  ].filter(Boolean))]
}

export function buildBrief(analysis) {
  const limited = analysis.intelligence.mode === 'search-only' || !analysis.semanticReasoningPerformed && analysis.intelligence.mode !== 'host-agent'
  const hostHandoff = analysis.intelligence.mode === 'host-agent'
  const missing = analysis.missingCapabilities.length > 0
    ? analysis.missingCapabilities
    : ['No evidence-backed missing capability was established.']
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: limited ? 'limited-evidence-packet' : hostHandoff ? 'host-agent-evidence-handoff' : 'build-brief',
    userNeed: analysis.query,
    verdict: analysis.verdict,
    confidence: analysis.confidence,
    intelligence: analysis.intelligence,
    intent: analysis.intent ?? null,
    environment: analysis.environment ?? null,
    decision: analysis.decision ?? null,
    risks: analysis.risks ?? [],
    doNotBuild: analysis.doNotBuild ?? [],
    buildOnly: analysis.buildOnly ?? [],
    nextAction: analysis.nextAction ?? null,
    limitations: analysis.limitations ?? [],
    currentCoverage: analysis.coveredCapabilities,
    closestProjects: analysis.matches.slice(0, 5).map((match) => ({
      repository: match.repository,
      url: match.url,
      maturity: match.maturity,
      why: [...match.matchedCapabilities, ...match.matchedTerms].slice(0, 8),
    })),
    doNotDuplicate: analysis.matches
      .filter((match) => ['installable', 'tested', 'verified'].includes(match.maturity))
      .map((match) => `${match.repository}: ${match.description}`),
    missingCapability: missing,
    extensionSurface: limited
      ? null
      : 'Prefer an external DSH bundle or portable Agent Skill supported by current upstream extension seams; do not patch DeepSeek Harness core.',
    proposedMvp: limited
      ? []
      : [
          `Implement only the missing capability: ${missing.join(', ')}.`,
          'Expose one documented install/use path and stable machine-readable output.',
          'Preserve source evidence and return UNKNOWN when discovery is materially incomplete.',
        ],
    acceptanceTests: limited
      ? []
      : [
          'A user can express the original need once and receive an actionable result.',
          'Existing mature projects are not reimplemented without an explicit extension rationale.',
          'Positive and negative verdicts are backed by traceable repository/catalog evidence.',
          'Failure of fresh discovery downgrades a negative result to UNKNOWN.',
          'No credential value appears in output, fixtures, or logs.',
        ],
    uncertainty: [
      ...(analysis.coverage.complete ? [] : ['Discovery coverage is incomplete.']),
      ...(analysis.coverage.fresh ? [] : ['The ecosystem snapshot is stale.']),
      ...(analysis.provisional ? ['The verdict is provisional and requires host-Agent or configured-LLM semantic review.'] : []),
    ],
    sources: uniqueUrls(analysis),
  }
}

export function formatBriefMarkdown(brief) {
  const lines = [
    '# DSH Landscape build brief',
    '',
    `**Need:** ${brief.userNeed}`,
    `**Verdict:** ${brief.verdict.toUpperCase()} (${brief.confidence})`,
    `**Intelligence:** ${brief.intelligence.mode} / ${brief.intelligence.state}`,
    '',
    '## Closest projects',
    '',
    ...(brief.closestProjects.length > 0
      ? brief.closestProjects.map((item) => `- [${item.repository}](${item.url}) — ${item.maturity}; ${item.why.join(', ') || 'metadata match'}`)
      : ['- No matching project was established.']),
    '',
    '## Missing capability',
    '',
    ...brief.missingCapability.map((item) => `- ${item}`),
    '',
    '## Do not duplicate',
    '',
    ...(brief.doNotDuplicate.length > 0 ? brief.doNotDuplicate.map((item) => `- ${item}`) : ['- No mature overlapping implementation was established.']),
  ]
  if (brief.proposedMvp.length > 0) {
    lines.push('', '## Proposed MVP', '', ...brief.proposedMvp.map((item) => `- ${item}`))
    lines.push('', '## Acceptance tests', '', ...brief.acceptanceTests.map((item) => `- ${item}`))
  }
  lines.push('', '## Known uncertainty', '', ...(brief.uncertainty.length > 0 ? brief.uncertainty.map((item) => `- ${item}`) : ['- None recorded.']))
  lines.push('', '## Sources', '', ...brief.sources.map((url) => `- ${url}`))
  return `${lines.join('\n')}\n`
}

export function formatBriefAgent(brief) {
  return [
    'DSH LANDSCAPE HANDOFF',
    `Kind: ${brief.kind}`,
    `User need: ${brief.userNeed}`,
    `Verdict: ${brief.verdict.toUpperCase()} (${brief.confidence})`,
    `Intelligence: ${brief.intelligence.mode}; state=${brief.intelligence.state}; verified=${brief.intelligence.verified}`,
    `Existing coverage: ${brief.currentCoverage.join(', ') || 'none established'}`,
    `Closest projects: ${brief.closestProjects.map((item) => `${item.repository} [${item.maturity}]`).join('; ') || 'none established'}`,
    `Do not duplicate: ${brief.doNotDuplicate.join('; ') || 'no mature overlap established'}`,
    `Exact missing capability: ${brief.missingCapability.join(', ')}`,
    `Extension surface: ${brief.extensionSurface ?? 'not established in limited mode'}`,
    `MVP: ${brief.proposedMvp.join(' | ') || 'not generated in limited mode'}`,
    `Acceptance tests: ${brief.acceptanceTests.join(' | ') || 'not generated in limited mode'}`,
    `Uncertainty: ${brief.uncertainty.join(' | ') || 'none recorded'}`,
    `Sources: ${brief.sources.join(' ')}`,
  ].join('\n') + '\n'
}
