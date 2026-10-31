# B15 QA — C/N2 declaration provenance in egui inspector

Date: 2026-10-31. Repository i-shutov/tikzarium; only B app, B plans/insights.

## Source of truth

Current C/N2 #55 merged main `b7c8e993b9da64060dfd3261833e4be3a1d280ba` introduced `ProjectImports::declaration_sites` and trusted UTF-8 original byte spans. The B inspector uses that read-only source evidence only when `ProjectImports::status` is CONFIRMED. Does not infer installed PGF package, XeLaTeX compatibility, or macro-expanded import. Existing `show_source_editor` highlights the entire chosen physical line; claiming a precise token highlight would be false. No edits on click.

## Test design

App-only tests require C-provided correct physical lines for BOM+CRLF+UTF-8 Cyrillic comments, comma/option package lists, multi-library imports and direct evidence before a later opaque macro. Negative tests require no source links when an opaque macro predates imports, or package appears before `documentclass`. Duplicate trusted literal package imports remain separate selectable source rows. The original input source is compared byte-for-byte.

These are UNIT/SOURCE tests; the previously existing six-tool real-egui pointer, Alt/F1/TextEdit and Save/Reopen suites remain separate UNIT_EVENT evidence. No physical screenshot, real window click, exact PDF source-to-pixel mapping or arbitrary macro interpretation is claimed.

## Pending exact-head CI

Work committed with B15 code + tests + B-owned plans/insights in the existing draft PR #50. Read final SHA and all workflow conclusions before any PASS claim. Physical Windows 10 MiKTeX and Mac ARM64 M1/M4 GUI, native dialogs and screenshot review: NOT_RUN. If a hosted CI failure is found, report its exact log and repair without changing C public types.
