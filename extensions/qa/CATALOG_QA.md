# C04 — Static extension catalogue consistency gate

This is a **metadata** QA gate, not a compiler test, package lookup or visual-edit
acceptance. Its inputs are the five bundled TOML manifests, the broader
`extensions/PACKAGE_MATRIX.csv`, and the five fixed source fixture bindings
from `run_smoke.py`. Nothing here executes TeX or loads a plugin.

Run from repository root with Python 3.11+:

```sh
python extensions/qa/verify_catalog.py --report /tmp/tikzarium-catalog-audit.json
python -m unittest discover -s extensions/qa -p 'test_verify_catalog.py' -v
```

The audit rejects missing/duplicate/dangling manifest IDs and matrix rows,
manifest/row engine mismatch, an absent/symlinked fixed fixture source,
invalid CSV fields and unsafe TOML inputs. It explicitly keeps the general
matrix's `installation=NOT_PROBED`, native XeLaTeX rows `NOT_TESTED`, and
LuaLaTeX-only rows `INCOMPATIBLE_ENGINE`; it disallows optimistic visual
capability statuses and nonempty manifest `visual_features` until reviewed
source-safe adapters and a new evidence schema exist.

The output JSON includes `accepted`, row/binding counts and failures. The
accepted result means only that static metadata has not drifted. This tool
cannot establish actual TeX package availability or versions, compilation,
source inspection, GUI editing, physical Windows 10 x64/macOS ARM64 support, or
trusted artifact provenance. The v1 output is not an attestation.

A future reviewed editor adapter must update the gate **together with** its
schema and independent source-preserving/round-trip tests. Do not make a
static CSV claim equivalent to a verified runtime capability.

Maintainership: lane C. Workflow wiring and artifact upload belong to lane D;
`docs/EXTENSIONS.md` currently has pending integration edits in PR #24, so
this workpack deliberately avoids overwriting it.
