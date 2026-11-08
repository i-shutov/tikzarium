# Native Windows Save As is a mandatory interactive GUI step for an unsaved document.
# Operate ONLY on a verified modal HWND owned by the exact same TikZarium PID,
# in the same active RDP session. UI Automation invokes the true OS common dialog;
# it never creates a pretend GUI-saved .tex outside the application.
[CmdletBinding()]
param([switch]$SelfTest)
$ErrorActionPreference='Stop'

function Initialize-TikzariumOwnedSaveDialog {
 if(-not ('TikzariumW2bSaveDialog' -as [type])){
 Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
public static class TikzariumW2bSaveDialog {
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll",SetLastError=true)] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h,uint command);
 [DllImport("user32.dll",SetLastError=true,CharSet=CharSet.Unicode)]
 public static extern int GetClassName(IntPtr h,StringBuilder output,int capacity);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 public static string Validate(IntPtr app,IntPtr dialog,int expectedPid,int expectedSession) {
   if(app==IntPtr.Zero || dialog==IntPtr.Zero || dialog==app || expectedPid<=0 || expectedSession<=0)
     return "BLOCKED_SAVE_DIALOG_MISSING_OR_APP";
   uint appPid=0, dialogPid=0;
   if(GetWindowThreadProcessId(app,out appPid)==0 ||
      GetWindowThreadProcessId(dialog,out dialogPid)==0 ||
      appPid!=(uint)expectedPid || dialogPid!=appPid)
     return "BLOCKED_SAVE_DIALOG_FOREIGN_PID";
   if(GetForegroundWindow()!=dialog || !IsWindowVisible(dialog))
     return "BLOCKED_SAVE_DIALOG_NOT_FOREGROUND";
   // rfd 0.15.4 IDialog::show calls IFileDialog::Show(NULL) when
   // FileDialog::set_parent is omitted (TikZarium's current save_as()).
   // Such a same-PID native modal legitimately has GW_OWNER == 0.
   // Never accept a nonzero foreign owner, PID, desktop, session or foreground.
   IntPtr observedOwner=GetWindow(dialog,4);
   if(observedOwner!=IntPtr.Zero && observedOwner!=app)
     return "BLOCKED_SAVE_DIALOG_FOREIGN_OWNER";
   var name=new StringBuilder(128);
   if(GetClassName(dialog,name,name.Capacity)==0 || name.ToString()!="#32770")
     return "BLOCKED_SAVE_DIALOG_UNKNOWN_CLASS";
   using(var process=Process.GetProcessById(expectedPid))
   using(var caller=Process.GetCurrentProcess()) {
     if(process.SessionId!=expectedSession || caller.SessionId!=expectedSession)
       return "BLOCKED_SAVE_DIALOG_OTHER_SESSION";
   }
   return "OWNED_NATIVE_SAVE_DIALOG";
 }
}
'@
 }
}

