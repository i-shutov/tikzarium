"""Release regression: W2 screenshot helpers must never read the owner's desktop."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "scripts" / "tools"
PROBES = ("qa_windows_server_interactive.ps1", "qa_windows_hosted_native_gui.ps1")


class OwnedClientCaptureContracts(unittest.TestCase):
    def test_both_windows_probes_use_audited_owned_client(self):
        for probe in PROBES:
            with self.subTest(probe=probe):
                source = (TOOLS / probe).read_text(encoding="utf-8-sig")
                self.assertIn("qa_windows_owned_client_capture.ps1", source)
                self.assertIn("Save-TikzariumOwnedClient -Handle $handle -ExpectedPid $appProcess.Id", source)
                self.assertIn("CAPTURED_CLIENT_PRINTWINDOW_NO_SCREEN_READ_NOT_MANUALLY_REVIEWED", source)
                self.assertNotRegex(source, r"(?i)\.(?:CopyFromScreen|BitBlt)\s*\(")
                self.assertIn("GetForegroundWindow()", source)

    def test_helper_targets_hwnd_client_and_checks_current_desktop(self):
        helper = (TOOLS / "qa_windows_owned_client_capture.ps1").read_text(encoding="utf-8-sig")
        for native in (
            "GetClientRect(", "ClientToScreen(", "PrintWindow(",
            "GetWindowThreadProcessId(", "GetForegroundWindow()",
            "RequireUnlockedInputDesktop()", "IsWindowVisible(", "IsIconic(",
            "flags);", "0x3u", "PrintWindow(hwnd, hdc, 0x3u)",
        ):
            self.assertIn(native, helper)
        self.assertIn("WIN32_PRINTWINDOW_PW_CLIENTONLY_RENDERFULLCONTENT_NO_SCREEN_READ", helper)
        self.assertNotRegex(helper, r"(?i)\.(?:CopyFromScreen|BitBlt)\s*\(")
        self.assertNotRegex(helper, r"(?i)\b(?:GetDC|GetWindowDC)\s*\(")

    def test_dpi_is_thread_scoped_and_both_probes_use_physical_geometry(self):
        helper = (TOOLS / "qa_windows_owned_client_capture.ps1").read_text()
        for native in ("InPhysicalPixelScope", "SetThreadDpiAwarenessContext", "AreDpiAwarenessContextsEqual",
                       "GetMonitorInfo", "GetDpiForWindow", "dpi_context_restored = true", "finally {"):
            self.assertIn(native, helper)
        self.assertNotIn("SetProcessDpiAwareness", helper)
        for probe in PROBES:
            source = (TOOLS / probe).read_text()
            self.assertIn("Get-TikzariumOwnedPhysicalGeometry -Handle $handle -ExpectedPid $appProcess.Id", source)
            self.assertIn("capture_geometry_after=$after", source)
            self.assertNotIn("[System.Windows.Forms.Screen]::FromHandle", source)
            self.assertIn("schema_version=3", source)

    def test_personal_workflow_keeps_trusted_main_boundary(self):
        workflow = (ROOT / ".github" / "workflows" / "qa-selfhosted-winserver.yml").read_text()
        self.assertIn("github.event.workflow_run.head_branch == 'main'", workflow)
        self.assertIn("steps.exact_main_sha.outcome == 'success'", workflow)
        self.assertIn("qa_windows_server_interactive.ps1", workflow)
        self.assertNotIn("runs-on: windows-2022", workflow)


if __name__ == "__main__":
    unittest.main()
