# TikZarium W3 Win10: read-only diagnostic and consented capture on the REAL Default desktop.
# Launch ONLY from a regular PowerShell window opened by the user in an active Admin RDP session.
# Never use this script to escape CodexSandboxDesktop or modify UAC, RDP, services, or system DPI.
[CmdletBinding()]
param(
    [ValidateSet('SelfTest','Probe','Capture','LaunchAndProbe','LaunchAndCapture')][string]$Action='Probe',
    [string]$EvidenceDirectory,
    [int]$ExpectedPid=0,
    [string]$ExpectedExePath,
    [ValidateRange(0,30)][int]$ForegroundWaitSeconds=15
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'

function Initialize-TikzariumW3DesktopProbe {
    if ('TikzariumW3DesktopProbe' -as [type]) { return }
    Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public struct TikzariumW3Rect { public int Left, Top, Right, Bottom; }
public sealed class TikzariumW3Window {
    public long hwnd;
    public int pid;
    public int thread_id;
    public int width;
    public int height;
    public string title;
    public string thread_desktop;
}
public static class TikzariumW3DesktopProbe {
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
    [DllImport("user32.dll", SetLastError=true)] static extern IntPtr GetThreadDesktop(uint tid);
    [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="GetUserObjectInformationW", SetLastError=true)]
    static extern bool GetUserObjectInformation(IntPtr h, int index, StringBuilder name, int size, out int needed);
    [DllImport("user32.dll", SetLastError=true)] static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
    [DllImport("user32.dll", SetLastError=true)] static extern bool CloseDesktop(IntPtr desktop);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsCallback callback, IntPtr user);
    delegate bool EnumWindowsCallback(IntPtr hwnd, IntPtr user);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="GetWindowTextW")]
    static extern int GetWindowText(IntPtr hwnd, StringBuilder title, int capacity);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
    [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr hwnd, out TikzariumW3Rect rect);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("wtsapi32.dll", EntryPoint="WTSQuerySessionInformationW", CharSet=CharSet.Unicode)]
    static extern bool WTSQuerySessionInformation(IntPtr server, int session, int infoClass, out IntPtr buffer, out int bytes);
    [DllImport("wtsapi32.dll")] static extern void WTSFreeMemory(IntPtr buffer);

    static string ObjectName(IntPtr h) {
        if (h == IntPtr.Zero) return "UNKNOWN";
        var name = new StringBuilder(256);
        int needed;
        return GetUserObjectInformation(h, 2, name, name.Capacity*2, out needed) ? name.ToString() : "UNKNOWN";
    }
    public static string CurrentDesktop() { return ObjectName(GetThreadDesktop(GetCurrentThreadId())); }
    public static string InputDesktop() {
        IntPtr h = OpenInputDesktop(0, false, 1);
        try { return ObjectName(h); }
        finally { if (h != IntPtr.Zero) CloseDesktop(h); }
    }
    public static string WindowDesktop(long hwnd) {
        uint pid;
        uint tid = GetWindowThreadProcessId(new IntPtr(hwnd), out pid);
        return tid == 0 ? "UNKNOWN" : ObjectName(GetThreadDesktop(tid));
    }
    public static int WtsConnectionState(int session) {
        if (session <= 0) return -1;
        IntPtr ptr = IntPtr.Zero; int count = 0;
        try {
            if (!WTSQuerySessionInformation(IntPtr.Zero, session, 8, out ptr, out count) || ptr == IntPtr.Zero || count < 4) return -1;
            return Marshal.ReadInt32(ptr);
        } finally { if (ptr != IntPtr.Zero) WTSFreeMemory(ptr); }
    }
    public static bool SafeReadContext(string current, string input, int wtsState, int session) {
        return current == "Default" && input == "Default" && wtsState == 0 && session > 0;
    }
    public static TikzariumW3Window[] FindWindows(int expectedPid) {
        var found = new List<TikzariumW3Window>();
        EnumWindows(delegate(IntPtr hwnd, IntPtr user) {
            if (!IsWindowVisible(hwnd) || IsIconic(hwnd)) return true;
            uint pid;
            uint tid = GetWindowThreadProcessId(hwnd, out pid);
            if (tid == 0 || pid == 0 || (expectedPid > 0 && pid != (uint)expectedPid)) return true;
            var title = new StringBuilder(260);
            GetWindowText(hwnd, title, title.Capacity);
            if (!String.Equals(title.ToString(), "Tikzarium", StringComparison.Ordinal)) return true;
            try {
                using (var process = Process.GetProcessById((int)pid)) {
                    if (!String.Equals(process.ProcessName, "tikzarium-app", StringComparison.OrdinalIgnoreCase)) return true;
                }
            } catch { return true; }
            TikzariumW3Rect client;
            if (!GetClientRect(hwnd, out client)) return true;
            int width = client.Right-client.Left, height = client.Bottom-client.Top;
            if (width < 640 || height < 360 || width > 10000 || height > 10000) return true;
            found.Add(new TikzariumW3Window {
                hwnd = hwnd.ToInt64(), pid = (int)pid, thread_id = (int)tid, width = width, height = height,
                title = title.ToString(), thread_desktop = ObjectName(GetThreadDesktop(tid))
            });
            return true;
        }, IntPtr.Zero);
        return found.ToArray();
    }
}
'@
}

