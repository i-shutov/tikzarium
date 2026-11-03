"""Offline N5 packaging gates: synthetic headers are never product GUI evidence."""
import importlib.util
import json
import plistlib
import struct
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


class N5Packaging(unittest.TestCase):
    def test_wrong_architecture_and_truncated_inputs_fail_closed(self):
        for platform in (pkg.WIN, pkg.MAC):
            for data in (b'', b'not-an-executable', fake_mac() if platform == pkg.WIN else fake_win()):
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

    def test_invalid_archive_target_fails(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                pkg.write_archive(pkg.WIN, Path(d) / 'bad.tar.gz', {})
            with self.assertRaises(ValueError):
                pkg.write_archive(pkg.MAC, Path(d) / 'bad.zip', {})


if __name__ == '__main__':
    unittest.main()
