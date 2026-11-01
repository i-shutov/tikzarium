"""I46 offline predicates; never a substitute for a real egui/X11 process."""
import json
from pathlib import Path
import unittest

from scripts.qa_i46_dirty_open_x11 import (
    OCCUPIED, SCRATCH, VICTIM, profile_check, same_bytes, sha,
)


class I46ContractTests(unittest.TestCase):
    def test_victim_is_real_utf8_crlf_and_opaque_macro(self):
        self.assertIn(b"\r\n", VICTIM)
        self.assertEqual(VICTIM.count(b"\n"), VICTIM.count(b"\r\n"))
        self.assertIn(r"\OpaqueLabel".encode(), VICTIM)
        self.assertIn("Не менять".encode(), VICTIM)
        self.assertNotEqual(sha(VICTIM), sha(SCRATCH))
        self.assertNotEqual(sha(VICTIM), sha(OCCUPIED))

    def test_no_fixture_file_aliasing(self):
        self.assertNotIn(b"\r", SCRATCH)
        self.assertIn(b"UNSAVED SCRATCH", SCRATCH)
        self.assertNotIn(b"UNSAVED SCRATCH", VICTIM)

    def test_profile_requires_exact_reviewed_tree(self):
        profile = json.loads(
            Path("fixtures/qa/i46-b34-dirty-open-x11-1366.json").read_text())
        profile_check(profile, profile["reviewed_app_tree_sha"])
        with self.assertRaises(ValueError):
            profile_check(profile, "0" * 40)
        bad = dict(profile, modal_save="not an event coordinate")
        with self.assertRaises(ValueError):
            profile_check(bad, profile["reviewed_app_tree_sha"])
        missed = dict(profile, modal_save=[506, 458])  # Actual failed I46 click.
        with self.assertRaisesRegex(ValueError, "outside reviewed"):
            profile_check(missed, profile["reviewed_app_tree_sha"])
        self.assertEqual(profile["modal_save"], [536, 429])

    def test_protection_rejects_altered_bytes(self):
        from tempfile import TemporaryDirectory
        with TemporaryDirectory() as d:
            path = Path(d) / "victim.tex"
            path.write_bytes(VICTIM)
            same_bytes(path, VICTIM, "initial victim")
            path.write_bytes(VICTIM.replace(b"\r\n", b"\n"))
            with self.assertRaisesRegex(RuntimeError, "corrupted"):
                same_bytes(path, VICTIM, "LF rewrite")
            path.write_bytes(SCRATCH)
            with self.assertRaisesRegex(RuntimeError, "corrupted"):
                same_bytes(path, VICTIM, "wrong document")


if __name__ == "__main__":
    unittest.main()
