# DSH Landscape

[简体中文](README.zh-CN.md) · [Website](https://cyanseek.github.io/dsh-landscape/) · [Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md)

[![CI](https://github.com/cyanseek/dsh-landscape/actions/workflows/ci.yml/badge.svg)](https://github.com/cyanseek/dsh-landscape/actions/workflows/ci.yml)
[![Node.js >= 22](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Adding or building something for DeepSeek Harness? Run Landscape first.**

DSH Landscape is a read-only capability preflight: describe one change in natural language and get an evidence-backed decision before you install, replace, upgrade, compose, or build.

Try needs like:

- “Should I install browser automation, or is it already covered?”
- “Compare the GitHub integrations that could fit this DSH setup.”
- “Can I replace my current search plugin without losing capabilities?”
- “Before we build a Linear integration, show what not to duplicate.”

No Landscape account. No API key. No initialization. No required configuration. If runtime inspection or live discovery is unavailable, Landscape still uses its bundled snapshot and states what it could not verify.

## Quick start

Install the pinned, reproducible DSH bundle into an existing profile:

```bash
dsh plugin --profile web add github:cyanseek/dsh-landscape#2d3570aadbbd291dbfc58e2484e287bd14fa92e0
```

Then ask DSH normally:

> Before adding browser automation, check this environment and the ecosystem. Tell me what to use, what not to build, and the safest next action.

The native tool is named `dsh_landscape`. Landscape itself needs no profile path or settings; `--profile web` belongs only to DSH's plugin installation command and should be changed to the profile you already use.

## What a preflight looks like

An abridged result from the bundled ecosystem snapshot:

```text
DSH Capability Preflight

Need
Add browser automation to my DSH setup.

Current Environment
UNAVAILABLE — ecosystem analysis continued without runtime inventory

Existing Coverage
Evidence verdict: CROWDED
- titanwings/dsh-automation — installable
- titanwings/dsh-better-browser — prototype

Risks
- UNKNOWN: installed state and compatibility were not visible on this surface.

Decision
INSTALL

Do Not Build
- The mature overlapping automation surface.

Build Only
- None.

Next Action
Review the leading project's evidence and install instructions; act only if its scope fits.
```

The result is advice, not a mutation. Landscape does not install, enable, disable, upgrade, uninstall, edit a profile, or create a repository.

## Why run it first?

- See relevant DSH plugins and portable capabilities before committing to an implementation.
- Separate placeholders and prototypes from installable or tested projects.
- Check active runtime inventory when the host safely exposes it.
- Surface duplicates, uncertain compatibility, stale evidence, and incomplete discovery without inventing certainty.
- Get one direct action: `USE`, `INSTALL`, `COMPOSE`, `EXTEND`, `BUILD`, `WAIT`, `DISABLE`, or `INVESTIGATE`.
- Preserve explicit `Do Not Build` and `Build Only` boundaries for the next Agent or developer.

## Other ways to use it

### Agent Skill

Use once without permanent installation:

```bash
npx -y skills use cyanseek/dsh-landscape --skill dsh-landscape --agent codex
```

Or install the portable Skill:

```bash
npx -y skills add cyanseek/dsh-landscape --skill dsh-landscape -g -a codex -y
```

The Skill runs the preflight before a DSH capability mutation or implementation and reuses the host Agent for semantic review.

### CLI

Pass a need directly; no mode selection is required:

```bash
npx -y github:cyanseek/dsh-landscape "Should I install browser automation for DSH?"
```

The compatible explicit workflows remain available:

```bash
npx -y github:cyanseek/dsh-landscape find "browser automation"
npx -y github:cyanseek/dsh-landscape analyze "Linear integration for DSH"
npx -y github:cyanseek/dsh-landscape brief "Linear integration for DSH" --format agent
npx -y github:cyanseek/dsh-landscape status --json
```

`analyze`, `find`, `brief`, their existing options, and the diagnostic `status` command remain supported. The package is not advertised as published to npm; the commands above run the verified GitHub source.

<details>
<summary>Optional standalone semantic provider</summary>

Normal preflight does not require this. A standalone CLI caller that specifically wants provider-backed semantic analysis can opt into any compatible endpoint:

```bash
export DSH_LANDSCAPE_API_KEY="your-key"
export DSH_LANDSCAPE_BASE_URL="https://your-provider.example/v1"
export DSH_LANDSCAPE_MODEL="your-model"
npx -y github:cyanseek/dsh-landscape analyze "Linear integration for DSH"
```

Credential values are never included in Landscape output.

</details>

### Verify or remove the DSH plugin

```bash
dsh --profile web --dump-config
dsh plugin --profile web remove dsh-landscape
```

## Stable result contract

Preflight adds these fields without removing the v1 evidence contract:

- `intent`, inferred from the natural-language need;
- `environment`, with `detected`, `partial`, `unavailable`, or `not-applicable` status;
- `decision`, `risks`, `doNotBuild`, `buildOnly`, `nextAction`, and `limitations`;
- the existing `verdict`, `recommendation`, `confidence`, `matches`, covered/missing capabilities, evidence, freshness, intelligence, and provisional markers.

Existing consumers can ignore the new fields. Negative findings remain conservative: incomplete or stale discovery, failed live verification, or search-only uncertainty cannot establish a genuine gap.

## Surfaces

| Surface | Best for | Environment view |
|---|---|---|
| DSH plugin | Native preflight during a Harness session | Best-effort, read-only runtime summary |
| Agent Skill | Preflight before an Agent changes or builds capability | Host-dependent; safe fallback |
| CLI | Natural-language checks, automation, JSON, and briefs | Ecosystem-only unless supplied by a host |
| Node API | Application integration | Caller-provided or unavailable |
| Static site/API | Browser-safe snapshot exploration | Not applicable |

### Node API

```js
import { analyzeNeed, loadAliases, loadSnapshot } from 'dsh-landscape'

const [{ snapshot }, aliasData] = await Promise.all([loadSnapshot(), loadAliases()])
const result = await analyzeNeed('Should we build browser automation?', {
  snapshot,
  aliasData,
})

console.log(result.decision, result.nextAction)
```

The versioned static data API is generated under [`site/api/v1`](site/api/v1).

## Trust and safety

- Discovery reads attributed public metadata; it never executes code from discovered repositories.
- Maturity labels require observable evidence. Repository names and README claims alone do not prove a working capability.
- Runtime inspection is best-effort and read-only. Missing host information becomes a limitation, not a setup prompt.
- Absolute local paths, credential values, plugin configuration, and raw inspection errors are excluded from environment output.
- Archived projects are excluded from active competition by default; forks are marked and down-ranked.

## Limitations

- DeepSeek Harness is in developer preview and can introduce breaking changes.
- Public discovery cannot cover every GitHub, npm, private, or local project.
- Current public runtime surfaces may not expose the active profile, DSH version, bundle provenance, or peer compatibility; Landscape reports these as unknown.
- Metadata-based maturity is conservative and does not replace runtime acceptance testing.
- The static website is search-only; use DSH or an Agent Skill for host-aware review.

## Development

Node.js 22 or newer is required. The package has no runtime dependencies and GitHub plugin installation runs no lifecycle build scripts.

```bash
npm run release:check
npm pack --dry-run
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the issue forms before submitting factual changes.

## License

[MIT](LICENSE) © 2026 cyanseek
