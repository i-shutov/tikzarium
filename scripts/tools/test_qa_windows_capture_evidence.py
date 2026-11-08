"""Regression tests use genuine PNG streams and hostile, CRC-correct mutations."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib
from unittest.mock import patch

import qa_windows_capture_evidence as evidence
import test_qa_windows_hosted_gui_audit as hosted_fixture
import test_qa_windows_server_w2_uploaded as server_fixture


def chunk(kind: bytes, payload: bytes) -> bytes:
    return struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff)


def png(*, color=2, mode='varied', filter_kind=0, level=6, text=None, raw_extra=b'') -> bytes:
    width, height = 800, 450
    bpp = 3 if color == 2 else 4
    pixels = bytearray()
    previous = bytes(width * bpp)
    for y in range(height):
        row = bytes(c for x in range(width) for c in
                    ((x % 251, y % 251, 96) if mode == 'varied' else (0, 0, 0)) +
                    (() if bpp == 3 else ((0 if mode == 'transparent' else 255),)))
        encoded = bytearray(row)
        for i in range(len(row)) if filter_kind else ():
            left = row[i-bpp] if i >= bpp else 0
            above = previous[i]
            ul = previous[i-bpp] if i >= bpp else 0
            p = left + above - ul
            ds = (abs(p-left), abs(p-above), abs(p-ul))
            predictors = (0, left, above, (left+above)//2, (left, above, ul)[ds.index(min(ds))])
            encoded[i] = (row[i] - predictors[filter_kind]) & 255
        pixels.append(filter_kind)
        pixels.extend(encoded)
        previous = row
    return (evidence.PNG_SIGNATURE + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, color, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(pixels + raw_extra, level))
            + (chunk(b'tEXt', text) if text is not None else b'') + chunk(b'IEND', b''))


class PngPixelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.valid = png()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'original.png'

    def read(self, data):
        self.path.write_bytes(data)
        return evidence.inspect_png(self.path)

    def test_decodes_real_original_pixels(self):
        result = self.read(self.valid)
        self.assertEqual((result.width, result.height), (800, 450))
        self.assertGreaterEqual(result.sampled_colors, 8)

    def test_all_five_png_filters_normalize_to_same_pixel_hash(self):
        expected = self.read(self.valid).pixel_sha256
        for kind in range(1, 5):
            with self.subTest(kind=kind):
                self.assertEqual(self.read(png(filter_kind=kind)).pixel_sha256, expected)

    def test_rgba_opaque_matches_rgb_pixels(self):
        expected = self.read(self.valid).pixel_sha256
        self.assertEqual(self.read(png(color=6)).pixel_sha256, expected)

    def test_png_metadata_and_compression_do_not_create_a_visual_change(self):
        expected = self.read(self.valid).pixel_sha256
        changed = png(level=1, text=b'Note\0metadata only')
        self.assertNotEqual(hashlib.sha256(changed).hexdigest(), hashlib.sha256(self.valid).hexdigest())
        self.assertEqual(self.read(changed).pixel_sha256, expected)

    def test_black_original_cannot_borrow_reported_color_count(self):
        with self.assertRaises(evidence.EvidenceError):
            self.read(png(mode='black'))

    def test_transparent_original_is_not_client_capture(self):
        with self.assertRaisesRegex(ValueError, 'Nonopaque'):
            self.read(png(color=6, mode='transparent'))

    def test_crc_correct_invalid_zlib_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'compressed pixel'):
            self.read(self.valid[:33] + chunk(b'IDAT', b'not a zlib stream') + chunk(b'IEND', b''))

    def test_valid_crc_cannot_hide_truncated_pixel_rows(self):
        with self.assertRaisesRegex(ValueError, 'decompression'):
            self.read(self.valid[:33] + chunk(b'IDAT', zlib.compress(b'\0' * 10)) + chunk(b'IEND', b''))

    def test_overlong_decoded_stream_is_bounded_and_rejected(self):
        with self.assertRaisesRegex(ValueError, 'decompression'):
            self.read(png(raw_extra=b'excess'))

    def test_extra_zlib_stream_is_not_accepted_as_a_frame(self):
        length = struct.unpack_from('>I', self.valid, 33)[0]
        compressed = self.valid[41:41+length] + zlib.compress(b'junk')
        with self.assertRaisesRegex(ValueError, 'decompression'):
            self.read(self.valid[:33] + chunk(b'IDAT', compressed) + chunk(b'IEND', b''))

    def test_decoded_budget_checked_before_inflation(self):
        with patch.object(evidence, 'MAX_DECODED_BYTES', 100):
            with self.assertRaisesRegex(ValueError, 'decoded pixel budget'): self.read(self.valid)

    def test_compressed_budget_bounds_input_read(self):
        with patch.object(evidence, 'MAX_PNG_BYTES', 100):
            with self.assertRaisesRegex(ValueError, 'compressed byte budget'): self.read(self.valid)

    def test_duplicate_header_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'repeated'):
            self.read(self.valid[:33] + self.valid[8:33] + self.valid[33:])

    def test_unknown_critical_chunk_rejected(self):
        with self.assertRaisesRegex(ValueError, 'critical'):
            self.read(self.valid[:33] + chunk(b'ABCD', b'') + self.valid[33:])

    def test_noncontiguous_image_data_rejected(self):
        length = struct.unpack_from('>I', self.valid, 33)[0]
        compressed = self.valid[41:41+length]
        with self.assertRaisesRegex(ValueError, 'Noncontiguous'):
            self.read(self.valid[:33] + chunk(b'IDAT', compressed[:10]) + chunk(b'tEXt', b'N\0x')
                      + chunk(b'IDAT', compressed[10:]) + chunk(b'IEND', b''))

    def test_invalid_filter_byte_rejected(self):
        with self.assertRaisesRegex(ValueError, 'row filter'):
            self.read(self.valid[:33] + chunk(b'IDAT', zlib.compress((b'\5' + b'\0'*2400)*450))
                      + chunk(b'IEND', b''))

    def test_trailing_bytes_after_iend_rejected(self):
        with self.assertRaisesRegex(ValueError, 'termination'):
            self.read(self.valid + b'junk')


class CrossAuditorTests(unittest.TestCase):
    def fixtures(self):
        for module, folder in ((server_fixture, 'w2-interactive'), (hosted_fixture, 'hosted-window')):
            case = module.W2AuditTests()
            case.setUp()
            self.addCleanup(case.doCleanups)
            yield case, folder

    def test_metadata_only_f1_change_rejected_by_both_auditors(self):
        for case, folder in self.fixtures():
            with self.subTest(folder=folder):
                before = case.root / folder / 'real-window-before-f1.png'
                after = case.root / folder / 'real-window-after-f1.png'
                original = before.read_bytes()
                after.write_bytes(original[:-12] + chunk(b'tEXt', b'N\0not a visual change') + original[-12:])
                case.report.update(f1='KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW',
                                   second_png_sha256=hashlib.sha256(after.read_bytes()).hexdigest())
                with self.assertRaisesRegex(evidence.EvidenceError, 'not rendered pixels'): case.verify()

    def test_rendered_change_stays_partial_never_full_w2(self):
        for case, folder in self.fixtures():
            with self.subTest(folder=folder):
                before = case.root / folder / 'real-window-before-f1.png'
                original = before.read_bytes()
                length = struct.unpack_from('>I', original, 33)[0]
                raw = bytearray(zlib.decompress(original[41:41+length]))
                raw[1] ^= 1
                after = case.root / folder / 'real-window-after-f1.png'
                after.write_bytes(original[:33] + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))
                case.report.update(f1='KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW',
                                   second_png_sha256=hashlib.sha256(after.read_bytes()).hexdigest())
                result = case.verify()
                self.assertEqual(result['full_w2_qualification'], 'NOT_RUN')
                self.assertEqual(result['visual_review'], 'REQUIRED_NOT_AUTOMATED')

    def test_unknown_schema_and_f1_state_rejected(self):
        for case, folder in self.fixtures():
            for key, value in (('schema_version', 99), ('f1', 'PASS_FROM_HASH_ONLY')):
                with self.subTest(folder=folder, key=key):
                    old = case.report[key]; case.report[key] = value
                    with self.assertRaises(evidence.EvidenceError): case.verify()
                    case.report[key] = old

    def test_invalid_expected_sha_rejected_even_for_blocked_report(self):
        with self.assertRaises(evidence.EvidenceError):
            evidence.validate_identity({'schema_version': 3, 'source_sha': 'x'}, 'x')

    def test_full_existing_gate_suites_hold_under_both_optimization_levels(self):
        tools = str(Path(__file__).parent)
        for level in ('-O', '-OO'):
            for pattern in ('test_qa_windows_server_w2_uploaded.py', 'test_qa_windows_hosted_gui_audit.py',
                            'test_qa_windows_capture_geometry.py'):
                with self.subTest(level=level, pattern=pattern):
                    result = subprocess.run([sys.executable, level, '-B', '-m', 'unittest', 'discover',
                                             '-s', tools, '-p', pattern], capture_output=True, text=True, timeout=30)
                    self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
