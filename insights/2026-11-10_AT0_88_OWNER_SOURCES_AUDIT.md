# AT0 independent original-source inventory — 2026-11-10

This is **evidence of bytes and declared metadata**, not a TikZarium GUI, XeLaTeX, LuaLaTeX, scientific or licensing acceptance.

## Input and immutable identity

Owner-provided Google Drive folder: [AI_TIKZ_SKILLS_2026-11-10](https://drive.google.com/drive/folders/1SVuTweUP2dl5718n0VPtcQ4ryB2ymUW0).

- Original `examples/catalogue.json`: **50,287 bytes**, SHA256 `4a94885064027806d4c9df7220216a160a923a4346671973365e59aa3cee94a5`. JSON schema includes authoritative case ID, title, group, package/library list, engine and independent check string.
- Every one of **88 declared `examples/<stem>.tex`** downloaded through the authorized Drive connector and independently read as raw UTF-8.
- **88/88** expected filenames exactly matched downloaded files; **0 missing, 0 extra**; no name collision.
- All original source byte hashes recomputed privately: **88/88 SHA256 available**. Total source length **38,581 bytes**, consisting of **78 CRLF** and **10 LF** files, **0 mixed** line endings. Source bytes are not rewritten or copied into the public repository.
- 13 source `SKILL.md` documents read as raw bytes from Drive, checked for matching `name:` frontmatter and SHA256-hashed: **13/13** present. Immutable digest ledger: [13_SKILLS_SHA256.csv](../roadmap/AI_TIKZ_SKILLS_2026-11-10_13_SKILLS_SHA256.csv). Extra `tikz-tool-interoperability` folder has no independently verified SKILL.md and does not count as a 14th skill. Full Markdown link/license closure is still NOT_RUN.
- Owner's 88-case CSV compared against the raw catalogue field-for-field: case ID, group, stem, path, packages, libraries, declared engine: **0 mismatches**. Total: 16 groups, 35 specialized packages (+tikz +booktabs), 23 library names, 85 XeLaTeX + three LuaLaTeX cases (65/68/86).

## Исполнение самого проверяющего модуля на полном приватном дереве

Для проверки цепочки «реальный код PR → реальные исходные байты» скачан **оригинальный offline-auditor artifact** #13781736178 из [точной D QA #42852690894](https://github.com/i-shutov/tikzarium/actions/runs/42852690894) на head `82e4f401e601b9d187a1bf156704c00a50dcc3bd`. Архив CRC PASS, внутри Python-модуль, unit tests и обе version-pinned ведомости (88 исходников + 13 skills), **без оригинальных приватных файлов**.

- `python -m unittest ... test_ai_tikz_intake.py`: **12/12 PASS**, включая намеренную порчу файла skill / SHA, symlink/path traversal, плохую UTF-8, engine mismatch и ложные поля каталога.
- `python scripts/ai_tikz_intake.py --catalogue ... --source-root ... --check-skills --report ...`: **`AT0_CATALOGUE_LEDGER_SOURCE_BYTES_PASS`**.
- Результат: **88 source files + 13 skill byte-hashes PASS**, 16 классов, 35 специализированных расширений и 23 библиотеки. Исходный каталог имеет закреплённый SHA.
- Полный JSON отчёт сохранён в **закрытом рабочем checkpoint**, 43+ KB; SHA256 отчёта `2612f6892801ec04a3b904f28d552d6bab823b2c82a3c81a47869ae3e313ac1c`. Не выгружать приватные исходники/пути в публичный репозиторий.
- `fls_dependency_closure=NOT_RUN`, `ctan_license_and_version_audit=NOT_RUN`, `external_engines_or_gui=NOT_RUN`, `domain_science_acceptance=NOT_RUN`. Это полноценный **S0 intake по доступным исходным байтам**, но не весь AT0/AT1 контракт.

## Not inferred from this inventory

- No original `.fls`/Kpathsea dependency closure or licensed CTAN installed-state evidence was audited against the user's current TeX system.
- The previous bundle's reported 88/88 compilation, 92-page vector PDF and original model/visual review are historical source-bundle checks, **not** executable/editor/physical acceptance on a newly frozen TikZarium SHA.
- No real physical pointer operations, F1 interaction, GUI-based SourcePatch/Undo/Save/Open, compiled PDF or independent domain invariants were observed **in TikZarium**.
- No `atlas.tex` or `build-report.json` source file was independently fetched in this pass; absence/visibility remains to be resolved.
- Original source hashes are stored only in a **private AT0 SHA256 manifest**, not published in the public GitHub repo. This document is safe metadata.

## Remaining AT0 and AT1 work

- [x] Raw catalogue SHA and schema/ID/engine/package/library agreement.
- [x] Raw example bytes 88/88 with hashes, UTF-8 and original LF/CRLF modes.
- [x] Raw SHA256 and frontmatter checks of all 13 skills; reference links and licensing not fully audited.
- [ ] Dependency graph of actual TeX inputs (`.fls`), package versions, licenses, reproducible CWD/engine/ship-scope and negative missing-input behavior.
- [ ] Readback and hash independent atlas build report, embedded assets and entire skill reference graph.
- [x] Run `scripts/ai_tikz_intake.py` from original exact-head hosted artifact against full private tree and archive independently SHA-bound JSON (**88/88 TeX, 13/13 skills, 12/12 tests**), no GUI claim.
- [ ] Only after AT0: AT1 source/engine tests for 85 XeLaTeX + 3 explicit LuaLaTeX, followed by subject GUI/physical S3/S4 and scientific gates.

Frozen stable Windows 1.0 must not consume these experimental engine features or treat this research as W2b/W4 evidence.
