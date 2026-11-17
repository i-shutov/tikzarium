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
        data = self.original(case_id)
        if case_id == "34":
            return data.replace(b"samples=301", b"samples=401", 1)
        if case_id == "35":
            return data.replace(b"samples=251", b"samples=301", 1)
        if case_id in {"51", "52", "53", "54", "57"}:
            key = b"height=6cm" if case_id == "57" else b"width=10cm"
            replacement = b"height=7cm" if case_id == "57" else b"width=11cm"
            return data.replace(key, replacement, 1)
        operation, = evidence.operations("AT4-" + case_id)
        old = (operation.key + "=" + operation.before).encode("ascii")
        new = (operation.key + "=" + operation.after).encode("ascii")
        self.assertEqual(data.count(old), 1)
        derivative = data.replace(old, new, 1)
        self.assertEqual(derivative.replace(new, old, 1), data)
        return derivative

    def validate(self, case_id, source, record_override=None):
        record = qa.load_catalogue_record(self.catalogue, case_id) if case_id in {"34", "35", "48", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60"} else None
        if record_override is not None:
            record = record_override
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

    def test_59_rejects_formula_range_label_order_panel_and_data_claim_changes(self):
        original = self.original("59").decode()
        for old, new in (
                ("sin(deg(x))", "cos(deg(x))"),
                ("cos(deg(x))", "cos(x)"),
                ("domain=0:6.28", "domain=0:6.3"),
                ("samples=101", "samples=100"),
                (r"ylabel={$\sin t$}", r"ylabel={$\cos t$}"),
                ("width=6cm", "width=8cm")):
            with self.subTest(old=old, new=new):
                self.assertIn(old, original)
                with self.assertRaises(qa.InvariantViolation):
                    self.validate("59", original.replace(old, new, 1))
        swapped = original.replace("{sin(deg(x))};", "{__TEMP__};", 1).replace("{cos(deg(x))};", "{sin(deg(x))};", 1).replace("{__TEMP__};", "{cos(deg(x))};", 1)
        with self.assertRaises(qa.InvariantViolation):
            self.validate("59", swapped)
        with self.assertRaises(qa.InvariantViolation):
            self.validate("59", original.replace(r"\begin{tikzpicture}", r"\begin{tikzpicture}% measured experimental data"))

    def test_59_rejects_trig_overrides_and_group_or_subplot_option_overrides(self):
        original = self.original("59").decode()
        mutations = (
            (r"\pgfplotsset{compat=1.18}", r"\pgfplotsset{compat=1.18,trig format plots=rad}"),
            (r"\begin{document}", r"\pgfkeys{/pgf/trig format=rad}" + "\n" + r"\begin{document}"),
            ("width=6cm", "width=6cm,width=2cm"),
            (r"\nextgroupplot[ylabel={$\cos t$}]",
             r"\nextgroupplot[ylabel={$\cos t$},width=2cm]"),
            ("samples=101", "samples=101,samples=99"),
            ("blue,domain=0:6.28,samples=101", "blue,/pgfplots/trig format plots=rad,domain=0:6.28,samples=101"),
        )
        for old, new in mutations:
            with self.subTest(old=old):
                self.assertIn(old, original)
                with self.assertRaises(qa.InvariantViolation):
                    self.validate("59", original.replace(old, new, 1))

    def test_59_rejects_catalogue_reinterpretation(self):
        original = self.original("59")
        record = qa.load_catalogue_record(self.catalogue, "59")
        for field, wrong in (("description", "Measured experimental data in two panels."),
                             ("check", "Measured amplitudes are statistically significant.")):
            with self.subTest(field=field):
                with self.assertRaises(qa.InvariantViolation):
                    qa.validate_case("59", original, dict(record, **{field: wrong}))

    def test_60_rejects_formula_raw_data_duplicate_or_unapproved_columns_order(self):
        original = self.original("60").decode()
        for old, new in (
                (r"\thisrow{x}^2", r"\thisrow{x}^3"),
                (r"2 3.9", r"2 4.0"),
                ("columns={x,y,model}", "columns={x,model,model}"),
                ("columns={x,y,model}", "columns={y,x,model}"),
                ("column name=$x^2$", "column name=$x^3$"),
                (r"\toprule", r"\midrule")):
            with self.subTest(old=old, new=new):
                self.assertIn(old, original)
                with self.assertRaises(qa.InvariantViolation):
                    self.validate("60", original.replace(old, new, 1))

    def test_60_accepts_only_original_or_proposed_unique_column_order(self):
        original = self.original("60").decode()
        reordered = original.replace("columns={x,y,model}", "columns={x,model,y}", 1)
        for source in (original, reordered):
            with self.subTest(order="proposed" if source == reordered else "original"):
                self.assertEqual(self.validate("60", source)["source_checks"], "PASS_SOURCE_SEMANTICS_ONLY")

    def test_new_at4_cases_accept_only_bounded_scientific_operations(self):
        for case_id in ("34", "35", "51", "52", "53", "54", "57"):
            with self.subTest(case_id=case_id, variant="original"):
                self.assertEqual(self.validate(case_id, self.original(case_id))["source_checks"], "PASS_SOURCE_SEMANTICS_ONLY")
            with self.subTest(case_id=case_id, variant="proposed"):
                self.assertEqual(self.validate(case_id, self.proposed(case_id))["source_checks"], "PASS_SOURCE_SEMANTICS_ONLY")
        histogram = self.validate("52", self.original("52"))
        self.assertEqual(histogram["measurements"]["equal_width_bin_counts"], [2, 3, 4, 2, 1])
        self.assertEqual(histogram["measurements"]["frequency_total"], 12)
        self.assertIn("not explicitly specified", histogram["measurements"]["normalization"])

    def test_new_case_parsers_ignore_tex_comments_and_reject_commented_out_plots(self):
        for case_id in ("34", "35", "51", "52", "53", "54", "57"):
            original = self.original(case_id).decode()
            lines = original.splitlines(keepends=True)
            index = next(i for i, line in enumerate(lines) if r"\addplot" in line)
            lines[index] = "% " + lines[index]
            with self.subTest(case_id=case_id):
                with self.assertRaises(qa.InvariantViolation):
                    self.validate(case_id, "".join(lines))

    def test_34_rejects_formula_guard_domain_trig_and_extra_plot_mutations(self):
        original = self.original("34").decode()
        for old, new in (("abs(x)<0.0001", "abs(x)<0.001"), ("sin(deg(x))", "sin(x)"),
                         ("domain=-12:12", "domain=-10:12"), ("samples=301", "samples=302"),
                         ("ymin=0", "ymin=-1")):
            with self.subTest(old=old):
                with self.assertRaises(qa.InvariantViolation):
                    self.validate("34", original.replace(old, new, 1))
        with self.assertRaises(qa.InvariantViolation):
            self.validate("34", original.replace(r"\end{axis}", r"\addplot coordinates {(0,1)};\end{axis}"))

    def test_35_rejects_damping_phase_domain_envelope_and_nonfirst_sample_mutations(self):
        original = self.original("35").decode()
        for old, new in (("exp(-.22*x)", "exp(-.2*x)"), ("cos(deg(3*x))", "cos(3*x)"),
                         ("domain=0:10", "domain=0:9"), ("samples=251", "samples=252"),
                         ("{-exp(-.22*x)}", "{-exp(-.21*x)}")):
            with self.subTest(old=old):
                with self.assertRaises(qa.InvariantViolation):
                    self.validate("35", original.replace(old, new, 1))
        # The proposal is limited to the analytic series and cannot add a sample option to either envelope.
        with self.assertRaises(qa.InvariantViolation):
            self.validate("35", original.replace("gray,dashed,domain=0:10", "gray,dashed,domain=0:10,samples=301", 1))
        self.assert_extra_plot_rejected("35", original)

    def test_51_rejects_baseline_values_categories_or_added_plot(self):
        original = self.original("51").decode()
        for old, new in (("ymin=0", "ymin=-1"), ("(A,3)", "(A,0)"),
                         ("symbolic x coords={A,B,C}", "symbolic x coords={A,B,D}"),
                         (r"\legend{Series 1,Series 2}", r"\legend{Measured,Series 2}")):
            with self.subTest(old=old):
                with self.assertRaises(qa.InvariantViolation):
                    self.validate("51", original.replace(old, new, 1))

    def test_52_rejects_sample_count_bins_domain_or_options_overlay(self):
        original = self.original("52").decode()
        for old, new in (("data min=0", "data min=.1"), ("bins=5", "bins=4"),
                         ("\\4.4", ""), ("ymin=0", "ymin=-1"),
                         ("hist={", "hist={cumulative,"),
                         (r"\usepgfplotslibrary{statistics}", "")):
            with self.subTest(old=old):
                with self.assertRaises(qa.InvariantViolation):
                    self.validate("52", original.replace(old, new, 1))
        self.assert_extra_plot_rejected("52", original)

    def test_53_rejects_prepared_order_and_unqualified_real_data_claims(self):
        original = self.original("53").decode()
        with self.assertRaises(qa.InvariantViolation):
            self.validate("53", original.replace("median=3", "median=5", 1))
        record = qa.load_catalogue_record(self.catalogue, "53")
        with self.assertRaises(qa.InvariantViolation):
            self.validate("53", original, dict(record, check="Quartiles were inferred from measured observations."))
        self.assert_extra_plot_rejected("53", original)

    def test_54_rejects_meta_position_value_grid_or_color_semantics_mutations(self):
        original = self.original("54").decode()
        for old, new in (("(1,1)[5]", "(1,1)[1]"), ("(2,2)[2]", "(2,3)[2]"),
                         ("point meta=explicit", "point meta=none"), ("mesh/cols=3", "mesh/cols=2")):
            with self.subTest(old=old):
                with self.assertRaises(qa.InvariantViolation):
                    self.validate("54", original.replace(old, new, 1))
        self.assert_extra_plot_rejected("54", original)

    def test_57_rejects_field_components_grid_origin_and_axis_shape_mutations(self):
        original = self.original("57").decode()
        for old, new in (("u=-y,v=x", "u=y,v=x"), ("0 -1", "0 -2"),
                         ("(0,0)", "(1,0)"), ("axis equal image", "axis equal")):
            with self.subTest(old=old):
                with self.assertRaises(qa.InvariantViolation):
                    self.validate("57", original.replace(old, new, 1))
        self.assert_extra_plot_rejected("57", original)

    def assert_extra_plot_rejected(self, case_id, original):
        overlay = r"\addplot coordinates {(0,100)(1,100)};"
        mutation = original.replace(r"\end{axis}", overlay + r"\end{axis}")
        with self.subTest(case_id=case_id, mutation="unbracketed extra plot"):
            with self.assertRaises(qa.InvariantViolation):
                self.validate(case_id, mutation)


if __name__ == "__main__":
    unittest.main(verbosity=2)
