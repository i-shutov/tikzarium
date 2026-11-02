#!/usr/bin/env python3
"""I57: four separate real X11 egui library transactions, not UNIT_EVENT.

Reuse the already independently accepted I53 GUI driver without copying its
source or changing production code. Each library gets a fresh process, document,
X11 screenshots, in-app Save/Open/Undo and external XeLaTeX PDF. Coordinates are
exact app-tree-specific and MUST be visually reviewed before acceptance.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys

LIBRARIES = ("arrows.meta", "calc", "fit", "positioning")
POSITIONING_QUERY = "смещение и якоря"
PROFILE_KEYS = frozenset(("library", "connect", "disconnect"))


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def validate_matrix(matrix: dict, tree: str) -> None:
    if matrix.get("schema") != 1 or not tree or matrix.get("tree") != tree:
        raise ValueError("I57 matrix must match exact verified production app tree")
    rows = matrix.get("libraries")
    if not isinstance(rows, dict) or set(rows) != set(LIBRARIES):
        raise ValueError("I57 must cover exactly the four shared-C libraries")
    for name in LIBRARIES:
        changes = rows[name]
        if not isinstance(changes, dict) or set(changes) != PROFILE_KEYS:
            raise ValueError(f"Unreviewed target keys for {name}")
        for key, xy in changes.items():
            if (not isinstance(xy, list) or len(xy) != 2
                or any(type(n) is not int for n in xy)
                or not (1068 <= xy[0] < 1366 and 100 <= xy[1] < 740)):
                raise ValueError(f"Invalid native X11 {name}/{key} coordinate")
    if len({tuple(rows[name]["library"]) for name in LIBRARIES}) != 4:
        raise ValueError("Distinct four collapsed library rows required")


def combined_profile(base: dict, matrix: dict, name: str) -> dict:
    if name not in LIBRARIES:
        raise ValueError("Unknown C library")
    if base.get("tree") != matrix.get("tree"):
        raise ValueError("Base I53 profile and I57 exact app tree differ")
    result = dict(base)
    result.update(matrix["libraries"][name])
    result["i57_library"] = name
    return result


def declaration(name: str) -> bytes:
    if name not in LIBRARIES:
        raise ValueError("Not a bundled C library")
    return ("\\usetikzlibrary{" + name + "}\n").encode("ascii")


def run_matrix(app: Path, out: Path, base_profile: Path, matrix_path: Path) -> int:
    tree = os.environ.get("TIKZARIUM_APP_TREE_SHA", "")
    matrix = json.loads(matrix_path.read_text(encoding="utf-8"))
    base = json.loads(base_profile.read_text(encoding="utf-8"))
    validate_matrix(matrix, tree)
    if base.get("tree") != tree:
        raise ValueError("Current I53 reviewed GUI coordinates belong to another app tree")
    if out.exists() and any(out.iterdir()):
        raise ValueError("I57 output directory must start empty")
    out.mkdir(parents=True, exist_ok=True)
    driver_path = Path(__file__).with_name("qa_i53_live_libraries_x11.py")
    if not driver_path.is_file():
        raise FileNotFoundError("Accepted I53 GUI driver unavailable")
    source_head = os.environ.get("TIKZARIUM_SOURCE_SHA", "")
    manifest = {
        "status": "NOT_RUN",
        "source_head_sha": source_head,
        "app_tree": tree,
        "gui": "four distinct real X11 egui processes",
        "visual_review": "NOT_RUN",
        "external_engine": "Linux TeX Live XeLaTeX, not MiKTeX",
        "physical_win10_miktex": "NOT_RUN",
        "physical_mac_arm_xelatex": "NOT_RUN",
        "results": {name: {"status": "NOT_RUN"} for name in LIBRARIES},
    }
    failures = []
    try:
        for name in LIBRARIES:
            safe = name.replace(".", "-")
            derived = out / (safe + "-profile.json")
            derived.write_text(json.dumps(combined_profile(base, matrix, name),
                                          ensure_ascii=False, indent=2) + "\n",
                               encoding="utf-8")
            evidence = out / safe
            # Each import creates its own module namespace; the source template
            # remains the single I53 fixture. Never alter production C catalogue.
            spec = importlib.util.spec_from_file_location("i57_i53_" + safe, driver_path)
            if spec is None or spec.loader is None:
                raise RuntimeError("Cannot load validated I53 test driver")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.DECL = declaration(name)
            module.HELP_QUERY = (POSITIONING_QUERY if name == "positioning"
                                 else "tikz.library." + name)
            old_argv = sys.argv
            try:
                sys.argv = [
                    str(driver_path), "--app", str(app), "--out", str(evidence),
                    "--profile", str(derived),
                ]
                rc = module.main()
            finally:
                sys.argv = old_argv
            report_path = evidence / "i53-report.json"
            if not report_path.is_file():
                raise RuntimeError(f"{name}: real GUI did not emit report")
            report = json.loads(report_path.read_text(encoding="utf-8"))
            result = manifest["results"][name]
            result.update({
                "status": report.get("status", "FAIL"),
                "report_sha256": sha(report_path.read_bytes()),
                "pdf_sha256": report.get("pdf_sha256"),
                "screenshots": len(list(evidence.glob("*.png"))),
                "help": report.get("help", "NOT_RUN"),
            })
            if rc or not report["status"].startswith("PASS_"):
                result["error"] = report.get("error", "GUI result rejected")
                failures.append(f"{name}: {result['error']}")
                continue
            doc = evidence / "library-connect.tex"
            if not module.exact_patch(module.SRC, doc.read_bytes()):
                raise RuntimeError(f"{name}: saved GUI Open/Undo source differs from exact C import")
            if report["head"] != source_head or report["tree"] != tree:
                raise RuntimeError(f"{name}: GUI binary/runner source provenance mismatch")
            if not (evidence / "library-connect.pdf").read_bytes().startswith(b"%PDF-"):
                raise RuntimeError(f"{name}: external generated PDF missing")
            result["status"] = "PASS_AUTOMATED_X11_MANUAL_REVIEW_PENDING"
        if failures:
            raise RuntimeError("Actual GUI library failures: " + " | ".join(failures))
        manifest["status"] = "PASS_AUTOMATED_X11_MANUAL_REVIEW_PENDING"
        return 0
    except Exception as error:
        manifest["status"] = "FAIL"
        manifest["error"] = f"{type(error).__name__}: {error}"
        raise
    finally:
        (out / "i57-matrix-report.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    for flag in ("app", "out", "base-profile", "matrix"):
        parser.add_argument("--" + flag, required=True, type=Path)
    args = parser.parse_args()
    return run_matrix(args.app, args.out, args.base_profile, args.matrix)


if __name__ == "__main__":
    raise SystemExit(main())
