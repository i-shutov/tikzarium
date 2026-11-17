# Disposable hosted Windows only. Deliberately slow FAKE TeX probes, never a real PDF claim.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir,[Parameter(Mandatory)][string]$ExpectedSha)
$ErrorActionPreference='Stop'

function Find-HostedCaptureOverlap($Captures,$Probes) {
 $proof=$null
 foreach($capture in $Captures){
  $captureStarted=[DateTimeOffset]::Parse($capture.started_at_utc).ToUniversalTime()
  $captureFinished=[DateTimeOffset]::Parse($capture.finished_at_utc).ToUniversalTime()
  if($captureFinished -lt $captureStarted){throw 'Invalid reversed capture interval'}
  foreach($probe in $Probes){
   $started=[DateTimeOffset]::Parse($probe.started_at_utc).ToUniversalTime()
   $finished=[DateTimeOffset]::Parse($probe.finished_at_utc).ToUniversalTime()
   if($finished -le $started){throw 'Invalid or empty slow probe interval'}
   if($null -eq $proof -and $started -le $captureStarted -and $captureFinished -lt $finished){
    $proof=[pscustomobject]@{
     phase=$capture.phase;capture_started_at_utc=$captureStarted.ToString('o');capture_finished_at_utc=$captureFinished.ToString('o');process_id=$probe.process_id
     kind=$probe.kind;probe_started_at_utc=$started.ToString('o');probe_finished_at_utc=$finished.ToString('o')
    }
   }
  }
 }
 # A valid first pair must not hide a later malformed capture or probe.
 return $proof
}

