"""Offline tests of evidence predicates, not GUI execution."""
import importlib.util
import json
from pathlib import Path
import unittest

MODULE = Path(__file__).resolve().parents[1] / 'qa_n1_desktop.py'
spec = importlib.util.spec_from_file_location('desktop', MODULE)
desktop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(desktop)


def line(owner_id=1, tool='line'):
    data = {'schema': 1, 'id': owner_id, 'tool': tool, 'draft': {'values': {}}}
    return ('  \\draw (0,0)--(1,1);' + desktop.MARKER + json.dumps(data).encode().hex() + '\n').encode()


class DesktopEvidenceTests(unittest.TestCase):
    def test_known_metadata_is_decoded(self):
        self.assertEqual(desktop.owners(line())[0]['tool'], 'line')

    def test_duplicate_ids_fail(self):
        with self.assertRaises(ValueError):
            desktop.owners(line() + line())

    def test_malformed_marker_fails(self):
        with self.assertRaises(ValueError):
            desktop.owners((desktop.MARKER + 'zz\n').encode())

    def test_inserted_commands_preserve_unicode_original(self):
        original = desktop.FIXTURE.encode()
        current = original.replace(b'\\end{tikzpicture}', line() + b'\\end{tikzpicture}')
        self.assertTrue(desktop.original_preserved(original, current))

    def test_unrelated_byte_or_newline_mutation_fails(self):
        original = desktop.FIXTURE.encode()
        self.assertFalse(desktop.original_preserved(original, original.replace('Не менять'.encode(), b'changed')))
        self.assertFalse(desktop.original_preserved(original, original.replace(b'\n', b'\r\n')))


if __name__ == '__main__':
    unittest.main()
