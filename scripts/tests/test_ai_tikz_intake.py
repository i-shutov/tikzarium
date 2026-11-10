"""AT0 adversarial tests; no private Drive sources, TeX or external executables."""
from __future__ import annotations

import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[1] / "ai_tikz_intake.py"
SPEC = importlib.util.spec_from_file_location("ai_tikz_intake", MODULE)
at0 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(at0)


def catalogue_record(number: int, stem: str, *, engine: str = "xelatex") -> dict:
    return {
        "id": f"{number:02d}", "group": "Тестовая геометрия", "title": "Тест",
        "description": "One source-owned object", "packages": ["tikz"],
        "libraries": ["arrows.meta"], "stem": stem, "engine": engine,
        "check": "Independent geometric invariant",
    }


def to_ledger(cases: list[dict]) -> bytes:
    import csv
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=at0.LEDGER_FIELDS)
    writer.writeheader()
    for item in cases:
        writer.writerow({
            "id": item["id"], "group": item["group"], "stem": item["stem"],
            "tex_path": f"examples/{item['stem']}.tex",
            "packages": ",".join(item["packages"]),
            "libraries": ",".join(item["libraries"]),
            "engine": item["engine"],
            "catalogue_check": f"catalogue.json#{item['id']}.check",
            "implementation_status": "PLANNED_NOT_VERIFIED",
            "gui_adapter_status": "NOT_ASSESSED",
        })
    return stream.getvalue().encode("utf-8")


