"""I61 offline PDF font proof contract tests, not actual GUI evidence."""
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from qa_i61_b42_studio_x11 import audit_embedded_fonts

HEADER = ("name type encoding emb sub uni object ID\n"
          "-------------------------------\n")

class AuditFonts(unittest.TestCase):
    def test_all_embedded_including_two_word_type(self):
        lines = audit_embedded_fonts(
            HEADER + "DejaVuSerif TrueType WinAnsi yes yes yes 6 0\n"
            + "LatinModernMath CID TrueType Identity-H yes yes yes 12 0\n")
        self.assertEqual(len(lines), 2)

    def test_single_nonembedded_font_fails(self):
        with self.assertRaisesRegex(RuntimeError, "Nonembedded"):
            audit_embedded_fonts(
                HEADER + "DejaVuSerif TrueType WinAnsi yes yes yes 6 0\n"
                + "OtherFont TrueType WinAnsi no no yes 8 0\n")

    def test_malformed_row_fails(self):
        with self.assertRaisesRegex(RuntimeError, "Unparseable"):
            audit_embedded_fonts(HEADER + "BadFont not enough fields\n")

    def test_empty_inventory_fails(self):
        with self.assertRaisesRegex(RuntimeError, "No font records"):
            audit_embedded_fonts(HEADER)

if __name__ == "__main__":
    unittest.main()
