# Capture only the PID-owned CLIENT. Measure and render in one native PMv2 scope.
# No desktop DC/BitBlt/CopyFromScreen fallback; no process/system DPI changes.
# Restore the calling thread's exact prior DPI context even when a guard throws.
function Initialize-TikzariumClientCapture {
 if(-not ('TikzariumClientCapture' -as [type])) {
  Add-Type -ReferencedAssemblies @('System.Drawing') -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public struct TikzClientRect { public int Left, Top, Right, Bottom; }
public struct TikzClientPoint { public int X, Y; }
[StructLayout(LayoutKind.Sequential)]
public struct TikzCaptureMonitorInfo {
 public int Size;
 public TikzClientRect Monitor;
 public TikzClientRect Work;
 public uint Flags;
}
public sealed class TikzClientCaptureResult {
 public int left, top, width, height;
 public int window_left, window_top, window_width, window_height;
 public int screen_left, screen_top, screen_width, screen_height;
 public uint window_dpi;
 public int owner_pid;
 public string hwnd;
 public string coordinate_space;
 public string capture_dpi_context;
 public string caller_dpi_context;
 public bool dpi_context_restored;
 public bool window_repositioned;
 public int unique_sample_colors;
 public int unpainted_samples;
 public string method;
}
public static class TikzariumClientCapture {
 [DllImport("user32.dll", SetLastError=true)] static extern bool GetClientRect(IntPtr hwnd, out TikzClientRect rect);
 [DllImport("user32.dll", SetLastError=true)] static extern bool GetWindowRect(IntPtr hwnd, out TikzClientRect rect);
 [DllImport("user32.dll", SetLastError=true)] static extern bool ClientToScreen(IntPtr hwnd, ref TikzClientPoint point);
 [DllImport("user32.dll", SetLastError=true)] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
 [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
 [DllImport("user32.dll", SetLastError=true)] static extern bool PrintWindow(IntPtr hwnd, IntPtr hdcBlt, uint flags);
 [DllImport("user32.dll", SetLastError=true)] static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint desiredAccess);
 [DllImport("user32.dll", SetLastError=true)] static extern bool CloseDesktop(IntPtr desktop);
 [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="GetUserObjectInformationW", SetLastError=true)]
 static extern bool GetUserObjectInformation(IntPtr handle, int index, System.Text.StringBuilder name, int byteSize, out int needed);
 [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr hwnd);
 [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);
 [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="GetMonitorInfoW", SetLastError=true)]
 static extern bool GetMonitorInfo(IntPtr monitor, ref TikzCaptureMonitorInfo info);
 [DllImport("user32.dll", SetLastError=true)] static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
 [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
 [DllImport("user32.dll")] public static extern IntPtr GetThreadDpiAwarenessContext();
 [DllImport("user32.dll")] public static extern bool AreDpiAwarenessContextsEqual(IntPtr first, IntPtr second);

 static TikzClientCaptureResult InPhysicalPixelScope(Func<TikzClientCaptureResult> operation) {
  IntPtr previous = SetThreadDpiAwarenessContext(new IntPtr(-4)); // PER_MONITOR_AWARE_V2
  if(previous == IntPtr.Zero) throw new InvalidOperationException("BLOCKED_DPI_CONTEXT_UNAVAILABLE");
  TikzClientCaptureResult result;
  try {
   if(!AreDpiAwarenessContextsEqual(GetThreadDpiAwarenessContext(), new IntPtr(-4)))
    throw new InvalidOperationException("BLOCKED_DPI_CONTEXT_NOT_PMV2");
   result = operation();
   result.coordinate_space = "PHYSICAL_PIXELS_PER_MONITOR_V2";
   result.capture_dpi_context = "PER_MONITOR_AWARE_V2";
   result.caller_dpi_context = previous.ToInt64().ToString();
  } finally {
   if(SetThreadDpiAwarenessContext(previous) == IntPtr.Zero ||
      !AreDpiAwarenessContextsEqual(GetThreadDpiAwarenessContext(), previous))
    throw new InvalidOperationException("BLOCKED_DPI_CONTEXT_RESTORE_FAILED");
  }
  result.dpi_context_restored = true;
  return result;
 }

 static void RequireUnlockedInputDesktop() {
  IntPtr input = OpenInputDesktop(0, false, 1);
  if(input == IntPtr.Zero) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_LOCKED_INPUT_DESKTOP");
  try {
   var name = new System.Text.StringBuilder(256);
   int needed = 0;
   if(!GetUserObjectInformation(input, 2, name, name.Capacity*2, out needed) || name.ToString() != "Default")
    throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_NONDEFAULT_INPUT_DESKTOP");
  } finally { CloseDesktop(input); }
 }
 static void RequireOwned(IntPtr hwnd, int expectedPid, bool requireForeground) {
  if(hwnd == IntPtr.Zero || expectedPid <= 0) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_UNKNOWN_HANDLE");
  uint observedPid = 0;
  if(GetWindowThreadProcessId(hwnd, out observedPid) == 0 || observedPid != (uint)expectedPid)
   throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_FOREIGN_PROCESS");
  using(var owner = Process.GetProcessById(expectedPid))
  using(var caller = Process.GetCurrentProcess()) {
   if(owner.SessionId <= 0 || owner.SessionId != caller.SessionId)
    throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_OTHER_SESSION");
  }
  if(!IsWindowVisible(hwnd) || IsIconic(hwnd)) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_NOT_VISIBLE");
  if(requireForeground && GetForegroundWindow() != hwnd) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_FOREIGN_FOREGROUND");
  RequireUnlockedInputDesktop();
 }
 static TikzClientCaptureResult Geometry(IntPtr hwnd, int expectedPid) {
  RequireOwned(hwnd, expectedPid, false);
  TikzClientRect client, window;
  if(!GetClientRect(hwnd, out client) || !GetWindowRect(hwnd, out window))
   throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_NO_RECT");
  TikzClientPoint origin = new TikzClientPoint();
  if(!ClientToScreen(hwnd, ref origin)) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_NO_ORIGIN");
  var monitor = new TikzCaptureMonitorInfo();
  monitor.Size = Marshal.SizeOf(typeof(TikzCaptureMonitorInfo));
  if(!GetMonitorInfo(MonitorFromWindow(hwnd, 2), ref monitor))
   throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_NO_MONITOR");
  var result = new TikzClientCaptureResult {
   left=origin.X, top=origin.Y, width=client.Right-client.Left, height=client.Bottom-client.Top,
   window_left=window.Left, window_top=window.Top, window_width=window.Right-window.Left, window_height=window.Bottom-window.Top,
   screen_left=monitor.Monitor.Left, screen_top=monitor.Monitor.Top,
   screen_width=monitor.Monitor.Right-monitor.Monitor.Left, screen_height=monitor.Monitor.Bottom-monitor.Monitor.Top,
   window_dpi=GetDpiForWindow(hwnd), owner_pid=expectedPid, hwnd=hwnd.ToInt64().ToString()
  };
  if(result.width < 640 || result.height < 360 || result.width > 10000 || result.height > 10000 || result.window_dpi == 0)
   throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_BAD_CLIENT_GEOMETRY");
  if(origin.X < window.Left || origin.Y < window.Top || origin.X+result.width > window.Right || origin.Y+result.height > window.Bottom)
   throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_CLIENT_OUTSIDE_WINDOW");
  return result;
 }
 static bool FitsMonitor(TikzClientCaptureResult g) {
  return g.window_left >= g.screen_left && g.window_top >= g.screen_top &&
   g.window_left+g.window_width <= g.screen_left+g.screen_width &&
   g.window_top+g.window_height <= g.screen_top+g.screen_height;
 }
 public static TikzClientCaptureResult Measure(IntPtr hwnd, int expectedPid, bool fitHostedWindow) {
  return InPhysicalPixelScope(delegate {
   var g = Geometry(hwnd, expectedPid);
   if(fitHostedWindow && !FitsMonitor(g)) {
    // This opt-in is forbidden on the persistent personal machine.
    if(Environment.GetEnvironmentVariable("GITHUB_ACTIONS") != "true" ||
       Environment.GetEnvironmentVariable("RUNNER_ENVIRONMENT") != "github-hosted")
     throw new InvalidOperationException("BLOCKED_WINDOW_MOVE_NONDISPOSABLE_HOST");
    if(g.window_width > g.screen_width || g.window_height > g.screen_height)
     throw new InvalidOperationException("BLOCKED_WINDOW_LARGER_THAN_SCREEN");
    RequireOwned(hwnd, expectedPid, false);
    int x = g.screen_left+(g.screen_width-g.window_width)/2;
    int y = g.screen_top+(g.screen_height-g.window_height)/2;
    if(!SetWindowPos(hwnd, IntPtr.Zero, x, y, 0, 0, 0x0015u)) // NOSIZE|NOZORDER|NOACTIVATE
     throw new InvalidOperationException("BLOCKED_WINDOW_REPOSITION_DENIED");
    g = Geometry(hwnd, expectedPid);
    g.window_repositioned = true;
   }
   if(!FitsMonitor(g)) throw new InvalidOperationException("BLOCKED_WINDOW_OFF_SCREEN");
   return g;
  });
 }
 public static TikzClientCaptureResult Capture(IntPtr hwnd, int expectedPid, string outputPath) {
  return InPhysicalPixelScope(delegate {
   RequireOwned(hwnd, expectedPid, true);
   var g = Geometry(hwnd, expectedPid);
   if(!FitsMonitor(g)) throw new InvalidOperationException("BLOCKED_WINDOW_OFF_SCREEN");
   int width=g.width, height=g.height;
   using(var bitmap = new Bitmap(width, height, PixelFormat.Format32bppArgb)) {
    using(var graphics = Graphics.FromImage(bitmap)) {
     graphics.Clear(Color.Magenta);
     IntPtr hdc = graphics.GetHdc();
     bool success;
     // PW_CLIENTONLY=1, PW_RENDERFULLCONTENT=2; HWND rendering, not screen read.
     try { success = PrintWindow(hwnd, hdc, 0x3u); }
     finally { graphics.ReleaseHdc(hdc); }
     if(!success) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_PRINTWINDOW_FAILED");
    }
    var sampled = new HashSet<int>();
    int unpainted=0, examined=0;
    for(int y=5;y<height;y+=11) for(int x=5;x<width;x+=11) {
     int argb=bitmap.GetPixel(x,y).ToArgb();
     sampled.Add(argb);
     if(argb==Color.Magenta.ToArgb()) unpainted++;
     examined++;
    }
    if(sampled.Count < 8 || unpainted > examined/50)
     throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_BLANK_OR_INCOMPLETE_PRINTWINDOW");
    // Fail closed if ownership/focus or geometry changed while rendering.
    RequireOwned(hwnd, expectedPid, true);
    var after = Geometry(hwnd, expectedPid);
    if(g.width != after.width || g.height != after.height || g.left != after.left || g.top != after.top ||
       g.window_width != after.window_width || g.window_height != after.window_height || g.window_dpi != after.window_dpi)
     throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_GEOMETRY_CHANGED");
    bitmap.Save(outputPath, ImageFormat.Png);
    g.unique_sample_colors=sampled.Count;
    g.unpainted_samples=unpainted;
    g.method="WIN32_PRINTWINDOW_PW_CLIENTONLY_RENDERFULLCONTENT_NO_SCREEN_READ";
    return g;
   }
  });
 }
 // Real native negative regression; no windows, input, screenshots or OS settings.
 public static int SelfTestDpiRestoration() {
  IntPtr original = GetThreadDpiAwarenessContext();
  int cases = 0;
  try {
   foreach(int value in new int[] {-1, -2, -4}) {
    IntPtr selected = new IntPtr(value);
    if(SetThreadDpiAwarenessContext(selected) == IntPtr.Zero)
     throw new InvalidOperationException("Cannot set test thread DPI context");
    var good = InPhysicalPixelScope(delegate { return new TikzClientCaptureResult(); });
    if(!good.dpi_context_restored || !AreDpiAwarenessContextsEqual(GetThreadDpiAwarenessContext(), selected))
     throw new InvalidOperationException("DPI context leaked on successful native call");
    cases++;
    bool rejected=false;
    try { Measure(IntPtr.Zero, 42, false); }
    catch(InvalidOperationException ex) { rejected=ex.Message=="BLOCKED_CLIENT_CAPTURE_UNKNOWN_HANDLE"; }
    if(!rejected || !AreDpiAwarenessContextsEqual(GetThreadDpiAwarenessContext(), selected))
     throw new InvalidOperationException("DPI context leaked after rejected HWND");
    cases++;
   }
  } finally {
   if(SetThreadDpiAwarenessContext(original) == IntPtr.Zero ||
      !AreDpiAwarenessContextsEqual(GetThreadDpiAwarenessContext(), original))
    throw new InvalidOperationException("Test failed to restore caller DPI context");
  }
  return cases;
 }
}
'@
 }
}
function Get-TikzariumOwnedPhysicalGeometry {
 [CmdletBinding()]
 param([Parameter(Mandatory)][IntPtr]$Handle,[Parameter(Mandatory)][int]$ExpectedPid,[switch]$FitHostedWindow)
 Initialize-TikzariumClientCapture
 return [TikzariumClientCapture]::Measure($Handle,$ExpectedPid,[bool]$FitHostedWindow)
}
function Save-TikzariumOwnedClient {
 [CmdletBinding()]
 param([Parameter(Mandatory)][IntPtr]$Handle,[Parameter(Mandatory)][int]$ExpectedPid,[Parameter(Mandatory)][string]$Path)
 Initialize-TikzariumClientCapture
 return [TikzariumClientCapture]::Capture($Handle,$ExpectedPid,$Path)
}
function Test-TikzariumCaptureDpiScope {
 Initialize-TikzariumClientCapture
 $cases=[TikzariumClientCapture]::SelfTestDpiRestoration()
 if($cases -ne 6){throw 'Expected 6 native DPI-context restoration cases'}
 Write-Host 'W2_NATIVE_DPI_SCOPE=PASS_6_CASES_NO_WINDOW_NO_CAPTURE'
}
