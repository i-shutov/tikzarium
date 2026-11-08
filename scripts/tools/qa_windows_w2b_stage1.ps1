# Trusted-main, existing own interactive Win32 GUI ONLY. No desktop screen read.
# Physical 125% RDP stage 1: real OS mouse events -> one C-owned TikZ line -> GUI Save.
# A first line is NOT full W2b acceptance; never claim six gestures or GUI->PDF here.
[CmdletBinding()]
param([switch]$SelfTest)
$ErrorActionPreference = 'Stop'

function Test-W2bStage1Eligibility([int]$Width,[int]$Height,[int]$Dpi,[int]$SessionId,[string]$Desktop,[string]$ForegroundState) {
 if($SessionId -le 0){return 'BLOCKED_NONINTERACTIVE_SESSION'}
 if($Desktop -cne 'Default'){return 'BLOCKED_LOCKED_OR_WRONG_DESKTOP'}
 if($ForegroundState -cne 'CONFIRMED_OWNED_FOREGROUND'){return 'BLOCKED_NOT_OWNED_FOREGROUND'}
 # The values are leased to original W2a full 1475x850 125%-DPI screenshots.
 # A changed viewport needs original screenshot review and a new mapping.
 if($Dpi -ne 120 -or $Width -lt 1450 -or $Width -gt 1510 -or
    $Height -lt 825 -or $Height -gt 880){return 'BLOCKED_UNKNOWN_125_PERCENT_LAYOUT'}
 return 'ELIGIBLE_ONE_LINE_NOT_W2B_PASS'
}
function Initialize-TikzariumW2bPointer {
 if('TikzariumW2bPointer' -as [type]){return}
 Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
public struct W2bPoint { public int X, Y; }
public struct W2bRect { public int Left, Top, Right, Bottom; }
public static class TikzariumW2bPointer {
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll",SetLastError=true)] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll",SetLastError=true)] static extern bool GetClientRect(IntPtr h,out W2bRect r);
 [DllImport("user32.dll",SetLastError=true)] static extern bool ClientToScreen(IntPtr h,ref W2bPoint p);
 [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(W2bPoint p);
 [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr h,uint flags);
 [DllImport("user32.dll",SetLastError=true)] static extern bool GetCursorPos(out W2bPoint p);
 [DllImport("user32.dll",SetLastError=true)] static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] static extern void mouse_event(uint flags,uint dx,uint dy,uint data,UIntPtr extra);
 [DllImport("user32.dll",SetLastError=true)] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
 [DllImport("user32.dll")] static extern IntPtr GetThreadDpiAwarenessContext();
 [DllImport("user32.dll")] static extern bool AreDpiAwarenessContextsEqual(IntPtr a,IntPtr b);
 [DllImport("user32.dll",SetLastError=true)] static extern IntPtr OpenInputDesktop(uint flags,bool inherit,uint access);
 [DllImport("user32.dll",SetLastError=true)] static extern bool CloseDesktop(IntPtr h);
 [DllImport("user32.dll",CharSet=CharSet.Unicode,EntryPoint="GetUserObjectInformationW")]
 static extern bool GetUserObjectInformation(IntPtr h,int n,System.Text.StringBuilder b,int size,out int needed);
 // Recheck WTS for every pointer step, not only the original stage preflight.
 [DllImport("wtsapi32.dll",EntryPoint="WTSQuerySessionInformationW",CharSet=CharSet.Unicode,SetLastError=true)]
 static extern bool WTSQuerySessionInformation(IntPtr server,int session,int infoClass,out IntPtr ptr,out int bytes);
 [DllImport("wtsapi32.dll")] static extern void WTSFreeMemory(IntPtr p);
 public static bool IsWtsActive(int session,int state) {return session>0 && state==0;}
 static int CurrentWtsState(int session) {
  if(session<=0) return -1;
  IntPtr p=IntPtr.Zero;int bytes=0;
  try {
   if(!WTSQuerySessionInformation(IntPtr.Zero,session,8,out p,out bytes) || p==IntPtr.Zero || bytes<4) return -1;
   return Marshal.ReadInt32(p);
  } finally {if(p!=IntPtr.Zero) WTSFreeMemory(p);}
 }
 const uint DOWN=2, UP=4;
 static void Guard(IntPtr hwnd,int pid) {
  if(hwnd==IntPtr.Zero || pid<=0) throw new InvalidOperationException("BLOCKED_NO_OWNED_HWND");
  uint observed=0;
  if(GetWindowThreadProcessId(hwnd,out observed)==0 || observed!=(uint)pid ||
      GetForegroundWindow()!=hwnd || !IsWindowVisible(hwnd) || IsIconic(hwnd))
   throw new InvalidOperationException("BLOCKED_FOREIGN_OR_INVISIBLE_HWND");
  using(Process owner=Process.GetProcessById(pid))
  using(Process caller=Process.GetCurrentProcess()) {
   if(owner.SessionId<=0 || owner.SessionId!=caller.SessionId)
    throw new InvalidOperationException("BLOCKED_OTHER_SESSION");
   if(!IsWtsActive(owner.SessionId,CurrentWtsState(owner.SessionId)))
    throw new InvalidOperationException("BLOCKED_W2B_WTS_NOT_ACTIVE");
  }
  IntPtr desktop=OpenInputDesktop(0,false,1);
  if(desktop==IntPtr.Zero) throw new InvalidOperationException("BLOCKED_LOCKED_DESKTOP");
  try {
   var name=new System.Text.StringBuilder(128);int needed=0;
   if(!GetUserObjectInformation(desktop,2,name,name.Capacity*2,out needed) ||
      name.ToString()!="Default")
    throw new InvalidOperationException("BLOCKED_WRONG_INPUT_DESKTOP");
  } finally { CloseDesktop(desktop); }
 }
 static W2bPoint ClientPoint(IntPtr hwnd,int pid,int x,int y) {
  Guard(hwnd,pid);
  W2bRect client;
  if(!GetClientRect(hwnd,out client) ||
     x<6 || y<6 || x>=client.Right-6 || y>=client.Bottom-6)
   throw new InvalidOperationException("BLOCKED_INPUT_OUTSIDE_OWN_CLIENT");
  var p=new W2bPoint(){X=x,Y=y};
  if(!ClientToScreen(hwnd,ref p))
   throw new InvalidOperationException("BLOCKED_CLIENT_TO_SCREEN");
  IntPtr at=WindowFromPoint(p);
  if(at!=hwnd && GetAncestor(at,2)!=hwnd)
   throw new InvalidOperationException("BLOCKED_INPUT_OCCLUDED_BY_FOREIGN_WINDOW");
  return p;
 }
 static void Move(IntPtr hwnd,int pid,int x,int y) {
  W2bPoint p=ClientPoint(hwnd,pid,x,y);
  if(!SetCursorPos(p.X,p.Y)) throw new InvalidOperationException("BLOCKED_SET_CURSOR_POS");
 }
 static void WithPmv2(Action action) {
  IntPtr old=SetThreadDpiAwarenessContext(new IntPtr(-4));
  if(old==IntPtr.Zero)throw new InvalidOperationException("BLOCKED_W2B_DPI_CONTEXT");
  try {
   if(!AreDpiAwarenessContextsEqual(GetThreadDpiAwarenessContext(),new IntPtr(-4)))
    throw new InvalidOperationException("BLOCKED_W2B_NOT_PMV2");
   action();
  } finally {
   if(SetThreadDpiAwarenessContext(old)==IntPtr.Zero ||
      !AreDpiAwarenessContextsEqual(GetThreadDpiAwarenessContext(),old))
    throw new InvalidOperationException("BLOCKED_W2B_DPI_NOT_RESTORED");
  }
 }
 public static void Click(IntPtr hwnd,int pid,int x,int y) {
  WithPmv2(delegate {
   Move(hwnd,pid,x,y); Thread.Sleep(90); Guard(hwnd,pid);
   mouse_event(DOWN,0,0,0,UIntPtr.Zero);
   try { Thread.Sleep(105); Guard(hwnd,pid); }
   finally { mouse_event(UP,0,0,0,UIntPtr.Zero); }
  });
 }
 public static void Drag(IntPtr hwnd,int pid,int ax,int ay,int bx,int by) {
  WithPmv2(delegate {
   Move(hwnd,pid,ax,ay);Thread.Sleep(100);Guard(hwnd,pid);
   mouse_event(DOWN,0,0,0,UIntPtr.Zero);
   try {
    for(int k=1;k<=6;k++) {
     Move(hwnd,pid,ax+(bx-ax)*k/6,ay+(by-ay)*k/6);
     Thread.Sleep(85);
    }
    Guard(hwnd,pid);Thread.Sleep(150);
   } finally { mouse_event(UP,0,0,0,UIntPtr.Zero); }
  });
 }
}
'@
}

