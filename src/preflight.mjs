import { unavailableEnvironment } from './environment.mjs'
import { inferPreflightIntent } from './intent.mjs'

function isChinese(value) {
  return /[\u3400-\u9fff]/u.test(String(value ?? ''))
}

function environmentRelevant(kind) {
  return ['disable', 'install', 'replace', 'upgrade'].includes(kind)
}

function installedOverlap(analysis, environment) {
  const candidates = new Set(analysis.matches.flatMap((match) => [match.repository, match.name])
    .filter(Boolean)
    .map((value) => String(value).toLowerCase()))
  return environment.plugins?.filter((plugin) => {
    const moduleName = String(plugin.moduleName ?? '').toLowerCase()
    return [...candidates].some((candidate) => {
      const leaf = candidate.split('/').at(-1)
      return moduleName === candidate || moduleName === leaf || moduleName.endsWith(`/${leaf}`)
    })
  }) ?? []
}

function decisionFor(analysis, intent, environment) {
  const installed = installedOverlap(analysis, environment)
  if (intent.kind === 'disable') return installed.length > 0 ? 'DISABLE' : 'INVESTIGATE'
  if (['replace', 'upgrade'].includes(intent.kind)) {
    if (installed.length === 0 || !environment.dshVersion) return 'INVESTIGATE'
    return analysis.verdict === 'covered' || analysis.verdict === 'crowded' ? 'INSTALL' : 'INVESTIGATE'
  }
  if (analysis.verdict === 'covered' || analysis.verdict === 'crowded') {
    if (intent.kind === 'install') return 'INSTALL'
    if (intent.kind === 'compose') return 'COMPOSE'
    return 'USE'
  }
  if (analysis.verdict === 'partial') return intent.kind === 'compose' ? 'COMPOSE' : 'EXTEND'
  if (analysis.verdict === 'placeholder-only') return 'WAIT'
  if (analysis.verdict === 'gap' && analysis.coverage.complete && analysis.coverage.fresh) return 'BUILD'
  return 'INVESTIGATE'
}

function risksFor(analysis, intent, environment) {
  const zh = isChinese(analysis.query)
  const risks = []
  if (!analysis.coverage.complete) risks.push({
    level: 'unknown',
    code: 'incomplete-discovery',
    summary: zh ? '发现范围不完整，不能据此确认能力缺口。' : 'Discovery is incomplete, so a capability gap cannot be confirmed.',
  })
  if (!analysis.coverage.fresh) risks.push({
    level: 'unknown',
    code: 'stale-snapshot',
    summary: zh ? '生态快照已过期，近期变化可能尚未覆盖。' : 'The ecosystem snapshot is stale and may miss recent changes.',
  })
  if (environmentRelevant(intent.kind) && environment.status === 'unavailable') risks.push({
    level: 'unknown',
    code: 'environment-unavailable',
    summary: zh ? '当前 DSH 环境不可见，无法核对已安装项或兼容性。' : 'The current DSH environment is unavailable, so installed state and compatibility are unknown.',
  })
  if (['replace', 'upgrade'].includes(intent.kind) && !environment.dshVersion) risks.push({
    level: 'unknown',
    code: 'compatibility-unknown',
    summary: zh ? '当前 DSH 版本不可见，不能确认替换或升级兼容性。' : 'The current DSH version is unavailable, so replacement or upgrade compatibility is unknown.',
  })
  if ((environment.duplicateModules?.length ?? 0) > 0 || (environment.duplicateEntryIds?.length ?? 0) > 0) risks.push({
    level: 'medium',
    code: 'duplicate-runtime-entries',
    summary: zh ? '当前运行环境存在重复模块或条目标识。' : 'The active runtime contains duplicate module names or entry identifiers.',
  })
  if (analysis.verdict === 'placeholder-only') risks.push({
    level: 'medium',
    code: 'early-implementations-only',
    summary: zh ? '目前只发现早期或占位实现，不能视为可用能力。' : 'Only early or placeholder implementations were found; availability is not established.',
  })
  return risks
}

