# TikZarium 1.0 — Scientific Studio: нормативный состав релиза

**Owner decision 2026-11-11:** принять первый полноценный Scientific Studio как TikZarium **v1.0.0**, вместо исторического узкого TikZ-only Windows 1.0. Это решение отменяет только старые границы «для 1.0 исключительно UX» и «SC/AT/PGFPlots после 1.0». Все прежние функциональные, научные, source-integrity и физические QA-требования сохраняются.

**Состояние:** SCOPE_APPROVED; IMPLEMENTATION_NOT_ACCEPTED; stable v1.0.0 **NO-GO**. Базовый main при принятии решения: 159896f71c101deaba3600bbae70cba101c10334 (PR #174). Старый 1.0.0-rc.1 и прежний W3-96 снимок относятся к узким кандидатам прошлых SHA, **не к принятой Scientific Studio**. Никакого тега, стабильного ZIP/EXE и утверждения о готовности до нового exact-source GO.

## 1.0 MUST — реальная работа пользователя

Нормальный маршрут: создать/открыть научный проект → переключаться между документами → создать или выбрать научную фигуру → править проверенные объекты и обычный source → использовать Inspector/Undo → собрать внешним движком → увидеть корректный актуальный PDF и диагностику → исправить ошибку → сохранить/экспортировать → закрыть и повторно открыть без потери исходников, зависимостей, курсора и свойств.

### A. Профессиональный GUI и документная основа

- Нативная Rust/egui Studio с четырьмя согласованными темами Light/Dark/Midnight/Paper, типографикой, прямыми основными действиями, грамотными панелями и качественной графической/клавиатурной доступностью. Не макет и не набор чужих окон.
- Project Hub/Explorer, несколько native документов/вкладок, отдельные revision/dirty/caret/selection/Undo/view/draft, безопасные Save/Open/Close, конфликт внешнего изменения, восстановление и no-op byte fidelity.
- **Все UX-F01…F14:** editable TeX highlighting, gutter и физические номера строк, Find/Replace, Go to line, font 12–24, wrap, six direct TikZ tools, компактный Inspector с одним Apply, единая контекстная русская F1, native Save & Build, состояния отсутствующий/актуальный/устаревший/ошибка PDF, понятные disabled/cancel/error, diagnostic jump в верный файл.
- Исходник авторитетен: no-op не переписывает Unicode/CRLF, whitespace, неизвестные макросы или комментарии; revision-checked SourcePatch и согласованные native/visual Undo.
- UX1 G3: настоящий native input-to-frame p95 <=50 мс для 10k строк/1 MiB, первый editable frame <=2 с, стресс 100k/10 MiB без потери ввода и неконтролируемой памяти. CPU-only benchmark не заменяет GUI p95.

### B. Полноценная научная предметная поддержка

- TikZ/XeLaTeX без регрессий. Примитивы: линия, стрелка, прямоугольник, окружность, текстовый/математический узел, кубическая кривая; дальше — научные paths/intersections/fill/clip/layers, размеры/углы, формулы, графики, математические объекты и поддержанные статические 2D/3D поверхности/проекции.
- **PGFPlots SC3/AT4** единым научным адаптером: axis/series/addplot/expressions, ranges/ticks/labels/styles, static-source tables, error bars и все corpus MUST, с реальным Inspector/source edits/Undo/внешней PDF приёмкой; не терять compat, данные, кириллицу, формулы.
- **Scientific-142:** 142 рисунка = 100 AK + 42 Sarov; 103 отдельные требования. Подлинные L0–L4, GUI source edits, компиляция, визуальная и физико-математическая независимая приёмка. Не прибавлять 100 к 142.
- **AI88:** научные примеры, относящиеся к ST-SCI, принимаются по собственным IDs и S0–S4. Весь базовый инвентарь 88 cases / 35 specialised packages / 23 libraries / 13 skill-contracts обязателен для программы, но несоответствующие научному этапу предметные части — в следующих приоритетных волнах, без скрытого понижения MUST. 85 XeLaTeX и 3 LuaLaTeX (IDs 65/68/86) имеют явные независимые engine profiles; нельзя скрыто переключать engine.
- **Asymptote и Typst/CeTZ** — обязательные дополнительные научные профили 1.0. Реальный native source→build→preview→error→fix→save/reopen→export, плюс определённые в утверждённой operation matrix осмысленные научные Inspector/Undo операции (ME-L3 и строго описанные ME-L4 subsets). Не выдавать простую компиляцию за L4 для всего языка.
- **Penrose** остаётся scoped scientific candidate/feasibility, не обязательным универсальным solver. Для превращения в 1.0 MUST нужна отдельно утверждённая операция и независимый QA, а не само упоминание в каталоге.

### C. Runtime, качество научного вывода, Windows qualification

- Общий descriptor/profile/request/result/artifact contract сначала покрывает внешний XeLaTeX/MiKTeX, затем дополнительные научные движки. Версии/лицензии/зависимости, явная совместимость и capabilities; bounded workers, реальные Cancel, dependency hashes, revision-aware stale/last-good/diagnostic state. Старый build никогда не перекрывает новый.
- Публикационное качество научного рисунка: векторный PDF, точная геометрия/размеры, кириллица, формулы, embedding/ToUnicode используемых шрифтов, проверенный экспорт. Корпусные required multi-panel layouts входят, но **полная общая multi-engine Publication Studio** для произвольных форматов относится к ST-OTHER.
- Основная поставка: физический Windows 10 Pro x64, отдельный личный Server 2025 W2b, W3 реальный native Desktop/IME и 100/125/200% (96/120/192 DPI), W4 чистый portable deploy/remove/rollback; строгие W0/W1, exact-source PE/ZIP/EXE SHA, реальные PDF/font/artifacts и независимая приёмка. Mac ARM и Linux архитектура+CI сохраняются; собственный физический релиз — после native qualification.
- Offline/local by default; независимые пользовательские TeX и другие executables, no silent install/update/package fallback, shell escape OFF, доверенный Administrator с видимым предупреждением (не sandbox). Не менять UAC, RDP, драйверы, SYSTEM, системный MiKTeX, FlowBridge; не включать исполняемые Python-источники при открытии проекта.

## Что НЕ входит в 1.0

Предметный порядок после принятого ST-SCI: **ST-UML → ST-BPMN → ST-ENG → ST-CHEMBIO → ST-ANIM → ST-OTHER → ST-DATA (строго последний)**. UML/BPMN, новая инженерная и химико-биологическая GUI функциональность, анимация, Graphviz/D2/Mermaid general-diagram products, generic vector exchange, полный compositor, полноценный Data Figure/CSV import UI/column mapping/statistics/Vega-Lite/Matplotlib/Gnuplot/Plotly — вне Scientific Studio 1.0.

**Граница Data-last:** уже обязательные научные PGFPlots .dat/.csv файлы — обычные зависимости и нужны в 1.0. Это не разрешение делать сейчас новую платформу анализа данных.

## Release gates — единое состояние без выдуманного PASS

| Gate | Требуется для v1.0.0 | Текущий вывод |
| --- | --- | --- |
| R-SCOPE | Этот документ + утверждённая exact engine/operation matrix для Asymptote/Typst/scientific kits | Macro scope approved; подробная matrix и engine/version/licence proofs OPEN |
| UX+G3 | Все UX-F01…F14, T0…T8, p95/stress, настоящие original GUI | NOT_ACCEPTED; UX1 implementation в main, G3 и UX2–UX4 открыты |
| SCI | Shared SC1–SC6, PGFPlots SC3/AT4, SCI142 142/103 и scientific AI88 по ledger | NOT_ACCEPTED |
| ENGINES | XeLaTeX без регрессий, Asymptote, Typst/CeTZ с source/edit/build/export | NOT_ACCEPTED / NEW PROFILES NOT_RUN |
| DOCUMENT/BUILD | Multi-document Undo, dependency/provenance/cancel/error/stale/last-good | NOT_ACCEPTED |
| W0/W1 | exact final SHA native build/TeX/PDF/font evidence | Previous historical passes not transferable |
| W2b | Real Server 2025 GUI actions with owned screenshots/artifacts | NOT_ACCEPTED |
| W3 | Physical Win10 GUI, real IME, 96/120/192 DPI, source→PDF and export | NOT_ACCEPTED for new Scientific Studio |
| W4 | clean candidate deploy/remove/rollback, no production QA Mesa; provenance | NOT_RUN |
| Stable GO | All mandatory scientific, UX, native and package gates independently accepted | **NO-GO** |

No previous 96-only or UX-only release paragraph may supersede this current owner scope. Historical documents remain as immutable evidence for previous SHA, not current release specifications. Do not reduce required operations silently to OPAQUE/NOT_RUN to achieve a percentage.

## Authoritative links

- Current science-first [ROADMAP](ROADMAP.md), [PRODUCT_SPEC](PRODUCT_SPEC.md), [ARCHITECTURE](ARCHITECTURE.md), [AGENTS](../AGENTS.md).
- [SCI 1.0 execution](../plans/2026-11-11_SCI_1_0_EXECUTION.md) and [Win10 Codex QA task](../plans/2026-11-11_WIN10_CODEX_SCI_1_0_QA_RU.md).
- [Historical W0–W4 original evidence](WINDOWS_1_0_RELEASE_CONTROL_RU.md), [UX gate matrix](../roadmap/WINDOWS_1_0_UIX_OWNER_OVERRIDE_20261110_RU.md), [SCI142 R4](../roadmap/Tikzarium_Scientific_142_R4/README.md), [AI88](../roadmap/AI_TIKZ_SKILLS_2026-11-10_SUPPORT_ROADMAP.md).
