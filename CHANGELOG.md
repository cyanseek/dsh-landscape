# Changelog

All notable changes are documented here.

## [0.3.0] - 2026-08-16

### Added

- Zero-configuration capability preflight from one natural-language need.
- Additive intent, read-only environment, decision, risk, build-boundary, next-action, and limitation fields.
- Best-effort DSH Loader and Tool inventory with honest unavailable fallback and path sanitization.

### Changed

- Human output now leads with the preflight decision while preserving the existing evidence contract.
- The CLI accepts a need directly while retaining `analyze`, `find`, `brief`, and `status`.

## [0.2.0] - 2026-08-14

### Added

- Installable DeepSeek Harness bundle with a native `dsh_landscape` evidence tool.
- Runtime tests covering registration, execution, output schema, and bundle metadata.

### Changed

- Fresh verification now observes the DSH tool execution cancellation signal.
- Release checks are explicit so GitHub installation does not require pnpm `allowBuilds` approval.

## [0.1.0] - 2026-08-14

### Added

- Need-first `analyze`, `find`, and `brief` CLI workflows plus a diagnostic `status` utility.
- Host-Agent, standalone OpenAI-compatible LLM, and transparent search-only intelligence modes.
- Evidence-based maturity, coverage-aware verdicts, bilingual capability matching, and fresh negative verification.
- Deterministic scanner merging the public `dsh-plugin` topic with Awesome DeepSeek Harness catalog data.
- Bundled snapshot, Node API, static versioned data API, and accessible static website.
- Portable Agent Skill with local and zero-install routing.
- English and Chinese documentation, governance files, CI, refresh automation, and Pages deployment.
