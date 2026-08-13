---
name: dsh-landscape
description: >-
  Find existing DeepSeek Harness plugins and capabilities, determine whether a DSH need is covered, partial, crowded, placeholder-only, unknown, or a genuine gap, and generate build-ready ecosystem briefs. Use when a user asks whether DSH already supports something, wants a DSH plugin recommendation, wants to avoid duplicating an existing plugin, wants to identify a plugin opportunity, or asks what is missing in the DeepSeek Harness ecosystem.
license: MIT
---

# DSH Landscape

Preserve the user's original natural-language need. Complete discovery, evidence retrieval, semantic review, and recommendation without asking the user to configure Landscape-specific credentials.

## Query workflow

1. Identify the current host as `codex`, `dsh`, `claude-code`, `opencode`, or another short kebab-case name.
2. Run the bundled query router. Pass the host explicitly so the CLI records host-Agent mode without human configuration:

   ```bash
   node scripts/query.mjs analyze "<original need>" --host-agent codex
   ```

   The router uses a repository-local CLI when present and the GitHub zero-install package otherwise. It automatically requests JSON and fresh negative verification.
3. Read the JSON evidence. Use the host model to evaluate the intended capability, maturity evidence, overlap, missing sub-capability, and recommendation. Treat the CLI verdict as provisional when `semanticReasoningPerformed` is false.
4. For `gap` or `placeholder-only`, require both `coverage.complete` and `coverage.fresh`; also require successful `coverage.liveVerification` when it was attempted. Otherwise report `UNKNOWN`.
5. Never equate a repository name or README claim with a working implementation. Use maturity evidence and source URLs.
6. If the user wants to build the missing capability, run:

   ```bash
   node scripts/query.mjs brief "<original need>" --host-agent codex
   ```

   Refine the handoff with host reasoning, then continue the user's coding workflow. Do not duplicate mature projects without an explicit extension boundary.
7. Return one concise verdict, closest projects, the exact missing capability, recommendation, confidence/coverage provenance, and build-brief status when applicable.

Do not request GitHub credentials during the normal workflow. Do not install a discovered plugin or modify a DSH profile unless the user explicitly asks.

Read [references/methodology.md](references/methodology.md) before resolving a negative verdict or maturity dispute. Read [references/result-format.md](references/result-format.md) when formatting the final answer. Read [references/dsh-extension-map.md](references/dsh-extension-map.md) only when producing a build brief.
