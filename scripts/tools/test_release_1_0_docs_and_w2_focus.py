"""Release 1.0: independent source contracts for W2 foreground safety and canonical docs."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "scripts" / "tools"
DOCS = ROOT / "docs"


class W2OwnedForegroundContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (TOOLS / "qa_windows_server_interactive.ps1").read_text(encoding="utf-8-sig")

    def test_foreground_is_owned_before_every_capture(self):
        s = self.source
        for required in (
            "Request-W2OwnedForeground", "$ownerNow -ne $OwnedPid",
            "$observed -ne $OwnedPid",
            "$foreignSession -ne $SessionId",
            "CONFIRMED_OWNED_FOREGROUND",
            "GetForegroundWindow() -ne $handle",
            "Save-TikzariumOwnedClient",
            "BLOCKED_FOREGROUND_NOT_OWNED",
        ):
            self.assertIn(required, s)
        self.assertNotIn("CopyFromScreen", s)
        self.assertNotIn("GetWindowDC", s)

    def test_temporary_input_queue_is_bounded_and_always_detached(self):
        s = self.source
        self.assertIn("$attempt -le 10", s)
        self.assertIn("AttachThreadInput($currentThread,$foreignThread,$true)", s)
        self.assertIn("AttachThreadInput($currentThread,$foreignThread,$false)", s)
        self.assertIn("}finally{\n   $evidence.detach_attempted=$true", s)
        self.assertIn("detached_successfully", s)
        self.assertIn("WIN32_INPUT_QUEUE_DETACH_FAILED", s)
        self.assertIn("BringWindowToTop($OwnedHandle)", s)
        self.assertNotIn("BringWindowToTop($foreground)", s)
        self.assertNotIn("SendKeys]::SendWait('%'", s)

    def test_zero_hwnd_negative_test_is_exercised_by_hosted_powershell(self):
        s = self.source
        self.assertIn("Request-W2OwnedForeground ([IntPtr]::Zero) 1234 2", s)
        self.assertIn("W2_FOREGROUND_NEGATIVE_SELFTEST=PASS_NO_FOREIGN_CAPTURE", s)

    def test_gl_and_exact_trusted_main_stay_checked(self):
        s = self.source
        self.assertIn("W2 exact trusted-main SHA mismatch", s)
        self.assertIn("PASS_TEMPORARY_PINNED_TEST_ONLY", s)
        self.assertIn("PINNED_MESA_LLVMPIPE_TEMP_ONLY_NOT_PRODUCT", s)
        workflow = (ROOT / ".github" / "workflows" / "qa-selfhosted-winserver.yml").read_text()
        self.assertIn("github.event.workflow_run.head_branch == 'main'", workflow)
        self.assertIn("steps.exact_main_sha.outcome == 'success'", workflow)


class ReleaseDocsContract(unittest.TestCase):
    def test_incident_ledger_covers_all_79_declared_incidents(self):
        doc = (DOCS / "TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md").read_text(encoding="utf-8")
        ids = re.findall(r"^\|\s+([A-D]\d{2})\s+\|", doc, flags=re.M)
        self.assertEqual(len(ids), 79, "Do not silently drop technical failure records")
        self.assertEqual(len(set(ids)), 79)
        for section in ("## A.", "## B.", "## C.", "## D.", "## E.", "## F."):
            self.assertIn(section, doc)
        self.assertIn("BLOCKED_FOREGROUND_NOT_OWNED", doc)
        self.assertIn("2026-11-06", doc)

    def test_physical_release_is_not_declared_pass(self):
        runbook = (DOCS / "WINDOWS_1_0_RELEASE_CONTROL_RU.md").read_text(encoding="utf-8")
        for required in ("W0", "W1", "W2", "W3", "W4", "NOT_RUN", "NO-GO",
                         "BLOCKED_FOREGROUND_NOT_OWNED", "MANIFEST.sha256"):
            self.assertIn(required, runbook)
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("docs/WINDOWS_1_0_RELEASE_CONTROL_RU.md", readme)
        self.assertIn("docs/TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md", readme)

    def test_local_links_in_canonical_docs_are_real_files_or_dirs(self):
        for name in ("TECHNICAL_INCIDENTS_AND_REMEDIATIONS_RU.md",
                     "WINDOWS_1_0_RELEASE_CONTROL_RU.md"):
            path = DOCS / name
            text = path.read_text(encoding="utf-8")
            for link in re.findall(r"\]\(([^)#]+)(?:#[^)]+)?\)", text):
                if "://" in link or link.startswith("#"):
                    continue
                resolved = (path.parent / link).resolve()
                self.assertTrue(resolved.exists(), f"{name} links missing {link}")


if __name__ == "__main__":
    unittest.main()
