#!/usr/bin/env python3
"""Stage and audit original compact Scientific Studio native evidence.

This is an artifact validator, NOT a GUI driver or native acceptance oracle.
Production GUI actions and independent image/PDF review remain required. Inputs
and expected bytes are deliberately separate from observed source snapshots.
No existing coordinate lease or historical APP_TREE pin is changed by this file.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys

from qa_i61_b42_studio_x11 import audit_embedded_fonts

try:
    from PIL import Image
except ImportError:
    Image = None

MARKER = "% SCI_NATIVE_TYPED Привет α".encode("utf-8")
STAGES = {
    "opened": "original", "typed": "typed", "draft": "typed",
    "applied": "applied", "undo-inspector": "typed",
    "undo-typing": "original", "reopened": "original", "built": "original",
}
STAGE_ORDER = tuple(STAGES)
TARGET_SCREEN = (1366, 768)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha(path: Path) -> str:
    return digest(path.read_bytes())


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def command(*argv: str, cwd: Path | None = None) -> str:
    result = subprocess.run(argv, cwd=cwd, capture_output=True, timeout=30, check=False)
    if result.returncode:
        raise ValueError(f"{argv[0]} exit {result.returncode}: "
                         + result.stderr.decode("utf-8", "replace")[-1000:])
    return result.stdout.decode("utf-8", "strict")


def screen_size(value: str) -> tuple[int, int]:
    try:
        width, height = (int(part) for part in value.lower().split("x"))
        if not (1 <= width <= 32768 and 1 <= height <= 32768):
            raise ValueError()
    except (TypeError, ValueError):
        raise argparse.ArgumentTypeError("Expected positive WIDTHxHEIGHT, e.g. 1366x768") from None
    return width, height


def checked_size(value, detail: str) -> tuple[int, int]:
    if (not isinstance(value, (list, tuple)) or len(value) != 2
            or any(type(number) is not int or number < 1 or number > 32768 for number in value)):
        raise ValueError("Invalid " + detail)
    return tuple(value)


def original_image_size(path: Path) -> tuple[int, int]:
    """Inspect original bytes; decode when existing Pillow is available. Never convert."""
    data = path.read_bytes()
    suffix = path.suffix.lower()
    if data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR" and len(data) >= 33:
        if suffix != ".png":
            raise ValueError("Original PNG suffix does not match header")
        dimensions = struct.unpack(">II", data[16:24])
        image_format = "PNG"
    elif data[:2] == b"\xff\xd8" and suffix in (".jpg", ".jpeg"):
        dimensions = None
        offset = 2
        # JPEG SOF stores dimensions before compressed image data. Parsing is
        # retained for environments without Pillow; current native runtime has it.
        while offset + 4 <= len(data):
            if data[offset] != 0xFF:
                break
            while offset < len(data) and data[offset] == 0xFF:
                offset += 1
            if offset >= len(data):
                break
            marker = data[offset]
            offset += 1
            if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
                continue
            if marker in (0xDA, 0xD9) or offset + 2 > len(data):
                break
            length = int.from_bytes(data[offset:offset + 2], "big")
            if length < 2 or offset + length > len(data):
                break
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                          0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF) and length >= 7:
                height, width = struct.unpack(">HH", data[offset + 3:offset + 7])
                dimensions = (width, height)
                break
            offset += length
        if dimensions is None:
            raise ValueError("Cannot read original JPEG dimensions: " + str(path))
        image_format = "JPEG"
    else:
        raise ValueError("Expected original PNG/JPEG with matching suffix: " + str(path))
    checked_size(dimensions, "original screenshot dimensions")
    if Image is not None:
        try:
            with Image.open(path) as opened:
                if opened.format != image_format or opened.size != dimensions:
                    raise ValueError("Original image decoder/header disagreement")
                opened.verify()
            with Image.open(path) as opened:
                opened.load()
        except Exception as error:
            raise ValueError("Cannot decode original screenshot: " + str(path)) from error
    return dimensions


def normalized_clipboard(data: bytes) -> bytes:
    # Clipboard transports may map CRLF to LF. Disk snapshots remain byte-exact.
    return data.replace(b"\r\n", b"\n")


def aware_timestamp(value: str, stage: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Invalid captured timestamp: {stage}") from error
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError(f"Captured timestamp must include a timezone: {stage}")
    return parsed.astimezone(timezone.utc)


def prepare(args) -> None:
    out = args.out.resolve()
    if out.exists() and any(out.iterdir()):
        raise ValueError("prepare requires an empty evidence directory")
    fixture = args.fixture.resolve(strict=True)
    screen = checked_size(getattr(args, "screen_size", TARGET_SCREEN), "declared screen size")
    client = getattr(args, "client_size", None)
    if client is not None:
        client = checked_size(client, "declared client size")
        if client[0] > screen[0] or client[1] > screen[1]:
            raise ValueError("Declared client size exceeds declared screen")
    raw = fixture.read_bytes()
    original = raw.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
    if original.count(b"samples=150") != 1 or MARKER in original:
        raise ValueError("Fixture must have exactly one samples=150 and no typing marker")
    preservation = ("% SCI native preservation: Привет α. Keep verbatim.\r\n"
                    "\\newcommand{\\SciNativePreserved}{неизвестно}\r\n").encode("utf-8")
    if original.count(b"\\begin{document}") != 1:
        raise ValueError("Expected a complete fixture with one document environment")
    original = original.replace(b"\\begin{document}", preservation + b"\\begin{document}", 1)
    for name in ("inputs", "expected", "observed"):
        (out / name).mkdir(parents=True, exist_ok=True)
    (out / "inputs/compact-pgfplots.tex").write_bytes(original)
    expectations = {"original": original, "typed": original + MARKER,
                    "applied": original.replace(b"samples=150", b"samples=151") + MARKER}
    for name, contents in expectations.items():
        (out / "expected" / (name + ".tex")).write_bytes(contents)
    (out / "inputs/typing-marker.txt").write_bytes(MARKER)
    manifest = {
        "schema_version": 1, "kind": "SCI_COMPACT_NATIVE_ARTIFACT_AUDIT",
        "created_utc": now(), "status": "NOT_RUN", "native_acceptance": "NOT_RUN",
        "fixture_path": str(fixture), "fixture_sha256": digest(raw),
        "fixture_scope": "Named fixture derivative only; no SCI142/SC3/AT4 aggregate acceptance",
        "input_transform": "Explicit INPUT: CRLF line endings plus inert Unicode comment and unused macro definition",
        "expected_sha256": {name: digest(value) for name, value in expectations.items()},
        "stages": list(STAGE_ORDER), "patch": "Unique literal samples=150 to samples=151",
        "typing_marker_utf8": MARKER.decode("utf-8"),
        "screen_size": screen, "target_screen_size": TARGET_SCREEN,
        "matches_target_screen": screen == TARGET_SCREEN,
        "client_size_operator_reported": client,
        "physical_win10": "NOT_RUN", "mac_m1_m4": "NOT_RUN",
    }
    write_json(out / "manifest.json", manifest)
    print(json.dumps({"input": str(out / "inputs/compact-pgfplots.tex"),
                      "typing_marker": str(out / "inputs/typing-marker.txt"),
                      "stages": STAGE_ORDER}, ensure_ascii=False))


def record(args) -> None:
    out = args.out.resolve(strict=True)
    manifest = read_json(out / "manifest.json")
    stage = args.stage
    index = STAGE_ORDER.index(stage)
    directory = out / "observed" / stage
    if directory.exists():
        raise ValueError("Original stage already recorded; use a fresh run instead of replacing evidence")
    if index and not (out / "observed" / STAGE_ORDER[index - 1] / "stage.json").is_file():
        raise ValueError("Record stages in order: " + ", ".join(STAGE_ORDER))
    source = args.source.resolve(strict=True)
    for reserved in (out / "inputs", out / "expected", out / "observed"):
        if source.is_relative_to(reserved):
            raise ValueError("Observed source must be the separate live GUI document, never an input/expected/snapshot")
    actual = source.read_bytes()
    screenshot = args.screenshot.resolve(strict=True)
    visible = args.visible_source.resolve(strict=True) if args.visible_source else None
    # Retain the provided originals BEFORE judging their consistency. In
    # particular, a failed Open clipboard is useful evidence of the failure.
    directory.mkdir()
    (directory / "saved-source.tex").write_bytes(actual)
    screenshot_file = "screenshot.original" + screenshot.suffix
    retained_screenshot = directory / screenshot_file
    shutil.copyfile(screenshot, retained_screenshot)
    if visible:
        shutil.copyfile(visible, directory / "visible-source.txt")
    failures = []
    expected = out / "expected" / (STAGES[stage] + ".tex")
    if sha(expected) != manifest["expected_sha256"][STAGES[stage]]:
        failures.append("Expected fixture changed after preparation")
    matches_expected = actual == expected.read_bytes()
    if not matches_expected:
        failures.append(f"Saved source differs from {STAGES[stage]}")
    editor_matches = (normalized_clipboard((directory / "visible-source.txt").read_bytes())
                      == normalized_clipboard(actual)) if visible else None
    if visible and not editor_matches:
        failures.append("Captured source-editor text differs from saved source")
    if stage in ("opened", "reopened") and visible is None:
        failures.append("Open/reopen require captured editor clipboard via --visible-source")
    size = None
    declared_screen = checked_size(manifest.get("screen_size"), "manifest screen size")
    client = getattr(args, "client_size", None) or manifest.get("client_size_operator_reported")
    if client is not None:
        client = checked_size(client, "operator client size")
        if client[0] > declared_screen[0] or client[1] > declared_screen[1]:
            failures.append("Operator client size exceeds declared screen")
    try:
        size = original_image_size(retained_screenshot)
        if size != declared_screen:
            failures.append(f"Expected declared screen {declared_screen}, got original image {size}")
    except ValueError as error:
        failures.append(str(error))
    metadata = {
        "stage": stage, "captured_utc": now(), "action_description": args.action,
        "expected_source_match": matches_expected,
        "editor_source_matches": editor_matches, "failure_reasons": failures,
        "native_action_claim": "OPERATOR_SUPPLIED_REQUIRES_INDEPENDENT_REVIEW",
        "live_source_path": str(source), "live_source_mtime_ns": source.stat().st_mtime_ns,
        "source_sha256": digest(actual), "screenshot_origin_path": str(screenshot),
        "screenshot_file": screenshot_file,
        "screenshot_sha256": sha(retained_screenshot), "screenshot_size": size,
        "client_size_operator_reported": client,
        "visible_source_sha256": sha(directory / "visible-source.txt") if visible else None,
    }
    write_json(directory / "stage.json", metadata)
    print(json.dumps(metadata, ensure_ascii=False))
    if failures:
        raise ValueError(f"{stage}: {'; '.join(failures)}; original failure snapshot preserved")


def validate(args) -> None:
    out = args.out.resolve(strict=True)
    report_path = out / "audit-report.json"
    if report_path.exists():
        raise ValueError("Audit report already exists; original evidence is append-only")
    report = {"schema_version": 1, "kind": "SCI_COMPACT_ARTIFACT_VALIDATION",
              "created_utc": now(), "status": "FAIL", "native_acceptance": "NOT_VERIFIED",
              "pdf_to_source_binding": "REQUIRES_INDEPENDENT_REVIEW",
              "manual_image_pdf_review": "NOT_RUN", "physical_win10": "NOT_RUN", "mac_m1_m4": "NOT_RUN"}
    try:
        manifest = read_json(out / "manifest.json")
        if manifest.get("stages") != list(STAGE_ORDER):
            raise ValueError("Manifest stages must exactly match the allowed stage order")
        declared_screen = checked_size(manifest.get("screen_size"), "manifest screen size")
        if (manifest.get("target_screen_size") != list(TARGET_SCREEN)
                or manifest.get("matches_target_screen") is not (declared_screen == TARGET_SCREEN)):
            raise ValueError("Manifest target-screen scope is inconsistent")
        report.update({"screen_size": declared_screen, "target_screen_size": TARGET_SCREEN,
                       "matches_target_screen": declared_screen == TARGET_SCREEN,
                       "client_geometry_source": "OPERATOR_REPORTED_REQUIRES_INDEPENDENT_REVIEW"})
        expected = {name: (out / "expected" / (name + ".tex")).read_bytes()
                    for name in ("original", "typed", "applied")}
        for name, value in expected.items():
            if digest(value) != manifest["expected_sha256"][name]:
                raise ValueError("Expected bytes were modified: " + name)
        if expected["typed"] != expected["original"] + MARKER or expected["applied"] != expected["typed"].replace(b"samples=150", b"samples=151", 1):
            raise ValueError("Unexpected expectation model")
        stage_reports = []
        last_time = None
        live_source_path = None
        for stage, expectation in STAGES.items():
            directory = out / "observed" / stage
            metadata = read_json(directory / "stage.json")
            if metadata.get("stage") != stage:
                raise ValueError("Stage metadata identity differs from folder: " + stage)
            if metadata.get("expected_source_match") is not True:
                raise ValueError("Stage does not affirm expected source match: " + stage)
            if metadata.get("failure_reasons") != []:
                raise ValueError("Stage records failures or missing failure metadata: " + stage)
            candidate_path = metadata.get("live_source_path")
            if (not isinstance(candidate_path, str) or not Path(candidate_path).is_absolute()
                    or str(Path(candidate_path).resolve()) != candidate_path):
                raise ValueError("Stage live source path must be canonical and absolute: " + stage)
            if live_source_path is None:
                live_source_path = candidate_path
            elif candidate_path != live_source_path:
                raise ValueError("Mixed live source documents across stages: " + stage)
            actual = (directory / "saved-source.tex").read_bytes()
            if actual != expected[expectation] or digest(actual) != metadata["source_sha256"]:
                raise ValueError("Observed source mismatch: " + stage)
            filename = metadata.get("screenshot_file")
            if not isinstance(filename, str) or filename.lower() not in ("screenshot.original.png", "screenshot.original.jpg", "screenshot.original.jpeg"):
                raise ValueError("Invalid original screenshot filename: " + stage)
            screenshot_path = directory / filename
            if (sha(screenshot_path) != metadata["screenshot_sha256"]
                    or original_image_size(screenshot_path) != declared_screen
                    or metadata.get("screenshot_size") != list(declared_screen)):
                raise ValueError("Screenshot mismatch: " + stage)
            client = metadata.get("client_size_operator_reported")
            if client is not None:
                client = checked_size(client, "operator client size: " + stage)
                if client[0] > declared_screen[0] or client[1] > declared_screen[1]:
                    raise ValueError("Operator client size exceeds declared screen: " + stage)
            captured = aware_timestamp(metadata.get("captured_utc"), stage)
            if last_time is not None and captured < last_time:
                raise ValueError("Stage timestamps are not monotonic: " + stage)
            last_time = captured
            has_visible = metadata.get("visible_source_sha256") is not None
            if stage in ("opened", "reopened") or has_visible:
                if metadata.get("editor_source_matches") is not True:
                    raise ValueError("Stage does not affirm visible editor source match: " + stage)
                visible = directory / "visible-source.txt"
                if sha(visible) != metadata["visible_source_sha256"] or normalized_clipboard(visible.read_bytes()) != normalized_clipboard(actual):
                    raise ValueError("Visible editor mismatch: " + stage)
            elif metadata.get("editor_source_matches") is not None:
                raise ValueError("Stage claims editor source match without captured text: " + stage)
            stage_reports.append(metadata)
        root = args.source_root.resolve(strict=True)
        head = command("git", "rev-parse", "HEAD", cwd=root).strip()
        tree = command("git", "rev-parse", "HEAD:crates/tikzarium-app/src", cwd=root).strip()
        protected = ["crates", "extensions", "Cargo.toml", "Cargo.lock"]
        dirty = command("git", "status", "--porcelain", "--", *protected, cwd=root)
        if dirty.strip():
            raise ValueError("Build source must be committed and unchanged: " + dirty)
        app = args.app.resolve(strict=True)
        build = read_json(args.build_provenance.resolve(strict=True))
        for key, value in {"source_head_sha": head, "app_tree_sha": tree, "app_sha256": sha(app)}.items():
            if build.get(key) != value:
                raise ValueError("Build provenance mismatch: " + key)
        if not build.get("build_command") or build.get("production_binary") is not True or app.name == "tikzarium-qa-control":
            raise ValueError("Require explicit production binary build command provenance")
        engine_version = command(str(args.engine.resolve(strict=True)), "--version")
        if "XeTeX" not in engine_version:
            raise ValueError("External engine did not identify itself as XeTeX")
        destination = out / "export"
        destination.mkdir()
        pdf = destination / "compact-pgfplots.pdf"
        shutil.copyfile(args.pdf.resolve(strict=True), pdf)
        log = destination / "xelatex.log"
        shutil.copyfile(args.xelatex_log.resolve(strict=True), log)
        log_text = log.read_text(encoding="utf-8", errors="replace")
        if "XeTeX" not in log_text or "Output written on" not in log_text or "(1 page" not in log_text:
            raise ValueError("Need original GUI XeLaTeX output log with successful one-page output")
        metadata = command("pdfinfo", str(pdf))
        if not any(line.split(":", 1)[0] == "Pages" and line.split(":", 1)[1].strip() == "1" for line in metadata.splitlines() if ":" in line):
            raise ValueError("Expected one-page GUI-export PDF")
        fonts = command("pdffonts", str(pdf))
        font_rows = audit_embedded_fonts(fonts)
        text = command("pdftotext", "-enc", "UTF-8", str(pdf), "-")
        for required_text in args.pdf_text:
            if required_text not in text:
                raise ValueError("Required figure text missing from GUI-export PDF: " + required_text)
        command("pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-png", "-r", "120", str(pdf), str(destination / "exact-pdf"))
        for name, value in {"pdfinfo.txt": metadata, "pdffonts.txt": fonts, "pdftotext.txt": text, "engine-version.txt": engine_version}.items():
            (destination / name).write_text(value, encoding="utf-8")
        shutil.copyfile(args.action_log.resolve(strict=True), destination / "native-actions.log")
        if (destination / "native-actions.log").stat().st_size == 0:
            raise ValueError("Require original nonempty operator native-action record")
        shutil.copyfile(args.build_provenance.resolve(strict=True), destination / "build-provenance.json")
        report.update({"status": "ARTIFACT_CONSISTENT_REQUIRES_NATIVE_REVIEW", "stages": stage_reports,
                       "source_head_sha": head, "app_tree_sha": tree, "app_sha256": sha(app),
                       "binary_to_source_binding": "OPERATOR_BUILD_RECORD_REQUIRES_REVIEW",
                       "built_source_sha256": stage_reports[-1]["source_sha256"],
                       "pdf_sha256": sha(pdf), "embedded_font_count": len(font_rows)})
    except Exception as error:
        report["error"] = f"{type(error).__name__}: {error}"
    report["files"] = {str(path.relative_to(out)): sha(path) for path in sorted(out.rglob("*"))
                       if path.is_file() and path != report_path}
    write_json(report_path, report)
    print(json.dumps(report, ensure_ascii=False))
    if report["status"] == "FAIL":
        raise ValueError("Artifact validation failed; see " + str(report_path))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    prepare_parser = commands.add_parser("prepare", help="Create explicit input and expectations only")
    prepare_parser.add_argument("--out", type=Path, required=True)
    prepare_parser.add_argument("--fixture", type=Path, default=Path(__file__).resolve().parents[1] / "roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-001/figure.tex")
    prepare_parser.add_argument("--screen-size", type=screen_size, default=TARGET_SCREEN,
                                help="Actual full-desktop image size; default 1366x768")
    prepare_parser.add_argument("--client-size", type=screen_size,
                                help="Optional operator-reported actual app client size")
    record_parser = commands.add_parser("record", help="Copy actual native GUI saved source and screenshot")
    record_parser.add_argument("--out", type=Path, required=True)
    record_parser.add_argument("--stage", choices=STAGE_ORDER, required=True)
    record_parser.add_argument("--source", type=Path, required=True)
    record_parser.add_argument("--screenshot", type=Path, required=True)
    record_parser.add_argument("--visible-source", type=Path)
    record_parser.add_argument("--client-size", type=screen_size,
                               help="Optional operator-reported actual app client size at this stage")
    record_parser.add_argument("--action", required=True, help="Truthful actions just performed in production GUI")
    validate_parser = commands.add_parser("validate", help="Audit artifacts without asserting native acceptance")
    for name in ("out", "source-root", "app", "build-provenance", "engine", "pdf", "xelatex-log", "action-log"):
        validate_parser.add_argument("--" + name, type=Path, required=True)
    validate_parser.add_argument("--pdf-text", action="append", required=True,
                                 help="Expected rendered text, repeatable; use Greek/math for SV001, not its unused Cyrillic macro")
    args = parser.parse_args()
    try:
        {"prepare": prepare, "record": record, "validate": validate}[args.command](args)
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
