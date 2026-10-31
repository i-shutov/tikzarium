# C/N2 literal library disconnect — QA evidence ledger

2026-10-31. Repository i-shutov/tikzarium. Base main 97c4b44eeee7ac84ba85f789269c3e15a9f528e4; PR #49 was already merged. Own branch feat/c-n2-library-disconnect-20261031. No A/B/D/E/F production or test files changed.

## Implemented contract

- Public additive plan_library_disconnect returns AlreadyAbsent, Proposed or Refused(reason); never changes source during planning.
- One confirmed literal library declaration and precise byte deletion (entire standalone declaration-only line or one comma-list member). The selected declaration must have no inline comment; duplicated same-library imports refuse.
- The existing SourceTarget range+revision and SourcePatch old-byte/revision check are reused for apply and inverse Undo. B can show exact before/after source range with no guessed TeX expansion.
- Project import status, installed file lookup, engine compatibility, tool implementation, help availability and raw source compilation remain distinct. Lua-only is not advertised for XeLaTeX.

## Added Rust regression tests

Test file crates/tikzarium-extensions/tests/project_disconnect.rs:
1. CRLF standalone declaration, Cyrillic comments/body and byte-perfect inverse Undo.
2. All four supported names independently disconnect with remaining libraries preserved.
3. First/middle/last item in a comma list and byte-for-byte inverse Undo.
4. Nontrivial comma spacing retains all surviving syntax.
5. Duplicate active imports across lines or within a list refuse rather than yield false disconnected status.
6. Same-line user comments refuse rather than silently delete notes.
7. Macro/conditional/mixed-newline imports refuse; status remains UNKNOWN where appropriate.
8. Already-absent, unsupported and wrong source range.
9. Stale revision, changed begin anchor and stale undo conflicts are atomic refusal.

## Evidence status

- Current sandbox has no cargo/rustc and cannot resolve github.com for git cloning. Local Rust fmt/check/test/clippy: NOT_RUN.
- The new source-deletion Rust tests are written, **not yet PASS** until hosted CI runs on exact commit SHA.
- Four XeLaTeX import fixture generators and the original six primitives come unchanged from merged main. No new standalone real XeLaTeX execution has occurred for disconnect.
- Windows Server hosted CI is not physical Windows 10 x64/MiKTeX. Hosted macOS is not a physical M1/M4 GUI. Physical and visual disconnect UI: NOT_RUN.

## B/D handoff

The additive proposal was posted to B PR #50 before implementation. It changes no existing project_imports types or app/core code. B must provide visible removal diff, confirmation, verified apply and inverse Undo. D retains independent fixture execution and negative source cases; E/F-owned tests/docs remain untouched. CI results and exact head will be appended after verifying real workflow outcomes.
