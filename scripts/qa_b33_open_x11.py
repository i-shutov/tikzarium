#!/usr/bin/env python3
"""I47 real X11 B33 file-safety evidence: bootstrap is NOT acceptance.

Runs only on isolated Xvfb with independently installed external XeLaTeX.
A reviewed app source Git tree and UI coordinate profile are mandatory.
No production files or real user documents are opened.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import time

VICTIM = r"""\documentclass{standalone}
\usepackage{fontspec}
\setmainfont{DejaVu Serif}
\usepackage{tikz}
% CRLF user source and macro must survive untouched
\newcommand{\OpaqueUserMacro}{Не менять оригинал}
\begin{document}
\begin{tikzpicture}
\node at (0,0) {\OpaqueUserMacro};
\end{tikzpicture}
\end{document}
"""
SCRATCH = r"""\documentclass{standalone}
\usepackage{fontspec}
\setmainfont{DejaVu Serif}
\usepackage{tikz}
\newcommand{\ScratchMacro}{Только в отдельном файле}
\begin{document}
\begin{tikzpicture}
\node at (0,0) {\ScratchMacro};
\end{tikzpicture}
\end{document}
"""

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def command(args: list[str], timeout: float = 30) -> str:
    p = subprocess.run(args, capture_output=True, timeout=timeout, check=False)
    if p.returncode:
        raise RuntimeError(f"{args[0]} failed ({p.returncode}): {p.stderr.decode('utf-8', 'replace')[-1500:]}")
    return p.stdout.decode("utf-8", "replace").strip()

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--profile", type=Path, required=True)
    parser.add_argument("--mode", choices=["bootstrap", "full"], default="bootstrap")
    args = parser.parse_args()
    app = args.app.resolve(strict=True)
    out = args.output.resolve()
    if out.exists() and any(out.iterdir()):
        parser.error("QA output must be empty (never reuse historical evidence)")
    out.mkdir(parents=True, exist_ok=True)
    profile = json.loads(args.profile.read_text(encoding="utf-8"))
    pin = os.getenv("TIKZARIUM_APP_TREE_SHA")
    if not pin or profile.get("reviewed_app_tree_sha") != pin:
        parser.error("B33 coordinate profile / app Git tree mismatch: NOT_RUN")
    victim = out / "existing-victim.tex"
    unrelated = out / "occupied-third-file.tex"
    scratch_save = out / "explicit-scratch-destination.tex"
    victim.write_bytes(VICTIM.replace("\n", "\r\n").encode("utf-8"))
    unrelated.write_bytes(b"% Existing unrelated third-party TeX\r\n\\unknown{preserve}\r\n")
    expected_victim = sha(victim)
    expected_unrelated = sha(unrelated)
    clipboard = out / "scratch-clipboard.txt"
    clipboard.write_bytes(SCRATCH.encode("utf-8"))
    report = {
        "schema": 1, "status": "FAIL", "stage": args.mode,
        "source_head_sha": os.getenv("TIKZARIUM_SOURCE_SHA", "UNKNOWN"),
        "app_tree_sha": pin, "host": platform.platform(),
        "gui": "actual X11 / Xvfb process", "user_win10_miktex": "NOT_RUN",
        "user_mac_m1_m4_xelatex": "NOT_RUN", "modal_save_open": "NOT_RUN",
        "manual_visual_review": "NOT_RUN", "source_pdf_accepted": "NOT_RUN",
        "original_victim_sha256": expected_victim,
        "unrelated_file_sha256": expected_unrelated,
        "steps": [],
    }
    env = os.environ.copy()
    env.update({
        "XDG_CONFIG_HOME": str(out / "config"), "XDG_DATA_HOME": str(out / "data"),
        "XDG_CACHE_HOME": str(out / "cache"), "LIBGL_ALWAYS_SOFTWARE": "1",
        "WINIT_UNIX_BACKEND": "x11",
    })
    env.pop("WAYLAND_DISPLAY", None)
    process = None
    window = None
    log = (out / "app.log").open("wb")
    try:
        process = subprocess.Popen([str(app)], env=env, stdout=log, stderr=log)
        deadline = time.monotonic() + 45
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError(f"egui exited before its window: {process.returncode}")
            probe = subprocess.run(
                ["xdotool", "search", "--onlyvisible", "--pid", str(process.pid),
                 "--name", "TikZarium"], capture_output=True, timeout=5, check=False,
            )
            if probe.returncode == 0 and probe.stdout.strip():
                window = probe.stdout.decode().splitlines()[-1]
                break
            time.sleep(0.2)
        if window is None:
            raise RuntimeError("No real visible egui X11 window for child PID")
        command(["xdotool", "windowsize", "--sync", window, "1366", "740"])
        command(["xdotool", "windowmove", window, "0", "0"])
        command(["xdotool", "windowactivate", "--sync", window])
        time.sleep(1)
        report["window_geometry"] = command(["xdotool", "getwindowgeometry", "--shell", window])

        def shot(name: str) -> None:
            path = out / name
            command(["import", "-window", window, str(path)])
            if path.read_bytes()[:8] != b"\x89PNG\r\n\x1a\n":
                raise RuntimeError("ImageMagick did not capture a genuine PNG frame")

        def click(xy: list[int]) -> None:
            command(["xdotool", "mousemove", "--sync", "--window", window,
                     str(xy[0]), str(xy[1]), "click", "1"])
            time.sleep(0.25)

        def key(name: str) -> None:
            command(["xdotool", "key", "--clearmodifiers", name])
            time.sleep(0.15)

        shot("01-startup.png")
        report["steps"].append({"event": "real_visible_window", "status": "PASS"})
        # xclip forks to retain clipboard ownership: inherited pipes must not
        # keep a captured subprocess waiting for EOF after the parent exits.
        subprocess.run(
            ["xclip", "-selection", "clipboard", "-i", str(clipboard)],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            timeout=5, check=True,
        )
        click(profile["source_click"])
        key("ctrl+a")
        key("ctrl+v")
        time.sleep(0.4)
        shot("02-dirty-scratch.png")
        click(profile["path_click"])
        key("ctrl+a")
        command(["xdotool", "type", "--clearmodifiers", "--delay", "6", str(victim)])
        time.sleep(0.3)
        shot("03-open-target-typed.png")
        if args.mode == "full":
            # A typed Open path is never implicit permission to overwrite.
            click(profile["toolbar_save_click"])
            shot("03a-scratch-save-rejected.png")
            if sha(victim) != expected_victim or sha(unrelated) != expected_unrelated:
                raise RuntimeError("Toolbar Save overwrote existing Open-target TeX")
            click(profile["toolbar_build_click"])
            shot("03b-scratch-build-rejected.png")
            if sha(victim) != expected_victim or victim.with_suffix(".pdf").exists():
                raise RuntimeError("Toolbar Build used occupied Open-target path for scratch")
            report["steps"].append({
                "event": "unbound_scratch_toolbar_save_build_occupied",
                "status": "PENDING_VISUAL_REVIEW_HASHED_UNMODIFIED",
            })
        click(profile["open_path_click"])
        time.sleep(0.75)
        shot("04-dirty-open-modal-candidate.png")
        if sha(victim) != expected_victim or sha(unrelated) != expected_unrelated:
            raise RuntimeError("Existing TeX fixture was modified merely by opening modal!")
        report["steps"].append({
            "event": "dirty_scratch_open_existing_target", "status": "SENT_REAL_X11",
            "victim_unmodified": True, "modal": "SCREENSHOT_MANUAL_REVIEW_REQUIRED",
        })
        if args.mode == "bootstrap":
            report["status"] = "BOOTSTRAP_NOT_ACCEPTED"
            report["modal_save_open"] = "NOT_RUN"
            report["manual_visual_review"] = "NOT_RUN"
            return 0
        if profile.get("modal_save_input_click") is None or profile.get("modal_save_button_click") is None:
            raise RuntimeError("Modal was not independently screenshot-calibrated: FULL NOT_RUN")

        def modal_destination(path: Path) -> None:
            click(profile["modal_save_input_click"])
            key("ctrl+a")
            command(["xdotool", "type", "--clearmodifiers", "--delay", "5", str(path)])
            time.sleep(0.25)

        def still_safe(label: str) -> None:
            if sha(victim) != expected_victim or sha(unrelated) != expected_unrelated:
                raise RuntimeError(f"{label}: existing user TeX bytes were overwritten")
            if scratch_save.exists():
                raise RuntimeError(f"{label}: scratch file appeared before explicit acceptance")

        # Press actual Save and open modal button with *no* destination.
        click(profile["modal_save_button_click"])
        shot("05-reject-empty-save-destination.png")
        still_safe("empty Save-and-open")

        modal_destination(victim)
        click(profile["modal_save_button_click"])
        shot("06-reject-same-victim.png")
        still_safe("same Open-target destination")

        modal_destination(unrelated)
        click(profile["modal_save_button_click"])
        shot("07-reject-occupied-other.png")
        still_safe("other occupied user TeX")

        alias = out / "symlink-alias.tex"
        alias.symlink_to(victim)
        modal_destination(alias)
        click(profile["modal_save_button_click"])
        shot("08-reject-existing-symlink.png")
        still_safe("existing symlink alias")
        if not alias.is_symlink():
            raise RuntimeError("Existing alias symlink was destroyed")

        dangling = out / "dangling-symlink.tex"
        destination_missing = out / "should-remain-missing.tex"
        dangling.symlink_to(destination_missing)
        modal_destination(dangling)
        click(profile["modal_save_button_click"])
        shot("09-reject-dangling-symlink.png")
        still_safe("dangling symlink")
        if destination_missing.exists() or not dangling.is_symlink():
            raise RuntimeError("Dangling symlink was followed or replaced")

        # Distinct unoccupied destination is now explicit user permission.
        modal_destination(scratch_save)
        shot("10-explicit-safe-save-path.png")
        click(profile["modal_save_button_click"])
        deadline = time.monotonic() + 12
        while time.monotonic() < deadline and not scratch_save.is_file():
            time.sleep(0.2)
        if not scratch_save.is_file():
            raise RuntimeError("Real modal Save-and-open did not persist separate scratch source")
        if scratch_save.read_bytes() != SCRATCH.encode("utf-8"):
            raise RuntimeError("Modal save changed Unicode scratch source or unknown macro")
        if sha(victim) != expected_victim or sha(unrelated) != expected_unrelated:
            raise RuntimeError("Modal acceptance modified original/third-party document")
        time.sleep(0.8)
        shot("11-reopened-crlf-victim-source.png")

        # Source TextEdit must show the victim, not the previously-saved scratch,
        # even after Ctrl+Z, and native Undo must not resurrect a former file.
        click(profile["source_click"])
        key("ctrl+z")
        time.sleep(0.25)
        key("ctrl+a")
        key("ctrl+c")
        copied = subprocess.run(["xclip", "-selection", "clipboard", "-o"],
                                capture_output=True, timeout=5, check=True).stdout
        (out / "reopened-editor-copy.txt").write_bytes(copied)
        if b"OpaqueUserMacro" not in copied or b"ScratchMacro" in copied:
            raise RuntimeError("Undo switched editor to previous scratch or failed to reopen victim")
        shot("12-undo-after-reopen.png")
        click(profile["toolbar_save_click"])
        if sha(victim) != expected_victim or sha(unrelated) != expected_unrelated:
            raise RuntimeError("Post-open GUI Save rewrote/normalized original victim CRLF")
        report["modal_save_open"] = "PASS_REAL_X11_SAVE_SEPARATE_AND_REOPEN_UNDO_FENCED"
        report["steps"].append({
            "event": "six_real_modal_save_destinations_and_native_undo",
            "status": "PENDING_INDEPENDENT_SCREENSHOT_REVIEW",
            "scratch_save_sha256": sha(scratch_save),
            "victim_sha256": sha(victim),
            "clipboard_sha256": hashlib.sha256(copied).hexdigest(),
        })

        click(profile["toolbar_build_click"])
        shot("13-real-gui-xelatex-build.png")
        pdf = victim.with_suffix(".pdf")
        deadline = time.monotonic() + 150
        while time.monotonic() < deadline and not pdf.is_file():
            time.sleep(2)
            click(profile["toolbar_export_click"])
        if not pdf.is_file() or pdf.read_bytes()[:5] != b"%PDF-":
            raise RuntimeError("Actual GUI Build/Export did not produce XeLaTeX PDF")
        text = command(["pdftotext", "-enc", "UTF-8", str(pdf), "-"])
        fonts = command(["pdffonts", str(pdf)])
        (out / "pdf-extracted-text.txt").write_text(text, encoding="utf-8")
        (out / "pdf-fonts.txt").write_text(fonts, encoding="utf-8")
        if "Не менять оригинал" not in text or "yes" not in fonts:
            raise RuntimeError("External GUI XeLaTeX PDF lacks Cyrillic text or embedded font")
        if sha(victim) != expected_victim or sha(unrelated) != expected_unrelated:
            raise RuntimeError("GUI compile/export mutated original source CRLF bytes")
        shot("14-actual-gui-pdf-after-build.png")
        report["source_pdf_accepted"] = "PASS_REAL_GUI_XELATEX_PDF_BYTES_PENDING_VISUAL_REVIEW"
        report["pdf_sha256"] = sha(pdf)
        report["steps"].append({
            "event": "actual_xelatex_gui_build_export",
            "status": "PASS_PDF_CONTENT_FONT_SOURCE_HASH_PENDING_VISUAL_REVIEW",
        })
        report["status"] = "EVIDENCE_PENDING_MANUAL_VISUAL_REVIEW"
        return 0
    except Exception as exc:
        report["error"] = str(exc)
        report["status"] = "FAIL"
        return 1
    finally:
        report["final_victim_sha256"] = sha(victim)
        report["final_unrelated_sha256"] = sha(unrelated)
        report["final_scratch_save_exists"] = scratch_save.exists()
        report["artifact_sha256"] = {
            path.name: sha(path) for path in sorted(out.glob("*.png"))
        }
        report["artifact_sha256"].update({
            path.name: sha(path) for path in sorted(out.glob("*.pdf"))
        })
        (out / "report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        log.close()


if __name__ == "__main__":
    raise SystemExit(main())
