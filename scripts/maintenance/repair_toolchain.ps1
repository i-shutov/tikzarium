# Explicit owner-directed maintenance; only dedicated reviewed-main TikZarium runner.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir,[switch]$ProvisionRust)
$ErrorActionPreference='Stop'
if($env:GITHUB_REPOSITORY -cne 'i-shutov/tikzarium' -or $env:GITHUB_REF -cne 'refs/heads/main' -or $env:RUNNER_NAME -cne 'tikzarium-winserver'){throw 'Only trusted main on tikzarium-winserver is permitted'}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$OutputDir=(Resolve-Path -LiteralPath $OutputDir).Path
. (Join-Path $PSScriptRoot 'native_process.ps1')
$report=[ordered]@{schema_version=2;source_sha=$env:GITHUB_SHA;status='INCOMPLETE';miktex='NOT_RUN';cargo='NOT_RUN';rust_compile='NOT_RUN';external_pdf='SEPARATE_FIXED_FIXTURE_STEP';no_miktex_install=$true;no_machine_path_change=$true;no_account_change=$true;physical_windows10='NOT_RUN'}
$report.os=(Get-CimInstance Win32_OperatingSystem).Caption
$report.session_id=(Get-Process -Id $PID).SessionId
$report.native_powershell=$PSVersionTable.PSVersion.ToString()
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
. (Join-Path $PSScriptRoot 'tex_launch_gate.ps1')
$texGate=Get-TikzariumMaintenanceTexGate
$report.tex_token_gate=$texGate.status
$report.tex_token_elevated=$texGate.token_is_elevated
$report.tex_token_integrity_rid=$texGate.token_integrity_rid
$report.tex_token_session_id=$texGate.session_id
$actual=(& 'C:\Program Files\Git\cmd\git.exe' -C $repoRoot rev-parse HEAD | Out-String).Trim()
if($LASTEXITCODE -ne 0 -or $actual -cne $env:GITHUB_SHA){throw 'Checkout SHA mismatch'}
try {
 if($texGate.status -cne 'ELIGIBLE_NON_ELEVATED_TOKEN'){throw 'MiKTeX NOT_RUN: token preflight blocked elevated or unknown token'}
 $engine=$env:TIKZARIUM_XELATEX
 if([string]::IsNullOrWhiteSpace($engine)) {
  $cmd=Get-Command xelatex.exe -ErrorAction SilentlyContinue
  $engine=if($cmd){$cmd.Source}else{Join-Path $env:ProgramFiles 'MiKTeX\miktex\bin\x64\xelatex.exe'}
 }
 $version=Invoke-TikzNative -Exe $engine -Arguments @('--disable-installer','--version') -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'xelatex-version')
 $report.miktex_exe=$version.executable;$report.miktex_exit=$version.exit_code
 $report.miktex_stderr=$version.stderr;$report.miktex_version=$version.stdout
 $report.miktex=if(-not $version.timed_out -and $version.exit_code -eq 0 -and $version.stdout -match 'MiKTeX-XeTeX'){'PASS_VERSION_NATIVE_EXIT_ZERO'}else{'FAIL_REAL_VERSION_OR_TIMEOUT'}
 $finder=Join-Path (Split-Path -Parent $engine) 'findtexmf.exe'
 $packages=@{}
 if(Test-Path -LiteralPath $finder -PathType Leaf) {
  # findtexmf does NOT support --disable-installer. Default lookup without
  # --must-exist does not install packages (documented MiKTeX contract).
  foreach($package in @('tikz.sty','fontspec.sty','standalone.cls','xelatex.fmt')) {
   $arguments=@($package)
   if($package -eq 'xelatex.fmt'){$arguments=@('--alias=xelatex','--the-name-of-the-game=xetex',$package)}
   $v=Invoke-TikzNative -Exe $finder -Arguments $arguments -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir ('find-'+$package.Replace('.','-')))
   $packages[$package]=@{exit_code=$v.exit_code;output=$v.stdout;stderr=$v.stderr}
  }
 }
 $report.miktex_files=$packages
 $oldLog=Join-Path $env:LOCALAPPDATA 'MiKTeX\miktex\log\findtexmf.log'
 if(Test-Path -LiteralPath $oldLog){Get-Content -LiteralPath $oldLog -Tail 60 | Set-Content (Join-Path $OutputDir 'findtexmf-original-log-tail.txt') -Encoding UTF8}
} catch {
 if($texGate.status -cne 'ELIGIBLE_NON_ELEVATED_TOKEN'){$report.miktex='ENVIRONMENT_BLOCKED_ELEVATED_OR_UNKNOWN'}
 else {$report.miktex='DIAGNOSTIC_EXCEPTION';$report.miktex_error=$_.Exception.Message}
}
$report | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutputDir 'toolchain-repair.json') -Encoding UTF8
try {
 $cache=$env:RUNNER_TOOL_CACHE
 if([string]::IsNullOrWhiteSpace($cache)){$cache=Join-Path (Split-Path -Parent (Split-Path -Parent $env:GITHUB_WORKSPACE)) '_tool'}
 $store=Join-Path $cache 'tikzarium-rust'
 $candidates=New-Object System.Collections.Generic.List[string]
 $cmd=Get-Command cargo.exe -ErrorAction SilentlyContinue
 if($cmd){$candidates.Add($cmd.Source)}
 if($env:CARGO_HOME){$candidates.Add((Join-Path $env:CARGO_HOME 'bin\cargo.exe'))}
 $candidates.Add((Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'))
 $candidates.Add((Join-Path $store 'cargo\bin\cargo.exe'))
 $report.cargo_candidates=@($candidates | ForEach-Object {@{path=$_;exists=(Test-Path -LiteralPath $_ -PathType Leaf)}})
 $cargo=@($candidates | Where-Object {Test-Path -LiteralPath $_ -PathType Leaf} | Select-Object -First 1)
 if($cargo.Count -eq 0 -and $ProvisionRust) {
  Write-Host "Owner-requested Rust 1.91.0 installation into $store"
  New-Item -ItemType Directory -Force -Path $store | Out-Null
  $env:CARGO_HOME=Join-Path $store 'cargo';$env:RUSTUP_HOME=Join-Path $store 'rustup'
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  $url='https://static.rust-lang.org/rustup/archive/1.28.2/x86_64-pc-windows-msvc/rustup-init.exe'
  $installer=Join-Path $store 'rustup-init-1.28.2.exe';$checksumFile=$installer+'.sha256'
  Invoke-WebRequest -UseBasicParsing -Uri ($url+'.sha256') -OutFile $checksumFile -TimeoutSec 60
  $expected=([IO.File]::ReadAllText($checksumFile).Trim() -split '\s+')[0].ToLowerInvariant()
  if($expected -notmatch '^[0-9a-f]{64}$'){throw 'Official checksum is not SHA256'}
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $installer -TimeoutSec 180
  $hash=(Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
  if($hash -cne $expected){throw 'Official rustup checksum mismatch'}
  $report.rustup_download=@{url=$url;sha256=$hash;cargo_home=$env:CARGO_HOME;rustup_home=$env:RUSTUP_HOME}
  $setup=Invoke-TikzNative -Exe $installer -Arguments @('-y','--no-modify-path','--profile','minimal','--default-host','x86_64-pc-windows-msvc','--default-toolchain','1.91.0') -WorkingDirectory $store -LogPrefix (Join-Path $OutputDir 'rustup-setup') -TimeoutSeconds 900
  if($setup.timed_out -or $setup.exit_code -ne 0){throw "Rust setup failed: exit=$($setup.exit_code), timeout=$($setup.timed_out)"}
  $cargo=@((Join-Path $env:CARGO_HOME 'bin\cargo.exe'));$report.rust_provisioned=$true
 }
 if($cargo.Count -eq 0){throw 'No Cargo in PATH, CARGO_HOME, user profile or dedicated cache'}
 $cargo=$cargo[0]
 if($cargo.StartsWith($store,[StringComparison]::OrdinalIgnoreCase)){$env:CARGO_HOME=Join-Path $store 'cargo';$env:RUSTUP_HOME=Join-Path $store 'rustup'}
 $bin=Split-Path -Parent $cargo;$env:PATH="$bin;$env:PATH"
 $cv=Invoke-TikzNative -Exe $cargo -Arguments @('--version') -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'cargo-version')
 $rv=Invoke-TikzNative -Exe (Join-Path $bin 'rustc.exe') -Arguments @('--version') -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'rustc-version')
 $report.cargo_exe=$cargo;$report.cargo_version=$cv.stdout;$report.rustc_version=$rv.stdout
 if($cv.exit_code -ne 0 -or $rv.exit_code -ne 0 -or $cv.timed_out -or $rv.timed_out){throw 'Cargo/rustc version execution failed'}
 $report.cargo='PASS_NATIVE_CARGO_AND_RUSTC'
 if($env:GITHUB_PATH){[IO.File]::AppendAllText($env:GITHUB_PATH,"$bin`n",(New-Object Text.UTF8Encoding($false)))}
 if($env:GITHUB_ENV -and $cargo.StartsWith($store,[StringComparison]::OrdinalIgnoreCase)){[IO.File]::AppendAllText($env:GITHUB_ENV,"CARGO_HOME=$env:CARGO_HOME`nRUSTUP_HOME=$env:RUSTUP_HOME`n",(New-Object Text.UTF8Encoding($false)))}
 $smoke=Join-Path $OutputDir 'cargo-smoke'
 New-Item -ItemType Directory -Force -Path (Join-Path $smoke 'src') | Out-Null
 $utf8=New-Object Text.UTF8Encoding($false)
 [IO.File]::WriteAllText((Join-Path $smoke 'Cargo.toml'),"[package]`nname = `"tikzarium_toolchain_smoke`"`nversion = `"0.0.0`"`nedition = `"2024`"`n",$utf8)
 [IO.File]::WriteAllText((Join-Path $smoke 'src\main.rs'),'fn main() { println!("TIKZARIUM_CARGO_NATIVE_OK"); }',$utf8)
 $build=Invoke-TikzNative -Exe $cargo -Arguments @('run','--offline','--manifest-path',(Join-Path $smoke 'Cargo.toml')) -WorkingDirectory $smoke -LogPrefix (Join-Path $OutputDir 'cargo-native-smoke') -TimeoutSeconds 120
 $report.cargo_smoke_exit=$build.exit_code
 $report.rust_compile=if(-not $build.timed_out -and $build.exit_code -eq 0 -and $build.stdout -match 'TIKZARIUM_CARGO_NATIVE_OK'){'PASS_NATIVE_CARGO_COMPILE_LINK_RUN'}else{'FAIL_NATIVE_LINK_OR_COMPILE'}
 $report.rust_compile_stderr=$build.stderr
} catch {$report.cargo_error=$_.Exception.Message;if($report.cargo -eq 'NOT_RUN'){$report.cargo='FAIL_DISCOVERY_OR_PROVISION'}}
$report.status=if($report.cargo -eq 'PASS_NATIVE_CARGO_AND_RUSTC' -and $report.rust_compile -eq 'PASS_NATIVE_CARGO_COMPILE_LINK_RUN' -and $report.miktex -eq 'PASS_VERSION_NATIVE_EXIT_ZERO'){'PASS_CARGO_NATIVE_AND_MIKTEX_VERSION_NOT_PDF'}else{'PARTIAL_TOOLCHAIN_REPAIR_SEE_EXACT_ERRORS'}
$report | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutputDir 'toolchain-repair.json') -Encoding UTF8
Write-Host "Cargo: $($report.cargo); native compile: $($report.rust_compile); MiKTeX: $($report.miktex)"
if($report.status -eq 'PARTIAL_TOOLCHAIN_REPAIR_SEE_EXACT_ERRORS'){exit 2}
