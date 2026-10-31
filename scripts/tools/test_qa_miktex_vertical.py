"""D06 fail-closed MiKTeX error recognition and source-contract tests."""
from __future__ import annotations

from pathlib import Path
import unittest

from qa_miktex_vertical import MISSING_LIBRARY, PRIMITIVE_TOKENS, miktex_engine, tex_failure


class MiKTeXVerticalContract(unittest.TestCase):
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
                        setup.index("packages install @packages"))
        self.assertIn("if ($refreshExitCode -ne 0)", setup)
        self.assertIn("Assert-MiKTeXAutoInstallDisabled", setup)
        self.assertIn("AutoInstall=0", setup)
        self.assertIn("package-metadata-before-install.txt", setup)
        self.assertIn("private-package-index-refreshed", setup)
        self.assertNotIn("packages update @packages", setup)

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