Initialize-TikzariumW3DesktopProbe
if ($Action -eq 'SelfTest') {
    $passed = [TikzariumW3DesktopProbe]::SafeReadContext('Default','Default',0,2)
    if (-not $passed) { throw 'SelfTest: active Default context rejected' }
    foreach ($case in @(
        @('CodexSandboxDesktop','Default',0,2),
        @('Default','CodexSandboxDesktop',0,2),
        @('Default','Default',4,2),
        @('Default','Default',-1,2),
        @('Default','Default',0,0)
    )) {
        if ([TikzariumW3DesktopProbe]::SafeReadContext([string]$case[0],[string]$case[1],[int]$case[2],[int]$case[3])) {
            throw 'SelfTest: unsafe desktop/session accepted'
        }
    }
    Write-Host 'W3_DEFAULT_DESKTOP_PROBE_SELFTEST_PASS: 6 context cases, no GUI access or input'
    exit 0
}

# Read-only registry OS check; avoid WMI in restricted accounts.
$cv = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
$build = if ($cv.CurrentBuildNumber) { [int]$cv.CurrentBuildNumber } else { [int]$cv.CurrentBuild }
if (-not [Environment]::Is64BitOperatingSystem -or $build -lt 19045 -or $build -ge 22000 -or
    [string]$cv.ProductName -match 'Server') { throw 'W3 probe requires Windows 10 x64 workstation 19045+' }
if ($ExpectedPid -lt 0) { throw 'ExpectedPid must be nonnegative' }

