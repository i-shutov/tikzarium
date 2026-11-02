#!/usr/bin/env python3
"""Read-only distribution gate for direct QA XeLaTeX invocations.

The production Rust BuildService already uses --disable-installer on MiKTeX.
Independent Python fixture/glyph runners must enforce the same policy rather
than silently bypassing it. This code never installs TeX or changes settings.
"""
from __future__ import annotations

from dataclasses import dataclass
import subprocess


@dataclass(frozen=True)
class EnginePolicy:
    distribution: str
    version: str
    offline_args: tuple[str, ...]


def classify_version(output: str) -> str:
    """Recognize a whole --version transcript, not merely its first line."""
    lower = output.casefold()
    miktex = "miktex" in lower
    texlive = "tex live" in lower
    if miktex == texlive:
        raise ValueError(
            "XeLaTeX distribution is unknown or ambiguous; refusing direct QA build"
        )
    return "MiKTeX" if miktex else "TeX Live"


def probe_engine_policy(executable: str, *, timeout: int = 20) -> EnginePolicy:
    """Read-only probes; a rejected MiKTeX offline switch fails closed."""
    if not executable or not isinstance(executable, str):
        raise ValueError("Missing explicitly selected XeLaTeX executable")
    proc = subprocess.run(
        [executable, "--version"], capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=timeout, check=False,
    )
    transcript = (proc.stdout or "") + "\n" + (proc.stderr or "")
    if proc.returncode:
        raise ValueError("XeLaTeX --version failed; refusing direct QA build")
    distribution = classify_version(transcript)
    first = next((line.strip() for line in transcript.splitlines() if line.strip()), "")
    if not first:
        raise ValueError("XeLaTeX version is empty")
    if distribution == "MiKTeX":
        # The same no-auto-install switch used in production Rust. Verify on
        # this exact executable before running *any* user-source fixture.
        guarded = subprocess.run(
            [executable, "--disable-installer", "--version"],
            capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=timeout, check=False,
        )
        text = (guarded.stdout or "") + "\n" + (guarded.stderr or "")
        if guarded.returncode or classify_version(text) != "MiKTeX":
            raise ValueError("MiKTeX rejected --disable-installer; no QA build attempted")
        return EnginePolicy(distribution, first, ("--disable-installer",))
    return EnginePolicy(distribution, first, ())
