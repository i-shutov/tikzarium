"""Offline N5 packaging gates: synthetic headers are never product GUI evidence."""
import importlib.util
import json
import plistlib
import struct
import subprocess
import sys
import tempfile
import unittest
import zipfile
import tarfile
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / 'package_n5_preview.py'
spec = importlib.util.spec_from_file_location('n5_preview', MODULE)
pkg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pkg)
SHA = 'a' * 40
CI = 'https://github.com/i-shutov/tikzarium/actions/runs/41576723954'


def fake_win():
    b = bytearray(256)
    b[:2] = b'MZ'
    struct.pack_into('<I', b, 0x3c, 128)
    b[128:132] = b'PE\0\0'
    struct.pack_into('<H', b, 132, 0x8664)
    struct.pack_into('<H', b, 152, 0x20b)
    return bytes(b)


def fake_mac():
    b = bytearray(32)
    b[:4] = b'\xcf\xfa\xed\xfe'
    struct.pack_into('<I', b, 4, 0x0100000c)
    struct.pack_into('<I', b, 12, 2)
    return bytes(b)

def fake_linux():
    b = bytearray(120)
    b[:4] = b'\x7fELF'
    b[4:7] = bytes((2, 1, 1))
    struct.pack_into('<HHI', b, 16, 3, 62, 1)
    struct.pack_into('<QQ', b, 24, 0x1000, 64)
    struct.pack_into('<HHH', b, 52, 64, 56, 1)
    struct.pack_into('<I', b, 64, 1)  # PT_LOAD
    return bytes(b)