$selfTestCaptures=@(
 [pscustomobject]@{phase='before_f1';started_at_utc='2026-01-01T00:00:10Z';finished_at_utc='2026-01-01T00:00:11Z'},
 [pscustomobject]@{phase='after_f1';started_at_utc='2026-01-01T00:00:20Z';finished_at_utc='2026-01-01T00:00:21Z'}
)
$selfTestBefore=@([pscustomobject]@{process_id=1;kind='version';started_at_utc='2026-01-01T00:00:09Z';finished_at_utc='2026-01-01T00:00:12Z'})
$selfTestAfter=@([pscustomobject]@{process_id=2;kind='lookup';started_at_utc='2026-01-01T00:00:19Z';finished_at_utc='2026-01-01T00:00:22Z'})
$selfTestNeither=@([pscustomobject]@{process_id=3;kind='version';started_at_utc='2026-01-01T00:00:12Z';finished_at_utc='2026-01-01T00:00:18Z'})
$selfTestEqualStart=@([pscustomobject]@{process_id=4;kind='version';started_at_utc='2026-01-01T00:00:10Z';finished_at_utc='2026-01-01T00:00:12Z'})
$selfTestEqualEnd=@([pscustomobject]@{process_id=5;kind='version';started_at_utc='2026-01-01T00:00:09Z';finished_at_utc='2026-01-01T00:00:11Z'})
$selfTestPartial=@([pscustomobject]@{process_id=6;kind='version';started_at_utc='2026-01-01T00:00:09Z';finished_at_utc='2026-01-01T00:00:10.500Z'})
if((Find-HostedCaptureOverlap $selfTestCaptures $selfTestBefore).phase -cne 'before_f1' -or
   (Find-HostedCaptureOverlap $selfTestCaptures $selfTestAfter).phase -cne 'after_f1' -or
   $null -ne (Find-HostedCaptureOverlap $selfTestCaptures $selfTestNeither) -or
   (Find-HostedCaptureOverlap $selfTestCaptures $selfTestEqualStart).phase -cne 'before_f1' -or
   $null -ne (Find-HostedCaptureOverlap $selfTestCaptures $selfTestEqualEnd) -or
   $null -ne (Find-HostedCaptureOverlap $selfTestCaptures $selfTestPartial)){
 throw 'Capture/probe overlap selection self-test failed'
}
$invalidCaptureRejected=$false
try {
 Find-HostedCaptureOverlap @([pscustomobject]@{phase='invalid';started_at_utc='2026-01-01T00:00:11Z';finished_at_utc='2026-01-01T00:00:10Z'}) $selfTestBefore | Out-Null
} catch {$invalidCaptureRejected=$true}
$invalidProbeRejected=$false
try {
 Find-HostedCaptureOverlap $selfTestCaptures @([pscustomobject]@{process_id=7;kind='invalid';started_at_utc='2026-01-01T00:00:12Z';finished_at_utc='2026-01-01T00:00:12Z'}) | Out-Null
} catch {$invalidProbeRejected=$true}
if(-not $invalidCaptureRejected -or -not $invalidProbeRejected){throw 'Reversed/empty interval self-test failed'}
$lateInvalidCaptureRejected=$false
try {
 $lateCaptures=@($selfTestCaptures[0],[pscustomobject]@{phase='invalid_after';started_at_utc='2026-01-01T00:00:21Z';finished_at_utc='2026-01-01T00:00:20Z'})
 Find-HostedCaptureOverlap $lateCaptures $selfTestBefore | Out-Null
} catch {$lateInvalidCaptureRejected=$true}
$lateInvalidProbeRejected=$false
try {
 $lateProbes=@($selfTestBefore[0],[pscustomobject]@{process_id=8;kind='invalid_late';started_at_utc='2026-01-01T00:00:12Z';finished_at_utc='2026-01-01T00:00:12Z'})
 Find-HostedCaptureOverlap $selfTestCaptures $lateProbes | Out-Null
} catch {$lateInvalidProbeRejected=$true}
if(-not $lateInvalidCaptureRejected -or -not $lateInvalidProbeRejected){throw 'A matching pair hid a later invalid interval'}
if($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_ENVIRONMENT -cne 'github-hosted'){
 throw 'Slow helper fixtures are forbidden on a persistent owner machine'
}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$OutputDir=(Resolve-Path $OutputDir).Path
$fixture=Join-Path $OutputDir 'slow-readonly-tools'
New-Item -ItemType Directory -Force -Path $fixture | Out-Null
$engine=Join-Path $fixture 'xelatex.exe'
$lookup=Join-Path $fixture 'findtexmf.exe'
$log=Join-Path $OutputDir 'slow-probe-log.txt'
$code=@'
using System;
using System.IO;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class TikzariumSlowReadOnlyFixture {
 [DllImport("kernel32.dll")] private static extern IntPtr GetConsoleWindow();
 public static int Main(string[] args) {
  if(args.Length != 1) return 23;
  string log = Environment.GetEnvironmentVariable("TIKZARIUM_QA_PROBE_LOG");
  if(String.IsNullOrEmpty(log)) return 24;
  int pid = Process.GetCurrentProcess().Id;
  string kind = args[0] == "--version" ? "version" : "lookup";
  File.AppendAllText(log,"BEGIN|"+pid+"|"+DateTime.UtcNow.ToString("o")+"|"+GetConsoleWindow().ToInt64()+"|"+kind+Environment.NewLine);
  Thread.Sleep(kind == "version" ? 700 : 2000);
  File.AppendAllText(log,"END|"+pid+"|"+DateTime.UtcNow.ToString("o")+Environment.NewLine);
  if(kind == "version") { Console.WriteLine("MiKTeX-XeTeX QA-SLOW-STUB -- NOT A TEX COMPILER"); return 0; }
  return 1;
 }
}
'@
[IO.File]::WriteAllText((Join-Path $OutputDir 'slow-fixture.cs'),$code)
Add-Type -TypeDefinition $code -OutputAssembly $engine -OutputType ConsoleApplication
Copy-Item -LiteralPath $engine -Destination $lookup
$saved=$env:TIKZARIUM_XELATEX;$savedLog=$env:TIKZARIUM_QA_PROBE_LOG
try{
 $env:TIKZARIUM_XELATEX=$engine;$env:TIKZARIUM_QA_PROBE_LOG=$log
 & (Join-Path $PSScriptRoot 'qa_windows_hosted_native_gui.ps1') -OutputDir $OutputDir -ExpectedSha $ExpectedSha
 $report=Get-Content (Join-Path $OutputDir 'hosted-windows-native-gui.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 if($report.status -cne 'HOSTED_REAL_NATIVE_WINDOW_PARTIAL_NOT_PHYSICAL' -or
    $report.f1 -cne 'KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW' -or
    $report.first_png_sha256 -ceq $report.second_png_sha256 -or
    [string]::IsNullOrWhiteSpace($report.before_f1_capture_started_at_utc) -or
    [string]::IsNullOrWhiteSpace($report.before_f1_captured_at_utc) -or
    [string]::IsNullOrWhiteSpace($report.after_f1_capture_started_at_utc) -or
    [string]::IsNullOrWhiteSpace($report.after_f1_captured_at_utc)){
  throw 'Actual native F1/capture timestamps and distinct images are required with slow probes'
 }
 # Let the last bounded read-only fixture finish after GUI termination; never kill unrelated PIDs.
 Start-Sleep -Milliseconds 2200
 $lines=@(Get-Content -LiteralPath $log -Encoding UTF8)
 $begins=@($lines | Where-Object {$_ -like 'BEGIN|*'})
 $ends=@($lines | Where-Object {$_ -like 'END|*'})
 if($begins.Count -eq 0){throw 'Slow fixture was never invoked'}
 $captures=@(
  [pscustomobject]@{phase='before_f1';started_at_utc=$report.before_f1_capture_started_at_utc;finished_at_utc=$report.before_f1_captured_at_utc},
  [pscustomobject]@{phase='after_f1';started_at_utc=$report.after_f1_capture_started_at_utc;finished_at_utc=$report.after_f1_captured_at_utc}
 )
 $probes=[Collections.Generic.List[object]]::new()
 foreach($line in $begins){
  $parts=$line.Split('|')
  if($parts[3] -cne '0'){throw 'Read-only probe created a console window'}
  $end=@($ends | Where-Object {($_.Split('|'))[1] -eq $parts[1]})
  if($end.Count -ne 1){throw 'Bounded slow fixture did not exit cleanly'}
  $started=[DateTime]::Parse($parts[2]).ToUniversalTime()
  $finished=[DateTime]::Parse(($end[0].Split('|'))[2]).ToUniversalTime()
  $probes.Add([pscustomobject]@{process_id=$parts[1];kind=$parts[4];started_at_utc=$started.ToString('o');finished_at_utc=$finished.ToString('o')})
 }
 $proof=Find-HostedCaptureOverlap $captures $probes
 if($null -eq $proof){throw 'No completed owned slow probe overlapped either actual GUI capture; responsiveness not demonstrated'}
 [ordered]@{status='PASS_NATIVE_GUI_DURING_SLOW_READONLY_PROBE';source_sha=$ExpectedSha
  fixture='SYNTHETIC_NOT_REAL_TEX';physical_windows10='NOT_RUN';full_w2_qualification='NOT_RUN'
  before_f1_capture_started_at_utc=$report.before_f1_capture_started_at_utc
  before_f1_captured_at_utc=$report.before_f1_captured_at_utc;after_f1_captured_at_utc=$report.after_f1_captured_at_utc
  after_f1_capture_started_at_utc=$report.after_f1_capture_started_at_utc
  overlap_proof=$proof;probe_count=$begins.Count
  no_probe_console_window=$true;foreground_method=$report.foreground_ownership.method
  app_sha256=$report.app_sha256;first_png_sha256=$report.first_png_sha256;second_png_sha256=$report.second_png_sha256
 } | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutputDir 'startup-responsive-audit.json') -Encoding UTF8
 Write-Host 'W2_STARTUP_RESPONSIVE=PASS_REAL_HOSTED_GUI_WITH_SLOW_STUB_NOT_PHYSICAL'
}finally{
 $env:TIKZARIUM_XELATEX=$saved;$env:TIKZARIUM_QA_PROBE_LOG=$savedLog
}
