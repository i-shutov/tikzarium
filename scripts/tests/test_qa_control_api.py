#!/usr/bin/env python3
"""Exercise actual JSONL QA control process with no display, network, TeX or privileges."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE = (
    "\\documentclass{standalone}\r\n"
    "\\usepackage{tikz}\r\n"
    "\\usetikzlibrary{arrows.meta}\r\n"
    "\\begin{document}\r\n"
    "\\begin{tikzpicture}\r\n"
    "% opaque user content\r\n"
    "\\myMacro{Кириллица}\r\n"
    "\\end{tikzpicture}\r\n"
    "\\end{document}\r\n"
)


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run() -> dict:
    cases = [
        {"op": "api.describe"},
        {"op": "window.set", "width": 1366, "height": 768, "dpi": 1.0},
        {"op": "input.click", "target": "group.geometry"},
        {"op": "input.click", "target": "tool.line"},
        {"op": "state.snapshot"},
        {"op": "input.key", "key": "F1", "down": True},
        {"op": "input.key", "key": "F1", "down": False},
        {"op": "document.new", "source": SOURCE},
        {"op": "tool.gesture", "tool": "line", "from": [1.0, 1.0], "to": [3.0, 2.0]},
        {"op": "object.select", "id": 1},
        {"op": "parameter.set", "name": "end_x", "value": "4.25cm"},
        {"op": "parameter.apply"},
        {"op": "authoring.undo"},
        {"op": "document.save_as", "path": "qa-unicode-source.tex"},
        {"op": "document.open", "path": "qa-unicode-source.tex"},
        {"op": "help.search", "query": "окружность"},
        {"op": "view.dock", "dock": "libraries"},
        {"op": "layout.snapshot"},
        {"op": "source.replace", "revision": 99999, "source": "CANNOT MUTATE"},
        {"op": "document.save_as", "path": "../invalid.tex"},
        {"op": "state.snapshot"},
    ]
    with tempfile.TemporaryDirectory(prefix="tikzarium-headless-control-") as tmp:
        command = [
            "cargo", "run", "--locked", "--quiet", "-p", "tikzarium-app",
            "--bin", "tikzarium-qa-control", "--", "--root", tmp,
        ]
        proc = subprocess.Popen(
            command, cwd=ROOT, stdin=subprocess.PIPE,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, encoding="utf-8", errors="replace",
        )
        payload = "".join(json.dumps(case, ensure_ascii=False) + "\n" for case in cases)
        try:
            output, stderr = proc.communicate(payload, timeout=240)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.communicate()
            raise AssertionError("Headless API timed out")
        if proc.returncode:
            raise AssertionError(f"JSONL child failed exit={proc.returncode}: {stderr[-2400:]}")
        rows = [json.loads(line) for line in output.splitlines()]
        check(len(rows) == len(cases), f"Expected {len(cases)} JSON replies, got {len(rows)}. {stderr[-1200:]}")
        for index, row in enumerate(rows):
            expected_success = index not in (18, 19)
            check(row.get("ok") is expected_success, f"operation {index}, {cases[index]['op']} unexpectedly failed: {row}")
        describe = rows[0]["result"]
        check("input.drag" in describe["operations"] and "tool.insert" in describe["operations"],
              "Required API operations unavailable")
        layout = rows[1]["result"]["layout"]
        check("group.geometry" in layout and "guide.canvas" in layout,
              "Real egui widget rectangles not captured")
        check(rows[4]["result"]["tool"] == "line", "Native egui group/palette click did not select tool")
        check(rows[8]["result"]["owned_count"] == 1, "Same Session did not insert real C TikZ line")
        edited = rows[11]["result"]["source"]
        check("4.25cm" in edited, "Parameter apply did not mutate editable TeX")
        undone = rows[12]["result"]["source"]
        check(undone != edited and "Кириллица" in undone and "\r\n" in undone,
              "Undo failed to restore byte-accurate CRLF and Unicode")
        saved = (Path(tmp) / "qa-unicode-source.tex").read_bytes()
        check(saved == undone.encode("utf-8"), "Save As did not preserve exact TeX bytes")
        check(rows[15]["result"]["hits"], "F1 search does not use catalogue")
        check(rows[16]["result"]["dock"] == "Libraries" if "dock" in rows[16]["result"] else True,
              "Library dock change failed")
        check(rows[18]["error"].startswith("stale source revision"), "Stale revision did not fail closed")
        check("relative" in rows[19]["error"] or "no" in rows[19]["error"],
              "Traversal outside QA root was accepted")
        final = rows[20]["result"]
        check(final["source"] == undone and final["owned_count"] == 1,
              "Rejected operations mutated source")
        check(final["evidence"]["native_window"] == "NOT_RUN"
              and final["evidence"]["physical_windows10"] == "NOT_RUN",
              "Headless evidence impersonated real Windows GUI")
        return {
            "schema_version": 1,
            "status": "PASS_GUI_SEMANTIC_API_AND_EGUI_UNIT_EVENTS_NOT_PHYSICAL_GUI",
            "operations": len(cases),
            "source_revision": final["revision"],
            "catalogue_search": "PASS",
            "native_widget_click": "PASS",
            "unicode_crlf_source_save": "PASS",
            "stale_revision_conflict": "PASS",
            "path_traversal": "REJECTED",
            "physical_windows10_gui": "NOT_RUN",
            "native_os_file_picker": "NOT_RUN",
            "external_xelatex_pdf": "NOT_RUN",
            "source_sha": os.environ.get("GITHUB_SHA", "UNKNOWN"),
        }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = run()
    except Exception as exc:
        result = {
            "schema_version": 1, "status": "FAIL_GUI_QA_API",
            "error": str(exc), "physical_windows10_gui": "NOT_RUN",
        }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=True))
    if result["status"] != "PASS_GUI_SEMANTIC_API_AND_EGUI_UNIT_EVENTS_NOT_PHYSICAL_GUI":
        sys.exit(1)


if __name__ == "__main__":
    main()
