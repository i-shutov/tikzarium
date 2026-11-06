"""Independent negative contracts for Windows token-only research."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parent))
from qa_windows_restricted_report import check

def sample():
    x = dict(schema_version=1,status="CANDIDATE_TOKEN_INSPECTED_NO_CHILD_NO_TEX",
             lua_status="LUA_TOKEN_INSPECTED_NO_CHILD_NO_TEX", child_process="NOT_RUN",
             external_xelatex="NOT_RUN",approved_child_launcher="NOT_IMPLEMENTED",
             os_policy_modified=False)
    for name, created, claim in (
        ("candidate","restricted_token_created","candidate_is_non_elevated"),
        ("lua_token","lua_token_created","lua_token_is_non_elevated")):
        x.update({created:True,claim:False,f"{name}_create_error":0,
                  f"{name}_elevated":True,f"{name}_integrity_rid":0x3000,
                  f"{name}_admin_sid_enabled":False,f"{name}_same_user":True,
                  f"{name}_same_session":True})
    return x

class TokenOnlyQA(unittest.TestCase):
    def test_high_tokens_remain_blocked(self): self.assertTrue(check(sample()))
    def test_lua_medium_is_still_only_inspected(self):
        x=sample();x.update(lua_token_elevated=False,lua_token_integrity_rid=0x2000,lua_token_is_non_elevated=True)
        self.assertTrue(check(x));self.assertEqual(x["external_xelatex"],"NOT_RUN")
    def test_tampered_or_unsafe_flags_rejected(self):
        for mutation in ({"lua_token_is_non_elevated":True},
                         {"candidate_is_non_elevated":True},
                         {"lua_token_elevated":False,"lua_token_is_non_elevated":True},
                         {"lua_token_same_user":False,"lua_token_is_non_elevated":True},
                         {"lua_token_same_session":False,"lua_token_is_non_elevated":True},
                         {"lua_token_created":False},
                         {"child_process":"PASS"},{"external_xelatex":"PASS"},
                         {"approved_child_launcher":True},{"os_policy_modified":True},
                         {"schema_version":7}):
            with self.subTest(mutation=mutation):
                x=sample();x.update(mutation)
                with self.assertRaises(ValueError): check(x)
    def test_absent_lua_token_does_not_fail_dry_run(self):
        x=sample();x.update(lua_token_created=False,lua_token_create_error=1314,lua_status="LUA_TOKEN_UNAVAILABLE_NO_CHILD_NO_TEX")
        self.assertTrue(check(x))
    def test_no_child_or_security_bypass_in_probe(self):
        s=(Path(__file__).with_name("qa_windows_restricted_token_candidate.ps1")).read_text(encoding="utf-8")
        for v in ("LUA_TOKEN = 0x0004","DISABLE_MAX_PRIVILEGE | LUA_TOKEN","SameUser(","LuaSameSession","NO_CHILD_NO_TEX"):
            self.assertIn(v,s)
        for forbidden in ("CreateProcessAsUser(","CreateProcessWithTokenW(","SetTokenInformation(","Start-Process -Verb RunAs","const uint SANDBOX_INERT"):
            self.assertNotIn(forbidden,s)
if __name__=="__main__":unittest.main()
