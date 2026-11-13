#!/usr/bin/env python3
"""Owned-production-PID PGFPlots Inspector, Undo, reopen and GUI XeLaTeX proof.

Bounded hosted Linux/X11 observations only. Original source, PNG, PDF, clipboard,
engine recorder and logs survive failed assertions. No compiler is run by this
driver: Ctrl+Return and current Export are actual production GUI actions.
"""
from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import threading
import time

import qa_pgfplots_vertical_evidence as evidence
import qa_at4_scientific_invariants as at4_science
import qa_sci_compact_x11 as common
from qa_i61_b42_studio_x11 import audit_embedded_fonts, x11_button1_mask, x11_button1_pressed
from qa_n2_studio_x11 import expected_elf, validate_xelatex_log

POINTS = {**common.POINTS, "source_full_source": (490, 174),
          "property": (1020, 353), "draft": (1020, 428)}
MENU_ROW = 30  # production compact interact_size.y26 + item_spacing.y4
MENU_BACKGROUND = (26, 36, 53)  # exact default Midnight popup fill
MENU_STRIP_X = 949  # frame's left padding; outside selectable-row hover fills


class StrictXeLaTeXWarningError(RuntimeError):
    """A completed case retained its evidence but failed the strict glyph gate."""


def run_suite(driver, suite: str) -> None:
    """Collect independent cases after a retained warning, never turn it into PASS.

    Every other exception still aborts immediately. In particular, source,
    clipboard, process identity, engine success, fonts and recorder checks must
    all succeed before build() can raise the one recoverable case error.
    """
    failures = driver.report.setdefault("strict_warning_failures", [])
    for index, fixture in enumerate(evidence.fixtures_for_suite(suite)):
        try:
            driver.run_case(fixture, initial=index == 0)
        except StrictXeLaTeXWarningError as error:
            build = driver.report.get("builds", {}).get(fixture, {})
            if (driver.current_stage != fixture + "/built"
                    or build.get("status") != "FAIL_STRICT_XELATEX_WARNING_GATE"
                    or build.get("strict_xelatex_warning_gate") != "FAIL"):
                raise RuntimeError("Strict warning continuation lacks completed case proof") from error
            failure = {"fixture": fixture, "failed_stage": driver.current_stage,
                       "error": str(error), "status": "FAIL_STRICT_XELATEX_WARNING_GATE"}
            failures.append(failure)
            driver.report.update(status="FAIL_STRICT_XELATEX_WARNING_GATE",
                                 native_acceptance="NOT_ACCEPTED_STRICT_XELATEX_WARNINGS")
            driver.event("strict_warning_case_failed_evidence_retained", **failure)
    driver.report.update(evidence.validate_all(driver.out, suite=suite))
    if failures:
        driver.report.update(status="FAIL_STRICT_XELATEX_WARNING_GATE",
                             native_acceptance="NOT_ACCEPTED_STRICT_XELATEX_WARNINGS")


def popup_strip_bounds(pixels: list[tuple[int, int, int]]) -> tuple[int, int]:
    """Unique exact-color popup padding run; no OCR/fuzzy/text matching.

    Scope is default Midnight1180x680 only. Full original desktop images remain
    the authoritative review evidence; this structural check only bounds input.
    """
    runs = []
    start = None
    for index, pixel in enumerate([*pixels, (-1, -1, -1)]):
        if tuple(pixel) == MENU_BACKGROUND:
            if start is None:
                start = index
        elif start is not None:
            if index - start >= 35:
                runs.append((start, index - start))
            start = None
    if len(runs) != 1:
        raise RuntimeError(f"Expected one bounded exact Midnight popup strip, observed {len(runs)}")
    return runs[0]


