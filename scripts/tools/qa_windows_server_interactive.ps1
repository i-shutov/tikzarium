# W2 personal Windows Server: first original interactive GUI evidence, not full W2 PASS.
# Only exact trusted-main GUI; no TeX, installs, privilege or account changes.
[CmdletBinding()]
param([string]$OutputDir,[switch]$SelfTest,[string]$StagedGuiExe)
$ErrorActionPreference='Stop'

function Get-W2PreflightStatus([int]$SessionId,[string]$WindowStation,[string]$Desktop,[bool]$TokenKnown,[bool]$SessionActive,[string]$InputDesktop) {
 if(-not $TokenKnown){return 'BLOCKED_UNKNOWN_TOKEN'}
 if($SessionId -le 0){return 'BLOCKED_SESSION0'}
 if($WindowStation -cne 'WinSta0'){return 'BLOCKED_NONINTERACTIVE_WINDOW_STATION'}
 if($Desktop -cne 'Default'){return 'BLOCKED_NONINPUT_DESKTOP'}
 if(-not $SessionActive){return 'BLOCKED_DISCONNECTED_OR_UNKNOWN_SESSION_STATE'}
 if($InputDesktop -cne 'Default'){return 'BLOCKED_LOCKED_OR_UNKNOWN_INPUT_DESKTOP'}
 return 'ELIGIBLE_FOR_WINDOW_PROBE_NOT_W2_PASS'
}
if($SelfTest){
 $cases=@(
  @{s=2;w='WinSta0';d='Default';k=$true;a=$true;i='Default';x='ELIGIBLE_FOR_WINDOW_PROBE_NOT_W2_PASS'},
  @{s=0;w='WinSta0';d='Default';k=$true;a=$true;i='Default';x='BLOCKED_SESSION0'},
  @{s=2;w='NonInteractiveServiceStation';d='Default';k=$true;a=$true;i='Default';x='BLOCKED_NONINTERACTIVE_WINDOW_STATION'},
  @{s=2;w='WinSta0';d='Winlogon';k=$true;a=$true;i='Default';x='BLOCKED_NONINPUT_DESKTOP'},
  @{s=2;w='WinSta0';d='Default';k=$false;a=$true;i='Default';x='BLOCKED_UNKNOWN_TOKEN'},
  @{s=2;w='WinSta0';d='Default';k=$true;a=$false;i='Default';x='BLOCKED_DISCONNECTED_OR_UNKNOWN_SESSION_STATE'},
  @{s=2;w='WinSta0';d='Default';k=$true;a=$true;i='Winlogon';x='BLOCKED_LOCKED_OR_UNKNOWN_INPUT_DESKTOP'}
 )
 foreach($t in $cases){
  $got=Get-W2PreflightStatus $t.s $t.w $t.d $t.k $t.a $t.i
  if($got -cne $t.x){throw "W2 preflight expected $($t.x) but got $got"}
 }
 Write-Host 'W2_INTERACTIVE_PREFLIGHT_SELFTEST=PASS_7_CASES_NOT_PHYSICAL_GUI'
 return
}
if([string]::IsNullOrWhiteSpace($OutputDir)){throw '-OutputDir required'}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$OutputDir=(Resolve-Path -LiteralPath $OutputDir).Path
$report=[ordered]@{
 schema_version=1;status='NOT_RUN';source_sha=$env:GITHUB_SHA
 environment='PERSONAL_WINDOWS_SERVER';physical_windows10='NOT_RUN'
 full_w2_qualification='NOT_RUN';gesture_six='NOT_RUN';source_patch='NOT_RUN'
 save_open='NOT_RUN';native_dialogs='NOT_RUN';ime='NOT_RUN';dpi_200='NOT_RUN'
 gui_xelatex_pdf='NOT_RUN';window_screenshot='NOT_RUN';f1='NOT_RUN'
 started_at_utc=[DateTime]::UtcNow.ToString('o')
}
$exitCode=1;$appProcess=$null;$originalForeground=[IntPtr]::Zero
try {
 if($env:GITHUB_SHA -cnotmatch '^[0-9a-f]{40}$'){throw 'Expected trusted-main GITHUB_SHA'}
 $root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
 Push-Location $root
 try {
  $actual=(& git.exe rev-parse HEAD | Out-String).Trim()
  if($LASTEXITCODE -ne 0 -or $actual -cne $env:GITHUB_SHA){throw 'W2 exact trusted-main SHA mismatch'}
 }finally{Pop-Location}
 $rust=Get-Content -LiteralPath (Join-Path $OutputDir 'windows-server-rust.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 $appExe=Join-Path $OutputDir 'native-release\tikzarium-app.exe'
 if($rust.source_sha -cne $actual -or $rust.release_build -cne 'PASS_WINDOWS_SERVER_NOT_WIN10' -or
   $rust.gui_pe -cne 'PASS_WINDOWS_GUI_SUBSYSTEM_2' -or
   -not (Test-Path -LiteralPath $appExe -PathType Leaf)){
  throw 'W2 requires original qualified exact-main server native GUI PE2'
 }
 $appSha=(Get-FileHash -LiteralPath $appExe -Algorithm SHA256).Hash.ToLowerInvariant()
 if($appSha -cne $rust.app_sha256){throw 'W2 GUI SHA differs from tested native release'}
 $report.app_sha256=$appSha
 # Optional, hash-verified software-OpenGL overlay is scoped to this GitHub
 # RUNNER_TEMP only. It must never replace the tested EXE or ship as a product.
 if(-not [string]::IsNullOrWhiteSpace($StagedGuiExe)){
  if(-not $env:RUNNER_TEMP -or -not $env:GITHUB_RUN_ID){
   throw 'W2 staged executable requires current GitHub runner temp/run ID'
  }
  $expected=Join-Path (Join-Path $env:RUNNER_TEMP ('tikzarium-w2-gl-' + $env:GITHUB_RUN_ID)) 'bin\tikzarium-app.exe'
  if([IO.Path]::GetFullPath($StagedGuiExe) -cne [IO.Path]::GetFullPath($expected)){
   throw 'W2 staged EXE path must stay inside current private runner overlay'
  }
  $provenancePath=Join-Path $OutputDir 'w2-mesa-software-gl-provenance.json'
  if(-not (Test-Path -LiteralPath $provenancePath -PathType Leaf) -or
     -not (Test-Path -LiteralPath $StagedGuiExe -PathType Leaf)){
   throw 'W2 pinned Mesa provenance or private staged GUI missing'
  }
  $mesa=Get-Content -LiteralPath $provenancePath -Raw -Encoding UTF8 | ConvertFrom-Json
  if($mesa.status -cne 'PASS_TEMPORARY_PINNED_TEST_ONLY' -or
     $mesa.source_sha -cne $actual -or $mesa.app_sha256 -cne $appSha -or
     $mesa.archive_sha256 -cne 'da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388' -or
     $mesa.dll_count -lt 2 -or
     -not $mesa.no_system_install -or -not $mesa.no_product_distribution){
   throw 'W2 temporary software-OpenGL original evidence is not qualified'
  }
  if((Get-FileHash -LiteralPath $StagedGuiExe -Algorithm SHA256).Hash.ToLowerInvariant() -cne $appSha){
   throw 'W2 test Mesa GUI EXE differs from tested native release'
  }
  $appExe=$StagedGuiExe
  $report.gl_renderer='PINNED_MESA_LLVMPIPE_TEMP_ONLY_NOT_PRODUCT'
  $report.gl_archive_sha256=$mesa.archive_sha256
 } else { $report.gl_renderer='SYSTEM_GL_UNMODIFIED' }
 $token=& (Join-Path $PSScriptRoot 'qa_windows_token.ps1')
 $report.token=$token;$report.session_id=$token.session_id
 $os=Get-CimInstance Win32_OperatingSystem
 $report.os=$os.Caption;$report.build=$os.BuildNumber
 if(-not ('TikzariumW2Win32' -as [type])){
 Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public struct TikzariumW2Rect { public int Left,Top,Right,Bottom; }
public static class TikzariumW2Win32 {
 [DllImport("user32.dll")] public static extern IntPtr GetProcessWindowStation();
 [DllImport("user32.dll")] public static extern IntPtr GetThreadDesktop(uint threadId);
 [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
 [DllImport("user32.dll", EntryPoint="GetUserObjectInformationW",CharSet=CharSet.Unicode,SetLastError=true)]
 public static extern bool GetUserObjectInformation(IntPtr h,int nIndex,StringBuilder name,int size,out int needed);
 [DllImport("user32.dll")] public static extern IntPtr OpenInputDesktop(uint flags,bool inherit,uint desiredAccess);
 [DllImport("user32.dll")] public static extern bool CloseDesktop(IntPtr h);
 [DllImport("wtsapi32.dll",EntryPoint="WTSQuerySessionInformationW",CharSet=CharSet.Unicode,SetLastError=true)]
 public static extern bool WTSQuerySessionInformation(IntPtr server,int sessionId,int infoClass,out IntPtr ptr,out int bytes);
 [DllImport("wtsapi32.dll")] public static extern void WTSFreeMemory(IntPtr ptr);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll",SetLastError=true)] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll",SetLastError=true)] public static extern bool GetWindowRect(IntPtr h,out TikzariumW2Rect rect);
 [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr h);
 public static string ObjectName(IntPtr h) {
  if(h == IntPtr.Zero) return "UNAVAILABLE";
  var buf = new StringBuilder(256); int needed;
  return GetUserObjectInformation(h,2,buf,buf.Capacity*2,out needed) ? buf.ToString() : "UNAVAILABLE";
 }
}
'@
 }
 $station=[TikzariumW2Win32]::ObjectName([TikzariumW2Win32]::GetProcessWindowStation())
 $desktop=[TikzariumW2Win32]::ObjectName([TikzariumW2Win32]::GetThreadDesktop([TikzariumW2Win32]::GetCurrentThreadId()))
 $report.window_station=$station;$report.desktop=$desktop
 $inputHandle=[TikzariumW2Win32]::OpenInputDesktop(0,$false,1)
 try{$inputName=[TikzariumW2Win32]::ObjectName($inputHandle)}
 finally{if($inputHandle -ne [IntPtr]::Zero){[void][TikzariumW2Win32]::CloseDesktop($inputHandle)}}
 $report.input_desktop=$inputName
 [IntPtr]$wtsBuffer=[IntPtr]::Zero
 [int]$wtsBytes=0
 $sessionState=-1
 try{
  if([TikzariumW2Win32]::WTSQuerySessionInformation([IntPtr]::Zero,[int]$token.session_id,8,[ref]$wtsBuffer,[ref]$wtsBytes) -and $wtsBytes -ge 4){
   $sessionState=[Runtime.InteropServices.Marshal]::ReadInt32($wtsBuffer)
  }
 }finally{
  if($wtsBuffer -ne [IntPtr]::Zero){[TikzariumW2Win32]::WTSFreeMemory($wtsBuffer)}
 }
 $report.wts_connection_state=$sessionState
 $known=($token.session_id -gt 0 -and $token.token_integrity_rid -ge 8192 -and $token.token_integrity_rid -lt 16384)
 $pre=Get-W2PreflightStatus ([int]$token.session_id) $station $desktop $known ($sessionState -eq 0) $inputName
 $report.preflight=$pre
 if($pre -cne 'ELIGIBLE_FOR_WINDOW_PROBE_NOT_W2_PASS'){
  $report.status=$pre;throw "Runner cannot open actual native GUI: $pre"
 }
 Add-Type -AssemblyName System.Windows.Forms
 Add-Type -AssemblyName System.Drawing
 $originalForeground=[TikzariumW2Win32]::GetForegroundWindow()
 $work=Join-Path $OutputDir 'w2-interactive'
 New-Item -ItemType Directory -Force -Path $work | Out-Null
 $appProcess=Start-Process -FilePath (Resolve-Path -LiteralPath $appExe).Path -WorkingDirectory $work -RedirectStandardOutput (Join-Path $work 'gui-stdout.txt') -RedirectStandardError (Join-Path $work 'gui-stderr.txt') -PassThru
 $report.pid=$appProcess.Id;$report.launch='PROCESS_CREATED_NOT_GUI_PROOF'
 $handle=[IntPtr]::Zero
 for($i=1;$i -le 80;$i++){
  Start-Sleep -Milliseconds 500
  $appProcess.Refresh()
  if($appProcess.HasExited){$report.exit_code=$appProcess.ExitCode;break}
  $candidate=$appProcess.MainWindowHandle
  if($candidate -eq [IntPtr]::Zero -or -not [TikzariumW2Win32]::IsWindowVisible($candidate)){continue}
  [uint32]$owner=0
  [void][TikzariumW2Win32]::GetWindowThreadProcessId($candidate,[ref]$owner)
  if($owner -ne $appProcess.Id){continue}
  if($appProcess.MainWindowTitle -notlike '*TikZarium*'){continue}
  $handle=$candidate;$report.window_probe=$i;break
 }
 if($handle -eq [IntPtr]::Zero){
  $report.status='BLOCKED_NO_VISIBLE_OWNED_WINDOW'
  $report.window_probe_result=if($appProcess.HasExited){'EXITED_BEFORE_OWNED_HWND'}else{'NO_VISIBLE_HWND_AFTER_POLL'}
  throw 'No genuine visible TikZarium window or process exited before HWND'
 }
 $rect=New-Object TikzariumW2Rect
 if(-not [TikzariumW2Win32]::GetWindowRect($handle,[ref]$rect)){throw 'GetWindowRect failed'}
 $width=$rect.Right-$rect.Left;$height=$rect.Bottom-$rect.Top
 $report.window=@{title=$appProcess.MainWindowTitle;left=$rect.Left;top=$rect.Top;width=$width;height=$height;visible=$true;owner_pid=$appProcess.Id;dpi=[TikzariumW2Win32]::GetDpiForWindow($handle)}
 if($width -lt 800 -or $height -lt 450){$report.status='BLOCKED_WINDOW_GEOMETRY';throw 'Actual window too small'}
 $screen=[System.Windows.Forms.Screen]::FromHandle($handle).Bounds
 $report.screen=@{left=$screen.Left;top=$screen.Top;width=$screen.Width;height=$screen.Height}
 if($rect.Left -lt $screen.Left -or $rect.Top -lt $screen.Top -or $rect.Right -gt $screen.Right -or $rect.Bottom -gt $screen.Bottom){
  $report.status='BLOCKED_WINDOW_OFF_SCREEN';throw 'Refusing screenshot beyond owned visible window'
 }
 [void][TikzariumW2Win32]::SetForegroundWindow($handle)
 Start-Sleep -Milliseconds 500
 if([TikzariumW2Win32]::GetForegroundWindow() -ne $handle){
  $report.status='BLOCKED_FOREGROUND_NOT_OWNED';throw 'Refuse to capture unrelated user desktop'
 }
 # W2 personal desktop: never copy desktop pixels. Request only the verified
 # app's rendered CLIENT via PrintWindow into a private bitmap; fail closed.
 . (Join-Path $PSScriptRoot 'qa_windows_owned_client_capture.ps1')
 $first=Join-Path $work 'real-window-before-f1.png'
 $client=Save-TikzariumOwnedClient -Handle $handle -ExpectedPid $appProcess.Id -Path $first
 $report.client_area=@{left=$client.left;top=$client.top;width=$client.width;height=$client.height}
 $report.capture_method=$client.method
 $report.client_sample_colors=$client.unique_sample_colors
 $report.client_unpainted_samples=$client.unpainted_samples
 $report.window_screenshot='CAPTURED_CLIENT_PRINTWINDOW_NO_SCREEN_READ_NOT_MANUALLY_REVIEWED'
 $report.first_png_sha256=(Get-FileHash -LiteralPath $first -Algorithm SHA256).Hash.ToLowerInvariant()
 [System.Windows.Forms.SendKeys]::SendWait('{F1}')
 Start-Sleep -Milliseconds 800
 if([TikzariumW2Win32]::GetForegroundWindow() -eq $handle){
  $second=Join-Path $work 'real-window-after-f1.png'
  $after=Save-TikzariumOwnedClient -Handle $handle -ExpectedPid $appProcess.Id -Path $second
  if($after.width -ne $client.width -or $after.height -ne $client.height){throw 'Actual native client geometry changed during F1 capture'}
  $report.second_png_sha256=(Get-FileHash -LiteralPath $second -Algorithm SHA256).Hash.ToLowerInvariant()
  $report.f1='KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW'
 }else{$report.f1='BLOCKED_FOCUS_LOST_AFTER_KEY'}
 $report.status='PARTIAL_W2_REAL_VISIBLE_WINDOW_EVIDENCE_NOT_FULL_ACCEPTANCE'
 $exitCode=0
}catch{
 if($report.status -eq 'NOT_RUN'){$report.status='BLOCKED_EXCEPTION'}
 $report.error=$_.Exception.Message
 Write-Warning "W2 not qualified: $($report.error)"
}finally{
 if($appProcess){
  try{
   $appProcess.Refresh()
   if(-not $appProcess.HasExited){$appProcess.Kill();[void]$appProcess.WaitForExit(5000)}
   $report.child_terminated=$appProcess.HasExited
  }catch{$report.child_terminated=$false;$report.cleanup_error=$_.Exception.Message}
  $appProcess.Dispose()
 }
 if($originalForeground -ne [IntPtr]::Zero -and ('TikzariumW2Win32' -as [type])){
  try{[void][TikzariumW2Win32]::SetForegroundWindow($originalForeground)}catch{}
 }
 $report.finished_at_utc=[DateTime]::UtcNow.ToString('o')
 $report | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath (Join-Path $OutputDir 'windows-server-w2-interactive.json') -Encoding UTF8
}
if($exitCode -ne 0){exit 1}
