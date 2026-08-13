# DSH Landscape

[简体中文](README.zh-CN.md) · [MIT](LICENSE) · [Roadmap](ROADMAP.md)

> **Know what exists. Find what's missing.**

DSH Landscape is an Agent-first ecosystem intelligence layer for **DeepSeek Harness plugins and missing capabilities**. Give it a need in plain language; it finds related DSH projects, separates implementations from placeholders, exposes discovery freshness, and returns evidence for a USE / EXTEND / BUILD / AVOID DUPLICATION / INVESTIGATE decision.

It is not another plugin list or installer. The first-class object is your **need**, not a repository.

## Ask from Codex, DSH, or another Agent

### Use once — no permanent installation

```bash
npx -y skills use cyanseek/dsh-landscape --skill dsh-landscape --agent codex
```

Then ask:

> Does DeepSeek Harness already have a native Linear integration? If not, tell me exactly what is missing and prepare a build brief.

The generic prompt-only form works with any capable host:

```bash
npx -y skills use cyanseek/dsh-landscape --skill dsh-landscape
```

### Install the portable Agent Skill

```bash
npx -y skills add cyanseek/dsh-landscape --skill dsh-landscape -g -a codex -y
npx -y skills add cyanseek/dsh-landscape --skill dsh-landscape -g -y
```

When used as an Agent Skill, DSH Landscape reuses the host Agent's model capability and needs no separate Landscape API key. When run standalone, full semantic analysis requires a configured LLM provider; without one, the CLI runs in transparent search-only mode.

## Or run the CLI directly

The GitHub-source path works before npm publication:

```bash
npx -y github:cyanseek/dsh-landscape find "browser automation"
npx -y github:cyanseek/dsh-landscape analyze "Linear integration for DSH"
npx -y github:cyanseek/dsh-landscape brief "Linear integration for DSH" --format agent
```

For full standalone semantic analysis, configure one OpenAI-compatible provider. Explicit Landscape settings take precedence:

```bash
export DSH_LANDSCAPE_API_KEY="your-key"
export DSH_LANDSCAPE_BASE_URL="https://your-provider.example/v1"
export DSH_LANDSCAPE_MODEL="your-model"
npx -y github:cyanseek/dsh-landscape analyze "Linear integration for DSH"
```

DeepSeek can also be selected through its standard key; the CLI uses the official API base and the default model verified during the v0.1.0 release checks unless you override the Landscape settings above:

```bash
export DEEPSEEK_API_KEY="your-key"
npx -y github:cyanseek/dsh-landscape analyze "browser automation"
```

Without an Agent or LLM key, evidence retrieval still works:

```bash
npx -y github:cyanseek/dsh-landscape find "Linear"
```

The package name is reserved in project metadata but is **not claimed as published to npm** in v0.1.0. This README intentionally does not advertise `dsh-landscape@latest` until publication is verified.

## A 20-second result

Illustrative host-Agent result using the bundled snapshot generated on 2026-08-13 UTC:

```text
Verdict: PARTIAL

Already covered
- fakechris/dsh-track — prototype — Linear-shaped local issue storage
- dsh-external/dsh-track — unknown — a catalog entry for the same capability shape

Still missing
- A verified native connector to Linear's hosted issues and projects

Recommendation: INVESTIGATE both records first. EXTEND only if the local issue engine is reusable; otherwise BUILD the connector without duplicating its task model.
Confidence: scoped to the current GitHub topic + Awesome catalog, with fresh verification
Intelligence: Host Agent over DSH Landscape evidence
```

The CLI marks host-Agent results as provisional evidence because the host performs the final semantic comparison. Search-only mode never turns a negative retrieval result into a semantic GAP.

## Intelligence modes

| Mode | Keys | What it can honestly do |
|---|---:|---|
| Host Agent | No extra Landscape key | Retrieve/verify evidence; the current Agent performs semantic need decomposition and recommendation |
| Standalone LLM | One configured OpenAI-compatible provider | Perform a real provider request, then report `configured`, `ready`, or `failed` without exposing the key |
| Search-only | None | Find and rank projects, show maturity/provenance, and return clearly provisional analysis; negative results remain `UNKNOWN` |

Inspect capability without making a model request:

```bash
npx -y github:cyanseek/dsh-landscape status --json
```

`analyze` and `brief` run the same preflight automatically. With `--json`, stdout is pure JSON and status goes to stderr.

## Why this is different

