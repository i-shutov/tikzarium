# TikZarium 1.0 Scientific Studio — рабочие блоки и владение

Дата: 11.11.2026. Нормативный scope: [RELEASE_SCOPE](../docs/RELEASE_SCOPE_SCIENTIFIC_STUDIO_1_0_RU.md). После принятия этой версии **не выпускать старый узкий TikZ-only продукт под v1.0.0**. Очередь ST-SCI → ST-UML → ST-BPMN → ST-ENG → ST-CHEMBIO → ST-ANIM → ST-OTHER → ST-DATA сохраняется.

## Checkpoint 13.11.2026 — scientific mixed Undo принят в hosted GUI

[Независимо проверенный итог](../insights/2026-11-13_HOSTED_SCIENTIFIC_WORKFLOW_RU.md): exact source `b646c4d46d331a281c1fe51d6bcc79c436ffdf35`, app tree `fe40516186fb1728baceb40d0da137a780c1d9de`, [run 43370706180 SUCCESS](https://github.com/i-shutov/tikzarium/actions/runs/43370706180). Настоящий SV-001 derivative, Unicode Paste, clipboard-confirmed draft151, один байт Apply150→151, два Undo, byte-exact Save/Open, GUI XeLaTeX/current PDF Export прошли с независимым просмотром оригиналов. Scope **HOSTED_GUI Linux/Xvfb 1366×768, клиент1180×680, Midnight**; 1-page PDF и 4 embedded fonts проверены. Локальные 566 tests/fmt/strict Clippy/build и 20 evidence contracts PASS. Все16 CI runs завершены:14 success/2 исторических I61/N5 lease failures. Общий CI/stable/merge GO не объявлен.

**Следующая executable задача:** адаптировать и полностью перепроверить I61/N5 на компактном UI, сохраняя исходные требования и original evidence. Этот SV-001 не закрывает их шесть примитивов, packaged launch или отдельные library/parameter контракты и не разрешает механически заменить pin. Physical Win10/IME/DPI/G3 и полный ST-SCI остаются отдельными обязательными gates.

## Checkpoint 13.11.2026 — общая история текста и scientific SourcePatch

[Отчёт и оригинальные журналы](../insights/2026-11-13_SHARED_SOURCE_HISTORY_RU.md): исправлен подтверждённый сброс текстового Undo после Inspector Apply и визуального Undo после последующей ручной правки. Production передаёт точные inverse patches в общий bounded ledger с revision/expected-byte fences; Open отделяет document identity и старый queued/raw input. Новых idle source clones нет. **566 tests PASS / 0 failed / 4 ignored**, fmt/strict Clippy/app+CLI build PASS; четыре production-shell raw-egui регрессии `UNIT_EVENT`, collector 16/16 PASS, отдельный static review.

База PR #189 `0eee418…`: 13 success / 2 старых I61/N5 APP_TREE stops; D QA matrix завершён success. Финальный source SHA и CI нового блока фиксирует интегратор после публикации. Локальные production-окно/мышь наблюдались, полный native workflow из-за keyboard focus не принят. Отдельные hosted 1366×768 workflow/driver готовятся, originals/результат ожидаются; I61/N5 не изменены. **Следующая executable задача:** exact-commit SV-001 derivative → Inspector draft/Apply `150 → 151` → два Undo → точные Save/Open → GUI XeLaTeX → PDF с независимым просмотром оригиналов. Physical Win10/IME/DPI/G3/full ST-SCI и stable/merge GO остаются открытыми.

## Checkpoint 12.11.2026 — Compact Studio: exact recovery

[Восстановление и свежая проверка](../insights/2026-11-12_COMPACT_STUDIO_RECOVERY_RU.md): original app tree `6c3208dc…`, 25/25 blobs, 562 tests/fmt/strict Clippy/build PASS. Компактное меню/toolbar, source sections, глобальные offsets, единый source Undo/Redo и six-page native atlas восстановлены для публикации в существующий PR #189. Старые GUI PASS не перенесены; новая native попытка заблокирована desktop focus до запуска приложения. APP_TREE leases не ослаблялись. Следующий executable block — повторный полный native PGFPlots workflow 1366×768 с оригинальными свидетельствами, затем актуализация соответствующих сценариев acceptance.

## Checkpoint 12.11.2026 — SCI-BUILD, PR #189

[Текущий отчёт и оригинальные свидетельства](../insights/2026-11-12_SCI_BUILD_CHECKPOINT_RU.md). Code `79168f6`: 531 workspace tests/fmt/strict Clippy/build PASS; начальный bounded SHA inventory + фактический post-build recorder, явный project root и CLI fail-closed publication. Native Linux F14_3 с `../data`: ручной root → Build → Preview → Export PASS; same-length external data edit → stale/blocked export/last-good retained PASS. Исходные данные восстановлены. Системный folder picker не открылся, введён проверенный ручной маршрут. Это не приёмка полного scientific/Windows scope.

**Ближайший блок:** SCI-PGF/SCI-QA, реальный compact Inspector → patch → Undo → Save → PDF. Старые APP_TREE gates проверять вместе с соответствующими сценариями, не перепривязывать по одному startup/F14 screenshot. Неизменяемый snapshot для произвольных конкурентных изменений входов остаётся отдельным ограничением SCI-BUILD; pre/post comparison не обнаруживает modify-and-revert. Следующие движки и домены сохраняют прежний порядок.

## Выполнение: два последовательных интеграционных вертикальных среза

**V1, немедленно:** native scientific TikZ workflow в Studio: project/new/open → 6 direct tools → Inspector/Apply/F1/source → Save/Undo → XeLaTeX PDF, диагностика, stale/last-good, export/reopen. Прежде чем закрывать V1, нужны native compact GUI и проверенный source/evidence. Это часть Scientific 1.0, но ещё НЕ вся 1.0.

**V2:** shared PGFPlots SC3/AT4 axis/addplot/формулы/сохранение .dat/.csv dependencies, реальный Inspector→минимальный patch→Undo→XeLaTeX PDF; затем весь corpus MUST SCI142/научный AI88. Только после подтверждения shared scientific runtime — Asymptote, Typst/CeTZ. Никаких Graphviz-first/D2/Mermaid-first работ и Data Figure раньше научной приёмки.

## Исполнительские пакеты и DoD

| ID | Задание | Узкое владение файлами | Приёмка |
| --- | --- | --- | --- |
| SCI-UI / #172 | Исправить ошибки PR #172, шесть native direct tools, primary Build, Properties, source/palette state; rebase к текущему main | studio_ui.rs + GUI tests; main.rs только интегратор | rustfmt/clippy -D warnings/all targets, real raw-pointer clicks 6/6, exact Unicode/CRLF, original desktop PNG и клавиатура |
| SCI-DESIGN / #169 | 4 темы, typography/spacing/contrast/hover/focus/disabled, responsive 1180×680/1366×768 | ui_theme.rs и отдельные token modules; не main.rs | 4 themes при OS theme hint, real native PNG, contrast/keyboard, figure TeX source unchanged |
| SCI-INSPECTOR / #170 | Compact coordinates/units, single Apply, no duplicated F1, help navigation | tikz_canvas/inspector helper + catalog, main.rs bridge only integrator | source patch→Undo→PDF, no hidden mutation, no clipped fields, F1 and focus |
| SCI-EDITOR-G3 | Bounded incremental editor layout & memory; source/Undo/IME; 3-document independent revisions/views | source editor/project/document modules (isolated) | native p95≤50ms at10k/1MiB, first editable≤2s, stress100k/10MiB, actual memory stats, exact UTF-8/CRLF |
| SCI-BUILD | Descriptor/profile/request/result, existing XeLaTeX backwards compatible, cancel/stale/diagnostic dependency | tikzarium-core build + CLI, NOT UI layout | locked workspace tests, real XeLaTeX positive/negative, child cancel, version and dependencies; no second MiKTeX |
| SCI-PGF | Source-preserving SC1–SC6 plus PGFPlots shared SC3/AT4; corpus-specific visuals | extensions/catalogue + new scientific modules | axis/addplot 1 real GUI vertical, 142/103 tracking, AI88 relevant IDs, source and PDF/Undo checks |
| SCI-ASY | Verify Asymptote version/licence/CLI/platform, build profile and supported native scientific parameter edit | isolated scientific adapter/fixtures | local scientific file→real GUI build/preview→edit/Undo→export, negative missing executable |
| SCI-TYP | Verify Typst/CeTZ and add scoped native profile after SCI-ASY | separate Typst adapter/fixtures | real supported .typ source→edit→build→preview→PDF, version and licence proof |
| SCI-CORPUS-QA / #171 | Independent source/render/scientific/UX reviewers | QA scripts/ledgers/originals (not the author's production files) | SCI142 142/103 acceptance; AI88 per ID; screenshots/PDF/logs; no false PASS |
| SCI-WIN10-CODEX | Native Windows10 local Codex for read-only environment and GUI/evidence, Server separate | personal QA evidence path only | W0/W1/W2b/W3/IME/96/120/192/W4 separately; original SHA+PNG+Tex/PDF/log; non-intrusive |
| SCI-RELEASE | exact engine/operation matrix, freeze, packaging, release notes, rollback | docs/release manifests integrator only | source exact SHA, original E2E scientific artifacts + cross-platform CI + physical Windows GO |

**Ownership discipline:** one integrator owns main.rs, shared schema, merges and release changes. Junior models may receive implementation/fixtures/research tasks *only through a confirmed launcher*. GitHub assignment to Copilot was refused (HTTP 422); writing issues is NOT running subagents. Record actual model/session/branch/checkpoint when launched. Independent source audit and native QA are separate from code author.

## Blockers to remove with evidence, not assumptions

1. **PR #172 is OPEN DRAFT, its checked HEAD has failed checks.** Read exact failing job logs and fix rustfmt/clippy/dead-code & GUI source-tree/coordinate lease correctly. Do NOT relax fail-closed QA hash, delete old evidence, or run untrusted PR on permanent Server.
2. **Personal Server 2025 job previously queued/runner_id 0.** Determine actual runner state/labels/service using an authorised **read-only** probe on Server; don't infer offline from queued alone, don't touch FlowBridge runner.
3. **Windows10 native channel not available directly from this chat.** Use [ready-to-paste Codex task](2026-11-11_WIN10_CODEX_SCI_1_0_QA_RU.md) in the existing native Admin session; record ownership of screenshots, exact SHA, genuine IME vs RU keyboard and DPI, not clipboard substitutions.
4. **UX1 G3 not accepted:** idle cache improvement ≠ p95 key-to-frame; paragraph prototype had high memory. Test bounded incremental layout in release/native before merge.
5. **Scientific 1.0 engine / package gaps:** versions/licences/source and independent L3 edit support not yet verified for Asymptote/Typst/PGFPlots. Do per-engine source/provenance audit before user-installed exe use; never silently install.
6. **Historical vs new scope:** latest release gate always [RELEASE_SCOPE](../docs/RELEASE_SCOPE_SCIENTIFIC_STUDIO_1_0_RU.md), not historical narrow notes or 96-only accepted candidate.

## Reporting after each substantive block

Use: commit/PR/base exact SHA, modified files, change in user workflow, fmt+test+clippy, hosted/physical/native originals, data and source fidelity, current W0–W4/UX/SCI status, blockers with verbatim failure, next executable action. No arbitrary readiness %, no calendar promises, no CLAIM of subagents not actually launched. Stable v1.0 requires explicit independently accepted **all** MUST and owner GO.
