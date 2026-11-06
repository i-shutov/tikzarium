"""Contract checks; live Win32 token read is run on hosted Windows CI."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]

class WindowsTokenReleaseContract(unittest.TestCase):
    def test_native_token_probe_is_read_only_and_distinguishes_fields(self):
        source = (ROOT / "scripts/tools/qa_windows_token.ps1").read_text(encoding="utf-8")
        for field in ("OpenProcessToken", "TokenElevation", "TokenElevationType",
                      "TokenIntegrityLevel", "TokenLinkedToken", "session_id",
                      "administrator_sid_in_token",
                      "NOT_IMPLEMENTED_NOT_APPROVED",
                      "PRESENT_LIMITED_TOKEN_QUERY_ONLY",
                      "PRESENT_NOT_A_VERIFIED_LIMITED_TOKEN",
                      "uac_linked_token_integrity_rid",
                      "uac_linked_token_is_elevated"):
            self.assertIn(field, source)
        self.assertNotIn('account_name = $id.Name', source)
        self.assertIn('result.LinkedIsElevated = QueryInt(handle, 20) != 0', source)
        self.assertIn('result.LinkedElevationType = QueryInt(handle, 18)', source)
        self.assertIn('result.LinkedIntegrityRid = QueryIntegrityRid(handle)', source)
        for unsafe in ("CreateProcessWithTokenW(", "CreateRestrictedToken(",
                       "SetTokenInformation(", "Start-Process -Verb RunAs"):
            self.assertNotIn(unsafe, source)

    def test_restricted_token_dry_run_is_volatile_and_never_spawns(self):
        source = (ROOT / "scripts/tools/qa_windows_restricted_token_candidate.ps1").read_text(encoding="utf-8")
        for value in ("CreateRestrictedToken(", "DISABLE_MAX_PRIVILEGE",
                      "BuiltinAdministratorsSid", "CheckTokenMembership",
                      "DuplicateToken(",
                      "candidate_is_non_elevated", "NO_CHILD_NO_TEX"):
            self.assertIn(value, source)
        for forbidden in ("CreateProcessAsUser(", "CreateProcessWithTokenW(",
                          "SetTokenInformation(", "Start-Process -Verb RunAs"):
            self.assertNotIn(forbidden, source)

    def test_external_pdf_processors_are_guarded_under_windows_admin(self):
        core = ROOT / "crates/tikzarium-core/src"
        app = ROOT / "crates/tikzarium-app/src"
        self.assertIn("require_safe_tex_child()?", (core / "preview.rs").read_text(encoding="utf-8"))
        self.assertIn("require_safe_external_document_child()", (app / "pdf_navigation.rs").read_text(encoding="utf-8"))
        self.assertIn("pub use windows_tex_security::require_safe_external_document_child", (core / "lib.rs").read_text(encoding="utf-8"))

    def test_personal_server_does_not_demand_new_user_or_run_elevated_tex(self):
        s = (ROOT / "scripts/tools/qa_windows_server_user.ps1").read_text(encoding="utf-8")
        self.assertIn("qa_windows_token.ps1", s)
        self.assertIn("ENVIRONMENT_BLOCKED_ELEVATED_NO_APPROVED_CHILD", s)
        self.assertIn("token_is_elevated", s)
        self.assertNotIn("use a non-admin user session", s)

    def test_hosted_windows_tex_jobs_preflight_before_any_external_tex(self):
        # A fully elevated hosted runner cannot be used to manufacture
        # "green" PDF evidence by directly launching TeX with a full token.
        for workflow, install_anchor in (
            (".github/workflows/qa-miktex-windows.yml",
             "Isolated private MiKTeX installation with pinned installer"),
            (".github/workflows/qa-matrix.yml",
             "Install TeX Live 2026 fixture subset"),
        ):
            source = (ROOT / workflow).read_text(encoding="utf-8")
            pos = source.index("Preflight actual Windows process token"
                               if "miktex-windows" in workflow
                               else "Preflight Windows process token")
            self.assertLess(pos, source.index(install_anchor))
            for required in ("qa_windows_token.ps1",
                             "token_is_elevated",
                             "token_integrity_rid",
                             "BLOCKED_UNSAFE_TOKEN_NOT_RUN",
                             "if($blocked)"):
                self.assertIn(required, source)

    def test_production_engine_has_token_guard_before_spawning(self):
        d = (ROOT / "crates/tikzarium-core/src")
        for path in ("discovery.rs", "build.rs"):
            self.assertIn("require_safe_tex_child", (d / path).read_text(encoding="utf-8"))
        text = (d / "windows_tex_security.rs").read_text(encoding="utf-8")
        for value in ("TOKEN_ELEVATION_CLASS", "TOKEN_INTEGRITY_CLASS",
                      "PermissionDenied", "check_tex_privilege"):
            self.assertIn(value, text)

if __name__ == "__main__":
    unittest.main()
