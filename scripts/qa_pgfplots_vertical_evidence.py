#!/usr/bin/env python3
"""Strict evidence contracts for a synthetic, bounded PGFPlots native vertical.

This validates retained observations; UNIT_EVENT success is never native GUI or
full SC3/AT4 acceptance. Expected fixture bytes are separate from live documents.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, replace
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

from qa_sci_compact_native import normalized_clipboard, original_image_size
import qa_pgfplots_clean_derivatives as clean_derivatives

SCOPE = "HOSTED_GUI_PGF_V2_BOUNDED_VERTICAL"
CLEAN_SCOPE = "HOSTED_GUI_PGF_V2_ATTRIBUTED_CLEAN_DERIVATIVES_BOUNDED_VERTICAL"
AT4_SCOPE = "HOSTED_GUI_AT4_ORIGINALS_BOUNDED_VERTICAL"
SCREEN = (1366, 768)
CLIENT = (1180, 680)
FIXTURES = Path(__file__).resolve().parent / "fixtures/pgfplots-v2"
SOURCE_ROOT = Path(__file__).resolve().parents[1]
AT4_EXAMPLES = SOURCE_ROOT / "roadmap/AI_TIKZ_SKILLS_2026-11-10/examples"
AT4_RELATIVE_EXAMPLES = "roadmap/AI_TIKZ_SKILLS_2026-11-10/examples"
AXIS_KEYS = ("samples", "domain", "xmin", "xmax", "ymin", "ymax", "xtick distance",
             "ytick distance", "xtick", "ytick", "width", "height", "xlabel", "ylabel", "mark")
ADDPLOT_KEYS = ("samples", "domain", "mark")
TABLE_KEYS = ("columns",)
NATIVE_PLOT_KEYS = ("samples",)
PROPERTY_KEYS = {"axis": AXIS_KEYS, "groupplot": AXIS_KEYS,
                 "nextgroupplot": AXIS_KEYS, "addplot": ADDPLOT_KEYS,
                 "tabletypeset": TABLE_KEYS, "nativeplot": NATIVE_PLOT_KEYS}
DEPENDENCIES = {"formula": (), "external-tables": ("measurements.dat", "reference.csv")}
NAMED_SV = ("SV-001", "SV-003", "SV-009", "SV-022", "SV-029", "SV-040")
NATIVE_PLOT_ORIGINAL_SHA256 = "a87af487a06729c3e0195f0d42ed25368338225bc9a033677e537228b4a1fc75"
DEPENDENCIES.update({name: () for name in NAMED_SV})
CLEAN_REPLACEMENTS = {spec.corpus_id: name for name, spec in clean_derivatives.SPECS.items()}
DEPENDENCIES.update({name: () for name in CLEAN_REPLACEMENTS.values()})

# Exact original sources and literal edits from the byte-level AT4 proposal.
# These are corpus inputs, never regenerated synthetic fixtures.
AT4_CASES = {
    "AT4-09": {"filename": "scientific-plot.tex", "case_id": "09",
        "sha256": "78fa07f6e30aad101b4c9f20a33df40e93ccd3267ec5edb1a9a6ee0e25b142a0",
        "kind": "addplot", "command": 1, "key": "samples", "before": "161", "after": "181"},
    "AT4-34": {"filename": "diffraction-sinc.tex", "case_id": "34",
        "sha256": "017b225eb8559bd003ce27910cf99c56d7d917d5f070ea6f4b87ab588fe1c44f",
        "kind": "addplot", "command": 1, "key": "samples", "before": "301", "after": "401"},
    "AT4-35": {"filename": "damped-oscillation.tex", "case_id": "35",
        "sha256": "bf575c457aeede1925d55e3b59efd326e9d9c8c90f93e5a1498ed1fbf0393678",
        "kind": "addplot", "command": 1, "key": "samples", "before": "251", "after": "301"},
    "AT4-48": {"filename": "error-bars.tex", "case_id": "48",
        "sha256": "2bb042ba1b0a587570da4dd570bf75ed669a93c47e541d32dc63541c4af067fd",
        "kind": "axis", "command": 0, "key": "width", "before": "10cm", "after": "11cm"},
    "AT4-49": {"filename": "loglog-convergence.tex", "case_id": "49",
        "sha256": "ec6f48bab66efc90faa444c52fe71acde6a90db8084cd18dac73e36881e4accf",
        "kind": "axis", "command": 0, "key": "width", "before": "10cm", "after": "11cm"},
    "AT4-50": {"filename": "confidence-band.tex", "case_id": "50",
        "sha256": "a707bc592cdb70d8cdb55109e843d1fcc8a82292e2ec700b5480c9ba3edabc60",
        "kind": "axis", "command": 0, "key": "width", "before": "10cm", "after": "11cm"},
    "AT4-51": {"filename": "grouped-bars.tex", "case_id": "51",
        "sha256": "04dd4427041379cb150c61cbcbdee26c3ba970e29c01ab9390c0604e91245809",
        "kind": "axis", "command": 0, "key": "width", "before": "10cm", "after": "11cm"},
    "AT4-52": {"filename": "histogram.tex", "case_id": "52",
        "sha256": "1ca7769d550f831bd57b5317e53e8e182ba750a2590b4622e2d93e6eb5718690",
        "kind": "axis", "command": 0, "key": "width", "before": "10cm", "after": "11cm"},
    "AT4-53": {"filename": "boxplot.tex", "case_id": "53",
        "sha256": "6ce19327921d87f4c2ab31482dcae9cd58bbb2c72e09cf0c1e66975d523aa1ee",
        "kind": "axis", "command": 0, "key": "width", "before": "10cm", "after": "11cm"},
    "AT4-54": {"filename": "heatmap.tex", "case_id": "54",
        "sha256": "5b1df730d4c440906caf760ac36bf6440280e98233f07480ca0a8d55dcf87758",
        "kind": "axis", "command": 0, "key": "width", "before": "10cm", "after": "11cm"},
    "AT4-55": {"filename": "surface-gaussian.tex", "case_id": "55",
        "sha256": "19a9b97ea74710a4e9b218bbe7901e6b41474e2e8100bf77578ed6d42a86465d",
        "kind": "addplot", "command": 1, "key": "samples", "before": "21", "after": "25"},
    "AT4-56": {"filename": "parametric-helix.tex", "case_id": "56",
        "sha256": "f8b301977a879cc567720a1b68d1847eb22d6860da6c6f9fecf07ab297229b31",
        "kind": "addplot", "command": 1, "key": "samples", "before": "181", "after": "201"},
    "AT4-57": {"filename": "vector-field.tex", "case_id": "57",
        "sha256": "725d9b0901aa2a0313a2a17bfffd699f515469b821f525c930b5939ab3bd0684",
        "kind": "axis", "command": 0, "key": "height", "before": "6cm", "after": "7cm"},
    "AT4-58": {"filename": "discontinuous-function.tex", "case_id": "58",
        "sha256": "6453529f14b8d1545af293f59ff5b6f1b1ea1d4e28d5bf8992ecd1af7b2033c1",
        "kind": "axis", "command": 0, "key": "width", "before": "10cm", "after": "11cm"},
    "AT4-59": {"filename": "group-plots.tex", "case_id": "59",
        "sha256": "3e29c55b8ac122d693b0137e094c93ac863628151fb8b909f8143eb992fdcd81",
        "kind": "groupplot", "command": 0, "key": "width", "before": "6cm", "after": "7cm"},
    "AT4-60": {"filename": "table-derived-column.tex", "case_id": "60",
        "sha256": "4d21b62e934fab6a563a89c0890206b6f3b49d9779ee25b9a6e52af72b3241b7",
        "kind": "tabletypeset", "command": 0, "key": "columns",
        "before": "{x,y,model}", "after": "{x,model,y}"},
    "AT4-61": {"filename": "bode-magnitude.tex", "case_id": "61",
        "sha256": "c4210c312f3825195409616a801091a1ecd7b37583310be7d9d87fb22a2f0758",
        "kind": "addplot", "command": 1, "key": "samples", "before": "161", "after": "201"},
}
SUITES = ("v2", "v2-clean", "at4")


def _suite(suite: str) -> str:
    if suite not in SUITES:
        raise ValueError("Unsupported PGFPlots evidence suite: " + str(suite))
    return suite


def fixtures_for_suite(suite: str = "v2") -> tuple[str, ...]:
    suite = _suite(suite)
    # Keep the bounded V2 corpus and checks unchanged, while running SV-009
    # last so its known strict-log warning cannot prevent earlier cases from
    # producing their independent evidence.
    if suite == "at4":
        return tuple(AT4_CASES)
    originals = ("formula", "external-tables", "SV-001", "SV-003", "SV-022",
                 "SV-029", "SV-040", "SV-009")
    return tuple(CLEAN_REPLACEMENTS.get(name, name) for name in originals) if suite == "v2-clean" else originals


def operation_inventory(suite: str = "v2") -> tuple["Operation", ...]:
    suite = _suite(suite)
    return {"v2": OPERATIONS, "v2-clean": CLEAN_OPERATIONS, "at4": AT4_OPERATIONS}[suite]


def suite_scope(suite: str = "v2") -> str:
    suite = _suite(suite)
    return {"v2": SCOPE, "v2-clean": CLEAN_SCOPE, "at4": AT4_SCOPE}[suite]


def suite_metadata(suite: str) -> dict:
    suite = _suite(suite)
    return {"schema_version": 1,
            "fixture_origin": {
                "v2": "TWO_SYNTHETIC_CASES_PLUS_SIX_BYTE_IDENTICAL_NAMED_CORPUS_INPUTS",
                "v2-clean": "TWO_SYNTHETIC_PLUS_THREE_ORIGINAL_PLUS_THREE_ATTRIBUTED_DERIVATIVES",
                "at4": "SEVENTEEN_EXACT_ORIGINAL_AI88_AT4_CORPUS_INPUTS"}[suite],
            "synthetic_optical_scope": (
                "18 Inspector source transactions; explicit tick lists override tick distances; only final revision PDF is built"
                if suite != "at4" else "NOT_APPLICABLE_NO_SYNTHETIC_AT4_INPUTS"),
            "screen": list(SCREEN), "client": list(CLIENT),
            "aggregate_sc3_at4": "NOT_VERIFIED", "physical_win10": "NOT_RUN",
            "physical_mac_arm": "NOT_RUN", "independent_visual_review": "REQUIRED"}


def fixture_path(fixture: str) -> Path:
    if fixture in clean_derivatives.SPECS:
        return clean_derivatives.DEFAULT_OUTPUT / (fixture + ".tex")
    if fixture in AT4_CASES:
        return AT4_EXAMPLES / AT4_CASES[fixture]["filename"]
    if fixture in NAMED_SV:
        return SOURCE_ROOT / "roadmap/Tikzarium_Scientific_142_R4/fixtures/SR" / fixture / "figure.tex"
    if fixture not in DEPENDENCIES:
        raise ValueError("Unknown PGFPlots fixture: " + fixture)
    return FIXTURES / (fixture + ".tex")


def fixture_bytes(fixture: str) -> bytes:
    # Named corpus inputs are byte-identical. Disposable CI must have their
    # declared Charis SIL font; absence is a failure, never a substitution.
    if fixture in clean_derivatives.SPECS:
        return clean_derivatives.fixture_evidence(fixture)["derived_bytes"]
    contents = fixture_path(fixture).read_bytes()
    if fixture in AT4_CASES and digest(contents) != AT4_CASES[fixture]["sha256"]:
        raise ValueError("Original AI88 AT4 case bytes/hash mismatch: " + fixture)
    if fixture == "SV-040" and digest(contents) != NATIVE_PLOT_ORIGINAL_SHA256:
        raise ValueError("Original native TikZ plot bytes/hash mismatch: " + fixture)
    return contents


def original_fixture_bytes(fixture: str) -> bytes:
    if fixture in clean_derivatives.SPECS:
        return clean_derivatives.fixture_evidence(fixture)["original_bytes"]
    return fixture_bytes(fixture)


def corpus_backed(fixture: str) -> bool:
    return fixture in NAMED_SV or fixture in AT4_CASES or fixture in clean_derivatives.SPECS


@dataclass(frozen=True)
class Operation:
    fixture: str
    command: int
    kind: str
    key: str
    before: str
    after: str

    @property
    def name(self) -> str:
        return f"{self.fixture}-{self.kind}{self.command}-{self.key.replace(' ', '-')}"

    @property
    def property_index(self) -> int:
        return PROPERTY_KEYS[self.kind].index(self.key)

    def patch(self, source: bytes) -> bytes:
        old = (self.key + "=" + self.before).encode("utf-8")
        new = (self.key + "=" + self.after).encode("utf-8")
        # Fixtures deliberately use unique literals. A collision makes the
        # test ambiguous and must fail rather than choosing an arbitrary edit.
        if self.before == self.after or source.count(old) != 1:
            raise ValueError("Operation must target one unique existing literal: " + self.name)
        return source.replace(old, new, 1)


OPERATIONS = tuple(Operation("formula", 0, "axis", key, before, after) for key, before, after in (
    ("samples", "41", "43"), ("domain", "-3:3", "-2.5:2.5"),
    ("xmin", "-3.2", "-3.1"), ("xmax", "3.2", "3.1"),
    ("ymin", "-0.2", "-0.1"), ("ymax", "1.2", "1.3"),
    ("xtick distance", "1", "0.5"), ("ytick distance", "0.2", "0.25"),
    ("xtick", "{-3,-2,-1,0,1,2,3}", "{-2,0,2}"),
    ("ytick", "{0,0.5,1}", "{0,0.25,0.5,0.75,1}"),
    ("width", "10cm", "11cm"), ("height", "6cm", "7cm"),
    ("xlabel", "{Время x}", "{Время t}"),
    ("ylabel", "{Амплитуда y}", "{Амплитуда A}"), ("mark", "none", "+"),
)) + (
    Operation("formula", 1, "addplot", "samples", "51", "53"),
    Operation("formula", 1, "addplot", "domain", "-2.8:2.8", "-2.6:2.6"),
    Operation("formula", 1, "addplot", "mark", "*", "x"),
    Operation("external-tables", 0, "axis", "ymax", "2.7", "2.9"),
    Operation("external-tables", 1, "addplot", "mark", "*", "x"),
    Operation("external-tables", 2, "addplot", "mark", "+", "x"),
    Operation("SV-001", 0, "axis", "ymax", "1.4", "1.2"),
    Operation("SV-003", 0, "axis", "xmax", "1080", "1000"),
    Operation("SV-009", 1, "addplot", "domain", "0:1.5", "0:1.4"),
    Operation("SV-022", 0, "axis", "width", r"0.6\textwidth", r"0.7\textwidth"),
    Operation("SV-029", 0, "axis", "height", r"0.3\textwidth", r"0.4\textwidth"),
    Operation("SV-040", 0, "nativeplot", "samples", "50", "80"),
)

AT4_OPERATIONS = tuple(Operation(fixture, values["command"], values["kind"], values["key"],
                                 values["before"], values["after"])
                      for fixture, values in AT4_CASES.items())
CLEAN_OPERATIONS = tuple(replace(op, fixture=CLEAN_REPLACEMENTS[op.fixture])
                         if op.fixture in CLEAN_REPLACEMENTS else op for op in OPERATIONS)
# Shared fixtures have one transaction inventory regardless of the selected suite.
ALL_OPERATIONS = OPERATIONS + tuple(op for op in CLEAN_OPERATIONS
                                   if op.fixture in clean_derivatives.SPECS) + AT4_OPERATIONS


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha(path: Path) -> str:
    return digest(path.read_bytes())


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def operations(fixture: str) -> tuple[Operation, ...]:
    return tuple(operation for operation in ALL_OPERATIONS if operation.fixture == fixture)


def _dependencies(fixture: str) -> tuple[str, ...]:
    if fixture not in DEPENDENCIES and fixture not in AT4_CASES:
        raise ValueError("Unknown PGFPlots fixture: " + fixture)
    return DEPENDENCIES.get(fixture, ())


def dependency_hashes(directory: Path, fixture: str) -> dict[str, str]:
    return {name: sha(directory / name) for name in _dependencies(fixture)}


def expected_sequence(fixture: str) -> list[tuple[str, bytes]]:
    original = fixture_bytes(fixture)
    sequence = [("opened", original)]
    for operation in operations(fixture):
        sequence.extend(((operation.name + "-draft", original),
                         (operation.name + "-applied", operation.patch(original)),
                         (operation.name + "-undo", original)))
    scoped_operations = operations(fixture)
    final = scoped_operations[-1].patch(original) if scoped_operations else original
    if scoped_operations:
        sequence.append(("final-applied", final))
    sequence.extend((("reopened", final), ("built", final)))
    return sequence


def _original_manifest_entry(fixture: str) -> dict:
    if fixture in clean_derivatives.SPECS:
        proof = clean_derivatives.fixture_evidence(fixture)["manifest"]
        return {"path": str(fixture_path(fixture).relative_to(SOURCE_ROOT)),
                "source_path": proof["original_path"], "corpus_id": proof["corpus_id"],
                "source_kind": "ATTRIBUTED_CLEAN_DERIVATIVE_NOT_ORIGINAL_CORPUS",
                "original_sha256": proof["original_sha256"],
                "runtime_sha256": proof["derived_sha256"],
                "runtime_source_identical_to_original": False,
                "derivative": proof,
                "operation_scope": "NAMED_LITERAL_APPLY_UNDO_ON_EXPLICIT_DERIVATIVE"}
    if fixture in AT4_CASES:
        case = AT4_CASES[fixture]
        source_path = f"{AT4_RELATIVE_EXAMPLES}/{case['filename']}"
        return {"path": source_path, "source_path": source_path,
                "case_id": case["case_id"], "source_kind": "ORIGINAL_AI88_AT4_CORPUS",
                "original_sha256": case["sha256"], "runtime_sha256": case["sha256"],
                "runtime_source_identical_to_original": True,
                "derivative": "NONE; runtime source is byte-identical to original"}
    return {"path": str(fixture_path(fixture).relative_to(SOURCE_ROOT)),
            "original_sha256": sha(fixture_path(fixture)),
            "runtime_sha256": digest(fixture_bytes(fixture)),
            "derivative": "NONE; original source and typography byte-identical",
            "operation_scope": "BOUNDED_NATIVE_TIKZ_GAUSSIAN_SAMPLES_APPLY_UNDO" if fixture == "SV-040" else "NAMED_LITERAL_APPLY_UNDO"}


def prepare(out: Path, suite: str = "v2") -> dict:
    suite = _suite(suite)
    fixtures = fixtures_for_suite(suite)
    scoped_operations = operation_inventory(suite)
    if out.exists() and any(out.iterdir()):
        raise ValueError("PGFPlots evidence directory must be empty")
    out.mkdir(parents=True, exist_ok=True)
    inputs = out / "inputs"
    live = out / "live"
    inputs.mkdir()
    live.mkdir()
    fixture_hashes = {}
    for fixture in fixtures:
        target = live / fixture
        target.mkdir()
        for name in (fixture + ".tex", *_dependencies(fixture)):
            contents = fixture_bytes(fixture) if name.endswith(".tex") else (FIXTURES / name).read_bytes()
            (inputs / name).write_bytes(contents)
            (target / name).write_bytes(contents)
            fixture_hashes[name] = digest(contents)
        if corpus_backed(fixture):
            (inputs / (fixture + ".original-corpus.tex")).write_bytes(original_fixture_bytes(fixture))
        for operation in operations(fixture):
            operation.patch((inputs / (fixture + ".tex")).read_bytes())
    manifest = {**suite_metadata(suite), "suite": suite, "scope": suite_scope(suite),
                "fixtures": list(fixtures), "created_utc": now(),
                "named_corpus_inputs": {name: _original_manifest_entry(name) for name in fixtures
                                         if corpus_backed(name)},
                "fixture_hashes": fixture_hashes,
                "operations": [asdict(operation) for operation in scoped_operations]}
    write_json(out / "manifest.json", manifest)
    return manifest


def record(out: Path, fixture: str, stage: str, source: Path, editor: Path,
           screenshot: Path, *, action: str) -> dict:
    directory = out / "observed" / fixture / stage
    directory.mkdir(parents=True, exist_ok=False)
    # Preserve original observations BEFORE assertions, including failures.
    for name, path in (("source.tex", source), ("editor.txt", editor),
                       ("desktop.original.png", screenshot)):
        (directory / name).write_bytes(path.read_bytes())
    dependencies = {}
    for name in _dependencies(fixture):
        (directory / name).write_bytes((source.parent / name).read_bytes())
        dependencies[name] = sha(directory / name)
    metadata = {"fixture": fixture, "stage": stage, "captured_utc": now(),
                "live_source": str(source.resolve()), "action": action,
                "files": {name: sha(directory / name) for name in
                          ("source.tex", "editor.txt", "desktop.original.png")},
                "dependencies": dependencies}
    write_json(directory / "stage.json", metadata)
    validate_stage(out, fixture, stage)
    return metadata


def validate_stage(out: Path, fixture: str, stage: str) -> dict:
    expected = dict(expected_sequence(fixture))[stage]
    directory = out / "observed" / fixture / stage
    metadata = read_json(directory / "stage.json")
    if metadata.get("fixture") != fixture or metadata.get("stage") != stage:
        raise ValueError("Stage identity mismatch: " + stage)
    timestamp = datetime.fromisoformat(metadata["captured_utc"])
    if timestamp.tzinfo is None or timestamp.utcoffset() is None:
        raise ValueError("Stage timestamp must be timezone aware: " + stage)
    for name in ("source.tex", "editor.txt", "desktop.original.png"):
        if sha(directory / name) != metadata["files"].get(name):
            raise ValueError("Retained original hash mismatch: " + stage + "/" + name)
    if (directory / "source.tex").read_bytes() != expected:
        raise ValueError("Unexpected source bytes: " + stage)
    if normalized_clipboard((directory / "editor.txt").read_bytes()) != normalized_clipboard(expected):
        raise ValueError("Editor clipboard differs from source revision: " + stage)
    if original_image_size(directory / "desktop.original.png") != SCREEN:
        raise ValueError("Original desktop geometry differs from bounded scope")
    if Path(metadata["live_source"]).resolve() != (out / "live" / fixture / (fixture + ".tex")).resolve():
        raise ValueError("Observed document path is not the separate fixture live source")
    expected_dependencies = dependency_hashes(out / "inputs", fixture)
    if metadata.get("dependencies") != expected_dependencies:
        raise ValueError("Dependency metadata changed: " + stage)
    if dependency_hashes(directory, fixture) != expected_dependencies:
        raise ValueError("Original dependency bytes changed: " + stage)
    return metadata


def validate_all(out: Path, suite: str = "v2") -> dict:
    suite = _suite(suite)
    fixtures = fixtures_for_suite(suite)
    scoped_operations = operation_inventory(suite)
    manifest = read_json(out / "manifest.json")
    if (manifest.get("suite") != suite or manifest.get("fixtures") != list(fixtures)
            or manifest.get("scope") != suite_scope(suite)
            or manifest.get("operations") != [asdict(op) for op in scoped_operations]):
        raise ValueError("Manifest suite, fixture, scope, or operation inventory differs")
    for key, expected in suite_metadata(suite).items():
        if manifest.get(key) != expected:
            raise ValueError("Manifest provenance or acceptance boundary differs: " + key)
    expected_files = {fixture + ".tex" for fixture in fixtures} | {
        name for fixture in fixtures for name in _dependencies(fixture)}
    if set(manifest.get("fixture_hashes", {})) != expected_files:
        raise ValueError("Manifest fixture hash inventory differs")
    for name, checksum in manifest["fixture_hashes"].items():
        fixture = name.removesuffix(".tex")
        canonical = fixture_bytes(fixture) if name.endswith(".tex") else (FIXTURES / name).read_bytes()
        if sha(out / "inputs" / name) != checksum or digest(canonical) != checksum:
            raise ValueError("Original fixture input changed: " + name)
    for fixture in tuple(name for name in fixtures if corpus_backed(name)):
        original = out / "inputs" / (fixture + ".original-corpus.tex")
        entry = manifest.get("named_corpus_inputs", {}).get(fixture, {})
        canonical = fixture_bytes(fixture)
        if (entry != _original_manifest_entry(fixture)
                or sha(original) != entry.get("original_sha256")
                or original.read_bytes() != original_fixture_bytes(fixture)
                or digest(canonical) != entry.get("runtime_sha256")):
            raise ValueError("Original named corpus changed: " + fixture)
    expected_corpus = {name for name in fixtures if corpus_backed(name)}
    if set(manifest.get("named_corpus_inputs", {})) != expected_corpus:
        raise ValueError("Manifest original corpus inventory differs")
    expected_inputs = expected_files | {fixture + ".original-corpus.tex" for fixture in expected_corpus}
    if {path.name for path in (out / "inputs").iterdir()} != expected_inputs:
        raise ValueError("Input file inventory differs")
    observed_root = out / "observed"
    if not observed_root.is_dir() or {path.name for path in observed_root.iterdir()} != set(fixtures):
        raise ValueError("Observed fixture inventory differs")
    for fixture in fixtures:
        expected_names = [name for name, _ in expected_sequence(fixture)]
        observed = out / "observed" / fixture
        if sorted(path.name for path in observed.iterdir()) != sorted(expected_names):
            raise ValueError("Incomplete or extra stage inventory: " + fixture)
        previous = None
        for stage in expected_names:
            metadata = validate_stage(out, fixture, stage)
            captured = datetime.fromisoformat(metadata["captured_utc"])
            if previous is not None and captured < previous:
                raise ValueError("Nonmonotonic stage observations: " + stage)
            previous = captured
    return {"suite": suite, "scope": suite_scope(suite), "status": "PASS_AUTOMATED_ORIGINAL_REVIEW_REQUIRED",
            "operations_observed": len(scoped_operations), "aggregate_sc3_at4": "NOT_VERIFIED",
            "native_acceptance": "REQUIRES_INDEPENDENT_REVIEW", "physical_win10": "NOT_RUN"}
