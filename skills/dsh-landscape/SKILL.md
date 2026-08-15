---
name: dsh-landscape
description: >-
  Run a read-only capability preflight before adding, installing, comparing, replacing, upgrading, disabling, composing, or building for DeepSeek Harness. Use when a user asks whether DSH already supports something, which plugin fits, whether an option fits the current profile, what risks or duplicates exist, what should not be rebuilt, or what genuinely remains missing.
license: MIT
---

# DSH Landscape Capability Preflight

Before any DSH capability mutation or implementation, run Landscape. Preserve the user's original natural-language need and complete the preflight without asking them to select a mode, provide a profile, refresh data, initialize Landscape, or configure Landscape-specific credentials.

## Default workflow

1. Run the bundled router with the need itself. The Agent supplies its own host signal internally; the human does not:

   ```bash
   node scripts/query.mjs "<original need>" --host-agent codex
   ```

   The router prefers the repository-local CLI and otherwise uses the GitHub zero-install source. It requests structured JSON and fresh verification only when a negative or uncertain result needs it.
2. Read `intent`, `environment`, ecosystem evidence, `risks`, `decision`, `doNotBuild`, `buildOnly`, `nextAction`, and `limitations`. Use host reasoning to review the evidence; do not expose internal mode selection as a user task.
3. If `environment.status` is `unavailable`, continue with ecosystem-only evidence, state the limitation, and do not ask for a path or profile. If it is `partial`, use only the fields actually returned.
4. Never equate a repository name or README claim with a working implementation. For `gap`, require complete and fresh coverage plus successful live verification when attempted; otherwise return `INVESTIGATE` / `UNKNOWN`.
5. Keep the preflight read-only. Do not install, enable, disable, upgrade, uninstall, edit a profile, or create a repository unless the user separately requests that action.
6. If the user has requested implementation and the decision still permits it, generate the compatible detailed handoff:

   ```bash
   node scripts/query.mjs brief "<original need>" --host-agent codex
   ```

   Build only `buildOnly`; preserve every item in `doNotBuild`. Prefer extension or composition over duplicating mature coverage.
7. Return the compact structure in `references/result-format.md`, leading with the decision and immediate next action.

## Compatible advanced routes

The existing explicit routes remain available for targeted discovery or build handoffs:

```bash
node scripts/query.mjs find "<query>"
node scripts/query.mjs analyze "<original need>" --host-agent codex
node scripts/query.mjs brief "<original need>" --host-agent codex
```

Do not request GitHub credentials during the normal workflow. A failed live lookup falls back to the bundled snapshot and weakens a negative claim; it never blocks the preflight or creates a gap claim.

Read [references/methodology.md](references/methodology.md) before resolving a negative verdict or maturity dispute. Read [references/result-format.md](references/result-format.md) when formatting the final answer. Read [references/dsh-extension-map.md](references/dsh-extension-map.md) only when producing a build brief.
