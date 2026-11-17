"""Negative and bounded-operation tests for SV-040 scientific source checks."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("qa_native_plot_scientific_invariants", HERE / "qa_native_plot_scientific_invariants.py")
qa = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(qa)


def source_path() -> Path:
    for root in (HERE.parent, *HERE.parents):
        candidate = root / "roadmap/Tikzarium_Scientific_142_R4/fixtures/SR/SV-040/figure.tex"
        if candidate.is_file():
            return candidate
    raise unittest.SkipTest("SV-040 fixture not found")


class NativePlotScientificInvariantTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = source_path().read_bytes()

    def test_original_and_sample_proposal_preserve_source_invariants(self):
        for source, density in ((self.original, 50), (self.original.replace(b"samples=50", b"samples=80", 1), 80)):
            with self.subTest(density=density):
                result = qa.validate_source(source)
                self.assertEqual(result["source_checks"], "PASS_SOURCE_SEMANTICS_ONLY")
                self.assertEqual(result["sample_count"], density)
                self.assertEqual(result["visual_check"], "NOT_RUN")
                self.assertAlmostEqual(result["source_guide_halfwidth"], .83)
                self.assertAlmostEqual(result["exact_halfwidth"], .8325546111576977)

    def test_rejects_formula_domain_labels_guides_and_sample_overlays(self):
        text = self.original.decode()
        mutations = (
            (r"exp(-\x*\x)", r"exp(-\x*\x*\x)"),
            ("domain=-1.6:1.6", "domain=-1.5:1.6"),
            ("samples=50", "samples=51"),
            ("(-0.83,0.5)", "(-0.84,0.5)"),
            ("(0,0.5)", "(0,0.6)"),
            ("$I(t)/I_0$", "$I(t)$"),
            ("(-2,0) -- (2,0)", "(-2,0) -- (3,0)"),
        )
        for old, new in mutations:
            with self.subTest(old=old):
                self.assertIn(old, text)
                with self.assertRaises(qa.InvariantViolation):
                    qa.validate_source(text.replace(old, new, 1).encode())

    def test_reports_halfheight_guides_as_rounded_approximation(self):
        result = qa.validate_source(self.original)
        self.assertAlmostEqual(result["guide_approximation_absolute_error"], abs(.83 - .8325546111576977))
        self.assertLess(result["guide_approximation_relative_error"], .004)
        self.assertIn("rounded ±0.83", result["limits"])

    def test_rejects_commented_out_required_label_and_any_unapproved_draw(self):
        text = self.original.decode()
        commented = text.replace(r"\draw (0,0) node[below] {$t_{0.5}$};", "% \\draw (0,0) node[below] {$t_{0.5}$};", 1)
        extra = text.replace(r"\end{tikzpicture}", r"\draw (1,1) circle (2);\end{tikzpicture}", 1)
        for mutation in (commented, extra):
            with self.subTest(mutation="commented required label" if mutation == commented else "extra draw"):
                with self.assertRaises(qa.InvariantViolation):
                    qa.validate_source(mutation.encode())


if __name__ == "__main__":
    unittest.main(verbosity=2)
