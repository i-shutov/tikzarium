#!/usr/bin/env python3
"""Run: python3 -m unittest discover -s scripts/help_qa -p 'test_*.py' -v"""
from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import tomllib
import unittest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from validate_primitives_help import audit  # noqa: E402


MINIMAL = r'''
schema_version = 1
id = "org.tikzarium.primitives"

[[tools]]
id = "tikz.line"
title_ru = "Линия"
syntax = "\\draw (${start_x},0cm) -- (${end_x},0cm);"
help_ru = "Проводит отрезок штатной командой TikZ."
example = "\\draw (0cm,0cm) -- (2cm,0cm);"
warning_ru = "Координаты могут совпасть."
interaction_ru = "Текущая система координат наследуется."
manual_section = "14.2.1"
manual_url = "https://tikz.dev/tikz-paths"

[tools.requirements]
packages = ["tikz"]
libraries = []
engine = "xelatex"
pgf_version_min = "UNKNOWN"
documented_against = "3.1.12"

[[tools.parameter]]
id = "start_x"
syntax = "${start_x}"
kind = "dimension"
units = ["pt", "mm", "cm", "in"]
allowed_values = []
positive = false
max_abs = 10000.0
default = "0cm"
default_provenance = "editor_preset"
help_ru = "X первой точки."
example = "0cm"
warning_ru = "Это буквальная длина."
interaction_ru = "Меняет только первую координату."
manual_section = "14.2.1"
manual_url = "https://tikz.dev/tikz-paths"
requirements_inherit = "tool"

[[tools.parameter]]
id = "end_x"
syntax = "${end_x}"
kind = "dimension"
units = ["pt", "mm", "cm", "in"]
allowed_values = []
positive = false
max_abs = 10000.0
default = "2cm"
default_provenance = "editor_preset"
help_ru = "X второй точки."
example = "2cm"
warning_ru = "Это буквальная длина."
interaction_ru = "Меняет только вторую координату."
manual_section = "14.2.1"
manual_url = "https://tikz.dev/tikz-paths"
requirements_inherit = "tool"
'''


