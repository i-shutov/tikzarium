"""Negative tests for hosted-only same-administrator restricted child proposal."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parent))
from qa_windows_medium_child_report import check, CANDIDATE

def sample():
    return dict(Status=CANDIDATE,TexPdf="NOT_RUN",ApprovedLauncher=False,
        AccountPolicyChanged=False,DesktopIsolationVerified=False,AclSecurityVerified=False,
        Executable="WINDOWS_SYSTEM32_WHOAMI_SUSPENDED_ONLY",
        Desktop="NONINTERACTIVE_DEFAULT_NOT_AUDITED",ParentElevated=True,
        ParentIntegrity=12288,ParentSession=2,ParentTokenUnchanged=True,
        RestrictedTokenCreated=True,MediumSetSucceeded=True,
        CandidateElevated=False,CandidateIntegrity=8192,
        CandidateAdminEnabled=False,CandidateSameUser=True,
        CandidateSameSession=True,CandidateIsRestricted=False,
        SuspendedCreated=True,ChildTokenRead=True,ChildElevated=False,
        ChildIntegrity=8192,ChildAdminEnabled=False,ChildSameUser=True,
        ChildSameSession=True,ChildIsRestricted=False,ChildTerminationConfirmed=True)

class SuspendedChildQA(unittest.TestCase):
    def test_candidate_does_not_approve_tex(self):
        self.assertTrue(check(sample()))
        self.assertFalse(sample()["ApprovedLauncher"])
    def test_tamper_rejected(self):
        for change in ({"TexPdf":"PASS"},{"ApprovedLauncher":True},
            {"DesktopIsolationVerified":True},{"AclSecurityVerified":True},
            {"AccountPolicyChanged":True},{"Executable":"xelatex.exe"},
            {"Desktop":"WinSta0\\Default"},{"ParentElevated":False},
            {"ParentIntegrity":8192},{"ParentSession":0},
            {"ParentTokenUnchanged":False},{"RestrictedTokenCreated":False},
            {"CandidateIntegrity":12288},{"CandidateElevated":True},
            {"CandidateAdminEnabled":True},{"CandidateSameUser":False},
            {"CandidateSameSession":False},{"CandidateIsRestricted":True},
            {"SuspendedCreated":False},{"ChildTokenRead":False},
            {"ChildElevated":True},{"ChildIntegrity":12288},
            {"ChildAdminEnabled":True},{"ChildSameUser":False},
            {"ChildSameSession":False},{"ChildIsRestricted":True},
            {"ChildTerminationConfirmed":False},{"Status":"PASS"}):
            with self.subTest(change=change):
                x=sample();x.update(change)
                with self.assertRaises(ValueError):check(x)
    def test_blocked_creation_is_honest(self):
        x=sample();x.update(Status="BLOCKED_CREATEPROCESSASUSER",
                           SuspendedCreated=False,ChildTokenRead=False,
                           ChildTerminationConfirmed=False)
        self.assertTrue(check(x))
    def test_unconfirmed_cleanup_is_hard_blocker(self):
        x=sample();x.update(Status="BLOCKED_CHILD_CLEANUP",
                           ChildTerminationConfirmed=False)
        self.assertTrue(check(x))
        x["Status"]="BLOCKED_CHILD_FACTS"
        with self.assertRaises(ValueError):check(x)
    def test_source_is_suspended_os_exe_only(self):
        s=Path(__file__).with_name("qa_windows_medium_child_candidate.ps1").read_text("utf-8")
        for value in ("CreateRestrictedToken(", "LUA_TOKEN=4",
                      "LowerToMedium(candidate)", "CreateProcessAsUserW(",
                      "CREATE_SUSPENDED|CREATE_NO_WINDOW",
                      "TerminateProcess(pi.process,0)", "WaitForSingleObject(pi.process,5000)",
                      "si.desktop=null", "IsTokenRestricted(child)", "ChildTerminationConfirmed"):
            self.assertIn(value,s)
        for forbidden in ("ResumeThread(", "xelatex.exe", "SetTokenInformation(parent,",
                          "Start-Process -Verb RunAs", "CreateProcessWithLogonW("):
            self.assertNotIn(forbidden,s)

if __name__=="__main__":unittest.main()
