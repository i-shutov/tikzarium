"""Source-level AT4 semantic checks for eight original PGFPlots examples.

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
    "48": "error-bars.tex",
    "49": "loglog-convergence.tex",
    "50": "confidence-band.tex",
    "55": "surface-gaussian.tex",
    "56": "parametric-helix.tex",
    "58": "discontinuous-function.tex",
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


def validate_case(case_id: str, source: bytes | str, catalogue_record: dict[str, Any] | None = None) -> dict[str, Any]:
    """Validate one case's source literals; returns claims and NOT_RUN visual status."""
    if case_id not in CASE_FILES:
        raise ValueError(f"unsupported AT4 case id {case_id!r}")
    text = _text(source)
    validators = {"09": _validate_09, "49": _validate_49, "61": _validate_61}
    if case_id == "48":
        assertions = _validate_48(text, catalogue_record)
    elif case_id in {"50", "55", "56", "58"}:
        assertions = {"50": _validate_50, "55": _validate_55, "56": _validate_56,
                      "58": _validate_58}[case_id](text, catalogue_record)
    else:
        assertions = validators[case_id](text)
    return {
        "case_id": case_id,
        "source_checks": "PASS_SOURCE_SEMANTICS_ONLY",
        "assertions": assertions,
        "visual_check": "NOT_RUN",
        "pdf_check": "NOT_RUN",
        "native_gui_acceptance": "NOT_RUN",
        "independent_visual_review": "REQUIRED",
        "limits": {
            "09": "Analytic formula/model sampling checks do not validate physical experiment data or rendered appearance.",
            "48": "Error magnitudes are conditional; their statistical meaning must be supplied by the data source.",
            "49": "The five points are synthetic coordinates and do not establish an empirical convergence study.",
            "50": "The illustrated ±0.5 band is not a statistically estimated confidence interval.",
            "55": "Analytic source/probe checks are not rendered surface or grid-convergence proof; original and changed-density PDFs need independent review. No z-axis/view editing is implemented by this case.",
            "56": "Default degree-based analytic probes are not rendered winding/pitch evidence; original and changed-density PDFs need independent review. No z-axis/view editing is implemented by this case.",
            "58": "The no-bridge claim needs PDF inspection; a NaN token and jump option alone are not visual evidence.",
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
    """Validate eight exact files under a caller-selected repository root."""
    examples = source_root / "roadmap/AI_TIKZ_SKILLS_2026-11-10/examples"
    catalogue = source_root / "roadmap/AI_TIKZ_SKILLS_2026-11-10/catalogue.original.json"
    return [validate_case(case_id, (examples / filename).read_bytes(),
                          load_catalogue_record(catalogue, case_id) if case_id in {"48", "50", "55", "56", "58"} else None)
            for case_id, filename in CASE_FILES.items()]