# Local stage1 must preserve EVERY original UTF-8 source byte, not just preamble.
# Python original-upload auditor remains a separate mandatory check.
function Get-W2bExactAdditivePatchStatus([byte[]]$Before,[byte[]]$After) {
 try {
  $utf8=[System.Text.UTF8Encoding]::new($false,$true)
  $baseline=$utf8.GetString($Before)
  $saved=$utf8.GetString($After)
 } catch {return 'BLOCKED_W2B_INVALID_UTF8_SOURCE'}
 if($baseline.Contains(' % tikzarium:n1:')){return 'BLOCKED_W2B_BASELINE_ALREADY_OWNED'}
 $matched=[regex]::Matches($saved,'(?m)^[^\r\n]* % tikzarium:n1:[^\r\n]*(?:\r?\n|$)')
 if($matched.Count -ne 1){return 'BLOCKED_W2B_NOT_ONE_OWNED_LINE'}
 if($matched[0].Value -cnotmatch '^[ \t]*\\draw(?:\s|\[|\()'){
  return 'BLOCKED_W2B_OWNER_NOT_DRAW'
 }
 if($saved.Remove($matched[0].Index,$matched[0].Length) -cne $baseline){
  return 'BLOCKED_W2B_UNRELATED_SOURCE_BYTES_CHANGED'
 }
 return 'PASS_ADDITIVE_DRAW_EXACT_SOURCE_PRESERVATION'
}

