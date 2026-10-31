# R4 graphics research corpus: source-located, reference-only registry

## Located external source (read-only; no assets imported)

On 2026-10-31, QA lane D located and **read the metadata and text reports**
of the 2026-10-29 R4 release in the owner's Google Drive:

- [R4 release folder](https://drive.google.com/drive/folders/1wZ9CmzWz4OmrZzwDeWibve27O3REvImn)
  (`AI_SKILLS_CLEAN_R4_VISUAL_2026-10-29`; access controlled by Drive).
- [R4 start guide](https://drive.google.com/file/d/1aImm-UOJmRHQgl6ljiA9HQCgxkJ92TWG/view),
  [QA report](https://drive.google.com/file/d/1JTsIwjQZoowrtdSd1BR1JW9WwHpgPTOe/view),
  [changelog](https://drive.google.com/file/d/17sbTYd4D44_lE0e3fXonVywfsTSD3xSg/view).
- [Clean R4 ZIP](https://drive.google.com/file/d/1cNdUuBRZZQ1PgJdPD-xVpvSqX7gUaoRo/view):
  named `AI_SKILLS_CLEAN_R4_2026-10-29.zip`, Google Drive metadata
  reports 25,639,804 bytes. Separate
  [published SHA256SUMS](https://drive.google.com/file/d/10-DSgaCXm0Y9dBHSJzEdsyenrtlJTKkK/view)
  records SHA-256 `8211cfed9120695e38f39b341aea07cf28e6482fc0f33144eaf1aa34b18998b0`.
- The owner's separate `REMOTE_READBACK_RECEIPT_R4_2026-10-29.json`
  in the same folder reports archive readback PASS, CRC PASS, 959 entries
  and 957 manifest entries at 2026-10-29T11:46:00Z.
  **That historical receipt is not an independent D03 re-download,
  re-hash, licensing review or source-level acceptance.**
- [158-page combined PDF atlas](https://drive.google.com/file/d/1C3GWbDx1kVvgb5bbzph5SCD4Gd-cC3tm/view)
  is a visual research reference, not a replacement for original TeX
  sources and manifest.

D03 has **not downloaded, extracted, executed or redistributed** the
R4 ZIP, PDF pages, image assets, individual fragments or included fonts.
No proof of permission to redistribute third-party content was found.
Source location and a published hash are known; the license and
per-asset ownership gates remain **NOT_CHECKED**.

## Historical R4 claims (read from the owner's dated QA report)

| Population | R4 report | TikZarium D CI status |
| --- | --- | --- |
| Active TeX-to-PDF cases | 135/135 clean compiles | NOT IMPORTED / NOT RUN |
| Active PDF pages | 158 | NOT IMPORTED / NOT RE-RENDERED |
| 72-dpi comparisons | 135/135 matching R4 clean-build baseline | NOT RE-COMPARED |
| Semantic tests | 18/18 in R4 environment | NOT RE-RUN |
| Strict warning gate | 131/135 | Four exceptions remain |
| Olya source family | 47 normalized fragments from 141 occurrences | Sources not imported |
| Retained R3 themes | 7, not rebuilt in R4 | NOT RE-RUN |
| Warning outliers | O027/O028/O030/O047: extra nullfont `.01pt` | UNRESOLVED |

The R4 report explicitly separates successful PDF creation from
warning-free TeX compilation. Its four warning outliers are not
suppressed and cannot be described as glyph-safe without new evidence.
The R4 report's browser check was BLOCKED_BY_ENVIRONMENT. It does not
establish Windows 10 or native M1/M4 QA, and R4's 72-dpi raster matches
are not evidence of visual correctness on different engines or hosts.

TikZarium's `fixtures/qa/manifest.json` contains independent
project-authored samples and is **not** a substitute for the R4 corpus.
The ZIP's metadata and published digest do not authorize copying
proprietary or ambiguously licensed source examples into a public repo.

## Future audited ingestion sequence

1. Obtain the original immutable ZIP; compare downloaded byte count and
   SHA-256 with published checksum and provenance receipt, then safely
   inspect ZIP paths/CRC and a complete per-file manifest outside the
   public repository.
2. Inspect `registry/` for exact source locators, file-level authorship,
   source SHA, external dependency, original editor/engine and license.
   Separate owned redistributable, permission-granted, private-test-only
   and unknown-provenance cases. **No third-party source import by default.**
3. Run consented, source-verified cases in a private temporary workspace.
   Preserve original source digests and raw logs; rerun strict warning gate
   for O027/O028/O030/O047, never silently mutate original geometry.
4. Record targeted XeLaTeX compatibility per OS (Linux x64, physical
   Windows 10 x64, hosted macOS ARM64 and separately physical Mac M1/M4).
   Historical R4 PASS cannot be inherited across engines or machines.
5. For visual regression, pin renderer, DPI, fonts and expected output
   provenance. Compare raster and structured PDF text/fonts; don't
   demand byte-identical PDF hashes between independent TeX builds.
