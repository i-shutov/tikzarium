"""Adversarial W3 original-evidence contract tests (synthetic evidence ≠ W3 PASS)."""
from __future__ import annotations

import hashlib
from functools import lru_cache
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest
import zlib

sys.path.insert(0, str(Path(__file__).resolve().parent))
from qa_w3_physical_evidence import EVENTS, PNG_STEPS, TOOLS, KIND, validate, EvidenceError

SOURCE_SHA = "a" * 40
BASE = (
    "\\documentclass{standalone}\r\n"
    "\\usepackage{tikz}\r\n"
    "% Сохранить весь исходный комментарий\r\n"
    "\\begin{document}\r\n"
    "\\begin{tikzpicture}\r\n"
    "  \\node at (0,0) {Точка};\r\n"
    "\\end{tikzpicture}\r\n"
    "\\end{document}\r\n"
).encode("utf-8")


def digest(file: Path) -> str:
    return hashlib.sha256(file.read_bytes()).hexdigest()


@lru_cache(maxsize=32)
def png(seed: int) -> bytes:
    width, height = 900, 480
    def chunk(name: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + name + data + struct.pack(
            ">I", zlib.crc32(name + data) & 0xffffffff)
    rows = []
    # A small but visibly multicolor native-shaped test image. Per-frame
    # seed shifts actual *pixel bytes*, not just PNG compression/metadata.
    for y in range(height):
        row = bytearray()
        for x in range(width):
            row.extend(((x // 21 + seed * 17) % 256,
                        (y // 13 + seed * 23) % 256,
                        (x // 31 + y // 17 + seed * 11) % 256))
        rows.append(b"\x00" + row)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", zlib.compress(b"".join(rows), 6))
            + chunk(b"IEND", b""))


def source_with_owned(count: int) -> bytes:
    commands = []
    for i, tool in enumerate(TOOLS[:count], 1):
        commands.append(
            f'  \\draw (0,0) -- ({i},1); % tikzarium:n1:[2,{i},"{tool}",{{}}]\r\n'
        )
    if count == 7:
        commands.append('  \\draw (1,2) -- (2,3); % tikzarium:n1:[2,7,"line",{}]\r\n')
    return BASE.replace(b"\\end{tikzpicture}", "".join(commands).encode("utf-8")
                        + b"\\end{tikzpicture}")


def fixture(root: Path) -> dict:
    initial = "source/original.tex"
    files = {
        "initial_source": initial,
        "saved_source": "source/final.tex",
        "reopened_source": "source/reopened.tex",
        "seventh_source": "source/after-seven.tex",
        "undo_source": "source/after-undo.tex",
        "pdf": "pdf/figure.pdf",
        "pdffonts": "pdf/pdffonts.txt",
        "pdftotext": "pdf/pdftotext-utf8.txt",
        "pdfinfo": "pdf/pdfinfo.txt",
        "gui_build_log": "pdf/gui-xelatex.log",
    }
    steps = {tool: f"source/after-{tool}.tex" for tool in TOOLS}
    pictures = {name: f"png/{name}.png" for name in PNG_STEPS}
    data = {
        initial: BASE,
        files["saved_source"]: source_with_owned(6),
        files["reopened_source"]: source_with_owned(6),
        files["seventh_source"]: source_with_owned(7),
        files["undo_source"]: source_with_owned(6),
        files["pdf"]: b"%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n",
        files["pdffonts"]: (
            "name type encoding emb sub uni object ID\n"
            "----------------------------------------------------\n"
            "DejaVuSerif CID TrueType Identity-H yes yes yes 11 0\n"
        ).encode(),
        files["pdftotext"]: "Точка\n".encode("utf-8"),
        files["pdfinfo"]: b"Producer: XeTeX output\nPages: 1\n",
        files["gui_build_log"]: b"Real GUI-origin XeLaTeX exit 0, fixture only\n",
    }
    for i, tool in enumerate(TOOLS, 1):
        data[steps[tool]] = source_with_owned(i)
    for i, key in enumerate(PNG_STEPS, 1):
        data[pictures[key]] = png(i)
    for name, content in data.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
    m = {
        "schema_version": 1,
        "kind": KIND,
        "source_sha": SOURCE_SHA,
        "status": "CAPTURED_NOT_ACCEPTED",
        "host": {
            "os_caption": "Windows 10 Pro", "os_build": 19045, "arch": "x64",
            "session_id": 2, "wts_connect_state": 0, "window_station": "WinSta0",
            "input_desktop": "Default", "pid": 1002, "hwnd": 5503,
            "app_sha256": "b" * 64,
        },
        "files": files, "source_snapshots": steps, "pngs": pictures,
        "sha256": {name: digest(root / name) for name in data},
        "events": [
            {"step": step, "pid": 1002, "hwnd": 5503, "session_id": 2,
             "wts_connect_state": 0,
             "origin": ("OBSERVED_OWNED_WINDOW" if step == "startup"
                        else "GUI_XELATEX" if step == "pdf" else "WIN32_REAL_INPUT")}
            for step in EVENTS
        ],
        "expected_cyrillic_text": "Точка",
        "build": {
            "initiator": "GUI_BUTTON", "xelatex_exit_code": 0,
            "saved_source_sha256": digest(root / files["saved_source"]),
            "pdf_sha256": digest(root / files["pdf"]),
        },
    }
    save(root, m)
    return m


def save(root: Path, m: dict) -> None:
    (root / "w3-original.json").write_text(
        json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


class W3EvidenceContractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.m = fixture(self.root)

    def test_synthetic_candidate_only_structure_pass_never_release_pass(self):
        report = validate(self.root, SOURCE_SHA)
        self.assertEqual(report["status"], "STRUCTURE_PASS_MANUAL_PHYSICAL_QA_REQUIRED")
        self.assertEqual(report["release_gate"], "W3_NOT_ACCEPTED")
        self.assertEqual(report["png_count"], len(PNG_STEPS))
        self.assertEqual(report["native_tools"], list(TOOLS))

    def test_wrong_sha_and_forged_pass_blocked(self):
        with self.assertRaises(EvidenceError):
            validate(self.root, "c" * 40)
        self.m["status"] = "PASS"
        save(self.root, self.m)
        with self.assertRaises(EvidenceError):
            validate(self.root, SOURCE_SHA)

    def test_localized_windows_caption_accepted_as_structure_only(self):
        self.m["host"]["os_caption"] = "Майкрософт Windows 10 Pro"
        save(self.root, self.m)
        report = validate(self.root, SOURCE_SHA)
        self.assertEqual(report["release_gate"], "W3_NOT_ACCEPTED")

    def test_hosted_or_disconnected_session_never_W3(self):
        self.m["host"]["os_caption"] = "Windows Server 2025"
        save(self.root, self.m)
        with self.assertRaises(EvidenceError):
            validate(self.root, SOURCE_SHA)
        self.m["host"]["os_caption"] = "Windows 10 Pro"
        self.m["host"]["wts_connect_state"] = 4
        save(self.root, self.m)
        with self.assertRaises(EvidenceError):
            validate(self.root, SOURCE_SHA)

    def test_missing_original_or_tampered_sha_rejected(self):
        self.root.joinpath(self.m["pngs"]["f1"]).unlink()
        with self.assertRaises(EvidenceError):
            validate(self.root, SOURCE_SHA)
        p = self.root / self.m["pngs"]["f1"]
        p.parent.mkdir(exist_ok=True)
        p.write_bytes(png(2))
        self.root.joinpath(self.m["files"]["pdf"]).write_bytes(b"%PDF-1.7\nbad\n%%EOF")
        with self.assertRaises(EvidenceError):
            validate(self.root, SOURCE_SHA)

    def test_changed_source_with_recomputed_hash_still_fails(self):
        path = self.root / self.m["source_snapshots"]["rectangle"]
        path.write_bytes(path.read_bytes().replace(b"\r\n", b"\n"))
        self.m["sha256"][self.m["source_snapshots"]["rectangle"]] = digest(path)
        save(self.root, self.m)
        with self.assertRaisesRegex(EvidenceError, "unrelated source"):
            validate(self.root, SOURCE_SHA)

    def test_prior_native_geometry_mutation_with_same_owner_marker_rejected(self):
        path = self.root / self.m["source_snapshots"]["rectangle"]
        path.write_bytes(path.read_bytes().replace(b"\\draw (0,0)", b"\\draw (9,9)", 1))
        self.m["sha256"][self.m["source_snapshots"]["rectangle"]] = digest(path)
        save(self.root, self.m)
        with self.assertRaisesRegex(EvidenceError, "prior native TikZ command"):
            validate(self.root, SOURCE_SHA)

    def test_lost_real_input_step_and_foreign_owner_rejected(self):
        self.m["events"][3]["pid"] = 999
        save(self.root, self.m)
        with self.assertRaises(EvidenceError):
            validate(self.root, SOURCE_SHA)
        self.m["events"][3]["pid"] = 1002
        self.m["events"] = self.m["events"][:-1]
        save(self.root, self.m)
        with self.assertRaises(EvidenceError):
            validate(self.root, SOURCE_SHA)

    def test_pdf_fonts_and_text_must_be_independently_present(self):
        path = self.root / self.m["files"]["pdffonts"]
        path.write_text(path.read_text().replace("yes yes yes", "no no no"))
        self.m["sha256"][self.m["files"]["pdffonts"]] = digest(path)
        save(self.root, self.m)
        with self.assertRaisesRegex(EvidenceError, "Unembedded"):
            validate(self.root, SOURCE_SHA)
        path.write_text(path.read_text().replace("no no no", "yes yes yes"))
        self.m["sha256"][self.m["files"]["pdffonts"]] = digest(path)
        txt = self.root / self.m["files"]["pdftotext"]
        txt.write_text("No Cyrillic here", encoding="utf-8")
        self.m["sha256"][self.m["files"]["pdftotext"]] = digest(txt)
        save(self.root, self.m)
        with self.assertRaisesRegex(EvidenceError, "Cyrillic"):
            validate(self.root, SOURCE_SHA)

    def test_traversal_symlink_and_missing_inventory_blocked(self):
        self.m["files"]["pdf"] = "../outside.pdf"
        save(self.root, self.m)
        with self.assertRaises(EvidenceError):
            validate(self.root, SOURCE_SHA)
        self.m["files"]["pdf"] = "pdf/figure.pdf"
        self.m["sha256"].pop("pdf/figure.pdf")
        save(self.root, self.m)
        with self.assertRaises(EvidenceError):
            validate(self.root, SOURCE_SHA)

    def test_source_reopen_undo_and_gui_pdf_binding_required(self):
        self.m["build"]["saved_source_sha256"] = "0" * 64
        save(self.root, self.m)
        with self.assertRaisesRegex(EvidenceError, "source-bound"):
            validate(self.root, SOURCE_SHA)
        self.m["build"]["saved_source_sha256"] = digest(
            self.root / self.m["files"]["saved_source"])
        self.root.joinpath(self.m["files"]["undo_source"]).write_bytes(BASE)
        self.m["sha256"][self.m["files"]["undo_source"]] = digest(
            self.root / self.m["files"]["undo_source"])
        save(self.root, self.m)
        with self.assertRaisesRegex(EvidenceError, "Undo"):
            validate(self.root, SOURCE_SHA)


if __name__ == "__main__":
    unittest.main()