function Invoke-TikzariumW2bStage1 {
 [CmdletBinding()]
 param(
  [Parameter(Mandatory)][IntPtr]$Handle,
  [Parameter(Mandatory)][int]$ExpectedPid,
  [Parameter(Mandatory)][int]$SessionId,
  [Parameter(Mandatory)][string]$WorkDirectory,
  [Parameter(Mandatory)][string]$OutputDir,
  [Parameter(Mandatory)][string]$ExpectedSha
 )
 if($env:GITHUB_REPOSITORY -cne 'i-shutov/tikzarium' -or
    $env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_ENVIRONMENT -cne 'self-hosted' -or
    $ExpectedSha -cnotmatch '^[0-9a-f]{40}$' -or $ExpectedSha -cne $env:GITHUB_SHA){
  throw 'BLOCKED_W2B_TRUSTED_MAIN_PROVENANCE'
 }
 New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
 $report=[ordered]@{
  schema_version=1;source_sha=$ExpectedSha;environment='PERSONAL_WINDOWS_SERVER'
  status='NOT_RUN';full_w2b_qualification='NOT_RUN';six_gestures='NOT_RUN'
  source_patch='NOT_RUN';gui_save='NOT_RUN';gui_open='NOT_RUN';ime='NOT_RUN'
  gui_xelatex_pdf='NOT_RUN';physical_windows10='NOT_RUN'
  input_method='WIN32_REAL_MOUSE_EVENTS_OWNED_HWND_PMV2'
  started_at_utc=[DateTime]::UtcNow.ToString('o')
 }
 $cursorSaved=$false
 try {
  . (Join-Path $PSScriptRoot 'qa_windows_owned_client_capture.ps1')
  $g=Get-TikzariumOwnedPhysicalGeometry -Handle $Handle -ExpectedPid $ExpectedPid
  $report.geometry=$g
  $focus=if((Get-W2OwnedRuntimeStatus $Handle $ExpectedPid $SessionId) -ceq 'OWNED_ACTIVE_DEFAULT_DESKTOP' -and
            [TikzariumW2Win32]::GetForegroundWindow() -eq $Handle){'CONFIRMED_OWNED_FOREGROUND'}else{'BLOCKED_FOREIGN'}
  $elig=Test-W2bStage1Eligibility $g.width $g.height $g.window_dpi $SessionId 'Default' $focus
  $report.preflight=$elig
  if($elig -cne 'ELIGIBLE_ONE_LINE_NOT_W2B_PASS'){throw $elig}
  Initialize-TikzariumW2bPointer
  $report.source_baseline_path='w2-interactive/figure.tex'
  $source=Join-Path $WorkDirectory 'figure.tex'
  if(Test-Path -LiteralPath $source -PathType Leaf){throw 'BLOCKED_W2B_SOURCE_ALREADY_EXISTS'}
  # Original F1 from W2a remains open. Revalidate session, owned PID,
  # active Default input desktop, and foreground BEFORE OS keyboard injection.
  # The prior W2a screenshot alone never authorizes input to a later focus.
  if((Get-W2OwnedRuntimeStatus $Handle $ExpectedPid $SessionId) -cne 'OWNED_ACTIVE_DEFAULT_DESKTOP' -or
     [TikzariumW2Win32]::GetForegroundWindow() -ne $Handle){
   throw 'BLOCKED_W2B_FOCUS_LOST_BEFORE_F1'
  }
  [System.Windows.Forms.SendKeys]::SendWait('{F1}')
  Start-Sleep -Milliseconds 350
  [TikzariumW2bPointer]::Click($Handle,$ExpectedPid,220,24)
  Start-Sleep -Milliseconds 450
  # Windows Save on an unsaved document opens the actual rfd native Save As.
  # Do not assume clicking Save creates a source file without dialog approval.
  . (Join-Path $PSScriptRoot 'qa_windows_owned_save_dialog.ps1')
  $nativeSave=Invoke-TikzariumOwnedSaveDialog -MainHandle $Handle -ExpectedPid $ExpectedPid -SessionId $SessionId -ExactNewTexPath $source -OutputDir $OutputDir
  $report.native_save_dialog=$nativeSave
  if(-not (Test-Path -LiteralPath $source -PathType Leaf)){throw 'BLOCKED_W2B_GUI_BASELINE_SAVE_MISSING'}
  $before=[IO.File]::ReadAllBytes($source)
  $beforeText=[Text.Encoding]::UTF8.GetString($before)
  if(-not $beforeText.Contains('\begin{tikzpicture}') -or $beforeText.Contains('tikzarium:n1:')){
   throw 'BLOCKED_W2B_UNEXPECTED_BASELINE_SOURCE'
  }
  $report.baseline_sha256=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
  $report.baseline_source_copy='stage1-original-before.tex'
  [IO.File]::WriteAllBytes((Join-Path $OutputDir $report.baseline_source_copy),$before)
  $first=Join-Path $OutputDir '00-before-palette.png'
  $captureBefore=Save-TikzariumOwnedClient -Handle $Handle -ExpectedPid $ExpectedPid -Path $first
  # Original 125%-DPI screenshot visually confirms the Geometry tool group
  # center at client (35,181). Popup center can move when source pane resizes;
  # do not generalize these fixed numbers to another viewport/DPI.
  [TikzariumW2bPointer]::Click($Handle,$ExpectedPid,35,181)
  Start-Sleep -Milliseconds 320
  $opened=Join-Path $OutputDir '01-real-geometry-palette.png'
  $palette=Save-TikzariumOwnedClient -Handle $Handle -ExpectedPid $ExpectedPid -Path $opened
  if($palette.width -ne $captureBefore.width -or $palette.height -ne $captureBefore.height){
   throw 'BLOCKED_W2B_PALETTE_GEOMETRY_CHANGED'
  }
  # Real C line tool and genuine pointer drag. Palette target is provisional
  # based on previously inspected 100% B42 Studio popup, scaled to 125%.
  [TikzariumW2bPointer]::Click($Handle,$ExpectedPid,665,186)
  Start-Sleep -Milliseconds 260
  [TikzariumW2bPointer]::Drag($Handle,$ExpectedPid,820,425,945,456)
  Start-Sleep -Milliseconds 320
  [TikzariumW2bPointer]::Click($Handle,$ExpectedPid,220,24)
  Start-Sleep -Milliseconds 550
  if(-not (Test-Path -LiteralPath $source -PathType Leaf)){throw 'BLOCKED_W2B_SOURCE_LOST'}
  $after=[IO.File]::ReadAllBytes($source)
  $afterText=[Text.Encoding]::UTF8.GetString($after)
  $report.exact_additive_patch=Get-W2bExactAdditivePatchStatus $before $after
  if($report.exact_additive_patch -cne 'PASS_ADDITIVE_DRAW_EXACT_SOURCE_PRESERVATION'){
   throw $report.exact_additive_patch
  }
  # C-owned metadata is appended to the native command line, not a standalone % line.
  $owners=[regex]::Matches($afterText,' % tikzarium:n1:')
  $report.owner_count=$owners.Count
  if($owners.Count -ne 1 -or -not $afterText.Contains('\draw')){
   throw "BLOCKED_W2B_REAL_LINE_NOT_SAVED (owners=$($owners.Count))"
  }
  $beforePreamble=$beforeText.Split([string[]]@('\begin{tikzpicture}'),[StringSplitOptions]::None)[0]
  $afterPreamble=$afterText.Split([string[]]@('\begin{tikzpicture}'),[StringSplitOptions]::None)[0]
  if($beforePreamble -cne $afterPreamble){throw 'BLOCKED_W2B_OPAQUE_PREAMBLE_CHANGED'}
  $report.source_sha256=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
  $last=Join-Path $OutputDir '02-real-line-saved.png'
  $captureAfter=Save-TikzariumOwnedClient -Handle $Handle -ExpectedPid $ExpectedPid -Path $last
  if($captureAfter.width -ne $captureBefore.width -or $captureAfter.height -ne $captureBefore.height){
   throw 'BLOCKED_W2B_AFTER_CLIENT_GEOMETRY_CHANGED'
  }
  $report.saved_source_copy='stage1-original-gui-saved.tex'
  [IO.File]::WriteAllBytes((Join-Path $OutputDir $report.saved_source_copy),$after)
  $report.status='STAGE1_REAL_LINE_GUI_SOURCE_PASS_NOT_FULL_W2B'
  $report.gui_save='PASS_REAL_GUI_SOURCE_SAVE'
  $report.source_patch='PASS_ONE_C_OWNED_LINE_PREAMBLE_PRESERVED'
  $report.six_gestures='NOT_RUN_FIVE_MORE_TO_TEST'
 } catch {
  $report.status='BLOCKED_STAGE1'
  $report.error=$_.Exception.Message
  Write-Warning ("W2b physical stage1 not qualified: " + $report.error)
 } finally {
  $report.finished_at_utc=[DateTime]::UtcNow.ToString('o')
  $report | ConvertTo-Json -Depth 12 |
   Set-Content -LiteralPath (Join-Path $OutputDir 'w2b-stage1-original.json') -Encoding UTF8
 }
 return [PSCustomObject]$report
}
if($SelfTest) {
 $tests=@(
  @{w=1475;h=850;dpi=120;s=2;d='Default';f='CONFIRMED_OWNED_FOREGROUND';want='ELIGIBLE_ONE_LINE_NOT_W2B_PASS'},
  @{w=992;h=680;dpi=96;s=2;d='Default';f='CONFIRMED_OWNED_FOREGROUND';want='BLOCKED_UNKNOWN_125_PERCENT_LAYOUT'},
  @{w=1475;h=850;dpi=120;s=0;d='Default';f='CONFIRMED_OWNED_FOREGROUND';want='BLOCKED_NONINTERACTIVE_SESSION'},
  @{w=1475;h=850;dpi=120;s=2;d='Winlogon';f='CONFIRMED_OWNED_FOREGROUND';want='BLOCKED_LOCKED_OR_WRONG_DESKTOP'},
  @{w=1475;h=850;dpi=120;s=2;d='Default';f='BLOCKED_FOREIGN';want='BLOCKED_NOT_OWNED_FOREGROUND'},
  @{w=1270;h=850;dpi=120;s=2;d='Default';f='CONFIRMED_OWNED_FOREGROUND';want='BLOCKED_UNKNOWN_125_PERCENT_LAYOUT'}
 )
 foreach($t in $tests){
  $v=Test-W2bStage1Eligibility $t.w $t.h $t.dpi $t.s $t.d $t.f
  if($v -cne $t.want){throw "Unexpected W2b negative/positive case: $v expected $($t.want)"}
 }
 # Compile the real native P/Invoke under Windows PowerShell 5.1 on CI.
 # A zero HWND must reject BEFORE moving the pointer or injecting mouse events.
 Initialize-TikzariumW2bPointer
 $negative=$false
 try { [TikzariumW2bPointer]::Click([IntPtr]::Zero,0,20,20) }
 catch {
  # PowerShell 5.1 wraps a CLR method's InvalidOperationException in
  # MethodInvocationException. Check the innermost native reason, never
  # mistake a wrapper for an input-safety PASS.
  $reason=$_.Exception
  while($reason.InnerException){$reason=$reason.InnerException}
  $negative=($reason.Message -ceq 'BLOCKED_NO_OWNED_HWND')
 }
 if(-not $negative){throw 'W2b native zero-HWND input must fail closed without events'}
 # Synthetic Windows PowerShell tests: never physical GUI/input evidence.
 foreach($state in @(4,-1,1,5)){
  if([TikzariumW2bPointer]::IsWtsActive(2,$state)){throw "Disconnected WTS state accepted: $state"}
 }
 if(-not [TikzariumW2bPointer]::IsWtsActive(2,0) -or
    [TikzariumW2bPointer]::IsWtsActive(0,0)){throw 'Invalid WTS active policy'}
 $nl=[string][char]13+[string][char]10
 $baseline='\documentclass{article}'+$nl+'% комментарий'+$nl+'\begin{tikzpicture}'+$nl+'\end{tikzpicture}'+$nl
 $line='\draw (0,0) -- (1,1); % tikzarium:n1:line'+$nl
 $saved=$baseline.Replace('\end{tikzpicture}',$line+'\end{tikzpicture}')
 $b=[Text.Encoding]::UTF8.GetBytes($baseline)
 $ok=[Text.Encoding]::UTF8.GetBytes($saved)
 if((Get-W2bExactAdditivePatchStatus $b $ok) -cne 'PASS_ADDITIVE_DRAW_EXACT_SOURCE_PRESERVATION'){
  throw 'W2b synthetic additive line rejected'
 }
 $cases=@(
  @{a=$saved.Replace('% комментарий','% изменено');want='BLOCKED_W2B_UNRELATED_SOURCE_BYTES_CHANGED'},
  @{a=$saved.Replace($line,$line+$line);want='BLOCKED_W2B_NOT_ONE_OWNED_LINE'},
  @{a=$saved.Replace('\draw','\node');want='BLOCKED_W2B_OWNER_NOT_DRAW'},
  @{a=$saved.Replace($nl,[string][char]10);want='BLOCKED_W2B_UNRELATED_SOURCE_BYTES_CHANGED'}
 )
 foreach($test in $cases){
  $verdict=Get-W2bExactAdditivePatchStatus $b ([Text.Encoding]::UTF8.GetBytes($test.a))
  if($verdict -cne $test.want){throw "W2b source expected $($test.want), got $verdict"}
 }
 if((Get-W2bExactAdditivePatchStatus $b ([byte[]]@(255,254,1))) -cne 'BLOCKED_W2B_INVALID_UTF8_SOURCE'){
  throw 'W2b malformed source accepted'
 }
 Write-Host 'W2B_PER_EVENT_WTS=PASS_6_SYNTHETIC_POLICY_CASES_NOT_GUI'
 Write-Host 'W2B_EXACT_SOURCE=PASS_6_SYNTHETIC_BYTE_CASES_NOT_GUI'
 Write-Host 'W2B_NATIVE_INPUT_ZERO_HWND=PASS_NO_MOUSE_EVENTS'
 Write-Host 'W2B_STAGE1_PREFLIGHT=PASS_6_CASES_NO_INPUT_NO_DESKTOP_CAPTURE'
 return
}
