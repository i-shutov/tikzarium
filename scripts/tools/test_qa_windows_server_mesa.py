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

    def test_windows_builtin_tar_support_instead_of_forced_7zip_install(self):
        stage=(TOOLS / 'qa_windows_server_mesa_stage.ps1').read_text(encoding='utf-8')
        self.assertIn('qa_windows_msys2_tar_stage.ps1', stage)
        self.assertIn('Expand-TikzariumPinnedMsys2WithWindowsTar',stage)
        self.assertIn('archive_extract_method=$extractMethod',stage)
        self.assertIn('PINNED_MSYS2_NO_PREINSTALLED_ARCHIVER',stage)
        self.assertNotIn("PINNED_MSYS2_REQUIRES_EXISTING_7ZIP_NO_INSTALL_ALLOWED",stage)
        helper=(TOOLS / 'qa_windows_msys2_tar_stage.ps1').read_text(encoding='utf-8')
        self.assertIn('Get-Command tar.exe',helper)
        self.assertIn('PINNED_MSYS2_NATIVE_TAR_ZSTD_EXTRACTION_FAILED_EXIT_',helper)
        self.assertIn('NO_MINGW64_BIN',helper)
        self.assertNotIn('msiexec',helper)
        self.assertNotIn('Set-ItemProperty',helper)

    def test_original_main_ci_mesa_escrow_is_optional_and_exact_sha_bounded(self):
        ci=(ROOT / '.github' / 'workflows' / 'ci.yml').read_text(encoding='utf-8')
        server=WORKFLOW.read_text(encoding='utf-8')
        stage=(TOOLS / 'qa_windows_server_mesa_stage.ps1').read_text(encoding='utf-8')
        self.assertIn("name: tikzarium-private-w2-pal1000-qa-only",ci)
        self.assertIn("retention-days: 2",ci)
        self.assertIn("github.event_name == 'push' && github.ref == 'refs/heads/main'",ci)
        self.assertIn("Get-TikzariumPinnedMesaArchive -ArchivePath $archive -MaxAttempts 2",ci)
        self.assertIn(PIN,ci)
        self.assertIn("continue-on-error: true",ci)
        self.assertIn("Download optional exact-main QA-only Mesa escrow",server)
        self.assertIn("run-id: ${{ github.event_name == 'workflow_run'",server)
        self.assertIn("qa-mesa-escrow.json",stage)
        self.assertIn("PINNED_MESA_CI_ESCROW_UNTRUSTED_PROVENANCE",stage)
        self.assertIn("PINNED_MESA_CI_ESCROW_SHA_MISMATCH",stage)
        self.assertIn("TRUSTED_MAIN_SOURCE_CI_QA_ESCROW",stage)
        self.assertIn("$binary.source_ci_run_id",stage)
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