| Project type | Primary question | DSH Landscape's relationship |
|---|---|---|
| Awesome list | What projects are curated? | Uses catalogs as attributed evidence; does not reproduce the list experience |
| OMDSH Hub | What can I browse/manage? | Treats a Hub as a complementary structured source when data is available |
| Find Plugins | Which plugin should I find/install? | Goes beyond retrieval to capability coverage, uncertainty, and missing sub-capabilities |
| Plugin Check | Is this repository structurally healthy? | Consumes maturity/health evidence; does not duplicate static repository linting |
| Compatibility radar | What changed or broke? | Can consume future runtime evidence; does not recreate monitoring as the core product |
| **DSH Landscape** | **Given my need, what is covered, what is missing, and what should I do?** | Need → evidence → coverage → missing capability → action |

## Commands

Only three commands are first-class in Phase 1:

```text
analyze <need>   Evidence-backed coverage analysis. Options: --json --limit --fresh --snapshot --host-agent
find <query>     Direct deterministic project/capability retrieval. Options: --json --limit --snapshot
brief <need>     Markdown, JSON, or coding-Agent handoff. Options: --json --format markdown|agent --fresh
```

`status` is a lightweight diagnostic utility, not a fourth workflow.

## Trust model

- Every verdict-affecting project record carries source provenance.
- `placeholder`, `prototype`, `installable`, and `tested` are evidence-based. `verified` is reserved for runtime acceptance evidence.
- Repository existence or a README claim never proves that a need is solved.
- A GAP requires complete configured-source coverage and a fresh snapshot. Material fresh-search failure downgrades the result to UNKNOWN.
- Archived repositories are excluded from active competition by default; forks are marked and down-ranked.
- External repository code is never executed by the scanner.
- API key values are never printed, serialized, or placed in fixtures.

## Agent Skill and local use

The portable skill lives at [`skills/dsh-landscape`](skills/dsh-landscape). Codex and current DSH both discover repository skills from `.agents/skills`.

```bash
mkdir -p .agents/skills
cp -R skills/dsh-landscape .agents/skills/dsh-landscape
```

The Skill explicitly signals `--host-agent <name>` to the CLI. The human does not set an environment variable or supply a second model key.

## Node API

```js
import {
  analyzeNeed,
  buildBrief,
  findPlugins,
  loadAliases,
  loadSnapshot,
} from 'dsh-landscape'

const { snapshot } = await loadSnapshot()
const aliasData = await loadAliases()
const matches = findPlugins('浏览器自动化', { snapshot, aliasData, limit: 5 })
```

The CLI and library share the same core. The static site uses generated copies of the same browser-safe retrieval and verdict modules.

## Data and static API

Phase 1 merges and deduplicates two independent public sources:

1. the public GitHub [`dsh-plugin` topic](https://github.com/topics/dsh-plugin);
2. the maintained [Awesome DeepSeek Harness catalog](https://github.com/0xsline/awesome-deepseek-harness/blob/main/CATALOG.md).

The bundled snapshot keeps offline search usable. Runtime loading tries the current raw GitHub snapshot, then a local cache, then the bundled file. Generated versioned endpoints are in [`site/api/v1`](site/api/v1): `snapshot.json`, `plugins.json`, `capabilities.json`, and `gaps.json`.

`gaps.json` contains explicitly labeled snapshot-derived leads, not universal gap claims.

## Contributing

Correct false coverage, add evidence, improve capability aliases, or strengthen source adapters. Factual changes need evidence URLs. See [CONTRIBUTING.md](CONTRIBUTING.md) and use the issue forms.

## Limitations

- DeepSeek Harness is in developer preview and can make compatibility-breaking changes.
- Phase 1 covers the configured public topic and catalog, not every repository on GitHub or npm.
- Metadata-based maturity is deliberately conservative; `tested` is not runtime verification.
- Full semantic standalone analysis depends on the configured provider's availability and output quality.
- The website is a search-only discovery surface. Use an Agent Skill or standalone provider for full semantic judgment.

## Roadmap and discoverability

Phase 2 plans include more source adapters, a capability graph, demand signals, runtime evidence integration, historical snapshots, and an optional MCP/API surface. See [ROADMAP.md](ROADMAP.md).

Recommended repository topics: `deepseek-harness`, `dsh-plugin`, `agent-skills`, `plugin-discovery`, `ecosystem`, `gap-analysis`, `codex`.

## License

[MIT](LICENSE) © 2026 cyanseek