function buildBoundaries(analysis, decision) {
  const mature = analysis.matches
    .filter((match) => ['installable', 'tested', 'verified'].includes(match.maturity))
    .map((match) => `${match.repository}: ${match.description || 'mature overlapping capability'}`)
  const doNotBuild = ['USE', 'INSTALL', 'COMPOSE', 'EXTEND'].includes(decision) ? mature : []
  const canBuildMissing = ['EXTEND', 'COMPOSE', 'BUILD'].includes(decision)
    && analysis.coverage.complete
    && analysis.coverage.fresh
  const buildOnly = canBuildMissing ? [...analysis.missingCapabilities] : []
  return { doNotBuild, buildOnly }
}

function nextActionFor(analysis, decision, environment, buildOnly) {
  const zh = isChinese(analysis.query)
  const project = analysis.matches.find((match) => ['installable', 'tested', 'verified'].includes(match.maturity))?.repository
    ?? analysis.matches[0]?.repository
  const missing = buildOnly.join(', ')
  const actions = zh ? {
    USE: project ? `优先使用 ${project}；变更 Profile 前先核对它与需求的边界。` : '先核对最接近项目的实际能力，再决定是否采用。',
    INSTALL: project ? `先审阅 ${project} 的证据与安装说明；确认适配后再安装。` : '先确认一个可安装实现，再执行任何 Profile 变更。',
    COMPOSE: missing ? `组合现有能力，只补齐：${missing}。` : '组合已有能力，不重复实现已覆盖部分。',
    EXTEND: missing ? `扩展最接近的实现，只补齐：${missing}。` : '先确定最小扩展边界，再开始实现。',
    BUILD: missing ? `只新建：${missing}；保留当前证据与验收边界。` : '仅在重新确认缺口边界后开始最小实现。',
    WAIT: '跟踪现有早期实现；在成熟度证据变化前不要把它当作可用能力。',
    DISABLE: '先确认命中的运行时条目，再由用户明确执行禁用。',
    INVESTIGATE: environment.status === 'unavailable' && environmentRelevant(analysis.intent?.kind)
      ? '继续使用生态证据，但在变更前从 DSH 内重新运行以核对当前环境。'
      : '补充缺失证据；在此之前不要安装、替换或新建。',
  } : {
    USE: project ? `Prefer ${project}; verify its scope against the need before changing a profile.` : 'Verify the closest project\'s actual scope before adopting it.',
    INSTALL: project ? `Review ${project}'s evidence and install instructions; install only if the scope fits.` : 'Establish one installable implementation before changing a profile.',
    COMPOSE: missing ? `Compose existing capabilities and add only: ${missing}.` : 'Compose the existing capabilities without reimplementing covered parts.',
    EXTEND: missing ? `Extend the closest implementation and add only: ${missing}.` : 'Establish the smallest extension boundary before implementation.',
    BUILD: missing ? `Build only: ${missing}; preserve the evidence and acceptance boundary.` : 'Start a minimal implementation only after reconfirming the gap boundary.',
    WAIT: 'Track the early implementations; do not treat them as available until maturity evidence changes.',
    DISABLE: 'Confirm the matching runtime entry, then let the user explicitly perform the disable action.',
    INVESTIGATE: environment.status === 'unavailable' && environmentRelevant(analysis.intent?.kind)
      ? 'Keep the ecosystem evidence, then rerun inside DSH before making the environment change.'
      : 'Collect the missing evidence; do not install, replace, or build yet.',
  }
  return actions[decision]
}

