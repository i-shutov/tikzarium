#!/usr/bin/env python3
"""Full declared GUI QA API v0 coverage via real offline JSONL child and egui events."""
from __future__ import annotations

import argparse
import hashlib
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
    "% opaque author text\r\n"
    "\\myMacro{Кириллица}\r\n"
    "\\end{tikzpicture}\r\n"
    "\\end{document}\r\n"
)


def run() -> dict:
    cases = []
    def add(op, *, success=True, **kwargs):
        cases.append(({"op": op, **kwargs}, success))

    add("api.describe")
    add("window.set", width=1366, height=768, dpi=1.0)
    add("frame.run")
    add("layout.snapshot")
    add("input.click", target="group.geometry")
    add("input.click", target="tool.line")
    add("state.snapshot")
    add("input.key", key="F1", down=True)
    add("input.key", key="F1", down=False)
    add("state.snapshot")
    add("input.pointer", pos=[2, 2], down=True)
    add("input.pointer", pos=[2, 2], down=False)
    add("document.new", source=SOURCE)
    add("tool.select", tool="line")
    add("input.drag", **{"from": [635, 280], "to": [700, 355]})
    add("state.snapshot")
    add("tool.insert", tool="line")
    for tool in ("arrow", "rectangle", "circle", "node", "cubic"):
        add("tool.gesture", tool=tool, **{"from": [1.0, 1.0], "to": [3.0, 2.0]})
    add("object.select", id=5)  # circle, following guide+insert+arrow+rectangle
    add("parameter.set", name="radius", value="0.8cm")
    add("parameter.apply")
    add("authoring.undo")
    add("library.connect", name="positioning")
    add("library.disconnect", name="positioning")
    add("help.search", query="ОКРУЖНОСТЬ")
    add("view.dock", dock="libraries")
    add("state.snapshot")
    add("window.set", width=1366, height=768, dpi=2.0)
    add("layout.snapshot")
    add("window.set", width=850, height=560, dpi=1.0)
    add("state.snapshot")
    add("document.save_as", path="qa-unicode.tex")
    add("document.save")
    add("document.open", path="qa-unicode.tex")
    add("source.replace", revision=0, source=SOURCE + "% ручная правка\r\n")
    add("source.replace", success=False, revision=0, source="STALE")
    add("authoring.undo", success=False)
    add("document.save_as", success=False, path="occupied.tex")
    add("document.save_as", success=False, path="../outside.tex")
    add("document.open", success=False, path="../outside.tex")
    add("tool.select", success=False, tool="missing")
    add("input.click", success=False, target="widget.missing")
    add("input.key", success=False, key="MissingKey", down=True)
    add("view.dock", success=False, dock="missing")
    add("window.set", success=False, width=10, height=10, dpi=1.0)
    add("input.text", text="")
    add("state.snapshot")
    add("nonexistent.operation", success=False)

    with tempfile.TemporaryDirectory(prefix="tikzarium-api-matrix-") as root:
        directory = Path(root)
        (directory / "occupied.tex").write_bytes(b"UNTOUCHED")
        child = subprocess.Popen(
            ["cargo", "run", "--locked", "--quiet", "-p", "tikzarium-app",
             "--bin", "tikzarium-qa-control", "--", "--root", root],
            cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace",
        )
        requests = [json.dumps(request, ensure_ascii=False) for request, _ in cases]
        requests += ["{this is not JSON}", " " * 1_048_580]
        try:
            stdout, stderr = child.communicate("\n".join(requests) + "\n", timeout=260)
        except subprocess.TimeoutExpired as exc:
            child.kill()
            child.communicate()
            raise AssertionError("Real headless QA API exceeded timeout") from exc
        if child.returncode != 0:
            raise AssertionError(f"QA process exited {child.returncode}: {stderr[-1000:]}")
        replies = [json.loads(line) for line in stdout.splitlines()]
        if len(replies) != len(requests):
            raise AssertionError(f"Expected {len(requests)} API replies, got {len(replies)}")
        results = []
        for index, (request, expected) in enumerate(cases):
            row = replies[index]
            if row.get("ok") is not expected:
                raise AssertionError(f"Case {index} ({request['op']}) returned {row}")
            if expected and not isinstance(row.get("result"), dict):
                raise AssertionError(f"Case {index} missing structured result")
            if not expected and not row.get("error"):
                raise AssertionError(f"Case {index} missing rejection reason")
            results.append(request["op"])
        if replies[-2].get("ok") is not False or replies[-1].get("ok") is not False:
            raise AssertionError("Malformed and over-budget JSONL were accepted")
        manifest = replies[0]["result"]["operations"]
        advertised = set(manifest)
        exercised = set(results)
        if advertised - exercised:
            raise AssertionError(f"Advertised operations not tested: {sorted(advertised - exercised)}")
        if exercised - advertised != {"nonexistent.operation"}:
            raise AssertionError("Unexpected unadvertised operations in coverage")
        def check(label: str, condition: bool) -> None:
            if not condition:
                raise AssertionError(f"FAIL: {label}")
            passed.append(label)

        passed: list[str] = []
        check("GUI group/palette hit route", replies[6]["result"]["tool"] == "line")
        check("F1 actual key handling", replies[9]["result"]["help"] != replies[6]["result"]["help"])
        check("real pointer drag inserts one C-owned primitive",
              replies[15]["result"]["owned_count"] == 1)
        check("direct C generator second insertion", replies[16]["result"]["owned_count"] == 2)
        check("all six native tools create owned source", replies[21]["result"]["owned_count"] == 7)
        check("inspector modifies selected circle", "radius=0.8cm" in replies[24]["result"]["source"])
        check("undo restores exact source", replies[25]["result"]["source"]
              != replies[24]["result"]["source"])
        check("library connect/disconnect preserved other source",
              "positioning" in replies[26]["result"]["source"]
              and "positioning" not in replies[27]["result"]["source"])
        check("Russian F1 uses C catalogue",
              any(i.get("id") == "tikz.circle" for i in replies[28]["result"]["hits"]))
        check("dock shows shared state", replies[30]["result"]["dock"] == "Libraries")
        check("200% DPI virtual geometry", "guide.canvas" in replies[32]["result"])
        check("850x560 virtual viewport", replies[34]["result"]["viewport"]
              == {"width": 850, "height": 560, "dpi": 1.0})
        tex = replies[35]["result"]["source"]
        check("Save/Open exact CRLF UTF-8", replies[37]["result"]["source"] == tex
              and (directory / "qa-unicode.tex").read_bytes() == tex.encode("utf-8"))
        check("optimistic source revision used", replies[38]["result"]["source"]
              == SOURCE + "% ручная правка\r\n")
        check("invalid operations preserve document",
              replies[50]["result"]["source"] == replies[38]["result"]["source"])
        check("unrelated file not overwritten",
              (directory / "occupied.tex").read_bytes() == b"UNTOUCHED")
        check("NO virtual GUI claimed as physical Windows",
              replies[50]["result"]["evidence"]["physical_windows10"] == "NOT_RUN"
              and replies[50]["result"]["evidence"]["external_xelatex_pdf"] == "NOT_RUN")
        check("all v0 API actions covered", advertised.issubset(exercised))
        final_sha = hashlib.sha256(replies[50]["result"]["source"].encode("utf-8")).hexdigest()
        return {
            "status": "PASS_ALL_DECLARED_GUI_API_V0_ACTIONS_UNIT_EVENT_NOT_PHYSICAL_GUI",
            "schema_version": 1, "api_actions": len(advertised),
            "tested_actions": len(advertised.intersection(exercised)),
            "requests": len(requests), "expected_rejections": sum(not expected for _, expected in cases) + 2,
            "checks": {label: "PASS" for label in passed},
            "document_sha256": final_sha,
            "source_sha": os.environ.get("TIKZARIUM_SOURCE_SHA",
                                         os.environ.get("GITHUB_SHA", "UNKNOWN")),
            "physical_windows10_gui": "NOT_RUN",
            "administrator_miktex_pdf": "NOT_RUN",
        }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", type=Path, required=True)
    arguments = parser.parse_args()
    try:
        result = run()
    except Exception as error:
        result = {"schema_version": 1, "status": "FAIL_GUI_API_AUTOMATED_COVERAGE",
                  "error": str(error), "physical_windows10_gui": "NOT_RUN"}
    arguments.report.parent.mkdir(parents=True, exist_ok=True)
    arguments.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n",
                                encoding="utf-8")
    print(json.dumps(result, ensure_ascii=True))
    if not result["status"].startswith("PASS_"):
        sys.exit(1)


if __name__ == "__main__":
    main()
