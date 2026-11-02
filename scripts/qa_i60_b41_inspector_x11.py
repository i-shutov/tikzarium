#!/usr/bin/env python3
"""I60 B41: independent real-X11 inspector transaction with source/PDF proof.

Coordinates are *candidates* from B40; the exact B41 app-tree lease is mandatory.
Screenshots are evidence for subsequent human review, not automatic visual PASS.
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

APP_TREE = "d290bdad0de0058b538a26be0209a97f2626f76a"
SRC = ("\n".join((
    r"\documentclass{standalone}",
    r"\usepackage{fontspec}",
    r"\setmainfont{DejaVu Serif}",
    r"\usepackage{tikz}",
    r"\usetikzlibrary{arrows.meta}",
    "% I60 preserved original opaque UTF-8 source",
    r"\newcommand{\OpaqueLabel}{Не менять}",
    r"\begin{document}",
    r"\begin{tikzpicture}",
    r"  \node at (0,0) {\OpaqueLabel};",
    r"\end{tikzpicture}",
    r"\end{document}", ""
))).encode("utf-8")
CONTROL = SRC.replace(
    b"% I60 preserved original opaque UTF-8 source",
    b"% I60 alternative CRLF document\r\n% I60 preserved original opaque UTF-8 source"
).replace(b"\n", b"\r\n").replace(b"\r\r\n", b"\r\n")


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def invoke(*argv: str, timeout: float = 20) -> bytes:
    result = subprocess.run(argv, capture_output=True, timeout=timeout, check=False)
    if result.returncode:
        raise RuntimeError(f"{argv[0]} ({result.returncode}): "
                           + result.stderr.decode("utf-8", "replace")[-1800:])
    return result.stdout


def until(predicate, name: str, seconds: float = 20) -> None:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.25)
    raise RuntimeError("Timed out: " + name)


def owned_circle(source: bytes) -> bytes:
    kept, drawn = [], []
    for line in source.splitlines(keepends=True):
        if b"% tikzarium:n1:" in line:
            if not line.lstrip().startswith(b"\\draw ") or b"circle[radius=" not in line:
                raise AssertionError("Unexpected generated TikZ command")
            drawn.append(line)
        else:
            kept.append(line)
    if len(drawn) != 1 or b"".join(kept) != SRC:
        raise AssertionError("Circle insertion altered opaque original source bytes")
    return drawn[0]


def assert_only_circle_radius(before: bytes, after: bytes) -> None:
    old = owned_circle(before)
    new = owned_circle(after)
    if (new == old or old.count(b"radius=1.00cm") != 1
            or old.count(b'"radius":"1.00cm"') != 1):
        raise AssertionError("Expected code plus C-owned radius metadata")
    expected = old.replace(b"radius=1.00cm", b"radius=2.75cm", 1)
    expected = expected.replace(b'"radius":"1.00cm"', b'"radius":"2.75cm"', 1)
    if new != expected:
        raise AssertionError("Apply changed more than Circle radius and C metadata")
    if after.replace(new, old, 1) != before:
        raise AssertionError("Apply affected unrelated source bytes or marker")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--app", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--profile", required=True, type=Path)
    args = parser.parse_args()
    app = args.app.resolve(strict=True)
    out = args.out.resolve()
    if out.exists() and any(out.iterdir()):
        parser.error("Evidence directory must be empty")
    out.mkdir(parents=True, exist_ok=True)
    profile = json.loads(args.profile.read_text(encoding="utf-8"))
    actual_tree = os.environ.get("TIKZARIUM_APP_TREE_SHA", "")
    if actual_tree != APP_TREE or profile.get("app_tree") != actual_tree:
        parser.error("B41 app/src tree lease changed: screenshot targets NOT_RUN")
    for key in ("source", "path", "save", "open", "build", "export", "circle",
                "guide_start", "guide_end", "radius", "apply", "undo",
                "pdf_fit_page"):
        xy = profile.get(key)
        if (not isinstance(xy, list) or len(xy) != 2
                or any(type(v) is not int for v in xy)
                or not (0 <= xy[0] < 1366 and 0 <= xy[1] < 740)):
            parser.error("Missing or invalid provisional GUI coordinate: " + key)

    doc = out / "circle-authoring.tex"
    control = out / "alternate-crlf.tex"
    control.write_bytes(CONTROL)
    log = (out / "app.log").open("wb")
    report = {
        "schema": 1, "status": "FAIL",
        "source_sha": os.environ.get("TIKZARIUM_SOURCE_SHA", "UNKNOWN"),
        "reviewed_app_tree": actual_tree,
        "app_sha256": digest(app.read_bytes()),
        "host": platform.platform(),
        "gui": "actual egui/X11 process, not egui RawInput UNIT_EVENT",
        "coordinate_review": "PROVISIONAL_B40_DERIVED__B41_SCREENSHOTS_PENDING",
        "human_visual_review": "NOT_RUN",
        "physical_win10_miktex": "NOT_RUN",
        "physical_macos_arm_xelatex": "NOT_RUN",
        "steps": [],
    }
    env = os.environ.copy()
    env.update({
        "XDG_CONFIG_HOME": str(out / "config"),
        "XDG_DATA_HOME": str(out / "data"),
        "XDG_CACHE_HOME": str(out / "cache"),
        "LIBGL_ALWAYS_SOFTWARE": "1",
        "WINIT_UNIX_BACKEND": "x11",
    })
    env.pop("WAYLAND_DISPLAY", None)
    process = None
    window = None

    try:
        process = subprocess.Popen([str(app)], env=env, stdout=log, stderr=log)

        def find_window() -> bool:
            nonlocal window
            if process.poll() is not None:
                raise RuntimeError("TikZarium exited before X11 window appeared")
            r = subprocess.run(
                ["xdotool", "search", "--onlyvisible", "--pid", str(process.pid),
                 "--name", "TikZarium"], capture_output=True, timeout=5)
            if r.returncode == 0 and r.stdout.strip():
                window = r.stdout.decode().splitlines()[-1]
                return True
            return False

        until(find_window, "real egui window", 50)
        invoke("xdotool", "windowsize", "--sync", window, "1366", "740")
        invoke("xdotool", "windowmove", window, "0", "0")
        try:
            invoke("xdotool", "windowactivate", "--sync", window)
        except RuntimeError:
            invoke("xdotool", "windowfocus", "--sync", window)
        if int(invoke("xdotool", "getwindowfocus").strip()) != int(window):
            raise RuntimeError("X11 keyboard focus not on actual TikZarium window")

        def screenshot(name: str) -> None:
            p = out / name
            invoke("import", "-window", window, str(p))
            if not p.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"):
                raise RuntimeError("Screenshot missing: " + name)

        def click(which: str) -> None:
            x, y = profile[which]
            invoke("xdotool", "mousemove", "--window", window, str(x), str(y))
            invoke("xdotool", "click", "1")
            time.sleep(0.35)

        def key(seq: str) -> None:
            invoke("xdotool", "key", "--clearmodifiers", seq)
            time.sleep(0.25)

        def clip_set(payload: bytes, label: str) -> None:
            path = out / ("clipboard-" + label + ".txt")
            path.write_bytes(payload)
            subprocess.run(
                ["xclip", "-selection", "clipboard", "-i", str(path)],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                timeout=6, check=True)

        def clip_get() -> bytes:
            return invoke("xclip", "-selection", "clipboard", "-o", timeout=6)

        def path_field(target: Path) -> None:
            clip_set(os.fsencode(target), "path")
            click("path")
            key("ctrl+a")
            key("ctrl+v")
            key("ctrl+a")
            key("ctrl+c")
            until(lambda: clip_get() == os.fsencode(target),
                  "complete GUI Path TextEdit clipboard verification", 8)

        def source_field() -> bytes:
            click("source")
            key("ctrl+a")
            key("ctrl+c")
            return clip_get()

        def save(expected: bytes, case: str) -> None:
            click("save")
            until(lambda: doc.is_file() and doc.read_bytes() == expected,
                  case + " GUI Save exact bytes", 12)
            report["steps"].append(case + ":PASS_GUI_SAVED_SHA256=" + digest(expected))

        def open_document(target: Path, expected: bytes, label: str) -> None:
            path_field(target)
            click("open")
            time.sleep(0.7)
            actual = source_field()
            if actual != expected or target.read_bytes() != expected:
                raise AssertionError(label + " actual GUI Open/source clipboard mismatch")
            screenshot(label + ".png")
            report["steps"].append(label + ":PASS_ACTUAL_GUI_OPEN_AND_SOURCE_CLIPBOARD")

        screenshot("01-startup.png")
        clip_set(SRC, "initial")
        click("source")
        key("ctrl+a")
        key("ctrl+v")
        path_field(doc)
        save(SRC, "02-pasted-source")
        screenshot("02-source-saved.png")

        click("circle")
        screenshot("03-circle-tool-selected.png")
        sx, sy = profile["guide_start"]
        ex, ey = profile["guide_end"]
        invoke("xdotool", "mousemove", "--window", window, str(sx), str(sy))
        invoke("xdotool", "mousedown", "1")
        time.sleep(0.25)
        invoke("xdotool", "mousemove", "--window", window, str(ex), str(ey))
        time.sleep(0.25)
        invoke("xdotool", "mouseup", "1")
        time.sleep(0.4)
        inserted = source_field()
        owned_circle(inserted)
        save(inserted, "04-native-circle-gesture")
        screenshot("04-circle-inspector.png")

        # Edit actual inspector TextEdit, then prove the source is still
        # unchanged prior to B41 pinned Apply. A screenshot is not enough.
        clip_set(b"2.75cm", "radius")
        click("radius")
        key("ctrl+a")
        key("ctrl+v")
        key("ctrl+a")
        key("ctrl+c")
        until(lambda: clip_get() == b"2.75cm",
              "actual inspector radius TextEdit input", 8)
        screenshot("05-pending-draft.png")
        if source_field() != inserted:
            raise AssertionError("Inspector draft silently changed authoritative TeX")
        save(inserted, "05-uncommitted-draft-does-not-save")

        click("apply")
        screenshot("06-pinned-apply-clicked.png")
        applied = source_field()
        assert_only_circle_radius(inserted, applied)
        save(applied, "06-one-C-catalogue-parameter-patch")
        report["steps"].append("apply:PASS_ONE_NATIVE_RADIUS_PATCH")
        screenshot("07-applied-source.png")

        click("source")
        key("ctrl+z")
        if source_field() != applied:
            raise AssertionError("Stale TextEdit Ctrl+Z reverted C-owned patch")
        save(applied, "08-native-source-ctrl-z-fence")
        click("undo")
        undone = source_field()
        if undone != inserted:
            raise AssertionError("Actual visual Undo did not restore prior Circle bytes")
        save(inserted, "09-visual-undo")
        screenshot("09-undone.png")

        # Real GUI Open of two distinct paths; CRLF user file must remain
        # intact across unrelated UI work, and no hidden source normalization.
        open_document(control, CONTROL, "10-alternate-crlf-open")
        click("save")
        if control.read_bytes() != CONTROL:
            raise AssertionError("GUI Save normalized untouched CRLF original")
        open_document(doc, inserted, "11-original-reopened")
        # B41 F1 must work without an active tool after real GUI Open.
        key("F1")
        screenshot("11b-generic-F1-after-Open.png")
        if (out / "11-original-reopened.png").read_bytes() == (
                out / "11b-generic-F1-after-Open.png").read_bytes():
            raise AssertionError("F1 after GUI Open rendered no visible general help")
        key("F1")
        if control.read_bytes() != CONTROL or doc.read_bytes() != inserted:
            raise AssertionError("GUI Open/Save changed an unrelated user file")

        # Only an actual external XeLaTeX PDF can establish authoritative
        # output; source editing and provisional guide are not a PDF proof.
        click("build")
        screenshot("12-build-clicked.png")
        pdf = doc.with_suffix(".pdf")
        deadline = time.monotonic() + 170
        while time.monotonic() < deadline and not pdf.is_file():
            time.sleep(2)
            click("export")
        if not pdf.is_file() or not pdf.read_bytes().startswith(b"%PDF-"):
            raise RuntimeError("Actual GUI failed to produce external XeLaTeX PDF")
        txt = invoke("pdftotext", "-enc", "UTF-8", str(pdf), "-")
        fonts = invoke("pdffonts", str(pdf))
        if "Не менять".encode() not in txt or b"yes" not in fonts:
            raise AssertionError("XeLaTeX PDF lost Cyrillic glyph or embedded font")
        report["pdf_sha256"] = digest(pdf.read_bytes())
        report["pdf"] = "REAL_GUI_EXTERNAL_XELATEX_PDF_CYRILLIC_FONT_PASS"
        screenshot("13-external-pdf.png")
        # The PDF pane can be white at the exact Export frame even though
        # Poppler proves ink in the file. Probe a real Fit Page control and
        # retain evidence; never label a blank screenshot as preview PASS.
        click("pdf_fit_page")
        time.sleep(1.2)
        screenshot("13b-pdf-fit-page-after-raster.png")
        report["pdf_preview"] = "SCREENSHOT_REVIEW_PENDING"

        # Reopen resets the active tool: blindly pressing F1 afterward can
        # generate an identical frame, i.e. no help action at all. Select the
        # real Circle palette item before checking the native F1 shortcut.
        click("circle")
        screenshot("14a-circle-selected-before-f1.png")
        key("F1")
        screenshot("14b-russian-f1.png")
        if (out / "14a-circle-selected-before-f1.png").read_bytes() == (
                out / "14b-russian-f1.png").read_bytes():
            raise AssertionError("F1 key produced byte-identical screenshot; help NOT proven")
        report["f1"] = "REAL_X11_EVENT_FRAME_CHANGED__RUSSIAN_DETAILS_REVIEW_PENDING"
        if source_field() != inserted or doc.read_bytes() != inserted:
            raise AssertionError("F1/help or PDF altered committed source")
        if control.read_bytes() != CONTROL:
            raise AssertionError("Untouched CRLF control file changed")
        report["status"] = "PASS_AUTOMATED_REAL_X11_SCREENSHOT_REVIEW_PENDING"
    except Exception as error:
        report["error"] = type(error).__name__ + ": " + str(error)
        if window is not None:
            try:
                invoke("import", "-window", window, str(out / "failure.png"), timeout=8)
            except Exception:
                pass
    finally:
        if process is not None and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        log.close()
        report["file_hashes"] = {
            p.name: digest(p.read_bytes()) for p in out.iterdir()
            if p.is_file() and p.name != "i60-report.json"
        }
        (out / "i60-report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"].startswith("PASS_") else 1


if __name__ == "__main__":
    raise SystemExit(main())
