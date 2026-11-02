"""I57: four-library real-X11 runner preflight, not a headless acceptance claim."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "scripts/qa_i57_four_libs_x11.py"
spec = importlib.util.spec_from_file_location("i57", SRC)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class MatrixTests(unittest.TestCase):
    def setUp(self):
        self.profile = json.loads((ROOT / "fixtures/qa/i57-four-library-targets.json").read_text())
        self.tree = self.profile["tree"]
        self.base = json.loads((ROOT / "fixtures/qa/i53-b38-live-libraries-1366.json").read_text())

    def test_four_and_only_four_c_libraries_and_exact_tree(self):
        self.assertEqual(set(m.LIBRARIES), {"arrows.meta", "positioning", "calc", "fit"})
        self.assertEqual(self.base["tree"], self.tree)
        m.validate_matrix(self.profile, self.tree)
        for name in m.LIBRARIES:
            combined = m.combined_profile(self.base, self.profile, name)
            self.assertEqual(combined["tree"], self.tree)
            self.assertEqual(combined["i57_library"], name)
            self.assertEqual(combined["library"], self.profile["libraries"][name]["library"])
        self.assertNotIn("i57_library", self.base)

    def test_matrix_rejects_missing_or_extra_library(self):
        for name in m.LIBRARIES:
            bad = json.loads(json.dumps(self.profile))
            bad["libraries"].pop(name)
            with self.assertRaises(ValueError):
                m.validate_matrix(bad, self.tree)
        bad = json.loads(json.dumps(self.profile))
        bad["libraries"]["shapes"] = bad["libraries"]["fit"]
        with self.assertRaises(ValueError):
            m.validate_matrix(bad, self.tree)

    def test_unreviewed_or_stale_coordinate_profiles_fail_closed(self):
        with self.assertRaises(ValueError):
            m.validate_matrix(self.profile, "wrong-app-tree")
        for name in m.LIBRARIES:
            bad = json.loads(json.dumps(self.profile))
            bad["libraries"][name]["connect"] = [105, 580]
            with self.assertRaises(ValueError):
                m.validate_matrix(bad, self.tree)
        with self.assertRaises(ValueError):
            m.combined_profile({"tree": "old"}, self.profile, "fit")

    def test_literal_one_import_and_opaque_source_no_mutation(self):
        driver = ROOT / "scripts/qa_i53_live_libraries_x11.py"
        spec2 = importlib.util.spec_from_file_location("i57_source_fixture", driver)
        old = importlib.util.module_from_spec(spec2)
        spec2.loader.exec_module(old)
        for name in m.LIBRARIES:
            literal = m.declaration(name)
            self.assertIn(b"\\usetikzlibrary{", literal)
            self.assertIn(b"\\OpaqueLabel", old.SRC)
            self.assertIn("Не менять".encode(), old.SRC)
            result = old.SRC.replace(b"\\begin{document}", literal + b"\\begin{document}", 1)
            self.assertEqual(result.count(literal), 1)
            self.assertEqual(result.replace(literal, b"", 1), old.SRC)
        with self.assertRaises(ValueError):
            m.declaration("shapes")

    def test_real_x11_and_main_push_gate_not_promoted_to_physical(self):
        flow = (ROOT / ".github/workflows/i57-n2-four-live-x11.yml").read_text()
        for literal in ("pull_request:", "branches: [main, b40-egui-source-undo-transaction-fence, b41-egui-pinned-parameter-apply]",
                        "branches: [main, qa/i58-b40-source-history-x11, qa/i60-b41-inspector-real-x11, b41-egui-pinned-parameter-apply]", "push:", "workflow_dispatch:",
                        "xvfb-run", "qa_i57_four_libs_x11.py", "qa_i53_live_libraries_x11.py",
                        "git rev-parse HEAD", self.tree,
                        "github.event.pull_request.head.sha || github.sha"):
            self.assertIn(literal, flow)
        self.assertNotIn("ubuntu-latest", flow)
        self.assertNotIn("miktex --install", flow)


if __name__ == "__main__":
    unittest.main()
