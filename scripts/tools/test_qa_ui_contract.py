"""Offline tests of D's GUI-theme CI unit contract (no GUI required)."""
from subprocess import CompletedProcess
from unittest.mock import patch
import unittest

from qa_ui_contract import REQUIRED, listed_tests, run_gate, run_cargo, test_result_pass_count


def fake_result(stdout: str, code: int = 0):
    return CompletedProcess(["cargo", "test"], code, stdout, "")


class UiContractTests(unittest.TestCase):
    def test_binary_target_is_explicit_when_headless_proof_binary_is_present(self):
        with patch("qa_ui_contract.subprocess.run", return_value=fake_result("test result: ok. 3 passed; 0 failed;")) as run:
            result = run_cargo("ui_theme::tests", "--", "--nocapture")
        self.assertEqual(result.returncode, 0)
        argv = run.call_args.args[0]
        self.assertEqual(argv[:6], ["cargo", "test", "-p", "tikzarium-app", "--bin", "tikzarium-app"])
        self.assertEqual(argv[6:], ["ui_theme::tests", "--", "--nocapture"])

    def test_parse_rust_test_listing(self):
        listing = "    Running unittests src/main.rs\n" + "\n".join(
            f"{name}: test" for tests in REQUIRED.values() for name in sorted(tests)
        ) + "\n5 tests, 0 benchmarks\n"
        self.assertEqual(listed_tests(listing), set().union(*REQUIRED.values()))

    def test_missing_required_theme_test_fails(self):
        all_names = set().union(*REQUIRED.values())
        all_names.remove("ui_theme::tests::preferences_default_and_legacy_partial_data")
        listing = "\n".join(f"{name}: test" for name in all_names)
        with patch("qa_ui_contract.run_cargo", return_value=fake_result(listing)) as invocation:
            result = run_gate()
        self.assertEqual(result["status"], "FAIL")
        self.assertIn("ui_theme::tests::preferences_default_and_legacy_partial_data",
                      result["groups"]["ui_theme::tests"]["missing"])
        self.assertEqual(result["physical_win10_smoke"], "NOT_RUN")
        self.assertEqual(result["gui_restart_persistence"], "NOT_RUN")
        self.assertGreaterEqual(invocation.call_count, 1)

    def test_all_required_registered_and_executed(self):
        listing = "\n".join(
            f"{name}: test" for names in REQUIRED.values() for name in sorted(names)
        )
        with patch("qa_ui_contract.run_cargo", side_effect=[
            fake_result(listing),
            fake_result("test result: ok. 3 passed; 0 failed; 0 ignored;\n"),
            fake_result("test result: ok. 2 passed; 0 failed; 0 ignored;\n"),
        ]):
            result = run_gate()
        self.assertEqual(result["status"], "PASS_UNIT")
        self.assertEqual(result["gui_visual_theme_invariance"], "NOT_RUN")
        self.assertEqual(result["physical_m1_m4_smoke"], "NOT_RUN")

    def test_zero_tests_not_accepted(self):
        listing = "\n".join(
            f"{name}: test" for names in REQUIRED.values() for name in sorted(names)
        )
        with patch("qa_ui_contract.run_cargo", side_effect=[
            fake_result(listing),
            fake_result("test result: ok. 0 passed; 0 failed; 3 filtered out;\n"),
            fake_result("test result: ok. 2 passed; 0 failed; 0 ignored;\n"),
        ]):
            result = run_gate()
        self.assertEqual(result["status"], "FAIL")
        self.assertEqual(result["groups"]["ui_theme::tests"]["status"], "FAIL")

    def test_nonzero_cargo_exit_fails(self):
        with patch("qa_ui_contract.run_cargo", return_value=fake_result("", 101)):
            result = run_gate()
        self.assertEqual(result["status"], "FAIL")
        self.assertIn("cargo test", result["error"])

    def test_pr_merge_sha_is_not_confused_with_source_head(self):
        with patch.dict("os.environ", {
            "GITHUB_SHA": "f" * 40,
            "TIKZARIUM_SOURCE_SHA": "a" * 40,
        }):
            with patch("qa_ui_contract.run_cargo", return_value=fake_result("", 101)):
                result = run_gate()
        self.assertEqual(result["sha"], "f" * 40)
        self.assertEqual(result["source_head_sha"], "a" * 40)
        self.assertEqual(result["status"], "FAIL")

    def test_pass_counter_requires_explicit_success_record(self):
        self.assertEqual(test_result_pass_count("test result: ok. 3 passed; 0 failed;"), 3)
        self.assertIsNone(test_result_pass_count("test result: FAILED. 3 passed; 1 failed;"))


if __name__ == "__main__":
    unittest.main()