class N5Packaging(unittest.TestCase):
    def test_wrong_architecture_and_truncated_inputs_fail_closed(self):
        for platform in (pkg.WIN, pkg.MAC, pkg.LINUX):
            wrong = fake_mac() if platform == pkg.WIN else fake_win()
            for data in (b'', b'not-an-executable', wrong):
                with self.subTest(platform=platform, payload=data[:8]), self.assertRaises(ValueError):
                    pkg.check_binary(data, platform)
        bad = bytearray(fake_win())
        struct.pack_into('<H', bad, 132, 0xaa64)
        with self.assertRaises(ValueError):
            pkg.check_binary(bytes(bad), pkg.WIN)
        bad = bytearray(fake_mac())
        struct.pack_into('<I', bad, 4, 0x01000007)
        with self.assertRaises(ValueError):
            pkg.check_binary(bytes(bad), pkg.MAC)
        bad = bytearray(fake_linux())
        bad[4] = 1  # 32-bit ELF cannot be passed as 64-bit Linux.
        with self.assertRaises(ValueError):
            pkg.check_binary(bytes(bad), pkg.LINUX)
        bad = bytearray(fake_linux())
        struct.pack_into('<H', bad, 18, 0xB7)  # ARM64 is not x86_64.
        with self.assertRaises(ValueError):
            pkg.check_binary(bytes(bad), pkg.LINUX)
        bad = bytearray(fake_linux())
        struct.pack_into('<H', bad, 16, 1)  # ET_REL cannot launch.
        with self.assertRaises(ValueError):
            pkg.check_binary(bytes(bad), pkg.LINUX)
        bad = bytearray(fake_linux())
        struct.pack_into('<Q', bad, 24, 0)  # Shared object has no entry point.
        with self.assertRaises(ValueError):
            pkg.check_binary(bytes(bad), pkg.LINUX)

    def test_mac_app_and_windows_portable_are_honest_and_integrity_locked(self):
        for platform, blob, extension in ((pkg.MAC, fake_mac(), '.tar.gz'), (pkg.WIN, fake_win(), '.zip')):
            with self.subTest(platform=platform), tempfile.TemporaryDirectory() as temp:
                pkg.check_binary(blob, platform)
                entries = pkg.make_bundle(platform, SHA, CI, blob, blob)
                root = 'Tikzarium-preview/'
                manifest = entries[root + 'MANIFEST.sha256'][0].decode()
                for name, (data, _) in entries.items():
                    if name.endswith('MANIFEST.sha256'):
                        continue
                    self.assertIn(f'{pkg.sha256(data)}  {name.removeprefix(root)}\n', manifest)
                self.assertNotIn('TeX_Live', str(entries))
                self.assertEqual(json.loads(entries[root + 'PROVENANCE.json'][0])['physical_mac_m4'], 'NOT_RUN')
                src = entries[root + 'qa/figure-crlf.tex'][0]
                self.assertEqual(src.count(b'\r\n'), 11)
                self.assertEqual(src.count(b'\n'), src.count(b'\r\n'))
                self.assertIn(b'\\OpaqueNfive', src)
                archive = Path(temp) / ('preview' + extension)
                pkg.write_archive(platform, archive, entries)
                second = Path(temp) / ('second' + extension)
                pkg.write_archive(platform, second, entries)
                self.assertEqual(archive.read_bytes(), second.read_bytes(), 'preview must be reproducible')
                if platform == pkg.MAC:
                    with tarfile.open(archive) as t:
                        names = t.getnames()
                        appname = root + 'TikZarium.app/Contents/MacOS/tikzarium-app'
                        self.assertIn(appname, names)
                        self.assertEqual(t.getmember(appname).mode, 0o755)
                        plist = plistlib.loads(t.extractfile(root + 'TikZarium.app/Contents/Info.plist').read())
                        self.assertEqual(plist['CFBundleExecutable'], 'tikzarium-app')
                else:
                    with zipfile.ZipFile(archive) as z:
                        self.assertIn(root + 'tikzarium-app.exe', z.namelist())
                        self.assertNotIn(root + 'TikZarium.app/Contents/MacOS/tikzarium-app', z.namelist())

    def test_linux_portable_is_reproducible_executable_and_no_bundled_tex(self):
        with tempfile.TemporaryDirectory() as td:
            blob = fake_linux()
            pkg.check_binary(blob, pkg.LINUX)
            entries = pkg.make_bundle(pkg.LINUX, SHA, CI, blob, blob)
            root = 'Tikzarium-preview/'
            self.assertEqual(entries[root + 'tikzarium-app'][1], 0o755)
            self.assertEqual(entries[root + 'tikzarium-cli'][1], 0o755)
            self.assertEqual(entries[root + 'launch.sh'][1], 0o755)
            self.assertIn(b'exec ./tikzarium-app', entries[root + 'launch.sh'][0])
            self.assertIn(b'Linux', entries[root + 'README_RU.md'][0])
            self.assertNotIn(root + 'TikZarium.app/Contents/MacOS/tikzarium-app', entries)
            provenance = json.loads(entries[root + 'PROVENANCE.json'][0])
            self.assertEqual(provenance['platform'], pkg.LINUX)
            self.assertEqual(provenance['linux_packaged_desktop'], 'NOT_RUN')
            self.assertFalse(provenance['tex_or_fonts_bundled'])
            manifest = entries[root + 'MANIFEST.sha256'][0].decode()
            for name, (data, _) in entries.items():
                if name.endswith('MANIFEST.sha256'):
                    continue
                self.assertIn(f'{pkg.sha256(data)}  {name.removeprefix(root)}\n', manifest)
            a, b = Path(td) / 'a.tar.gz', Path(td) / 'b.tar.gz'
            pkg.write_archive(pkg.LINUX, a, entries)
            pkg.write_archive(pkg.LINUX, b, entries)
            self.assertEqual(a.read_bytes(), b.read_bytes())
            with tarfile.open(a, mode='r:gz') as t:
                self.assertEqual(t.getmember(root + 'tikzarium-app').mode, 0o755)
                self.assertEqual(t.getmember(root + 'launch.sh').mode, 0o755)
                self.assertEqual(t.extractfile(root + 'tikzarium-app').read(), blob)

    def test_cli_rejects_modified_upstream_bytes_before_archive(self):
        # End-to-end CLI gate with SYNTHETIC headers: tests packaging, not running an app.
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            app = root / 'app.exe'
            cli = root / 'cli.exe'
            output = root / 'candidate.zip'
            good_bytes = fake_win()
            app.write_bytes(good_bytes)
            cli.write_bytes(good_bytes)
            command = [
                sys.executable, str(MODULE), '--platform', pkg.WIN,
                '--app', str(app), '--cli', str(cli),
                '--app-sha256', pkg.sha256(good_bytes),
                '--cli-sha256', pkg.sha256(good_bytes),
                '--source-sha', SHA, '--ci-run-url', CI, '--output', str(output),
            ]
            good = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(good.returncode, 0, good.stderr)
            with zipfile.ZipFile(output) as z:
                self.assertEqual(z.read('Tikzarium-preview/tikzarium-app.exe'), good_bytes)
            output.unlink()
            app.write_bytes(good_bytes + b'unsigned-tamper')
            bad = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(bad.returncode, 0)
            self.assertIn('SHA-256 mismatch', bad.stderr)
            self.assertFalse(output.exists(), 'mismatched upstream must not create archive')

    def test_invalid_archive_target_fails(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                pkg.write_archive(pkg.WIN, Path(d) / 'bad.tar.gz', {})
            with self.assertRaises(ValueError):
                pkg.write_archive(pkg.MAC, Path(d) / 'bad.zip', {})
            with self.assertRaises(ValueError):
                pkg.write_archive(pkg.LINUX, Path(d) / 'bad.zip', {})


if __name__ == '__main__':
    unittest.main()
