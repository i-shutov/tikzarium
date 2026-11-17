"""Source-level scientific checks for the bounded SV-040 native TikZ plot edit.

This validates source semantics only. It does not compile TeX or inspect a PDF.
Only the existing literal plot sample count 50 or proposed 80 is accepted.
"""
from __future__ import annotations

import hashlib
import math
import re


class InvariantViolation(AssertionError):
    """SV-040 source no longer preserves its scientific plot contract."""


_ALLOWED_SOURCE_SHA256 = {
    "a87af487a06729c3e0195f0d42ed25368338225bc9a033677e537228b4a1fc75": 50,
    "05affc76340195a41fa53ac974662e19f15901e7ba1602111a06c1388890ba69": 80,
}


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise InvariantViolation(message)


def validate_source(source: bytes) -> dict[str, object]:
    """Check the original SV-040 function and half-height reference geometry."""
    try:
        text = source.decode("utf-8", "strict")
    except UnicodeDecodeError as error:
        raise InvariantViolation(f"source is not valid UTF-8: {error}") from error

    source_sha256 = hashlib.sha256(source).hexdigest()
    _require(source_sha256 in _ALLOWED_SOURCE_SHA256,
             "SV-040 must be byte-identical to the pinned original or the samples=50→80 derivative")

    plots = re.findall(r"plot\[([^\]]*)\]\s*\((.*?)\);", text, re.S)
    _require(len(plots) == 1, "expected exactly one native TikZ plot command")
    options, expression = plots[0]
    _require(options == "domain=-1.6:1.6,samples=50" or options == "domain=-1.6:1.6,samples=80",
             f"only domain -1.6:1.6 and samples 50→80 are accepted, got {options!r}")
    _require(re.sub(r"\s+", "", expression) == r"\x,{exp(-\x*\x)}",
             f"native function must remain exp(-x²), got {expression!r}")
    for required, description in (
            (r"\draw [-Stealth] (-2,0) -- (2,0) node [below right]  {$t$};", "horizontal t axis"),
            (r"\draw [->] (0,0) -- (0,1.5) node [below right] {$I(t)/I_0$};", "vertical normalized-intensity axis"),
            (r"\draw (0,0) node[below] {$t_{0.5}$};", "half-height time label"),
            (r"\draw (0,1) node[above left] {$1$};", "unit peak label"),
            (r"\draw (0,0.5) node[above left] {$0.5$};", "half-height label"),
            (r"\draw[blue!50!black,smooth,thick]", "styled smooth curve"),
            (r"\draw [dashed] (-0.83,0) -- +(0,0.5);", "negative half-height guide"),
            (r"\draw [dashed] (0.83,0) -- +(0,0.5);", "positive half-height guide"),
            (r"\draw (-0.83,0.5) -- (0.83,0.5);", "half-height reference segment")):
        _require(required in text, f"required source element missing or changed: {description}")
    _require(len(re.findall(r"samples\s*=", text)) == 1, "sample density must occur once on the native plot")

    exact_halfwidth = math.sqrt(math.log(2))
    shown_halfwidth = .83
    absolute_error = abs(shown_halfwidth - exact_halfwidth)
    relative_error = absolute_error / exact_halfwidth
    _require(0 < absolute_error < .003 and relative_error < .004,
             "literal ±0.83 guides should remain a close rounded approximation to ±sqrt(ln 2)")
    sample_count = _ALLOWED_SOURCE_SHA256[source_sha256]
    _require(int(options.split("samples=")[1]) == sample_count, "source hash/sample density disagreement")
    return {
        "source_checks": "PASS_SOURCE_SEMANTICS_ONLY",
        "source_sha256": source_sha256,
        "sample_count": sample_count,
        "accepted_sample_counts": [50, 80],
        "function": "exp(-x^2)",
        "domain": [-1.6, 1.6],
        "peak": {"x": 0.0, "value": 1.0},
        "half_height": 0.5,
        "exact_halfwidth": exact_halfwidth,
        "source_guide_halfwidth": shown_halfwidth,
        "guide_approximation_absolute_error": absolute_error,
        "guide_approximation_relative_error": relative_error,
        "visual_check": "NOT_RUN",
        "pdf_check": "NOT_RUN",
        "native_gui_acceptance": "NOT_RUN",
        "limits": "Source checks preserve the author's rounded ±0.83 reference guides; they do not prove curve rendering, guide intersection, or GUI edit behavior.",
    }
