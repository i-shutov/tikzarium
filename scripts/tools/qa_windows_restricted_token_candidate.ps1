# Windows security experiment: create and INSPECT a temporary restricted token
# derived from this process. No child is launched; no TeX/UAC/account mutation.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
$report = [ordered]@{
  schema_version = 1
  status = 'INCOMPLETE'
  child_process = 'NOT_RUN'
  external_xelatex = 'NOT_RUN'
  approved_child_launcher = 'NOT_IMPLEMENTED'
  os_policy_modified = $false
}
$exitCode = 1
try {
  if ($env:OS -cne 'Windows_NT') { throw 'Windows token probe requires Windows' }
  $definition = @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Security.Principal;

public sealed class TikzariumRestrictedTokenCandidate {
    public bool Available { get; set; }
    public int CreateError { get; set; }
    public bool ParentElevated { get; set; }
    public int ParentIntegrityRid { get; set; }
    public bool ParentAdminGroupEnabled { get; set; }
    public bool CandidateElevated { get; set; }
    public int CandidateElevationType { get; set; }
    public int CandidateIntegrityRid { get; set; }
    public bool CandidateAdminGroupEnabled { get; set; }
    public bool CandidateSameUser { get; set; }
    public bool CandidateSameSession { get; set; }
    public int ParentSession { get; set; }
    public bool LuaTokenCreated { get; set; }
    public int LuaCreateError { get; set; }
    public bool LuaElevated { get; set; }
    public int LuaElevationType { get; set; }
    public int LuaIntegrityRid { get; set; }
    public bool LuaAdminGroupEnabled { get; set; }
    public bool LuaSameUser { get; set; }
    public bool LuaSameSession { get; set; }
}

public static class TikzariumRestrictedTokenDryRun {
    const uint TOKEN_DUPLICATE = 0x0002;
    const uint TOKEN_QUERY = 0x0008;
    const uint DISABLE_MAX_PRIVILEGE = 0x0001;
    const uint LUA_TOKEN = 0x0004; // Microsoft; never use SANDBOX_INERT

    [StructLayout(LayoutKind.Sequential)]
    public struct SidAndAttributes {
        public IntPtr Sid;
        public uint Attributes;
    }

    [DllImport("kernel32.dll")] private static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll", SetLastError=true)]
    private static extern bool CloseHandle(IntPtr handle);
    [DllImport("advapi32.dll", SetLastError=true)]
    private static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
    [DllImport("advapi32.dll", SetLastError=true)]
    private static extern bool CreateRestrictedToken(
        IntPtr original, uint flags, uint disabledSidCount,
        ref SidAndAttributes disabledSids, uint removedPrivilegeCount,
        IntPtr removedPrivileges, uint restrictingSidCount,
        IntPtr restrictingSids, out IntPtr restricted);
    [DllImport("advapi32.dll", SetLastError=true)]
    private static extern bool DuplicateToken(
        IntPtr existingPrimaryToken, int impersonationLevel, out IntPtr impersonationToken);
    [DllImport("advapi32.dll", SetLastError=true)]
    private static extern bool CheckTokenMembership(
        IntPtr token, IntPtr sid, out bool isMember);
    [DllImport("advapi32.dll", SetLastError=true)]
    private static extern bool GetTokenInformation(
        IntPtr token, int infoClass, IntPtr buffer, int length, out int returned);
    [DllImport("advapi32.dll", SetLastError=true)]
    private static extern bool EqualSid(IntPtr a, IntPtr b);
    [DllImport("advapi32.dll", SetLastError=true)]
    private static extern IntPtr GetSidSubAuthorityCount(IntPtr sid);
    [DllImport("advapi32.dll", SetLastError=true)]
    private static extern IntPtr GetSidSubAuthority(IntPtr sid, uint index);

    private static IntPtr ReadBuffer(IntPtr token, int kind) {
        int required = 0;
        GetTokenInformation(token, kind, IntPtr.Zero, 0, out required);
        if (required < 4 || required > 8192)
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Token information size invalid");
        IntPtr buffer = Marshal.AllocHGlobal(required);
        int used;
        if (!GetTokenInformation(token, kind, buffer, required, out used) ||
            used < 4 || used > required) {
            int err = Marshal.GetLastWin32Error();
            Marshal.FreeHGlobal(buffer);
            throw new Win32Exception(err, "Token information read failed");
        }
        return buffer;
    }

    private static int ReadInt(IntPtr token, int kind) {
        IntPtr memory = ReadBuffer(token, kind);
        try { return Marshal.ReadInt32(memory); }
        finally { Marshal.FreeHGlobal(memory); }
    }

    private static int ReadIntegrityRid(IntPtr token) {
        IntPtr memory = ReadBuffer(token, 25);
        try {
            IntPtr sid = Marshal.ReadIntPtr(memory);
            if (sid == IntPtr.Zero)
                throw new InvalidOperationException("Integrity SID null");
            IntPtr countPtr = GetSidSubAuthorityCount(sid);
            if (countPtr == IntPtr.Zero)
                throw new InvalidOperationException("Integrity SID count invalid");
            byte count = Marshal.ReadByte(countPtr);
            if (count == 0)
                throw new InvalidOperationException("Integrity SID empty");
            IntPtr rid = GetSidSubAuthority(sid, (uint)(count - 1));
            if (rid == IntPtr.Zero)
                throw new InvalidOperationException("Integrity SID RID missing");
            return Marshal.ReadInt32(rid);
        } finally { Marshal.FreeHGlobal(memory); }
    }

    private static bool SameUser(IntPtr source, IntPtr candidate) {
        IntPtr a = ReadBuffer(source, 1); // TokenUser
        try {
            IntPtr b = ReadBuffer(candidate, 1);
            try { return EqualSid(Marshal.ReadIntPtr(a), Marshal.ReadIntPtr(b)); }
            finally { Marshal.FreeHGlobal(b); }
        } finally { Marshal.FreeHGlobal(a); }
    }
    private static bool AdminGroupEnabled(IntPtr primaryToken, IntPtr sid) {
        // CheckTokenMembership requires an IMPERSONATION token, not the
        // primary process/restricted token returned by Windows. Duplicate
        // the token for this one read-only SID membership query only;
        // never impersonate the thread or launch a child process.
        IntPtr impersonation;
        if (!DuplicateToken(primaryToken, 2, out impersonation))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "DuplicateToken query");
        try {
            bool member = false;
            if (!CheckTokenMembership(impersonation, sid, out member))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Admin token membership query");
            return member;
        } finally { CloseHandle(impersonation); }
    }

    public static TikzariumRestrictedTokenCandidate Inspect() {
        IntPtr source;
        if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY | TOKEN_DUPLICATE, out source))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Cannot query process token");
        try {
            var admin = new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null);
            byte[] sidBytes = new byte[admin.BinaryLength];
            admin.GetBinaryForm(sidBytes, 0);
            IntPtr adminSid = Marshal.AllocHGlobal(sidBytes.Length);
            try {
                Marshal.Copy(sidBytes, 0, adminSid, sidBytes.Length);
                var result = new TikzariumRestrictedTokenCandidate();
                result.ParentElevated = ReadInt(source, 20) != 0;
                result.ParentIntegrityRid = ReadIntegrityRid(source);
                result.ParentAdminGroupEnabled = AdminGroupEnabled(source, adminSid);
                result.ParentSession = ReadInt(source, 12); // TokenSessionId
                var disabled = new SidAndAttributes { Sid = adminSid, Attributes = 0 };
                IntPtr restricted;
                if (!CreateRestrictedToken(source, DISABLE_MAX_PRIVILEGE, 1, ref disabled,
                        0, IntPtr.Zero, 0, IntPtr.Zero, out restricted)) {
                    result.CreateError = Marshal.GetLastWin32Error();
                } else {
                    try {
                        result.Available = true;
                        result.CandidateElevated = ReadInt(restricted, 20) != 0;
                        result.CandidateElevationType = ReadInt(restricted, 18);
                        result.CandidateIntegrityRid = ReadIntegrityRid(restricted);
                        result.CandidateAdminGroupEnabled = AdminGroupEnabled(restricted, adminSid);
                        result.CandidateSameUser = SameUser(source, restricted);
                        result.CandidateSameSession = ReadInt(restricted, 12) == result.ParentSession;
                    } finally { CloseHandle(restricted); }
                }
                // Independent volatile LUA variant. API success is never child approval.
                IntPtr lua;
                if (!CreateRestrictedToken(source, DISABLE_MAX_PRIVILEGE | LUA_TOKEN, 1,
                        ref disabled, 0, IntPtr.Zero, 0, IntPtr.Zero, out lua)) {
                    result.LuaCreateError = Marshal.GetLastWin32Error();
                } else {
                    try {
                        result.LuaTokenCreated = true;
                        result.LuaElevated = ReadInt(lua, 20) != 0;
                        result.LuaElevationType = ReadInt(lua, 18);
                        result.LuaIntegrityRid = ReadIntegrityRid(lua);
                        result.LuaAdminGroupEnabled = AdminGroupEnabled(lua, adminSid);
                        result.LuaSameUser = SameUser(source, lua);
                        result.LuaSameSession = ReadInt(lua, 12) == result.ParentSession;
                    } finally { CloseHandle(lua); }
                }
                return result;
            } finally { Marshal.FreeHGlobal(adminSid); }
        } finally { CloseHandle(source); }
    }
}
'@
  Add-Type -TypeDefinition $definition -ErrorAction Stop | Out-Null
  $t = [TikzariumRestrictedTokenDryRun]::Inspect()
  $report.parent_elevated = $t.ParentElevated
  $report.parent_integrity_rid = $t.ParentIntegrityRid
  $report.parent_admin_sid_enabled = $t.ParentAdminGroupEnabled
  $report.parent_session = $t.ParentSession
  $report.restricted_token_created = $t.Available
  $report.restricted_token_create_error = $t.CreateError
  $report.candidate_elevated = $t.CandidateElevated
  $report.candidate_elevation_type = $t.CandidateElevationType
  $report.candidate_integrity_rid = $t.CandidateIntegrityRid
  $report.candidate_admin_sid_enabled = $t.CandidateAdminGroupEnabled
  $report.candidate_same_user = $t.CandidateSameUser
  $report.candidate_same_session = $t.CandidateSameSession
  $report.lua_token_created = $t.LuaTokenCreated
  $report.lua_token_create_error = $t.LuaCreateError
  $report.lua_token_elevated = $t.LuaElevated
  $report.lua_token_elevation_type = $t.LuaElevationType
  $report.lua_token_integrity_rid = $t.LuaIntegrityRid
  $report.lua_token_admin_sid_enabled = $t.LuaAdminGroupEnabled
  $report.lua_token_same_user = $t.LuaSameUser
  $report.lua_token_same_session = $t.LuaSameSession
  $report.lua_token_is_non_elevated = $t.LuaTokenCreated -and -not $t.LuaElevated -and
      -not $t.LuaAdminGroupEnabled -and $t.LuaSameUser -and $t.LuaSameSession -and
      $t.LuaIntegrityRid -ge 0x1000 -and $t.LuaIntegrityRid -lt 0x3000
  $report.lua_status = if ($t.LuaTokenCreated) {
    'LUA_TOKEN_INSPECTED_NO_CHILD_NO_TEX'
  } else { 'LUA_TOKEN_UNAVAILABLE_NO_CHILD_NO_TEX' }
  $report.candidate_is_non_elevated = $t.Available -and -not $t.CandidateElevated -and
      -not $t.CandidateAdminGroupEnabled -and $t.CandidateSameUser -and $t.CandidateSameSession -and
      $t.CandidateIntegrityRid -ge 0x1000 -and
      $t.CandidateIntegrityRid -lt 0x3000
  $report.status = if ($t.Available -or $t.LuaTokenCreated) {
    'CANDIDATE_TOKEN_INSPECTED_NO_CHILD_NO_TEX'
  } else {
    'RESTRICTED_TOKEN_NOT_AVAILABLE_NO_CHILD_NO_TEX'
  }
  $exitCode = 0
} catch {
  $report.status = 'TOKEN_PROBE_FAILED_NO_CHILD_NO_TEX'
  $report.error = $_.Exception.Message
  Write-Error $report.error -ErrorAction Continue
} finally {
  $directory = Split-Path -Parent $OutputPath
  if ($directory) { New-Item -ItemType Directory -Force -Path $directory | Out-Null }
  $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $OutputPath -Encoding utf8
  Write-Host "Restricted token candidate read-only report: $OutputPath"
}
exit $exitCode
