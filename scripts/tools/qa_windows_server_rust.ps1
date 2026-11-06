# Trusted-main TikZarium dedicated Windows Server native Rust/portable proof.
# NO MiKTeX invocation, no package installation, no GUI claims, no PR code.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir)
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$report=[ordered]@{
 schema_version=1;status='INCOMPLETE';source_sha=$env:GITHUB_SHA
 environment='USER_WINDOWS_SERVER_NOT_WIN10';rust_tests='NOT_RUN'
 release_build='NOT_RUN';gui_pe='NOT_RUN';cli_pe='NOT_RUN'
 portable_zip='NOT_RUN';interactive_gui='NOT_RUN';physical_windows10='NOT_RUN'
}
$exitCode=1
try {
 $root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
 Push-Location $root
 try {
  $sha=(& git.exe rev-parse HEAD | Out-String).Trim()
  if($LASTEXITCODE -ne 0 -or $sha -cne $env:GITHUB_SHA){throw 'Exact trusted main SHA lease mismatch'}
  $report.os=(Get-CimInstance Win32_OperatingSystem).Caption
  $report.session_id=(Get-Process -Id $PID).SessionId
  $principal=New-Object System.Security.Principal.WindowsPrincipal([System.Security.Principal.WindowsIdentity]::GetCurrent())
  $report.runner_elevated=$principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
  $cargo=Get-Command cargo.exe -ErrorAction SilentlyContinue
  if(-not $cargo) {
   $candidate=Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
   if(Test-Path -LiteralPath $candidate -PathType Leaf){
    $env:PATH="$(Split-Path -Parent $candidate);$env:PATH"
    $cargo=Get-Command cargo.exe -ErrorAction SilentlyContinue
   }
  }
  if(-not $cargo){throw 'cargo.exe is not installed/visible to this runner user; NO CI auto-install'}
  $report.rust_version=(& rustc.exe --version | Out-String).Trim()
  if($LASTEXITCODE -ne 0){throw 'rustc.exe missing'}
  $env:CARGO_BUILD_JOBS='1'
  $env:CARGO_INCREMENTAL='0'
  & cargo.exe test --locked --workspace -- --test-threads=1
  if($LASTEXITCODE -ne 0){throw 'Locked Windows Server Rust workspace tests FAILED'}
  $report.rust_tests='PASS_WINDOWS_SERVER_NOT_WIN10'
  & cargo.exe build --locked --release -p tikzarium-app -p tikzarium-cli
  if($LASTEXITCODE -ne 0){throw 'Windows Server native release build FAILED'}
  $report.release_build='PASS_WINDOWS_SERVER_NOT_WIN10'
  function PEHash([string]$path,[int]$expected) {
   if(-not (Test-Path -LiteralPath $path -PathType Leaf)){throw "Missing binary $path"}
   $bytes=[System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $path).Path)
   if($bytes.Length -lt 128 -or $bytes[0] -ne 77 -or $bytes[1] -ne 90){throw "Invalid MZ $path"}
   $offset=[BitConverter]::ToInt32($bytes,0x3c)
   if($offset -lt 64 -or $offset + 96 -gt $bytes.Length){throw "Invalid PE offset $path"}
   if($bytes[$offset] -ne 80 -or $bytes[$offset+1] -ne 69 -or $bytes[$offset+2] -ne 0 -or $bytes[$offset+3] -ne 0){throw "Invalid PE signature $path"}
   $optional=[BitConverter]::ToUInt16($bytes,$offset+20)
   if($optional -lt 70 -or $offset+24+$optional -gt $bytes.Length){throw "Truncated PE32+ header $path"}
   if([BitConverter]::ToUInt16($bytes,$offset+4) -ne 0x8664 -or [BitConverter]::ToUInt16($bytes,$offset+24) -ne 0x20b){throw "Wrong target PE AMD64 $path"}
   $actual=[BitConverter]::ToUInt16($bytes,$offset+92)
   if($actual -ne $expected){throw "Windows PE subsystem $actual expected $expected for $path"}
   return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
  }
  $app='target\release\tikzarium-app.exe'
  $cli='target\release\tikzarium-cli.exe'
  $report.app_sha256=PEHash $app 2
  $report.gui_pe='PASS_WINDOWS_GUI_SUBSYSTEM_2'
  $report.cli_sha256=PEHash $cli 3
  $report.cli_pe='PASS_WINDOWS_CLI_SUBSYSTEM_3'
  $dest=Join-Path $OutputDir 'native-release'
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Copy-Item -LiteralPath $app -Destination (Join-Path $dest 'tikzarium-app.exe')
  Copy-Item -LiteralPath $cli -Destination (Join-Path $dest 'tikzarium-cli.exe')
  $report.crt_imports='NOT_RUN_PYTHON_NOT_INSTALLED'
  $python=Get-Command python.exe -ErrorAction SilentlyContinue
  if($python) {
   & python.exe scripts/qa_windows_crt.py $app $cli
   if($LASTEXITCODE -ne 0){throw 'Windows native release depends on external VC runtime or has invalid PE imports'}
   $report.crt_imports='PASS_NO_DYNAMIC_VCRUNTIME'

   $zip=Join-Path $OutputDir 'Tikzarium-Windows-x64-portable-candidate.zip'
   $runUrl="https://github.com/i-shutov/tikzarium/actions/runs/$env:GITHUB_RUN_ID"
   & python.exe scripts/package_n5_preview.py --platform windows10-x64 --app $app --cli $cli --app-sha256 $report.app_sha256 --cli-sha256 $report.cli_sha256 --source-sha $sha --ci-run-url $runUrl --output $zip
   if($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $zip -PathType Leaf)){throw 'Portable Windows ZIP packaging FAILED'}
   $report.portable_zip='PASS_PACKAGED_NOT_GUI_TESTED'
   $report.portable_zip_sha256=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
  } else {
   $report.portable_zip='NOT_RUN_PYTHON_NOT_INSTALLED'
  }
  $report.status='PASS_NATIVE_RUST_AND_PE_NOT_GUI'
  $exitCode=0
 }finally{Pop-Location}
}catch{
 $report.status='FAIL'
 $report.error=$_.Exception.Message
 Write-Error $report.error -ErrorAction Continue
}finally{
 $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $OutputDir 'windows-server-rust.json') -Encoding utf8
}
exit $exitCode
