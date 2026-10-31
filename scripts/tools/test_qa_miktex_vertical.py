"""D06 fail-closed MiKTeX error recognition and source-contract tests."""
from __future__ import annotations

from pathlib import Path
import unittest
from tempfile import TemporaryDirectory
from subprocess import CompletedProcess
from unittest.mock import patch

import qa_miktex_vertical as qa

from qa_miktex_vertical import MISSING_LIBRARY, PRIMITIVE_TOKENS, N1_TOOLS, miktex_engine, miktex_tex_log_identity, n1_state_contract, poppler_version, setup_stage_complete, tex_failure


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

    def test_actual_compiler_logs_require_pinned_miktex_banner_on_first_line(self):
        real_banner = ("This is XeTeX, Version 3.141592653-2.6-0.999997 "
                       "(MiKTeX 25.12) (preloaded format=xelatex 2026.10.31)")
        self.assertTrue(miktex_tex_log_identity(real_banner + "\nentering extended mode"))
        self.assertTrue(miktex_tex_log_identity("\ufeff" + real_banner))
        for bad_log in (
            "",
            "This is XeTeX, Version 3.141592653 (TeX Live 2026)",
            "This is XeTeX, Version 3.14 (TeX Live 2026) (MiKTeX 25.12)",
            "This is pdfTeX, Version 3.14 (MiKTeX 25.12)",
            "This is XeTeX, Version 3.14 (MiKTeX 26.1)",
            "engine diagnostic\n" + real_banner,
        ):
            with self.subTest(bad_log=bad_log):
                self.assertFalse(miktex_tex_log_identity(bad_log))

    def test_both_positive_routes_gate_on_real_cli_and_direct_tex_logs(self):
        code = (Path(__file__).resolve().parent / "qa_miktex_vertical.py").read_text(encoding="utf-8")
        self.assertGreaterEqual(code.count("and miktex_tex_log_identity(cli_log_text)"), 2)
        self.assertIn("and miktex_tex_log_identity(direct_log_text)", code)
        self.assertIn("and miktex_tex_log_identity(log_text)", code)
        self.assertIn('str(pdf), "--log", str(cli_log)', code)

    def test_terminal_setup_provenance_rejects_stale_or_mismatched_checkpoint(self):
        setup = {"installer_sha256": "0" * 64, "xelatex_path": r"D:\private\xelatex.exe"}
        stage = {"schema_version": 1, "stage": "setup-complete",
                 "status": "SETUP_COMPLETE", "installer_sha256": setup["installer_sha256"],
                 "xelatex_path": setup["xelatex_path"], "auto_install_config_readback": "0"}
        self.assertTrue(setup_stage_complete(stage, setup))
        for changed in (
            {"status": "INCOMPLETE"}, {"stage": "package-metadata-validated"},
            {"installer_sha256": "1" * 64}, {"xelatex_path": r"C:\TeXLive\xelatex.exe"},
            {"auto_install_config_readback": "1"}, {"schema_version": 0},
        ):
            with self.subTest(changed=changed):
                self.assertFalse(setup_stage_complete({**stage, **changed}, setup))
        self.assertFalse(setup_stage_complete({}, setup))
        self.assertFalse(setup_stage_complete(stage, {**setup, "xelatex_path": ""}))

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
        self.assertIn("MiKTeX declared package $package is not confirmed installed", setup)
        self.assertIn("stage = 'setup-complete'; status = 'SETUP_COMPLETE'", setup)

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
            marker = f"  {event}:\n    branches: [main]\n    paths:\n"
            self.assertIn(marker, workflow)
            following_event = "pull_request" if event == "push" else "workflow_dispatch"
            event_body = workflow.split(marker, 1)[1].split(f"\n  {following_event}:", 1)[0]
            for path in paths:
                with self.subTest(event=event, path=path):
                    self.assertIn(f"      - {path}\n", event_body + "\n")
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


    def test_handwritten_direct_pdf_must_pass_real_pdf_auditor(self):
        """Mock gate only: a direct PDF file existing is insufficient."""
        banner = ("This is XeTeX, Version 3.141592653-2.6-0.999997 "
                  "(MiKTeX 25.12) (preloaded format=xelatex)")
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "fixtures/qa/d06-native-primitives/main.tex"
            source.parent.mkdir(parents=True)
            source.write_text("\n".join(PRIMITIVE_TOKENS), encoding="utf-8")
            output = root / "output"
            output.mkdir()
            pdf_calls = []

            def fake_run(cmd, cwd=None, timeout=180):
                if cmd[1] == "build":
                    Path(cmd[3]).write_bytes(b"%PDF-FAKE (mock only)")
                    Path(cmd[5]).write_text(banner, encoding="utf-8")
                else:
                    target = Path(next(arg.split("=", 1)[1] for arg in cmd
                                       if arg.startswith("-output-directory=")))
                    (target / "main.pdf").write_bytes(b"%PDF-FAKE (mock only)")
                    (target / "main.log").write_text(banner, encoding="utf-8")
                return CompletedProcess(cmd, 0, b"", b"")

            def fake_inspect_pdf(pdf, pages, expected_text, expected_fonts):
                pdf_calls.append(pdf)
                self.assertEqual(pages, 1)
                self.assertEqual(expected_text, ["Примитивы TikZ", "Кривая Безье αβγ"])
                self.assertEqual(expected_fonts, ["DejaVuSerif", "LatinModernMath"])
                return ("direct" not in pdf.parts, {"checked": True})

            with patch.object(qa, "run", side_effect=fake_run), \
                    patch("qa_smoke.inspect_pdf", side_effect=fake_inspect_pdf):
                result = qa.positive(root, output, Path("mock-engine"), Path("mock-cli"))
            self.assertEqual(result["status"], "FAIL")
            self.assertEqual(len(pdf_calls), 2, "Both produced PDFs must be audited")
            self.assertIn("direct", pdf_calls[1].parts)
            self.assertEqual(result["direct_pdf"], {"checked": True})
            self.assertEqual(result["direct_pdf_sha256"], qa.sha(pdf_calls[1]))

    def test_negative_tex_error_requires_miktex_banner_in_actual_log(self):
        """No TeX Live error log can masquerade as a MiKTeX negative PASS."""
        error = f"! LaTeX Error: File '{MISSING_LIBRARY}' not found."
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "missing-library.tex"
            source.write_text("An intentional negative input", encoding="utf-8")
            output = root / "output"
            output.mkdir()
            current_banner = ["This is XeTeX, Version 3.14 (TeX Live 2026)"]

            def fake_run(cmd, cwd=None, timeout=180):
                dest = Path(next(arg.split("=", 1)[1] for arg in cmd
                                 if arg.startswith("-output-directory=")))
                (dest / "missing-library.log").write_text(
                    current_banner[0] + "\n" + error, encoding="utf-8")
                return CompletedProcess(cmd, 1, error.encode(), b"")

            with patch.object(qa, "run", side_effect=fake_run):
                bad = qa.negative(source, "texlive", "missing-library",
                                  output, Path("mock-engine"))
                self.assertEqual(bad["status"], "FAIL")
                self.assertFalse(bad["tex_identity"])
                current_banner[0] = (
                    "This is XeTeX, Version 3.141592653-2.6-0.999997 (MiKTeX 25.12)"
                )
                good = qa.negative(source, "miktex", "missing-library",
                                   output, Path("mock-engine"))
            self.assertEqual(good["status"], "PASS")
            self.assertTrue(good["tex_identity"])
            self.assertFalse(good["pdf_exists"])


if __name__ == "__main__":
    unittest.main()
