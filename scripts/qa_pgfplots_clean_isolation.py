#!/usr/bin/env python3
"""Compare pinned PGFPlots originals with their attributed clean derivatives.

This is a compile-isolation check only. It does not run the Studio GUI or grant
native, visual-editor, or release acceptance.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import signal
import shutil
import sys
import struct
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts import qa_pgfplots_clean_derivatives as derivatives


DEFAULT_OUTPUT = ROOT / "validation/cp08/clean-isolation-run"
SCOPE = "COMPILE_ISOLATION_ORIGINAL_VS_ATTRIBUTED_DERIVATIVE"
WARNING_RE = re.compile(
    r"Missing character: There is no ; \((?:\"3B|U\+003[Bb])\) in font nullfont!"
)
OTHER_WARNING_RE = re.compile(
    r"(?:^|\b)(?:LaTeX(?: [^:]+)?|Package [^ ]+|Class [^ ]+) Warning:|"
    r"Missing character:|Overfull \\hbox|Underfull \\hbox|"
    r"Overfull \\vbox|Underfull \\vbox",
    re.IGNORECASE,
)
FATAL_RE = re.compile(r"^!|Emergency stop|Fatal error occurred|I can't find the format file", re.MULTILINE)
ENVIRONMENT_NOTICE_PATTERNS = {
    "shell_escape_disabled": re.compile(
        r"^Package shellesc Warning: Shell escape disabled on input line \d+\.$"),
    "inputenc_ignored_utf8": re.compile(
        r"^Package inputenc Warning: inputenc package ignored with utf8 based engines\.$"),
}
EXPECTED_FONT_INVENTORY = {
    "SV-003-clean": {"CMSY10", "CMMI10", "CMR7", "CMR10", "CMMI7"},
    "SV-029-clean": {"CMMI10", "CMR7", "CMR10"},
    "SV-009-clean": {"CMR10", "CMMI10", "CharisSIL-Italic", "CMR7", "CMMI7"},
}
DERIVATIVE_CORPUS_IDS = {
    "SV-003-clean": "SV-003",
    "SV-029-clean": "SV-029",
    "SV-009-clean": "SV-009",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _text(data: bytes) -> str:
    return data.decode("utf-8", "replace")


def extract_expected_warning_lines(log_text: str) -> list[str]:
    """Return exact target missing-semicolon warning lines from a TeX log."""
    return [line.strip() for line in log_text.splitlines() if WARNING_RE.search(line)]


def classify_diagnostics(log_text: str, variant: str) -> dict[str, Any]:
    """Classify a TeX log; synthetic callers can test policy without TeX."""
    if variant not in {"original", "clean"}:
        raise ValueError("variant must be original or clean")
    lines = log_text.splitlines()
    target_lines = extract_expected_warning_lines(log_text)
    environment_notices: dict[str, list[str]] = {}
    classified_notice_lines: set[str] = set()
    for notice, pattern in ENVIRONMENT_NOTICE_PATTERNS.items():
        found = [line.strip() for line in lines if pattern.fullmatch(line.strip())]
        environment_notices[notice] = found
        classified_notice_lines.update(found)
    other_warnings = [line.strip() for line in lines
                      if OTHER_WARNING_RE.search(line) and not WARNING_RE.search(line)
                      and line.strip() not in classified_notice_lines]
    fatal_lines = [line.strip() for line in lines if FATAL_RE.search(line)]
    target_count_ok = len(target_lines) == (2 if variant == "original" else 0)
    environment_notice_counts_ok = all(len(found) <= 1 for found in environment_notices.values())
    return {
        "target_warning_count": len(target_lines),
        "target_warning_lines": target_lines,
        "target_warning_count_expected": 2 if variant == "original" else 0,
        "target_warning_count_ok": target_count_ok,
        "other_warning_lines": other_warnings,
        "environment_notices": environment_notices,
        "environment_notice_counts_ok": environment_notice_counts_ok,
        "fatal_lines": fatal_lines,
        "acceptable": target_count_ok and environment_notice_counts_ok
        and not other_warnings and not fatal_lines,
    }


def compare_pdf_pages(original_pages: int | None, clean_pages: int | None,
                      original_render: dict[str, Any] | None,
                      clean_render: dict[str, Any] | None) -> dict[str, Any]:
    def valid_render(render: dict[str, Any] | None) -> bool:
        return bool(render and render.get("exit_code") == 0 and not render.get("timed_out")
                    and isinstance(render.get("width"), int) and render["width"] > 0
                    and isinstance(render.get("height"), int) and render["height"] > 0
                    and isinstance(render.get("sha256"), str) and len(render["sha256"]) == 64)
    same_render = bool(
        valid_render(original_render) and valid_render(clean_render)
        and original_render.get("sha256") == clean_render.get("sha256")
        and original_render.get("width") == clean_render.get("width")
        and original_render.get("height") == clean_render.get("height")
    )
    return {
        "original_pages": original_pages,
        "clean_pages": clean_pages,
        "one_page_each": original_pages == 1 and clean_pages == 1,
        "render_equal_byte_for_byte": same_render,
        "original_render": original_render,
        "clean_render": clean_render,
    }


def audit_embedded_fonts(fonts_text: str) -> dict[str, Any]:
    """Fail closed on missing, malformed, or non-embedded PDF font records."""
    rows = [line for line in fonts_text.splitlines()[2:] if line.strip()]
    parse_errors: list[str] = []
    nonembedded: list[str] = []
    for line in rows:
        columns = line.split()
        flags = columns[-5:]
        if (len(columns) < 8 or len(flags) != 5
                or any(flag.lower() not in ("yes", "no") for flag in flags[:3])
                or not flags[3].isdigit() or not flags[4].isdigit()):
            parse_errors.append(line)
        elif flags[0].lower() != "yes":
            nonembedded.append(line)
    return {"font_count": len(rows), "all_embedded": bool(rows) and not parse_errors and not nonembedded,
            "parse_errors": parse_errors, "nonembedded_rows": nonembedded, "rows": rows}


def xelatex_argv(binary: str, output_dir: Path, source_path: Path) -> list[str]:
    return [binary, "-no-shell-escape", "-halt-on-error", "-interaction=nonstopmode",
            "-file-line-error", "-recorder", "-jobname=source",
            "-output-directory", str(output_dir), str(source_path)]


def assess_pair(original: dict[str, Any], clean: dict[str, Any], *,
                fixture_name: str) -> tuple[str, dict[str, Any]]:
    """Assess retained result records without assuming optional files exist."""
    if (fixture_name not in DERIVATIVE_CORPUS_IDS
            or fixture_name not in EXPECTED_FONT_INVENTORY):
        raise ValueError(f"Unknown clean-isolation fixture: {fixture_name}")
    def record(run: dict[str, Any], key: str) -> dict[str, Any]:
        value = run.get(key)
        return value if isinstance(value, dict) else {}

    original_fonts = record(original, "pdffonts")
    clean_fonts = record(clean, "pdffonts")
    original_text = record(original, "pdftotext")
    clean_text = record(clean, "pdftotext")
    original_render = record(original, "render")
    clean_render = record(clean, "render")
    page_comparison = compare_pdf_pages(original.get("pages"), clean.get("pages"),
                                        original_render, clean_render)
    original_font_rows = _canonical_fonts(original_fonts.get("text", ""))
    clean_font_rows = _canonical_fonts(clean_fonts.get("text", ""))
    same_fonts = original_font_rows == clean_font_rows
    expected_font_names = EXPECTED_FONT_INVENTORY[fixture_name]
    original_font_names = [row[0] for row in original_font_rows]
    clean_font_names = [row[0] for row in clean_font_rows]
    exact_font_inventory = (sorted(original_font_names) == sorted(expected_font_names)
                            and sorted(clean_font_names) == sorted(expected_font_names))
    same_text = bool(original_text.get("sha256") and
                     original_text.get("sha256") == clean_text.get("sha256"))
    requires_charis = DERIVATIVE_CORPUS_IDS[fixture_name] == "SV-009"
    original_has_charis = "CharisSIL-Italic" in original_font_names
    clean_has_charis = "CharisSIL-Italic" in clean_font_names
    audits = (record(original, "font_audit"), record(clean, "font_audit"))
    pages_ok = original.get("pages") == 1 and clean.get("pages") == 1
    process_keys = ("pdfinfo", "pdffonts", "pdftotext")
    process_ok = all(record(run, key).get("exit_code") == 0
                     and not record(run, key).get("timed_out")
                     for run in (original, clean) for key in process_keys)
    builds_ok = all(run.get("xelatex_exit_code") == 0 and not run.get("xelatex_timed_out")
                    and record(run, "input_binding").get("source_bound")
                    and record(run, "source_integrity").get("ok")
                    and record(run, "log_diagnostics").get("acceptable")
                    for run in (original, clean))
    embedded_ok = all(audit.get("all_embedded") for audit in audits)
    original_notice_inventory = {key: len(lines) for key, lines in
                                 original.get("log_diagnostics", {}).get("environment_notices", {}).items()}
    clean_notice_inventory = {key: len(lines) for key, lines in
                              clean.get("log_diagnostics", {}).get("environment_notices", {}).items()}
    notices_equal = original_notice_inventory == clean_notice_inventory
    diagnostics_ok = all(run.get("log_diagnostics", {}).get("acceptable")
                         for run in (original, clean))
    render_ok = page_comparison["render_equal_byte_for_byte"]
    details = {**page_comparison, "same_fonts": same_fonts,
               "same_extracted_text": same_text,
               "original_has_charis": original_has_charis,
               "clean_has_charis": clean_has_charis,
               "requires_charis": requires_charis,
               "corpus_id": DERIVATIVE_CORPUS_IDS[fixture_name],
               "expected_font_names": sorted(expected_font_names),
               "original_font_names": sorted(original_font_names),
               "clean_font_names": sorted(clean_font_names),
               "exact_font_inventory": exact_font_inventory,
               "environment_notices_equal": notices_equal,
               "original_environment_notice_inventory": original_notice_inventory,
               "clean_environment_notice_inventory": clean_notice_inventory,
               "diagnostics_acceptable": diagnostics_ok,
               "all_fonts_embedded": embedded_ok,
               "both_builds_and_bindings_valid": builds_ok,
               "all_pdf_tools_succeeded": process_ok}
    passed = (pages_ok and process_ok and builds_ok and embedded_ok and render_ok
              and same_fonts and same_text and exact_font_inventory and diagnostics_ok
              and notices_equal
              and (not requires_charis or (original_has_charis and clean_has_charis)))
    return ("PASS" if passed else "FAIL"), details


def _run(argv: Sequence[str], cwd: Path, timeout_s: int) -> dict[str, Any]:
    try:
        proc = subprocess.Popen(argv, cwd=cwd, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, start_new_session=(os.name == "posix"))
        try:
            output, _ = proc.communicate(timeout=timeout_s)
            return {"argv": list(argv), "exit_code": proc.returncode,
                    "timed_out": False, "console_bytes": output}
        except subprocess.TimeoutExpired as exc:
            try:
                if os.name == "posix":
                    os.killpg(proc.pid, signal.SIGKILL)
                else:
                    proc.kill()
            except ProcessLookupError:
                pass
            output = exc.output or b""
            if isinstance(output, str):
                output = output.encode("utf-8", "replace")
            cleanup_error = None
            if proc.stdout is not None:
                proc.stdout.close()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                cleanup_error = "process did not exit within 5s after process-group kill"
            if cleanup_error:
                return {"argv": list(argv), "exit_code": None, "timed_out": True,
                        "console_bytes": output, "cleanup_error": cleanup_error}
            return {"argv": list(argv), "exit_code": None,
                    "timed_out": True, "console_bytes": output}
    except OSError as exc:
        return {"argv": list(argv), "exit_code": None, "timed_out": False,
                "console_bytes": str(exc).encode("utf-8", "replace"),
                "launch_error": f"{type(exc).__name__}: {exc}"}


def _save_command_result(directory: Path, basename: str, result: dict[str, Any]) -> None:
    (directory / f"{basename}.console.txt").write_bytes(result["console_bytes"])
    result["console_path"] = f"{basename}.console.txt"
    result["console_sha256"] = sha256(result["console_bytes"])
    del result["console_bytes"]


def _tool_version(tool: str, output_dir: Path, timeout_s: int,
                  version_args: Sequence[str]) -> dict[str, Any]:
    binary = shutil.which(tool)
    if binary is None:
        return {"available": False, "binary": None, "version": None}
    argv = [binary, *version_args]
    result = _run(argv, output_dir, timeout_s)
    raw = result.pop("console_bytes")
    text = _text(raw)
    real_binary = str(Path(binary).resolve())
    binary_path = Path(real_binary)
    binary_sha256 = None
    binary_bytes = None
    if binary_path.is_file():
        binary_bytes = binary_path.stat().st_size
        binary_sha256 = sha256(binary_path.read_bytes())
    return {"available": result.get("exit_code") == 0, "binary": binary,
            "binary_realpath": real_binary, "binary_sha256": binary_sha256,
            "binary_bytes": binary_bytes,
            "argv": argv, "exit_code": result.get("exit_code"),
            "version": text.splitlines()[0] if text.splitlines() else None,
            "console": text, "console_sha256": sha256(raw)}


def _git_identity(repo_root: Path) -> dict[str, Any]:
    def git(args: list[str]) -> str | None:
        try:
            return subprocess.run(["git", *args], cwd=repo_root, check=True,
                                  stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                  text=True).stdout.strip()
        except (OSError, subprocess.CalledProcessError):
            return None
    return {"head_sha": git(["rev-parse", "HEAD"]),
            "head_tree_sha": git(["rev-parse", "HEAD^{tree}"]),
            "worktree_porcelain": git(["status", "--porcelain"])}


def _fls_inputs(fls_path: Path, expected_source: Path) -> dict[str, Any]:
    if not fls_path.is_file():
        return {"exists": False, "source_bound": False, "inputs": []}
    input_paths = []
    source_matches = 0
    source_hashes = set()
    lines = fls_path.read_text(errors="replace").splitlines()
    pwd = fls_path.parent
    for line in lines:
        if line.startswith("PWD "):
            pwd = Path(line[4:])
            continue
        if not line.startswith("INPUT "):
            continue
        raw = line[6:]
        candidate = Path(raw)
        if not candidate.is_absolute():
            candidate = (pwd / candidate).resolve()
        else:
            candidate = candidate.resolve()
        match = candidate == expected_source.resolve()
        if match:
            source_matches += 1
        item = {"path": str(candidate), "is_requested_source": match,
                "exists": candidate.is_file()}
        if candidate.is_file():
            try:
                item["sha256"] = sha256(candidate.read_bytes())
            except OSError:
                item["sha256"] = None
        if match:
            source_hashes.add(item.get("sha256"))
        input_paths.append(item)
    # Recorder occurrences are observations, not distinct source identities.
    # Repeated reads of the same resolved path must bind to the same bytes.
    source_sha256 = next(iter(source_hashes)) if len(source_hashes) == 1 else None
    return {"exists": True, "pwd": str(pwd.resolve()),
            "source_bound": source_matches > 0 and source_sha256 is not None,
            "source_match_count": source_matches,
            "source_sha256": source_sha256, "input_count": len(input_paths),
            "inputs": input_paths}


def assess_source_integrity(expected: bytes, source_after: bytes,
                            input_binding: dict[str, Any]) -> dict[str, Any]:
    """Bind the copied source and actual recorder input to the expected bytes."""
    expected_hash = sha256(expected)
    source_hash = sha256(source_after)
    recorded_hash = input_binding.get("source_sha256")
    file_matches = source_hash == expected_hash
    input_matches = recorded_hash == expected_hash
    bound = input_binding.get("source_bound") is True
    return {"expected_sha256": expected_hash,
            "source_file_sha256_after": source_hash,
            "recorder_input_sha256": recorded_hash,
            "source_file_matches_expected": file_matches,
            "recorder_input_matches_expected": input_matches,
            "actual_input_bound": bound,
            "ok": file_matches and input_matches and bound}


def _png_dimensions(path: Path) -> tuple[int, int] | None:
    if not path.is_file():
        return None
    data = path.read_bytes()
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", data[16:24])


def _canonical_fonts(text: str) -> list[tuple[str, ...]]:
    rows = []
    for line in text.splitlines():
        parts = line.split()
        # pdffonts rows are: name type encoding emb sub uni object generation.
        if len(parts) >= 8 and parts[-2].isdigit() and parts[-1].isdigit():
            columns = parts[:-2]
            columns[0] = re.sub(r"^[A-Z]{6}\+", "", columns[0])
            rows.append(tuple(columns))
    return rows


def _capture_postbuild(run_dir: Path, temp_dir: Path, source_path: Path,
                       tools: dict[str, str], timeout_s: int) -> dict[str, Any]:
    artifacts: dict[str, Any] = {}
    expected = {"log": temp_dir / "source.log", "fls": temp_dir / "source.fls",
                "pdf": temp_dir / "source.pdf"}
    for key, src in expected.items():
        if src.is_file():
            target = run_dir / f"actual.{key}"
            shutil.copyfile(src, target)
            artifacts[key] = {"path": target.name, "sha256": sha256(target.read_bytes()),
                              "bytes": target.stat().st_size}
        else:
            artifacts[key] = None

    log_text = expected["log"].read_text(errors="replace") if expected["log"].is_file() else ""
    artifacts["diagnostics"] = classify_diagnostics(log_text, run_dir.name.split("-")[-1])
    artifacts["input_binding"] = _fls_inputs(expected["fls"], source_path)

    pdf = expected["pdf"]
    if not pdf.is_file():
        artifacts.update({"pdfinfo": None, "pdffonts": None, "pdftotext": None,
                          "render": None, "pages": None})
        return artifacts
    commands = {
        "pdfinfo": [str(pdf)],
        "pdffonts": [str(pdf)],
        "pdftotext": ["-layout", str(pdf), "-"],
    }
    for key, suffix_args in commands.items():
        if not tools.get(key):
            artifacts[key] = {"available": False, "exit_code": None,
                              "timed_out": False, "reason": "required binary unavailable"}
            continue
        argv = [tools[key], *suffix_args]
        result = _run(argv, temp_dir, timeout_s)
        raw = result["console_bytes"]
        suffix = {"pdfinfo": ".pdfinfo.txt", "pdffonts": ".pdffonts.txt",
                  "pdftotext": ".pdftotext.txt"}[key]
        target = run_dir / ("actual" + suffix)
        target.write_bytes(raw)
        artifacts[key] = {"argv": argv, "exit_code": result["exit_code"],
                          "timed_out": result["timed_out"], "path": target.name,
                          "sha256": sha256(raw), "bytes": len(raw),
                          "text": _text(raw)}
    artifacts["font_audit"] = audit_embedded_fonts(artifacts.get("pdffonts", {}).get("text", ""))
    info = artifacts.get("pdfinfo", {}).get("text", "")
    page_match = re.search(r"^Pages:\s+(\d+)\s*$", info, re.MULTILINE)
    artifacts["pages"] = int(page_match.group(1)) if page_match else None
    render_base = temp_dir / "render"
    render_result = (_run([tools["pdftoppm"], "-png", "-r", "150", "-singlefile",
                           str(pdf), str(render_base)], temp_dir, timeout_s)
                     if tools.get("pdftoppm") else
                     {"argv": [], "exit_code": None, "timed_out": False,
                      "console_bytes": b"pdftoppm unavailable"})
    render_source = temp_dir / "render.png"
    render = None
    if render_source.is_file():
        target = run_dir / "actual-150dpi.png"
        shutil.copyfile(render_source, target)
        dims = _png_dimensions(target)
        render = {"argv": render_result["argv"], "exit_code": render_result["exit_code"],
                  "timed_out": render_result["timed_out"], "path": target.name,
                  "sha256": sha256(target.read_bytes()), "bytes": target.stat().st_size,
                  "width": dims[0] if dims else None, "height": dims[1] if dims else None}
    artifacts["render"] = render
    return artifacts


def _run_one(name: str, variant: str, source: bytes, source_path: Path,
             output_dir: Path, tools: dict[str, str], timeout_s: int) -> dict[str, Any]:
    run_dir = output_dir / name / variant
    run_dir.mkdir(parents=True, exist_ok=False)
    try:
        source_before = source_path.read_bytes()
        if source_before != source:
            raise ValueError("source file changed before XeLaTeX invocation")
        with tempfile.TemporaryDirectory(prefix=f"{variant}-", dir=output_dir / "_tmp") as tmp:
            temp_dir = Path(tmp)
            argv = xelatex_argv(tools["xelatex"], temp_dir, source_path)
            result = _run(argv, temp_dir, timeout_s)
            _save_command_result(run_dir, "xelatex", result)
            result.pop("console_path", None)
            diagnostics = _capture_postbuild(run_dir, temp_dir, source_path, tools, timeout_s)
            source_after = source_path.read_bytes()
            source_integrity = assess_source_integrity(
                source, source_after, diagnostics.get("input_binding", {}))
            log_text = (run_dir / "actual.log").read_text(errors="replace") if (run_dir / "actual.log").exists() else ""
            return {"status": "PASS_CANDIDATE" if source_integrity["ok"] else "FAIL",
                    "source_path": str(source_path),
                    "source_sha256": sha256(source), "source_bytes": len(source),
                    "source_integrity": source_integrity,
                    "xelatex_argv": argv, "xelatex_exit_code": result.get("exit_code"),
                    "xelatex_timed_out": result.get("timed_out", False),
                    "xelatex_cleanup_error": result.get("cleanup_error"),
                    "xelatex_launch_error": result.get("launch_error"),
                    "console_path": "xelatex.console.txt",
                    "console_sha256": (run_dir / "xelatex.console.txt").exists()
                    and sha256((run_dir / "xelatex.console.txt").read_bytes()),
                    "log_diagnostics": classify_diagnostics(log_text, variant),
                    **diagnostics}
    except Exception:
        # Preserve partial artifacts; caller receives an explicit failure record.
        raise


def _toolchain(output_dir: Path, timeout_s: int) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    tools = {tool: shutil.which(tool) for tool in
             ("xelatex", "pdfinfo", "pdffonts", "pdftotext", "pdftoppm", "fc-match")}
    version_args = {"xelatex": ["--version"], "pdfinfo": ["-v"],
                    "pdffonts": ["-v"], "pdftotext": ["-v"],
                    "pdftoppm": ["-v"], "fc-match": ["--version"]}
    versions = {tool: _tool_version(tool, output_dir, timeout_s, version_args[tool])
                for tool in version_args}
    return {"binaries": tools, "versions": versions}


def run_isolation(output_dir: Path = DEFAULT_OUTPUT, timeout_s: int = 180,
                  selected: Sequence[str] | None = None,
                  repo_root: Path = ROOT) -> dict[str, Any]:
    if timeout_s < 1:
        raise ValueError("timeout_s must be positive")
    output_dir = output_dir.resolve()
    if output_dir.exists() and any(output_dir.iterdir()):
        raise ValueError(f"Refusing non-empty output directory: {output_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "_tmp").mkdir(exist_ok=True)
    chosen = list(selected or derivatives.SPECS)
    if len(set(chosen)) != len(chosen) or any(name not in derivatives.SPECS for name in chosen):
        raise ValueError("Unknown or duplicate derivative selection")
    attribution = derivatives.verify(repo_root / "scripts/fixtures/pgfplots-v2/clean-derivatives",
                                     repo_root)
    toolchain = _toolchain(output_dir, min(timeout_s, 15))
    missing = [name for name, path in toolchain["binaries"].items() if not path]
    blocked_reasons: list[str] = [f"missing required tool: {name}" for name in missing]

    # Record exact installed-font resolution; do not install or substitute fonts.
    font_match: dict[str, Any] = {"required_family": "Charis SIL", "resolved_family": None,
                                  "resolved_file": None, "status": "BLOCKED"}
    if toolchain["binaries"]["fc-match"]:
        argv = [toolchain["binaries"]["fc-match"], "-f", "%{family}\n%{file}\n", "Charis SIL"]
        fm = _run(argv, output_dir, min(timeout_s, 15))
        raw = fm["console_bytes"]
        (output_dir / "font-match.console.txt").write_bytes(raw)
        parts = _text(raw).splitlines()
        family, fontfile = (parts + [None, None])[:2]
        font_path = Path(fontfile) if fontfile else None
        font_sha = sha256(font_path.read_bytes()) if font_path and font_path.is_file() else None
        font_match.update({"argv": argv, "exit_code": fm["exit_code"],
                           "console_sha256": sha256(raw), "resolved_family": family,
                           "resolved_file": str(font_path.resolve()) if font_path and font_path.is_file() else fontfile,
                           "resolved_file_sha256": font_sha,
                           "status": "PASS" if family == "Charis SIL" and font_sha else "BLOCKED"})
        if font_match["status"] != "PASS":
            blocked_reasons.append("Charis SIL did not resolve to an installed Charis SIL font")
    else:
        blocked_reasons.append("fc-match unavailable; cannot verify requested font")

    nativeinputs = output_dir / "nativeinputs"
    nativeinputs.mkdir()
    entries = {item["name"]: item for item in attribution["derivatives"]}
    fixture_records = []
    for name in chosen:
        evidence = derivatives.fixture_evidence(name,
            repo_root / "scripts/fixtures/pgfplots-v2/clean-derivatives", repo_root)
        pair = {"name": name, "corpus_status": evidence["manifest"]["corpus_status"],
                "manifest": evidence["manifest"], "runs": {}}
        for variant, key in (("original", "original_bytes"), ("clean", "derived_bytes")):
            source_bytes = evidence[key]
            source_path = nativeinputs / f"{name}-{variant}.tex"
            source_path.write_bytes(source_bytes)
            if not toolchain["binaries"]["xelatex"]:
                pair["runs"][variant] = {"status": "BLOCKED", "reason": "xelatex unavailable",
                                          "source_path": str(source_path),
                                          "source_sha256": sha256(source_bytes)}
                continue
            try:
                record = _run_one(name, variant, source_bytes, source_path, output_dir,
                                  {tool: path for tool, path in toolchain["binaries"].items() if path},
                                  timeout_s)
            except Exception as exc:
                record = {"status": "FAIL", "reason": f"runner error: {type(exc).__name__}: {exc}",
                          "source_path": str(source_path), "source_sha256": sha256(source_bytes)}
            pair["runs"][variant] = record

        original = pair["runs"].get("original", {})
        clean = pair["runs"].get("clean", {})
        format_missing = any(run.get("xelatex_exit_code") not in (0, None) and
               "format file" in (Path(output_dir / name / variant / "xelatex.console.txt").read_text(errors="replace")
                                  if (output_dir / name / variant / "xelatex.console.txt").exists() else "").lower()
               for variant, run in (("original", original), ("clean", clean)))
        if format_missing:
            blocked_reasons.append(f"{name}: XeLaTeX format unavailable")
            original["status"] = "BLOCKED"
            clean["status"] = "BLOCKED"

        if missing or font_match["status"] != "PASS" or format_missing:
            pair["status"] = "BLOCKED"
            pair["blocked_reasons"] = ([f"missing required tool: {tool}" for tool in missing]
                                        + ([] if font_match["status"] == "PASS" else
                                           ["Charis SIL not verified as the exact installed family"])
                                        + ([] if not format_missing else ["XeLaTeX format unavailable"]))
        elif original.get("status") != "BLOCKED" and clean.get("status") != "BLOCKED":
            pair["status"], pair["comparison"] = assess_pair(
                original, clean, fixture_name=name)
        else:
            pair["status"] = "BLOCKED"
        fixture_records.append(pair)

    status = "BLOCKED" if blocked_reasons else ("PASS" if all(item["status"] == "PASS" for item in fixture_records) else "FAIL")
    manifest = {
        "schema": "PGFPLOTS_CLEAN_ISOLATION_V1",
        "scope": SCOPE,
        "status": status,
        "acceptance_warning": "COMPILE_ISOLATION_ONLY; no GUI/native Studio acceptance",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "repo_root": str(repo_root.resolve()),
        "git_identity": _git_identity(repo_root),
        "toolchain": toolchain,
        "font_match": font_match,
        "timeout_seconds_per_process": timeout_s,
        "build_environment": {key: os.environ.get(key) for key in
                              ("LANG", "LC_ALL", "TEXINPUTS", "TEXMFHOME")},
        "fixture_names": chosen,
        "blocked_reasons": blocked_reasons,
        "fixtures": fixture_records,
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", "--output-dir", dest="output_dir", type=Path,
                        default=DEFAULT_OUTPUT)
    parser.add_argument("--timeout-seconds", type=int, default=180)
    parser.add_argument("--fixture", action="append", choices=tuple(derivatives.SPECS),
                        help="run one fixture; repeat to select several (default: all three)")
    args = parser.parse_args()
    manifest = run_isolation(args.output_dir, args.timeout_seconds, args.fixture)
    print(json.dumps({"status": manifest["status"], "scope": manifest["scope"],
                      "fixtures": [{"name": f["name"], "status": f["status"]}
                                   for f in manifest["fixtures"]],
                      "blocked_reasons": manifest["blocked_reasons"]}, ensure_ascii=False))
    return 0 if manifest["status"] == "PASS" else (2 if manifest["status"] == "BLOCKED" else 1)


if __name__ == "__main__":
    raise SystemExit(main())
