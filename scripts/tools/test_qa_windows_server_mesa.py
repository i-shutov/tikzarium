"""Fail-closed contracts for personal W2 pinned per-app software GL."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "scripts" / "tools"
WORKFLOW = ROOT / ".github" / "workflows" / "qa-selfhosted-winserver.yml"
PIN = "da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388"

class OwnerW2SoftwareGLContracts(unittest.TestCase):
    def test_no_system_install_and_pin(self):
        source = (TOOLS / "qa_windows_server_mesa_stage.ps1").read_text(encoding="utf-8")
        for required in (PIN, "release-mingw.7z",
                         "$env:RUNNER_ENVIRONMENT -cne 'self-hosted'",
                         "$env:GITHUB_REPOSITORY -cne 'i-shutov/tikzarium'",
                         "git rev-parse HEAD", "Get-W2BinaryEvidence",
                         "RUNNER_TEMP", "w2-mesa-software-gl-provenance.json",
                         "no_system_install=$true", "no_product_distribution=$true"):
            self.assertIn(required, source)
        for forbidden in ("Set-ItemProperty", "reg.exe", "msiexec", "Start-Process -Verb RunAs"):
            self.assertNotIn(forbidden, source)

    def test_resilient_server_mesa_no_bare_system_gl_fallback(self):
        stage=(TOOLS / "qa_windows_server_mesa_stage.ps1").read_text(encoding="utf-8")
        helper=(TOOLS / "qa_windows_pinned_mesa_fetch.ps1").read_text(encoding="utf-8")
        shared=(TOOLS / "qa_windows_mesa_transport.ps1").read_text(encoding="utf-8")
        workflow=WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("Get-TikzariumPinnedArchive",stage)
        self.assertIn("archive_transport=$pinned.transport",stage)
        self.assertIn("Get-TikzariumPinnedMesaArchive -ArchivePath $ArchivePath",helper)
        self.assertIn("PINNED_ARCHIVE_ORIGIN_OR_SHA_NOT_ALLOWED_ON_SERVER",helper)
        self.assertIn(PIN,helper)
        self.assertIn("IWR_GITHUB_RELEASE_ASSET_API",shared)
        self.assertIn("CURL_GITHUB_RELEASE",shared)
        self.assertIn("BLOCKED_PINNED_MESA_STAGE_UNAVAILABLE",workflow)
        self.assertIn("w2-mesa-stage-result.json",workflow)
        self.assertIn("gl_renderer='NOT_PROVEN_NO_GUI_LAUNCH'",workflow)
        self.assertNotIn("./scripts/tools/qa_windows_server_interactive.ps1 -OutputDir $evidence -ProbeRealW2bStage1 -BinaryOrigin verified-hosted-release",workflow)

    def test_client_only_gui_remains_exact_sha(self):
        source = (TOOLS / "qa_windows_server_interactive.ps1").read_text(encoding="utf-8")
        for required in ("W2 exact trusted-main SHA mismatch",
                         "Get-W2BinaryEvidence", "StagedGuiExe",
                         "Get-FileHash -LiteralPath $StagedGuiExe",
                         "PASS_TEMPORARY_PINNED_TEST_ONLY", PIN,
                         "Save-TikzariumOwnedClient"):
            self.assertIn(required, source)
        self.assertNotIn("CopyFromScreen", source)

    def test_persistent_runner_only_after_successful_main(self):
        source = WORKFLOW.read_text(encoding="utf-8")
        for required in ("github.event.workflow_run.head_branch == 'main'",
                         "github.event.workflow_run.conclusion == 'success'",
                         "steps.exact_main_sha.outcome == 'success'",
                         "cancel-in-progress: false",
                         "qa_windows_server_mesa_stage.ps1",
                         "Remove every temporary Mesa DLL"):
            self.assertIn(required, source)
        self.assertNotIn("runs-on: ubuntu", source)

    def test_upload_auditor_checks_mesa_origin(self):
        source = (TOOLS / "qa_windows_server_w2_uploaded.py").read_text(encoding="utf-8")
        for required in ("PINNED_MESA_LLVMPIPE_TEMP_ONLY_NOT_PRODUCT", PIN,
                         "w2-mesa-software-gl-provenance.json",
                         "manifest['no_system_install'] is True",
                         "manifest['no_product_distribution'] is True"):
            self.assertIn(required, source)

if __name__ == "__main__":
    unittest.main()
