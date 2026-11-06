# Read-only Windows token evidence: NO privilege/account/UAC/TeX changes.
$ErrorActionPreference = 'Stop'
$source = @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public sealed class TikzTokenSnapshot {
    public bool IsElevated { get; set; }
    public int IntegrityRid { get; set; }
    public int ElevationType { get; set; }
    public string LinkedToken { get; set; }
}
public static class TikzTokenInspector {
    [DllImport("kernel32.dll")] private static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll", SetLastError=true)] private static extern bool CloseHandle(IntPtr handle);
    [DllImport("advapi32.dll", SetLastError=true)]
    private static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
    [DllImport("advapi32.dll", SetLastError=true)]
    private static extern bool GetTokenInformation(IntPtr token, int kind, IntPtr buffer, int length, out int returned);
    [DllImport("advapi32.dll", SetLastError=true)]
    private static extern IntPtr GetSidSubAuthorityCount(IntPtr sid);
    [DllImport("advapi32.dll", SetLastError=true)]
    private static extern IntPtr GetSidSubAuthority(IntPtr sid, uint index);

    private static IntPtr Query(IntPtr token, int kind) {
        int required = 0;
        GetTokenInformation(token, kind, IntPtr.Zero, 0, out required);
        if (required < 4 || required > 8192)
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Cannot size token information");
        IntPtr memory = Marshal.AllocHGlobal(required);
        try {
            int returned;
            if (!GetTokenInformation(token, kind, memory, required, out returned))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Cannot query token information");
            return memory;
        } catch {
            Marshal.FreeHGlobal(memory);
            throw;
        }
    }
    private static int QueryInt(IntPtr token, int kind) {
        IntPtr memory = Query(token, kind);
        try { return Marshal.ReadInt32(memory); }
        finally { Marshal.FreeHGlobal(memory); }
    }
    public static TikzTokenSnapshot Capture() {
        IntPtr token;
        if (!OpenProcessToken(GetCurrentProcess(), 0x0008u, out token))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "OpenProcessToken");
        try {
            var result = new TikzTokenSnapshot();
            result.IsElevated = QueryInt(token, 20) != 0; // TokenElevation
            result.ElevationType = QueryInt(token, 18); // TokenElevationType
            IntPtr label = Query(token, 25); // TokenIntegrityLevel
            try {
                IntPtr sid = Marshal.ReadIntPtr(label);
                if (sid == IntPtr.Zero) throw new InvalidOperationException("Null integrity SID");
                IntPtr countPtr = GetSidSubAuthorityCount(sid);
                if (countPtr == IntPtr.Zero) throw new InvalidOperationException("No integrity SID count");
                byte count = Marshal.ReadByte(countPtr);
                if (count == 0) throw new InvalidOperationException("No integrity RID");
                IntPtr rid = GetSidSubAuthority(sid, (uint)(count - 1));
                if (rid == IntPtr.Zero) throw new InvalidOperationException("No integrity RID pointer");
                result.IntegrityRid = Marshal.ReadInt32(rid);
            } finally { Marshal.FreeHGlobal(label); }
            result.LinkedToken = "NOT_APPLICABLE";
            // TokenLinkedToken availability is diagnostic only; NO child is launched.
            if (result.ElevationType == 2) { // TokenElevationTypeFull
                try {
                    IntPtr linked = Query(token, 19); // TokenLinkedToken
                    try {
                        IntPtr handle = Marshal.ReadIntPtr(linked);
                        result.LinkedToken = handle == IntPtr.Zero ? "ABSENT" : "PRESENT_UNVALIDATED";
                        if (handle != IntPtr.Zero) CloseHandle(handle);
                    } finally { Marshal.FreeHGlobal(linked); }
                } catch (Win32Exception) { result.LinkedToken = "UNKNOWN_QUERY_FAILED"; }
            } else if (result.ElevationType == 1) {
                result.LinkedToken = "NO_UAC_LINKED_TOKEN";
            }
            return result;
        } finally { CloseHandle(token); }
    }
}
'@
Add-Type -TypeDefinition $source -ErrorAction Stop
$t = [TikzTokenInspector]::Capture()
$id = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object System.Security.Principal.WindowsPrincipal($id)
$adminSid = New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')
$adminSidPresent = @($id.Groups | Where-Object { $_.Value -eq $adminSid.Value }).Count -gt 0
$integrity = switch ($true) {
    { $t.IntegrityRid -ge 16384 } { 'SYSTEM_OR_HIGHER'; break }
    { $t.IntegrityRid -ge 12288 } { 'HIGH'; break }
    { $t.IntegrityRid -ge 8192 } { 'MEDIUM'; break }
    { $t.IntegrityRid -ge 4096 } { 'LOW'; break }
    default { 'UNKNOWN_OR_UNTRUSTED' }
}
[pscustomobject]@{
    account_name = $id.Name
    administrator_sid_in_token = $adminSidPresent
    administrator_role_enabled = $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
    token_is_elevated = [bool]$t.IsElevated
    token_elevation_type = switch ($t.ElevationType) { 1 {'DEFAULT'} 2 {'FULL'} 3 {'LIMITED'} default {'UNKNOWN'} }
    token_integrity_rid = [int]$t.IntegrityRid
    token_integrity = $integrity
    uac_linked_token = $t.LinkedToken
    session_id = (Get-Process -Id $PID).SessionId
    linked_child_launcher = 'NOT_IMPLEMENTED_NOT_APPROVED'
}
