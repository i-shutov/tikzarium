# Read-only Windows access-token inventory. No UAC, account or privilege changes.
# Used by hosted Windows CI and dedicated trusted-main TikZarium runner.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
$report = [ordered]@{
 schema_version=1
 status='INCOMPLETE'
 physical_windows10='NOT_RUN'
 same_account_limited_child='NOT_RUN'
 privilege_adjustment='NONE'
}
$exitCode=1
try {
 if($env:OS -ne 'Windows_NT') { throw 'Token probe requires Windows' }
 $cs=@'
using System;
using System.Runtime.InteropServices;
using System.ComponentModel;
public sealed class TikzariumTokenSample {
 public int ElevationType {get;set;}
 public bool Elevated {get;set;}
 public int IntegrityRid {get;set;}
 public bool LinkedLimitedAvailable {get;set;}
 public int LinkedElevationType {get;set;}
 public bool LinkedElevated {get;set;}
 public int LinkedIntegrityRid {get;set;}
 public int LinkedError {get;set;}
}
public static class TikzariumReadOnlyTokenProbe {
 [DllImport("kernel32.dll")] private static extern IntPtr GetCurrentProcess();
 [DllImport("advapi32.dll", SetLastError=true)]
 private static extern bool OpenProcessToken(IntPtr process, UInt32 desiredAccess, out IntPtr token);
 [DllImport("advapi32.dll", SetLastError=true)]
 private static extern bool GetTokenInformation(IntPtr token, int tokenClass, IntPtr buffer, int length, out int used);
 [DllImport("advapi32.dll", SetLastError=true)]
 private static extern IntPtr GetSidSubAuthorityCount(IntPtr sid);
 [DllImport("advapi32.dll", SetLastError=true)]
 private static extern IntPtr GetSidSubAuthority(IntPtr sid, UInt32 index);
 [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr handle);
 private static int ReadInt(IntPtr token, int tokenClass) {
  IntPtr b=Marshal.AllocHGlobal(4);
  try {
   int length;
   if(!GetTokenInformation(token, tokenClass, b, 4, out length))
    throw new Win32Exception(Marshal.GetLastWin32Error(), "GetTokenInformation failed");
   return Marshal.ReadInt32(b);
  } finally { Marshal.FreeHGlobal(b); }
 }
 private static int ReadIntegrity(IntPtr token) {
  int needed;
  GetTokenInformation(token, 25, IntPtr.Zero, 0, out needed);
  if(needed < IntPtr.Size)
   throw new Win32Exception(Marshal.GetLastWin32Error(), "TokenIntegrityLevel unavailable");
  IntPtr b=Marshal.AllocHGlobal(needed);
  try {
   if(!GetTokenInformation(token, 25, b, needed, out needed))
    throw new Win32Exception(Marshal.GetLastWin32Error(), "TokenIntegrityLevel query failed");
   IntPtr sid=Marshal.ReadIntPtr(b);
   IntPtr countPtr=GetSidSubAuthorityCount(sid);
   if(countPtr == IntPtr.Zero)
    throw new InvalidOperationException("Mandatory integrity SID has no subauthority count");
   byte count=Marshal.ReadByte(countPtr);
   if(count == 0) throw new InvalidOperationException("Mandatory integrity SID empty");
   IntPtr ridPtr=GetSidSubAuthority(sid, (UInt32)(count-1));
   if(ridPtr == IntPtr.Zero) throw new InvalidOperationException("Integrity RID pointer missing");
   return Marshal.ReadInt32(ridPtr);
  } finally { Marshal.FreeHGlobal(b); }
 }
 public static TikzariumTokenSample Inspect() {
  IntPtr token;
  if(!OpenProcessToken(GetCurrentProcess(), 0x0008, out token))
   throw new Win32Exception(Marshal.GetLastWin32Error(), "OpenProcessToken query failed");
  try {
   TikzariumTokenSample value=new TikzariumTokenSample();
   value.ElevationType=ReadInt(token,18);
   value.Elevated=(ReadInt(token,20)!=0);
   value.IntegrityRid=ReadIntegrity(token);
   if(value.ElevationType == 2) {
    IntPtr b=Marshal.AllocHGlobal(IntPtr.Size);
    try {
     int used;
     if(!GetTokenInformation(token,19,b,IntPtr.Size,out used)) {
      value.LinkedError=Marshal.GetLastWin32Error();
     } else {
      IntPtr linked=Marshal.ReadIntPtr(b);
      if(linked!=IntPtr.Zero) {
       try {
        value.LinkedElevationType=ReadInt(linked,18);
        value.LinkedElevated=(ReadInt(linked,20)!=0);
        value.LinkedIntegrityRid=ReadIntegrity(linked);
        value.LinkedLimitedAvailable=value.LinkedElevationType==3 && !value.LinkedElevated && value.LinkedIntegrityRid<=0x2000;
       } finally { CloseHandle(linked); }
      }
     }
    } finally { Marshal.FreeHGlobal(b); }
   }
   return value;
  } finally {CloseHandle(token);}
 }
}
'@
 Add-Type -TypeDefinition $cs -ErrorAction Stop | Out-Null
 $sample=[TikzariumReadOnlyTokenProbe]::Inspect()
 $principal=New-Object System.Security.Principal.WindowsPrincipal([System.Security.Principal.WindowsIdentity]::GetCurrent())
 $report.session_id=(Get-Process -Id $PID).SessionId
 $report.effective_token_admin_role=$principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
 $report.token_elevation_type=@('UNKNOWN','DEFAULT','FULL','LIMITED')[$sample.ElevationType]
 $report.token_elevated=$sample.Elevated
 $report.integrity_rid=$sample.IntegrityRid
 $report.integrity=if($sample.IntegrityRid -ge 0x4000){'SYSTEM'}elseif($sample.IntegrityRid -ge 0x3000){'HIGH'}elseif($sample.IntegrityRid -ge 0x2000){'MEDIUM'}else{'LOW_OR_UNTRUSTED'}
 $report.linked_limited_token_available=$sample.LinkedLimitedAvailable
 $report.linked_token_query_error=$sample.LinkedError
 $report.linked_token_elevation_type=$sample.LinkedElevationType
 $report.linked_integrity_rid=$sample.LinkedIntegrityRid
 $report.same_account_child_candidate=if($sample.LinkedLimitedAvailable){'LINKED_LIMITED_TOKEN_NEEDS_REAL_LAUNCH_QA'}else{'NO_VERIFIED_LINKED_LIMITED_TOKEN'}
 $report.status='PASS_READ_ONLY_TOKEN_INVENTORY_NOT_XELATEX_PROOF'
 $exitCode=0
}catch {
 $report.status='FAILED_TOKEN_INVENTORY'
 $report.error=$_.Exception.Message
 Write-Error $report.error -ErrorAction Continue
}finally {
 $parent=Split-Path -Parent $OutputPath
 if($parent){New-Item -ItemType Directory -Force -Path $parent | Out-Null}
 $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $OutputPath -Encoding utf8
 Write-Host ('TikZarium read-only token evidence: '+$OutputPath)
}
exit $exitCode
