"""Source-level AT4 semantic checks for selected original PGFPlots examples.

Only Python stdlib is used. This module parses the actual TeX signatures and
coordinates used by the selected corpus cases; it does not infer scientific
validity from hashes, compile TeX, inspect PDFs, or certify rendered behavior.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
import re
from typing import Any

CASE_FILES = {
    "09": "scientific-plot.tex",
    "34": "diffraction-sinc.tex",
    "35": "damped-oscillation.tex",
    "48": "error-bars.tex",
    "49": "loglog-convergence.tex",
    "50": "confidence-band.tex",
    "51": "grouped-bars.tex",
    "52": "histogram.tex",
    "53": "boxplot.tex",
    "54": "heatmap.tex",
    "55": "surface-gaussian.tex",
    "56": "parametric-helix.tex",
    "57": "vector-field.tex",
    "58": "discontinuous-function.tex",
    "59": "group-plots.tex",
    "60": "table-derived-column.tex",
    "61": "bode-magnitude.tex",
}

class InvariantViolation(AssertionError):
    """A source literal fails one of the case-specific semantic invariants."""


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise InvariantViolation(message)


def _text(source: bytes | str) -> str:
    if isinstance(source, bytes):
        try:
            return source.decode("utf-8", "strict")
        except UnicodeDecodeError as error:
            raise InvariantViolation(f"source is not valid UTF-8: {error}") from error
    return source


def _without_tex_comments(text: str) -> str:
    """Remove TeX comments, honoring escaped percent signs, before parsing commands."""
    cleaned = []
    for line in text.splitlines(keepends=True):
        for index, char in enumerate(line):
            if char == "%":
                backslashes = 0
                cursor = index - 1
                while cursor >= 0 and line[cursor] == "\\":
                    backslashes += 1
                    cursor -= 1
                if backslashes % 2 == 0:
                    line = line[:index]
                    break
        cleaned.append(line)
    return "".join(cleaned)


def _axis(text: str) -> str:
    axes = re.findall(r"\\begin\{axis\}\s*\[(.*?)\]", text, flags=re.S)
    _require(len(axes) == 1, f"expected one literal axis options group, found {len(axes)}")
    return axes[0]


def _option_value(options: str, key: str) -> str | None:
    # Keys used here have no nested groups; value is captured up to a top-level
    # comma. The checked options in these source originals satisfy that shape.
    match = re.search(r"(?:^|,)\s*" + re.escape(key) + r"\s*=\s*([^,]+)", options)
    return match.group(1).strip() if match else None


def _addplots(text: str) -> list[tuple[str, str, str]]:
    """Return (option string, body, full addplot) for literal \addplot commands."""
    pattern = re.compile(r"\\addplot(?P<plus>\+?)\s*\[(?P<options>[^\]]*)\]\s*(?P<body>.*?);", re.S)
    return [(m.group("options"), m.group("body").strip(), m.group(0)) for m in pattern.finditer(text)]


def _coordinate_pairs(body: str) -> list[tuple[float, float]]:
    found = re.findall(r"\(\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\)", body)
    return [(float(x), float(y)) for x, y in found]


def _validate_09(text: str) -> list[str]:
    function = re.search(r"\\pgfmathdeclarefunction\{response\}\{1\}\{\\pgfmathparse\{([^{}]+)\}\}", text)
    _require(function is not None, "response function declaration is missing or no longer a simple literal")
    expression = re.sub(r"\s+", "", function.group(1))
    _require(expression == "1/(1+#1^2)", f"response formula changed: {expression!r}")
    plots = _addplots(text)
    _require(len(plots) == 2, f"expected model curve plus sampled-model series, found {len(plots)} addplots")
    model_opts, model_body, _ = plots[0]
    sample_opts, sample_body, _ = plots[1]
    _require(model_body == "{response(x)}", "continuous series no longer calls response(x)")
    _require(_option_value(model_opts, "domain") == "-4:4", "continuous model domain changed")
    samples = _option_value(model_opts, "samples")
    _require(samples in {"161", "181"}, f"unexpected continuous model samples literal {samples!r}")
    _require("only marks" in sample_opts and sample_body == "{response(x)}", "five-point series is not a marked response-model sample")
    _require(_option_value(sample_opts, "domain") == "-2:2" and _option_value(sample_opts, "samples") == "5", "sampled model must retain domain -2:2 and exactly five samples")
    labels = re.findall(r"\\addlegendentry\{([^{}]*)\}", text)
    _require(labels == ["Model", "Sampled model"], f"series labels changed or imply a different provenance: {labels!r}")
    _require("not a claim of experimental data" in text, "source model provenance note is missing")
    f = lambda d: 1.0 / (1.0 + d * d)
    probes = (-4.0, -2.0, -1.0, 0.0, 1.0, 2.0, 4.0)
    values = [f(x) for x in probes]
    _require(all(math.isclose(f(-x), f(x), rel_tol=0, abs_tol=1e-15) for x in probes), "response is not even at symmetric probe points")
    _require(f(0.0) == 1.0 and all(v <= 1.0 for v in values), "response peak is not 1 at detuning 0")
    _require(all(f(a) > f(b) for a, b in ((0, 1), (1, 2), (2, 4))), "response does not decrease with |detuning| at tested points")
    return ["literal response(x)=1/(1+x^2) verified", "evenness and peak f(0)=1 checked numerically", "continuous model samples is 161 or proposed 181; separate sampled-model series is exactly five points and labelled Model/Sampled model"]


def _validate_48(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    plots = _addplots(text)
    _require(len(plots) == 1, f"expected one error-bar series, found {len(plots)} addplots")
    options, body, _ = plots[0]
    _require(re.search(r"error bars/\.cd\s*,\s*y dir=both\s*,\s*y explicit", options) is not None,
             "explicit symmetric y-error-bar mode changed")
    tuples = re.findall(r"\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)\s*\+\-\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)", body)
    rows = [tuple(map(float, row)) for row in tuples]
    expected = [(1, 2, 0, .3), (2, 2.8, 0, .2), (3, 4.1, 0, .4), (4, 4.8, 0, .3)]
    _require(rows == expected, f"error-bar coordinates or magnitudes changed: {rows!r}")
    if catalogue_record is not None:
        desc = catalogue_record.get("description", "")
        check = catalogue_record.get("check", "")
        _require("синтетические" in desc.lower() and "симметричными ошибками" in desc, "catalogue no longer identifies these as synthetic points with symmetric errors")
        _require("условные ошибки" in check and "статистический смысл должен задаваться источником данных" in check,
                 "catalogue statistical-meaning limitation changed or disappeared")
    return ["four exact point/error pairs verified; x-errors are zero and explicit y-errors are 0.3, 0.2, 0.4, 0.3", "catalogue limits interpretation to conditional errors whose statistical meaning must come from the data source"]


def _validate_49(text: str) -> list[str]:
    axis = _axis(text)
    _require(_option_value(axis, "xmode") == "log" and _option_value(axis, "ymode") == "log", "both axes must remain logarithmic")
    plots = _addplots(text)
    _require(len(plots) == 1, "expected one coordinate series")
    points = _coordinate_pairs(plots[0][1])
    expected = [(.01, .0001), (.02, .0004), (.05, .0025), (.1, .01), (.2, .04)]
    _require(points == expected, f"log-log coordinates changed: {points!r}")
    _require(all(x > 0 and y > 0 for x, y in points), "log-log coordinates must all be positive")
    ratios = [y / (x * x) for x, y in points]
    _require(all(math.isclose(ratio, 1.0, rel_tol=1e-12, abs_tol=0) for ratio in ratios), f"points do not satisfy E=h^2: {ratios!r}")
    slope = math.log(points[-1][1] / points[0][1], 10) / math.log(points[-1][0] / points[0][0], 10)
    _require(math.isclose(slope, 2.0, rel_tol=0, abs_tol=1e-12), f"endpoint log-log slope is {slope}, expected 2")
    return ["all five positive coordinate pairs satisfy E=h^2", "endpoint log10(E) versus log10(h) slope computed as 2"]


def _validate_50(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    plots = _addplots(text)
    uppers = [body for opts, body, _ in plots if _option_value(opts, "name path") == "upper"]
    lowers = [body for opts, body, _ in plots if _option_value(opts, "name path") == "lower"]
    _require(len(uppers) == 1 and len(lowers) == 1, "expected one upper and one lower named boundary path")
    for name, body in (("upper", uppers[0]), ("lower", lowers[0])):
        opts = next(opts for opts, candidate, _ in plots if candidate == body)
        _require(_option_value(opts, "domain") == "0:5", f"{name} path domain changed")
    _require(re.sub(r"\s+", "", uppers[0]) == "{.7*x+.5}", "upper path formula changed")
    _require(re.sub(r"\s+", "", lowers[0]) == "{.7*x-.5}", "lower path formula changed")
    fills = [body for opts, body, _ in plots if "fill between" in body]
    _require(len(fills) == 1 and re.search(r"fill between\s*\[\s*of\s*=\s*upper\s+and\s+lower\s*\]", fills[0]) is not None,
             "fillbetween binding must remain exactly upper and lower named paths")
    for x in (0, 1, 2.5, 5):
        upper = .7 * x + .5
        lower = .7 * x - .5
        _require(math.isclose(upper - lower, 1.0, rel_tol=0, abs_tol=1e-15), f"boundary separation changed at x={x}")
    if catalogue_record is not None:
        check = catalogue_record.get("check", "")
        _require("условная ±0.5" in check and "не статистически оцененный доверительный интервал" in check,
                 "catalogue conditional-band caveat changed or disappeared")
    return ["upper/lower literal paths both span 0:5 and fillbetween binds those names", "upper−lower separation evaluated as exactly 1 at four x probes", "catalogue limits this to conditional ±0.5, not an estimated confidence interval"]


def _single_analytic_addplot3(text: str) -> tuple[str, str]:
    """Only the literal 3D command shape in originals 55/56, not a TeX parser."""
    plots = list(re.finditer(r"\\addplot3\s*\[([^\]]*)\]\s*(.*?);", text, re.S))
    all_plots = re.findall(r"\\addplot(?:3)?\+?(?=\s|\[|\{|\()", text)
    _require(len(plots) == 1 and len(all_plots) == 1,
             "expected one analytic addplot3, with no manufactured coordinate/measurement series")
    _require(re.search(r"\\addlegendentry\b", text) is None,
             "original analytic 3D sources have no added measurement/provenance legend")
    options = plots[0].group(1)
    for key in ("samples", "samples y", "domain", "domain y"):
        occurrences = re.findall(r"(?:^|,)\s*" + re.escape(key) + r"\s*=", options)
        _require(len(occurrences) <= 1, f"ambiguous duplicated 3D option {key!r}")
    _require("/.cd" not in options, "3D option namespace switches are outside these source checks")
    return options, re.sub(r"\s+", "", plots[0].group(2))


def _validate_55(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    axis = _axis(text)
    _require(_option_value(axis, "view") == "{45}{30}", "original Gaussian camera view changed")
    options, expression = _single_analytic_addplot3(text)
    _require(re.search(r"(?:^|,)\s*surf\s*(?:,|$)", options) is not None,
             "Gaussian series must retain the original surf option")
    _require(expression == "{exp(-x^2-y^2)}", f"Gaussian surface formula changed: {expression!r}")
    _require(_option_value(options, "domain") == "-2:2" and _option_value(options, "domain y") == "-2:2",
             "Gaussian surface must retain the square domain [-2,2] x [-2,2]")
    samples = _option_value(options, "samples")
    _require(samples in {"21", "25"}, f"unexpected Gaussian samples {samples!r}; original 21 or proposed 25 only")
    z = lambda x, y: math.exp(-x * x - y * y)
    probes = [(x, y) for x in (-2, -1, 0, 1, 2) for y in (-2, -1, 0, 1, 2)]
    _require(all(0 < z(x, y) <= 1 for x, y in probes), "Gaussian positivity/upper bound failed at probe points")
    _require(z(0, 0) == 1 and all(z(x, y) < 1 for x, y in probes if (x, y) != (0, 0)),
             "Gaussian central maximum must be 1 at (0,0)")
    _require(all(math.isclose(z(x, y), z(-x, y), abs_tol=1e-15)
                 and math.isclose(z(x, y), z(x, -y), abs_tol=1e-15)
                 and math.isclose(z(x, y), z(y, x), abs_tol=1e-15) for x, y in probes),
             "Gaussian reflection/axis-exchange symmetry failed at probe points")
    assertions = ["literal analytic z=exp(-x^2-y^2), not measurements or fitted data",
        "original square domain [-2,2] x [-2,2] and view={45}{30} retained",
        "mathematical model is positive, reflection-symmetric and maximal at z(0,0)=1; numeric probes agree",
        f"only samples density 21→25 is scoped (observed source literal {samples}); PDF surface/grid comparison remains REQUIRED"]
    if catalogue_record is not None:
        _require(catalogue_record.get("description") == "Гладкая поверхность z=exp(-x²-y²) с фиксированной камерой.",
                 "original catalogue Gaussian formula/camera description changed")
        _require(catalogue_record.get("check") == "Максимум 1 в начале координат; оценить зависимость от шага сетки.",
                 "original catalogue Gaussian peak/grid-dependence criterion changed")
        assertions.append("original catalogue formula, central maximum and grid-dependence criterion verified")
    return assertions


def _validate_56(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    axis = _axis(text)
    _require(_option_value(axis, "view") == "{50}{25}", "original helix camera view changed")
    options, expression = _single_analytic_addplot3(text)
    _require(expression == "({cos(x)},{sin(x)},{x/360})", f"helix common-parameter coordinates changed: {expression!r}")
    _require(_option_value(options, "domain") == "0:720", "helix domain must remain 0:720 degrees, exactly two turns")
    _require(_option_value(options, "samples y") == "0", "helix must retain samples y=0, not a sampled surface")
    _require(re.search(r"trig\s+format(?:\s+plots)?\s*=", text) is None,
             "original PGF degree trigonometry must not be overridden by a trig format setting")
    samples = _option_value(options, "samples")
    _require(samples in {"181", "201"}, f"unexpected helix samples {samples!r}; original 181 or proposed 201 only")
    # Signature equality above binds these numeric probes to the actual source.
    # PGF cos/sin use degrees here; Python trig must explicitly convert them.
    point = lambda t: (math.cos(math.radians(t)), math.sin(math.radians(t)), t / 360)
    probes = [point(t) for t in range(0, 721, 45)]
    _require(all(math.isclose(x*x + y*y, 1, abs_tol=1e-12) for x, y, _ in probes),
             "helix must have unit radius at every probe")
    _require(point(0)[2] == 0 and point(360)[2] == 1 and point(720)[2] == 2,
             "helix z must increase 0→1→2 across the two turns")
    _require(math.isclose(point(90)[0], 0, abs_tol=1e-12)
             and math.isclose(point(90)[1], 1, abs_tol=1e-12)
             and all(math.isclose(point(t)[0], 1, abs_tol=1e-12)
                     and math.isclose(point(t)[1], 0, abs_tol=1e-12) for t in (0, 360, 720)),
             "helix degree-based quarter/full-turn probes failed")
    assertions = ["literal common-parameter (cos(t),sin(t),t/360) with default PGF degree semantics and no trig override",
        "domain 0:720 is two turns; unit radius x²+y²=1 and z 0→2 checked on the stated mathematical model",
        "samples y=0 and view={50}{25} retained; no manufactured measurement series",
        f"only samples density 181→201 is scoped (observed source literal {samples}); rendered winding/pitch review remains REQUIRED"]
    if catalogue_record is not None:
        _require(catalogue_record.get("description") == "Все три координаты спирали зависят от общего параметра.",
                 "original catalogue helix common-parameter description changed")
        _require(catalogue_record.get("check") == "x²+y²=1; за два оборота z меняется от 0 до 2.",
                 "original catalogue helix unit-radius/two-turn/z-range criterion changed")
        assertions.append("original catalogue common-parameter, unit-radius and two-turn z-range criteria verified")
    return assertions


def _validate_58(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    plots = _addplots(text)
    _require(len(plots) == 1, "expected one discontinuous coordinate series")
    options, body, _ = plots[0]
    _require(_option_value(options, "unbounded coords") == "jump", "unbounded coords=jump is required to suppress a connection across the gap")
    _require("(0,nan)" in re.sub(r"\s+", "", body).lower(), "explicit NaN point at x=0 is missing")
    points = _coordinate_pairs(body)
    expected_finite = [(-2, -.5), (-1, -1), (-.5, -2), (.5, 2), (1, 1), (2, .5)]
    _require(points == expected_finite, f"finite branch coordinates changed or include a point across the gap: {points!r}")
    if catalogue_record is not None:
        check = catalogue_record.get("check", "")
        _require("редкая выборка 1/x" in check, "catalogue sparse 1/x sampling limitation changed or disappeared")
    return ["source retains unbounded coords=jump and explicit (0,nan)", "finite coordinates are the six listed branch samples; original catalogue calls them a sparse 1/x sample", "VISUAL_CHECK=NOT_RUN: source inspection cannot establish that the PDF has no bridge segment"]


def _validate_59(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    """Check the shared-axis two-panel analytic sine/cosine source contract."""
    group = re.search(r"\\begin\{groupplot\}\s*\[(.*?)\](.*?)\\end\{groupplot\}", text, re.S)
    _require(group is not None, "expected one literal groupplot environment")
    _require(len(re.findall(r"\\begin\{groupplot\}", text)) == 1
             and len(re.findall(r"\\end\{groupplot\}", text)) == 1,
             "expected exactly one groupplot environment")
    options, body = group.group(1), group.group(2)
    normalized_group_options = re.sub(r"\s+", "", options)
    group_prefix = "groupstyle={groupsize=2by1,horizontalsep=14mm},width="
    group_suffix = ",height=5cm,xlabel={$t$},grid=major"
    group_width = normalized_group_options[len(group_prefix):-len(group_suffix)] \
        if normalized_group_options.startswith(group_prefix) and normalized_group_options.endswith(group_suffix) else ""
    _require(group_width in {"6cm", "7cm"},
             "groupplot options changed beyond the single allowed width 6cm→7cm edit")

    # The corpus invokes PGFPlots once with only compat=1.18. An additional
    # trig format setting changes how sin(deg(x)) is interpreted, so reject
    # such overrides anywhere in the source, including pgfkeys/tikz styles.
    _require(re.search(r"(?i)\btrig\s+format(?:\s+plots)?\s*(?:/|=)", text) is None,
             "PGF trigonometric format override changes the sine/cosine semantics")
    pgfplots_settings = re.findall(r"\\pgfplotsset\s*\{([^{}]*)\}", text)
    _require(len(pgfplots_settings) == 1 and re.sub(r"\s+", "", pgfplots_settings[0]) == "compat=1.18",
             "PGFPlots global options changed beyond original compat=1.18")

    panels = re.findall(r"\\nextgroupplot\s*\[([^\]]*)\]", body)
    _require(len(panels) == 2, f"expected exactly two ordered group panels, found {len(panels)}")
    panel_bodies = re.split(r"\\nextgroupplot\s*\[[^\]]*\]", body)[1:]
    _require(len(panel_bodies) == 2, "could not isolate both panel bodies")
    _require(all(len(_addplots(panel_body)) == 1 for panel_body in panel_bodies),
             "each group panel must contain exactly one analytic curve")
    labels = [re.search(r"(?:^|,)\s*ylabel\s*=\s*\{\$([^$]+)\$\}", panel) for panel in panels]
    _require(all(label is not None for label in labels), "each panel must retain a literal math ylabel")
    label_values = [label.group(1) for label in labels if label is not None]
    _require(label_values == [r"\sin t", r"\cos t"], f"panel formula labels or order changed: {label_values!r}")
    _require([re.sub(r"\s+", "", panel) for panel in panels]
             == [r"ylabel={$\sint$}", r"ylabel={$\cost$}"],
             "subplot options changed beyond the original ordered sine/cosine labels")

    plots = _addplots(text)
    _require(len(plots) == 2, f"expected exactly two analytic curves, found {len(plots)} addplots")
    expected = [(r"\sin t", "sin(deg(x))"), (r"\cos t", "cos(deg(x))")]
    for index, ((label, expression), (options, body, _)) in enumerate(zip(expected, plots, strict=True)):
        _require(label_values[index] == label, f"curve {index + 1} label/formula ordering changed")
        expected_options = ("blue" if index == 0 else "red") + ",domain=0:6.28,samples=101"
        _require(re.sub(r"\s+", "", options) == expected_options,
                 f"curve {index + 1} addplot options changed beyond original color/domain/sampling")
        _require(re.sub(r"\s+", "", body) == "{" + expression + "}",
                 f"curve {index + 1} analytic formula changed: {body!r}")
    _require(not re.search(r"measurement|experimental|observed|empirical|измерен|эксперимент", text, re.I),
             "analytic panels must not be described as measured or experimental data")

    # PGFPlots' degree-based sin/cos are explicitly fed radians via deg(x).
    # These probes characterize the formula and its pi/2 phase relation; they
    # do not claim sampled or measured observations.
    probes = [0.0, math.pi / 2, math.pi, 3 * math.pi / 2, 2 * math.pi]
    sine = [math.sin(x) for x in probes]
    cosine = [math.cos(x) for x in probes]
    _require(all(math.isclose(c, math.sin(x + math.pi / 2), rel_tol=0, abs_tol=1e-15)
                 for x, c in zip(probes, cosine, strict=True)), "sine/cosine phase relation is not pi/2 at characteristic probes")
    _require(all(math.isclose(a, b, rel_tol=0, abs_tol=1e-15)
                 for a, b in zip(sine, [0, 1, 0, -1, 0], strict=True))
             and all(math.isclose(a, b, rel_tol=0, abs_tol=1e-15) for a, b in zip(cosine, [1, 0, -1, 0, 1], strict=True)),
             "sine/cosine characteristic values changed")
    if catalogue_record is not None:
        _require(catalogue_record.get("stem") == "group-plots", "catalogue AT4-59 stem changed")
        _require(catalogue_record.get("description") == "Две оси построены groupplots с общей разметкой.",
                 "original catalogue groupplot description changed")
        _require(catalogue_record.get("check") == "Одинаковые диапазоны и размеры осей; фазовый сдвиг π/2.",
                 "original catalogue equal-ranges/sizes and phase-shift criterion changed")
    return ["two ordered analytic panels retain sin(t), cos(t), shared t axis, domain 0:6.28 and 101 samples",
            "group style remains 2 by 1 with 14mm separation; width is original 6cm or proposed 7cm",
            "characteristic sine/cosine values and pi/2 phase relation checked mathematically; no measured-data claim"]


def _validate_60(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    """Check raw rows, the derived x² column and the two allowed display orders."""
    reads = re.findall(r"\\pgfplotstableread\s*\[row\s+sep=\\\\\]\s*\{([^{}]*)\}\s*\\datatable", text, re.S)
    _require(len(reads) == 1, f"expected one literal inline pgfplotstable source, found {len(reads)}")
    raw = reads[0].strip()
    _require(raw == r"x y\\1 1.1\\2 3.9\\3 9.2\\4 15.8\\",
             f"inline raw x/y rows changed: {raw!r}")
    row_values = [(1, 1.1), (2, 3.9), (3, 9.2), (4, 15.8)]
    _require([x * x for x, _ in row_values] == [1, 4, 9, 16], "derived model x² values no longer equal 1,4,9,16")

    create = re.findall(r"\\pgfplotstablecreatecol\s*\[([^\]]*)\]\s*\{([^{}]*)\}\s*\\datatable", text, re.S)
    _require(len(create) == 1, f"expected one derived table column, found {len(create)}")
    create_options, column_name = create[0]
    _require(re.sub(r"\s+", "", create_options) == r"createcol/expr={\thisrow{x}^2}"
             and column_name == "model", "derived model column must remain the x² expression named model")
    typeset = re.findall(r"\\pgfplotstabletypeset\s*\[([^\]]*)\]\s*\\datatable", text, re.S)
    _require(len(typeset) == 1, f"expected one table typeset command, found {len(typeset)}")
    columns = re.findall(r"(?:^|,)\s*columns\s*=\s*\{([^{}]*)\}", typeset[0])
    _require(len(columns) == 1, "expected one explicit displayed-column order")
    displayed = [column.strip() for column in columns[0].split(",")]
    _require(len(displayed) == 3 and len(set(displayed)) == 3 and set(displayed) == {"x", "y", "model"},
             f"displayed columns must be unique x, y, model exactly once: {displayed!r}")
    _require(displayed in (["x", "y", "model"], ["x", "model", "y"]),
             f"displayed columns must retain original or proposed order: {displayed!r}")

    # Source-level exact checks for the mathematical headers and booktabs
    # formatting are intentionally literal so a reorder cannot rewrite them.
    _require(text.count(r"\usepackage{booktabs}") == 1, "booktabs package source changed or was duplicated")
    fixed_typeset_options = (
        r"columns/x/.style={column name=$x$},columns/y/.style={column name=$y$},"
        r"columns/model/.style={column name=$x^2$},every head row/.style={before row=\toprule,after row=\midrule},"
        r"every last row/.style={after row=\bottomrule}"
    )
    _require(typeset[0] == "columns={" + ",".join(displayed) + "}," + fixed_typeset_options,
             "table typeset options changed outside the displayed-column order; math headers/booktabs must remain exact")
    if catalogue_record is not None:
        _require(catalogue_record.get("stem") == "table-derived-column", "catalogue AT4-60 stem changed")
        _require(catalogue_record.get("description") == "pgfplotstable вычисляет x² и выводит таблицу с единой точностью.",
                 "original catalogue derived-column description changed")
        _require(catalogue_record.get("check") == "Расчётный столбец содержит 1,4,9,16; y обозначает синтетические данные.",
                 "original catalogue derived-values/synthetic-y criterion changed")
    return ["inline raw x/y rows retained exactly; model is literal thisrow{x}^2 with values 1,4,9,16",
            f"three unique displayed columns use allowed order {','.join(displayed)}; math headers and booktabs source retained"]


def _validate_61(text: str) -> list[str]:
    axis = _axis(text)
    _require(_option_value(axis, "xmode") == "log", "Bode frequency axis must remain logarithmic")
    plots = _addplots(text)
    _require(len(plots) == 1, "expected one analytic Bode magnitude series")
    options, body, _ = plots[0]
    domain = _option_value(options, "domain")
    _require(domain == ".01:100", f"Bode frequency domain changed from the original corner-covering .01:100: {domain!r}")
    samples = _option_value(options, "samples")
    _require(samples in {"161", "201"}, f"unexpected Bode samples literal {samples!r}; accepted original or proposed density only")
    expression = re.sub(r"\s+", "", body)
    _require(expression == "{-10*ln(1+x^2)/ln(10)}", f"Bode magnitude formula changed: {expression!r}")
    db = lambda w: -10.0 * math.log10(1.0 + w * w)
    at_corner = db(1.0)
    _require(math.isclose(at_corner, -3.010299956639812, rel_tol=0, abs_tol=1e-12), f"corner magnitude is {at_corner} dB")
    low, high = 1_000.0, 10_000.0
    slope = (db(high) - db(low)) / math.log10(high / low)
    _require(math.isclose(slope, -20.0, rel_tol=0, abs_tol=.001), f"high-frequency decade slope is {slope} dB/decade")
    return ["formula parsed as −10 log10(1+ω²)", "original domain .01:100 retained and log x-axis verified", f"analytic series samples is {samples} (original 161 or proposed 201)", "magnitude at ωRC=1 is −3.0102999566 dB", f"computed 1000→10000 high-frequency slope is {slope:.8f} dB/decade, approaching −20", "numeric asymptote check is mathematical model analysis, not a rendered-data measurement"]


def _one_width_axis(text: str, expected: str) -> str:
    """Require exact axis options, allowing only the proposed 10→11cm width."""
    axis = _axis(text)
    _require(len(re.findall(r"(?:^|,)\s*width\s*=", axis)) == 1, "axis width must occur exactly once")
    normalized = re.sub(r"(^|,)width=(?:10|11)cm(?=,|$)", r"\1width=WIDTHcm", axis)
    _require(normalized == expected.replace("width=10cm", "width=WIDTHcm"),
             f"axis options changed outside the bounded width 10cm→11cm proposal: {axis!r}")
    _require(_option_value(axis, "width") in {"10cm", "11cm"}, "axis width must be original 10cm or proposed 11cm")
    return axis


def _one_height_axis(text: str, expected: str) -> str:
    axis = _axis(text)
    _require(len(re.findall(r"(?:^|,)\s*height\s*=", axis)) == 1, "axis height must occur exactly once")
    normalized = re.sub(r"(^|,)height=(?:6|7)cm(?=,|$)", r"\1height=HEIGHTcm", axis)
    _require(normalized == expected.replace("height=6cm", "height=HEIGHTcm"),
             f"axis options changed outside the bounded height 6cm→7cm proposal: {axis!r}")
    _require(_option_value(axis, "height") in {"6cm", "7cm"}, "axis height must be original 6cm or proposed 7cm")
    return axis


def _validate_34(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    _require(_axis(text) == "width=10cm,height=6cm,grid=major,xlabel={$u$},ylabel={$I/I_0$},ymin=0,ymax=1.1",
             "diffraction axis labels, range or geometry changed")
    plots = _addplots(text)
    _require(len(plots) == 1 and len(re.findall(r"\\addplot\b", text)) == 1, "diffraction must retain exactly one analytic intensity plot")
    options, body, _ = plots[0]
    _require(re.sub(r"\s+", "", body) == "{abs(x)<0.0001?1:(sin(deg(x))/x)^2}", "diffraction formula or literal near-zero guard changed")
    _require(options in {"blue,thick,domain=-12:12,samples=301", "blue,thick,domain=-12:12,samples=401"},
             f"diffraction options changed beyond samples 301→401: {options!r}")
    intensity = lambda u: 1.0 if abs(u) < .0001 else (math.sin(u) / u) ** 2
    _require(intensity(0) == 1.0, "guarded central limit must be I(0)/I₀=1")
    zeros = [abs(intensity(n * math.pi)) for n in range(1, 5)]
    _require(max(zeros) < 1e-30, "nonzero nπ sinc zeros failed analytic probes")
    _require(intensity(12) < .01 and intensity(-12) == intensity(12), "far-field endpoints must be small and symmetric")
    if catalogue_record is not None:
        _require(catalogue_record.get("description") == "Однощелевая модель с явно обработанным пределом при нуле.", "catalogue diffraction interpretation changed")
        _require(catalogue_record.get("check") == "I(0)=I₀; нули при u=nπ, n≠0; дальняя зона.", "catalogue diffraction criteria changed")
    return ["guarded sinc-squared formula, domain −12:12 and default degree conversion sin(deg(x)) preserved",
            "analytic limit I(0)/I₀=1, nonzero nπ zeros (n=1..4), symmetry and small far-field endpoints checked",
            "only sample density 301→401 is permitted; sampled zero placement and PDF resolution remain visual-review items"]


def _validate_35(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    _require(_axis(text) == "width=10cm,height=6cm,grid=major,xlabel={$t$},ylabel={$x(t)$}", "damped-oscillation axis labels or geometry changed")
    plots = _addplots(text)
    _require(len(plots) == 3 and len(re.findall(r"\\addplot\b", text)) == 3, "signal and both damping envelopes must remain the only three plots")
    formulas = ["{exp(-.22*x)*cos(deg(3*x))}", "{exp(-.22*x)}", "{-exp(-.22*x)}"]
    options = ["blue,thick,domain=0:10,samples=251", "gray,dashed,domain=0:10", "gray,dashed,domain=0:10"]
    actual = [(o, re.sub(r"\s+", "", b)) for o, b, _ in plots]
    accepted = list(zip(options, formulas))
    accepted_proposal = [(options[0].replace("251", "301"), formulas[0]), *accepted[1:]]
    _require(actual in (accepted, accepted_proposal), "damped signal/envelopes, domains, order or sample proposal changed")
    max_ratio = max(abs(math.cos(3 * t)) for t in (i / 100 for i in range(1001)))
    _require(max_ratio <= 1.0, "oscillation exceeds its exponential envelope")
    _require(math.isclose(math.cos(math.radians(3 * 180 / math.pi)), math.cos(3), abs_tol=1e-15), "radian-to-degree phase probe failed")
    if catalogue_record is not None:
        _require(catalogue_record.get("description") == "Сигнал и огибающие получены из общей экспоненты затухания.", "catalogue damped-oscillation interpretation changed")
        _require(catalogue_record.get("check") == "|x(t)|≤exp(-0.22t); частота в аргументе cos переведена из радиан.", "catalogue damping criteria changed")
    return ["signal exp(−0.22t)cos(deg(3t)) and both shared exponential envelopes retained on 0:10",
            f"dense mathematical probes confirm |x(t)|≤exp(−0.22t); maximum absolute cosine ratio {max_ratio:.12f}",
            "degree-converted phase agrees with cos(3t) for radian-valued t; only first plot samples 251→301 is proposed"]


def _validate_51(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    _one_width_axis(text, "width=10cm,height=6cm,grid=major,ybar,bar width=10pt,symbolic x coords={A,B,C},xtick=data,ymin=0,ymax=8,legend style={at={(.5,1.02)},anchor=south,legend columns=2}")
    bodies = re.findall(r"\\addplot\s+coordinates\s*(\{.*?\})\s*;", text, re.S)
    expected = ["{(A,3)(B,5)(C,4)}", "{(A,4)(B,3)(C,6)}"]
    _require(len(re.findall(r"\\addplot\b", text)) == 2 and [re.sub(r"\s+", "", b) for b in bodies] == expected, "grouped-bar categories or synthetic series values changed")
    _require(r"\legend{Series 1,Series 2}" in text, "grouped-bar legend labels/order changed")
    _require(all(v >= 0 for v in [3,5,4,4,3,6]), "bars must start at zero and have nonnegative values")
    if catalogue_record is not None:
        _require(catalogue_record.get("description") == "Две серии сравниваются на одинаковых категориях.", "catalogue grouped-bar description changed")
        _require(catalogue_record.get("check") == "Столбцы начинаются с нуля; значения синтетические.", "catalogue synthetic-data / baseline criterion changed")
    return ["two synthetic series retain categories A/B/C, exact values and zero y baseline", "bar values are nonnegative and legend order is retained", "axis width 10cm→11cm is the only proposed source edit"]


def _validate_52(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    _one_width_axis(text, "width=10cm,height=6cm,grid=major,ymin=0,xlabel={value},ylabel={count}")
    plots = _addplots(text)
    _require(len(plots) == 1 and len(re.findall(r"\\addplot\b", text)) == 1, "histogram must contain exactly one plot")
    _require(r"\usepgfplotslibrary{statistics}" in text, "histogram statistics library dependency is missing")
    options, body, _ = plots[0]
    _require(options == "hist={bins=5,data min=0,data max=5}", f"histogram bin options changed: {options!r}")
    prefix, suffix = r"table[row sep=\\,y index=0]{data", r"\\}"
    _require(body.startswith(prefix) and body.endswith(suffix), "histogram must retain explicit embedded single-column observations")
    raw = body[len(prefix):-len(suffix)].replace("\\\\", " ").split()
    try:
        values = [float(x) for x in raw]
    except ValueError as error:
        raise InvariantViolation(f"histogram contains a nonnumeric token: {error}") from error
    expected = [.2,.5,1.1,1.2,1.6,2.2,2.3,2.5,2.7,3.1,3.8,4.4]
    _require(values == expected, "histogram sample values/order changed")
    _require(len(values) == 12 and all(0 <= v <= 5 for v in values), "histogram requires 12 observations in explicit [0,5] range")
    _require(not any(v.is_integer() for v in values), "an observation lies on an integer bin boundary; bin-closure convention would need resolution")
    counts = [sum(i <= v < i + 1 for v in values) for i in range(5)]
    _require(counts == [2, 3, 4, 2, 1] and sum(counts) == 12, f"derived equal-bin counts changed: {counts!r}")
    if catalogue_record is not None:
        _require(catalogue_record.get("description") == "Бины вычислены статистической библиотекой из выборки.", "catalogue histogram description changed")
        _require(catalogue_record.get("check") == "Сумма частот равна 12; интервалы и нормировка указаны явно.", "catalogue histogram count/bin criterion changed")
    return [f"embedded sample has n={len(values)} and lies in explicit [0,5] data range", "statistics library is configured for five bins; frequencies are derived from observations, not asserted from source alone", "axis width 10cm→11cm is the only proposed source edit"]


def _validate_53(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    _one_width_axis(text, "width=10cm,height=6cm,grid=major,ytick={1},yticklabels={Sample},xlabel={value}")
    plots = _addplots(text)
    _require(len(plots) == 1 and len(re.findall(r"\\addplot\b", text)) == 1, "prepared boxplot must contain exactly one plot")
    _require(r"\usepgfplotslibrary{statistics}" in text, "boxplot statistics library dependency is missing")
    options, body, _ = plots[0]
    _require(options == "boxplot prepared={lower whisker=1,lower quartile=2,median=3,upper quartile=4,upper whisker=6}" and re.sub(r"\s+", "", body) == "coordinates{}", "prepared summary or empty coordinate payload changed")
    summary = [1,2,3,4,6]
    _require(all(a <= b for a,b in zip(summary, summary[1:])), "prepared whiskers/quartiles/median are not ordered")
    if catalogue_record is not None:
        _require(catalogue_record.get("description") == "Квартили и границы усов заданы явно для учебной сводки.", "catalogue prepared-boxplot description changed")
        _require(catalogue_record.get("check") == "1≤2≤3≤4≤6; способ вычисления квартилей и усов должен сопровождать реальные данные.", "catalogue quartile-method qualification changed")
    return ["prepared lower whisker=1, Q1=2, median=3, Q3=4, upper whisker=6 are ordered", "summary is explicitly prepared for education; source has no raw data or quartile inference method", "axis width 10cm→11cm is the only proposed source edit"]


def _validate_54(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    _one_width_axis(text, "width=10cm,height=6cm,grid=major,view={0}{90},colorbar,mesh/cols=3,xlabel={$i$},ylabel={$j$}")
    plots = _addplots(text)
    _require(len(plots) == 1 and len(re.findall(r"\\addplot\b", text)) == 1, "heatmap must contain exactly one matrix plot")
    options, body, _ = plots[0]
    _require(options == "matrix plot*,point meta=explicit", "heatmap requires explicit point-meta colors")
    expected_body = "coordinates{" + "".join(f"({x},{y})[{m}]" for x,y,m in [(0,0,1),(1,0,2),(2,0,3),(0,1,2),(1,1,5),(2,1,4),(0,2,3),(1,2,4),(2,2,2)]) + "}"
    _require(re.sub(r"\s+", "", body) == expected_body, "heatmap body contains changed or additional coordinate/meta content")
    coords = re.findall(r"\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*\[\s*(\d+)\s*\]", body)
    expected = [(0,0,1),(1,0,2),(2,0,3),(0,1,2),(1,1,5),(2,1,4),(0,2,3),(1,2,4),(2,2,2)]
    parsed = [tuple(map(int,p)) for p in coords]
    _require(parsed == expected and len(coords) == 9, f"heatmap coordinate/point-meta mapping changed: {parsed!r}")
    _require(set((x,y) for x,y,_ in parsed) == {(x,y) for x in range(3) for y in range(3)}, "heatmap grid is not exactly 3×3")
    if catalogue_record is not None:
        _require(catalogue_record.get("description") == "Скалярное поле отображено цветом на регулярной сетке.", "catalogue heatmap description changed")
        _require(catalogue_record.get("check") == "Сетка 3×3; значения цвета соответствуют point meta, а не положению точки.", "catalogue heatmap criterion changed")
    return ["nine values map to exact 3×3 (x,y,point-meta) coordinate sequence", "explicit point meta supplies color values independently of coordinate position", "axis width 10cm→11cm is the only proposed source edit"]


def _validate_57(text: str, catalogue_record: dict[str, Any] | None) -> list[str]:
    _one_height_axis(text, "width=10cm,height=6cm,grid=major,axis equal image,xmin=-1.6,xmax=1.6,ymin=-1.6,ymax=1.6,xlabel={$x$},ylabel={$y$}")
    plots = _addplots(text)
    _require(len(plots) == 2 and len(re.findall(r"\\addplot\b", text)) == 2, "vector field and origin marker must remain the only two plots")
    options, body, _ = plots[0]
    _require(options == "teal,quiver={u=-y,v=x,scale arrows=.25},-Stealth", "quiver components/scale/arrow style changed")
    prefix, suffix = r"table[row sep=\\]{x y", r"\\}"
    _require(body.startswith(prefix) and body.endswith(suffix), "quiver source coordinate table missing")
    row_text = body[len(prefix):-len(suffix)]
    rows = [tuple(map(int,row.split())) for row in row_text.split("\\\\") if row.strip()]
    expected = [(-1,-1),(0,-1),(1,-1),(-1,0),(1,0),(-1,1),(0,1),(1,1)]
    _require(rows == expected, f"vector field source grid changed: {rows!r}")
    for x,y in rows:
        _require(x*(-y) + y*x == 0, f"field vector at ({x},{y}) is not orthogonal to radius")
    _require(re.sub(r"\s+", "", plots[1][2]) == r"\addplot[onlymarks,mark=*,marksize=1pt]coordinates{(0,0)};", "explicit origin zero-vector marker changed")
    if catalogue_record is not None:
        _require(catalogue_record.get("description") == "Стрелки отображают поле (-y,x) на регулярной решётке.", "catalogue vector-field description changed")
        _require(catalogue_record.get("check") == "Поле ортогонально радиусу; в начале вектор нулевой.", "catalogue vector-field criterion changed")
    return ["components (−y,x) are orthogonal to radius at all eight nonorigin source grid points", "origin is excluded from arrow data; the separate marker locates the origin only, with no vector arrow plotted there", "axis height 6cm→7cm is the only proposed source edit"]


def _measurements(case_id: str, text: str) -> dict[str, Any] | None:
    """Expose checked quantities as structured data alongside the claims."""
    if case_id == "34":
        return {"formula": "(sin(u)/u)^2 with guarded value 1 at zero", "central_intensity_ratio": 1.0,
                "analytic_nonzero_zeros": [f"{n}π" for n in range(1, 5)],
                "floating_probe_residuals": [abs(math.sin(n*math.pi)/(n*math.pi))**2 for n in range(1, 5)],
                "endpoint_intensity_ratio_at_abs_u_12": (math.sin(12)/12)**2}
    if case_id == "35":
        return {"decay_rate_per_time_unit": 0.22, "angular_frequency_per_time_unit": 3.0,
                "envelope_upper_bound_ratio": 1.0, "phase_conversion": "cos(deg(3*x)) = cos(3*x radians)"}
    if case_id == "51":
        return {"categories": ["A", "B", "C"], "synthetic_series": [[3, 5, 4], [4, 3, 6]], "baseline": 0}
    if case_id == "52":
        plots = _addplots(text)
        body = plots[0][1]
        prefix, suffix = r"table[row sep=\\,y index=0]{data", r"\\}"
        values = [float(v) for v in body[len(prefix):-len(suffix)].replace("\\\\", " ").split()]
        counts = [sum(i <= v < i + 1 for v in values) for i in range(5)]
        return {"observations": values, "n": len(values), "bins": 5, "data_range": [0, 5],
                "equal_width_bin_counts": counts, "frequency_total": sum(counts),
                "normalization": "not explicitly specified by source; counts are reported, not normalized"}
    if case_id == "53":
        return {"summary": {"lower_whisker": 1, "Q1": 2, "median": 3, "Q3": 4, "upper_whisker": 6},
                "quartile_method": "not specified; values are prepared, not inferred from raw observations"}
    if case_id == "54":
        return {"grid_shape": [3, 3], "point_meta_by_xy": [{"x": x, "y": y, "point_meta": m}
                for x,y,m in [(0,0,1),(1,0,2),(2,0,3),(0,1,2),(1,1,5),(2,1,4),(0,2,3),(1,2,4),(2,2,2)]]}
    if case_id == "57":
        return {"field": "V(x,y)=(-y,x)", "nonorigin_grid_points": 8,
                "dot_products_with_radius": [0 for _ in range(8)], "origin_vector": [0, 0],
                "origin_arrow_plotted": False}
    return None


def validate_case(case_id: str, source: bytes | str, catalogue_record: dict[str, Any] | None = None) -> dict[str, Any]:
    """Validate one case's source literals; returns claims and NOT_RUN visual status."""
    if case_id not in CASE_FILES:
        raise ValueError(f"unsupported AT4 case id {case_id!r}")
    text = _text(source)
    if case_id in {"34", "35", "51", "52", "53", "54", "57"}:
        text = _without_tex_comments(text)
    validators = {"09": _validate_09, "34": lambda s: _validate_34(s, catalogue_record),
                 "35": lambda s: _validate_35(s, catalogue_record), "49": _validate_49,
                 "59": _validate_59, "60": _validate_60, "61": _validate_61,
                 "51": lambda s: _validate_51(s, catalogue_record),
                 "52": lambda s: _validate_52(s, catalogue_record),
                 "53": lambda s: _validate_53(s, catalogue_record),
                 "54": lambda s: _validate_54(s, catalogue_record),
                 "57": lambda s: _validate_57(s, catalogue_record)}
    if case_id == "48":
        assertions = _validate_48(text, catalogue_record)
    elif case_id in {"50", "55", "56", "58"}:
        assertions = {"50": _validate_50, "55": _validate_55, "56": _validate_56,
                      "58": _validate_58}[case_id](text, catalogue_record)
    elif case_id in {"59", "60"}:
        assertions = validators[case_id](text, catalogue_record)
    elif case_id in {"34", "35", "51", "52", "53", "54", "57"}:
        assertions = validators[case_id](text)
    else:
        assertions = validators[case_id](text)
    return {
        "case_id": case_id,
        "source_checks": "PASS_SOURCE_SEMANTICS_ONLY",
        "assertions": assertions,
        "measurements": _measurements(case_id, text),
        "visual_check": "NOT_RUN",
        "pdf_check": "NOT_RUN",
        "native_gui_acceptance": "NOT_RUN",
        "independent_visual_review": "REQUIRED",
        "limits": {
            "09": "Analytic formula/model sampling checks do not validate physical experiment data or rendered appearance.",
            "34": "Analytic sinc probes are not sampled-zero placement or rendered-resolution evidence; the original and proposed PDFs require independent review.",
            "35": "The envelope and phase checks are mathematical source probes, not rendered amplitude, clipping or sampling evidence.",
            "48": "Error magnitudes are conditional; their statistical meaning must be supplied by the data source.",
            "49": "The five points are synthetic coordinates and do not establish an empirical convergence study.",
            "50": "The illustrated ±0.5 band is not a statistically estimated confidence interval.",
            "51": "Bar values are synthetic; source checks do not validate rendered grouping, spacing or typography.",
            "52": "The observations are embedded example data; source checks do not independently establish rendered bin-edge conventions or density/count normalization.",
            "53": "Prepared summary values do not establish a quartile/whisker method for real observations.",
            "54": "Point-meta mapping is checked from source; palette perception and rendered cell orientation require visual review.",
            "55": "Analytic source/probe checks are not rendered surface or grid-convergence proof; original and changed-density PDFs need independent review. No z-axis/view editing is implemented by this case.",
            "56": "Default degree-based analytic probes are not rendered winding/pitch evidence; original and changed-density PDFs need independent review. No z-axis/view editing is implemented by this case.",
            "57": "Source orthogonality checks do not establish rendered arrow direction, scale or visual legibility.",
            "58": "The no-bridge claim needs PDF inspection; a NaN token and jump option alone are not visual evidence.",
            "59": "Formula and phase probes establish source-level analytic semantics only; panel alignment, labels, clipping and rendered phase remain PDF/native-GUI review items.",
            "60": "Raw y values are synthetic as stated by the original catalogue; source checks do not establish rendered table alignment or typography.",
            "61": "The high-frequency slope is computed from the stated mathematical transfer function, not experimental data or rendered samples.",
        }[case_id],
    }


def load_catalogue_record(catalogue_path: Path, case_id: str) -> dict[str, Any]:
    records = json.loads(catalogue_path.read_text(encoding="utf-8"))
    matches = [record for record in records if record.get("id") == case_id]
    if len(matches) != 1:
        raise ValueError(f"expected one original catalogue record for case {case_id}")
    return matches[0]


def validate_directory(source_root: Path) -> list[dict[str, Any]]:
    """Validate selected exact files under a caller-selected repository root."""
    examples = source_root / "roadmap/AI_TIKZ_SKILLS_2026-11-10/examples"
    catalogue = source_root / "roadmap/AI_TIKZ_SKILLS_2026-11-10/catalogue.original.json"
    return [validate_case(case_id, (examples / filename).read_bytes(),
                          load_catalogue_record(catalogue, case_id) if case_id in {"34", "35", "48", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60"} else None)
            for case_id, filename in CASE_FILES.items()]