function Invoke-TikzariumOwnedSaveDialog {
 [CmdletBinding()]
 param(
 [Parameter(Mandatory)][IntPtr]$MainHandle,
 [Parameter(Mandatory)][int]$ExpectedPid,
 [Parameter(Mandatory)][int]$SessionId,
 [Parameter(Mandatory)][string]$ExactNewTexPath,
 [Parameter(Mandatory)][string]$OutputDir
 )
 Initialize-TikzariumOwnedSaveDialog
 $full=[IO.Path]::GetFullPath($ExactNewTexPath)
 if(Test-Path -LiteralPath $full){throw 'BLOCKED_SAVE_DESTINATION_NOT_NEW'}
 $parent=[IO.Path]::GetDirectoryName($full)
 if(-not (Test-Path -LiteralPath $parent -PathType Container) -or
    [IO.Path]::GetExtension($full) -cne '.tex'){
    throw 'BLOCKED_SAVE_DESTINATION_INVALID'}
 if(-not $env:RUNNER_TEMP -or
    -not $full.StartsWith([IO.Path]::GetFullPath($env:RUNNER_TEMP)+[IO.Path]::DirectorySeparatorChar,
                     [StringComparison]::OrdinalIgnoreCase)){
    throw 'BLOCKED_SAVE_DESTINATION_OUTSIDE_PRIVATE_RUNNER_TEMP'}
 $modal=[TikzariumW2bSaveDialog]::GetForegroundWindow()
 $guard=[TikzariumW2bSaveDialog]::Validate($MainHandle,$modal,$ExpectedPid,$SessionId)
 if($guard -cne 'OWNED_NATIVE_SAVE_DIALOG'){throw $guard}
 # A PID/foreground check alone is not enough across an RDP lock or
 # input-desktop switch. Reuse the native W2a active Default-desktop guard.
 if((Get-W2OwnedRuntimeStatus $MainHandle $ExpectedPid $SessionId) -cne 'OWNED_ACTIVE_DEFAULT_DESKTOP'){
   throw 'BLOCKED_SAVE_DIALOG_NOT_ACTIVE_DEFAULT_DESKTOP'
 }
 # Explicit native OS window captured; no desktop, foreign app or screen DC.
 $png=Join-Path $OutputDir '00-real-owned-save-dialog.png'
 $capture=Save-TikzariumOwnedClient -Handle $modal -ExpectedPid $ExpectedPid -Path $png
 Add-Type -AssemblyName UIAutomationClient
 Add-Type -AssemblyName UIAutomationTypes
 $root=[System.Windows.Automation.AutomationElement]::FromHandle($modal)
 if($null -eq $root -or $root.Current.ProcessId -ne $ExpectedPid){
   throw 'BLOCKED_SAVE_UIA_FOREIGN_ROOT'
 }
 $eq=[System.Windows.Automation.PropertyCondition]::new(
     [System.Windows.Automation.AutomationElement]::AutomationIdProperty,'1148')
 $filenameCombo=$root.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$eq)
 if($null -eq $filenameCombo -or $filenameCombo.Current.ProcessId -ne $ExpectedPid){
   throw 'BLOCKED_SAVE_FILENAME_COMBO_NOT_VERIFIED'
 }
 $editCondition=[System.Windows.Automation.PropertyCondition]::new(
     [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
     [System.Windows.Automation.ControlType]::Edit)
 $edits=$filenameCombo.FindAll([System.Windows.Automation.TreeScope]::Descendants,$editCondition)
 if($null -eq $edits -or $edits.Count -ne 1){
   throw 'BLOCKED_SAVE_FILENAME_EDIT_AMBIGUOUS'
 }
 $edit=$edits.Item(0)
 if($edit.Current.ProcessId -ne $ExpectedPid){
   throw 'BLOCKED_SAVE_FILENAME_EDIT_FOREIGN'
 }
 $pattern=$edit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
 if($null -eq $pattern -or $pattern.Current.IsReadOnly){throw 'BLOCKED_SAVE_FILENAME_READONLY'}
 $pattern.SetValue($full)
 # No operation on a new/foreign foreground window, even if UIA changed focus.
 if([TikzariumW2bSaveDialog]::Validate($MainHandle,$modal,$ExpectedPid,$SessionId) -cne 'OWNED_NATIVE_SAVE_DIALOG' -or
    (Get-W2OwnedRuntimeStatus $MainHandle $ExpectedPid $SessionId) -cne 'OWNED_ACTIVE_DEFAULT_DESKTOP'){
   throw 'BLOCKED_SAVE_FOCUS_OR_DEFAULT_DESKTOP_CHANGED_BEFORE_INVOKE'
 }
 $saveId=[System.Windows.Automation.PropertyCondition]::new(
     [System.Windows.Automation.AutomationElement]::AutomationIdProperty,'1')
 $button=$root.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$saveId)
 if($null -eq $button -or $button.Current.ProcessId -ne $ExpectedPid -or
    $button.Current.ControlType -ne [System.Windows.Automation.ControlType]::Button){
   throw 'BLOCKED_SAVE_CONFIRM_BUTTON_UNKNOWN'
 }
 $invoke=$button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
 if($null -eq $invoke){throw 'BLOCKED_SAVE_CONFIRM_NOT_INVOKABLE'}
 $invoke.Invoke()
 for($i=0;$i -lt 25;$i++){
   Start-Sleep -Milliseconds 120
   if((Test-Path -LiteralPath $full -PathType Leaf) -and
       [TikzariumW2bSaveDialog]::GetForegroundWindow() -eq $MainHandle){break}
 }
 if(-not (Test-Path -LiteralPath $full -PathType Leaf) -or
    [TikzariumW2bSaveDialog]::GetForegroundWindow() -ne $MainHandle){
   throw 'BLOCKED_SAVE_NO_OWNED_GUI_RESULT_OR_DIALOG_NOT_CLOSED'
 }
 return [PSCustomObject]@{
   status='PASS_OWNED_NATIVE_SAVE_DIALOG'
   class='#32770'
   dialog_hwnd=$modal.ToInt64().ToString()
   process_id=$ExpectedPid
   chosen_source_path=$full
   original_dialog_png='00-real-owned-save-dialog.png'
   original_dialog_png_sha256=(Get-FileHash -LiteralPath $png -Algorithm SHA256).Hash.ToLowerInvariant()
   dpi_context_restored=$capture.dpi_context_restored
   saved_source_sha256=(Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant()
 }
}

if($SelfTest){
 Initialize-TikzariumOwnedSaveDialog
 $zero=[TikzariumW2bSaveDialog]::Validate([IntPtr]::Zero,[IntPtr]::Zero,1234,2)
 if($zero -cne 'BLOCKED_SAVE_DIALOG_MISSING_OR_APP'){throw 'SAVE_DIALOG_ZERO_HWND_ACCEPTED'}
 $same=[TikzariumW2bSaveDialog]::Validate([IntPtr]::new(123),[IntPtr]::new(123),1234,2)
 if($same -cne 'BLOCKED_SAVE_DIALOG_MISSING_OR_APP'){throw 'SAVE_DIALOG_APP_WINDOW_ACCEPTED'}
 Write-Host 'W2B_NATIVE_SAVE_DIALOG_SELFTEST=PASS_ZERO_AND_APP_NEGATIVES_NO_UIA_OR_MOUSE'
}
