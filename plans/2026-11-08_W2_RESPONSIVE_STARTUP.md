# W2 — исправление запуска GUI, а не очередной обход foreground

Дата: 2026-11-08. Основа: main `88ef49d7c0c80e0937cd56fb301b697d55c09b89`.

## Исходное доказательство

Персональный run #42414339864, artifact13591881579, ZIP SHA256
`312e6c59e6f6d6002a71d11e24e52e738d118f32ed313c3f945cd7a7365dc23d`:
WTSActive/Default, HIGH Administrator, настоящий HWND PID4360 1194x718/DPI120.
PR #131 выполнил 10 попыток, attach/detach собственного input queue успешен,
но итог `OWNED_QUEUE_DID_NOT_GAIN_FOREGROUND`; F1/PNG NOT_RUN. Это не W2 PASS.

## Исправляемый дефект продукта и проверяемая гипотеза

`TikzariumApp::new` и Refresh синхронно вызывали discovery/registry/package
probes. В `discovery.rs` процессы `xelatex --version` и `findtexmf` запускались
через неограниченный `Command::output`, без CREATE_NO_WINDOW. Блокировка
GUI-потока и возможность вспомогательных консолей установлены по коду.
Их причинная связь с конкретным физическим foreground-сбоем — гипотеза до
повторного оригинального W2, не объявленный исправленный факт.

В одном блоке: неблокирующий single-flight worker с UNKNOWN до атомарного
получения снимка; дедлайны и лимиты вывода read-only children; сохранение
исходного exit/stderr; Windows CREATE_NO_WINDOW без смены токена; настоящий
SetForegroundWindow/WM_NULL SendMessageTimeout handshake без AttachThreadInput.
После каждого ожидания повторно проверить PID/session/Default/WTS; перед F1
снова проверить foreground. Никаких системных настроек, чужих пикселей,
драйверов, установки TeX/шрифтов/пакетов или изменения FlowBridge.

## Проверки и приёмка

1. Core subprocess tests: успех+stderr, реальный nonzero, timeout, overflow,
   отсутствие console HWND у настоящего дочернего процесса на Windows.
2. Worker tests: заблокированный исследователь не мешает настоящему egui frame,
   UNKNOWN не означает missing, закрытие окна не ломает worker.
3. PowerShell5.1: 11 сценариев production state machine (асинхронный переход,
   ложный успех API, unresponsive, identity/session/desktop changes).
4. Hosted настоящий EXE + F1 + original client PNG **во время** контролируемого
   медленного read-only console helper. Журнал BEGIN/END доказывает overlap,
   console handle=0; fixture НЕ TeX и НЕ реальная MiKTeX-квалификация.
5. Exact-head Windows/macOS/Linux и реальные XeLaTeX/font/negative regressions;
   затем review/expected-head merge и postmerge CI.
6. Personal W2 выполняется раньше повторной Rust-сборки на оригинальном EXE
   из успешного exact-main CI, после локальной SHA/PE/ZIP/manifest проверки.
   В отчёте `binary_origin=verified-hosted-release`; это фактический запуск
   распространяемого EXE на персональном Server, НЕ локальная сборка W1.
   Ранний отдельный artifact сохраняет JSON/PNG до продолжения независимых W1.
7. W2b full GUI->PDF, W3 физическая Windows10 и W4 stable остаются обязательны.

## Источники Win32

- https://devblogs.microsoft.com/oldnewthing/20161118-00/?p=94745
  SetForegroundWindow асинхронен; WM_NULL barrier, а не AttachThreadInput.
- https://learn.microsoft.com/en-us/windows/win32/procthread/process-creation-flags
  CREATE_NO_WINDOW не меняет права учётной записи.
- https://doc.rust-lang.org/std/os/windows/process/trait.CommandExt.html
  Используется stable creation_flags, не nightly show_window.
