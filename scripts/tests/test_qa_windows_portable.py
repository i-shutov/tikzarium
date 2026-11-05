"""Native Windows ZIP proof: synthetic PE tests check audit, not product GUI."""
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest
import zipfile
import sys

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import package_n5_preview as pkg
import qa_windows_portable as qa

SHA = "2" * 40
RUN = "https://github.com/i-shutov/tikzarium/actions/runs/42098234079"


def pe(role: str) -> bytes:
    buf = bytearray(256)
    buf[:2] = b"MZ"
    struct.pack_into("<I", buf, 0x3c, 128)
    buf[128:132] = b"PE\\0\\0".replace(b"\\0", bytes([0]))
    struct.pack_into("<H", buf, 132, 0x8664)
    struct.pack_into("<H", buf, 148, 96)
    struct.pack_into("<H", buf, 152, 0x20b)
    struct.pack_into("<H", buf, 220, 2 if role == "app" else 3)
    return bytes(buf)


class WindowsArtifactAcceptance(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.app = self.root / "app.exe"
        self.cli = self.root / "cli.exe"
        self.zip = self.root / "portable.zip"
        self.app.write_bytes(pe("app"))
        self.cli.write_bytes(pe("cli"))
        pkg.write_archive(pkg.WIN, self.zip, pkg.make_bundle(
            pkg.WIN, SHA, RUN, self.app.read_bytes(), self.cli.read_bytes()
        ))

    def test_exact_fixture_manifest_roles_provenance(self):
        report = qa.audit(self.zip, self.app, self.cli, SHA)
        self.assertEqual(report["members_verified"], 6)
        self.assertEqual(report["app_pe_subsystem"], 2)
        self.assertEqual(report["cli_pe_subsystem"], 3)
        self.assertEqual(report["hosted_extracted_cli"], "NOT_RUN")
        self.assertEqual(report["physical_windows10"], "NOT_RUN")

    def test_cp1252_console_json_keeps_unicode_round_trip(self):
        evidence = {"text": "Фигура — Не менять", "sha": SHA}
        console = qa.console_json(evidence)
        console.encode("cp1252", errors="strict")
        self.assertEqual(json.loads(console), evidence)
        self.assertIn(r"\u0424", console)
        self.assertNotIn("Фигура", console)

    def test_wrong_source_or_pe_role_fails(self):
        with self.assertRaisesRegex(ValueError, "source SHA"):
            qa.audit(self.zip, self.app, self.cli, "a" * 40)
        self.cli.write_bytes(pe("app"))
        with self.assertRaisesRegex(ValueError, "subsystem"):
            qa.audit(self.zip, self.app, self.cli, SHA)

    def test_binary_tamper_and_unlisted_entry_fail(self):
        self.app.write_bytes(self.app.read_bytes() + b"tamper")
        with self.assertRaisesRegex(ValueError, "Archive binary"):
            qa.audit(self.zip, self.app, self.cli, SHA)
        self.app.write_bytes(pe("app"))
        with zipfile.ZipFile(self.zip, "a") as z:
            z.writestr("Tikzarium-preview/undocumented.dll", b"bad")
        with self.assertRaisesRegex(ValueError, "Unexpected"):
            qa.audit(self.zip, self.app, self.cli, SHA)

    def test_manifest_tamper_fails(self):
        with zipfile.ZipFile(self.zip) as z:
            contents = {n: z.read(n) for n in z.namelist()}
        contents["Tikzarium-preview/README_RU.md"] += b"corruption"
        with zipfile.ZipFile(self.zip, "w") as z:
            for n, b in contents.items():
                z.writestr(n, b)
        with self.assertRaisesRegex(ValueError, "manifest"):
            qa.audit(self.zip, self.app, self.cli, SHA)


if __name__ == "__main__":
    unittest.main()