def property_menu_plan(index: int, count: int, strip_top: int, strip_height: int,
                       scroll_interval: tuple[float, float] = (0, 0)) -> dict:
    if count not in (3, 15) or not 0 <= index < count:
        raise ValueError("Property menu choice outside approved3/15 inventory")
    # combo_height is a maximum, not the observed viewport: egui can retain
    # a shorter popup after the same ComboBox previously showed three choices.
    content = count * MENU_ROW - 4
    viewport = strip_height - 10
    if not 3 * MENU_ROW - 4 <= viewport <= min(content, 200):
        raise RuntimeError("Actual popup height differs from scoped compact menu geometry")
    maximum = content - viewport
    low, high = scroll_interval
    if not 0 <= low <= high <= maximum:
        raise RuntimeError("Observed scrollbar offset outside actual content boundaries")
    viewport_top = strip_top + 5
    # Intersection of the row's interior for EVERY offset permitted by the
    # raster observation. A clipped/uncertain row is positioned before input.
    safe_low = math.ceil(max(viewport_top + 2, viewport_top + index * MENU_ROW - low + 2))
    safe_high = math.floor(min(viewport_top + viewport - 2,
                              viewport_top + index * MENU_ROW + 26 - high - 2))
    target = (safe_low + safe_high) // 2 if safe_high - safe_low >= 4 else None
    return {"index": index, "count": count, "strip_top": strip_top,
            "strip_height": strip_height, "viewport_top": viewport_top,
            "viewport_height": viewport, "content_height": content, "maximum_scroll": maximum,
            "observed_scroll_interval": [low, high], "target_client_y": target,
            "desired_scroll": min(max(index * MENU_ROW + 13 - viewport / 2, 0), maximum)}


def observe_property_popup(pixels, origin: tuple[int, int], index: int, count: int,
                           *, allow_hidden_scrollbar=False) -> dict:
    """Exact padding/scrollbar probes on an original screenshot; no OCR.

    Scope stays Midnight/scale1/1180x680, closed 3/15 inventories. Scrollbar
    mapping follows egui0.33.3's content/viewport geometry, never wheel ticks.
    """
    if pixels.size != evidence.SCREEN:
        raise RuntimeError("Popup observation requires the declared original desktop geometry")
    def pixel(x, y):
        if not 0 <= x < evidence.CLIENT[0] or not 0 <= y < evidence.CLIENT[1]:
            raise RuntimeError("Popup probe exceeds declared client geometry")
        return pixels.getpixel((origin[0] + x, origin[1] + y))
    top, height = popup_strip_bounds([pixel(MENU_STRIP_X, y) for y in range(evidence.CLIENT[1])])
    plan = property_menu_plan(index, count, top, height)
    right = MENU_STRIP_X
    while right < evidence.CLIENT[0] and pixel(right, top + 1) == MENU_BACKGROUND:
        right += 1
    if not MENU_STRIP_X + 150 <= right < evidence.CLIENT[0]:
        raise RuntimeError("Popup padding right edge is missing or outside scoped menu width")
    plan["popup_right_client_x"] = right
    if not plan["maximum_scroll"]:
        return plan
    # Two adjacent columns in the observed right padding's floating scrollbar.
    # Closed Russian property labels do not enter this band. Track/handle colors
    # may change on hover, but only the handle has all RGB channels >=120.
    bounds = []
    track_top = plan["viewport_top"]
    track_end = track_top + plan["viewport_height"]
    for x in (right - 7, right - 6):
        foreground = [y for y in range(track_top, track_end) if min(pixel(x, y)) >= 120]
        if foreground:
            if foreground != list(range(foreground[0], foreground[-1] + 1)):
                raise RuntimeError("Observed scrollbar thumb is split/ambiguous")
            bounds.append((foreground[0], foreground[-1] + 1))
    if not bounds and allow_hidden_scrollbar:
        return {**plan, "target_client_y": None, "scrollbar_observed": False}
    if len(bounds) != 2 or any(abs(bounds[0][i] - bounds[1][i]) > 2 for i in (0, 1)):
        raise RuntimeError("Expected one bounded scrollbar thumb in both observed columns")
    thumb_top, thumb_end = min(b[0] for b in bounds), max(b[1] for b in bounds)
    handle = max(plan["viewport_height"] ** 2 / plan["content_height"], 12)
    # Rounded ends plus raster rounding can remove up to two pixels per end.
    if abs((thumb_end - thumb_top) - handle) > 4:
        raise RuntimeError("Observed scrollbar thumb length differs from source-grounded content")
    # Raster rounding and rounded handle ends bound its ideal top position.
    ideal_low = max(thumb_top - 2.5, thumb_end - handle - .5, track_top)
    ideal_high = min(thumb_top + .5, thumb_end - handle + 2.5, track_end - handle)
    if ideal_low > ideal_high:
        raise RuntimeError("Observed scrollbar endpoints have no consistent offset interval")
    travel = plan["viewport_height"] - handle
    ratio = plan["maximum_scroll"] / travel
    interval = tuple(min(max((position - track_top) * ratio, 0), plan["maximum_scroll"])
                     for position in (ideal_low, ideal_high))
    plan = {**plan, **property_menu_plan(index, count, top, height, interval),
            "scrollbar_observed": True, "thumb_top": thumb_top, "thumb_end": thumb_end,
            "scrollbar_client_x": right - 7, "source_handle_height": handle}
    plan["scrollbar_target_client_y"] = round(track_top + handle / 2
        + plan["desired_scroll"] / plan["maximum_scroll"] * travel)
    return plan


