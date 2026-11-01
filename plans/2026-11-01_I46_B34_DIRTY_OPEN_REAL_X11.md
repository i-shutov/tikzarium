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

## 2026-11-01 verified real-GUI source-safety proof — I46 `d2c67a8`

[Exact QA run 41308995293](https://github.com/i-shutov/tikzarium/actions/runs/41308995293) **completed SUCCESS**, including locked Rust app build, offline QA predicates and actual X11 egui pointer/clipboard/keyboard Open/Save/Undo/Build/Export. Independent integrator downloaded [artifact 13084357319](https://github.com/i-shutov/tikzarium/actions/runs/41308995293/artifacts/13084357319), ZIP SHA-256 `409befdee4c02084d9df2505ee9aa4b6cd82d711c54625fef22a2399807c6220`. The manifest lists **21 files, all 21 hash-verified** (22 files including the report). App source tree `ecc6d40668fd6edddc97c682f8ddcca5fe615c99`; B-owned production unchanged.

- Real screenshots **independently visually examined**: `06-reject-target-after.png` and `07-reject-other-occupied.png` show modal retained after real button clicks, attempted victim/occupied paths and still-current scratch; both unrelated files preserved byte-for-byte. `09-opened-original-victim.png` shows original Cyrillic opaque macro loaded, not scratch; `10-cross-document-undo-fence.png` shows same source after actual Ctrl+Z and Save. `12-real-pdf-preview.png` shows exported GUI PDF after actual Build. Its 100%-zoom in-app screenshot crops the tiny PDF page; **do not count this as full-page layout acceptance**.
- Fixture victim remained exact 291-byte UTF-8 + CRLF, SHA-256 `95f90f192bd4cfd781126852be18adbb087f911b389e0b4340d1652c2abcbc7d`, with `\\OpaqueLabel` intact; occupied file SHA-256 `4c1dc1119dd34f419b07c457844ab4531b6b7698042233d79071a92db992a312`. The application itself created `saved-scratch.tex` (190 bytes), SHA-256 `b882a3d27d27a1ebad26e7be4e69eda6e51e996290ec4033fd59cc2fecf9d519`, byte-identical to pasted scratch. QA did not create this output.
- GUI Build/Export produced actual one-page `victim.pdf` SHA-256 `a63678b04fbc824e9d6c64d931378776fb5f75d87659a7b1875e3e57bffd06d3`; independent `pdftotext` extracts `Не менять`, and `pdffonts` shows embedded, subset, Unicode-capable DejaVuSerif. No external QA script called XeLaTeX to create the output.
- Verdict for **this Linux/X11 source-integrity vertical**: **PASS after automated run AND manual screenshots/manifest/PDF inspection**. This does NOT prove physical Windows 10/MiKTeX or macOS ARM M1/M4, full-page zoom, native OS Save As dialogues or multi-document concurrency; all those target-host scenarios remain **NOT_RUN**.
- Documentation-only evidence commit after `d2c67a8` must receive its own final exact-head CI before stacked PR integration. No premature merge based on an untested new commit.

## I47 B34 six-native-tools actual desktop regression, staged alongside I46

The accepted main `16ef4fcdc6c8aa886a4f8ae23165f6c7168271e5` carries successful historical I45 B31 desktop proof, but the unchanged `.github/workflows/n1-desktop-smoke.yml` hard-pinned B31 `app/src` tree `af316d5e5452d74186b92d65c95c448253d0e61c`. As soon as B-owned source changed for #75, that historical I45 workflow failed **before starting GUI**; this is not a B34 product failure, but it would invalidate #75 acceptance if left unaddressed. I46 only checks dirty-Open; it does NOT exercise the six TikZ pointer tools and responsive full-page controls.

This QA-only I47 extension, in **the SAME stacked QA PR #77** (no new micro-PR), repins both workflow and typed six-gesture source profile to actual reviewed B34 `app/src` tree `ecc6d40668fd6edddc97c682f8ddcca5fe615c99`, fixes its offline source-pin test, and enables actual X11 six-gesture run on QA branch and B PR. It still checks actual source bytes, held pointer XTest Ctrl+Z, F1 Russian help, Save/reopen, GUI XeLaTeX PDF, embedded glyphs, compact Fit Width/Fit Page, responsive resize and restored zoom display. The old B31 coordinate profile is only a provisional starting position: B32–B34 changes are restricted to modal/source handling rather than native-tool coordinates. **No B production edits**. Must inspect fresh I47 screenshots/PDF, hashes and settled zoom before marking actual B34 desktop PASS.

Before any stacked merge require **both I46 source safety and I47 six-tool desktop checks succeed on one exact final SHA**, plus critical artifact manual inspection. Follow with #75 exact-head new workflows, then fresh main postmerge CI. No physical Win10/MiKTeX or Mac M1/M4 acceptance claimed.

## 2026-11-01 independent I46 + I47 exact-B34 real-desktop manual acceptance

**Reviewed tested source SHA: `4e31346c4a54d6efd22a120af130e7520a4f36f1`**, B-owned `app/src` remains `ecc6d40668fd6edddc97c682f8ddcca5fe615c99`. Two separate actual egui Linux/X11/Xvfb workflows **completed SUCCESS** and their artifacts were downloaded and independently audited; NOT mock `Context::run`, headless Session or a bootstrap frame.

1. **I46 source safety [run 41309725726](https://github.com/i-shutov/tikzarium/actions/runs/41309725726)**, [artifact 13084842374](https://github.com/i-shutov/tikzarium/actions/runs/41309725726/artifacts/13084842374): ZIP SHA-256 `502d3737766e43545376a6cf5c9001f1dffdf49cf5a88134f23fbec48ed54f32`, archive CRC clean, 21/21 report files hash-verified. Genuine frames `07-reject-other-occupied.png` and `09-opened-original-victim.png` manually inspected: blocking Russian modal rejects occupied separate save with unchanged existing source, then safe separate scratch save loads original Cyrillic/opaque-macro/CRLF TeX. `12-real-pdf-preview.png` inspected: real GUI Build/Export PDF, document text `Не менять` verified with independent Poppler, embedded DejaVuSerif. The PDF preview at 100% is **cropped**, so this scenario proves source-safety/PDF generation, NOT page fit. Actual Ctrl+Z then Save did not mutate original victim. Exact PDF SHA-256 `ec534953b4ff92e2a1acc72309588a44ce84c348614b1c146522996fa43bbe97`.
2. **I47 N1 six native tools [run 41309725695](https://github.com/i-shutov/tikzarium/actions/runs/41309725695)**, [artifact 13084049027](https://github.com/i-shutov/tikzarium/actions/runs/41309725695/artifacts/13084049027): ZIP SHA-256 `6eee8a166a6652b518666f85c395dd7c428aed1af9950e546d0e499776d9c681`, CRC clean, **42/42** manifest files independently hash-verified (under `i19-evidence/` path prefix). Real egui creates all six C-catalogue TikZ gestures (line, arrow, rectangle, circle, text/math node, cubic Bézier), held-pointer X11/XTest Undo for click/drag without ghost strokes, new gestures after Undo, selection/inspector and Russian F1. Real GUI Save/Build/Export resulted in a one-page PDF with Unicode `A` and `Не менять`, embedded DejaVuSerif; PDF SHA `d94b563b6da55896368d1e6115517c132b258fd85bd3ea11f98c8a820e400fcd`, saved source SHA `71102a5e590bc1b4405fb6a8235a06e3b053d685e429f3acdfa45ae631457c0`; no original Cyrillic opaque-macro loss. Manually inspected actual `03-f1-panel.png`, `04g-b31-zoom-readout-settled.png`, `04e3-b31-compact-fit-page-restored.png` and canonical PDF reference: at restored 1366×740, Zoom 25% corresponds to visible complete PDF, includes all six constructions and `Не менять`; 1180×680 compact Fit Page shows complete but deliberately tiny 7% preview. Provisional guide is explicitly not treated as exact PDF geometry.

**Acceptance verdict for these two bounded Linux/X11 native GUI verticals: PASS with independently inspected screenshots, saved-source, Poppler and manifest evidence on exact tested source SHA.** The follow-up evidence-document and workflow-trigger head requires fresh CI on its own SHA before stacked merge; historical B31 PASS is not substituted. B #75 production untouched. **NOT_RUN**: physical Windows 10 x64 with separately installed MiKTeX, physical Mac M1/M4 with external XeLaTeX, native OS dialogs on the two target platforms. No release 1.0 claim.

## Post-merge source-safety CI continuity

I46 initially triggered only on the independent QA branch / stacked PR targeting B. Without a `main` push and `main` PR trigger, accepting B #75 would leave real dirty-Open user-file safety without its own post-merge GUI test. The same reviewed-tree-gated I46 workflow now also runs on the B integration branch and accepted `main` (path filtered), and on PRs targeting `main`. This is **QA CI plumbing only**, not a new production implementation, and does NOT turn hosted Linux/X11 into physical Win10 or Mac acceptance. Reviewed B34 app/src SHA remains pinned; future changes require independent repin/screenshots rather than silent reuse. Fresh exact-head CI of this trigger revision must pass before #77 merge.


## I48 B35 follow-through, 2026-11-01

Independent I46 dirty-Open/X11 and I47 six-gesture/X11 acceptance are rebased onto B35 owner branch `8b4f25bc827b264f10083f038e0f7bd55f8dfe69` after comparison (source-only B35 changes versus QA-only I46/I47 changes). Current B35 app/src tree: `46aced2dbe1b66ba10d8cc92292024625e73936b`; previous B34 QA base: `1c82dab1583119bfbdf8aa863bd5760c4d3935ef`. Retain a single actual-egui vertical: scratch Save/Build/Ctrl+S reject occupied Open target; modal rejects victim/third file; accepts a separate unused scratch file; byte-preserves CRLF/Cyrillic/opaque TeX; fences Undo across Open; invokes external XeLaTeX GUI PDF with glyph/font checks; tests six native TikZ gestures and held-button Undo. No production Rust edits. The previously reviewed B34 modal coordinates are *provisional* on B35 until new exact-head artifacts, including explicit visible error *inside* the modal, are inspected. CI trigger is not GUI acceptance. B35 actual X11 and physical Win10/M1/M4 remain NOT_RUN at this commit.


## I49 B35 actual modal reflow bug in independent X11 driver — 2026-11-01

The first exact QA `94a081559f280acda0fe6718982f98b5866caf31` B35 real egui/X11 I46 run [41313976782](https://github.com/i-shutov/tikzarium/actions/runs/41313976782) **FAILED** at "Production modal never saved scratch to separate file", despite successful app launch, Cargo build, offline predicates, and verified original victim/occupied SHA256 byte preservation. Downloaded artifact [13085569228](https://github.com/i-shutov/tikzarium/actions/runs/41313976782/artifacts/13085569228) (ZIP CRC PASS) and independently reviewed screenshots 05/06/07/08. B35 product's requested fix **IS confirmed in real foreground modal**: 06 displays bright-red "Файл уже существует. Автоматическая перезапись чужого TeX запрещена; выберите новое имя." The live modal layout **re-centers** when this new red error line is shown. Before error the save TextEdit is at approx x465–875, y381–401 (driver click [675,398]); after error it moves to x465–875, y366–387. The old subsequent click [675,398] selected the explanatory text, not the TextEdit. Screenshots 06 and 07 have identical SHA-256; 08 still displays victim.tex, not the intended new scratch destination. Consequently the first X11 red run diagnoses a **QA mouse coordinate defect**, *not* a demonstrated B35 application failure. Do **not** claim the full safe Save/Open, cross-document Undo or GUI PDF PASS from I46 yet.

QA-only correction introduces screenshot-reviewed `modal_input_with_error=[675,376]` and bounds [465,366,875,387], separate from no-error `modal_input=[675,398]`. Driver uses error-state click after each rejected Save, offline tests reject stale y398 and missing bounds; B production Rust/source tree unchanged. New exact-head workflow, saved-scratch exact byte hash, original victim/occupied hashes, cross-buffer Undo, PDF glyph/font, and screenshot 07/08/09 must be independently reviewed before PASS. B35 I47 six actual pointer gestures/held-button Undo/PDF [41313976739](https://github.com/i-shutov/tikzarium/actions/runs/41313976739) **PASS exact previous QA SHA** with B35 app tree, downloaded ZIP artifact [13086785731](https://github.com/i-shutov/tikzarium/actions/runs/41313976739/artifacts/13086785731), ZIP CRC and 42/42 file SHA256 verified and visual sample/manual PDF inspected; this proves that unchanged B35 production tree, not the as-yet-unrun new I46 QA. It does not replace the I46 source-safety gate. Physical Win10+MiKTeX and macOS ARM remain NOT_RUN.
