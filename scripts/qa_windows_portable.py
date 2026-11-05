"""Native Windows x64 portable candidate independent audit.

Checks exact ZIP entries/manifests, binary hashes versus the *separately built*
release EXEs, PE GUI/CLI roles, source SHA, and optionally runs extracted CLI
on a hosted Windows runner. Does NOT run XeLaTeX or claim Windows 10 GUI QA.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import zipfile

from package_n5_preview import WIN, check_binary, fixture

ROOT = "Tikzarium-preview/"
MEMBERS = frozenset({
    "tikzarium-app.exe", "tikzarium-cli.exe", "qa/figure-crlf.tex",
    "README_RU.md", "PROVENANCE.json", "MANIFEST.sha256",
})


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def audit(archive: Path, app: Path, cli: Path, source_sha: str, run_extracted_cli: bool = False) -> dict:
    if re.fullmatch(r"[0-9a-f]{40}", source_sha) is None:
        raise ValueError("Invalid exact source SHA")
    native_app, native_cli = app.read_bytes(), cli.read_bytes()
    check_binary(native_app, WIN, role="app")
    check_binary(native_cli, WIN, role="cli")

    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        expected = {ROOT + item for item in MEMBERS}
        if len(names) != len(expected) or set(names) != expected:
            raise ValueError("Unexpected, duplicated, or missing ZIP entries")
        if z.testzip() is not None:
            raise ValueError("Corrupt ZIP CRC")
        items = {name.removeprefix(ROOT): z.read(name) for name in names}

    if items["tikzarium-app.exe"] != native_app or items["tikzarium-cli.exe"] != native_cli:
        raise ValueError("Archive binary differs from original native release ELF/PE bytes")
    if items["qa/figure-crlf.tex"] != fixture():
        raise ValueError("CRLF/opaque fixture mismatch")
    if source_sha.encode() not in items["README_RU.md"]:
        raise ValueError("README missing exact source SHA")

    expected_manifest = "".join(
        f"{digest(data)}  {name}\n"
        for name, data in sorted(items.items())
        if name != "MANIFEST.sha256"
    ).encode("utf-8")
    if items["MANIFEST.sha256"] != expected_manifest:
        raise ValueError("ZIP manifest does not match every included byte")

    provenance = json.loads(items["PROVENANCE.json"])
    if (provenance.get("source_sha") != source_sha or
            provenance.get("platform") != WIN or
            provenance.get("app_sha256") != digest(native_app) or
            provenance.get("cli_sha256") != digest(native_cli) or
            provenance.get("tex_or_fonts_bundled") is not False or
            provenance.get("physical_windows10") != "NOT_RUN" or
            provenance.get("external_xelatex_gui_pdf") != "NOT_RUN"):
        raise ValueError("Untruthful or unbound Windows provenance")

    result = {
        "status": "PASS_WINDOWS_HOSTED_PORTABLE_NOT_PHYSICAL_GUI",
        "source_sha": source_sha,
        "archive_sha256": digest(archive.read_bytes()),
        "app_sha256": digest(native_app), "cli_sha256": digest(native_cli),
        "manifest_sha256": digest(items["MANIFEST.sha256"]),
        "members_verified": len(items),
        "app_pe_subsystem": 2, "cli_pe_subsystem": 3,
        "hosted_extracted_cli": "NOT_RUN",
        "physical_windows10": "NOT_RUN", "external_miktex_pdf": "NOT_RUN",
        "windows_server_interactive_gui": "NOT_RUN",
    }
    if run_extracted_cli:
        if os.name != "nt":
            raise RuntimeError("Extracted Windows CLI execution requires actual Windows")
        with tempfile.TemporaryDirectory(prefix="Tikzarium-Windows-") as tmp:
            folder = Path(tmp) / "Тест с пробелом"
            folder.mkdir()
            binary = folder / "tikzarium-cli.exe"
            binary.write_bytes(items["tikzarium-cli.exe"])
            env = dict(os.environ, TIKZARIUM_XELATEX="Z:/no-external-tex/disabled.exe")
            child = subprocess.run(
                [str(binary), "help", "tikz.circle"], cwd=folder, env=env,
                capture_output=True, text=True, encoding="utf-8", errors="replace",
                timeout=30, check=False,
            )
            if child.returncode != 0 or "tikz.circle" not in child.stdout:
                raise ValueError(f"Extracted hosted Windows CLI help failed: exit={child.returncode}, stdout={child.stdout[:500]!r}, stderr={child.stderr[:500]!r}")
            result["hosted_extracted_cli"] = "PASS_HELP_NO_XELATEX_HOSTED_WINDOWS"
            result["cli_stdout_excerpt"] = child.stdout[:700]
    return result


def console_json(result: dict) -> str:
    # A Windows CP1252 console cannot print raw Cyrillic even though the
    # UTF-8 audit file remains correct. Escape non-ASCII only for stdout.
    return json.dumps(result, ensure_ascii=True, sort_keys=True)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--zip", type=Path, required=True)
    p.add_argument("--app", type=Path, required=True)
    p.add_argument("--cli", type=Path, required=True)
    p.add_argument("--source-sha", required=True)
    p.add_argument("--report", type=Path, required=True)
    p.add_argument("--run-extracted-cli", action="store_true")
    a = p.parse_args()
    a.report.parent.mkdir(parents=True, exist_ok=True)
    result = audit(a.zip, a.app, a.cli, a.source_sha, a.run_extracted_cli)
    a.report.write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(console_json(result))


if __name__ == "__main__":
    main()
