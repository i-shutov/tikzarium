# TikZarium engineering instructions

**ACTIVE RELEASE RULE (2026-11-07):** Windows 10 x64 v1.0 first, freeze features. [W0–W4 GO/NO-GO](docs/WINDOWS_1_0_RELEASE_CONTROL_RU.md); [79 root causes/solutions](docs/TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md). For the recovered upstream26cf786d and the LOCAL, not-yet-published audit patch, read [docs/RESUME.md](docs/RESUME.md). The old foreground blocker was resolved on personal9c721242; physical-pixel W2a evidence is still unavailable after failed uploads in run42453220928. FullW2b/physicalW3/stableW4 are unaccepted. Current HIGH Administrator allowed with persistent warning, no new accounts/UAC/MiKTeX changes. Release PR only adds a bounded same-session owned-HWND foreground candidate, never weakening desktop/PID/PNG capture checks. Dated snapshots are historical; use the latest exact-SHA original evidence and resume record.


## LATEST OWNER CORRECTION — 2026-11-06, foreground Administrator/Cargo blockers

The owner explicitly requires working under their existing Administrator account and directs us to fix the artificial blockers. **Ordinary same-current-user XeLaTeX/PDF-tool execution, including HIGH/elevated Administrator, is supported.** The earlier blanket no-elevated-TeX / mandatory filtered-child launcher policy below is superseded, not an OS or MiKTeX restriction. Never force elevation or change UAC, registry, accounts, system MiKTeX, fonts or FlowBridge. Keep actual token facts, visible privilege warnings, disabled shell escape, offline/no automatic package installation, bounded and cancellable children. This is NOT an OS sandbox: use trusted documents when running elevated. Unknown/SYSTEM execution contexts remain separately unsupported.

Authority: issue108 comment6695354140; plan `plans/2026-11-06_OWNER_ADMIN_BLOCKER_CORRECTION.md`. Original server artifact13538772119 proves Rust tests/build passed and server-built EXEs have NO VCRUNTIME/MSVCP imports; a failing unverified python.exe was mislabeled as a Cargo/CRT failure. Do not reinstall Cargo/MiKTeX, alter CRT flags blindly or demand another user. Keep the existing private Rust/MSVC cache and process-only environment activation. Native PE audit must not depend on Python being installed on the owner server.

Acceptance requires hosted exact-head regressions, code/original-evidence review, expected-head merge, actual trusted-main personal-server native app/CLI proof and independent uploaded original PDF/font/Unicode audit. No arbitrary PR/fork code on the persistent machine. Never infer physical Windows10 GUI PASS from this compilation proof.

## Active release priority — Windows x64 first, features frozen

Owner decisions 2026-11-05/06: target physical Windows 10 x64 with independently installed MiKTeX/XeLaTeX. Linux 1.0.0-rc.1 is retained; physical Linux R4/stable tag remains NOT_RUN. Preserve Linux/macOS source and hosted CI. Earlier Linux-first sequencing and no-elevated policy in dated documents are historical. Current plans: `plans/2026-11-05_WINDOWS_X64_RELEASE.md` read together with the LATEST correction above. Do not equate hosted Windows2022 or personal Server2025 with physical Windows10.

## Product contract — TikZ-native, not a new CAD/TeX engine

1. Rust + egui, Windows10 x64 and macOS ARM64 M1/M4, Linux retained. XeLaTeX is externally installed by the user. Do not bundle TeX, silently install packages or substitute engines.
2. Keep ordinary editable TikZ source beside the drawing canvas. A visual action reveals/highlights its command. Canvas-only/source-only focus views are explicit choices, not the standard workflow.
3. Russian F1/hover, toolbar, Inspector and completion use one versioned catalogue: syntax, types/units/allowed values, verified defaults or UNKNOWN, effect, example, package/library/version/manual section. No invented defaults or copied manuals.
4. Distinguish installed, project-loaded, engine-compatible, tool-implemented and help-available states. UNKNOWN is valid for macro-dependent imports. Missing adapters do not prohibit source compilation. Lua-only code is not XeLaTeX-native.
5. Source authority: ordinary .tex/.tikz, minimal revision-checked SourcePatch/Undo preserving comments, macros, styles, unrelated bytes and CRLF. Do not regenerate arbitrary documents through a proprietary scene model.
6. Targeted lexical recognition and authored-command coordinate handles are allowed. Full TeX parsing/CST, macro expansion, CAS, universal geometry DAG/solver and PDF-to-source inversion are not prerequisites.
7. XeLaTeX PDF is authoritative; interaction overlays are provisional. Do not claim exact pointer mapping in unsupported opaque/transformed scopes. Preserve TeX expressions rather than approximate them in Rust.
8. Adding usepackage/usetikzlibrary is a visible undoable source edit, never package installation or a global MiKTeX configuration change.
9. Figure fontspec/unicode-math settings are independent of GUI themes/fonts. Verify actual glyphs and font embedding, not only exit zero. Never redistribute user font files.
10. Direct process invocation, shell escape disabled by default, bounded logs/workers, cancellation and stale/last-good preview. No full-OS-sandbox claims. Current Administrator support does not authorize suppressing warnings or weakening offline behavior.
11. Ownership: A core/CLI/MiKTeX; B egui UI; C shared catalogue; D independent fixtures/acceptance; integrator coordinates contracts. Read fresh main/PRs before editing, separate branches with exact-head leases. Ship meaningful code+tests+plan/insights blocks, not endless research micro-PRs.
12. Keep implemented/unit-event/hosted real GUI/physical desktop/NOT_RUN distinct. Scheduled dispatch is not completed work. No release calendar promises from early PR lead times. Preserve provenance and warning exceptions explicitly.

Core vertical: six genuine TikZ gestures → editable source → Russian F1/Properties/Libraries → revision-checked Undo/Save/Open → external XeLaTeX PDF with Unicode/embedded fonts. Physical Windows Server desktop W2 and actual Windows10 W3 remain required for the final Windows release; installer/tag W4 only afterwards. N4/domain packs/CAD/CAS/solver are out of scope during feature freeze. FlowBridge runner, services, work directories and other repositories are excluded.
