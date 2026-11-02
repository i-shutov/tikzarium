"""No TeX installation needed: negative tests for direct QA compiler policy."""
from subprocess import CompletedProcess
from unittest.mock import patch
import unittest

from qa_engine_policy import EnginePolicy, classify_version, probe_engine_policy


def reply(args, code, output):
    return CompletedProcess(args, code, output, "")


class OfflineEnginePolicyTests(unittest.TestCase):
    def test_distribution_identity_checks_full_transcript(self):
        self.assertEqual(classify_version("XeTeX ...\nMiKTeX-XeTeX 25.12"), "MiKTeX")
        self.assertEqual(classify_version("XeTeX ... (TeX Live 2026)"), "TeX Live")
        for unknown in ("", "XeTeX 3.14159", "MiKTeX and TeX Live"):
            with self.subTest(unknown=unknown), self.assertRaises(ValueError):
                classify_version(unknown)

    def test_miktex_requires_verified_offline_flag_on_same_executable(self):
        with patch("qa_engine_policy.subprocess.run", side_effect=[
            reply(["selected-xelatex", "--version"], 0, "MiKTeX-XeTeX 25.12"),
            reply(["selected-xelatex", "--disable-installer", "--version"], 0,
                  "MiKTeX-XeTeX 25.12"),
        ]) as run:
            policy = probe_engine_policy("selected-xelatex")
        self.assertEqual(
            policy, EnginePolicy("MiKTeX", "MiKTeX-XeTeX 25.12",
                                 ("--disable-installer",))
        )
        self.assertEqual(run.call_count, 2)
        self.assertEqual(run.call_args_list[1].args[0],
                         ["selected-xelatex", "--disable-installer", "--version"])
        for call in run.call_args_list:
            self.assertNotIn("shell", call.kwargs)
            self.assertIn("timeout", call.kwargs)

    def test_unverified_miktex_switch_never_authorizes_compilation(self):
        with patch("qa_engine_policy.subprocess.run", side_effect=[
            reply(["xelatex", "--version"], 0, "MiKTeX 25.12"),
            reply(["xelatex", "--disable-installer", "--version"], 1, "unknown option"),
        ]) as run:
            with self.assertRaisesRegex(ValueError, "rejected"):
                probe_engine_policy("xelatex")
        self.assertEqual(run.call_count, 2)
        # Only read-only --version probes were attempted, not a TeX document.
        self.assertTrue(all("--version" in call.args[0] for call in run.call_args_list))

    def test_unknown_or_failed_version_is_fail_closed(self):
        for output, code in (("XeTeX unknown", 0), ("MiKTeX", 1)):
            with self.subTest(output=output), patch(
                "qa_engine_policy.subprocess.run",
                return_value=reply(["xelatex", "--version"], code, output)
            ) as run:
                with self.assertRaises(ValueError):
                    probe_engine_policy("xelatex")
                run.assert_called_once()

    def test_texlive_does_not_use_miktex_switch(self):
        with patch("qa_engine_policy.subprocess.run", return_value=reply(
                ["xelatex", "--version"], 0, "XeTeX ... (TeX Live 2026)")) as run:
            policy = probe_engine_policy("xelatex")
        self.assertEqual(policy.distribution, "TeX Live")
        self.assertEqual(policy.offline_args, ())
        run.assert_called_once()


if __name__ == "__main__":
    unittest.main()
