# Contributing to DSH Landscape

Thank you for improving evidence about the DeepSeek Harness ecosystem.

## Useful contributions

- add or correct plugin evidence;
- improve the bilingual capability taxonomy;
- report a false GAP or false COVERED verdict;
- improve a source adapter without weakening provenance;
- add tests for search, maturity, verdicts, or output contracts;
- improve Agent Skill interoperability.

Factual corrections must include public evidence URLs. A repository description alone does not prove installability or runtime compatibility.

## Development

Requirements: Node.js 22 or newer.

```bash
npm install
npm run check
npm test
npm run validate
npm run build
npm pack --dry-run
```

To refresh public ecosystem data:

```bash
npm run scan
npm run build
```

Unauthenticated GitHub API requests can hit a low rate limit during a full scan. For a reliable local refresh, provide `GITHUB_TOKEN` only in the scanner process environment; GitHub Actions supplies its scoped job token automatically. Never place a token in a command argument, config file, log, fixture, remote URL, or commit.

The scanner reads bounded public metadata and never executes discovered repository code. Do not add real API keys, private repository data, cookies, tokens, or production configuration to fixtures or issues.

## Data changes

Explain:

1. which claim is wrong or missing;
2. which source supports the correction;
3. whether the change affects maturity, capability matching, or a verdict;
4. how you tested it.

Keep generated snapshot ordering deterministic. Do not hand-edit `site/api/v1`; run the build script.

## Pull requests

Keep one explainable change per pull request. Include the commands actually run and call out any coverage or network limitation. By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
