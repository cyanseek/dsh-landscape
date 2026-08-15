# Agent result format

Keep the default answer compact and action-first:

```text
DSH Capability Preflight

Need
- Add Linear issue management to this DSH setup.

Current environment
- PARTIAL: plugin and tool inventory available; profile and version unavailable.

Existing coverage
- owner/project — Tested — short evidence-backed role

Risks
- UNKNOWN: current version compatibility is not exposed.

Decision: EXTEND
Do not build: the tested issue-query surface in owner/project.
Build only: the exact missing mutation surface.
Next action: verify the extension seam; make no profile change yet.
```

Include source links beside contested claims. Keep the legacy verdict, recommendation, confidence, and discovery provenance available when relevant. If coverage is incomplete, use `INVESTIGATE` / `UNKNOWN` and name the failed or stale coverage rather than burying it.
