# Agent result format

Keep the default answer compact:

```text
Verdict: PARTIAL

Already covered
- owner/project — Tested — short evidence-backed role

Still missing
- Exact missing sub-capability

Recommendation: EXTEND owner/project; do not duplicate its working surface.
Confidence: 0.84 (two source catalogs complete; live GitHub verification complete)
Intelligence: Host Agent (Codex) over DSH Landscape evidence
```

Include source links beside contested claims. If coverage is incomplete, lead with `UNKNOWN` and name the failed/stale coverage rather than burying it.
