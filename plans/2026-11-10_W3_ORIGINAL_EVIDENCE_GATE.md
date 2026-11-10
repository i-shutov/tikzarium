# TikZarium W3: independent original evidence contract

2026-11-10. Based on main 57cb62e4b70f896eb48978da4252ec1fede6c26a.

This QA-only code is **not** a Windows desktop driver and **never issues a W3 PASS**.
It audits original files produced from a real physical Windows 10 Pro x64
interactive session. Its self-contained synthetic unit fixture is NOT original
physical evidence and may not be submitted for release acceptance.

## Why

Hosted Windows 2022, Linux/Xvfb and the owner's Windows Server 2025 do not
replace the physical Windows 10 gate. Neither Actions SUCCESS nor a fake
source/PNG/PDF can prove actual input. A file-hash verified candidate additionally
requires independent human review of original Win10 GUI, pointer/keyboard
traces, font rendering, screenshot bounds and PDF source provenance.

## Run after authorized original GUI evidence exists

From the project checkout (Python 3.13, standard library only):

    python scripts/tools/qa_w3_physical_evidence.py --evidence "C:\Users\tikzarium-qa\Documents\TikZarium-QA\W3-original" --source-sha FULL_40_DIGIT_GIT_SHA --report "C:\Users\tikzarium-qa\Documents\TikZarium-QA\W3-original\independent-audit.json"

This script does not launch XeLaTeX, click, screenshot a desktop, use RDP,
change system configuration, install packages or alter original input files.
Only the optional independent JSON report is written.

## Evidence manifest v1

The real run must produce w3-original.json, with:

- schema_version = 1; kind = TIKZARIUM_W3_WINDOWS10_ORIGINAL_V1;
  source_sha = exact 40-digit source SHA; status = CAPTURED_NOT_ACCEPTED
- host.os_caption = Windows 10 Pro, os_build >= 19045, arch = x64,
  positive session_id, active wts_connect_state = 0, WinSta0/Default,
  native pid/hwnd and exact app SHA256
- files: initial_source, saved_source, reopened_source, seventh_source,
  undo_source, pdf, pdffonts, pdftotext, pdfinfo, gui_build_log
- source_snapshots: line, arrow, rectangle, circle, node, cubic
  (real GUI-persisted .tex after EACH gesture)
- pngs: startup, f1, line, arrow, rectangle, circle, node, cubic,
  saved, reopened, seventh, undo, pdf
- sha256 inventory: complete and exact SHA256 for every file listed in
  files, source_snapshots and pngs (all paths relative; no symlinks)
- events: ordered startup/F1/six gesture/Save/Reopen/seventh/Undo/PDF events,
  each with real app pid/hwnd/session, current WTS state and declared origin
- build: initiator = GUI_BUTTON, xelatex_exit_code = 0, actual source/PDF
  SHA256; gui_build_log is original GUI log, not a fabricated CLI log
- expected_cyrillic_text: actual Unicode Cyrillic phrase present in both
  generated .tex and original extracted PDF text (e.g. Точка)

An event JSON is a self-report, NOT proof of OS input. The auditor performs
structural and byte-integrity validation only.

## Required checks

- Verify original files, limits, no path traversal/symlink, complete SHA256,
  strict UTF-8, exact source hash, actual Windows 10 and WTSActive fields.
- Use the existing native source marker recognizer to verify six ordered
  source-owned TikZ primitives, unique IDs, and byte-for-byte preservation
  of all unrelated Unicode, CRLF, comments and macro content.
- Verify a separately saved seventh operation and exact six-command restore
  by Undo; native Reopen must preserve identical bytes.
- Independently decode all 13 RGB/RGBA client PNG pixel arrays, CRC and
  dimensions; reject clipped/blank or no-change F1 evidence.
- Confirm one-page PDF metadata, original font records embedded/ToUnicode,
  extractable Cyrillic, actual GUI-origin binding to the saved source and
  original GUI XeLaTeX log. Original report files alone do not prove their
  claimed producer; external Poppler re-extraction and visual signoff remain
  necessary before physical acceptance.

## Verdict

Valid input yields STRUCTURE_PASS_MANUAL_PHYSICAL_QA_REQUIRED with
release_gate = W3_NOT_ACCEPTED. Missing, forged or inconsistent input
fails closed. This code can NEVER elevate W3 to physical PASS, even when all
synthetic negative tests pass.

Physical W2b Server, Win10 W3 and stable W4 remain separate release gates.
Do not relax WTS/native window boundaries, RDP/UAC policy, toolchain or
TeX package configuration, or run PR code on the persistent owner Server.

## Offline adversarial QA

    python -m unittest discover -s scripts/tools -p test_qa_w3_physical_evidence.py -v
    python -O -m unittest discover -s scripts/tools -p test_qa_w3_physical_evidence.py -v

These tests prove auditor resistance to bad input, NOT a real Win10 GUI
pass. Independent code review, hosted exact-head CI and later physical
evidence are required before any release decision.