export function enrichPreflight(analysis, options = {}) {
  const intent = options.intent?.kind ? options.intent : inferPreflightIntent(analysis.query)
  const environmentFallback = unavailableEnvironment()
  const suppliedEnvironment = options.environment ?? {}
  const environment = {
    ...environmentFallback,
    ...suppliedEnvironment,
    status: ['detected', 'partial', 'unavailable', 'not-applicable'].includes(suppliedEnvironment.status)
      ? suppliedEnvironment.status
      : environmentFallback.status,
    bundles: Array.isArray(suppliedEnvironment.bundles) ? suppliedEnvironment.bundles : [],
    plugins: Array.isArray(suppliedEnvironment.plugins) ? suppliedEnvironment.plugins : [],
    availableTools: Array.isArray(suppliedEnvironment.availableTools) ? suppliedEnvironment.availableTools : [],
    duplicateModules: Array.isArray(suppliedEnvironment.duplicateModules) ? suppliedEnvironment.duplicateModules : [],
    duplicateEntryIds: Array.isArray(suppliedEnvironment.duplicateEntryIds) ? suppliedEnvironment.duplicateEntryIds : [],
    limitations: Array.isArray(suppliedEnvironment.limitations)
      ? suppliedEnvironment.limitations
      : environmentFallback.limitations,
  }
  const decision = decisionFor(analysis, intent, environment)
  const { doNotBuild, buildOnly } = buildBoundaries(analysis, decision)
  const limitations = [...new Set([
    ...(environment.limitations ?? []),
    ...(!analysis.coverage.complete ? ['Discovery coverage is incomplete.'] : []),
    ...(!analysis.coverage.fresh ? ['The ecosystem snapshot is stale.'] : []),
    ...(analysis.provisional ? ['The ecosystem verdict is provisional until host semantic review.'] : []),
  ])]
  return {
    ...analysis,
    intent,
    environment,
    decision,
    risks: risksFor(analysis, intent, environment),
    doNotBuild,
    buildOnly,
    nextAction: nextActionFor({ ...analysis, intent }, decision, environment, buildOnly),
    limitations,
  }
}

function listLines(values, fallback) {
  return values.length > 0 ? values.map((value) => `- ${value}`) : [`- ${fallback}`]
}

export function formatPreflightText(analysis) {
  const zh = isChinese(analysis.query)
  const labels = zh ? {
    title: 'DSH 能力变更前置检查', need: '需求', environment: '当前环境', coverage: '现有覆盖', risks: '风险',
    decision: '决策', doNotBuild: '不要重复开发', buildOnly: '仅需新建', next: '下一步', limitations: '限制',
    verdict: '证据结论', noMatches: '当前证据中未确认相关实现。', noRisks: '未发现有证据支持的风险。', none: '无。',
  } : {
    title: 'DSH Capability Preflight', need: 'Need', environment: 'Current Environment', coverage: 'Existing Coverage', risks: 'Risks',
    decision: 'Decision', doNotBuild: 'Do Not Build', buildOnly: 'Build Only', next: 'Next Action', limitations: 'Limitations',
    verdict: 'Evidence verdict', noMatches: 'No related implementation was established in current evidence.', noRisks: 'No evidence-backed risk was established.', none: 'None.',
  }
  const matches = analysis.matches.slice(0, 5).map((match) => `${match.repository} — ${match.maturity}`)
  const environmentLine = `${analysis.environment.status.toUpperCase()} — ${analysis.environment.plugins.length} plugins; ${analysis.environment.availableTools.length} tools`
  return [
    labels.title,
    '', labels.need, analysis.query,
    '', labels.environment, environmentLine,
    '', labels.coverage, `${labels.verdict}: ${analysis.verdict.toUpperCase()} (${analysis.confidence})`, ...listLines(matches, labels.noMatches),
    '', labels.risks, ...listLines(analysis.risks.map((risk) => `${risk.level.toUpperCase()}: ${risk.summary}`), labels.noRisks),
    '', labels.decision, analysis.decision,
    '', labels.doNotBuild, ...listLines(analysis.doNotBuild, labels.none),
    '', labels.buildOnly, ...listLines(analysis.buildOnly, labels.none),
    '', labels.next, analysis.nextAction,
    '', labels.limitations, ...listLines(analysis.limitations, labels.none),
  ].join('\n') + '\n'
}
