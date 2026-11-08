# Disposable hosted Windows only. Deliberately slow FAKE TeX probes, never a real PDF claim.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir,[Parameter(Mandatory)][string]$ExpectedSha)
$ErrorActionPreference='Stop'
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
    $report.first_png_sha256 -ceq $report.second_png_sha256){throw 'Actual native F1/capture did not pass with slow probes'}
 # Let the last bounded read-only fixture finish after GUI termination; never kill unrelated PIDs.
 Start-Sleep -Milliseconds 2200
 $lines=@(Get-Content -LiteralPath $log -Encoding UTF8)
 $begins=@($lines | Where-Object {$_ -like 'BEGIN|*'})
 $ends=@($lines | Where-Object {$_ -like 'END|*'})
 if($begins.Count -eq 0){throw 'Slow fixture was never invoked'}
 $captured=[DateTime]::Parse($report.before_f1_captured_at_utc).ToUniversalTime()
 $overlap=$false
 foreach($line in $begins){
  $parts=$line.Split('|')
  if($parts[3] -cne '0'){throw 'Read-only probe created a console window'}
  $end=@($ends | Where-Object {($_.Split('|'))[1] -eq $parts[1]})
  if($end.Count -ne 1){throw 'Bounded slow fixture did not exit cleanly'}
  $started=[DateTime]::Parse($parts[2]).ToUniversalTime()
  $finished=[DateTime]::Parse(($end[0].Split('|'))[2]).ToUniversalTime()
  if($started -le $captured -and $finished -gt $captured){$overlap=$true}
 }
 if(-not $overlap){throw 'No live slow probe overlapped actual GUI capture; responsiveness not demonstrated'}
 [ordered]@{status='PASS_NATIVE_GUI_DURING_SLOW_READONLY_PROBE';source_sha=$ExpectedSha
  fixture='SYNTHETIC_NOT_REAL_TEX';physical_windows10='NOT_RUN';full_w2_qualification='NOT_RUN'
  before_f1_captured_at_utc=$report.before_f1_captured_at_utc;probe_count=$begins.Count
  no_probe_console_window=$true;foreground_method=$report.foreground_ownership.method
  app_sha256=$report.app_sha256;first_png_sha256=$report.first_png_sha256;second_png_sha256=$report.second_png_sha256
 } | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutputDir 'startup-responsive-audit.json') -Encoding UTF8
 Write-Host 'W2_STARTUP_RESPONSIVE=PASS_REAL_HOSTED_GUI_WITH_SLOW_STUB_NOT_PHYSICAL'
}finally{
 $env:TIKZARIUM_XELATEX=$saved;$env:TIKZARIUM_QA_PROBE_LOG=$savedLog
}
