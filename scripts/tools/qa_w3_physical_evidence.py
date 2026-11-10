#!/usr/bin/env python3
"""Fail-closed audit of ORIGINAL Windows 10 TikZarium W3 evidence.

This is an offline *structure/integrity* gate, not a GUI input generator or a
physical acceptance certificate. Source assertions are not a TeX parser.
Original native screenshots, session provenance and PDF must also be manually
reviewed. Running this against a synthetic fixture NEVER makes W3 PASS.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys

from qa_windows_capture_evidence import EvidenceError, inspect_png, require

# Reuse the source-owned TikZ command recognizer that is also used for N1/I61.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from qa_n1_desktop import original_preserved, owners  # noqa: E402

KIND = "TIKZARIUM_W3_WINDOWS10_ORIGINAL_V1"
TOOLS = ("line", "arrow", "rectangle", "circle", "node", "cubic")
PNG_STEPS = ("startup", "f1", *TOOLS, "saved", "reopened", "seventh", "undo", "pdf")
EVENTS = ("startup", "f1", *TOOLS, "saved", "reopened", "seventh", "undo", "pdf")
HEX40 = re.compile(r"[0-9a-f]{40}\Z")
HEX64 = re.compile(r"[0-9a-f]{64}\Z")
MAX_MANIFEST = 128 * 1024
MAX_SOURCE = 2 * 1024 * 1024
MAX_PDF = 32 * 1024 * 1024
MAX_LOG = 8 * 1024 * 1024


def _safe_file(root: Path, name: str, max_size: int) -> Path:
    require(isinstance(name, str) and name != "", "Evidence path must be a string")
    require("\\" not in name and ":" not in name and "\x00" not in name,
            "Use normalized relative POSIX evidence filenames")
    relative = PurePosixPath(name)
    require(not relative.is_absolute() and len(relative.parts) > 0
            and all(p not in ("", ".", "..") for p in relative.parts),
            "Absolute, empty or parent-traversal evidence path")
    output = root.joinpath(*relative.parts)
    # Disallow symlinked files *and parents* even if resolve() would stay below
    # the evidence root; this prevents mutable aliases and external reads.
    current = root
    for part in relative.parts:
        current = current / part
        require(not current.is_symlink(), "Evidence symlink is not accepted")
    require(output.is_file(), f"Missing original evidence: {name}")
    require(0 < output.stat().st_size <= max_size, f"Unbounded/empty evidence: {name}")
    require(output.resolve().is_relative_to(root), "Evidence escaped its root")
    return output


def _digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8-sig")
    except UnicodeError as error:
        raise EvidenceError(f"Original text is not UTF-8: {path.name}") from error


def _as_dict(value: object, label: str) -> dict:
    require(type(value) is dict, f"{label} must be an object")
    return value


def _pdf_fonts(text: str) -> dict:
    rows = [x.split() for x in text.splitlines()[2:] if x.strip()]
    require(bool(rows), "Original pdffonts has no font rows")
    seen_unicode = False
    for columns in rows:
        require(len(columns) >= 8, "Malformed original pdffonts font row")
        flags = columns[-5:]
        require(all(v.lower() in ("yes", "no") for v in flags[:3])
                and all(v.isdigit() for v in flags[3:]),
                "Malformed original pdffonts emb/sub/uni/object fields")
        require(flags[0].lower() == "yes", "Unembedded PDF font")
        seen_unicode |= flags[2].lower() == "yes"
    require(seen_unicode, "No embedded font with ToUnicode")
    return {"font_rows": len(rows), "to_unicode": True}


def validate(root: Path, expected_sha: str) -> dict:
    """Inspect a physical W3 candidate. NEVER return a final W3 PASS verdict."""
    require(isinstance(expected_sha, str) and HEX40.fullmatch(expected_sha) is not None,
            "W3 acceptance requires exact lowercase 40-digit Git source SHA")
    root = root.resolve(strict=True)
    manifest_path = _safe_file(root, "w3-original.json", MAX_MANIFEST)
    try:
        m = json.loads(_read_text(manifest_path))
    except (json.JSONDecodeError, TypeError) as error:
        raise EvidenceError("Invalid W3 JSON") from error
    m = _as_dict(m, "W3 original manifest")
    require(type(m.get("schema_version")) is int and m["schema_version"] == 1,
            "Unsupported W3 evidence schema")
    require(m.get("kind") == KIND and m.get("source_sha") == expected_sha,
            "Evidence is not the specified exact W3 source")
    require(m.get("status") == "CAPTURED_NOT_ACCEPTED",
            "Input must not self-assert physical W3 PASS")

    host = _as_dict(m.get("host"), "host")
    require(host.get("os_caption") == "Windows 10 Pro"
            and type(host.get("os_build")) is int and host["os_build"] >= 19045
            and host.get("arch") == "x64", "W3 requires owner Windows 10 Pro x64")
    require(type(host.get("session_id")) is int and host["session_id"] > 0
            and host.get("wts_connect_state") == 0
            and host.get("window_station") == "WinSta0"
            and host.get("input_desktop") == "Default",
            "W3 must be captured in an active interactive desktop")
    require(type(host.get("pid")) is int and host["pid"] > 0
            and type(host.get("hwnd")) is int and host["hwnd"] > 0
            and HEX64.fullmatch(host.get("app_sha256", "")) is not None,
            "W3 has no native app identity")

    files = _as_dict(m.get("files"), "files")
    mandatory = {"initial_source", "saved_source", "reopened_source",
                 "seventh_source", "undo_source", "pdf", "pdffonts", "pdftotext",
                 "pdfinfo", "gui_build_log"}
    require(set(files) == mandatory, "W3 required original file set differs")
    snapshots = _as_dict(m.get("source_snapshots"), "source_snapshots")
    require(set(snapshots) == set(TOOLS), "Require all six independent GUI-source snapshots")
    images = _as_dict(m.get("pngs"), "pngs")
    require(set(images) == set(PNG_STEPS), "Require every original W3 GUI screenshot")
    paths = list(files.values()) + list(snapshots.values()) + list(images.values())
    require(all(isinstance(p, str) for p in paths) and len(set(paths)) == len(paths),
            "Evidence paths must be distinct")
    recorded = _as_dict(m.get("sha256"), "sha256")
    require(set(recorded) == set(paths), "Original evidence inventory incomplete/extra")
    check_paths: dict[str, Path] = {}
    for name in paths:
        expected = recorded[name]
        require(isinstance(expected, str) and HEX64.fullmatch(expected) is not None,
                "Invalid SHA256 evidence ledger entry")
        limit = MAX_PDF if name == files["pdf"] else (
            64 * 1024 * 1024 if name in images.values() else
            MAX_SOURCE if name in snapshots.values() or name.endswith(".tex") else MAX_LOG)
        path = _safe_file(root, name, limit)
        require(_digest(path) == expected, f"Original evidence SHA mismatch: {name}")
        check_paths[name] = path

    events = m.get("events")
    require(type(events) is list and len(events) == len(EVENTS),
            "A complete W3 OS-input event sequence is required")
    for step, event in zip(EVENTS, events):
        require(type(event) is dict and event.get("step") == step
                and event.get("pid") == host["pid"]
                and event.get("hwnd") == host["hwnd"]
                and event.get("session_id") == host["session_id"]
                and event.get("wts_connect_state") == 0
                and event.get("origin") == (
                    "OBSERVED_OWNED_WINDOW" if step == "startup"
                    else "GUI_XELATEX" if step == "pdf" else "WIN32_REAL_INPUT"),
                f"W3 event {step} lacks exact owned active-session trace")
    # Self-reported events are NOT a cryptographic proof of actual OS input.
    # Keep independent manual review mandatory even when this contract passes.

    base = check_paths[files["initial_source"]].read_bytes()
    final = check_paths[files["saved_source"]].read_bytes()
    require(original_preserved(base, final), "User macros/comments/CRLF changed")
    six = owners(final)
    require(tuple(item["tool"] for item in six) == TOOLS,
            "W3 final source lacks six ordered native owned TikZ commands")
    for count, tool in enumerate(TOOLS, 1):
        current = check_paths[snapshots[tool]].read_bytes()
        require(original_preserved(base, current), f"{tool}: unrelated source changed")
        found = owners(current)
        require(tuple(x["tool"] for x in found) == TOOLS[:count],
                f"{tool}: expected exactly {count} progressively saved GUI commands")
    require(check_paths[snapshots[TOOLS[-1]]].read_bytes() == final,
            "Final GUI-saved source differs from sixth captured step")
    seven = owners(check_paths[files["seventh_source"]].read_bytes())
    require(len(seven) == 7 and tuple(x["tool"] for x in seven[:6]) == TOOLS,
            "No independent seventh temporary gesture before Undo")
    require(check_paths[files["undo_source"]].read_bytes() == final
            and check_paths[files["reopened_source"]].read_bytes() == final,
            "GUI Undo or native Reopen changed original source bytes")

    dimensions = set()
    pixel_digests = []
    for step in PNG_STEPS:
        frame = inspect_png(check_paths[images[step]])
        require(850 <= frame.width <= 8192 and 440 <= frame.height <= 8192,
                "Original client screenshot too small or cropped")
        dimensions.add((frame.width, frame.height))
        pixel_digests.append(frame.pixel_sha256)
    require(len(dimensions) == 1, "Owned GUI screenshots changed client dimensions")
    require(len(set(pixel_digests)) >= 8 and pixel_digests[0] != pixel_digests[1],
            "GUI/F1 captures do not show sufficient independently rendered change")

    pdf = check_paths[files["pdf"]].read_bytes()
    require(pdf.startswith(b"%PDF-") and b"%%EOF" in pdf[-2048:],
            "Original PDF header/trailer invalid")
    info = _read_text(check_paths[files["pdfinfo"]])
    require(re.search(r"(?m)^Pages:\s+1\s*$", info) is not None,
            "Original pdfinfo does not report one page")
    font_audit = _pdf_fonts(_read_text(check_paths[files["pdffonts"]]))
    extracted = _read_text(check_paths[files["pdftotext"]])
    expected_cyrillic = m.get("expected_cyrillic_text")
    require(isinstance(expected_cyrillic, str)
            and re.search(r"[\u0400-\u04ff]{3,}", expected_cyrillic) is not None
            and expected_cyrillic in final.decode("utf-8")
            and expected_cyrillic in extracted,
            "GUI source and original extracted PDF must contain Cyrillic text")
    build = _as_dict(m.get("build"), "build")
    require(build.get("initiator") == "GUI_BUTTON"
            and type(build.get("xelatex_exit_code")) is int
            and build["xelatex_exit_code"] == 0
            and build.get("saved_source_sha256") == _digest(check_paths[files["saved_source"]])
            and build.get("pdf_sha256") == _digest(check_paths[files["pdf"]]),
            "No source-bound GUI XeLaTeX result")
    log = _read_text(check_paths[files["gui_build_log"]])
    require("XeLaTeX" in log or "xelatex" in log.lower(),
            "Missing original GUI-origin XeLaTeX log")

    return {
        "status": "STRUCTURE_PASS_MANUAL_PHYSICAL_QA_REQUIRED",
        "release_gate": "W3_NOT_ACCEPTED",
        "source_sha": expected_sha,
        "files_sha256_verified": len(paths),
        "png_count": len(PNG_STEPS),
        "native_tools": list(TOOLS),
        "font_rows": font_audit["font_rows"],
        "original_png_client_dimensions": list(dimensions.pop()),
        "manual_review": "REQUIRED_ORIGINAL_GUI_INPUT_PDF_FONTS_WINDOWS10",
        "limitations": "Host/event JSON and pdftotext/pdffonts are self-reported; verifier never certifies real OS input or PDF authenticity by itself.",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--evidence", type=Path, required=True)
    ap.add_argument("--source-sha", required=True)
    ap.add_argument("--report", type=Path)
    args = ap.parse_args()
    try:
        result = validate(args.evidence, args.source_sha)
    except (EvidenceError, ValueError, OSError, KeyError, UnicodeError) as error:
        result = {"status": "FAIL_ORIGINAL_W3_EVIDENCE", "release_gate": "W3_NOT_ACCEPTED",
                  "error": str(error)}
    encoded = json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(encoded + "\n", encoding="utf-8")
    print(encoded)
    return 0 if result["status"].startswith("STRUCTURE_PASS") else 1


if __name__ == "__main__":
    raise SystemExit(main())
