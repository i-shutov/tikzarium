"""Stdlib unit tests for the source-level AT4 scientific invariant checks."""
from __future__ import annotations

import hashlib
import qa_pgfplots_vertical_evidence as evidence
import importlib.util
import json
import os
from pathlib import Path
import unittest

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("qa_at4_scientific_invariants", HERE / "qa_at4_scientific_invariants.py")
qa = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(qa)


def source_root() -> Path:
    configured = os.environ.get("TIKZARIUM_SOURCE_ROOT")
    if configured:
        return Path(configured)
    for candidate in (Path.cwd(), *Path.cwd().parents):
        if (candidate / "roadmap/AI_TIKZ_SKILLS_2026-11-10/examples").is_dir():
            return candidate
    raise unittest.SkipTest("set TIKZARIUM_SOURCE_ROOT to the recovered source repository")


class At4SourceInvariantTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = source_root()
        cls.examples = cls.root / "roadmap/AI_TIKZ_SKILLS_2026-11-10/examples"
        cls.catalogue = cls.root / "roadmap/AI_TIKZ_SKILLS_2026-11-10/catalogue.original.json"
        intake = json.loads((cls.root / "roadmap/AI_TIKZ_SKILLS_2026-11-10/AT4_SOURCE_INTAKE.json").read_text(encoding="utf-8"))
        cls.case_plan = {case["case_id"]: case for case in intake["files"]}

    def original(self, case_id):
        data = (self.examples / qa.CASE_FILES[case_id]).read_bytes()
        plan = self.case_plan[case_id]
        self.assertEqual(len(data), plan["bytes"])
        self.assertEqual(hashlib.sha256(data).hexdigest(), plan["sha256"])
        return data

    def proposed(self, case_id):
        plan = self.case_plan[case_id]
        data = self.original(case_id)
        operation, = evidence.operations("AT4-" + case_id)
        old = (operation.key + "=" + operation.before).encode("ascii")
        new = (operation.key + "=" + operation.after).encode("ascii")
        self.assertEqual(data.count(old), 1)
        derivative = data.replace(old, new, 1)
        self.assertEqual(derivative.replace(new, old, 1), data)
        return derivative

    def validate(self, case_id, source):
        record = qa.load_catalogue_record(self.catalogue, case_id) if case_id in {"48", "50", "55", "56", "58"} else None
        return qa.validate_case(case_id, source, record)

    def test_originals_and_proposed_derivatives_pass_source_checks(self):
        for case_id in qa.CASE_FILES:
            with self.subTest(case_id=case_id, variant="original"):
                result = self.validate(case_id, self.original(case_id))
                self.assertEqual(result["source_checks"], "PASS_SOURCE_SEMANTICS_ONLY")
                self.assertEqual(result["visual_check"], "NOT_RUN")
                self.assertEqual(result["native_gui_acceptance"], "NOT_RUN")
                self.assertEqual(result["pdf_check"], "NOT_RUN")
                self.assertEqual(result["independent_visual_review"], "REQUIRED")
            with self.subTest(case_id=case_id, variant="proposed"):
                result = self.validate(case_id, self.proposed(case_id))
                self.assertEqual(result["source_checks"], "PASS_SOURCE_SEMANTICS_ONLY")
                self.assertEqual(result["visual_check"], "NOT_RUN")

    def test_3d_original_catalogue_hash_and_intake_records_are_unchanged(self):
        intake = json.loads((self.root / "roadmap/AI_TIKZ_SKILLS_2026-11-10/AT4_SOURCE_INTAKE.json").read_text())
        self.assertEqual(hashlib.sha256(self.catalogue.read_bytes()).hexdigest(), intake["catalogue"]["sha256"])
        for case_id in ("55", "56"):
            record = qa.load_catalogue_record(self.catalogue, case_id)
            self.assertEqual(record["stem"] + ".tex", qa.CASE_FILES[case_id])
            self.assertEqual(record["engine"], "xelatex")
            original = self.original(case_id)
            self.assertNotIn(b"\n", original.replace(b"\r\n", b""))
            self.assertEqual(self.proposed(case_id).count(b"\r\n"), original.count(b"\r\n"))

    def test_55_rejects_changed_gaussian_peak_symmetry_square_domain_or_density(self):
        original = self.original("55").decode()
        for old, new in (
                ("exp(-x^2-y^2)", "exp(-x^2+y^2)"),
                ("exp(-x^2-y^2)", "2*exp(-x^2-y^2)"),
                ("exp(-x^2-y^2)", "exp(-(x-1)^2-y^2)"),
                ("domain=-2:2", "domain=-1:2"),
                ("domain y=-2:2", "domain y=-2:3"),
                ("samples=21", "samples=20"),
                ("samples=21", "samples=21,samples=99"),
                ("samples=21", "samples=21,error bars/.cd"),
                ("surf,", "mesh,"),
                ("view={45}{30}", "view={0}{90}")):
            with self.subTest(old=old, new=new):
                self.assertIn(old, original)
                with self.assertRaises(qa.InvariantViolation):
                    self.validate("55", original.replace(old, new, 1))

    def test_56_rejects_radius_parameter_pitch_turn_domain_and_surface_sampling_mutations(self):
        original = self.original("56").decode()
        for old, new in (
                ("{cos(x)}", "{2*cos(x)}"),
                ("{sin(x)}", "{sin(2*x)}"),
                ("{x/360}", "{x/720}"),
                ("{cos(x)}", "{cos(deg(x))}"),
                ("domain=0:720", "domain=0:360"),
                ("samples y=0", "samples y=1"),
                ("samples=181", "samples=180"),
                ("samples=181", "samples=181,domain=0:360"),
                ("samples=181", "samples=181,/custom/.cd"),
                ("view={50}{25}", "view={0}{90}")):
            with self.subTest(old=old, new=new):
                self.assertIn(old, original)
                with self.assertRaises(qa.InvariantViolation):
                    self.validate("56", original.replace(old, new, 1))

    def test_56_rejects_global_or_axis_trig_overrides_of_original_degree_semantics(self):
        original = self.original("56").decode()
        for mutation in (
                original.replace("compat=1.18", "compat=1.18,trig format plots=rad"),
                original.replace("view={50}{25}", "trig format plots=rad,view={50}{25}"),
                original.replace(r"\begin{document}", r"\pgfkeys{/pgf/trig format=rad}" + "\n" + r"\begin{document}")):
            with self.subTest(mutation=mutation):
                with self.assertRaises(qa.InvariantViolation):
                    self.validate("56", mutation)

    def test_3d_analytic_examples_reject_manufactured_measurement_series_and_labels(self):
        for case_id in ("55", "56"):
            original = self.original(case_id).decode()
            for inserted in (
                    r"\addplot[only marks] coordinates {(0,1)};",
                    r"\addplot3[only marks] coordinates {(0,0,1)};",
                    r"\addlegendentry{Measurements}"):
                with self.subTest(case_id=case_id, inserted=inserted):
                    mutation = original.replace(r"\end{axis}", inserted + "\n" + r"\end{axis}")
                    with self.assertRaises(qa.InvariantViolation):
                        self.validate(case_id, mutation)

    def test_3d_catalogue_cannot_reinterpret_formula_grid_or_two_turn_geometry(self):
        for case_id in ("55", "56"):
            record = qa.load_catalogue_record(self.catalogue, case_id)
            for field, wrong in (("description", "Experimental measurements with fitted parameters."),
                                 ("check", "The measured maximum is 2; one turn and z from 0 to 1.")):
                with self.subTest(case_id=case_id, field=field):
                    with self.assertRaises(qa.InvariantViolation):
                        qa.validate_case(case_id, self.original(case_id), dict(record, **{field: wrong}))

    def test_09_rejects_changed_model_formula_and_measurement_label(self):
        original = self.original("09").decode()
        with self.assertRaises(qa.InvariantViolation):
            self.validate("09", original.replace("1/(1+#1^2)", "1/(1+#1^3)"))
        with self.assertRaises(qa.InvariantViolation):
            self.validate("09", original.replace(r"\addlegendentry{Sampled model}", r"\addlegendentry{Measurements}"))

    def test_48_rejects_changed_error_magnitude_and_statistical_reinterpretation(self):
        original = self.original("48").decode()
        with self.assertRaises(qa.InvariantViolation):
            self.validate("48", original.replace("(3,4.1)+-(0,.4)", "(3,4.1)+-(0,.5)"))
        record = qa.load_catalogue_record(self.catalogue, "48")
        wrong_record = dict(record, check="These are confidence intervals with statistical significance.")
        with self.assertRaises(qa.InvariantViolation):
            qa.validate_case("48", original, wrong_record)

    def test_49_rejects_coordinate_that_breaks_h_squared(self):
        original = self.original("49").decode()
        with self.assertRaises(qa.InvariantViolation):
            self.validate("49", original.replace("(.05,.0025)", "(.05,.0035)"))

    def test_50_rejects_changed_boundary_and_unbound_fill_path(self):
        original = self.original("50").decode()
        with self.assertRaises(qa.InvariantViolation):
            self.validate("50", original.replace(".7*x+.5", ".7*x+.6"))
        with self.assertRaises(qa.InvariantViolation):
            self.validate("50", original.replace("of=upper and lower", "of=upper and lower2"))
        wrong_record = qa.load_catalogue_record(self.catalogue, "50")
        wrong_record["check"] = "A statistically estimated confidence interval."
        with self.assertRaises(qa.InvariantViolation):
            qa.validate_case("50", original, wrong_record)

    def test_58_rejects_missing_nan_or_jump_mode(self):
        original = self.original("58").decode()
        with self.assertRaises(qa.InvariantViolation):
            self.validate("58", original.replace("unbounded coords=jump", "unbounded coords=discard"))
        with self.assertRaises(qa.InvariantViolation):
            self.validate("58", original.replace("(0,nan)", "(0,0)"))
        wrong_record = qa.load_catalogue_record(self.catalogue, "58")
        wrong_record["check"] = "Dense smooth samples everywhere."
        with self.assertRaises(qa.InvariantViolation):
            qa.validate_case("58", original, wrong_record)

    def test_61_rejects_changed_transfer_function_and_domain(self):
        original = self.original("61").decode()
        with self.assertRaises(qa.InvariantViolation):
            self.validate("61", original.replace("1+x^2", "1+x^4"))
        with self.assertRaises(qa.InvariantViolation):
            self.validate("61", original.replace("domain=.01:100", "domain=.01:1000"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
