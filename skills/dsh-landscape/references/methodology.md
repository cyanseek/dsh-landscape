# Evidence and verdict methodology

Use this reference for negative verdicts and maturity disputes.

## Maturity

- `placeholder`: empty/effectively empty repository, or an explicit placeholder/WIP claim without an implementation or install path.
- `prototype`: meaningful implementation evidence exists, but a usable install path or tests are not established.
- `installable`: a plausible concrete install path is present; this does not prove runtime success.
- `tested`: meaningful tests or CI accompany an installable implementation; this does not prove current DSH compatibility.
- `verified`: reserve for a recorded runtime acceptance test. Phase 1 normally does not assign this label.
- `unknown`: bounded evidence cannot support a stronger label.

## Negative claims

Report `GAP` only when all configured ecosystem sources completed, the snapshot is within its freshness window, and any requested live verification completed. Phrase the conclusion as scoped evidence: “No active implementation was found across the named sources.” Never say “nobody has built this.”

Report `UNKNOWN` when a source failed, the snapshot is stale, a live search failed or was truncated, relevant projects have unknown maturity, or semantic interpretation is unavailable for an ambiguous need.

## Recommendations

- `USE`: one mature implementation covers the need.
- `EXTEND`: real coverage exists but a concrete sub-capability is missing.
- `BUILD`: a fresh, complete gap or placeholder-only area has a defensible missing capability.
- `AVOID DUPLICATION`: several active mature implementations overlap substantially.
- `INVESTIGATE`: evidence or semantic interpretation is insufficient.
