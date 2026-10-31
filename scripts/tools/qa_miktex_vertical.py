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


def miktex_tex_log_identity(log_text: str) -> bool:
    """Require the *actual TeX run* to identify pinned MiKTeX XeTeX.

    A verified --version probe is not proof the Rust CLI invoked that engine.
    Only the opening TeX log banner counts, not later diagnostic text.
    """
    lines = log_text.lstrip("\ufeff").splitlines()
    return bool(lines and re.match(
        r"^This is XeTeX, Version [^()\r\n]+ \(MiKTeX 25\.12\)(?:\s|$)",
        lines[0],
    ))


def setup_stage_complete(stage: dict, setup: dict) -> bool:
    """Require terminal, provenance-matched setup; never accept stale INCOMPLETE."""
    installer = setup.get("installer_sha256")
    engine = setup.get("xelatex_path")
    return (isinstance(stage, dict) and stage.get("schema_version") == 1
            and stage.get("stage") == "setup-complete"
            and stage.get("status") == "SETUP_COMPLETE"
            and isinstance(installer, str) and bool(installer)
            and isinstance(engine, str) and bool(engine)
            and stage.get("installer_sha256") == installer
            and stage.get("xelatex_path") == engine
            and stage.get("auto_install_config_readback") == "0")


def poppler_version(tool: str, transcript: str) -> bool:
    """A real Poppler auditor, not MiKTeX's same-named TeX shim."""
    return bool(re.search(rf"(?m)^{re.escape(tool)} version [0-9]+(?:[.][0-9]+)+", transcript))


