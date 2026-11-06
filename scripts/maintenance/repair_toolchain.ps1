# Explicit owner-directed maintenance; NOT the normal product or release proof.
# Only this repository's dedicated runner, trusted main. No MiKTeX/OS/account changes.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir,[switch]$ProvisionRust)
$ErrorActionPreference='Stop'
if($env:GITHUB_REPOSITORY -cne 'i-shutov/tikzarium' -or $env:GITHUB_REF -cne 'refs/heads/main' -or $env:RUNNER_NAME -cne 'tikzarium-winserver') {throw 'Maintenance is restricted to trusted main on tikzarium-winserver'}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$OutputDir=(Resolve-Path -LiteralPath $OutputDir).Path
. (Join-Path $PSScriptRoot 'native_process.ps1')
$report=[ordered]@{schema_version=1;source_sha=$env:GITHUB_SHA;status='INCOMPLETE';
 miktex='NOT_RUN';cargo='NOT_RUN';rust_compile='NOT_RUN';external_pdf='NOT_RUN_NO_APPROVED_CHILD';
 no_miktex_install=$true;no_machine_path_change=$true;no_account_change=$true;physical_windows10='NOT_RUN'}
$report.os=(Get-CimInstance Win32_OperatingSystem).Caption
$report.session_id=(Get-Process -Id $PID).SessionId
$report.profile=$env:USERPROFILE
$report.native_powershell=$PSVersionTable.PSVersion.ToString()
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$actual=(& 'C:\Program Files\Git\cmd\git.exe' -C $repoRoot rev-parse HEAD | Out-String).Trim()
if($LASTEXITCODE -ne 0 -or $actual -cne $env:GITHUB_SHA){throw 'Maintenance checkout SHA mismatch'}
try {
 # DIAGNOSTIC ONLY: --version cannot compile any user-controlled TeX.
 # Keep both streams and actual ExitCode, even under Administrator/PS5.1.
 $engine=$env:TIKZARIUM_XELATEX
 if([string]::IsNullOrWhiteSpace($engine)) {
  $candidate=Get-Command xelatex.exe -ErrorAction SilentlyContinue
  if($candidate){$engine=$candidate.Source}
  else {$engine=Join-Path $env:ProgramFiles 'MiKTeX\miktex\bin\x64\xelatex.exe'}
 }
 if(Test-Path -LiteralPath $engine -PathType Leaf) {
  $version=Invoke-TikzNative -Exe $engine -Arguments @('--disable-installer','--version') -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'xelatex-version')
  $report.miktex_exe=$version.executable
  $report.miktex_exit=$version.exit_code
  $report.miktex_stderr=$version.stderr
  $report.miktex_version=$version.stdout
  if(-not $version.timed_out -and $version.exit_code -eq 0 -and $version.stdout -match 'MiKTeX-XeTeX') {$report.miktex='PASS_VERSION_NATIVE_EXIT_ZERO'}
  else {$report.miktex='FAIL_REAL_VERSION_OR_TIMEOUT'}
  $finder=Join-Path (Split-Path -Parent $engine) 'findtexmf.exe'
  $packages=@{}
  if(Test-Path -LiteralPath $finder -PathType Leaf) {
   foreach($package in @('tikz.sty','fontspec.sty','standalone.cls','xelatex.fmt')) {
    $label=$package.Replace('.','-')
    $v=Invoke-TikzNative -Exe $finder -Arguments @('--disable-installer',$package) -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir "find-$label")
    $packages[$package]=@{exit_code=$v.exit_code;output=$v.stdout;stderr=$v.stderr}
   }
  }
  $report.miktex_files=$packages
 } else {$report.miktex='MISSING_SELECTED_EXECUTABLE';$report.miktex_exe=$engine}
} catch {$report.miktex='DIAGNOSTIC_EXCEPTION';$report.miktex_error=$_.Exception.Message}
# Publish partial diagnostics before any permitted Rust download.
$report | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutputDir 'toolchain-repair.json') -Encoding UTF8
try {
 $store=Join-Path $env:RUNNER_TOOL_CACHE 'tikzarium-rust'
 if([string]::IsNullOrWhiteSpace($env:RUNNER_TOOL_CACHE)){$store=Join-Path (Split-Path -Parent (Split-Path -Parent $env:GITHUB_WORKSPACE)) '_tool\tikzarium-rust'}
 $cargoPaths=New-Object System.Collections.Generic.List[string]
 $command=Get-Command cargo.exe -ErrorAction SilentlyContinue
 if($command){$cargoPaths.Add($command.Source)}
 if($env:CARGO_HOME){$cargoPaths.Add((Join-Path $env:CARGO_HOME 'bin\cargo.exe'))}
 $cargoPaths.Add((Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'))
 $cargoPaths.Add((Join-Path $store 'cargo\bin\cargo.exe'))
 $report.cargo_candidates=@($cargoPaths | ForEach-Object {@{path=$_;exists=(Test-Path -LiteralPath $_ -PathType Leaf)}})
 $cargo=@($cargoPaths | Where-Object {Test-Path -LiteralPath $_ -PathType Leaf} | Select-Object -First 1)
 if($cargo.Count -eq 0 -and $ProvisionRust) {
  Write-Host "Owner-requested Rust 1.91.0 installation into dedicated TikZarium cache: $store"
  New-Item -ItemType Directory -Force -Path $store | Out-Null
  $env:CARGO_HOME=Join-Path $store 'cargo';$env:RUSTUP_HOME=Join-Path $store 'rustup'
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  $url='https://static.rust-lang.org/rustup/archive/1.28.2/x86_64-pc-windows-msvc/rustup-init.exe'
  $installer=Join-Path $store 'rustup-init-1.28.2.exe'
  $checksum=Invoke-WebRequest -UseBasicParsing -Uri ($url+'.sha256') -TimeoutSec 60
  $expected=($checksum.Content.Trim() -split '\s+')[0].ToLowerInvariant()
  if($expected -notmatch '^[0-9a-f]{64}$'){throw 'Official rustup checksum is not SHA256'}
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $installer -TimeoutSec 180
  $hash=(Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
  if($hash -cne $expected){throw 'Official rustup installer checksum mismatch'}
  $report.rustup_download=@{url=$url;sha256=$hash;cargo_home=$env:CARGO_HOME;rustup_home=$env:RUSTUP_HOME}
  $setup=Invoke-TikzNative -Exe $installer -Arguments @('-y','--no-modify-path','--profile','minimal','--default-host','x86_64-pc-windows-msvc','--default-toolchain','1.91.0') -WorkingDirectory $store -LogPrefix (Join-Path $OutputDir 'rustup-setup') -TimeoutSeconds 900
  if($setup.timed_out -or $setup.exit_code -ne 0){throw "Rust 1.91.0 setup failed: exit=$($setup.exit_code), timeout=$($setup.timed_out)"}
  $cargo=@((Join-Path $env:CARGO_HOME 'bin\cargo.exe'))
  $report.rust_provisioned=$true
 }
 if($cargo.Count -eq 0){throw 'No Cargo in actual PATH, CARGO_HOME, user profile or dedicated cache'}
 $cargo=$cargo[0]
 if($cargo.StartsWith($store,[StringComparison]::OrdinalIgnoreCase)) {
  $env:CARGO_HOME=Join-Path $store 'cargo';$env:RUSTUP_HOME=Join-Path $store 'rustup'
 }
 $bin=Split-Path -Parent $cargo
 $env:PATH="$bin;$env:PATH"
 $rustc=Join-Path $bin 'rustc.exe'
 $cv=Invoke-TikzNative -Exe $cargo -Arguments @('--version') -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'cargo-version')
 $rv=Invoke-TikzNative -Exe $rustc -Arguments @('--version') -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'rustc-version')
 $report.cargo_exe=$cargo;$report.cargo_version=$cv.stdout;$report.rustc_version=$rv.stdout
 if($cv.exit_code -ne 0 -or $rv.exit_code -ne 0 -or $cv.timed_out -or $rv.timed_out){throw 'Cargo/rustc actual version execution failed'}
 $report.cargo='PASS_NATIVE_CARGO_AND_RUSTC'
 if($env:GITHUB_PATH){[IO.File]::AppendAllText($env:GITHUB_PATH,"$bin`n",(New-Object Text.UTF8Encoding($false)))}
 if($env:GITHUB_ENV -and $cargo.StartsWith($store,[StringComparison]::OrdinalIgnoreCase)) {
  [IO.File]::AppendAllText($env:GITHUB_ENV,"CARGO_HOME=$env:CARGO_HOME`nRUSTUP_HOME=$env:RUSTUP_HOME`n",(New-Object Text.UTF8Encoding($false)))
 }
 $smoke=Join-Path $OutputDir 'cargo-smoke'
 New-Item -ItemType Directory -Force -Path (Join-Path $smoke 'src') | Out-Null
 $utf8=New-Object Text.UTF8Encoding($false)
 [IO.File]::WriteAllText((Join-Path $smoke 'Cargo.toml'),"[package]`nname = `"tikzarium_toolchain_smoke`"`nversion = `"0.0.0`"`nedition = `"2024`"`n",$utf8)
 [IO.File]::WriteAllText((Join-Path $smoke 'src\main.rs'),'fn main() { println!("TIKZARIUM_CARGO_NATIVE_OK"); }',$utf8)
 $build=Invoke-TikzNative -Exe $cargo -Arguments @('run','--offline','--manifest-path',(Join-Path $smoke 'Cargo.toml')) -WorkingDirectory $smoke -LogPrefix (Join-Path $OutputDir 'cargo-native-smoke') -TimeoutSeconds 120
 $report.cargo_smoke_exit=$build.exit_code
 if(-not $build.timed_out -and $build.exit_code -eq 0 -and $build.stdout -match 'TIKZARIUM_CARGO_NATIVE_OK'){$report.rust_compile='PASS_NATIVE_CARGO_COMPILE_LINK_RUN'}
 else {$report.rust_compile='FAIL_NATIVE_LINK_OR_COMPILE';$report.rust_compile_stderr=$build.stderr}
 $vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
 if(Test-Path -LiteralPath $vswhere -PathType Leaf) {
  $vs=Invoke-TikzNative -Exe $vswhere -Arguments @('-latest','-products','*','-requires','Microsoft.VisualStudio.Component.VC.Tools.x86.x64','-property','installationPath') -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'msvc-location')
  $report.msvc_location=$vs.stdout
 } else {$report.msvc_location='VSWHERE_NOT_FOUND'}
} catch {$report.cargo_error=$_.Exception.Message;if($report.cargo -eq 'NOT_RUN'){$report.cargo='FAIL_DISCOVERY_OR_PROVISION'}}
$complete=($report.cargo -eq 'PASS_NATIVE_CARGO_AND_RUSTC' -and $report.rust_compile -eq 'PASS_NATIVE_CARGO_COMPILE_LINK_RUN' -and $report.miktex -eq 'PASS_VERSION_NATIVE_EXIT_ZERO')
$report.status=if($complete){'PASS_CARGO_NATIVE_AND_MIKTEX_VERSION_NOT_PDF'}else{'PARTIAL_TOOLCHAIN_REPAIR_SEE_EXACT_ERRORS'}
$report | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutputDir 'toolchain-repair.json') -Encoding UTF8
Write-Host "Cargo: $($report.cargo); compile: $($report.rust_compile); MiKTeX: $($report.miktex)"
if(-not $complete){exit 2}
