#!/usr/bin/env python3
"""Read-only AT0 intake of the owner's AI_TIKZ_SKILLS catalogue and case ledger.

The source catalogue and .tex originals remain outside this public repository.
This tool verifies provenance and structure; it NEVER runs TeX, skills or scripts,
downloads packages, or claims a physical GUI/scientific acceptance.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEDGER = REPO_ROOT / "roadmap/AI_TIKZ_SKILLS_2026-11-10_88_CASES.csv"
PINNED_CATALOGUE_SHA256 = "4a94885064027806d4c9df7220216a160a923a4346671973365e59aa3cee94a5"
CATALOGUE_FIELDS = frozenset({
    "id", "group", "title", "description", "packages", "libraries",
    "stem", "engine", "check",
})
LEDGER_FIELDS = (
    "id", "group", "stem", "tex_path", "packages", "libraries",
    "engine", "catalogue_check", "implementation_status", "gui_adapter_status",
)
LUA_IDS = frozenset({"65", "68", "86"})
BASE_PACKAGES = frozenset({"tikz", "booktabs"})
TOKEN = re.compile(r"^[A-Za-z][A-Za-z0-9_.-]*$")
STEM = re.compile(r"^[a-z][a-z0-9-]*$")
STATUS = re.compile(r"^[A-Z][A-Z0-9_]*$")
EXPECTED_SKILLS = frozenset({
    "tikz-workflow-router", "tikz-semantic-diagrams",
    "pgfplots-scientific-plots", "tikz-source-reconstruction",
    "tikz-figure-collection-qa", "tikz-source-preserving-editing",
    "tikz-command-catalogue", "tikz-euclidean-constructions",
    "tikz-physics-optics", "tikz-circuits-engineering",
    "tikz-chemistry-quantum", "tikz-graphs-structures",
    "tikz-3d-geometry",
})


class IntakeError(ValueError):
    """Invalid, altered or unverifiable source/ledger content."""


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def strict_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for name, value in pairs:
        if name in result:
            raise IntakeError(f"Duplicate JSON member: {name}")
        result[name] = value
    return result


def parse_catalogue(raw: bytes, expected_sha: str | None) -> list[dict[str, Any]]:
    digest = sha256(raw)
    if expected_sha is not None and digest != expected_sha:
        raise IntakeError(f"CATALOGUE_SHA_MISMATCH: expected={expected_sha}, actual={digest}")
    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=strict_object)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise IntakeError(f"CATALOGUE_JSON_INVALID: {exc}") from exc
    if not isinstance(value, list):
        raise IntakeError("CATALOGUE_NOT_A_LIST")
    seen_ids: set[str] = set()
    seen_stems: set[str] = set()
    for index, row in enumerate(value, 1):
        if not isinstance(row, dict) or frozenset(row) != CATALOGUE_FIELDS:
            raise IntakeError(f"CATALOGUE_FIELDS_INVALID: index={index}")
        number = f"{index:02d}"
        if row["id"] != number or number in seen_ids:
            raise IntakeError(f"CATALOGUE_ID_ORDER_OR_DUPLICATE: index={index}")
        seen_ids.add(number)
        stem = row["stem"]
        if not isinstance(stem, str) or not STEM.fullmatch(stem) or stem in seen_stems:
            raise IntakeError(f"CATALOGUE_STEM_INVALID_OR_DUPLICATE: id={number}")
        seen_stems.add(stem)
        for field in ("group", "title", "description", "check"):
            if not isinstance(row[field], str) or not row[field].strip():
                raise IntakeError(f"CATALOGUE_EMPTY_FIELD: {number}/{field}")
        for field in ("packages", "libraries"):
            tokens = row[field]
            if (not isinstance(tokens, list)
                    or (field == "packages" and not tokens)
                    or any(not isinstance(v, str) or not TOKEN.fullmatch(v) for v in tokens)
                    or len(tokens) != len(set(tokens))):
                raise IntakeError(f"CATALOGUE_BAD_TOKENS: {number}/{field}")
        if row["engine"] not in ("xelatex", "lualatex"):
            raise IntakeError(f"CATALOGUE_UNSUPPORTED_ENGINE: {number}")
    return value


def parse_ledger(raw: bytes) -> list[dict[str, str]]:
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise IntakeError(f"LEDGER_NOT_UTF8: {exc}") from exc
    if text.startswith("\ufeff"):
        raise IntakeError("LEDGER_UNEXPECTED_BOM")
    reader = csv.DictReader(io.StringIO(text, newline=""), strict=True)
    if tuple(reader.fieldnames or ()) != LEDGER_FIELDS:
        raise IntakeError("LEDGER_HEADER_MISMATCH")
    result: list[dict[str, str]] = []
    try:
        for index, row in enumerate(reader, 1):
            if (None in row or any(not isinstance(v, str) for v in row.values())
                    or row["id"] != f"{index:02d}"):
                raise IntakeError(f"LEDGER_ROW_INVALID: index={index}")
            for status_field in ("implementation_status", "gui_adapter_status"):
                if not STATUS.fullmatch(row[status_field]):
                    raise IntakeError(f"LEDGER_STATUS_INVALID: {row['id']}/{status_field}")
            stem = row["stem"]
            if not STEM.fullmatch(stem) or row["tex_path"] != f"examples/{stem}.tex":
                raise IntakeError(f"LEDGER_SOURCE_PATH_INVALID: id={row['id']}")
            if row["catalogue_check"] != f"catalogue.json#{row['id']}.check":
                raise IntakeError(f"LEDGER_CHECK_POINTER_INVALID: id={row['id']}")
            result.append(row)
    except csv.Error as exc:
        raise IntakeError(f"LEDGER_CSV_INVALID: {exc}") from exc
    return result


def compare_catalogue_ledger(
    catalogue: list[dict[str, Any]], ledger: list[dict[str, str]]
) -> None:
    if len(catalogue) != len(ledger):
        raise IntakeError(f"COUNT_MISMATCH: catalogue={len(catalogue)} ledger={len(ledger)}")
    for source, case in zip(catalogue, ledger, strict=True):
        expected = {
            "id": source["id"],
            "group": source["group"],
            "stem": source["stem"],
            "tex_path": f"examples/{source['stem']}.tex",
            "packages": ",".join(source["packages"]),
            "libraries": ",".join(source["libraries"]),
            "engine": source["engine"],
            "catalogue_check": f"catalogue.json#{source['id']}.check",
        }
        for name, value in expected.items():
            if case[name] != value:
                raise IntakeError(
                    f"LEDGER_CATALOGUE_MISMATCH: {source['id']}/{name}: "
                    f"expected={value!r}, actual={case[name]!r}"
                )


def baseline_counts(catalogue: list[dict[str, Any]]) -> dict[str, Any]:
    groups = {row["group"] for row in catalogue}
    packages = {item for row in catalogue for item in row["packages"]}
    libraries = {item for row in catalogue for item in row["libraries"]}
    lua_ids = {row["id"] for row in catalogue if row["engine"] == "lualatex"}
    counts = {
        "examples": len(catalogue),
        "classes": len(groups),
        "all_package_tokens": len(packages),
        "specialized_extensions": len(packages - BASE_PACKAGES),
        "tikz_and_booktabs": sorted(packages & BASE_PACKAGES),
        "libraries": len(libraries),
        "xelatex": sum(row["engine"] == "xelatex" for row in catalogue),
        "lualatex": len(lua_ids),
        "lualatex_case_ids": sorted(lua_ids),
    }
    if (counts["examples"] != 88 or counts["classes"] != 16
            or counts["all_package_tokens"] != 37
            or counts["specialized_extensions"] != 35
            or counts["tikz_and_booktabs"] != ["booktabs", "tikz"]
            or counts["libraries"] != 23 or counts["xelatex"] != 85
            or lua_ids != LUA_IDS):
        raise IntakeError(f"CATALOGUE_BASELINE_COUNTS_CHANGED: {counts}")
    return counts


def inspect_sources(
    root: Path, catalogue: list[dict[str, Any]]
) -> dict[str, Any]:
    base = root.resolve(strict=True)
    examples = base / "examples"
    if not examples.is_dir():
        raise IntakeError("EXAMPLES_FOLDER_MISSING")
    expected = {f"{case['stem']}.tex" for case in catalogue}
    found = {file.name for file in examples.glob("*.tex")}
    if found != expected:
        raise IntakeError(
            f"EXAMPLE_SET_MISMATCH: missing={sorted(expected-found)} "
            f"unexpected={sorted(found-expected)}"
        )
    proof: list[dict[str, str]] = []
    for case in catalogue:
        path = examples / f"{case['stem']}.tex"
        if path.is_symlink() or not path.resolve(strict=True).is_relative_to(base):
            raise IntakeError(f"EXAMPLE_SYMLINK_OR_ESCAPE: {case['id']}")
        if not path.is_file():
            raise IntakeError(f"EXAMPLE_NOT_FILE: {case['id']}")
        raw = path.read_bytes()
        if b"\0" in raw:
            raise IntakeError(f"EXAMPLE_NUL_BYTE: {case['id']}")
        try:
            raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise IntakeError(f"EXAMPLE_NOT_UTF8: {case['id']}") from exc
        proof.append({
            "id": case["id"], "path": f"examples/{path.name}",
            "sha256": sha256(raw),
            "line_endings": ("MIXED" if b"\r\n" in raw and b"\n" in raw.replace(b"\r\n", b"")
                             else "CRLF" if b"\r\n" in raw
                             else "LF" if b"\n" in raw else "NONE"),
        })
    return {
        "source_files": proof, "source_files_verified": len(proof),
        "filesystem_checks": "PASS_BYTES_UTF8_FILENAMES_NO_SYMLINKS",
    }


def inspect_skills(root: Path) -> dict[str, Any]:
    skill_root = root.resolve(strict=True) / "skills"
    if not skill_root.is_dir():
        raise IntakeError("SKILLS_FOLDER_MISSING")
    found = {path.parent.name for path in skill_root.glob("*/SKILL.md")}
    if found != EXPECTED_SKILLS:
        raise IntakeError(
            f"SKILL_SET_MISMATCH: missing={sorted(EXPECTED_SKILLS-found)} "
            f"extra={sorted(found-EXPECTED_SKILLS)}"
        )
    proofs: list[dict[str, str]] = []
    for name in sorted(found):
        path = skill_root / name / "SKILL.md"
        if path.is_symlink() or not path.resolve(strict=True).is_relative_to(root.resolve(strict=True)):
            raise IntakeError(f"SKILL_SYMLINK_OR_ESCAPE: {name}")
        raw = path.read_bytes()
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise IntakeError(f"SKILL_NOT_UTF8: {name}") from exc
        if not text.startswith("---\n") or f"name: {name}" not in text:
            raise IntakeError(f"SKILL_FRONTMATTER_INVALID: {name}")
        proofs.append({"skill": name, "sha256": sha256(raw)})
    return {"skill_files_verified": len(proofs), "skills": proofs}


def run_intake(
    catalogue_bytes: bytes, ledger_bytes: bytes, *,
    expected_sha: str = PINNED_CATALOGUE_SHA256,
    source_root: Path | None = None,
    check_skills: bool = False,
) -> dict[str, Any]:
    source = parse_catalogue(catalogue_bytes, expected_sha)
    ledger = parse_ledger(ledger_bytes)
    compare_catalogue_ledger(source, ledger)
    counts = baseline_counts(source)
    report: dict[str, Any] = {
        "schema": "tikzarium.at0.intake.v1",
        "status": "AT0_CATALOGUE_LEDGER_PASS_SOURCE_BYTES_NOT_CHECKED",
        "catalogue_sha256": sha256(catalogue_bytes),
        "ledger_sha256": sha256(ledger_bytes),
        "counts": counts,
        "source_proof": "NOT_RUN",
        "skills_proof": "NOT_RUN",
        "fls_dependency_closure": "NOT_RUN",
        "ctan_license_and_version_audit": "NOT_RUN",
        "external_engines_or_gui": "NOT_RUN",
        "domain_science_acceptance": "NOT_RUN",
        "cases": [
            {
                "id": item["id"],
                "source": f"examples/{item['stem']}.tex",
                "engine": item["engine"],
                "package_names": item["packages"],
                "library_names": item["libraries"],
                "source_check_present": bool(item["check"].strip()),
                "product_gui": "NOT_RUN",
            }
            for item in source
        ],
    }
    if source_root is not None:
        report["source_proof"] = inspect_sources(source_root, source)
        report["status"] = "AT0_CATALOGUE_LEDGER_SOURCE_BYTES_PASS"
        if check_skills:
            report["skills_proof"] = inspect_skills(source_root)
    elif check_skills:
        raise IntakeError("SKILLS_REQUIRE_SOURCE_ROOT")
    return report


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--catalogue", required=True, type=Path,
                   help="Owner-provided original examples/catalogue.json (never uploaded)")
    p.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    p.add_argument("--source-root", type=Path,
                   help="Optional owner-staged tree with 88 examples/*.tex")
    p.add_argument("--check-skills", action="store_true",
                   help="Verify the 13 original skills when --source-root is provided")
    p.add_argument("--report", type=Path,
                   help="Optional machine-readable output path, NOT a public data upload")
    args = p.parse_args(argv)
    try:
        report = run_intake(
            args.catalogue.read_bytes(), args.ledger.read_bytes(),
            source_root=args.source_root, check_skills=args.check_skills,
        )
    except (IntakeError, OSError) as exc:
        print(json.dumps({"status": "AT0_FAIL_CLOSED", "reason": str(exc)},
                         ensure_ascii=False), file=sys.stderr)
        return 2
    formatted = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(formatted, encoding="utf-8")
    print(formatted, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
