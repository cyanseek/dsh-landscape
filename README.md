# DSH Landscape

[简体中文](README.zh-CN.md) · [Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md)

[![CI](https://github.com/cyanseek/dsh-landscape/actions/workflows/ci.yml/badge.svg)](https://github.com/cyanseek/dsh-landscape/actions/workflows/ci.yml)
[![Node.js >= 22](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Know what exists before you build what is missing.**

DSH Landscape answers one practical question: given a capability need, what already exists in the DeepSeek Harness ecosystem, what is still missing, and should you use, extend, investigate, or build?

It combines plugin discovery, evidence-based maturity, coverage-aware verdicts, and fresh verification. A repository name or README claim alone never counts as proof that a capability is solved.

## What you get

- A native DSH tool: `dsh_landscape`.
- Need-first `analyze`, `find`, and `brief` CLI workflows.
- A portable Agent Skill for Codex, DSH, and other compatible hosts.
- Structured evidence with provenance, maturity, freshness, uncertainty, and next-action guidance.

## Quick start: install as a DSH plugin

Install the verified, reproducible revision into your DSH profile:

```bash
dsh plugin --profile web add github:cyanseek/dsh-landscape#1ef0e1ebbb5e84e8d2feed31ae71d1b97322f6f9
dsh --profile web --dump-config
```

The bundle registers `dsh_landscape`. Ask DSH a need such as:

> Check whether DSH already has a native Linear integration. Show the evidence and tell me whether to use, extend, or build.

No separate Landscape model key is required inside DSH. The tool retrieves and verifies evidence; the host model makes the final semantic decision.

### Runtime options

| Argument | Default | Meaning |
|---|---:|---|
| `need` | required | Capability or integration described in natural language |
| `limit` | `10` | Maximum matching projects, from 1 to 20 |
| `fresh` | `true` | Live-check negative or uncertain results through GitHub search |

There is no required plugin configuration. Anonymous GitHub search works out of the box; an existing `GITHUB_TOKEN` can increase API limits. Its value is never included in tool output.

### Uninstall

```bash
dsh plugin --profile web remove dsh-landscape
```

DSH unregisters the tool when the bundle is removed. Replace `web` with the profile you actually use.

## Use as an Agent Skill

Use once without permanent installation:

```bash
npx -y skills use cyanseek/dsh-landscape --skill dsh-landscape --agent codex
```

Or install the portable Skill:

```bash
npx -y skills add cyanseek/dsh-landscape --skill dsh-landscape -g -a codex -y
```

The generic prompt-only form works with other capable hosts by omitting `--agent codex`.

## Run the CLI

The GitHub-source commands work without an npm release:

```bash
npx -y github:cyanseek/dsh-landscape find "browser automation"
npx -y github:cyanseek/dsh-landscape analyze "Linear integration for DSH"
npx -y github:cyanseek/dsh-landscape brief "Linear integration for DSH" --format agent
```

When used by a host Agent, Landscape reuses that host's semantic capability. For standalone semantic analysis, configure one OpenAI-compatible provider:

```bash
export DSH_LANDSCAPE_API_KEY="your-key"
export DSH_LANDSCAPE_BASE_URL="https://your-provider.example/v1"
export DSH_LANDSCAPE_MODEL="your-model"
npx -y github:cyanseek/dsh-landscape analyze "Linear integration for DSH"
```

Without a key, retrieval still works and negative results remain explicitly provisional. Inspect the active intelligence mode without making a model request:

```bash
npx -y github:cyanseek/dsh-landscape status --json
```

The package is not advertised as published to npm. Use the verified GitHub source commands above.

## Result contract

A result includes:

- interpreted capabilities and ranked matching projects;
- maturity and source evidence for each match;
- covered and missing sub-capabilities;
- discovery completeness and freshness;
- a `covered`, `partial`, `crowded`, `placeholder-only`, `gap`, or `unknown` verdict;
- a `use`, `extend`, `build`, `avoid-duplication`, or `investigate` recommendation.

`gap` is deliberately hard to reach. Incomplete or stale discovery, failed fresh verification, or search-only reasoning downgrades a negative conclusion to `unknown`.

## Surfaces

| Surface | Best for | Semantic reasoning |
|---|---|---|
| DSH plugin | Native checks during a Harness session | DSH host model |
| Agent Skill | One-off or installed Agent workflows | Host Agent |
| CLI | Automation, JSON output, and briefs | Configured provider or transparent search-only mode |
| Node API | Application integration | Chosen by the caller |
| Static API | Browser-safe snapshot exploration | Search-only |

### Node API

```js
import { findPlugins, loadAliases, loadSnapshot } from 'dsh-landscape'

const { snapshot } = await loadSnapshot()
const aliasData = await loadAliases()
const matches = findPlugins('browser automation', { snapshot, aliasData, limit: 5 })
```

Versioned static data is generated under [`site/api/v1`](site/api/v1).

## Data and trust

The current snapshot merges and deduplicates two attributed public sources:

1. the GitHub [`dsh-plugin` topic](https://github.com/topics/dsh-plugin);
2. the [Awesome DeepSeek Harness catalog](https://github.com/0xsline/awesome-deepseek-harness/blob/main/CATALOG.md).

Trust rules:

- `placeholder`, `prototype`, `installable`, and `tested` require observable evidence; `verified` is reserved for runtime acceptance evidence.
- Archived repositories are excluded from active competition by default, and forks are marked and down-ranked.
- External repository code is never executed during discovery.
- Every verdict-affecting project record retains source provenance.
- API key values are never printed, serialized, or stored in fixtures.

## Limitations

- DeepSeek Harness is in developer preview and may introduce breaking changes.
- Coverage is limited to configured public sources, not every GitHub or npm project.
- Metadata-based maturity is conservative and does not replace runtime verification.
- Live verification depends on GitHub availability and rate limits.
- The static website is a search-only surface; use DSH, an Agent Skill, or a configured provider for semantic judgment.

## Development

Node.js 22 or newer is required. The repository has no runtime dependencies and the GitHub plugin install runs no lifecycle build scripts.

```bash
npm run release:check
npm pack --dry-run
```

The release check runs syntax checks, tests, the static build, data validation, and Skill validation. See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the issue forms before submitting factual changes.

## License

[MIT](LICENSE) © 2026 cyanseek
