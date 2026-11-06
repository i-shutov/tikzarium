# Explicit owner-requested missing Rust C++ linker repair, no reboot.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir,[switch]$ProvisionMsvc)
$ErrorActionPreference='Stop'
if($env:GITHUB_REPOSITORY -cne 'i-shutov/tikzarium' -or $env:GITHUB_REF -cne 'refs/heads/main' -or $env:RUNNER_NAME -cne 'tikzarium-winserver'){throw 'Only trusted main personal runner'}
$OutputDir=(Resolve-Path -LiteralPath $OutputDir).Path
. (Join-Path $PSScriptRoot 'native_process.ps1')
$report=[ordered]@{status='INCOMPLETE';source_sha=$env:GITHUB_SHA;reboot_performed=$false;system_path_modified=$false;msvc_installed=$false}
$exit=1
try {
 $base=Get-Content -LiteralPath (Join-Path $OutputDir 'toolchain-repair.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 if($base.cargo -ne 'PASS_NATIVE_CARGO_AND_RUSTC'){throw 'Cargo provision must succeed before linker repair'}
 $cargo=$base.cargo_exe;$smoke=Join-Path $OutputDir 'cargo-smoke'
 if($base.rust_compile -ne 'PASS_NATIVE_CARGO_COMPILE_LINK_RUN' -and $ProvisionMsvc) {
  if($base.rust_compile_stderr -notmatch 'linker|link\.exe|kernel32\.lib|MSVC|Visual Studio'){throw 'Failure is not a missing MSVC linker/SDK; do not install unrelated software'}
  $cache=$env:RUNNER_TOOL_CACHE
  if([string]::IsNullOrWhiteSpace($cache)){throw 'Missing runner-specific tool cache'}
  $install=Join-Path $cache 'tikzarium-msvc'
  $free=(Get-PSDrive -Name ([IO.Path]::GetPathRoot($cache).Substring(0,1))).Free
  if($free -lt 15GB){throw 'Less than 15 GiB free: refuse C++ tool installation'}
  $exe=Join-Path $OutputDir 'vs_BuildTools.exe'
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -UseBasicParsing -Uri 'https://aka.ms/vs/17/release/vs_BuildTools.exe' -OutFile $exe -TimeoutSec 180
  $signature=Get-AuthenticodeSignature -LiteralPath $exe
  if($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft Corporation'){throw 'MSVC bootstrapper lacks valid Microsoft signature'}
  $report.bootstrapper_sha256=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant()
  Write-Host "Installing only official C++ x64 tools and Windows SDK for Cargo, no reboot: $install"
  $result=Invoke-TikzNative -Exe $exe -Arguments @('--quiet','--wait','--norestart','--nocache','--installPath',$install,'--add','Microsoft.VisualStudio.Component.VC.Tools.x86.x64','--add','Microsoft.VisualStudio.Component.Windows11SDK.26100') -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'msvc-install') -TimeoutSeconds 1800
  $report.installer_exit=$result.exit_code;$report.reboot_required=($result.exit_code -eq 3010)
  if($result.timed_out -or $result.exit_code -notin @(0,3010)){throw 'Official MSVC/SDK installation failed; see installer exit'}
  $report.msvc_installed=$true;$report.install_path=$install
 }
 $run=Invoke-TikzNative -Exe $cargo -Arguments @('run','--offline','--manifest-path',(Join-Path $smoke 'Cargo.toml')) -WorkingDirectory $smoke -LogPrefix (Join-Path $OutputDir 'cargo-final-smoke') -TimeoutSeconds 180
 $report.cargo_exit=$run.exit_code;$report.stdout=$run.stdout;$report.stderr=$run.stderr
 if($run.timed_out -or $run.exit_code -ne 0 -or $run.stdout -notmatch 'TIKZARIUM_CARGO_NATIVE_OK'){throw 'Native Cargo compile/link/run still failed'}
 $report.status='PASS_PERSONAL_SERVER_NATIVE_CARGO_COMPILE_LINK_RUN'
 $exit=0
} catch {$report.status='FAIL_CARGO_NATIVE_LINK';$report.error=$_.Exception.Message;Write-Error $report.error -ErrorAction Continue}
finally {$report | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $OutputDir 'cargo-final.json') -Encoding UTF8}
exit $exit
