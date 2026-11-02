"""Offline N5 portable preview packaging regression (no physical OS claim)."""
import importlib.util
import json
import pathlib
import plistlib
import struct
import tempfile
import unittest
import zipfile

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "package_preview.py"
spec = importlib.util.spec_from_file_location("package_preview", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SHA = "3fb25ca70ce94ad9a5b1cd63606ad45390f1f68b"

def fake_pe():
    data = bytearray(256)
    data[:2] = b"MZ"
    struct.pack_into("<I", data, 0x3c, 128)
    data[128:132] = b"PE\0\0"
    struct.pack_into("<H", data, 132, 0x8664)
    return bytes(data)

def fake_macho():
    return b"\xcf\xfa\xed\xfe" + struct.pack("<I", 0x0100000C) + bytes(128)

class PreviewTest(unittest.TestCase):
    def inputs(self, root, target):
        app, cli, lock = root / "app", root / "cli", root / "lock.json"
        binary = fake_pe() if target == "windows-x64" else fake_macho()
        app.write_bytes(binary)
        cli.write_bytes(binary)
        lock.write_text(json.dumps({
            "checkout_sha": SHA,
            "architecture": "AMD64" if target == "windows-x64" else "arm64",
            "host": "Windows-2022Server" if target == "windows-x64" else "macOS-15.8.2",
            "physical_windows10_miktex": "NOT_RUN",
            "physical_mac_m1_m4_xelatex": "NOT_RUN",
        }), encoding="utf-8")
        return app, cli, lock

    def test_both_portable_previews_repeatable_and_checksums_real(self):
        for target in ("windows-x64", "macos-arm64"):
            with self.subTest(target=target), tempfile.TemporaryDirectory() as temp:
                root = pathlib.Path(temp)
                app, cli, lock = self.inputs(root, target)
                output = root / "preview.zip"
                module.package(target, app, cli, lock, SHA, output)
                original = output.read_bytes()
                module.package(target, app, cli, lock, SHA, output)
                self.assertEqual(original, output.read_bytes())
                with zipfile.ZipFile(output) as archive:
                    self.assertIsNone(archive.testzip())
                    manifest = json.loads(archive.read("PROVENANCE.json"))
                    self.assertEqual(manifest["source_sha"], SHA)
                    self.assertEqual(manifest["installer"], "NOT_PROVIDED")
                    self.assertEqual(manifest["code_signing"], "NOT_RUN")
                    self.assertEqual(manifest["physical_windows10_miktex"], "NOT_RUN")
                    self.assertEqual(manifest["physical_mac_m1_m4_xelatex"], "NOT_RUN")
                    for line in archive.read("SHA256SUMS.txt").decode().splitlines():
                        sha, name = line.split("  ", 1)
                        self.assertEqual(sha, module.digest(archive.read(name)))
                    self.assertFalse(any(name.lower().endswith((".ttf", ".otf")) for name in archive.namelist()))
                    if target == "macos-arm64":
                        plist = plistlib.loads(archive.read("TikZarium.app/Contents/Info.plist"))
                        self.assertEqual(plist["CFBundleExecutable"], "tikzarium-app")
                        self.assertEqual(archive.getinfo("TikZarium.app/Contents/MacOS/tikzarium-app").external_attr >> 16 & 0o777, 0o755)

    def test_fail_closed_on_wrong_head_binary_arch_or_claim(self):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            app, cli, lock = self.inputs(root, "windows-x64")
            output = root / "preview.zip"
            with self.assertRaisesRegex(ValueError, "Full exact"):
                module.package("windows-x64", app, cli, lock, "bad", output)
            with self.assertRaisesRegex(ValueError, "Checkout differs"):
                module.package("windows-x64", app, cli, lock, "a"*40, output)
            app.write_bytes(fake_macho())
            with self.assertRaisesRegex(ValueError, "Windows PE"):
                module.package("windows-x64", app, cli, lock, SHA, output)
            app.write_bytes(fake_pe())
            meta = json.loads(lock.read_text())
            meta["physical_windows10_miktex"] = "PASS"
            lock.write_text(json.dumps(meta))
            with self.assertRaisesRegex(ValueError, "physical desktop"):
                module.package("windows-x64", app, cli, lock, SHA, output)

if __name__ == "__main__":
    unittest.main()
