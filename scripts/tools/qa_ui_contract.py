#!/usr/bin/env python3
"""Evidence gate for registered and executed B/U01 Rust unit tests.

NOT a native GUI relaunch, screenshot, Retina or Windows 10 acceptance test.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys

REQUIRED = {
    "ui_theme::tests": {
        "ui_theme::tests::themes_are_stable_and_distinct",
        "ui_theme::tests::preferences_default_and_legacy_partial_data",
        "ui_theme::tests::themes_change_only_egui_not_xelatex_figure_source",
    },
    "font_proof::tests": {
        "font_proof::tests::missing_engine_does_not_claim_font_pass",
        "font_proof::tests::malicious_family_is_rejected_before_spawning_tex",
    },
}


def listed_tests(output: str) -> set[str]:
    return set(re.findall(r"(?m)^([^\s:]+(?:::[^\s:]+)*): test\s*$", output))


def test_result_pass_count(output: str) -> int | None:
    match = re.search(r"(?m)^test result: ok\.\s+(\d+) passed;", output)
    return int(match.group(1)) if match else None


def run_cargo(*arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["cargo", "test", "-p", "tikzarium-app", *arguments],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=240,
    )


def run_gate() -> dict:
    report = {
        "schema_version": 1,
        "utc": datetime.now(timezone.utc).isoformat(),
        "sha": os.environ.get("GITHUB_SHA", "unrecorded-local"),
        "platform": platform.platform(),
        "machine": platform.machine(),
        "scope": "UNIT_TEST_ONLY",
        "physical_win10_smoke": "NOT_RUN",
        "physical_m1_m4_smoke": "NOT_RUN",
        "gui_restart_persistence": "NOT_RUN",
        "gui_visual_theme_invariance": "NOT_RUN",
        "groups": {},
        "status": "FAIL",
    }
    try:
        listing = run_cargo("--", "--list")
        report["list_exit_code"] = listing.returncode
        if listing.returncode:
            report["list_stderr_tail"] = listing.stderr[-3000:]
            raise RuntimeError("cargo test -- --list failed")
        registered = listed_tests(listing.stdout)
        for group, required in REQUIRED.items():
            missing = sorted(required - registered)
            details = {"required": sorted(required), "missing": missing, "status": "FAIL"}
            report["groups"][group] = details
            if missing:
                continue
            outcome = run_cargo(group, "--", "--nocapture")
            passed_count = test_result_pass_count(outcome.stdout)
            details.update({
                "exit_code": outcome.returncode,
                "passed_count": passed_count,
                "stdout_tail": outcome.stdout[-1500:],
                "stderr_tail": outcome.stderr[-1500:],
            })
            if outcome.returncode == 0 and passed_count is not None and passed_count >= len(required):
                details["status"] = "PASS_UNIT"
        if all(group["status"] == "PASS_UNIT" for group in report["groups"].values()) and len(report["groups"]) == len(REQUIRED):
            report["status"] = "PASS_UNIT"
    except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
        report["error"] = f"{type(exc).__name__}: {exc}"
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    report = run_gate()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{report['status']} GUI/theme Rust unit-test contract; evidence={args.output}", flush=True)
    return 0 if report["status"] == "PASS_UNIT" else 1


if __name__ == "__main__":
    raise SystemExit(main())