class AT0IntakeTests(unittest.TestCase):
    def setUp(self):
        self.cases = [catalogue_record(1, "one"), catalogue_record(2, "two")]
        self.json_bytes = json.dumps(self.cases, ensure_ascii=False).encode("utf-8")
        self.ledger_bytes = to_ledger(self.cases)

    def test_source_bound_positive_and_no_guessed_gui(self):
        catalogue = at0.parse_catalogue(
            self.json_bytes, hashlib.sha256(self.json_bytes).hexdigest()
        )
        ledger = at0.parse_ledger(self.ledger_bytes)
        at0.compare_catalogue_ledger(catalogue, ledger)
        self.assertEqual(ledger[0]["implementation_status"], "PLANNED_NOT_VERIFIED")
        self.assertEqual(catalogue[1]["engine"], "xelatex")

    def test_sha_mismatch_closed(self):
        with self.assertRaisesRegex(at0.IntakeError, "CATALOGUE_SHA_MISMATCH"):
            at0.parse_catalogue(self.json_bytes, "0" * 64)

    def test_invalid_utf8_and_duplicate_json_keys(self):
        with self.assertRaisesRegex(at0.IntakeError, "CATALOGUE_JSON_INVALID"):
            at0.parse_catalogue(b"\xff", None)
        duplicate = b'[{"id":"01","id":"02"}]'
        with self.assertRaisesRegex(at0.IntakeError, "Duplicate JSON member"):
            at0.parse_catalogue(duplicate, None)

    def test_out_of_order_duplicate_and_unsupported_engine(self):
        invalid = [dict(self.cases[1]), dict(self.cases[0])]
        with self.assertRaisesRegex(at0.IntakeError, "CATALOGUE_ID_ORDER"):
            at0.parse_catalogue(json.dumps(invalid).encode(), None)
        invalid = [dict(self.cases[0]), dict(self.cases[0])]
        with self.assertRaisesRegex(at0.IntakeError, "CATALOGUE_ID_ORDER"):
            at0.parse_catalogue(json.dumps(invalid).encode(), None)
        invalid = [dict(self.cases[0], engine="pdflatex")]
        with self.assertRaisesRegex(at0.IntakeError, "CATALOGUE_UNSUPPORTED_ENGINE"):
            at0.parse_catalogue(json.dumps(invalid).encode(), None)

    def test_invalid_source_stem_or_duplicate_dependency(self):
        invalid = [dict(self.cases[0], stem="../escape")]
        with self.assertRaisesRegex(at0.IntakeError, "CATALOGUE_STEM_INVALID"):
            at0.parse_catalogue(json.dumps(invalid).encode(), None)
        invalid = [dict(self.cases[0], packages=["tikz", "tikz"])]
        with self.assertRaisesRegex(at0.IntakeError, "CATALOGUE_BAD_TOKENS"):
            at0.parse_catalogue(json.dumps(invalid).encode(), None)

    def test_mutated_ledger_metadata_cannot_pass(self):
        original = at0.parse_ledger(self.ledger_bytes)
        for field, wrong in [
            ("engine", "lualatex"), ("group", "Другая"),
            ("packages", "chemfig"), ("libraries", "calc"),
        ]:
            altered = [dict(row) for row in original]
            altered[0][field] = wrong
            with self.subTest(field=field):
                with self.assertRaisesRegex(at0.IntakeError, "LEDGER_CATALOGUE_MISMATCH"):
                    at0.compare_catalogue_ledger(self.cases, altered)

    def test_ledger_path_traversal_extra_field_and_status(self):
        for initial, replacement, marker in [
            (b"examples/one.tex", b"examples/../escape.tex", "LEDGER_SOURCE_PATH_INVALID"),
            (b"PLANNED_NOT_VERIFIED", b"APPROVED PASS", "LEDGER_STATUS_INVALID"),
            (b"catalogue.json#01.check", b"catalogue.json#03.check", "LEDGER_CHECK_POINTER_INVALID"),
        ]:
            corrupt = self.ledger_bytes.replace(initial, replacement, 1)
            with self.subTest(marker=marker):
                with self.assertRaisesRegex(at0.IntakeError, marker):
                    at0.parse_ledger(corrupt)
        with self.assertRaisesRegex(at0.IntakeError, "LEDGER_HEADER_MISMATCH"):
            at0.parse_ledger(self.ledger_bytes.replace(b"id,group", b"id,group,extra", 1))

    def test_strict_source_files_bytes_utf8_and_symlinks(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            d = root / "examples"
            d.mkdir()
            (d / "one.tex").write_bytes(b"one\r\ntwo\r\n")
            (d / "two.tex").write_bytes("Два\n".encode())
            ok = at0.inspect_sources(root, self.cases)
            self.assertEqual(ok["source_files_verified"], 2)
            self.assertEqual([x["line_endings"] for x in ok["source_files"]], ["CRLF", "LF"])
            (d / "three.tex").write_bytes(b"extra")
            with self.assertRaisesRegex(at0.IntakeError, "EXAMPLE_SET_MISMATCH"):
                at0.inspect_sources(root, self.cases)
            (d / "three.tex").unlink()
            (d / "two.tex").write_bytes(b"\xff")
            with self.assertRaisesRegex(at0.IntakeError, "EXAMPLE_NOT_UTF8"):
                at0.inspect_sources(root, self.cases)
            (d / "two.tex").write_text("OK", encoding="utf-8")
            (d / "one.tex").unlink()
            with self.assertRaisesRegex(at0.IntakeError, "EXAMPLE_SET_MISMATCH"):
                at0.inspect_sources(root, self.cases)

    def test_symlink_escape_fail_closed_if_supported(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            d = root / "examples"
            d.mkdir()
            (root / "outside.tex").write_bytes(b"malicious")
            (d / "two.tex").write_bytes(b"safe")
            try:
                (d / "one.tex").symlink_to(root / "outside.tex")
            except (OSError, NotImplementedError):
                self.skipTest("Symlinks unavailable without elevated Windows permissions")
            with self.assertRaisesRegex(at0.IntakeError, "EXAMPLE_SYMLINK_OR_ESCAPE"):
                at0.inspect_sources(root, self.cases)

    def test_missing_skill_files_are_not_falsely_passed(self):
        with tempfile.TemporaryDirectory() as temporary:
            (Path(temporary) / "skills").mkdir()
            with self.assertRaisesRegex(at0.IntakeError, "SKILL_SET_MISMATCH"):
                at0.inspect_skills(Path(temporary))

    def test_committed_ledger_baseline_and_engine_pins(self):
        # This is a source-independent ledger test, NOT a private corpus test.
        # Full catalogue validation requires owner-provided bytes in the CLI.
        rows = at0.parse_ledger(at0.DEFAULT_LEDGER.read_bytes())
        self.assertEqual(len(rows), 88)
        source = [
            {
                "id": row["id"], "group": row["group"], "title": "not checked",
                "description": "not checked", "stem": row["stem"],
                "packages": row["packages"].split(","),
                "libraries": row["libraries"].split(",") if row["libraries"] else [],
                "engine": row["engine"], "check": "not checked",
            } for row in rows
        ]
        at0.baseline_counts(source)
        self.assertEqual(
            [row["id"] for row in rows if row["engine"] == "lualatex"],
            ["65", "68", "86"],
        )
        self.assertTrue(all(row["implementation_status"] == "PLANNED_NOT_VERIFIED" for row in rows))
        self.assertTrue(all(row["gui_adapter_status"] == "NOT_ASSESSED" for row in rows))


if __name__ == "__main__":
    unittest.main()
