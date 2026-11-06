"""Static safety contract; live Win32 experiment runs on hosted Windows."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]

class WindowsLinkedCandidateTests(unittest.TestCase):
    def test_candidate_never_executes_tex_or_a_child(self):
        s=(ROOT/"scripts/tools/qa_windows_filtered_child_candidate.ps1").read_text(encoding="utf8")
        for anchor in ("CreateProcessWithTokenW","CREATE_SUSPENDED",
                       "TokenLinkedToken","whoami.exe","TerminateProcess",
                       "ChildSameUser","ChildIntegrity","ChildElevated",
                       "ChildElevationType","ChildSameSession","ProcessIdToSessionId",
                       "ChildTerminationConfirmed","BLOCKED_CHILD_CLEANUP_UNCONFIRMED",
                       "BLOCKED_SESSION0",
                       "SUSPENDED_LIMITED_CHILD_CANDIDATE_NOT_APPROVED",
                       "ApprovedLauncher","TexPdf","NOT_RUN"):
            self.assertIn(anchor,s)
        self.assertIn("if (!r.ChildTerminationConfirmed)",s)
        self.assertIn("r.ChildWaitResult==0",s)
        for forbidden in ("ResumeThread(","SetTokenInformation(","CreateRestrictedToken(",
                          "xelatex.exe","Start-Process -Verb RunAs","CreateProcessWithLogonW("):
            self.assertNotIn(forbidden,s)

    def test_script_is_not_run_on_personal_server(self):
        ci=(ROOT/".github/workflows/ci.yml").read_text(encoding="utf8")
        server=(ROOT/".github/workflows/qa-selfhosted-winserver.yml").read_text(encoding="utf8")
        self.assertIn("qa_windows_filtered_child_candidate.ps1",ci)
        self.assertIn("windows-filtered-child-candidate.json",ci)
        self.assertNotIn("qa_windows_filtered_child_candidate.ps1",server)

if __name__=="__main__":
    unittest.main()
