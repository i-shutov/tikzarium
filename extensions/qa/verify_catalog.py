#!/usr/bin/env python3
"""Fail-closed consistency gate for declarative extension metadata.

This checks a *static catalogue*, not the presence of TeX packages, a TeX
compile result or visual editing. It never executes or installs extensions.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
from pathlib import Path
import re
import sys
import tomllib

from run_smoke import NEGATIVE, SOURCES

COLUMNS = (
    "family", "manifest_id", "engine_requirement", "installation",
    "xelatex_build", "inspection", "visual_edit", "evidence",
)
MANIFEST_KEYS = frozenset({
    "schema_version", "id", "display_name", "version", "category", "engine",
    "requires_files", "visual_features", "notes",
})
REQUIRED_MANIFEST_KEYS = frozenset({
    "schema_version", "id", "display_name", "version", "category", "engine",
    "requires_files",
})
ID = re.compile(r"[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+\Z")
TEX_FILE = re.compile(r"[A-Za-z0-9_][A-Za-z0-9_.-]*\.(?:sty|cls|tex|def)\Z")
MAX_MATRIX_BYTES = 128 * 1024
MAX_MANIFEST_BYTES = 64 * 1024
MAX_MANIFESTS = 128


def read_regular(path: Path, limit: int) -> bytes:
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"missing, symlinked or non-regular input: {path}")
    if path.stat().st_size > limit:
        raise ValueError(f"oversized input: {path}")
    with path.open("rb") as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise ValueError(f"oversized input: {path}")
    return data


def manifest_from(path: Path) -> dict:
    try:
        data = tomllib.loads(read_regular(path, MAX_MANIFEST_BYTES).decode("utf-8"))
    except (UnicodeError, tomllib.TOMLDecodeError) as exc:
        raise ValueError(f"invalid UTF-8/TOML: {path.name}: {exc}") from exc
    if not isinstance(data, dict) or not REQUIRED_MANIFEST_KEYS <= data.keys() or data.keys() - MANIFEST_KEYS:
        raise ValueError(f"unknown or missing fields: {path.name}")
    if type(data["schema_version"]) is not int or data["schema_version"] != 1:
        raise ValueError(f"unsupported manifest schema: {path.name}")
    ident = data["id"]
    if not isinstance(ident, str) or len(ident) > 128 or not ID.fullmatch(ident) or any(part.endswith("-") for part in ident.split(".")):
        raise ValueError(f"invalid manifest id: {path.name}")
    if data["engine"] not in ("xelatex", "lualatex"):
        raise ValueError(f"unsupported engine: {ident}")
    if not isinstance(data["requires_files"], list) or not 1 <= len(data["requires_files"]) <= 32:
        raise ValueError(f"invalid requires_files: {ident}")
    requirements = data["requires_files"]
    if any(not isinstance(n, str) or len(n) > 128 or ".." in n or not TEX_FILE.fullmatch(n) or n.startswith("-") for n in requirements) or len(set(requirements)) != len(requirements):
        raise ValueError(f"unsafe or duplicate requirement: {ident}")
    # The current registry has no implemented source-safe visual adapters.
    if data.get("visual_features", []) != []:
        raise ValueError(f"unreviewed visual capability declaration: {ident}")
    return data


def audit(extensions: Path) -> dict:
    errors: list[str] = []
    if extensions.is_symlink() or not extensions.is_dir():
        return {"accepted": False, "errors": ["extension directory missing or symlinked"]}

    paths = sorted(extensions.glob("*.toml"))
    manifests: dict[str, dict] = {}
    if not paths or len(paths) > MAX_MANIFESTS:
        errors.append("manifest count outside 1..128")
    for path in paths[:MAX_MANIFESTS]:
        try:
            data = manifest_from(path)
            if data["id"] in manifests:
                raise ValueError(f"duplicate manifest ID: {data['id']}")
            manifests[data["id"]] = data
        except (OSError, ValueError, TypeError) as exc:
            errors.append(str(exc))

    rows: list[dict[str, str]] = []
    try:
        matrix = read_regular(extensions / "PACKAGE_MATRIX.csv", MAX_MATRIX_BYTES).decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(matrix, newline=""), strict=True)
        if reader.fieldnames != list(COLUMNS):
            raise ValueError("matrix column schema/order mismatch or duplicate headers")
        rows = list(reader)
        if not rows or len(rows) > 256:
            raise ValueError("matrix row count outside 1..256")
    except (OSError, UnicodeError, csv.Error, ValueError) as exc:
        errors.append(f"invalid package matrix: {exc}")
        rows = []

    by_id: dict[str, dict[str, str]] = {}
    families: set[str] = set()
    for position, row in enumerate(rows, start=2):
        label = f"matrix row {position}"
        if None in row or any(not isinstance(v, str) for v in row.values()):
            errors.append(f"{label}: malformed field count")
            continue
        family = row["family"]
        if not family or len(family) > 128 or "\n" in family or "\r" in family:
            errors.append(f"{label}: invalid family")
        elif family.casefold() in families:
            errors.append(f"{label}: duplicate family {family}")
        families.add(family.casefold())
        if not row["evidence"].strip() or len(row["evidence"]) > 1024:
            errors.append(f"{label}: missing or oversized evidence note")
        engine = row["engine_requirement"]
        if engine not in ("xelatex", "lualatex"):
            errors.append(f"{label}: invalid engine {engine}")
        if row["installation"] != "NOT_PROBED":
            errors.append(f"{label}: environment-agnostic matrix must not claim installation")
        expected_build = "INCOMPATIBLE_ENGINE" if engine == "lualatex" else "NOT_TESTED"
        if row["xelatex_build"] != expected_build:
            errors.append(f"{label}: XeLaTeX status inconsistent with engine (expected {expected_build})")
        if row["inspection"] != "NOT_IMPLEMENTED" or row["visual_edit"] != "NOT_IMPLEMENTED":
            errors.append(f"{label}: visual/inspection capability not established")
        ident = row["manifest_id"]
        if ident:
            if ident in by_id:
                errors.append(f"{label}: duplicate manifest binding {ident}")
            by_id[ident] = row
            if ident not in manifests:
                errors.append(f"{label}: dangling manifest binding {ident}")
            elif engine != manifests[ident]["engine"]:
                errors.append(f"{label}: manifest engine mismatch {ident}")

    for ident in sorted(manifests.keys() - by_id.keys()):
        errors.append(f"manifest absent from package matrix: {ident}")

    # These are only the fixed source probes, not universal package results.
    fixtures = extensions / "fixtures"
    if fixtures.is_symlink() or not fixtures.is_dir():
        errors.append("fixture directory missing or symlinked")
    for fixture, ident in SOURCES.items():
        if ident not in manifests or ident not in by_id:
            errors.append(f"fixture {fixture}: missing or unbound manifest {ident}")
            continue
        expected_engine = "lualatex" if fixture == NEGATIVE else "xelatex"
        if manifests[ident]["engine"] != expected_engine:
            errors.append(f"fixture {fixture}: expected {expected_engine} manifest")
        try:
            read_regular(fixtures / f"{fixture}.tex", MAX_MANIFEST_BYTES)
        except (OSError, ValueError) as exc:
            errors.append(f"fixture {fixture}: {exc}")

    return {
        "accepted": not errors,
        "manifest_count": len(manifests),
        "matrix_rows": len(rows),
        "bound_rows": len(by_id),
        "fixture_bindings": len(SOURCES),
        "errors": errors,
        "note": "static metadata consistency only; no package install, XeLaTeX render, or visual-edit proof",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--extensions", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--report", type=Path, help="optional JSON report (not an attestation)")
    args = parser.parse_args(argv)
    result = audit(args.extensions)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if args.report:
        args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0 if result["accepted"] else 1


if __name__ == "__main__":
    sys.exit(main())
