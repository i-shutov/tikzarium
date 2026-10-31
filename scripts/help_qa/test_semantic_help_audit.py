"""Independent negative/positive semantic locator tests, no production fork."""
from __future__ import annotations
from pathlib import Path
import sys
import tomllib
import unittest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from semantic_help_audit import inspect  # noqa: E402


class SemanticAuditTests(unittest.TestCase):
    def fixture(self):
        return {'tools': [{
            'id': 'tikz.node',
            'parameter': [{
                'id': 'mode', 'kind': 'choice', 'allowed_values': ['text', 'math'],
                'help_ru': 'Режим text/math задаёт выбор редактора.',
                'warning_ru': 'Это не ключ TikZ.',
                'interaction_ru': 'В text экранируются символы; math выводит TeX.',
                'default_provenance': 'editor_preset', 'default': 'text',
            }]}
        ]}

    def test_editor_mode_with_explicit_disclaimer_passes(self):
        source = self.fixture()
        self.assertEqual(inspect(source), [], inspect(source))

    def test_false_tikz_key_claim_is_reported_with_locator(self):
        source = self.fixture()
        source['tools'][0]['parameter'][0]['warning_ru'] = ''
        source['tools'][0]['parameter'][0]['interaction_ru'] = 'Выбор меняет подставляемый ключ TikZ.'
        findings = inspect(source)
        self.assertIn('EDITOR_MODE_MISLABELED_AS_TIKZ_KEY', {f['code'] for f in findings})
        self.assertIn('tikz.node.parameter.mode', findings[0]['locator'])
        self.assertIn('tikz-shapes', findings[0]['source'])

    def test_editor_limit_is_not_pgf_syntax_limit(self):
        source = self.fixture()
        source['tools'][0]['parameter'].append({
            'id': 'x', 'kind': 'dimension', 'help_ru': 'Длина.',
            'warning_ru': 'Допустимо только cm.', 'interaction_ru': 'Меняет координату.',
            'default': '1cm', 'default_provenance': 'editor_preset',
        })
        self.assertIn('EDITOR_LITERAL_SCOPE_UNCLEAR',
                      {f['code'] for f in inspect(source)})

    def test_provenance_unknown_pair_is_flagged(self):
        source = self.fixture()
        source['tools'][0]['parameter'][0]['default'] = 'UNKNOWN'
        self.assertIn('UNRESOLVED_EDITOR_PRESET',
                      {f['code'] for f in inspect(source)})

    def test_current_production_file_when_present(self):
        production = HERE.parent.parent / 'extensions/primitives/catalog-v1.toml'
        if not production.is_file():
            self.skipTest('C production catalog not checked out')
        doc = tomllib.loads(production.read_text(encoding='utf-8'))
        findings = inspect(doc)
        self.assertEqual(len(doc['tools']), 6)
        self.assertEqual(sum(len(t['parameter']) for t in doc['tools']), 28)
        self.assertEqual(len(findings), len({(e['locator'], e['code']) for e in findings}))


if __name__ == '__main__':
    unittest.main()
