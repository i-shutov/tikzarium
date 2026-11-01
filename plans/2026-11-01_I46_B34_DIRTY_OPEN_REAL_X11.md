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

## 2026-11-01 current B source integration checkpoint

I46 merged B-owned PR #75 source f9a4838c8e3a2ea2e2adf58efc152a016c41f09a without editing B production files. Current pinned app/src tree is ecc6d40668fd6edddc97c682f8ddcca5fe615c99. Original B34 8752ed1d77f7c52f866ad493f0dd6042395ca34e was the bootstrap tree only. The I46 real-X11 workflow must now test the current merged QA checkout. All artifact/manual/physical results remain NOT_RUN until independently verified.

## Expanded B33/B34 negative GUI paths and X11 focus recovery

Before dirty-Open modal confirmation, real GUI now exercises toolbar **Save**, keyboard **Ctrl+S**, and toolbar **Build** with the unbound scratch and the same existing typed target. Preserve victim/occupied file SHA and capture screen after every operation; source protection only becomes accepted after independent review of UI state. This closes three additional real user entry points to the same historical overwrite class. The X11 driver verifies keyboard focus after a bounded EWMH-activation or direct X11 input-focus path because Openbox can publish _NET_ACTIVE_WINDOW asynchronously. Driver-level launch/focus failure is **QA FAIL**, not product data-loss evidence; physical target verification remains NOT_RUN.

## 2026-11-01 I46 real screenshot calibration — failed run 41307868676

At exact QA HEAD `6081478b530a9ed4f569404721367d567fdc9b1b`, GitHub Actions launched the B34 egui window, pasted scratch and typed an existing victim path. The real screenshot `08-accept-separate-before.png` (downloaded artifact `13083723849`, ZIP digest `2d0452d547306e8b8d6a6384bb6f55b214497bb919159838fedd1934389be04d`) shows the button at approximately x465..603, y416..441. The old QA coordinate x506,y458 was **below** that button; therefore rejection clicks and positive Save-and-open were never executed, and run stopped at `Production modal never saved scratch to separate file`. The unchanged victim SHA proves only no overwrite happened, NOT that the rejected modal handler worked. This is **QA coordinate failure**, not evidence of a B34 product bug.

Calibrated QA-only modal Save coordinate to (536,429), bound it to the reviewed actual button rectangle and added an offline negative regression for the former missed coordinate. Source tree is still `ecc6d40668fd6edddc97c682f8ddcca5fe615c99`; **no production B source changed**. Exact-head workflow, positive Save→Open→Undo→real GUI XeLaTeX PDF and independent screenshots: PENDING/NOT_RUN until new run is reviewed; physical Win10 and Mac M1/M4 NOT_RUN.
