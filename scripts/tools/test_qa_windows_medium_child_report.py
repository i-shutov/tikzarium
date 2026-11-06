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
        ChildSameSession=True,ChildIsRestricted=False,ChildTerminationConfirmed=True,
        ChildTerminateReturned=True,ChildWaitResult=0,ChildTerminationError=0,
        ChildTokenOpenError=0)

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
            {"ChildTerminationConfirmed":False},
            {"ChildTerminateReturned":False},{"ChildWaitResult":258},
            {"ChildTerminationError":5},{"Status":"PASS"}):
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
    def test_unwrapped_exception_diagnostics_required(self):
        x = sample()
        x.update(Status="BLOCKED_PROBE_EXCEPTION",
                 ErrorType="Win32Exception", NativeErrorCode=1314,
                 ProbeStage="CREATE_PROCESS_AS_USER")
        self.assertTrue(check(x))
        for change in ({"ErrorType":"MethodInvocationException"},
                       {"ErrorType":""},{"NativeErrorCode":-1},
                       {"NativeErrorCode":"1314"},{"ProbeStage":"UNKNOWN"},
                       {"ProbeStage":""}):
            with self.subTest(change=change):
                y=copy.deepcopy(x); y.update(change)
                with self.assertRaises(ValueError):check(y)
    def test_native_child_inspection_denied_but_cleanup_proven(self):
        x=sample()
        x.update(Status="BLOCKED_CHILD_INSPECTION",ChildTokenRead=False,
                 ChildInspectionStage="MEASURE_CHILD_MEMBERSHIP",
                 ChildInspectionErrorType="Win32Exception",ChildInspectionErrorCode=5)
        self.assertTrue(check(x))
        for change in ({"ChildInspectionStage":"UNKNOWN"},
                       {"ChildInspectionErrorCode":-1},
                       {"ChildTerminationConfirmed":False},
                       {"ChildTokenRead":True}):
            y=copy.deepcopy(x);y.update(change)
            with self.subTest(change=change),self.assertRaises(ValueError):check(y)
        z=sample();z.update(Status="BLOCKED_CHILD_TOKEN_OPEN",
            ChildTokenRead=False,ChildTokenOpenError=5)
        self.assertTrue(check(z))
        z["ChildTokenOpenError"]=0
        with self.assertRaises(ValueError):check(z)
    def test_source_is_suspended_os_exe_only(self):
        s=Path(__file__).with_name("qa_windows_medium_child_candidate.ps1").read_text("utf-8")
        for value in ("CreateRestrictedToken(", "LUA_TOKEN=4",
                      "LowerToMedium(candidate)", "CreateProcessAsUserW(",
                      "CREATE_SUSPENDED|CREATE_NO_WINDOW",
                      "TerminateProcess(pi.process,0)", "WaitForSingleObject(pi.process,5000)",
                      "si.desktop=null", "IsTokenRestricted(child)", "ChildTerminationConfirmed",
                      "OpenProcessToken(pi.process,QUERY|DUPLICATE,out child)",
                      "Stage=\"MEASURE_CHILD_MEMBERSHIP\"",
                      "r.ChildTerminationConfirmed=r.ChildTerminateReturned && r.ChildWaitResult==0"):
            self.assertIn(value,s)
        for forbidden in ("ResumeThread(", "xelatex.exe", "SetTokenInformation(parent,",
                          "Start-Process -Verb RunAs", "CreateProcessWithLogonW("):
            self.assertNotIn(forbidden,s)

if __name__=="__main__":unittest.main()