def recorder_inputs(data: bytes, cwd: Path) -> set[Path]:
    text = data.decode("utf-8", "strict")
    pwd = next((Path(line[4:]) for line in text.splitlines() if line.startswith("PWD ")), cwd)
    return {(Path(line[6:]) if Path(line[6:]).is_absolute() else pwd / line[6:]).resolve()
            for line in text.splitlines() if line.startswith("INPUT ")}


class RecorderWatcher:
    """Read-only bounded copies of real engine .fls before BuildService cleanup.

    TMPDIR belongs solely to this production process. Every distinct snapshot is
    retained as exact bytes; a partial recorder cannot certify a build unless it
    contains the actual source and all required project dependencies.
    """
    def __init__(self, temporary: Path, out: Path):
        self.temporary = temporary
        self.out = out
        temporary.mkdir()
        out.mkdir()
        self.done = threading.Event()
        self.thread = threading.Thread(target=self.watch, daemon=True)
        self.seen = set()
        self.records = []
        self.error = None

    def watch(self):
        try:
            while not self.done.is_set():
                for path in self.temporary.rglob("*"):
                    if path.suffix not in (".fls", ".log"):
                        continue
                    try:
                        raw = path.read_bytes()
                    except FileNotFoundError:
                        continue
                    identity = (str(path), evidence.digest(raw))
                    if identity in self.seen:
                        continue
                    if len(raw) > 8_000_000 or len(self.records) >= 512:
                        raise RuntimeError("Actual engine recorder retention exceeded bounded budget")
                    self.seen.add(identity)
                    destination = self.out / f"engine-{len(self.records):04d}.original{path.suffix}"
                    destination.write_bytes(raw)
                    captured_sources = {}
                    if path.suffix == ".fls":
                        for source in recorder_inputs(raw, self.temporary):
                            if source.suffix == ".tex" and source.is_relative_to(self.temporary.parent / "live"):
                                try:
                                    contents = source.read_bytes()
                                except FileNotFoundError:
                                    continue
                                retained = destination.with_suffix("." + source.parent.name + ".input-source.original.tex")
                                retained.write_bytes(contents)
                                captured_sources[str(source)] = {"retained": str(retained), "sha256": evidence.digest(contents)}
                    self.records.append({"original_path": str(path), "retained": str(destination),
                                         "kind": path.suffix, "sha256": evidence.digest(raw),
                                         "captured_sources": captured_sources, "captured_utc": evidence.now()})
                self.done.wait(0.01)
        except Exception as error:
            self.error = str(error)

    def start(self):
        self.thread.start()

    def stop(self):
        self.done.set()
        if self.thread.ident is not None:
            self.thread.join(timeout=5)
        evidence.write_json(self.out / "recorder-captures.json", {"snapshots": self.records, "error": self.error})

    def proof(self, source: Path, expected: bytes, dependencies: dict[str, str]) -> dict:
        if self.error:
            raise RuntimeError("Engine recorder watcher failed: " + self.error)
        required = {source.resolve(), *(source.parent / name for name in dependencies)}
        matching = []
        for record in list(self.records):
            path = Path(record["retained"])
            if path.suffix != ".fls":
                continue
            if evidence.sha(path) != record["sha256"]:
                raise RuntimeError("Retained engine recorder hash differs from captured original")
            if required.issubset(recorder_inputs(path.read_bytes(), source.parent)):
                captured = record.get("captured_sources", {}).get(str(source.resolve()))
                if not captured or captured["sha256"] != evidence.digest(expected) or evidence.sha(Path(captured["retained"])) != evidence.digest(expected):
                    continue
                matching.append(record)
        if not matching:
            raise RuntimeError("No original GUI engine recorder contains source and all actual table inputs")
        if source.read_bytes() != expected or evidence.dependency_hashes(source.parent, source.stem) != dependencies:
            raise RuntimeError("GUI source/dependencies changed during engine recorder observation")
        return {"recorder": matching[-1], "compiled_author_source": str(source.resolve()),
                "compiled_source_sha256": evidence.digest(expected),
                "compile_source_mode": "BUILD_SERVICE_DIRECT_SAVED_AUTHOR_SOURCE",
                "required_input_paths": sorted(map(str, required)), "dependency_sha256": dependencies}


