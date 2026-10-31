"""C04 regression gates for metadata-to-matrix-to-fixture drift."""
from __future__ import annotations

import csv
from pathlib import Path
import shutil
import tempfile
import unittest

from verify_catalog import COLUMNS, audit

SOURCE = Path(__file__).resolve().parent.parent


class CatalogGateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "extensions"
        self.root.mkdir()
        for file in SOURCE.glob("*.toml"):
            shutil.copy2(file, self.root / file.name)
        shutil.copy2(SOURCE / "PACKAGE_MATRIX.csv", self.root / "PACKAGE_MATRIX.csv")
        shutil.copytree(SOURCE / "fixtures", self.root / "fixtures")

    def edit_matrix(self, edit):
        path = self.root / "PACKAGE_MATRIX.csv"
        with path.open(newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        edit(rows)
        with path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=COLUMNS)
            writer.writeheader()
            writer.writerows(rows)

    def fail(self, expected):
        result = audit(self.root)
        self.assertFalse(result["accepted"], result)
        self.assertIn(expected, "\n".join(result["errors"]))

    def test_checked_in_catalogue_is_consistent(self):
        result = audit(self.root)
        self.assertTrue(result["accepted"], result)
        self.assertEqual(result["manifest_count"], 5)
        self.assertEqual(result["bound_rows"], 5)
        self.assertEqual(result["fixture_bindings"], 5)

    def test_missing_manifest_is_rejected(self):
        (self.root / "core.toml").unlink()
        self.fail("dangling manifest")

    def test_unrepresented_new_manifest_is_rejected(self):
        path = self.root / "core.toml"
        (self.root / "another.toml").write_text(
            path.read_text().replace("org.tikzarium.core", "org.tikzarium.other"))
        self.fail("absent from package matrix")

    def test_duplicate_manifest_id_is_rejected(self):
        shutil.copy2(self.root / "core.toml", self.root / "another.toml")
        self.fail("duplicate manifest ID")

    def test_unexpected_engine_is_rejected(self):
        path = self.root / "pgfplots.toml"
        path.write_text(path.read_text().replace('engine = "xelatex"', 'engine = "pdflatex"'))
        self.fail("unsupported engine")

    def test_lua_only_claims_xelatex_is_rejected(self):
        self.edit_matrix(lambda rows: rows[-2].update(xelatex_build="NOT_TESTED"))
        self.fail("status inconsistent with engine")

    def test_visual_claim_is_rejected(self):
        self.edit_matrix(lambda rows: rows[0].update(visual_edit="VERIFIED"))
        self.fail("visual/inspection capability not established")

    def test_duplicate_matrix_binding_is_rejected(self):
        self.edit_matrix(lambda rows: rows[1].update(manifest_id="org.tikzarium.core"))
        self.fail("duplicate manifest binding")

    def test_extra_csv_column_is_rejected(self):
        with (self.root / "PACKAGE_MATRIX.csv").open("a") as handle:
            handle.write("extraneous,fields,here\n")
        self.fail("malformed field count")

    def test_symlinked_manifest_is_rejected(self):
        path = self.root / "core.toml"
        target = self.root / "other.txt"
        target.write_bytes(path.read_bytes())
        path.unlink()
        try:
            path.symlink_to(target)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"cannot create symlink: {exc}")
        self.fail("symlinked")

    def test_missing_fixture_is_rejected(self):
        (self.root / "fixtures" / "pgfplots.tex").unlink()
        self.fail("fixture pgfplots")

    def test_reject_unreviewed_visual_features(self):
        path = self.root / "core.toml"
        path.write_text(path.read_text().replace("visual_features = []", 'visual_features = ["drag-node"]'))
        self.fail("unreviewed visual capability")

    def test_matrix_cannot_claim_installed(self):
        self.edit_matrix(lambda rows: rows[0].update(installation="PRESENT"))
        self.fail("must not claim installation")

    def test_engine_mismatch_in_manifest_binding(self):
        self.edit_matrix(lambda rows: rows[0].update(engine_requirement="lualatex", xelatex_build="INCOMPATIBLE_ENGINE"))
        self.fail("manifest engine mismatch")


if __name__ == "__main__":
    unittest.main()
