# TikZarium / roadmap

**Единый текущий план исполнения:** [docs/ROADMAP.md](../docs/ROADMAP.md). Этот каталог хранит нормативные приложения и матрицы, а не конкурирующие текущие маршруты. Первый реализационный блок — [UX1, 11.11.2026](../plans/2026-11-11_UX1_EXECUTION.md).

## Приоритет Windows 1.0: UIX-first

**Последнее решение владельца (10.11.2026):** все **14 UX-F01…F14** из [ревью](../insights/2026-11-10_CRITICAL_UX_AUDIT_RU.md) перенесены в **Windows 1.0**, а не в 1.1/1.2/1.3. [Авторитетный UX/1.0 порядок и QA gates](WINDOWS_1_0_UIX_OWNER_OVERRIDE_20261110_RU.md): читаемый editable TeX с подсветкой и навигацией → удобный workspace и Inspector/F1 → native Save & Build, актуальный PDF/диагностика → DPI/accessibility → W2b/W3/IME/W4. Владелец требует **принимать эргономику до GUI-адаптеров дополнительных 35 пакетов/88 примеров**. AT0 source intake и AT1 engine research допустимы параллельно без GUI acceptance. Старые строки о 96DPI-only и deferred UX ниже исторические.


## Актуальные планы

- [AI_TIKZ_SKILLS_2026-11-10 — полная поддержка 35 специализированных расширений, 23 библиотек, 13 skills и 88 примеров](AI_TIKZ_SKILLS_2026-11-10_SUPPORT_ROADMAP.md). Пострелизный roadmap: поддержка обычного TeX, предметные SourcePatch/GUI, 85 XeLaTeX + 3 explicit LuaLaTeX, версия и QA; **PLANNED, не Implemented**.
- [88-case coverage ledger](AI_TIKZ_SKILLS_2026-11-10_88_CASES.csv): 16 классов, 88 именованных `.tex`, пакеты/библиотеки, движок, ссылка на acceptance criterion из исходного каталога. Все строки изначально `PLANNED_NOT_VERIFIED`.
- [Scientific-142 R4](Tikzarium_Scientific_142_R4/README.md): отдельный baseline 100 AK + 42 Sarov, 103 требования, own L0–L4 gates. Не считать его продолжением нумерации 88 примеров.

**Приоритет Windows 1.0:** features frozen, GUI/physical/release qualification — по [W0–W4](../docs/WINDOWS_1_0_RELEASE_CONTROL_RU.md). Вышеуказанные новые предметные функции не добавляются в этот релиз. Следить за актуальным [основным roadmap](../docs/ROADMAP.md).

**Источник новой матрицы:** [Drive AI_TIKZ_SKILLS_2026-11-10](https://drive.google.com/drive/folders/1SVuTweUP2dl5718n0VPtcQ4ryB2ymUW0), контрольная сумма исходного `examples/catalogue.json` — `4a94885064027806d4c9df7220216a160a923a4346671973365e59aa3cee94a5`. Не копировать в репозиторий чужие шрифты, CTAN-архивы, секреты или графические результаты без проверки прав.
