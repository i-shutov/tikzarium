"""Offline Linux 1.0 RC determinism, provenance and fail-closed version tests."""
from __future__ import annotations

import json
import struct
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import package_n5_preview as n5
import package_linux_release_candidate as rc

SOURCE = "a" * 40
RUN = "https://github.com/i-shutov/tikzarium/actions/runs/41984234985"


def fake_elf():
    data = bytearray(120)
    data[:4] = b"\x7fELF"
    data[4:7] = bytes((2, 1, 1))
    struct.pack_into("<HHI", data, 16, 3, 62, 1)
    struct.pack_into("<QQ", data, 24, 0x1000, 64)
    struct.pack_into("<HHH", data, 52, 64, 56, 1)
    struct.pack_into("<I", data, 64, 1)
    return bytes(data)


class LinuxRcPackage(unittest.TestCase):
    def test_exact_manifest_source_version_and_reproducibility(self):
        binary = fake_elf()
        files = rc.make_rc("1.0.0-rc.1", SOURCE, RUN, binary, binary)
        root = "Tikzarium-1.0.0-rc.1/"
        self.assertEqual(set(files), {root + n for n in (
            "tikzarium-app", "tikzarium-cli", "launch.sh", "qa/figure-crlf.tex",
            "README_RU.md", "PROVENANCE.json", "MANIFEST.sha256"
        )})
        self.assertEqual(files[root + "tikzarium-app"][1], 0o755)
        self.assertEqual(files[root + "launch.sh"][1], 0o755)
        manifest = files[root + "MANIFEST.sha256"][0].decode()
        self.assertEqual(len(manifest.splitlines()), 6)
        for path, (body, _mode) in files.items():
            if not path.endswith("MANIFEST.sha256"):
                self.assertIn(f"{n5.sha256(body)}  {path.removeprefix(root)}\n", manifest)
        meta = json.loads(files[root + "PROVENANCE.json"][0])
        self.assertEqual(meta["version"], "1.0.0-rc.1")
        self.assertEqual(meta["source_sha"], SOURCE)
        self.assertEqual(meta["app_sha256"], n5.sha256(binary))
        self.assertEqual(meta["release_stage"], "CANDIDATE_NOT_FINAL")
        self.assertEqual(meta["physical_linux_x86_64_x11"], "NOT_RUN")
        self.assertFalse(meta["tex_or_fonts_bundled"])
        self.assertIn(b'exec "$bundle_dir/tikzarium-app"', files[root + "launch.sh"][0])
        self.assertIn("XeLaTeX", files[root + "README_RU.md"][0].decode())
        with tempfile.TemporaryDirectory() as td:
            first, second = Path(td)/"first.tar.gz", Path(td)/"second.tar.gz"
            n5.write_archive(n5.LINUX, first, files)
            n5.write_archive(n5.LINUX, second, files)
            self.assertEqual(first.read_bytes(), second.read_bytes())
            with tarfile.open(first) as archive:
                self.assertEqual(set(archive.getnames()), set(files))
                self.assertEqual(archive.extractfile(root + "tikzarium-app").read(), binary)

    def test_never_publish_unqualified_stable_label(self):
        for version in ("1.0.0", "0.1.0", "1.0.0-rc.0", "1.0.0-beta.1", "2.0.0-rc.1", "../bad"):
            with self.subTest(version=version), self.assertRaises(ValueError):
                rc.make_rc(version, SOURCE, RUN, fake_elf(), fake_elf())

    def test_reject_bad_source_and_non_executable(self):
        with self.assertRaises(ValueError):
            rc.make_rc("1.0.0-rc.1", "oldsha", RUN, fake_elf(), fake_elf())
        with self.assertRaises(ValueError):
            rc.make_rc("1.0.0-rc.1", SOURCE, RUN, b"not ELF", fake_elf())


if __name__ == "__main__":
    unittest.main()
