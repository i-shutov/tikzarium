# I60 — независимая X11-приёмка B41 pinned inspector Apply

Дата: 2026-11-02. База: B41 PR #89 HEAD `e9bdd306f1009fa1f444e7d8948e16a48b6ce190`; `main` `48447d5916fa190b3ca7312130bde45d695ffd16`. Точное дерево `crates/tikzarium-app/src`: `5fa3b794c4711cd32c1b0f68a0ea00c7bf38657a`.

## Суть вертикали

Независимая D/integrator QA-ветка без изменений production Rust, C-каталога или ветки B. Запускает настоящий бинарный egui в X11/Xvfb. Цель — замкнуть наиболее опасную последовательность B41: native Circle pointer → свойство radius в правом инспекторе → черновик без правки TeX → закреплённый Apply с одним C-патчем → исходный Ctrl+Z не возвращает устаревший буфер → визуальный Undo → GUI Save/Open двух разных файлов (включая CRLF) → внешний XeLaTeX PDF, кириллица, embedding и F1.

Координаты профиля **предварительные**, перенесены из подтверждённого B40-снимка и подлежат реальной B41-калибровке. Дерево приложения проверяется до GUI; если HEAD B меняет его — закрывать тест как NOT_RUN, а не убирать guard.

## Gates

- Настоящий GUI-процесс, X11 focus, screenshot на каждой критической границе и hash бинарника, исходников и PDF.
- Отдельная проверка original source вне C-owned команды; точно один native Circle, обе части C metadata должны менять только radius.
- Контроль черновика через копирование реального GUI Source TextEdit и Save до Apply; запрещён ложный PASS по цвету кнопки.
- Настоящие события text field и кнопки; native Ctrl+Z, отдельно визуальный Undo; различимый CRLF-файл через GUI Open.
- PDF через actual GUI Build/Export и Poppler, без ручного создания PDF тестовым драйвером.
- Раздельные статусы automated X11, screenshot review и физических Win10/M1/M4.

## Порядок интеграции

1. Прогнать unit contract и реальный X11 workflow на новом QA HEAD, скачать полный zip-артефакт.
2. Вручную открыть исходник, скриншоты circle/draft/apply/undo/help и PDF; устранить только доказанный сбой координат или рабочего кода у соответствующего владельца.
3. После реального PASS и точного HEAD #89 предложить приёмку QA как stacked PR к B41, не сливая B в main преждевременно.
4. Merge B41 в main только после всех обязательных CI, просмотра артефактов и expected_head_sha; post-merge CI — отдельный.

Физическая Windows 10 x64 с независимо установленным MiKTeX и macOS ARM M1/M4 с внешним XeLaTeX — **NOT_RUN**. Preview/guide не объявляется геометрически эквивалентным PDF. Никаких автоматических TeX-подстановок или установок.

## I60 coordinated reacceptance of I46/I47/I53/I57 on B41

On independent QA branch only, repin existing four real-X11 workflows to B41 app/src exact Git tree `5fa3b794c4711cd32c1b0f68a0ea00c7bf38657a`, preserving legacy source/PDF/human-screen predicates. A/C/B production remain untouched. All previous B40 profiles carry **PROVISIONAL_B41_COORDINATES**, not physical GUI assertions. Exact SHA workflow and actual screenshot/PDF/source artifact proof required separately for every vertical; fail closed and recalibrate only after genuine evidence. No merge #90/#89 until all gates.
