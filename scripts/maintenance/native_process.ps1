# Windows PowerShell 5.1 native process transport: stderr is data, not an exception.
function ConvertTo-TikzNativeArgument([string]$Value) {
 $b=New-Object System.Text.StringBuilder
 [void]$b.Append('"'); $slashes=0
 foreach($c in $Value.ToCharArray()) {
  if($c -eq '\') { $slashes++; continue }
  if($c -eq '"') { [void]$b.Append(('\' * (2*$slashes+1))); [void]$b.Append('"') }
  else { [void]$b.Append(('\' * $slashes)); [void]$b.Append($c) }
  $slashes=0
 }
 [void]$b.Append(('\' * (2*$slashes))); [void]$b.Append('"')
 return $b.ToString()
}
function Invoke-TikzNative {
 [CmdletBinding()]
 param([Parameter(Mandatory)][string]$Exe,[string[]]$Arguments=@(),
       [Parameter(Mandatory)][string]$WorkingDirectory,
       [Parameter(Mandatory)][string]$LogPrefix,[int]$TimeoutSeconds=60)
 if($TimeoutSeconds -lt 1 -or $TimeoutSeconds -gt 1800){throw 'Invalid native process deadline'}
 $exePath=(Resolve-Path -LiteralPath $Exe -ErrorAction Stop).Path
 $cwd=(Resolve-Path -LiteralPath $WorkingDirectory -ErrorAction Stop).Path
 $info=New-Object System.Diagnostics.ProcessStartInfo
 $info.FileName=$exePath; $info.WorkingDirectory=$cwd
 $info.Arguments=(@($Arguments | ForEach-Object {ConvertTo-TikzNativeArgument $_}) -join ' ')
 $info.UseShellExecute=$false; $info.CreateNoWindow=$true
 $info.RedirectStandardOutput=$true; $info.RedirectStandardError=$true
 $info.StandardOutputEncoding=New-Object System.Text.UTF8Encoding($false)
 $info.StandardErrorEncoding=New-Object System.Text.UTF8Encoding($false)
 $p=New-Object System.Diagnostics.Process; $p.StartInfo=$info
 $timer=[Diagnostics.Stopwatch]::StartNew()
 try {
  if(-not $p.Start()){throw 'Native process did not start'}
  $outTask=$p.StandardOutput.ReadToEndAsync(); $errTask=$p.StandardError.ReadToEndAsync()
  $finished=$p.WaitForExit(1000*$TimeoutSeconds)
  if(-not $finished) {
   # Only this invocation's child tree, never runner or other applications.
   & "$env:SystemRoot\System32\taskkill.exe" /PID $p.Id /T /F | Out-Null
   if(-not $p.WaitForExit(10000)){throw 'Own timed-out child could not be reaped'}
  }
  $stdout=$outTask.GetAwaiter().GetResult(); $stderr=$errTask.GetAwaiter().GetResult()
  $timer.Stop(); $utf8=New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($LogPrefix+'.stdout.txt',$stdout,$utf8)
  [IO.File]::WriteAllText($LogPrefix+'.stderr.txt',$stderr,$utf8)
  $result=[pscustomobject]@{exit_code=$p.ExitCode;timed_out=(-not $finished);elapsed_ms=$timer.ElapsedMilliseconds;
    stdout=$stdout;stderr=$stderr;executable=$exePath;arguments=$Arguments}
  $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath ($LogPrefix+'.json') -Encoding UTF8
  return $result
 } finally { $p.Dispose() }
}
