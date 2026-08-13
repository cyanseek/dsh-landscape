const PLACEHOLDER_PATTERN = /\b(?:placeholder|coming soon|todo|work in progress|wip|reserved)\b|占位|占坑|待开发/i
const TEST_SCRIPT_PATTERN = /(?:node --test|vitest|jest|mocha|ava|tap|pytest|cargo test|go test)/i

function evidence(kind, detail, url) {
  return { kind, detail, ...(url ? { url } : {}) }
}

export function classifyMaturity(input) {
  const {
    size = null,
    description = '',
    readme = '',
    packageData = null,
    repositoryUrl = '',
    hasWorkflow = false,
  } = input
  const maturityEvidence = []
  const install = { kind: 'unknown' }
  const meaningfulSize = Number.isFinite(size) ? size : null
  const placeholderClaim = PLACEHOLDER_PATTERN.test(`${description}\n${readme}`)

  if ((meaningfulSize === 0 || placeholderClaim) && !packageData) {
    maturityEvidence.push(evidence(
      meaningfulSize === 0 ? 'repository-size' : 'repository-claim',
      meaningfulSize === 0 ? 'GitHub reports an empty repository.' : 'Repository text explicitly marks the project as placeholder/WIP.',
      repositoryUrl,
    ))
    return { maturity: 'placeholder', maturityEvidence, install }
  }

  const packageScripts = packageData?.scripts ?? {}
  const testCommand = typeof packageScripts.test === 'string' ? packageScripts.test : ''
  const meaningfulTests = TEST_SCRIPT_PATTERN.test(testCommand) && !/no test specified/i.test(testCommand)
  const dshPatch = packageData?.dsh?.bundle?.patch ?? packageData?.dsh?.['bundle.patch'] ?? packageData?.['dsh.bundle.patch']
  const skillPackage = /agent[- ]?skill/i.test(`${description} ${(packageData?.keywords ?? []).join(' ')}`)

  if (dshPatch) {
    install.kind = 'dsh-bundle'
    install.command = `dsh plugin --profile web add "github:${input.id}"`
    maturityEvidence.push(evidence('package-manifest', 'package.json declares a DSH bundle patch.', `${repositoryUrl}/blob/${input.defaultBranch ?? 'main'}/package.json`))
  } else if (packageData?.bin) {
    install.kind = 'npm'
    maturityEvidence.push(evidence('package-manifest', 'package.json exposes an executable.', `${repositoryUrl}/blob/${input.defaultBranch ?? 'main'}/package.json`))
  } else if (skillPackage) {
    install.kind = 'agent-skill'
  }

  if ((meaningfulTests || hasWorkflow) && install.kind !== 'unknown') {
    maturityEvidence.push(evidence(
      meaningfulTests ? 'test-script' : 'ci-workflow',
      meaningfulTests ? `package.json has a meaningful test command (${testCommand}).` : 'A CI workflow was observed.',
      repositoryUrl,
    ))
    return { maturity: 'tested', maturityEvidence, install }
  }

  if (install.kind !== 'unknown') {
    return { maturity: 'installable', maturityEvidence, install }
  }

  if ((meaningfulSize !== null && meaningfulSize > 0) || packageData || readme.trim()) {
    maturityEvidence.push(evidence('source-presence', 'Repository metadata or source files indicate implementation work exists.', repositoryUrl))
    return { maturity: 'prototype', maturityEvidence, install }
  }

  return {
    maturity: 'unknown',
    maturityEvidence: [evidence('insufficient-evidence', 'No bounded evidence supports a stronger maturity label.', repositoryUrl)],
    install,
  }
}

export function maturityWeight(maturity) {
  return {
    placeholder: 0.15,
    prototype: 0.5,
    installable: 0.78,
    tested: 0.92,
    verified: 1,
    unknown: 0.3,
  }[maturity] ?? 0.3
}

export function isMature(maturity) {
  return ['installable', 'tested', 'verified'].includes(maturity)
}
