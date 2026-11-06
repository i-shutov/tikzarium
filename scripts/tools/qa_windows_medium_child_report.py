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
             "BLOCKED_CHILD_FACTS","BLOCKED_CHILD_CLEANUP",
             "BLOCKED_PARENT_TOKEN_CHANGED","BLOCKED_PROBE_EXCEPTION"}
    if status not in blocked|{CANDIDATE}:
        raise ValueError("unrecognized status")
    for k in ("SuspendedCreated","ChildTokenRead","ChildTerminationConfirmed",
              "ParentTokenUnchanged","ParentElevated","RestrictedTokenCreated",
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
    if status==CANDIDATE:
        if not all((d["SuspendedCreated"], d["ChildTokenRead"],
                    d["ChildTerminationConfirmed"],d["ParentTokenUnchanged"],
                    d["ParentElevated"],d["RestrictedTokenCreated"],
                    d["MediumSetSucceeded"],d["CandidateSameUser"],
                    d["CandidateSameSession"],d["CandidateIsRestricted"],
                    d["ChildSameUser"],d["ChildSameSession"],d["ChildIsRestricted"])):
            raise ValueError("candidate lacks mandatory evidence")
        if any((d["CandidateElevated"],d["ChildElevated"],
                d["CandidateAdminEnabled"],d["ChildAdminEnabled"])):
            raise ValueError("elevated/admin candidate")
        if d.get("CandidateIntegrity")!=8192 or d.get("ChildIntegrity")!=8192:
            raise ValueError("not exactly MEDIUM integrity")
        if d.get("ParentIntegrity",0)<12288 or d.get("ParentSession",0)==0:
            raise ValueError("invalid parent security/session")
    return True

if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("usage: qa_windows_medium_child_report.py FILE")
    check(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig")))
    print("Hosted suspended MEDIUM child classified; no TeX/desktop isolation approval")
