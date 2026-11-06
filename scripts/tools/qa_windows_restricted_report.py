"""Fail-closed audit of disposable hosted Windows token-only research JSON."""
import json
from pathlib import Path
import sys

def check(d):
    for field, expected in (
        ("schema_version", 1), ("child_process", "NOT_RUN"),
        ("external_xelatex", "NOT_RUN"),
        ("approved_child_launcher", "NOT_IMPLEMENTED"),
        ("os_policy_modified", False),
    ):
        if type(d.get(field)) is not type(expected) or d[field] != expected:
            raise ValueError(f"unexpected or incomplete {field}")
    if d.get("status") not in ("CANDIDATE_TOKEN_INSPECTED_NO_CHILD_NO_TEX",
                               "RESTRICTED_TOKEN_NOT_AVAILABLE_NO_CHILD_NO_TEX"):
        raise ValueError("invalid research status")
    if d.get("lua_status") not in ("LUA_TOKEN_INSPECTED_NO_CHILD_NO_TEX",
                                   "LUA_TOKEN_UNAVAILABLE_NO_CHILD_NO_TEX"):
        raise ValueError("invalid LUA research status")
    for prefix, present, claim in (
        ("candidate", "restricted_token_created", "candidate_is_non_elevated"),
        ("lua_token", "lua_token_created", "lua_token_is_non_elevated"),
    ):
        if type(d.get(present)) is not bool or type(d.get(claim)) is not bool:
            raise ValueError(f"missing {present}/{claim}")
        eligible = (d[present] and d.get(f"{prefix}_elevated") is False
                    and d.get(f"{prefix}_admin_sid_enabled") is False
                    and d.get(f"{prefix}_same_user") is True
                    and d.get(f"{prefix}_same_session") is True
                    and type(d.get(f"{prefix}_integrity_rid")) is int
                    and 0x1000 <= d[f"{prefix}_integrity_rid"] < 0x3000)
        if d[claim] != eligible:
            raise ValueError(f"misclassified {claim}")
        if not d[present] and type(d.get(f"{prefix}_create_error")) is not int:
            raise ValueError(f"missing {prefix} error diagnostic")
    if d["lua_token_created"] != (d["lua_status"] == "LUA_TOKEN_INSPECTED_NO_CHILD_NO_TEX"):
        raise ValueError("LUA creation/status disagree")
    if (d["restricted_token_created"] or d["lua_token_created"]) != (d["status"] == "CANDIDATE_TOKEN_INSPECTED_NO_CHILD_NO_TEX"):
        raise ValueError("overall creation/status disagree")
    return True

if __name__ == "__main__":
    if len(sys.argv) != 2: raise SystemExit("usage: qa_windows_restricted_report.py report.json")
    check(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig")))
    print("Hosted restricted/LUA token evidence accepted; child and TeX NOT_RUN")
