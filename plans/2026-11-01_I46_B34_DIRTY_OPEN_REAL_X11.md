# I46 — independent B34 real-egui dirty-Open safety and PDF acceptance

## Scope and ancestry

Repository: ONLY i-shutov/tikzarium. Base B-owned PR #75 branch
b/b32-safe-open-source-undo-20261101, source HEAD at creation
61cc1d04f5a11d1515a81c1e75b55eda4aeccc0f, exact app/src tree
8752ed1d77f7c52f866ad493f0dd6042395ca34e.
QA branch: qa/i46-b34-dirty-open-real-x11.
New I46-only Python driver, predicates, reviewed-tree profile, workflow,
plan, insight and CHANGELOG. Do not touch B production or old #48 I06 branch.
Stacked QA PR targets #75, never main independently.

## Why this is release-critical

Unbound edited scratch + typed Open-path of an existing user's TeX
previously let "Save and open" persist scratch over the target. Merely
passing Rust event/unit tests or the B31 I45 smoke is insufficient.
Opening a new document must also clear native TextEdit Undo history:
a post-Open Ctrl+Z must not replay content from a different source.

## Acceptance contract — ALL mandatory

1. GitHub Actions checkout SHA exactly pinned; crates/tikzarium-app/src
   Git tree matches reviewed B34 tree. Fail before launching GUI if
   B-owned Rust code moves. Cargo.lock must not drift.
2. Launch real tikzarium-app native process under Linux X11/Xvfb;
   enter scratch TeX buffer using real xclip/xdotool keyboard input.
   Use real toolbar "Open path" and actual egui modal. Screenshots must
   come from the window process, not mockups.
3. Before opening create immutable QA-owned fixtures: UTF-8 Cyrillic,
   CRLF victim.tex containing opaque TeX macro and unrelated occupied
   TeX file. Record hashes. Reject scratch saves over either existing
   target; original bytes and hashes unchanged.
4. Use modal to save scratch to a NEW SEPARATE file. QA driver MUST NOT
   write this file itself. Assert exact pasted bytes, original victim
   and occupied bytes, and screenshot of loaded victim.
5. Send actual Ctrl+Z in opened source editor, use real GUI Save button;
   assert no victim bytes changed. Then GUI Build and Export (not QA
   shell invocation of XeLaTeX) must produce real PDF starting %PDF-,
   whose extracted Cyrillic and font embedding are verified by Poppler.
   A PDF containing only scratch text must fail.
6. Download workflow artifact; independently review critical screenshots:
   modal visibly present, rejects kept pending, separate save opens
   victim, source panel, final PDF. Compare hashes and logs. A mere
   screenshot difference is not a semantic or rendering PASS.
7. After exact-head QA success and artifact review merge I46 QA into B
   with expected_head_sha; rerun all applicable B exact-head workflows.
   Only then consider #75 merge into fresh main and post-merge CI.
   Physical Win10 x64/MiKTeX and macOS ARM/XeLaTeX remain NOT_RUN until
   independently exercised.

## Evidence vocabulary at authoring

- Hosted Linux/X11 real process: NOT_RUN until workflow finishes.
- Full modal click path: NOT_RUN; modal coordinates are provisional
  until initial screenshots are captured and independently calibrated.
- Original user-file preservation / real GUI PDF: NOT_RUN.
- Offline predicates: NOT_RUN until test job executes.
- Physical Windows 10/Mac M1/M4: NOT_RUN.
- Creating a QA workflow implies neither release nor main merge.
