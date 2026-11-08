# TikZarium personal self-hosted runner: read-only evidence/transport diagnostics.
# Does not install, configure, change accounts, inspect foreign windows or upload files.
[CmdletBinding()]
param([string]$OutputDir, [switch]$SelfTest, [string]$Stage = 'after-w2')
$ErrorActionPreference = 'Stop'

function Get-W2SafeValue($Object, [string]$Property) {
 if ($null -eq $Object) { return 'NOT_RECORDED' }
 $value = $Object.$Property
 if ($null -eq $value) { return 'NOT_RECORDED' }
 if ($value -is [string] -and $value.Length -gt 140) { return 'TOO_LONG_NOT_EMITTED' }
 if ($value -is [string] -or $value -is [bool] -or $value -is [ValueType]) { return $value }
 return 'NON_SCALAR_NOT_EMITTED'
}
function Get-W2SafeSummary($Report) {
 $f = $Report.foreground_ownership
 return [ordered]@{
  status = Get-W2SafeValue $Report 'status'
  source_sha = Get-W2SafeValue $Report 'source_sha'
  schema_version = Get-W2SafeValue $Report 'schema_version'
  preflight = Get-W2SafeValue $Report 'preflight'
  f1 = Get-W2SafeValue $Report 'f1'
  window_screenshot = Get-W2SafeValue $Report 'window_screenshot'
  full_w2_qualification = Get-W2SafeValue $Report 'full_w2_qualification'
  physical_windows10 = Get-W2SafeValue $Report 'physical_windows10'
  focus_outcome = Get-W2SafeValue $f 'outcome'
  focus_reason = Get-W2SafeValue $f 'reason'
  window_dpi = Get-W2SafeValue $Report.window 'dpi'
  png_before_sha256 = Get-W2SafeValue $Report 'first_png_sha256'
  png_after_sha256 = Get-W2SafeValue $Report 'second_png_sha256'
 }
}
function Test-W2Tcp443([string]$DnsName) {
 # Do not send credentials, proxy details or arbitrary user data.
 $result = [ordered]@{host=$DnsName;dns='UNKNOWN';tcp443='UNKNOWN'}
 try {
  $addresses=[Net.Dns]::GetHostAddresses($DnsName)
  if ($null -eq $addresses -or $addresses.Length -eq 0) { $result.dns='EMPTY'; $result.tcp443='NOT_CHECKED'; return [PSCustomObject]$result }
  $result.dns='RESOLVED'
  $client=New-Object Net.Sockets.TcpClient
  try {
   $async=$client.BeginConnect($DnsName,443,$null,$null)
   if (-not $async.AsyncWaitHandle.WaitOne(3500,$false)) { $result.tcp443='TIMEOUT' }
   else {
    try { $client.EndConnect($async); $result.tcp443='CONNECTED' }
    catch { $result.tcp443='FAILED' }
   }
  } finally { $client.Dispose() }
 } catch { $result.dns='FAILED'; $result.tcp443='NOT_CHECKED' }
 return [PSCustomObject]$result
}
if ($SelfTest) {
 $example=[PSCustomObject]@{status='BLOCKED_FOREGROUND_NOT_OWNED';source_sha=('a'*40);foreground_ownership=[PSCustomObject]@{outcome='BLOCKED';reason='NO_FOREGROUND_WINDOW'};window=[PSCustomObject]@{dpi=120};f1='NOT_RUN';physical_windows10='NOT_RUN'}
 $r=Get-W2SafeSummary $example
 if ($r.status -cne 'BLOCKED_FOREGROUND_NOT_OWNED' -or $r.focus_reason -cne 'NO_FOREGROUND_WINDOW' -or $r.window_dpi -ne 120 -or $r.physical_windows10 -cne 'NOT_RUN') { throw 'W2 safe summary contract failed' }
 $example.foreground_ownership.reason='x'*1000
 $r=Get-W2SafeSummary $example
 if ($r.focus_reason -cne 'TOO_LONG_NOT_EMITTED') { throw 'Sensitive/long diagnostic must be redacted' }
 Write-Host 'TIKZARIUM_W2_TRANSPORT_PROBE_SELFTEST=PASS_NO_NETWORK_NO_MUTATIONS'
 return
}
if ([string]::IsNullOrWhiteSpace($OutputDir)) { throw 'OutputDir required for evidence diagnostic' }
$existing=Test-Path -LiteralPath $OutputDir -PathType Container
if(-not $existing) { New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null }
$w2=Join-Path $OutputDir 'windows-server-w2-interactive.json'
$summary=[ordered]@{stage=$Stage;source_sha=$env:GITHUB_SHA;w2_json_present=(Test-Path -LiteralPath $w2 -PathType Leaf);w2_status='NOT_AVAILABLE';available_disk=@();artifact_endpoints=@()}
if($summary.w2_json_present){
 try { $report=Get-Content -LiteralPath $w2 -Raw -Encoding UTF8 | ConvertFrom-Json; $summary.w2_status=Get-W2SafeSummary $report }
 catch { $summary.w2_status='UNREADABLE_OR_INVALID_JSON' }
}
try {
 $summary.available_disk=@(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' -ErrorAction Stop | ForEach-Object {
  [ordered]@{drive=$_.DeviceID;available_gb=[Math]::Round($_.FreeSpace/1GB,2);total_gb=[Math]::Round($_.Size/1GB,2)}
 })
} catch { $summary.available_disk=@(@{status='NOT_CHECKED'}) }
$hosts=@('github.com','api.github.com','results-receiver.actions.githubusercontent.com')
$summary.artifact_endpoints=@($hosts | ForEach-Object { Test-W2Tcp443 $_ })
$json=ConvertTo-Json -InputObject $summary -Depth 8 -Compress
Write-Host ('TIKZARIUM_W2_TRANSPORT_DIAG=' + $json)
$reportFile=Join-Path $OutputDir ('w2-transport-'+($Stage -replace '[^a-zA-Z0-9-]','-')+'.json')
[IO.File]::WriteAllText($reportFile,(ConvertTo-Json -InputObject $summary -Depth 8),[Text.UTF8Encoding]::new($false))
if ($env:GITHUB_STEP_SUMMARY -and (Test-Path -LiteralPath (Split-Path -Parent $env:GITHUB_STEP_SUMMARY))) {
 try {
  Add-Content -LiteralPath $env:GITHUB_STEP_SUMMARY -Encoding UTF8 -Value @(
   ('### TikZarium personal W2 transport: ' + $Stage),
   ('Source SHA: `'+$env:GITHUB_SHA+'`'),
   ('Evidence JSON present: `'+$summary.w2_json_present+'`'),
   ('Evidence state: `'+$summary.w2_status.status+'`'),
   ('Network endpoints: '+(($summary.artifact_endpoints | ForEach-Object { $_.host+':'+$_.dns+'/'+$_.tcp443 }) -join '; ')),
   'Green workflow or reachable TCP alone is not a W2 PASS. Original PNGs remain mandatory.'
  )
 } catch { Write-Warning 'W2 transport summary could not be written' }
}
