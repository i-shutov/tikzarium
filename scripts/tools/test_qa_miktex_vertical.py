"""D06 fail-closed MiKTeX error recognition and source-contract tests."""
from __future__ import annotations

from pathlib import Path
import unittest

from qa_miktex_vertical import MISSING_LIBRARY, PRIMITIVE_TOKENS, N1_TOOLS, miktex_engine, n1_state_contract, poppler_version, tex_failure


class MiKTeXVerticalContract(unittest.TestCase):
    def test_independent_poppler_identity_vs_miktex_shims(self):
        self.assertTrue(poppler_version("pdfinfo", "pdfinfo version 26.09.0\nCopyright Poppler"))
        self.assertTrue(poppler_version("pdftotext", "pdftotext version 26.09.0"))
        self.assertTrue(poppler_version("pdffonts", "pdffonts version 26.09.0"))
        self.assertFalse(poppler_version("pdfinfo", "MiKTeX pdfinfo executable"))
        self.assertFalse(poppler_version("pdffonts", "pdffonts: internal error"))
        self.assertFalse(poppler_version("pdftotext", "pdftotext version unknown"))

    def test_miktex_version_must_be_xetex(self):
        self.assertTrue(miktex_engine("MiKTeX-XeTeX 4.0 (MiKTeX 25.12)"))
        self.assertFalse(miktex_engine("XeTeX 3.14159 (TeX Live 2026)"))
        self.assertFalse(miktex_engine("MiKTeX-pdfTeX 4.0"))

    def test_lua_negative_requires_complete_message_and_absence_pdf(self):
        message = "You need to run LuaTeX to use the grap\nh drawing library."
        self.assertTrue(tex_failure("lua-only", 1, message, False))
        self.assertFalse(tex_failure("lua-only", 1, "You need to run LuaTeX", False))
        self.assertFalse(tex_failure("lua-only", 1, message, True))
        self.assertFalse(tex_failure("lua-only", 0, message, False))

    def test_missing_library_requires_exact_target_and_not_found(self):
        text = f"! LaTeX Error: File '{MISSING_LIBRARY}' not found."
        self.assertTrue(tex_failure("missing-library", 1, text, False))
        self.assertFalse(tex_failure("missing-library", 1, "File foo.code.tex not found", False))
        self.assertFalse(tex_failure("missing-library", 1, text, True))
        self.assertFalse(tex_failure("missing-library", 0, text, False))

    def test_unrecognized_negative_kind_is_error(self):
        with self.assertRaises(ValueError):
            tex_failure("another-kind", 1, "not found", False)

    def test_private_index_refresh_is_fail_closed_and_precedes_package_install(self):
        # Structural regression only: live MiKTeX/hosted network is separate CI evidence.
        setup = (Path(__file__).resolve().parent / "qa_setup_miktex.ps1").read_text(encoding="utf-8")
        self.assertLess(setup.index("packages update-package-database"),
                        setup.index("packages install @missingPackages"))
        self.assertIn("if ($fields[3] -ceq 'false')", setup)
        self.assertIn("$fields[3] -cnotin @('true','false')", setup)
        self.assertNotIn("packages install @packages", setup)
        self.assertIn("if ($refreshExitCode -ne 0)", setup)
        self.assertIn("Assert-MiKTeXAutoInstallDisabled", setup)
        self.assertIn("AutoInstall=0", setup)
        self.assertIn("package-metadata-before-install.txt", setup)
        self.assertIn("private-package-index-refreshed", setup)
        self.assertNotIn("packages update @packages", setup)

    def test_n1_session_contract_rejects_missing_ownership_and_undo(self):
        source = (r"\newcommand{\UserPath}{\path (0,0);}"
                  + "\n" + r"\UserPath \begin{tikzpicture} \node rectangle circle controls"
                  + (" % tikzarium:n1:marker\n" * 6) + "Геометрия")
        math = source.replace("Геометрия", r"\hbar + \alpha")
        state = {
            "status": "PASS_AUTHORING_STATE_ONLY",
            "generator": "tikzarium_extensions::primitives::Catalog",
            "tools": list(N1_TOOLS),
            "command_count": 6,
            "save_reopen": "PASS", "parameter_undo": "PASS",
            "math_undo": "PASS", "opaque_source_preservation": "PASS",
            "manual_edit_conflict": "PASS", "gui_pointer_clicks": "NOT_RUN",
        }
        self.assertTrue(n1_state_contract(state, source, math))
        self.assertFalse(n1_state_contract(state, source[:-23], math))
        self.assertFalse(n1_state_contract({**state, "math_undo": "NOT_RUN"}, source, math))
        self.assertFalse(n1_state_contract({**state, "gui_pointer_clicks": "PASS"}, source, math))
        self.assertFalse(n1_state_contract(state, source, source))


    def test_miktex_proof_is_retriggered_for_real_n1_source_and_merged_main(self):
        # Structural guard only: an event still needs its own exact-SHA live job.
        workflow = (Path(__file__).resolve().parents[2] /
                    ".github/workflows/qa-miktex-windows.yml").read_text(encoding="utf-8")
        paths = (
            ".github/workflows/qa-miktex-windows.yml",
            "scripts/tools/qa_miktex_vertical.py",
            "scripts/tools/test_qa_miktex_vertical.py",
            "fixtures/qa/d06-native-primitives/**",
            "crates/tikzarium-core/**",
            "crates/tikzarium-cli/**",
            "crates/tikzarium-app/**",
            "crates/tikzarium-extensions/**",
            "extensions/**",
            "Cargo.toml",
            "Cargo.lock",
        )
        for event in ("pull_request", "push"):
            marker = f"  {event}:\\n    branches: [main]\\n    paths:\\n"
            self.assertIn(marker, workflow)
            event_body = workflow.split(marker, 1)[1].split("\\n  ", 1)[0]
            for path in paths:
                with self.subTest(event=event, path=path):
                    self.assertIn(f"      - {path}\\n", event_body + "\\n")
        self.assertIn("n1-authoring-proof", workflow)
        self.assertIn("qa_miktex_vertical.py", workflow)
        self.assertIn("packages-after.txt", workflow)

    def test_source_fixture_covers_six_native_primitives(self):
        root = Path(__file__).resolve().parents[2]
        tex = (root / "fixtures/qa/d06-native-primitives/main.tex").read_text(encoding="utf-8")
        for token in PRIMITIVE_TOKENS:
            with self.subTest(token=token):
                self.assertIn(token, tex)
        self.assertIn(r"\TikzariumOpaqueNote", tex)
        self.assertIn("Кривая Безье αβγ", tex)


if __name__ == "__main__":
    unittest.main()