def select_poppler(directory: Path) -> dict:
    """Use independent Chocolatey Poppler explicitly for PDF evidence.

    MiKTeX ships pdfinfo/pdftotext/pdffonts shims with identical names;
    PATH after installing MiKTeX otherwise silently selects those shims.
    """
    root = directory.resolve(strict=True)
    if not root.is_dir():
        raise RuntimeError("Independent Poppler tool directory is not a directory")
    os.environ["PATH"] = str(root) + os.pathsep + os.environ.get("PATH", "")
    tools = {}
    for name in ("pdfinfo", "pdftotext", "pdffonts"):
        executable = shutil.which(name)
        if not executable:
            raise RuntimeError(f"Independent Poppler {name} missing")
        path = Path(executable).resolve()
        if not path.is_relative_to(root):
            raise RuntimeError(f"PDF auditor {name} resolved outside independent Poppler: {path}")
        probe = run([str(path), "-v"], timeout=30)
        transcript = (probe.stdout + probe.stderr).decode("utf-8", errors="replace")
        if probe.returncode or not poppler_version(name, transcript):
            raise RuntimeError(f"Independent Poppler {name} version probe failed: {transcript[:200]}")
        tools[name] = {"path": str(path), "sha256": sha(path),
                       "version": transcript.splitlines()[0]}
    return tools


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
        log_text = logfile.read_text(encoding="utf-8", errors="replace") if logfile.is_file() else ""
        if log_text:
            text += "\n" + log_text
        (destination / "console.log").write_text(text, encoding="utf-8")
        pdf = destination / f"{source.stem}.pdf"
        passed = (tex_failure(kind, proc.returncode, text, pdf.exists())
                  and sha(source) == original and logfile.is_file()
                  and miktex_tex_log_identity(log_text))
        return {"id": label, "status": "PASS" if passed else "FAIL",
                "exit_code": proc.returncode, "pdf_exists": pdf.exists(),
                "source_sha256_before": original, "source_sha256_after": sha(source),
                "log_sha256": sha(logfile) if logfile.is_file() else None,
                "tex_identity": miktex_tex_log_identity(log_text),
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
    cli_log = target / "cli-main.log"
    command = [str(cli), "build", str(local), str(pdf), "--log", str(cli_log)]
    try:
        proc = run(command, cwd=root)
        (target / "cli.stdout.log").write_bytes(proc.stdout)
        (target / "cli.stderr.log").write_bytes(proc.stderr)
        expected_text = ["Примитивы TikZ", "Кривая Безье αβγ"]
        expected_fonts = ["DejaVuSerif", "LatinModernMath"]
        details = {}
        valid = False
        if proc.returncode == 0 and pdf.is_file():
            valid, details = inspect_pdf(pdf, 1, expected_text, expected_fonts)
        # Compare both actual compiler logs; a valid PDF does not prove which
        # engine the production CLI used.
        cli_log_text = cli_log.read_text(encoding="utf-8", errors="replace") if cli_log.is_file() else ""
        direct = target / "direct"
        direct.mkdir()
        direct_args = [str(engine), "--disable-installer", "-interaction=nonstopmode",
                       "-halt-on-error", "-no-shell-escape", f"-output-directory={direct}", "main.tex"]
        direct_proc = run(direct_args, cwd=target)
        direct_log = direct / "main.log"
        direct_pdf = direct / "main.pdf"
        direct_valid, direct_details = (
            inspect_pdf(direct_pdf, 1, expected_text, expected_fonts)
            if direct_pdf.is_file() else (False, {})
        )
        if direct_log.is_file():
            log_text = direct_log.read_text(encoding="utf-8", errors="replace")
            (target / "direct-tex.log").write_text(log_text, encoding="utf-8")
        else:
            log_text = ""
        good = (proc.returncode == 0 and valid and all(tokens.values())
                and direct_proc.returncode == 0 and direct_valid
                and miktex_tex_log_identity(cli_log_text)
                and miktex_tex_log_identity(log_text)
                and "Missing character:" not in cli_log_text
                and "Missing character:" not in log_text
                and sha(local) == hashlib.sha256(original_bytes).hexdigest()
                and src.read_bytes() == original_bytes)
        return {"id": "native-primitives", "status": "PASS" if good else "FAIL",
                "cli_exit_code": proc.returncode, "direct_tex_exit_code": direct_proc.returncode,
                "cli_command": command, "direct_command": direct_args,
                "primitive_tokens": tokens, "source_sha256": hashlib.sha256(original_bytes).hexdigest(),
                "source_unchanged": sha(local) == hashlib.sha256(original_bytes).hexdigest(),
                "cli_tex_identity": miktex_tex_log_identity(cli_log_text),
                "direct_tex_identity": miktex_tex_log_identity(log_text),
                "cli_missing_character": "Missing character:" in cli_log_text,
                "direct_missing_character": "Missing character:" in log_text,
                "cli_log_sha256": sha(cli_log) if cli_log.is_file() else None,
                "direct_log_sha256": sha(direct_log) if direct_log.is_file() else None,
                "pdf": details, "direct_pdf": direct_details,
                "cli_pdf_sha256": sha(pdf) if pdf.is_file() else None,
                "direct_pdf_sha256": sha(direct_pdf) if direct_pdf.is_file() else None}
    except (OSError, subprocess.TimeoutExpired, UnicodeError) as exc:
        return {"id": "native-primitives", "status": "FAIL", "error": str(exc)}



N1_TOOLS = (
    "tikz.line", "tikz.arrow", "tikz.rectangle",
    "tikz.circle", "tikz.node", "tikz.bezier-cubic",
)


def n1_state_contract(state: dict, plain: str, math: str) -> bool:
    """Require the genuine merged N1 Session proof and preserved TeX ownership."""
    return (
        state.get("status") == "PASS_AUTHORING_STATE_ONLY"
        and state.get("generator") == "tikzarium_extensions::primitives::Catalog"
        and state.get("tools") == list(N1_TOOLS)
        and state.get("command_count") == 6
        and all(state.get(name) == "PASS" for name in (
            "save_reopen", "parameter_undo", "math_undo",
            "opaque_source_preservation", "manual_edit_conflict",
        ))
        and state.get("gui_pointer_clicks") == "NOT_RUN"
        and all(src.count(" % tikzarium:n1:") == 6 for src in (plain, math))
        and all(r"\newcommand{\UserPath}{\path (0,0);}" in src
                and r"\UserPath" in src
                and r"\begin{tikzpicture}" in src
                and "rectangle" in src
                and "circle" in src
                and "controls" in src
                and r"\node" in src for src in (plain, math))
        and "Геометрия" in plain
        and r"\hbar" in math and r"\alpha" in math
        and plain != math
    )


def n1_positive(root: Path, output: Path, engine: Path, cli: Path, proof: Path) -> dict:
    """Compile actual C-catalogue app Session output, not another authored fixture.

    The N1 binary exercises programmatic authoring transactions; no mouse/egui
    screenshot or physical target-host claim is inferred from it.
    """
    from qa_smoke import inspect_pdf
    result = {"id": "n1-app-session-generated", "status": "FAIL", "variants": []}
    workspace = output / "N1 project Кириллица with spaces"
    generated = workspace / "session output"
    try:
        if not proof.is_file():
            raise RuntimeError("Merged N1 n1-authoring-proof binary is absent")
        workspace.mkdir(parents=True, exist_ok=False)
        producer = [str(proof), str(generated)]
        run_proof = run(producer, cwd=root)
        (workspace / "producer.stdout.log").write_bytes(run_proof.stdout)
        (workspace / "producer.stderr.log").write_bytes(run_proof.stderr)
        result["producer_command"] = producer
        result["producer_exit_code"] = run_proof.returncode
        if run_proof.returncode:
            raise RuntimeError("Real N1 Session/extension catalogue source generation failed")
        state = json.loads((generated / "authoring-state.json").read_text(encoding="utf-8-sig"))
        plain_source = generated / "authoring.tex"
        math_source = generated / "math-authoring.tex"
        plain = plain_source.read_text(encoding="utf-8")
        math = math_source.read_text(encoding="utf-8")
        if not n1_state_contract(state, plain, math):
            raise RuntimeError("N1 Session did not prove six source-owned commands/save/reopen/undo")
        result["session_state"] = state
        for source, name, wanted, font in (
            (plain_source, "text", ["Геометрия", "оптика"], ["DejaVuSerif"]),
            (math_source, "math", ["𝛼", "𝛽"], ["LatinModernMath"]),
        ):
            original = sha(source)
            dest = workspace / f"PDF {name}"
            dest.mkdir()
            pdf = dest / f"{name}.pdf"
            log = dest / f"{name}.log"
            cli_command = [str(cli), "build", str(source), str(pdf), "--log", str(log)]
            cli_proc = run(cli_command, cwd=root)
            (dest / "cli.stdout.log").write_bytes(cli_proc.stdout)
            (dest / "cli.stderr.log").write_bytes(cli_proc.stderr)
            direct = dest / "direct"
            direct.mkdir()
            direct_command = [
                str(engine), "--disable-installer", "-interaction=nonstopmode",
                "-halt-on-error", "-file-line-error", "-no-shell-escape",
                f"-output-directory={direct}", source.name,
            ]
            direct_proc = run(direct_command, cwd=generated)
            direct_pdf = direct / source.with_suffix(".pdf").name
            direct_log = direct / source.with_suffix(".log").name
            cli_ok, cli_pdf = inspect_pdf(pdf, 1, wanted, font) if pdf.is_file() else (False, {})
            direct_ok, direct_details = (
                inspect_pdf(direct_pdf, 1, wanted, font)
                if direct_pdf.is_file() else (False, {})
            )
            cli_log_text = log.read_text(encoding="utf-8", errors="replace") if log.is_file() else ""
            direct_log_text = (
                direct_log.read_text(encoding="utf-8", errors="replace")
                if direct_log.is_file() else ""
            )
            passed = (
                cli_proc.returncode == 0 and direct_proc.returncode == 0
                and cli_ok and direct_ok
                and miktex_tex_log_identity(cli_log_text)
                and miktex_tex_log_identity(direct_log_text)
                and "Missing character:" not in cli_log_text
                and "Missing character:" not in direct_log_text
                and original == sha(source)
            )
            result["variants"].append({
                "name": name, "status": "PASS" if passed else "FAIL",
                "source_sha256_before": original, "source_sha256_after": sha(source),
                "cli_command": cli_command, "cli_exit_code": cli_proc.returncode,
                "direct_command": direct_command, "direct_exit_code": direct_proc.returncode,
                "cli_pdf": cli_pdf, "direct_pdf": direct_details,
                "cli_pdf_sha256": sha(pdf) if pdf.is_file() else None,
                "direct_pdf_sha256": sha(direct_pdf) if direct_pdf.is_file() else None,
                "cli_log_sha256": sha(log) if log.is_file() else None,
                "direct_log_sha256": sha(direct_log) if direct_log.is_file() else None,
                "cli_tex_identity": miktex_tex_log_identity(cli_log_text),
                "direct_tex_identity": miktex_tex_log_identity(direct_log_text),
                "missing_character": (
                    "Missing character:" in cli_log_text or "Missing character:" in direct_log_text
                ),
            })
        result["status"] = (
            "PASS" if len(result["variants"]) == 2
            and all(v["status"] == "PASS" for v in result["variants"]) else "FAIL"
        )
    except (OSError, RuntimeError, ValueError, UnicodeError, json.JSONDecodeError,
            subprocess.TimeoutExpired) as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
    return result


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--cli", type=Path, required=True)
    p.add_argument("--n1-proof", type=Path, required=True)
    p.add_argument("--xelatex", type=Path, required=True)
    p.add_argument("--poppler-dir", type=Path, required=True)
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
        stage = json.loads(args.setup_record.with_name("setup-stage.json").read_text(encoding="utf-8-sig"))
        if not setup_stage_complete(stage, setup):
            raise RuntimeError("MiKTeX private setup-stage is incomplete or provenance-mismatched")
        report["setup"] = setup
        report["setup_stage"] = stage
        report["pdf_tools"] = select_poppler(args.poppler_dir)
        if os.environ.get("TIKZARIUM_XELATEX", "").casefold() != str(engine).casefold():
            raise RuntimeError("CLI must be explicitly pointed to this MiKTeX XeLaTeX binary")
        report["results"].append(positive(root, output, engine, cli))
        report["results"].append(negative(
            root / "fixtures/qa/d06-native-primitives/missing-library.tex",
            "missing-library", "missing-library", output, engine))
        report["results"].append(negative(
            root / "extensions/fixtures/graphdrawing-lua.tex",
            "lua-only", "lua-only", output, engine))
        report["results"].append(n1_positive(root, output, engine, cli, args.n1_proof.resolve()))
    except (OSError, RuntimeError, json.JSONDecodeError, subprocess.TimeoutExpired) as exc:
        report["fatal"] = f"{type(exc).__name__}: {exc}"
    finally:
        report["accepted"] = not report.get("fatal") and len(report["results"]) == 4 and all(
            result["status"] == "PASS" for result in report["results"])
        (output / "miktex-qa.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"accepted": report["accepted"], "fatal": report.get("fatal"),
                          "results": [{"id": r["id"], "status": r["status"]} for r in report["results"]]}))
    return 0 if report["accepted"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
