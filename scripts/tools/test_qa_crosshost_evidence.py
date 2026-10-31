"""Offline tamper regressions for the cross-host archive gate (no TeX needed)."""
from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import qa_crosshost_evidence as qa

HEAD = "8764a732b9a846a6ba1f111c9b656781195a6412"
PDF = b"%PDF-1.7\nartificial unit-test only\n%%EOF\n"


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")


def toml_record(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    for k, v in data.items():
        value = json.dumps(v, ensure_ascii=False) if isinstance(v, str) else str(v).lower()
        lines.append(f"{k} = {value}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


class EvidenceCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.evidence = self.base / "evidence"
        self.sources = self.base / "extensions" / "fixtures"
        self.manifest = self.base / "fixtures" / "qa" / "manifest.json"
        self.sources.mkdir(parents=True)
        self.manifest.parent.mkdir(parents=True)
        self.manifest.write_bytes(b'{"cases": []}\n')
        self.g08 = self.manifest.parent / "g08-error" / "main.tex"
        self.g08.parent.mkdir()
        self.g08.write_bytes(b"\\TikzariumIntentionallyUndefinedCommand\n")
        for name in qa.FIXTURES:
            (self.sources / f"{name}.tex").write_bytes(
                f"% {name}\n\\begin{{document}}\n".encode()
            )
        for slug, (host, arches, ui_dir) in qa.HOSTS.items():
            self.build_host(slug, host, sorted(arches)[0], ui_dir)
        self.patcher = patch.object(qa, "check_pdf", return_value=None)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        self.poppler = patch.object(qa.shutil, "which", return_value="/usr/bin/test")
        self.poppler.start()
        self.addCleanup(self.poppler.stop)

    def eol(self, data, host):
        return data.replace(b"\n", b"\r\n") if host == "Windows" else data

    def build_host(self, slug, host, arch, ui_dir):
        folder = self.evidence / f"qa-evidence-{slug}"
        ext = folder / "extensions"
        ext.mkdir(parents=True)
        cases = []
        for fixture in sorted(qa.CASES):
            neg = fixture == "g08-intentional-tex-error"
            c = {
                "id": fixture,
                "status": "KNOWN_LIMITATION" if fixture ==
                "g00-legacy-cyrillic-pdf-only" else "PASS",
                "source_unchanged": True,
                "exit_code": 3 if neg else 0,
            }
            if fixture == "g02-tikz-fonts":
                (folder / (fixture + ".pdf")).write_bytes(PDF)
                c.update({
                    "sha256": qa.digest(PDF),
                    "glyph_audit": "PASS",
                    "missing_glyphs": 0,
                    "text_extraction_checked": True,
                    "embedded_fonts_checked": True,
                })
            if neg:
                c["source_sha256"] = {
                    "main.tex": qa.digest(self.eol(self.g08.read_bytes(), host))
                }
                (folder / (fixture + ".stderr.log")).write_bytes(
                    b"Undefined control sequence: \\TikzariumIntentionallyUndefinedCommand"
                )
            cases.append(c)
        write_json(folder / "qa-report.json", {
            "schema_version": 1, "commit_sha": HEAD, "source_head_sha": HEAD,
            "system": host, "machine": arch,
            "manifest_sha256": qa.digest(self.eol(self.manifest.read_bytes(), host)),
            "summary": {"PASS": 5, "FAIL": 0, "SKIP": 0, "KNOWN_LIMITATION": 1},
            "cases": cases,
        })
        summary = {
            "accepted": True, "schema_version": 1, "compiler_version": "XeTeX 2026",
            "fixture_results": [],
        }
        for name, manifest in qa.FIXTURES.items():
            fixture = ext / name
            fixture.mkdir()
            negative = name == "graphdrawing-lua"
            verdict = "expected_engine_error" if negative else "rendered_pdf"
            console = (b"You need to run LuaTeX to use the grap\nh drawing library"
                       if negative else b"OK\n")
            texlog = b"recorded log\n"
            (fixture / "console.log").write_bytes(console)
            (fixture / (name + ".log")).write_bytes(texlog)
            src = self.eol((self.sources / (name + ".tex")).read_bytes(), host)
            rec = {
                "schema_version": 1,
                "fixture_id": name,
                "manifest_id": manifest,
                "tested_engine": "xelatex",
                "host_os": host,
                "host_arch": arch,
                "runner_kind": "hosted_ci",
                "source_preserved": True,
                "verdict": verdict,
                "tex_version": "XeTeX 2026",
                "source_sha256": qa.digest(src),
                "log_sha256": qa.digest(console),
                "tex_log_sha256": qa.digest(texlog),
                "exit_code": 1 if negative else 0,
            }
            if not negative:
                (fixture / (name + ".pdf")).write_bytes(PDF)
                rec.update({"pages": 1, "pdf_sha256": qa.digest(PDF)})
            toml_record(fixture / "observation.toml", rec)
            summary["fixture_results"].append({
                "fixture_id": name, "verdict": verdict,
            })
        write_json(ext / "summary.json", summary)
        write_json(ext / "audit.json", {
            "accepted": True, "complete_suite": True,
            "verified_fixtures": 5, "errors": [], "scope": "full_five",
        })
        write_json(self.evidence / ui_dir / "ui-unit-contract.json", {
            "source_head_sha": HEAD,
            "machine": arch,
            "status": "PASS_UNIT",
            "scope": "UNIT_TEST_ONLY",
            "physical_win10_smoke": "NOT_RUN",
            "physical_m1_m4_smoke": "NOT_RUN",
            "gui_restart_persistence": "NOT_RUN",
            "gui_visual_theme_invariance": "NOT_RUN",
            "groups": {
                name: {"status": "PASS_UNIT", "missing": [], "passed_count": count}
                for name, count in (("ui_theme::tests", 3), ("font_proof::tests", 2))
            },
        })

    def run_audit(self):
        return qa.audit(self.evidence, self.sources, self.manifest, HEAD)

    def mutate_json(self, path, mutate):
        obj = json.loads(path.read_text())
        mutate(obj)
        write_json(path, obj)

    def test_complete_three_host_matrix_with_windows_crlf(self):
        result = self.run_audit()
        self.assertTrue(result["accepted"])
        self.assertEqual(3, len(result["hosts"]))
        self.assertEqual("NOT_RUN", result["physical_win10_smoke"])

    def test_missing_one_host_is_failure(self):
        from shutil import rmtree
        rmtree(self.evidence / "qa-evidence-macos-arm64")
        with self.assertRaisesRegex(qa.AuditError, "folder"):
            self.run_audit()

    def test_forged_source_head_rejected(self):
        path = self.evidence / "qa-evidence-windows-server-x64/qa-report.json"
        self.mutate_json(path, lambda j: j.update(source_head_sha="f" * 40))
        with self.assertRaisesRegex(qa.AuditError, "source SHA"):
            self.run_audit()

    def test_foreign_checkout_sha_rejected(self):
        path = self.evidence / "qa-evidence-macos-arm64/qa-report.json"
        self.mutate_json(path, lambda j: j.update(commit_sha="f" * 40))
        with self.assertRaisesRegex(qa.AuditError, "different checkout"):
            self.run_audit()

    def test_windows_non_eol_source_mutation_rejected(self):
        path = self.evidence / "qa-evidence-windows-server-x64/extensions/core/observation.toml"
        path.write_text(
            path.read_text().replace('source_sha256 = "', 'source_sha256 = "1')
        )
        with self.assertRaisesRegex(qa.AuditError, "source hash"):
            self.run_audit()

    def test_invalid_negative_pdf_present_rejected_even_with_success_audit(self):
        folder = self.evidence / "qa-evidence-linux-x64/extensions/graphdrawing-lua"
        (folder / "graphdrawing-lua.pdf").write_bytes(b"not a PDF")
        with self.assertRaisesRegex(qa.AuditError, "Lua-only negative"):
            self.run_audit()

    def test_lua_error_message_must_be_complete(self):
        folder = self.evidence / "qa-evidence-linux-x64/extensions/graphdrawing-lua"
        replaced = b"some other engine failure"
        (folder / "console.log").write_bytes(replaced)
        path = folder / "observation.toml"
        previous = qa.digest(b"You need to run LuaTeX to use the grap\nh drawing library")
        path.write_text(path.read_text().replace(previous, qa.digest(replaced)))
        with self.assertRaisesRegex(qa.AuditError, "Lua-only negative"):
            self.run_audit()

    def test_g08_wrong_error_rejected(self):
        path = self.evidence / "qa-evidence-macos-arm64/g08-intentional-tex-error.stderr.log"
        path.write_text("Undefined control sequence (unknown macro)")
        with self.assertRaisesRegex(qa.AuditError, "G08 negative"):
            self.run_audit()

    def test_g02_report_hash_wrong_rejected(self):
        path = self.evidence / "qa-evidence-linux-x64/qa-report.json"
        self.mutate_json(path, lambda j: next(
            x for x in j["cases"] if x["id"] == "g02-tikz-fonts"
        ).update(sha256="f" * 64))
        with self.assertRaisesRegex(qa.AuditError, "SHA-256"):
            self.run_audit()

    def test_ui_restart_claim_cannot_be_inherited_from_unit_test(self):
        path = self.evidence / "qa-ui-unit-contract-windows-2022/ui-unit-contract.json"
        self.mutate_json(path, lambda j: j.update(gui_restart_persistence="PASS"))
        with self.assertRaisesRegex(qa.AuditError, "GUI unit-contract"):
            self.run_audit()

    def test_incomplete_extension_audit_rejected(self):
        path = self.evidence / "qa-evidence-linux-x64/extensions/audit.json"
        self.mutate_json(path, lambda j: j.update(verified_fixtures=4))
        with self.assertRaisesRegex(qa.AuditError, "incomplete"):
            self.run_audit()


class PdfProofTest(unittest.TestCase):
    def test_unembedded_font_fails(self):
        def result(tool, _pdf, _args):
            if tool == "pdfinfo":
                return "Pages: 1\n"
            if tool == "pdftotext":
                return "Оптика и квантовая яма\nГреческие символы αβγ"
            return (
                "name type encoding emb sub uni object ID\n----\n"
                "AAAAAA+DejaVuSerif CID TrueType Identity-H no yes yes 5 0\n"
                "AAAAAA+LatinModernMath-Regular-Identity-H CID TrueType Identity-H yes yes yes 6 0"
            )
        with patch.object(qa, "run_pdf", side_effect=result):
            with self.assertRaisesRegex(qa.AuditError, "DejaVuSerif"):
                qa.check_pdf(PDF, "synthetic", text=True)

    def test_pdf_uses_real_text_and_embedded_fonts(self):
        def result(tool, _pdf, _args):
            if tool == "pdfinfo":
                return "Pages: 1\n"
            if tool == "pdftotext":
                return "Оптика и квантовая яма\nГреческие символы αβγ"
            return (
                "name type encoding emb sub uni object ID\n----\n"
                "AAAAAA+DejaVuSerif CID TrueType Identity-H yes yes yes 5 0\n"
                "BBBBBB+LatinModernMath-Regular-Identity-H CID TrueType Identity-H yes yes yes 6 0"
            )
        with patch.object(qa, "run_pdf", side_effect=result):
            qa.check_pdf(PDF, "synthetic", text=True)


if __name__ == "__main__":
    unittest.main()
