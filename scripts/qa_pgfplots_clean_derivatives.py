#!/usr/bin/env python3
"""Build and verify explicitly attributed, non-corpus PGFPlots derivatives.

The three checked-in sources remain immutable corpus originals. Each derivative
removes exactly two pinned bare semicolons after the listed ``\\def`` lines;
the manifest records the byte-level relationship and is intentionally separate
from the TeX source.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "scripts/fixtures/pgfplots-v2/clean-derivatives"
MANIFEST_NAME = "manifest.json"
MANIFEST_KIND = "PGFPLOTS_CLEAN_DERIVATIVES_V1"


@dataclass(frozen=True)
class Removal:
    """One exact semicolon deletion, anchored to its full source line."""

    expected_line: bytes


@dataclass(frozen=True)
class DerivativeSpec:
    name: str
    corpus_id: str
    original_relative_path: str
    original_sha256: str
    removals: tuple[Removal, Removal]


SPECS: dict[str, DerivativeSpec] = {
    "SV-003-clean": DerivativeSpec(
        "SV-003-clean", "SV-003",
        "roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-003/figure.tex",
        "5f4c1533dbcc96ef9d59a10c433e43f0b20bb46b742826f8eae4736c08bfd586",
        (Removal(b"  \\def\\xo{1.8};\n"), Removal(b"  \\def\\yn{1.1};\n")),
    ),
    "SV-029-clean": DerivativeSpec(
        "SV-029-clean", "SV-029",
        "roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-029/figure.tex",
        "43e7efd9032830d95bc6e402ae941bc93af071a6eb4fd7ddedd4d02e318a4a43",
        (Removal(b"  \\def\\ql{-1};\n"), Removal(b"  \\def\\qr{1};\n")),
    ),
    "SV-009-clean": DerivativeSpec(
        "SV-009-clean", "SV-009",
        "roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-009/figure.tex",
        "5e6e3dfc2d2b44a74a0a3069e55a402900d2317580fd6991bf39c16648a86fac",
        (Removal(b"  \\def\\xo{0.6};\n"), Removal(b"  \\def\\yn{1.1};\n")),
    ),
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _original_bytes(spec: DerivativeSpec, repo_root: Path = ROOT) -> bytes:
    path = repo_root / spec.original_relative_path
    try:
        original = path.read_bytes()
    except OSError as exc:
        raise ValueError(f"Cannot read pinned original {spec.corpus_id}: {path}") from exc
    if sha256(original) != spec.original_sha256:
        raise ValueError(f"Pinned original hash mismatch for {spec.corpus_id}")
    return original


def derive_bytes(spec: DerivativeSpec, original: bytes) -> tuple[bytes, dict[str, Any]]:
    """Return a deterministic derivative and its byte-level attribution entry."""
    actual_hash = sha256(original)
    if actual_hash != spec.original_sha256:
        raise ValueError(f"Pinned original hash mismatch for {spec.corpus_id}")

    lines = original.splitlines(keepends=True)
    offsets: list[dict[str, Any]] = []
    cursor = 0
    deletes: list[int] = []
    for removal in spec.removals:
        matches = [i for i, line in enumerate(lines) if line == removal.expected_line]
        if len(matches) != 1:
            raise ValueError(
                f"Expected exactly one anchored definition line for {spec.corpus_id}; "
                f"found {len(matches)}"
            )
        index = matches[0]
        line_offset = sum(len(line) for line in lines[:index])
        semicolon_offset = line_offset + len(removal.expected_line) - 2
        if original[semicolon_offset:semicolon_offset + 1] != b";":
            raise ValueError(f"Expected semicolon context changed for {spec.corpus_id}")
        before = original[max(0, semicolon_offset - 24):semicolon_offset]
        after = original[semicolon_offset + 1:semicolon_offset + 25]
        offsets.append({
            "offset": semicolon_offset,
            "expected_bytes_hex": "3b",
            "expected_bytes_ascii": ";",
            "context_before_hex": before.hex(),
            "context_after_hex": after.hex(),
            "definition_line_hex": removal.expected_line.hex(),
        })
        deletes.append(semicolon_offset)

    if len(set(deletes)) != 2:
        raise ValueError(f"Expected two distinct removal offsets for {spec.corpus_id}")
    derived = bytearray(original)
    for offset in sorted(deletes, reverse=True):
        del derived[offset:offset + 1]
    derived_bytes = bytes(derived)
    if len(original) - len(derived_bytes) != 2:
        raise ValueError(f"Unexpected byte-difference count for {spec.corpus_id}")

    return derived_bytes, {
        "name": spec.name,
        "corpus_id": spec.corpus_id,
        "original_path": spec.original_relative_path,
        "original_sha256": actual_hash,
        "derived_filename": f"{spec.name}.tex",
        "derived_sha256": sha256(derived_bytes),
        "removed_bytes": offsets,
        "byte_length_original": len(original),
        "byte_length_derived": len(derived_bytes),
        "byte_difference_count": 2,
        "corpus_status": "NOT_ORIGINAL_CORPUS",
    }


def build_manifest(entries: list[dict[str, Any]]) -> dict[str, Any]:
    if [entry["name"] for entry in entries] != list(SPECS):
        raise ValueError("Derivative inventory/order mismatch")
    return {
        "manifest_kind": MANIFEST_KIND,
        "notice": "CLEAN_DERIVATIVES_ONLY; originals remain unchanged and authoritative",
        "derivatives": entries,
    }


def expected_files(repo_root: Path = ROOT) -> tuple[dict[str, bytes], dict[str, Any]]:
    files: dict[str, bytes] = {}
    entries = []
    for name, spec in SPECS.items():
        original = _original_bytes(spec, repo_root)
        derived, entry = derive_bytes(spec, original)
        files[f"{name}.tex"] = derived
        entries.append(entry)
    manifest = build_manifest(entries)
    files[MANIFEST_NAME] = (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode()
    return files, manifest


def generate(output_dir: Path = DEFAULT_OUTPUT, repo_root: Path = ROOT) -> dict[str, Any]:
    """Write the pinned derivatives and manifest, refusing unrelated files."""
    files, manifest = expected_files(repo_root)
    output_dir.mkdir(parents=True, exist_ok=True)
    expected_names = set(files)
    existing_names = {path.name for path in output_dir.iterdir()}
    unexpected = existing_names - expected_names
    if unexpected:
        raise ValueError("Refusing to write into directory with unexpected files: " + ", ".join(sorted(unexpected)))
    for name, contents in files.items():
        (output_dir / name).write_bytes(contents)
    return manifest


def verify(output_dir: Path = DEFAULT_OUTPUT, repo_root: Path = ROOT) -> dict[str, Any]:
    files, manifest = expected_files(repo_root)
    if not output_dir.is_dir():
        raise ValueError(f"Derivative directory missing: {output_dir}")
    actual_names = {path.name for path in output_dir.iterdir()}
    if actual_names != set(files):
        raise ValueError("Derivative file inventory mismatch")
    for name, expected in files.items():
        actual = (output_dir / name).read_bytes()
        if actual != expected:
            raise ValueError(f"Derivative or manifest mismatch: {name}")
    return manifest


def fixture_evidence(name: str, output_dir: Path = DEFAULT_OUTPUT,
                     repo_root: Path = ROOT) -> dict[str, Any]:
    """Return original/derived bytes plus verified attribution for root QA.

    The result is suitable for writing separate immutable original input bytes
    under nativeinputs and the derived source under the derivative fixture ID.
    """
    if name not in SPECS:
        raise ValueError("Unknown clean derivative: " + name)
    manifest = verify(output_dir, repo_root)
    spec = SPECS[name]
    original = _original_bytes(spec, repo_root)
    entry = next(item for item in manifest["derivatives"] if item["name"] == name)
    derived = (output_dir / entry["derived_filename"]).read_bytes()
    if sha256(original) != entry["original_sha256"] or sha256(derived) != entry["derived_sha256"]:
        raise ValueError("Verified fixture bytes differ from manifest")
    return {"name": name, "original_bytes": original, "derived_bytes": derived,
            "manifest": entry}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--write", action="store_true", help="generate the checked-in attributed derivatives")
    action.add_argument("--verify", action="store_true", help="verify originals, derivatives, and manifest")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    manifest = generate(args.output_dir) if args.write else verify(args.output_dir)
    print(json.dumps({"status": "PASS", "count": len(manifest["derivatives"]),
                      "names": [entry["name"] for entry in manifest["derivatives"]]}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
