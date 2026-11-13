# Компактная TikZarium Studio — native UI atlas

[Открыть PDF, 6 страниц](published/TikZarium_Studio_Compact_UI_Atlas_RU.pdf).

Это сохранённый атлас завершённого блока от 12.11.2026. Он содержит реальные кадры Linux UI 1180×680, верхнее меню, компактную строку команд, отдельный gutter, fold преамбулы, PGFPlots Inspector/PDF и четыре темы. Источник приложения восстановлен из Git objects и повторно проверен; [подробный отчёт](../../insights/2026-11-12_COMPACT_STUDIO_RECOVERY_RU.md).

| Идентификатор | Значение |
| --- | --- |
| App tree, сохранённое в атласе | `6c3208dc309a4c31ba36c4cf3ccda63b85083bd9` |
| Старый локальный candidate | `fe85cc604b5c32ff8ac1c5e09efd694b59a4b4a7` — не новый опубликованный SHA |
| PDF bytes | 3858549 |
| PDF SHA-256 | `7d98a75f2185eed84edad7bc443e43e65b8d9c351bf88c32264a9c13f6483d17` |
| Git blob | `51c62a92bfd5c3c4ae9024f836e8ca9a17816bf0` |
| Свежие проверки source | 562 PASS / 0 FAIL / 4 ignored; fmt, strict Clippy, app/CLI build PASS |

Размеры компонентов в коде даны в egui pt, измерения изображений — в screenshot px. Снижение расчётного среднего маршрута на 57,6% не является измерением производительности человека. Прежние native результаты не перенесены на Windows или новый binary. Предыдущий `design/studio-atlas` сохранён без изменения исторического содержания.
