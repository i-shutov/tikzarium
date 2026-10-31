#!/usr/bin/env python3
"""Independent, fail-closed MiKTeX XeLaTeX CI evidence (Windows Server only).

The source fixture is hand-authored TikZ, not evidence of mouse editing or help UI.
No packages are installed here: CI setup is separate; MiKTeX auto-install must be off.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
from datetime import datetime, timezone


LUA_REQUIREMENT = "needtorunluatextousethegraphdrawinglibrary"
MISSING_LIBRARY = "tikzarium_qa_nonexistent_8f7d41"
PRIMITIVE_TOKENS = (
    r"\draw (0,0) -- (2,0);",
    r"\draw[->] (0,0.4) -- (2,0.4);",
    r"\draw (2.5,0) rectangle (4.5,1);",
    r"\draw (5.3,0.5) circle[radius=0.5cm];",
    r"\node[draw] at (1,1.4)",
    r".. controls (3,1.5) and (4,1.5) ..",
)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tex_failure(kind: str, exit_code: int, text: str, pdf_exists: bool) -> bool:
    if exit_code == 0 or pdf_exists:
        return False
    if kind == "lua-only":
        return LUA_REQUIREMENT in re.sub(r"\s+", "", text).lower()
    if kind == "missing-library":
        return MISSING_LIBRARY in re.sub(r"\s+", "", text.lower()) and bool(re.search(
            r"(not found|can't find file|did not find)", text, re.I))
    raise ValueError(f"Unknown negative kind: {kind}")


def miktex_engine(version: str) -> bool:
    return "miktex" in version.casefold() and "xetex" in version.casefold()


def run(cmd: list[str], cwd: Path | None = None, timeout: int = 180) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(cmd, cwd=cwd, capture_output=True, timeout=timeout, check=False)


def negative(source: Path, label: str, kind: str, output: Path, engine: Path) -> dict:
    """Run source unchanged, with output in a fresh directory and installer disabled."""
    destination = output / label
    destination.mkdir(parents=True, exist_ok=False)
    original = sha(source)
    command = [str(engine), "--disable-installer", "-interaction=nonstopmode",
               "-halt-on-error", "-file-line-error", "-no-shell-escape",
               f"-output-directory={destination}", source.name]
    try:
        proc = run(command, cwd=source.parent)
        text = (proc.stdout + b"\n" + proc.stderr).decode("utf-8", errors="replace")
        logfile = destination / f"{source.stem}.log"
        if logfile.is_file():
            text += "\n" + logfile.read_text(encoding="utf-8", errors="replace")
        (destination / "console.log").write_text(text, encoding="utf-8")
        pdf = destination / f"{source.stem}.pdf"
        passed = (tex_failure(kind, proc.returncode, text, pdf.exists())
                  and sha(source) == original and logfile.is_file())
        return {"id": label, "status": "PASS" if passed else "FAIL",
                "exit_code": proc.returncode, "pdf_exists": pdf.exists(),
                "source_sha256_before": original, "source_sha256_after": sha(source),
                "log_sha256": sha(logfile) if logfile.is_file() else None,
                "command": command, "required_error": kind}
    except (OSError, subprocess.TimeoutExpired) as exc:
        return {"id": label, "status": "FAIL", "error": str(exc),
                "source_sha256_before": original, "source_sha256_after": sha(source)}


def positive(root: Path, output: Path, engine: Path, cli: Path) -> dict:
    from qa_smoke import inspect_pdf
    src = root / "fixtures/qa/d06-native-primitives/main.tex"
    original_bytes = src.read_bytes()
    code = original_bytes.decode("utf-8", errors="strict")
    tokens = {token: token in code for token in PRIMITIVE_TOKENS}
    target = output / "proof with spaces Кириллица"
    target.mkdir(parents=True, exist_ok=False)
    local = target / "main.tex"
    local.write_bytes(original_bytes)
    pdf = target / "main.pdf"
    command = [str(cli), "build", str(local), str(pdf)]
    try:
        proc = run(command, cwd=root)
        (target / "cli.stdout.log").write_bytes(proc.stdout)
        (target / "cli.stderr.log").write_bytes(proc.stderr)
        details = {}
        valid = False
        if proc.returncode == 0 and pdf.is_file():
            valid, details = inspect_pdf(
                pdf, 1, ["Примитивы TikZ", "Кривая Безье αβγ"],
                ["DejaVuSerif", "LatinModernMath"],
            )
        # Independent direct TeX log catches missing glyphs; PDF alone is insufficient.
        direct = target / "direct"
        direct.mkdir()
        direct_args = [str(engine), "--disable-installer", "-interaction=nonstopmode",
                       "-halt-on-error", "-no-shell-escape", f"-output-directory={direct}", "main.tex"]
        direct_proc = run(direct_args, cwd=target)
        direct_log = direct / "main.log"
        if direct_log.is_file():
            log_text = direct_log.read_text(encoding="utf-8", errors="replace")
            (target / "direct-tex.log").write_text(log_text, encoding="utf-8")
        else:
            log_text = ""
        good = (proc.returncode == 0 and valid and all(tokens.values())
                and direct_proc.returncode == 0 and (direct / "main.pdf").is_file()
                and bool(log_text) and "Missing character:" not in log_text
                and sha(local) == hashlib.sha256(original_bytes).hexdigest()
                and src.read_bytes() == original_bytes)
        return {"id": "native-primitives", "status": "PASS" if good else "FAIL",
                "cli_exit_code": proc.returncode, "direct_tex_exit_code": direct_proc.returncode,
                "cli_command": command, "direct_command": direct_args,
                "primitive_tokens": tokens, "source_sha256": hashlib.sha256(original_bytes).hexdigest(),
                "source_unchanged": sha(local) == hashlib.sha256(original_bytes).hexdigest(),
                "direct_missing_character": "Missing character:" in log_text,
                "direct_log_sha256": sha(direct_log) if direct_log.is_file() else None,
                "pdf": details}
    except (OSError, subprocess.TimeoutExpired, UnicodeError) as exc:
        return {"id": "native-primitives", "status": "FAIL", "error": str(exc)}


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--cli", type=Path, required=True)
    p.add_argument("--xelatex", type=Path, required=True)
    p.add_argument("--miktex-prefix", type=Path, required=True)
    p.add_argument("--setup-record", type=Path, required=True)
    p.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    p.add_argument("--output", type=Path, required=True)
    args = p.parse_args(argv)
    root, output = args.root.resolve(), args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    report = {"schema_version": 1, "timestamp_utc": datetime.now(timezone.utc).isoformat(),
              "commit_sha": os.getenv("GITHUB_SHA"),
              "source_head_sha": os.getenv("TIKZARIUM_SOURCE_SHA"),
              "runner": os.getenv("RUNNER_OS"), "runner_arch": os.getenv("RUNNER_ARCH"),
              "host": platform.platform(), "machine": platform.machine(),
              "distribution": "MiKTeX (must be verified, not inferred from Windows)",
              "physical_win10": "NOT_RUN", "physical_mac_m1_m4": "NOT_RUN",
              "mouse_authoring": "NOT_RUN", "code_pane_and_help": "NOT_RUN",
              "save_reopen_undo": "NOT_RUN", "gui_theme_no_pdf_change": "NOT_RUN",
              "results": []}
    try:
        engine, prefix, cli = args.xelatex.resolve(), args.miktex_prefix.resolve(), args.cli.resolve()
        if platform.system() != "Windows" or platform.machine().lower() not in ("amd64", "x86_64"):
            raise RuntimeError("MiKTeX hosted Windows x64 test must execute on Windows x64")
        if not engine.is_file() or not engine.is_relative_to(prefix) or not cli.is_file():
            raise RuntimeError("Missing CI-isolated MiKTeX executable or Rust CLI")
        v = run([str(engine), "--version"], timeout=30)
        version = (v.stdout + v.stderr).decode("utf-8", errors="replace")
        report["xelatex_path"] = str(engine)
        report["xelatex_version"] = version.splitlines()[:4]
        report["xelatex_sha256"] = sha(engine)
        report["cli_sha256"] = sha(cli)
        if v.returncode or not miktex_engine(version):
            raise RuntimeError("XeLaTeX executable is not a verified MiKTeX XeTeX")
        setup = json.loads(args.setup_record.read_text(encoding="utf-8"))
        if (setup.get("installer_sha256") != "14b42dd9f4b4a7813a8bfd69c8f99316c2888cc4ee26f631f397e163d85d6c62"
                or setup.get("private_install") is not True
                or setup.get("no_registry") is not True
                or setup.get("auto_install_disabled") is not True
                or Path(setup.get("user_install", "")).resolve() != prefix):
            raise RuntimeError("Isolated MiKTeX setup provenance or auto-install-off proof absent")
        report["setup"] = setup
        required_tools = ("pdfinfo", "pdftotext", "pdffonts")
        missing = [tool for tool in required_tools if not shutil.which(tool)]
        if missing:
            raise RuntimeError(f"Missing Poppler PDF inspectors: {missing}")
        if os.environ.get("TIKZARIUM_XELATEX", "").casefold() != str(engine).casefold():
            raise RuntimeError("CLI must be explicitly pointed to this MiKTeX XeLaTeX binary")
        report["pdf_tools"] = {k: shutil.which(k) for k in required_tools}
        report["results"].append(positive(root, output, engine, cli))
        report["results"].append(negative(
            root / "fixtures/qa/d06-native-primitives/missing-library.tex",
            "missing-library", "missing-library", output, engine))
        report["results"].append(negative(
            root / "extensions/fixtures/graphdrawing-lua.tex",
            "lua-only", "lua-only", output, engine))
    except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
        report["fatal"] = f"{type(exc).__name__}: {exc}"
    finally:
        report["accepted"] = not report.get("fatal") and len(report["results"]) == 3 and all(
            result["status"] == "PASS" for result in report["results"])
        (output / "miktex-qa.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"accepted": report["accepted"], "fatal": report.get("fatal"),
                          "results": [{"id": r["id"], "status": r["status"]} for r in report["results"]]}))
    return 0 if report["accepted"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