class HelpCatalogueQATest(unittest.TestCase):
    def setUp(self):
        self.data = tomllib.loads(MINIMAL)

    def codes(self, data=None):
        return {e['code'] for e in audit(data or self.data, n1=False)['errors']}

    def test_positive_minimal(self):
        result = audit(self.data, n1=False)
        self.assertEqual(result['status'], 'PASS', result['errors'])
        self.assertEqual((result['tools'], result['parameters'], result['manual_references']), (1, 2, 3))

    def test_bounded_n1_requires_full_catalog_not_a_test_fixture(self):
        self.assertIn('N1_TOOL_SET', self.codes_n1())
        self.assertIn('N1_PARAMETER_COUNT', self.codes_n1())

    def codes_n1(self):
        return {e['code'] for e in audit(self.data, n1=True)['errors']}

    def test_missing_russian_explanation(self):
        self.data['tools'][0]['parameter'][0]['help_ru'] = 'X coordinate'
        self.assertIn('NO_RUSSIAN_HELP', self.codes())

    def test_blank_help(self):
        self.data['tools'][0]['help_ru'] = ' '
        self.assertIn('MISSING_HELP_FIELD', self.codes())

    def test_dangling_tool_placeholder(self):
        self.data['tools'][0]['syntax'] += ' ${phantom}'
        self.assertIn('UNRESOLVED_TEMPLATE_REF', self.codes())

    def test_unused_parameter(self):
        self.data['tools'][0]['syntax'] = r'\draw (0cm,0cm)--(1cm,1cm);'
        self.assertIn('UNUSED_PARAMETER', self.codes())

    def test_duplicate_param(self):
        self.data['tools'][0]['parameter'].append(deepcopy(self.data['tools'][0]['parameter'][0]))
        self.assertIn('DUPLICATE_PARAMETER', self.codes())

    def test_missing_manual_section(self):
        self.data['tools'][0]['parameter'][1]['manual_section'] = ''
        self.assertIn('MISSING_HELP_FIELD', self.codes())

    def test_wrong_chapter_section(self):
        self.data['tools'][0]['parameter'][1]['manual_section'] = '16.5'
        self.assertIn('MANUAL_SECTION_MISMATCH', self.codes())

    def test_unknown_manual_url(self):
        self.data['tools'][0]['manual_url'] = 'https://tikz.dev/nonexistent'
        self.assertIn('UNKNOWN_MANUAL_CHAPTER', self.codes())

    def test_untrusted_external_manual(self):
        self.data['tools'][0]['manual_url'] = 'https://example.com/tikz-paths'
        self.assertIn('UNTRUSTED_MANUAL_URL', self.codes())

    def test_version_must_not_be_claimed_as_verified_minimum(self):
        self.data['tools'][0]['requirements']['pgf_version_min'] = '3.1.12'
        self.assertIn('UNVERIFIED_MIN_VERSION', self.codes())

    def test_editor_preset_not_pgf_default(self):
        self.data['tools'][0]['parameter'][0]['default_provenance'] = 'tex_default'
        self.assertIn('DEFAULT_PROVENANCE', self.codes())

    def test_unknown_requires_pair(self):
        self.data['tools'][0]['parameter'][0]['default'] = 'UNKNOWN'
        self.assertIn('DEFAULT_UNKNOWN_PAIR', self.codes())

    def test_negative_dimension_preset_bound(self):
        self.data['tools'][0]['parameter'][0]['default'] = '10001cm'
        self.assertIn('INVALID_DIMENSION_PRESET', self.codes())

    def test_dimension_expression_not_a_gui_literal(self):
        self.data['tools'][0]['parameter'][0]['default'] = r'\myx'
        self.assertIn('INVALID_DIMENSION_PRESET', self.codes())

    def test_missing_arrow_library(self):
        self.data['tools'][0]['id'] = 'tikz.arrow'
        self.assertIn('LIBRARY_REQUIREMENT', self.codes())

    def test_malformed_tool_syntax_is_machine_error_not_traceback(self):
        self.data['tools'][0]['syntax'] = 7
        self.assertIn('MISSING_HELP_FIELD', self.codes())
        self.assertIn('UNUSED_PARAMETER', self.codes())

    def test_malformed_bound_is_machine_error_not_traceback(self):
        self.data['tools'][0]['parameter'][0]['max_abs'] = "bogus"
        self.assertIn('PARAM_BOUNDS_TYPE', self.codes())

    def test_malformed_choice_list_is_machine_error_not_traceback(self):
        p = self.data['tools'][0]['parameter'][0]
        p['kind'] = 'choice'
        p['units'] = []
        p['allowed_values'] = 7
        self.assertIn('INVALID_CHOICES', self.codes())

    def test_machine_report_exit_status(self):
        with tempfile.TemporaryDirectory() as td:
            cat = Path(td, 'catalog.toml')
            report = Path(td, 'report.json')
            cat.write_text(MINIMAL, encoding='utf-8')
            cmd = [sys.executable, str(HERE / 'validate_primitives_help.py'), '--catalog', str(cat),
                   '--report', str(report), '--minimal-fixture']
            proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
            self.assertEqual(proc.returncode, 0, proc.stderr + proc.stdout)
            payload = json.loads(report.read_text('utf-8'))
            self.assertEqual(payload['status'], 'PASS')
            self.assertEqual(payload['tools'], 1)
            self.assertEqual(json.loads(proc.stdout)['catalog_sha256'], payload['catalog_sha256'])
            cat.write_text(MINIMAL.replace('14.2.1', '99.2.1'), encoding='utf-8')
            negative = subprocess.run(cmd, capture_output=True, text=True, check=False)
            self.assertEqual(negative.returncode, 1)
            self.assertEqual(json.loads(negative.stdout)['status'], 'FAIL')
            cat.write_text('[[tools]\n', encoding='utf-8')
            broken = subprocess.run(cmd, capture_output=True, text=True, check=False)
            self.assertEqual(broken.returncode, 2)
            self.assertEqual(json.loads(broken.stdout)['status'], 'ERROR')

    def test_actual_C_catalog_if_available(self):
        root = HERE.parent.parent
        cat = root / 'extensions' / 'primitives' / 'catalog-v1.toml'
        if not cat.is_file():
            self.skipTest('production C catalogue not present in isolated E workspace')
        report = audit(tomllib.loads(cat.read_text('utf-8')), n1=True)
        self.assertEqual(report['status'], 'PASS', report['errors'])
        self.assertEqual((report['tools'], report['parameters']), (6, 28))


if __name__ == '__main__':
    unittest.main()
