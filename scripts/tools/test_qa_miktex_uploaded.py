#!/usr/bin/env python3
"""Regression guards for the independent uploaded-artifact auditor.

Set TIKZARIUM_MIKTEX_ARTIFACT and TIKZARIUM_SOURCE_SHA for real-evidence
mutation tests; ordinary offline helper tests do not need a downloaded ZIP.
"""
import os
from pathlib import Path
import shutil
import tempfile
import unittest

import qa_miktex_uploaded as qa


class ParserContract(unittest.TestCase):
    def test_engine_banner_rejects_tejlive_and_late_banner(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'main.log'
            p.write_text('This is XeTeX, Version 1 (TeX Live 2026)\nMiKTeX 25.12', encoding='utf-8')
            self.assertFalse(qa.banner(p))
            p.write_text('This is XeTeX, Version 3.14 (MiKTeX 25.12) (preloaded format=xelatex)', encoding='utf-8')
            self.assertTrue(qa.banner(p))

    def test_embedded_fonts_fail_closed(self):
        header = 'name type encoding emb sub uni object ID\n---- ---- ---- --- --- --- ----- --\n'
        self.assertTrue(qa.pdf_fonts_embedded(header + 'AAAAAA+DejaVuSerif TrueType Identity-H yes yes yes 1 0', ['DejaVuSerif']))
        self.assertFalse(qa.pdf_fonts_embedded(header + 'AAAAAA+DejaVuSerif TrueType Identity-H no no yes 1 0', ['DejaVuSerif']))
        self.assertFalse(qa.pdf_fonts_embedded(header, ['DejaVuSerif']))
        self.assertFalse(qa.pdf_fonts_embedded(header + 'AAAAAA+DejaVuSerif TrueType Identity-H yes yes yes 1 0', ['LatinModernMath']))


@unittest.skipUnless(os.environ.get('TIKZARIUM_MIKTEX_ARTIFACT'), 'requires real downloaded MiKTeX artifact')
class RealEvidenceTamper(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = Path(os.environ['TIKZARIUM_MIKTEX_ARTIFACT'])
        cls.sha = os.environ['TIKZARIUM_SOURCE_SHA']
        cls.checkout_sha = os.environ['TIKZARIUM_CHECKOUT_SHA']
        # Baseline must pass before negative mutations count as useful tests.
        assert qa.audit(cls.original, cls.sha, cls.checkout_sha)['status'] == 'PASS'

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'evidence'
        shutil.copytree(self.original, self.root)

    def expect_reject(self):
        with self.assertRaises((ValueError, OSError)):
            qa.audit(self.root, self.sha, self.checkout_sha)

    def test_wrong_checkout_commit(self):
        with self.assertRaises((ValueError, OSError)):
            qa.audit(self.root, self.sha, '0' * 40)

    def test_change_pdf_bytes(self):
        p = self.root / 'N1 project Кириллица with spaces/PDF math/math.pdf'
        p.write_bytes(p.read_bytes() + b'\nMODIFIED')
        self.expect_reject()

    def test_change_generated_source(self):
        p = self.root / 'N1 project Кириллица with spaces/session output/authoring.tex'
        p.write_bytes(p.read_bytes() + b'\n% changed')
        self.expect_reject()

    def test_change_inventory(self):
        with (self.root / 'packages-after.txt').open('ab') as f:
            f.write(b'fake-package|true\n')
        self.expect_reject()

    def test_change_negative_engine_banner(self):
        p = self.root / 'lua-only/graphdrawing-lua.log'
        p.write_text(p.read_text().replace('(MiKTeX 25.12)', '(TeX Live 2026)', 1), encoding='utf-8')
        self.expect_reject()

    def test_fake_setup_complete(self):
        p = self.root / 'setup-stage.json'
        p.write_text(p.read_text().replace('SETUP_COMPLETE', 'INCOMPLETE'), encoding='utf-8')
        self.expect_reject()

    def test_fake_negative_pdf(self):
        (self.root / 'missing-library/missing-library.pdf').write_bytes(b'%PDF-FAKE')
        self.expect_reject()

    def test_change_negative_input_bytes(self):
        p = self.root / 'missing-library/missing-library.tex'
        p.write_bytes(p.read_bytes() + b'\n% corrupted input')
        self.expect_reject()

    def test_remove_lua_negative_input(self):
        (self.root / 'lua-only/graphdrawing-lua.tex').unlink()
        self.expect_reject()


if __name__ == '__main__':
    unittest.main()
