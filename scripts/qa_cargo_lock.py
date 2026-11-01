#!/usr/bin/env python3
"""Attest tracked Cargo.lock integrity; do not claim binary reproducibility.

The external TeX engines, fonts, GUI and physical target acceptance are
independent from Cargo dependency resolution.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
import sys
import tomllib
from pathlib import Path

WORKSPACE = frozenset({
    "tikzarium-app", "tikzarium-cli", "tikzarium-core", "tikzarium-extensions",
})


def inspect_lock(raw: bytes) -> dict[str, object]:
    try:
        lock = tomllib.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, tomllib.TOMLDecodeError) as error:
        raise ValueError(f"Invalid UTF-8 Cargo.lock TOML: {error}") from error
    if type(lock.get("version")) is not int or lock["version"] != 4:
        raise ValueError("Cargo.lock must use format version 4 with Rust 1.91")
    packages = lock.get("package")
    if not isinstance(packages, list) or not packages:
        raise ValueError("Cargo.lock has no packages")
    seen: set[tuple[str, str, str]] = set()
    local: set[str] = set()
    registry = 0
    for package in packages:
        if not isinstance(package, dict):
            raise ValueError("Invalid package record")
        name = package.get("name")
        version = package.get("version")
        source = package.get("source", "")
        if not isinstance(name, str) or not name or not isinstance(version, str) or not version or not isinstance(source, str):
            raise ValueError("Invalid package identity")
        key = (name, version, source)
        if key in seen:
            raise ValueError(f"Duplicate locked package: {key}")
        seen.add(key)
        if source.startswith("registry+"):
            registry += 1
            checksum = package.get("checksum")
            if not isinstance(checksum, str) or len(checksum) != 64 or any(
                c not in "0123456789abcdef" for c in checksum
            ):
                raise ValueError(f"Registry package lacks SHA-256: {name}")
        elif not source:
            local.add(name)
    if not WORKSPACE.issubset(local):
        raise ValueError("Cargo.lock omits a TikZarium workspace member")
    return {
        "lock_version": 4,
        "lock_sha256": hashlib.sha256(raw).hexdigest(),
        "package_count": len(packages),
        "registry_count": registry,
        "workspace_packages": sorted(WORKSPACE),
    }



def require_identical_lock(working: bytes, committed: bytes) -> str:
    """Reject platform-specific checkout conversions, not only logical Git diffs."""
    if working != committed:
        if working.replace(b"\\r\\n", b"\\n") == committed:
            raise RuntimeError("Cargo.lock CRLF conversion changed bytes on checkout; configure eol=lf")
        raise RuntimeError("Cargo.lock working-tree bytes differ from committed Git blob")
    return hashlib.sha256(committed).hexdigest()


def checked(root: Path, *argv: str) -> str:
    p = subprocess.run(argv, cwd=root, text=True, capture_output=True, check=False)
    if p.returncode != 0:
        raise RuntimeError(f"{' '.join(argv)} failed ({p.returncode}): {p.stderr[-1200:]}")
    return p.stdout.strip()


def audit(root: Path) -> dict[str, object]:
    report = inspect_lock((root / "Cargo.lock").read_bytes())
    checked(root, "git", "ls-files", "--error-unmatch", "Cargo.lock")
    checked(root, "git", "diff", "--exit-code", "--", "Cargo.lock")
    # Git diff may silently normalize CRLF on Windows. Compare raw Git blob
    # to raw worktree bytes; otherwise the same dependency graph hashes
    # differently across hosts and the evidence is not comparable.
    blob = subprocess.run(["git", "show", "HEAD:Cargo.lock"], cwd=root,
                          capture_output=True, check=False)
    if blob.returncode != 0:
        raise RuntimeError(f"Could not read committed Cargo.lock: {blob.stderr[-400:]!r}")
    report["git_blob_sha256"] = require_identical_lock(
        (root / "Cargo.lock").read_bytes(), blob.stdout)
    report["worktree_equals_git_blob_bytes"] = True
    # Cargo itself checks stale manifest resolution; no fallback to a regenerated lock.
    metadata = json.loads(checked(root, "cargo", "metadata", "--locked",
                                  "--no-deps", "--format-version", "1"))
    names = {p.get("name") for p in metadata.get("packages", [])}
    if not WORKSPACE.issubset(names):
        raise RuntimeError("Cargo metadata omits a workspace package")
    report.update({
        "status": "PASS_LOCKED_DEPENDENCY_RESOLUTION_ONLY",
        "checkout_sha": checked(root, "git", "rev-parse", "HEAD"),
        "cargo_version": checked(root, "cargo", "--version"),
        "rustc_vv": checked(root, "rustc", "-vV"),
        "host": platform.platform(),
        "architecture": platform.machine(),
        "binary_bitwise_reproducibility": "NOT_VERIFIED",
        "physical_windows10_miktex": "NOT_RUN",
        "physical_mac_m1_m4_xelatex": "NOT_RUN",
    })
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    try:
        report = audit(args.repo.resolve())
        code = 0
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        report = {"status": "FAIL", "error": str(error),
                  "binary_bitwise_reproducibility": "NOT_VERIFIED",
                  "physical_windows10_miktex": "NOT_RUN",
                  "physical_mac_m1_m4_xelatex": "NOT_RUN"}
        code = 1
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
                           encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    return code


if __name__ == "__main__":
    sys.exit(main())
