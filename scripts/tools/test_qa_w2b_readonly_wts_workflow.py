"""Read-only scheduled WTS readiness: never an untrusted GUI or RDP mutation."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[2]
FLOW=ROOT/'.github/workflows/qa-w2b-readonly-wts.yml'
WTS=ROOT/'scripts/tools/qa_windows_w2_session_readiness.ps1'


class ReadonlyWtsWatcherContract(unittest.TestCase):
    def setUp(self):
        self.workflow=FLOW.read_text(encoding='utf-8')
        self.probe=WTS.read_text(encoding='utf-8')

    def test_only_schedule_and_explicit_manual_on_default_main(self):
        src=self.workflow
        self.assertIn("    - cron: '3,33 * * * *'",src)
        self.assertIn('  workflow_dispatch:',src)
        self.assertIn("if: github.ref == 'refs/heads/main'",src)
        self.assertNotIn('  pull_request:',src)
        self.assertNotIn('  push:',src)
        self.assertIn("ref: \${{ github.sha }}".replace(r'\$', '$'),src)
        self.assertIn("persist-credentials: false",src)
        self.assertIn("READONLY_WTS_MAIN_ADVANCED_REFUSE_OLD_SHA",src)
        self.assertIn("READONLY_WTS_TRUSTED_MAIN_REF_REQUIRED",src)

    def test_read_only_self_hosted_lease_does_not_displace_full_qa(self):
        src=self.workflow
        self.assertIn('runs-on: [self-hosted, Windows, X64, tikzarium-winserver]',src)
        self.assertIn('group: tikzarium-readonly-w2b-wts',src)
        self.assertNotIn('group: tikzarium-trusted-winserver-main',src)
        self.assertIn('cancel-in-progress: false',src)
        self.assertIn('timeout-minutes: 7',src)
        self.assertIn('permissions:\n  contents: read\n  actions: read',src)
        self.assertNotIn('actions: write',src)

    def test_only_native_wts_input_free_probe_and_provenance(self):
        src=self.workflow
        self.assertIn('qa_windows_w2_session_readiness.ps1 -OutputDir',src)
        self.assertIn("w2b_full -cne 'NOT_RUN'",src)
        self.assertIn("gui_input -cne 'NOT_RUN'",src)
        self.assertIn("READONLY_WTS_ORIGINAL_REPORT_CONTRACT_FAILED",src)
        self.assertIn("WTS_ACTIVE_IS_CANDIDATE_ONLY",src)
        self.assertIn("source_sha -cne $env:GITHUB_SHA",src)
        for forbidden in ('SetForegroundWindow','AttachThreadInput','SendKeys','mouse_event',
                          'tscon.exe','logoff.exe','Set-ItemProperty','msiexec','Start-Process',
                          'GALLIUM_DRIVER','qa_windows_w2b_stage1.ps1','qa_windows_server_rust.ps1'):
            self.assertNotIn(forbidden,src)

    def test_original_artifact_retained_without_pass_claim(self):
        src=self.workflow
        self.assertIn("name: tikzarium-w2b-readonly-wts-\${{ github.run_id }}".replace(r'\$','$'),src)
        self.assertIn('retention-days: 2',src)
        self.assertIn('if-no-files-found: warn',src)
        self.assertIn("Remove temporary read-only status file",src)
        self.assertNotIn('PASS_PHYSICAL_W2B',src)

    def test_reuses_reviewed_fail_closed_native_wts(self):
        src=self.probe
        for text in ('WTSQuerySessionInformationW','Get-W2RdpDecision',
                     'BLOCKED_RDP_DISCONNECTED','WTS_ACTIVE_CANDIDATE_NOT_GUI_PROOF',
                     "RUNNER_ENVIRONMENT -cne 'self-hosted'",'BLOCKED_W2_RDP_PROBE_CHECKOUT_SHA_MISMATCH'):
            self.assertIn(text,src)


if __name__=='__main__':
    unittest.main()
