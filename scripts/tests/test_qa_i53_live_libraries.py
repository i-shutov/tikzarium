import importlib.util
import unittest
from pathlib import Path
p=Path(__file__).resolve().parents[1]/"qa_i53_live_libraries_x11.py"
spec=importlib.util.spec_from_file_location("i53",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class I53(unittest.TestCase):
 def test_single_import_only(self):
  candidate=m.SRC.replace(b"\\begin{document}",m.DECL+b"\\begin{document}")
  self.assertTrue(m.exact_patch(m.SRC,candidate))
  self.assertFalse(m.exact_patch(m.SRC,m.SRC))
  self.assertFalse(m.exact_patch(m.SRC,candidate+b"extra"))
  self.assertFalse(m.exact_patch(m.SRC,candidate+m.DECL))
 def test_macro_and_unicode_preservation_fixture(self):
  self.assertIn(b"\\OpaqueLabel",m.SRC)
  self.assertIn("Не менять".encode(),m.SRC)
 def test_separate_gui_reopen_control_is_distinct_and_preserves_opaque_macro(self):
  self.assertNotEqual(m.REOPEN_SOURCE,m.SRC)
  self.assertIn(b'% I53 alternate file',m.REOPEN_SOURCE)
  self.assertIn(b'\\OpaqueLabel',m.REOPEN_SOURCE)
  self.assertIn('Не менять'.encode(),m.REOPEN_SOURCE)
 def test_full_gui_path_clipboard_rejects_partial_filename(self):
  from pathlib import Path
  expected=Path("/tmp/мой-проект/library-connect.tex")
  raw=str(expected).encode()
  self.assertTrue(m.path_clipboard_matches(raw,expected))
  self.assertFalse(m.path_clipboard_matches(raw[:-2],expected))
  self.assertFalse(m.path_clipboard_matches(raw+b"garbage",expected))
 def test_profile_fail_closed(self):
  names=("source","path","open_path","save","build","export","panel","library","connect","disconnect","undo","help_header","help_query","help_result")
  d={k:[200,130] for k in names};d["tree"]="old"
  with self.assertRaises(ValueError):m.check_profile(d,"new")
  m.check_profile(d,"old")
  d["help_query"]=["not_an_int",22]
  with self.assertRaises(ValueError):m.check_profile(d,"old")
 def test_i53_real_gui_gate_survives_product_merge(self):
  workflow=(Path(__file__).resolve().parents[2]/".github/workflows/i53-b38-live-libraries.yml").read_text(encoding="utf-8")
  self.assertIn("      - feat/b38-n2-n3-inspector-20261101",workflow)
  self.assertIn("      - main",workflow)
  self.assertIn("test \"$(git rev-parse HEAD)\" = \"$TIKZARIUM_SOURCE_SHA\"",workflow)
  self.assertIn("0ebdd9e123dda4ea18024150cf284c905badcdb6",workflow)
  self.assertIn("scripts/qa_i53_live_libraries_x11.py",workflow)
