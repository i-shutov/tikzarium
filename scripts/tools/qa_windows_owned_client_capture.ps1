# Windows W2 screenshot safety: request ONLY the verified application's CLIENT rendering.
# No desktop DC, BitBlt, CopyFromScreen, or fallback to screen pixels.
# Win32 PrintWindow may fail or return a blank GPU frame: fail closed, never forge PNG.
# Only called after the invoking probe verified an interactive, unlocked desktop.
function Save-TikzariumOwnedClient {
 [CmdletBinding()]
 param(
  [Parameter(Mandatory)][IntPtr]$Handle,
  [Parameter(Mandatory)][int]$ExpectedPid,
  [Parameter(Mandatory)][string]$Path
 )
 if(-not ('TikzariumClientCapture' -as [type])) {
  Add-Type -ReferencedAssemblies @('System.Drawing') -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public struct TikzClientRect { public int Left, Top, Right, Bottom; }
public struct TikzClientPoint { public int X, Y; }
public sealed class TikzClientCaptureResult {
 public int left;
 public int top;
 public int width;
 public int height;
 public int unique_sample_colors;
 public int unpainted_samples;
 public string method;
}
public static class TikzariumClientCapture {
 [DllImport("user32.dll", SetLastError=true)]
 static extern bool GetClientRect(IntPtr hwnd, out TikzClientRect rect);
 [DllImport("user32.dll", SetLastError=true)]
 static extern bool ClientToScreen(IntPtr hwnd, ref TikzClientPoint point);
 [DllImport("user32.dll", SetLastError=true)]
 static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
 [DllImport("user32.dll")]
 static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")]
 static extern bool IsWindowVisible(IntPtr hwnd);
 [DllImport("user32.dll")]
 static extern bool IsIconic(IntPtr hwnd);
 [DllImport("user32.dll", SetLastError=true)]
 static extern bool PrintWindow(IntPtr hwnd, IntPtr hdcBlt, uint flags);
 [DllImport("user32.dll", SetLastError=true)]
 static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint desiredAccess);
 [DllImport("user32.dll", SetLastError=true)]
 static extern bool CloseDesktop(IntPtr desktop);
 [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="GetUserObjectInformationW", SetLastError=true)]
 static extern bool GetUserObjectInformation(IntPtr handle, int index, System.Text.StringBuilder name, int byteSize, out int needed);

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

 public static TikzClientCaptureResult Capture(IntPtr hwnd, int expectedPid, string outputPath) {
  if(hwnd == IntPtr.Zero || expectedPid <= 0) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_UNKNOWN_HANDLE");
  uint observedPid = 0;
  GetWindowThreadProcessId(hwnd, out observedPid);
  if(observedPid != (uint)expectedPid) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_FOREIGN_PROCESS");
  if(!IsWindowVisible(hwnd) || IsIconic(hwnd)) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_NOT_VISIBLE");
  if(GetForegroundWindow() != hwnd) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_FOREIGN_FOREGROUND");
  RequireUnlockedInputDesktop();
  TikzClientRect rect;
  if(!GetClientRect(hwnd, out rect)) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_NO_CLIENT_RECT");
  int width = rect.Right - rect.Left, height = rect.Bottom - rect.Top;
  if(width < 640 || height < 360 || width > 10000 || height > 10000)
   throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_BAD_CLIENT_GEOMETRY");
  TikzClientPoint origin = new TikzClientPoint();
  if(!ClientToScreen(hwnd, ref origin)) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_NO_ORIGIN");
  // PW_CLIENTONLY=1, PW_RENDERFULLCONTENT=2. This targets HWND, not desktop pixels.
  using(var bitmap = new Bitmap(width, height, PixelFormat.Format32bppArgb)) {
   using(var graphics = Graphics.FromImage(bitmap)) {
    graphics.Clear(Color.Magenta);
    IntPtr hdc = graphics.GetHdc();
    bool success;
    try { success = PrintWindow(hwnd, hdc, 0x3u); }
    finally { graphics.ReleaseHdc(hdc); }
    if(!success) throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_PRINTWINDOW_FAILED");
   }
   var sampled = new HashSet<int>();
   int unpainted = 0;
   int examined = 0;
   for(int y=5;y<height;y+=11) {
    for(int x=5;x<width;x+=11) {
     int argb=bitmap.GetPixel(x,y).ToArgb();
     sampled.Add(argb);
     if(argb==Color.Magenta.ToArgb()) unpainted++;
     examined++;
    }
   }
   // PrintWindow can return success while providing an empty black/white frame.
   // A blank or mostly untouched canvas is NOT truthful GUI visual evidence.
   if(sampled.Count < 8 || unpainted > examined/50)
    throw new InvalidOperationException("BLOCKED_CLIENT_CAPTURE_BLANK_OR_INCOMPLETE_PRINTWINDOW");
   bitmap.Save(outputPath, ImageFormat.Png);
   return new TikzClientCaptureResult {
    left=origin.X, top=origin.Y, width=width, height=height,
    unique_sample_colors=sampled.Count, unpainted_samples=unpainted,
    method="WIN32_PRINTWINDOW_PW_CLIENTONLY_RENDERFULLCONTENT_NO_SCREEN_READ"
   };
  }
 }
}
'@
 }
 return [TikzariumClientCapture]::Capture($Handle,$ExpectedPid,$Path)
}