if ([string]::IsNullOrWhiteSpace($EvidenceDirectory)) {
    $suffix = Get-Date -Format 'yyyyMMdd-HHmmss'
    $EvidenceDirectory = Join-Path $env:USERPROFILE ('Documents\TikZarium-QA\evidence\w3-default-desktop-'+$suffix)
}
if (Test-Path -LiteralPath $EvidenceDirectory) {
    throw 'Refusing to overwrite an existing evidence directory; choose a new -EvidenceDirectory'
}
New-Item -ItemType Directory -Path $EvidenceDirectory -Force | Out-Null
$reportPath = Join-Path $EvidenceDirectory 'desktop-context.json'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$session = [Diagnostics.Process]::GetCurrentProcess().SessionId
$report = [ordered]@{
    schema = 'TIKZARIUM_W3_WIN10_DEFAULT_DESKTOP_V1'
    timestamp = (Get-Date -Format 'o')
    host = $env:COMPUTERNAME
    user = $identity.Name
    process_session_id = $session
    elevated = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    windows_build = $build
    current_desktop = $null
    input_desktop = $null
    wts_connection_state = $null
    windows = @()
    selected = $null
    status = 'BLOCKED_NOT_PROBED'
    action = $Action
    capture = $null
}
try {
    $report.current_desktop = [TikzariumW3DesktopProbe]::CurrentDesktop()
    $report.input_desktop = [TikzariumW3DesktopProbe]::InputDesktop()
    $report.wts_connection_state = [TikzariumW3DesktopProbe]::WtsConnectionState($session)
    if ($report.elevated) { throw 'BLOCKED_ELEVATED_TOKEN: run a normal (non-elevated) PowerShell in Admin RDP' }
    if (-not [TikzariumW3DesktopProbe]::SafeReadContext(
        $report.current_desktop, $report.input_desktop, [int]$report.wts_connection_state, $session)) {
        throw 'BLOCKED_NOT_INTERACTIVE_DEFAULT_DESKTOP'
    }
    # Only an explicit user-launched script in Admin\Default may start this copy.
    # A GUI spawned from CodexSandboxDesktop cannot be made visible on Default
    # by probing or switching desktops. This is not a sandbox escape.
    if ($Action -in @('LaunchAndProbe','LaunchAndCapture')) {
        $existing = @([TikzariumW3DesktopProbe]::FindWindows($ExpectedPid))
        if ($existing.Count -eq 0) {
            $runtime = Join-Path $env:USERPROFILE 'Documents\TikZarium-QA\W3-Mesa-26.2.6\runtime'
            $exe = Join-Path $runtime 'tikzarium-app.exe'
            foreach ($required in @($exe,
                    (Join-Path $runtime 'opengl32.dll'),
                    (Join-Path $runtime 'libgallium_wgl.dll'))) {
                if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
                    throw "BLOCKED_PREPARED_MESA_RUNTIME_MISSING: $required"
                }
            }
            $work = Join-Path $env:USERPROFILE 'Documents\TikZarium-QA\W3-physical'
            if (-not (Test-Path -LiteralPath $work -PathType Container)) {
                throw "BLOCKED_W3_WORKSPACE_MISSING: $work"
            }
            $oldGl = [Environment]::GetEnvironmentVariable('GALLIUM_DRIVER','Process')
            $oldSoft = [Environment]::GetEnvironmentVariable('LIBGL_ALWAYS_SOFTWARE','Process')
            $oldPath = $env:Path
            $oldTex = [Environment]::GetEnvironmentVariable('TIKZARIUM_XELATEX','Process')
            try {
                $env:GALLIUM_DRIVER = 'llvmpipe'
                $env:LIBGL_ALWAYS_SOFTWARE = '1'
                $env:Path = "$runtime;$oldPath"
                if ([string]::IsNullOrWhiteSpace($oldTex)) {
                    $xelatex = Join-Path $env:LOCALAPPDATA 'Programs\MiKTeX\miktex\bin\x64\xelatex.exe'
                    if (Test-Path -LiteralPath $xelatex -PathType Leaf) {
                        $env:TIKZARIUM_XELATEX = $xelatex
                        $env:Path = "$(Split-Path -Parent $xelatex);$env:Path"
                    }
                }
                $poppler = Join-Path $env:LOCALAPPDATA 'Programs\TikZariumPoppler\poppler-25.07.0\Library\bin'
                if (Test-Path -LiteralPath (Join-Path $poppler 'pdftoppm.exe') -PathType Leaf) {
                    $env:Path = "$poppler;$env:Path"
                }
                $launched = Start-Process -FilePath $exe -WorkingDirectory $work -PassThru
                $report['launched_from_default'] = [ordered]@{
                    pid = $launched.Id
                    path = $exe
                    sha256 = (Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash
                }
                Write-Host "Launched prepared Mesa TikZarium in active Default desktop: PID $($launched.Id)"
            } finally {
                $env:Path = $oldPath
                [Environment]::SetEnvironmentVariable('GALLIUM_DRIVER',$oldGl,'Process')
                [Environment]::SetEnvironmentVariable('LIBGL_ALWAYS_SOFTWARE',$oldSoft,'Process')
                [Environment]::SetEnvironmentVariable('TIKZARIUM_XELATEX',$oldTex,'Process')
            }
            $deadline = (Get-Date).AddSeconds(15)
            do {
                Start-Sleep -Milliseconds 400
                $existing = @([TikzariumW3DesktopProbe]::FindWindows($launched.Id))
            } while ($existing.Count -eq 0 -and (Get-Date) -lt $deadline -and -not $launched.HasExited)
            if ($existing.Count -eq 0) { throw 'BLOCKED_LAUNCHED_GUI_NO_VISIBLE_DEFAULT_HWND' }
            $ExpectedPid = $launched.Id
        }
    }
    $windows = @([TikzariumW3DesktopProbe]::FindWindows($ExpectedPid))
    $report.windows = @($windows | ForEach-Object {
        [ordered]@{ hwnd=$_.hwnd; pid=$_.pid; title=$_.title; width=$_.width; height=$_.height; thread_desktop=$_.thread_desktop }
    })
    if ($windows.Count -ne 1) { throw "BLOCKED_TIKZARIUM_WINDOWS_COUNT_$($windows.Count)" }
    $target = $windows[0]
    if ($target.thread_desktop -cne 'Default') { throw 'BLOCKED_TIKZARIUM_WINDOW_WRONG_DESKTOP' }
    $process = Get-Process -Id $target.pid -ErrorAction Stop
    $exePath = $process.Path
    if ([string]::IsNullOrWhiteSpace($exePath)) { throw 'BLOCKED_EXE_PATH_UNKNOWN' }
    if (-not [string]::IsNullOrWhiteSpace($ExpectedExePath) -and
        [IO.Path]::GetFullPath($exePath) -ine [IO.Path]::GetFullPath($ExpectedExePath)) {
        throw 'BLOCKED_EXE_PATH_MISMATCH'
    }
    $sha = (Get-FileHash -LiteralPath $exePath -Algorithm SHA256).Hash
    $report.selected = [ordered]@{ pid=$target.pid; hwnd=$target.hwnd; exe_path=$exePath; exe_sha256=$sha; client_width=$target.width; client_height=$target.height }
    $captureApi = Join-Path $env:USERPROFILE 'source\tikzarium\scripts\tools\qa_windows_owned_client_capture.ps1'
    if (-not (Test-Path -LiteralPath $captureApi -PathType Leaf)) { throw 'BLOCKED_OWNED_CAPTURE_API_MISSING_IN_LOCAL_REPO' }
    . $captureApi
    $handle = [IntPtr]$target.hwnd
    $geom = Get-TikzariumOwnedPhysicalGeometry -Handle $handle -ExpectedPid $target.pid
    $report.selected['physical_client_geometry'] = $geom
    $report.status = 'PHYSICAL_DEFAULT_DESKTOP_GEOMETRY_PASS_NOT_W3'
    if ($Action -in @('Capture','LaunchAndCapture')) {
        # Focus is supplied by an actual user. Never activate another desktop,
        # synthesize input, patch sandbox, or steal foreground programmatically.
        $stopAt = (Get-Date).AddSeconds($ForegroundWaitSeconds)
        while ([TikzariumW3DesktopProbe]::GetForegroundWindow().ToInt64() -ne $target.hwnd -and (Get-Date) -lt $stopAt) {
            Start-Sleep -Milliseconds 500
        }
        if ([TikzariumW3DesktopProbe]::GetForegroundWindow().ToInt64() -ne $target.hwnd) {
            throw 'BLOCKED_FOREGROUND_NOT_TIKZARIUM: focus Tikzarium during bounded capture wait'
        }
        $png = Join-Path $EvidenceDirectory 'owned-tikzarium-client.png'
        $evidence = Save-TikzariumOwnedClient -Handle $handle -ExpectedPid $target.pid -Path $png
        $report.capture = [ordered]@{path=$png;sha256=(Get-FileHash -LiteralPath $png -Algorithm SHA256).Hash;geometry=$evidence;original=true}
        $report.status = 'OWNED_CLIENT_CAPTURE_PASS_NOT_W3'
    }
} catch {
    $report['error'] = $_.Exception.Message
    if ($report.status -eq 'BLOCKED_NOT_PROBED' -or $Action -eq 'Capture') {
        $report.status = 'BLOCKED'
    }
} finally {
    $report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $reportPath -Encoding UTF8
    Write-Host "W3 desktop probe status: $($report.status)"
    Write-Host "Evidence report: $reportPath"
    Write-Host "Current desktop: $($report.current_desktop); Input desktop: $($report.input_desktop); WTS: $($report.wts_connection_state)"
    if ($report.Contains('error')) { Write-Host "BLOCKER: $($report.error)" }
}
if ($report.status -notin @('PHYSICAL_DEFAULT_DESKTOP_GEOMETRY_PASS_NOT_W3','OWNED_CLIENT_CAPTURE_PASS_NOT_W3')) { exit 2 }
exit 0