class Driver(common.Driver):
    def __init__(self, args, provenance):
        self.args = args
        self.out = args.out.resolve()
        self.raw = self.out / "raw"
        self.raw.mkdir()
        self.live = self.out / "live"
        first = evidence.fixtures_for_suite(args.suite)[0]
        self.source = self.live / first / (first + ".tex")
        self.provenance = provenance
        self.points = POINTS.copy()
        if args.coordinates:
            overrides = evidence.read_json(args.coordinates)
            if overrides.get("app_tree_sha") != provenance["app_tree_sha"]:
                raise ValueError("Coordinate file requires the actual production app tree")
            for name, point in overrides["points"].items():
                if name not in self.points or len(point) != 2 or any(type(v) is not int for v in point):
                    raise ValueError("Invalid coordinate override: " + name)
                self.points[name] = tuple(point)
            shutil.copyfile(args.coordinates, self.raw / "coordinate-input.json")
        if any(not (0 <= x < evidence.CLIENT[0] and 0 <= y < evidence.CLIENT[1]) for x, y in self.points.values()):
            raise ValueError("Coordinates exceed declared client")
        self.base_points = self.points.copy()
        self.action_file = (self.out / "native-actions.jsonl").open("w", encoding="utf-8", buffering=1)
        self.app_log = (self.out / "app.log").open("wb")
        self.process = self.window = self.geometry = None
        self.serial = 0
        self.current_stage = "startup"
        self.fixture = first
        self.report = {"schema_version": 2, "scope": evidence.suite_scope(args.suite),
                       "suite": args.suite, "status": "FAIL",
                       "host": platform.platform(), "coordinates": self.points,
                       "screen": evidence.SCREEN, "client": evidence.CLIENT,
                       "aggregate_sc3_at4": "NOT_VERIFIED", "physical_win10": "NOT_RUN",
                       "physical_mac_arm": "NOT_RUN", "independent_visual_review": "REQUIRED",
                       "operation_count": len(evidence.operation_inventory(args.suite)),
                       "builds": {}, **provenance}
        if args.suite == "v2":
            self.report["sv040"] = "BUILD_PRESERVATION_ONLY_NO_PGF_INSPECTOR"
        self.watcher = RecorderWatcher(self.out / "engine-tmp", self.out / "engine-originals")

    def start(self):
        previous = os.environ.get("TMPDIR")
        os.environ["TMPDIR"] = str(self.watcher.temporary)
        try:
            super().start()
        finally:
            if previous is None:
                os.environ.pop("TMPDIR", None)
            else:
                os.environ["TMPDIR"] = previous
        elf = expected_elf(self.args.app)
        proc_exe = Path(f"/proc/{self.process.pid}/exe")
        if elf.name != "tikzarium-app" or proc_exe.resolve(strict=True) != elf or evidence.sha(proc_exe) != evidence.sha(elf):
            raise RuntimeError("Owned PID executable differs from production ELF")
        self.report.update({"pid": self.process.pid, "window": self.window,
                            "observed_proc_exe": str(proc_exe.resolve()),
                            "observed_proc_exe_sha256": evidence.sha(proc_exe)})
        self.watcher.start()

    def stage(self, name: str, expected: bytes, action: str):
        self.current_stage = self.fixture + "/" + name
        self.key("ctrl+s")
        deadline = time.monotonic() + 4
        while time.monotonic() < deadline and self.source.read_bytes() != expected:
            self.alive()
            time.sleep(0.1)
        image = self.screenshot(self.fixture + "-" + name)
        editor = self.copy_editor(self.fixture + "-" + name)
        evidence.record(self.out, self.fixture, name, self.source, editor, image, action=action)

    def open_case(self, fixture: str, *, initial=False):
        self.fixture = fixture
        self.source = self.live / fixture / (fixture + ".tex")
        self.points = self.base_points.copy()
        self.click("file_menu")
        self.click("file_path")
        self.key("ctrl+a")
        self.paste(str(self.source).encode(), "open-" + fixture)
        self.key("Escape")
        self.key("ctrl+o")
        time.sleep(0.7)
        self.screenshot(fixture + "-open-before-decision")
        if initial:
            self.event("explicit_discard_of_fresh_quickstart_only")
            self.click("dirty_discard")
            time.sleep(0.6)
        self.enable_full_source_after_load()
        self.stage("opened", evidence.fixture_bytes(fixture), "Native File path/Open, full-source, fresh-sentinel editor Copy and GUI Save")

    def popup_pointer(self, x: int, y: int):
        self.owned_focus()
        common.run("xdotool", "mousemove", "--window", self.window, str(x), str(y))
        location = common.run("xdotool", "getmouselocation", "--shell")
        pointer = dict(line.split("=", 1) for line in location.splitlines() if "=" in line)
        actual = (int(pointer["X"]), int(pointer["Y"]))
        if actual != (self.geometry["X"] + x, self.geometry["Y"] + y):
            raise RuntimeError("Popup pointer differs from actual client origin")
        return actual

    def popup_wheel(self, x: int, y: int, button: int, ticks: int):
        actual = self.popup_pointer(x, y)
        self.event("native_popup_wheel", button=button, ticks=ticks,
                   actual_root_xy=actual, client_xy=(x, y), scroll_amount="UNASSUMED_OBSERVE_THUMB")
        common.run("xdotool", "click", "--repeat", str(ticks), "--delay", "20", str(button))
        time.sleep(0.8)

    def popup_drag(self, start: tuple[int, int], end: tuple[int, int]):
        # ComboBox CloseOnClick closes on a track click. A real held drag
        # exceeding egui's 6px click distance moves the observed handle instead.
        if start[0] != end[0] or abs(end[1] - start[1]) < 8:
            raise RuntimeError("Observed scrollbar drag must exceed the click threshold")
        actual_start = self.popup_pointer(*start)
        self.event("native_popup_scrollbar_drag_begin", start=start, end=end, actual_root_xy=actual_start)
        try:
            common.run("xdotool", "mousedown", "1")
            for phase, point in (("pressed", start), ("moved", end)):
                if phase == "moved":
                    actual_end = self.popup_pointer(*point)
                    self.event("native_popup_scrollbar_drag_pointer", client_xy=point, actual_root_xy=actual_end)
                time.sleep(0.20)  # Same native gesture cadence as qualified I61.
                mask = x11_button1_mask()
                self.event("actual_popup_primary_button", phase=phase, mask=mask)
                if not x11_button1_pressed(mask):
                    raise RuntimeError("X11 server did not retain primary button during popup drag")
        finally:
            common.run("xdotool", "mouseup", "1")
        time.sleep(0.35)
        self.event("native_popup_scrollbar_drag_end")

    def combo_index(self, name: str, index: int, *, count: int | None = None):
        self.click(name)
        image = self.screenshot(self.fixture + "-" + name + "-menu")
        if name == "candidate":
            if not 0 <= index <= 2:
                raise ValueError("Native candidate click exceeds observed first3 rows")
            x, first = self.points["first_axis"]
            self.points["menu_item"] = (x, first + MENU_ROW * index)
            self.event("native_candidate_row", first_row_client_y=first, row_spacing=MENU_ROW,
                       index=index, original_popup=str(image.relative_to(self.out)))
        else:
            if common.audit.Image is None:
                raise RuntimeError("Existing Pillow required for bounded original-popup geometry")
            def observe(path, *, allow_hidden=False):
                with common.audit.Image.open(path) as opened:
                    return observe_property_popup(opened.convert("RGB"),
                        (self.geometry["X"], self.geometry["Y"]), index, count,
                        allow_hidden_scrollbar=allow_hidden)
            plan = observe(image, allow_hidden=True)
            observed_image = image
            if plan["maximum_scroll"]:
                pointer_y = plan["viewport_top"] + plan["viewport_height"] // 2
                self.popup_wheel(self.points[name][0], pointer_y, 4, 20)
                observed_image = self.screenshot(self.fixture + "-property-menu-reset-top")
                plan = observe(observed_image)
                if plan["thumb_top"] > plan["viewport_top"] + 1:
                    raise RuntimeError("Actual popup reset was not observed at the top boundary")
                if plan["target_client_y"] is None:
                    y = plan["scrollbar_target_client_y"]
                    x = plan["scrollbar_client_x"]
                    start = (x, (plan["thumb_top"] + plan["thumb_end"]) // 2)
                    self.popup_drag(start, (x, y))
                    observed_image = self.screenshot(self.fixture + "-property-menu-positioned-target")
                    plan = observe(observed_image)
            if plan["target_client_y"] is None:
                raise RuntimeError("Target row has no safely visible interior in the actual popup")
            self.points["menu_item"] = (self.points[name][0], plan["target_client_y"])
            self.event("native_property_popup_plan", **plan, original_popup=str(image.relative_to(self.out)),
                       final_observed_popup=str(observed_image.relative_to(self.out)),
                       exact_padding_strip_client_x=MENU_STRIP_X)
        if not 0 <= self.points["menu_item"][1] < evidence.CLIENT[1]:
            raise RuntimeError("Actual popup item outside declared client")
        self.click("menu_item")
        self.screenshot(self.fixture + "-" + name + "-selected")

    def field_copy(self, detail: str, expected: bytes):
        self.clipboard(b"__PGF_FIELD_FRESH_SENTINEL__", "field-sentinel")
        self.key("ctrl+a")
        self.key("ctrl+c")
        observed = common.run_bytes("xclip", "-selection", "clipboard", "-o")
        self.serial += 1
        path = self.raw / f"{self.serial:03d}-{detail}-field.txt"
        path.write_bytes(observed)
        self.event("focused_field_clipboard", file=str(path.relative_to(self.out)),
                   sha256=evidence.sha(path), expected_utf8=expected.decode(), matches=observed == expected)
        if observed != expected:
            raise RuntimeError("Focused Inspector field does not equal expected literal: " + detail)

    def select_operation(self, operation: evidence.Operation):
        self.click("inspector_properties")
        current = self.screenshot(operation.name + "-before-scan")
        reference = self.out / "observed" / self.fixture / "opened/desktop.original.png"
        proof = common.unique_scan_glyph_offset(reference, current,
            (self.geometry["X"], self.geometry["Y"]), self.raw / (operation.name + "-scan-calibration.json"))
        for name in ("scan", "candidate", "first_axis", "property", "draft", "apply"):
            x, y = self.base_points[name]
            self.points[name] = (x, y + proof["offset_y"])
            if not 0 <= self.points[name][1] < evidence.CLIENT[1]:
                raise RuntimeError("Calibrated point outside bounded client")
        self.click("scan")
        self.screenshot(operation.name + "-scanned")
        self.combo_index("candidate", operation.command)
        self.combo_index("property", operation.property_index,
                         count=len(evidence.AXIS_KEYS if operation.kind == "axis" else evidence.ADDPLOT_KEYS))
        self.click("draft")
        self.field_copy(operation.name + "-original", operation.before.encode())
        before = self.screenshot(operation.name + "-before-f1")
        self.key("F1")
        after = self.screenshot(operation.name + "-selected-property-f1")
        def signature(path):
            return common.run("convert", str(path), "-crop",
                f"252x29+{self.geometry['X'] + 921}+{self.geometry['Y'] + 67}",
                "+repage", "-format", "%#", "info:")
        if signature(before) == signature(after):
            raise RuntimeError("Actual selected-property F1 did not change the dock")
        self.click("inspector_properties")
        self.click("draft")
        self.key("ctrl+a")
        self.paste(operation.after.encode(), "draft-" + operation.name)
        self.field_copy(operation.name + "-proposed", operation.after.encode())

    def exercise(self, operation: evidence.Operation):
        original = evidence.fixture_bytes(self.fixture)
        self.select_operation(operation)
        self.stage(operation.name + "-draft", original, "Focused original and proposed literals copied; GUI Save before Apply")
        self.click("apply")
        self.stage(operation.name + "-applied", operation.patch(original), "Actual Inspector Apply; minimal byte-exact patch and GUI Save")
        self.click("undo")
        self.stage(operation.name + "-undo", original, "Actual common toolbar Undo; exact inverse and GUI Save")

    def build(self, expected: bytes):
        pdf = self.source.with_suffix(".pdf")
        if pdf.exists():
            raise RuntimeError("Unexpected preexisting PDF before native build")
        dependencies = evidence.dependency_hashes(self.source.parent, self.fixture)
        self.key("Escape")
        self.key("ctrl+Return")
        self.screenshot(self.fixture + "-native-build-started")
        deadline = time.monotonic() + self.args.build_timeout
        while time.monotonic() < deadline and not pdf.is_file():
            self.alive()
            self.click("export")
            time.sleep(0.8)
        if not pdf.is_file():
            raise RuntimeError("GUI Build/current PDF Export timed out")
        original_pdf = self.raw / (self.fixture + "-current.original.pdf")
        original_pdf.write_bytes(pdf.read_bytes())
        (self.raw / (self.fixture + "-built-source.original.tex")).write_bytes(self.source.read_bytes())
        self.click("pdf_view")
        self.screenshot(self.fixture + "-current-pdf-view")
        self.click("console")
        self.screenshot(self.fixture + "-console")
        self.click("raw_log")
        self.screenshot(self.fixture + "-actual-engine-raw-log")
        self.clipboard(b"__PGF_ACTUAL_GUI_LOG_SENTINEL__", "log-sentinel")
        self.click("copy_log")
        raw_log = common.run_bytes("xclip", "-selection", "clipboard", "-o")
        log = self.raw / (self.fixture + "-actual-gui-xelatex.log")
        log.write_bytes(raw_log)
        self.click("console")
        self.stage("built", expected, "Actual GUI XeLaTeX Build/current Export/PDF view/raw-log Copy")
        # Engine success and TeX errors remain immediate failures. The strict
        # warning gate is recorded and rejected only after all independent PDF,
        # recorder and source diagnostics have been retained.
        if b"XeTeX" not in raw_log or b"Output written on" not in raw_log:
            raise RuntimeError("Actual GUI raw log lacks successful XeLaTeX engine/output proof")
        if re.search(rb"(?m)^!", raw_log):
            raise RuntimeError("Actual GUI XeLaTeX log reports missing glyphs or TeX errors")
        strict_log_warnings = []
        if b"missing character:" in raw_log.lower():
            strict_log_warnings.append("missing character")
        if re.search(rb"(?i)nullfont", raw_log):
            strict_log_warnings.append("nullfont")
        info = common.run("pdfinfo", str(original_pdf))
        if not re.search(r"(?m)^Pages:\s+1$", info):
            raise RuntimeError("Expected exactly one current PDF page")
        fonts = common.run("pdffonts", str(original_pdf))
        embedded = audit_embedded_fonts(fonts)
        if self.fixture in ("formula", "external-tables") and not any("DejaVu" in row for row in embedded):
            raise RuntimeError("Synthetic Cyrillic PDF lacks embedded DejaVu")
        text = common.run("pdftotext", "-enc", "UTF-8", str(original_pdf), "-")
        if self.fixture == "formula" and "Формула" not in text:
            raise RuntimeError("Formula PDF lacks expected Cyrillic title")
        if self.fixture == "external-tables" and "Измерения" not in text:
            raise RuntimeError("External tables PDF lacks expected Cyrillic title")
        for suffix, contents in (("pdfinfo.txt", info), ("pdffonts.txt", fonts), ("pdftotext.txt", text)):
            (self.raw / (self.fixture + "-" + suffix)).write_text(contents + "\n", encoding="utf-8")
        common.run("pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-png", "-r", "120",
                   str(original_pdf), str(self.raw / (self.fixture + "-rendered-pdf")), timeout=30)
        recorder = self.watcher.proof(self.source, expected, dependencies)
        build_summary = {"pdf_sha256": evidence.sha(original_pdf),
            "source_sha256": evidence.digest(expected), "actual_gui_log_sha256": evidence.sha(log),
            "recorder_proof": recorder, "scientific_visual_review": "REQUIRED"}
        if self.fixture in evidence.AT4_CASES:
            case_id = evidence.AT4_CASES[self.fixture]["case_id"]
            catalogue = evidence.SOURCE_ROOT / "roadmap/AI_TIKZ_SKILLS_2026-11-10/catalogue.original.json"
            source_check = at4_science.validate_case(case_id, self.source.read_bytes(),
                at4_science.load_catalogue_record(catalogue, case_id))
            source_check["compiled_source_sha256"] = evidence.digest(expected)
            evidence.write_json(self.raw / (self.fixture + "-scientific-source-check.json"), source_check)
            build_summary["source_semantics"] = source_check
        build_summary["strict_xelatex_warning_gate"] = (
            "FAIL" if strict_log_warnings else "PASS")
        build_summary["strict_xelatex_warning_details"] = strict_log_warnings
        build_summary["status"] = ("FAIL_STRICT_XELATEX_WARNING_GATE" if strict_log_warnings
                                   else "EVIDENCE_COLLECTED_REVIEW_REQUIRED")
        self.report["builds"][self.fixture] = build_summary
        if strict_log_warnings:
            raise StrictXeLaTeXWarningError("Actual XeLaTeX output has nullfont/missing glyphs: "
                                           + ", ".join(strict_log_warnings))
        validate_xelatex_log(raw_log)

    def run_case(self, fixture: str, *, initial=False):
        self.open_case(fixture, initial=initial)
        scoped = evidence.operations(fixture)
        for operation in scoped:
            self.exercise(operation)
        final = evidence.fixture_bytes(fixture)
        if scoped:
            operation = scoped[-1]
            self.select_operation(operation)
            self.click("apply")
            final = operation.patch(final)
            self.stage("final-applied", final, "Reapply final supported literal; GUI Save")
        # Challenge the in-memory buffer independently without touching the
        # saved file. A no-op Open cannot satisfy the exact reopened readback.
        challenge = b"\r\n% PGF_REOPEN_CHALLENGE_DO_NOT_SAVE"
        self.click("source")
        self.key("ctrl+End")
        self.paste(challenge, "unsaved-reopen-challenge")
        observed = self.copy_editor(fixture + "-unsaved-reopen-challenge")
        if evidence.normalized_clipboard(observed.read_bytes()) != evidence.normalized_clipboard(final + challenge):
            raise RuntimeError("Native unsaved reopen challenge was not present in the actual editor")
        if self.source.read_bytes() != final:
            raise RuntimeError("Unsaved reopen challenge unexpectedly changed the saved file")
        self.screenshot(fixture + "-unsaved-challenge-before-real-reload")
        self.key("ctrl+o")
        time.sleep(0.7)
        self.screenshot(fixture + "-explicit-reopen-dirty-decision")
        self.event("explicit_discard_of_known_unsaved_reopen_challenge")
        self.click("dirty_discard")
        time.sleep(0.6)
        self.enable_full_source_after_load()
        self.stage("reopened", final, "Native Open explicitly discards known unsaved challenge; full-source editor Copy proves saved revision reloaded; GUI Save")
        self.build(final)

    def stop(self):
        self.watcher.stop()
        super().stop()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--source-root", type=Path, default=evidence.SOURCE_ROOT)
    parser.add_argument("--build-provenance", type=Path, required=True)
    parser.add_argument("--coordinates", type=Path)
    parser.add_argument("--suite", choices=("v2", "at4"), default="v2")
    parser.add_argument("--build-timeout", type=float, default=180)
    args = parser.parse_args()
    driver = None
    try:
        if not 1 <= args.build_timeout <= 600:
            raise ValueError("Build timeout must be bounded to 1..600 seconds")
        for name in ("xdotool", "xclip", "wmctrl", "xwininfo", "import", "convert", "pdfinfo", "pdffonts", "pdftotext", "pdftoppm"):
            if shutil.which(name) is None:
                raise ValueError("Missing preinstalled hosted GUI prerequisite: " + name)
        provenance = common.source_provenance(args.source_root.resolve(), args.app.resolve(strict=True))
        receipt = evidence.read_json(args.build_provenance)
        if receipt.get("production_binary") is not True or any(receipt.get(key) != value for key, value in provenance.items()):
            raise ValueError("Build receipt differs from exact production source/binary")
        evidence.prepare(args.out.resolve(), suite=args.suite)
        driver = Driver(args, provenance)
        driver.start()
        run_suite(driver, args.suite)
    except Exception as error:
        if driver is None:
            print(f"{type(error).__name__}: {error}", file=sys.stderr)
            return 1
        driver.capture_failure(error)
    finally:
        if driver is not None:
            try:
                driver.stop()
            except Exception as error:
                driver.report.update(status="FAIL", stop_error=str(error))
            driver.report["files"] = {str(path.relative_to(driver.out)): evidence.sha(path)
                for path in sorted(driver.out.rglob("*")) if path.is_file()
                and not path.is_symlink() and path.name != "report.json"}
            evidence.write_json(driver.out / "report.json", driver.report)
    print(json.dumps(driver.report, ensure_ascii=False))
    return 0 if driver.report["status"].startswith("PASS_AUTOMATED") else 1


if __name__ == "__main__":
    raise SystemExit(main())
