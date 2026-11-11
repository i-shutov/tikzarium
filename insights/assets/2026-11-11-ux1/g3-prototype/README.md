# G3: проверенный прототип кэша абзацев, без внедрения в приложение

Дата: 11 ноября 2026. База ветки — принятый main
`19187fc17968659267540fe279702bf77eeb77e6` (PR #167). Его app tree
`e9f47c46042119b2fb58b187fcfaf0fafa076a64` совпадает с проверенным PR head
`24e3548a6e6dcfe26f169be6959ea071a2849196`.

**Решение: сохранить исследование; не внедрять этот прототип в production.
G3 NOT_ACCEPTED, native p95 NOT_RUN.** Файлы приложения, зависимости и workflows
в этой ветке не изменены. Пакет дополняет [первую диагностику G3](../g3/REPORT.md).

## Что установлено

- Публичного API egui/epaint 0.33.3 достаточно для повторного использования
  immutable `Arc<Row>` без копирования всех glyph/mesh vectors. Полный editable
  source остаётся единственным источником истины. Private intrinsic metadata
  сохраняется через native metadata-only `Galley::concat`, без fork и unsafe.
- Проверено 168 сравнений со штатной раскладкой: исходник, полные форматированные
  jobs/rows, bounds, intrinsic size, курсор, hit testing, Unicode/CRLF, пустые
  строки, wrap и PPP 1/1.25/2. Дополнительно проверены три headless TextEdit кадра
  выделения и copy-on-write. Это не OS input, Undo/IME или физическая приёмка.
- Пересчёт одного абзаца сам по себе не решает задачу. Финальный 100k unique
  fixture дал 618.6 ms median последовательной правки и 1164.4 ms первой правки
  после пяти idle frames. Первый layout занял 5580.1 ms.
- После уменьшения capacities только посчитанные уникальные retained
  glyph/mesh/job allocations занимают 1721.5 MB. Это не RSS и не peak: прочие
  containers, allocator/fonts и временные структуры не учтены. Cache LRU сам по
  себе не освобождает строки, удерживаемые полным текущим Galley.

Оба варианта замеров и ограничения приведены в оригинальном [REPORT.md](REPORT.md).
Серии baseline и prototype не являются статистически paired runs. Старый binary
до capacity trimming отдельно не сохранён и не хеширован; это явно отмечено в
metadata, поэтому полный ранний прогон не выдаётся за результат финального binary.

## Состав и происхождение

Два Sol-агента отдельно подготовили алгоритм/замеры и независимый oracle adapter.
Integrator проверил исходные hashes и сохранил текстовые файлы эксперимента без
изменений. `REPORT.md`, `metadata.json` и `build.sh` содержат исторические пути
исходного эксперимента; его executable не включён в Git, checksum сохранён.

- [prototype.rs](prototype.rs) — самостоятельный исполняемый harness, не модуль приложения.
- [contract_oracle.rs](contract_oracle.rs) — сравнение с настоящей native egui раскладкой.
- [source_highlight_snapshot.rs](source_highlight_snapshot.rs) — снимок presentation lexer для harness.
- [metadata.json](metadata.json), [results.log](results.log),
  [results-before-capacity-trim.log](results-before-capacity-trim.log) — provenance и raw CPU/memory output.
- [publication-manifest.json](publication-manifest.json) — hashes сохранённого пакета
  и дополнительной проверки integrator после сборки из опубликованных путей.

В fixture нет ownership markers: stub намеренно завершает процесс с ошибкой при
вызове, чтобы не подменять authoring semantics. Палитра Midnight и monospace 14 pt
фиксированы. Полный набор font/theme/document lifecycle параметров ещё не интегрирован.

## Воспроизведение из checkout

Нужны Rust/toolchain и зависимости обычной release-сборки проекта. Сначала
соберите существующее приложение, чтобы получить совместимые release rlibs:

```bash
cargo build --locked --release -p tikzarium-app
```

Передайте точный путь к созданному `target/release/deps/libeframe-*.rlib` в
добавленный [reproduce.sh](reproduce.sh); это позволяет избежать выбора случайной
версии при наличии нескольких старых сборок. Скрипт только собирает harness:

```bash
bash insights/assets/2026-11-11-ux1/g3-prototype/reproduce.sh \
  /absolute/path/to/target/release/deps/libeframe-HASH.rlib \
  /tmp/tikzarium-g3-prototype
/tmp/tikzarium-g3-prototype
UX1_LINES=100000 UX1_UNIQUE=1 /tmp/tikzarium-g3-prototype --bench
```

Без `--bench` выполняется correctness oracle. Флаг `--bench` запускает измерения;
100k unique case требует значительной памяти. Native event-to-visible-frame,
OS IME, physical DPI и performance p95 этим harness не измеряются.

## Следующий блок исполнения

Перед интеграцией нужны ограничение памяти полного документа, сокращение
полных formatted-job allocations и candidate-key churn, подключение актуальных
font/theme/document lifecycle inputs, а затем paired input/Undo/IME и реальные
event-to-frame измерения. Микрооптимизация одного lexer и одноцветный fallback
не устраняют уже измеренные затраты. UX1 и stable release сохраняют открытые gates.
