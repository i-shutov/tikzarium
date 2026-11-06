"""Fail-closed independent classification of hosted-only suspended MEDIUM restricted child."""
import json
from pathlib import Path
import sys

CANDIDATE = "SUSPENDED_MEDIUM_CHILD_CANDIDATE_NOT_APPROVED"

def check(d):
    fixed = {
        "TexPdf":"NOT_RUN","ApprovedLauncher":False,"AccountPolicyChanged":False,
        "DesktopIsolationVerified":False,"AclSecurityVerified":False,
        "Executable":"WINDOWS_SYSTEM32_WHOAMI_SUSPENDED_ONLY",
        "Desktop":"NONINTERACTIVE_DEFAULT_NOT_AUDITED",
    }
    for field,value in fixed.items():
        if type(d.get(field)) is not type(value) or d[field] != value:
            raise ValueError("unsafe or missing: "+field)
    status=d.get("Status")
    blocked={"BLOCKED_SESSION0","BLOCKED_PARENT_NOT_HIGH","BLOCKED_RESTRICTED_CREATE",
             "BLOCKED_MEDIUM_SET","BLOCKED_CANDIDATE_FACTS","BLOCKED_SYSTEM_EXE",
             "BLOCKED_CREATEPROCESSASUSER","BLOCKED_CHILD_TOKEN_OPEN",
             "BLOCKED_CHILD_FACTS","BLOCKED_CHILD_INSPECTION","BLOCKED_CHILD_CLEANUP",
             "BLOCKED_PARENT_TOKEN_CHANGED","BLOCKED_PROBE_EXCEPTION"}
    if status not in blocked|{CANDIDATE}:
        raise ValueError("unrecognized status")
    if status=="BLOCKED_PROBE_EXCEPTION":
        # A generic "MethodInvocationException" is not actionable evidence.
        # Require the unwrapped native/.NET error type and a fixed stage code.
        stages={"OPEN_PARENT_TOKEN","CREATE_RESTRICTED_TOKEN",
                "LOWER_TO_MEDIUM","MEASURE_CANDIDATE",
                "FIND_SYSTEM_EXECUTABLE","CREATE_PROCESS_AS_USER",
                "MEASURE_CHILD","TERMINATE_AND_WAIT","VERIFY_PARENT_TOKEN"}
        if d.get("ProbeStage") not in stages:
            raise ValueError("probe exception lacks known diagnostic stage")
        if not isinstance(d.get("ErrorType"),str) or not d["ErrorType"] or d["ErrorType"]=="MethodInvocationException":
            raise ValueError("probe exception lacks unwrapped error type")
        if type(d.get("NativeErrorCode")) is not int or d["NativeErrorCode"]<0:
            raise ValueError("probe exception lacks numeric Win32 code")
        return True
    for k in ("SuspendedCreated","ChildTokenRead","ChildTerminationConfirmed",
              "ParentTokenUnchanged","ParentElevated","RestrictedTokenCreated",
              "ChildTerminateReturned",
              "MediumSetSucceeded","CandidateElevated","CandidateAdminEnabled",
              "CandidateSameUser","CandidateSameSession","CandidateIsRestricted",
              "ChildElevated","ChildAdminEnabled","ChildSameUser","ChildSameSession",
              "ChildIsRestricted"):
        if type(d.get(k)) is not bool:
            # A C#-level top exception may produce an explicitly blocked minimal record.
            if status=="BLOCKED_PROBE_EXCEPTION":return True
            raise ValueError("missing boolean: "+k)
    if d["SuspendedCreated"] and not d["ChildTerminationConfirmed"] and status!="BLOCKED_CHILD_CLEANUP":
        raise ValueError("unconfirmed termination cannot be glossed over")
    if status=="BLOCKED_CHILD_TOKEN_OPEN":
        if (not d["SuspendedCreated"] or d["ChildTokenRead"] or
            type(d.get("ChildTokenOpenError")) is not int or d["ChildTokenOpenError"]<=0):
            raise ValueError("child token open failure lacks evidence")
    if status=="BLOCKED_CHILD_INSPECTION":
        stages={"MEASURE_CHILD_ELEVATION","MEASURE_CHILD_INTEGRITY",
                "MEASURE_CHILD_MEMBERSHIP","MEASURE_CHILD_IDENTITY",
                "MEASURE_CHILD_RESTRICTION"}
        if not d["SuspendedCreated"] or d["ChildTokenRead"] or not d["ChildTerminationConfirmed"]:
            raise ValueError("child inspection failure lacks cleanup proof")
        if (d.get("ChildInspectionStage") not in stages or
            not isinstance(d.get("ChildInspectionErrorType"),str) or
            not d["ChildInspectionErrorType"] or
            type(d.get("ChildInspectionErrorCode")) is not int or
            d["ChildInspectionErrorCode"]<0):
            raise ValueError("child inspection failure lacks native diagnostics")
    if status==CANDIDATE:
        # IsTokenRestricted tests for restricting SIDs, not deny-only groups.
        # The source passes RestrictedSidCount=0 deliberately: FALSE is expected
        # even after CreateRestrictedToken disables Admin SID and privileges.
        if d["CandidateIsRestricted"] is not False or d["ChildIsRestricted"] is not False:
            raise ValueError("unexpected restricting SID list")
        if not all((d["SuspendedCreated"], d["ChildTokenRead"],
                    d["ChildTerminationConfirmed"],d["ChildTerminateReturned"],
                    d["ParentTokenUnchanged"],
                    d["ParentElevated"],d["RestrictedTokenCreated"],
                    d["MediumSetSucceeded"],d["CandidateSameUser"],
                    d["CandidateSameSession"],
                    d["ChildSameUser"],d["ChildSameSession"])):
            raise ValueError("candidate lacks mandatory evidence")
        if any((d["CandidateElevated"],d["ChildElevated"],
                d["CandidateAdminEnabled"],d["ChildAdminEnabled"])):
            raise ValueError("elevated/admin candidate")
        if d.get("CandidateIntegrity")!=8192 or d.get("ChildIntegrity")!=8192:
            raise ValueError("not exactly MEDIUM integrity")
        if d.get("ChildWaitResult")!=0 or d.get("ChildTerminationError")!=0:
            raise ValueError("child termination outcome not proven")
        if d.get("ParentIntegrity",0)<12288 or d.get("ParentSession",0)==0:
            raise ValueError("invalid parent security/session")
    return True

if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("usage: qa_windows_medium_child_report.py FILE")
    check(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig")))
    print("Hosted suspended MEDIUM child classified; no TeX/desktop isolation approval")
