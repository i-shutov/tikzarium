[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir)
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$OutputDir=(Resolve-Path -LiteralPath $OutputDir).Path
. (Join-Path $PSScriptRoot 'native_process.ps1')
foreach($file in @('native_process.ps1','repair_toolchain.ps1','complete_msvc.ps1','prove_miktex_fixture.ps1','summarize_toolchain.ps1')) {
 $tokens=$null; $errors=$null
 [void][System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot $file),[ref]$tokens,[ref]$errors)
 if($errors.Count -gt 0){throw ($errors | Out-String)}
}
$exe=Join-Path $PSHOME 'powershell.exe';$child=Join-Path $OutputDir 'native-child.ps1'
$utf8=New-Object System.Text.UTF8Encoding($true)
[IO.File]::WriteAllText($child,'param([int]$Code=0) [Console]::Error.WriteLine("security risk: running with elevated privileges"); [Console]::Out.WriteLine("NATIVE_STDOUT_OK"); exit $Code',$utf8)
$ok=Invoke-TikzNative -Exe $exe -Arguments @('-NoProfile','-NonInteractive','-File',$child,'-Code','0') -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'warning-zero')
if($ok.exit_code -ne 0 -or $ok.timed_out -or $ok.stdout -notmatch 'NATIVE_STDOUT_OK' -or $ok.stderr -notmatch 'security risk'){throw 'stderr warning incorrectly classified as native failure'}
$bad=Invoke-TikzNative -Exe $exe -Arguments @('-NoProfile','-NonInteractive','-File',$child,'-Code','7') -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'warning-seven')
if($bad.exit_code -ne 7 -or $bad.timed_out){throw 'Nonzero native exit code lost'}
[IO.File]::WriteAllText($child,'Start-Sleep -Seconds 25',$utf8)
$timeout=Invoke-TikzNative -Exe $exe -Arguments @('-NoProfile','-NonInteractive','-File',$child) -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'timeout') -TimeoutSeconds 1
if(-not $timeout.timed_out){throw 'Process timeout was not enforced'}
# Regression: PS5.1 Invoke-WebRequest Content may be Byte[], never assume .Trim().
$expected=('a'*64);$digest=Join-Path $OutputDir 'mock.sha256'
[IO.File]::WriteAllBytes($digest,[Text.Encoding]::ASCII.GetBytes($expected+'  rustup-init.exe'))
$parsed=([IO.File]::ReadAllText($digest).Trim() -split '\s+')[0].ToLowerInvariant()
if($parsed -cne $expected){throw 'Checksum byte response parsing regression'}
$fixture=Join-Path $PSScriptRoot 'trusted-compiler-smoke.tex'
if((Get-FileHash -LiteralPath $fixture -Algorithm SHA256).Hash.ToLowerInvariant() -cne 'c281d346bc7f99abc205c337efff0215958fa1eba2affa5790b295a62f24a1a8'){throw 'Fixed reviewed TeX fixture has incorrect checkout bytes'}
@{status='PASS_NATIVE_STDERR_EXIT_TIMEOUT_CHECKSUM_FIXED_FIXTURE_PS51';powershell=$PSVersionTable.PSVersion.ToString();tests=5} | ConvertTo-Json | Set-Content (Join-Path $OutputDir 'selftest.json') -Encoding UTF8
Write-Host 'PASS: stderr+exit0; true exit7; timeout; checksum bytes; fixed TeX SHA.'
