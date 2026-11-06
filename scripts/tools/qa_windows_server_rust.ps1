# Trusted-main native Windows proof. Python is NOT a prerequisite for Rust or PE QA.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir)
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$OutputDir=(Resolve-Path -LiteralPath $OutputDir).Path
$report=[ordered]@{schema_version=2;status='INCOMPLETE';source_sha=$env:GITHUB_SHA;environment='USER_WINDOWS_SERVER_NOT_WIN10';rust_tests='NOT_RUN';release_build='NOT_RUN';gui_pe='NOT_RUN';cli_pe='NOT_RUN';crt_imports='NOT_RUN';portable_zip='NOT_RUN';interactive_gui='NOT_RUN';physical_windows10='NOT_RUN'}
$exitCode=1
try {
 $root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
 Push-Location $root
 try {
  $sha=(& git.exe rev-parse HEAD | Out-String).Trim()
  if($LASTEXITCODE -ne 0 -or $sha -cne $env:GITHUB_SHA){throw 'Exact trusted main SHA lease mismatch'}
  $report.os=(Get-CimInstance Win32_OperatingSystem).Caption
  $report.security=& (Join-Path $PSScriptRoot 'qa_windows_token.ps1')
  $report.session_id=$report.security.session_id
  $report.runner_elevated=$report.security.token_is_elevated
  . (Join-Path $PSScriptRoot 'tikzarium_rust_environment.ps1')
  . (Join-Path $PSScriptRoot 'windows_native_pe.ps1')
  . (Join-Path $PSScriptRoot '..\maintenance\native_process.ps1')
  $report.private_rust_executable=Use-TikzariumPrivateRust
  $cargo=Get-Command cargo.exe -ErrorAction SilentlyContinue
  if(-not $cargo){
   $candidate=Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
   if(Test-Path -LiteralPath $candidate -PathType Leaf){$env:PATH="$(Split-Path -Parent $candidate);$env:PATH";$cargo=Get-Command cargo.exe -ErrorAction SilentlyContinue}
  }
  if(-not $cargo){throw 'Existing cargo.exe not found; no automatic installation'}
  $report.rust_version=(& rustc.exe --version | Out-String).Trim()
  if($LASTEXITCODE -ne 0){throw 'rustc.exe failed'}
  $env:CARGO_BUILD_JOBS='1';$env:CARGO_INCREMENTAL='0'
  & cargo.exe test --locked --workspace -- --test-threads=1
  if($LASTEXITCODE -ne 0){throw 'Locked Windows Server Rust tests FAILED'}
  $report.rust_tests='PASS_WINDOWS_SERVER_NOT_WIN10'
  & cargo.exe build --locked --release -p tikzarium-app -p tikzarium-cli
  if($LASTEXITCODE -ne 0){throw 'Windows Server native release build FAILED'}
  $report.release_build='PASS_WINDOWS_SERVER_NOT_WIN10'
  $app=Get-TikzariumPortablePe -Path 'target\release\tikzarium-app.exe' -ExpectedSubsystem 2
  $cli=Get-TikzariumPortablePe -Path 'target\release\tikzarium-cli.exe' -ExpectedSubsystem 3
  $report.app_sha256=$app.sha256;$report.cli_sha256=$cli.sha256
  $report.gui_pe='PASS_WINDOWS_GUI_SUBSYSTEM_2';$report.cli_pe='PASS_WINDOWS_CLI_SUBSYSTEM_3'
  $report.crt_imports='PASS_NO_DYNAMIC_VCRUNTIME'
  @($app,$cli) | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $OutputDir 'native-pe-imports.json') -Encoding UTF8
  $dest=Join-Path $OutputDir 'native-release'
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Copy-Item -LiteralPath $app.path -Destination (Join-Path $dest 'tikzarium-app.exe') -Force
  Copy-Item -LiteralPath $cli.path -Destination (Join-Path $dest 'tikzarium-cli.exe') -Force
  $help=Invoke-TikzNative -Exe (Join-Path $dest 'tikzarium-cli.exe') -Arguments @('help','--all') -WorkingDirectory $dest -LogPrefix (Join-Path $OutputDir 'native-cli-help') -TimeoutSeconds 30
  if($help.timed_out -or $help.exit_code -ne 0 -or $help.stdout -notmatch 'tikz.circle'){throw 'Actual native CLI help failed'}
  $report.native_cli='PASS_ACTUAL_EXE_HELP'
  $zip=Join-Path $OutputDir 'Tikzarium-Windows-x64-native-server.zip'
  if(Test-Path -LiteralPath $zip){Remove-Item -LiteralPath $zip -Force}
  Compress-Archive -LiteralPath @((Join-Path $dest 'tikzarium-app.exe'),(Join-Path $dest 'tikzarium-cli.exe')) -DestinationPath $zip -CompressionLevel Optimal
  $report.portable_zip='PASS_NATIVE_EXE_ARCHIVE_NOT_GUI_QUALIFICATION'
  $report.portable_zip_sha256=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
  $report.status='PASS_NATIVE_RUST_PE_IMPORTS_AND_CLI_NOT_GUI'
  $exitCode=0
 } finally {Pop-Location}
} catch {
 $report.status='FAIL';$report.error=$_.Exception.Message
 Write-Error $report.error -ErrorAction Continue
} finally {
 $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $OutputDir 'windows-server-rust.json') -Encoding UTF8
}
exit $exitCode
