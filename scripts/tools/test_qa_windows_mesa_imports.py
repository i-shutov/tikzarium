"""Inventory must never claim a real OpenGL HWND from import-table metadata."""
from pathlib import Path
import json
import tempfile
import unittest
from unittest.mock import patch
import qa_windows_mesa_imports as m

class PinnedMesaImportAuditTests(unittest.TestCase):
 def test_missing_core_staged_dll_fails_closed(self):
  with tempfile.TemporaryDirectory() as root:
   with self.assertRaisesRegex(ValueError,"MESA_STAGED_CORE_MISSING"):
    m.inspect(Path(root))
 def test_unverified_bytes_do_not_claim_gui(self):
  with tempfile.TemporaryDirectory() as root:
   r=Path(root)
   for name in m.MESA: (r/name).write_bytes(b"MZ-not-a-real-PE-file")
   with self.assertRaises(ValueError):
    m.inspect(r)
 def test_diagnostic_never_returns_gui_pass_even_with_import_tables(self):
  with tempfile.TemporaryDirectory() as root:
   p=Path(root)
   for name in m.MESA: (p/name).write_bytes(b"synthetic")
   with patch.object(m,"imports",return_value=("KERNEL32.DLL","LIBWINPTHREAD-1.DLL","OPENGL32.DLL")):
    result=m.inspect(p)
   self.assertEqual(result["status"],"PE_IMPORT_INVENTORY_ONLY_NOT_NATIVE_GUI_PASS")
   self.assertIn("LIBWINPTHREAD-1.DLL",result["dll"]["libgallium_wgl.dll"]["imports_not_staged_here"])
   self.assertNotIn("OPENGL32.DLL",result["dll"]["libgallium_wgl.dll"]["imports_not_staged_here"])
if __name__ == "__main__": unittest.main()
