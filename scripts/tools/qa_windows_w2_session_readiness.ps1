# Read-only WTS session probe BEFORE staging QA-only OpenGL.
# No GUI, input, screenshot, RDP unlock or OS modifications.
[CmdletBinding()]
param([string]$OutputDir,[string]$ExpectedSha,[switch]$SelfTest)
$ErrorActionPreference='Stop'

function Get-W2RdpDecision([int]$SessionId,[int]$WtsState,[bool]$SessionMatches) {
 if($SessionId -le 0 -or -not $SessionMatches) {return 'BLOCKED_NONINTERACTIVE_OR_MISMATCHED_SESSION'}
 if($WtsState -eq 0) {return 'WTS_ACTIVE_CANDIDATE_NOT_GUI_PROOF'}
 if($WtsState -eq 4) {return 'BLOCKED_RDP_DISCONNECTED'}
 return 'BLOCKED_WTS_UNKNOWN_OR_NOT_ACTIVE'
}
function Initialize-W2ReadOnlyWts {
 if('TikzariumWtsReadOnly' -as [type]) {return}
 Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class TikzariumWtsReadOnly {
 [DllImport("wtsapi32.dll",EntryPoint="WTSQuerySessionInformationW",CharSet=CharSet.Unicode,SetLastError=true)]
 public static extern bool WTSQuerySessionInformation(IntPtr server,int sessionId,int infoClass,out IntPtr ptr,out int bytes);
 [DllImport("wtsapi32.dll")] public static extern void WTSFreeMemory(IntPtr ptr);
 public static int CurrentState(int sessionId) {
   if(sessionId<=0) return -1;
   IntPtr p=IntPtr.Zero;int bytes=0;
   try {
     if(!WTSQuerySessionInformation(IntPtr.Zero,sessionId,8,out p,out bytes) ||
        p==IntPtr.Zero || bytes<4) return -1;
     return Marshal.ReadInt32(p);
   } finally { if(p!=IntPtr.Zero) WTSFreeMemory(p); }
 }
}
'@
}
if($SelfTest) {
 $cases=@(
   @{session=2;wts=0;match=$true;expected='WTS_ACTIVE_CANDIDATE_NOT_GUI_PROOF'},
   @{session=2;wts=4;match=$true;expected='BLOCKED_RDP_DISCONNECTED'},
   @{session=2;wts=-1;match=$true;expected='BLOCKED_WTS_UNKNOWN_OR_NOT_ACTIVE'},
   @{session=2;wts=5;match=$true;expected='BLOCKED_WTS_UNKNOWN_OR_NOT_ACTIVE'},
   @{session=2;wts=1;match=$true;expected='BLOCKED_WTS_UNKNOWN_OR_NOT_ACTIVE'},
   @{session=0;wts=0;match=$true;expected='BLOCKED_NONINTERACTIVE_OR_MISMATCHED_SESSION'},
   @{session=2;wts=0;match=$false;expected='BLOCKED_NONINTERACTIVE_OR_MISMATCHED_SESSION'}
 )
 foreach($t in $cases) {
   $actual=Get-W2RdpDecision $t.session $t.wts $t.match
   if($actual -cne $t.expected) {throw "WTS decision mismatch: $actual"}
 }
 Initialize-W2ReadOnlyWts
 $observed=[TikzariumWtsReadOnly]::CurrentState([System.Diagnostics.Process]::GetCurrentProcess().SessionId)
 if($observed -lt -1 -or $observed -gt 9) {throw 'Implausible WTS native state'}
 Write-Host 'W2_WTS_READONLY_SELFTEST=PASS_7_DECISIONS_NATIVE_PINVOKE_NO_INPUT'
 return
}
if([string]::IsNullOrWhiteSpace($OutputDir) -or
   [string]::IsNullOrWhiteSpace($env:RUNNER_TEMP) -or
   [string]::IsNullOrWhiteSpace($env:GITHUB_OUTPUT)) {throw 'BLOCKED_W2_RDP_PROBE_UNTRUSTED_OUTPUT_PATH'}
$root=[IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd([IO.Path]::DirectorySeparatorChar)
$out=[IO.Path]::GetFullPath($OutputDir)
if(-not $out.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){
 throw 'BLOCKED_W2_RDP_PROBE_OUTSIDE_RUNNER_TEMP'
}
New-Item -ItemType Directory -Path $out -Force | Out-Null
$report=[ordered]@{
 schema_version=1;status='BLOCKED_UNKNOWN_READONLY_SESSION_PROBE'
 source_sha=$ExpectedSha;environment='PERSONAL_WINDOWS_SERVER'
 physical_windows10='NOT_RUN';w2b_full='NOT_RUN';gui_input='NOT_RUN'
 wts_connection_state=-1;session_id=-1;gui_candidate=$false
 input_desktop='NOT_INSPECTED_RUNTIME_GUARD_REQUIRED';own_hwnd='NOT_RUN'
 no_os_change=$true;started_at_utc=[DateTime]::UtcNow.ToString('o')
}
try {
 if($env:GITHUB_ACTIONS -cne 'true' -or
    $env:GITHUB_REPOSITORY -cne 'i-shutov/tikzarium' -or
    $env:RUNNER_ENVIRONMENT -cne 'self-hosted' -or
    $ExpectedSha -cnotmatch '^[0-9a-f]{40}$') {
   throw 'BLOCKED_W2_RDP_PROBE_NOT_TRUSTED_MAIN_RUN'
 }
 $actual=(& git.exe rev-parse HEAD | Out-String).Trim()
 if($LASTEXITCODE -ne 0 -or $actual -cne $ExpectedSha) {
   throw 'BLOCKED_W2_RDP_PROBE_CHECKOUT_SHA_MISMATCH'
 }
 $token=& (Join-Path $PSScriptRoot 'qa_windows_token.ps1')
 $current=[System.Diagnostics.Process]::GetCurrentProcess().SessionId
 $report.session_id=[int]$current
 $report.token_session_id=[int]$token.session_id
 Initialize-W2ReadOnlyWts
 $wts=[TikzariumWtsReadOnly]::CurrentState([int]$current)
 $report.wts_connection_state=$wts
 $report.status=Get-W2RdpDecision ([int]$current) $wts ([int]$current -eq [int]$token.session_id)
 $report.gui_candidate=($report.status -ceq 'WTS_ACTIVE_CANDIDATE_NOT_GUI_PROOF')
} catch {
 $report.status='BLOCKED_W2_RDP_READONLY_PROBE_ERROR'
 $report.error=$_.Exception.Message
 Write-Warning $report.error
} finally {
 $report.finished_at_utc=[DateTime]::UtcNow.ToString('o')
 $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $out 'w2-session-readiness.json') -Encoding UTF8
 $candidate=if($report.gui_candidate){'true'}else{'false'}
 [IO.File]::AppendAllText($env:GITHUB_OUTPUT,'gui_candidate='+$candidate+[Environment]::NewLine,(New-Object System.Text.UTF8Encoding($false)))
 Write-Host ('W2_RDP_READONLY='+$report.status+' (GUI proof NOT_RUN)')
}
