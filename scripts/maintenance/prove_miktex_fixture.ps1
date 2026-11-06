# Owner-directed ONE fixed known-source MiKTeX diagnostic, not arbitrary document execution.
# Current-user Administrator is supported; no UAC/account changes or warning suppression.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir)
$ErrorActionPreference='Stop'
if($env:GITHUB_REPOSITORY -cne 'i-shutov/tikzarium' -or $env:GITHUB_REF -cne 'refs/heads/main' -or $env:RUNNER_NAME -cne 'tikzarium-winserver'){throw 'Only trusted main personal runner'}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$OutputDir=(Resolve-Path -LiteralPath $OutputDir).Path
. (Join-Path $PSScriptRoot 'native_process.ps1')
$report=[ordered]@{status='INCOMPLETE';source_sha=$env:GITHUB_SHA;scope='FIXED_REVIEWED_MAINTENANCE_FIXTURE_ONLY';execution_policy='CURRENT_USER_ADMIN_SUPPORTED_NOT_SANDBOX';gui='NOT_RUN';shell_escape='DISABLED';package_install='DISABLED';warning_suppression=$false;physical_windows10='NOT_RUN'}
$exit=1
. (Join-Path $PSScriptRoot 'tex_launch_gate.ps1')
$texGate=Get-TikzariumMaintenanceTexGate
$report.tex_token_gate=$texGate.status
$report.tex_token_elevated=$texGate.token_is_elevated
$report.tex_token_integrity_rid=$texGate.token_integrity_rid
$report.tex_token_session_id=$texGate.session_id
if($texGate.status -cne 'ELIGIBLE_CURRENT_USER_TOKEN'){
  $report.status='ENVIRONMENT_BLOCKED_UNSUPPORTED_TOKEN'
  $report | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutputDir 'miktex-fixed-fixture.json') -Encoding UTF8
  Write-Host 'MiKTeX fixed fixture NOT_RUN: unknown/SYSTEM or noninteractive maintenance context'
  exit 3
}
try {
 $input=Join-Path $PSScriptRoot 'trusted-compiler-smoke.tex'
 $expected='c281d346bc7f99abc205c337efff0215958fa1eba2affa5790b295a62f24a1a8'
 if((Get-FileHash -LiteralPath $input -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected){throw 'Fixed trusted source hash mismatch: no other TeX may run'}
 $engine=Join-Path $env:ProgramFiles 'MiKTeX\miktex\bin\x64\xelatex.exe'
 $miktex=Join-Path (Split-Path -Parent $engine) 'miktex.exe'
 $inventoryArgs=@('--disable-installer','packages','list','--template','{id}|{isInstalled}')
 $before=Invoke-TikzNative -Exe $miktex -Arguments $inventoryArgs -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'packages-before') -TimeoutSeconds 90
 if($before.exit_code -ne 0 -or $before.timed_out){throw 'Cannot establish unchanged package inventory before fixed fixture'}
 $work=Join-Path $OutputDir 'fixed-tex'
 New-Item -ItemType Directory -Force -Path $work | Out-Null
 $source=Join-Path $work 'trusted-compiler-smoke.tex'
 Copy-Item -LiteralPath $input -Destination $source -Force
 $report.fixture_sha256=$expected
 $pdf=Join-Path $work 'trusted-compiler-smoke.pdf'
 if(Test-Path -LiteralPath $pdf){Remove-Item -LiteralPath $pdf -Force}
 $result=Invoke-TikzNative -Exe $engine -Arguments @('--disable-installer','--disable-write18','--dont-parse-first-line','-halt-on-error','-interaction=nonstopmode','-file-line-error','-recorder',('-output-directory='+$work),$source) -WorkingDirectory $work -LogPrefix (Join-Path $OutputDir 'fixed-xelatex') -TimeoutSeconds 120
 $report.tex_exit=$result.exit_code;$report.tex_timed_out=$result.timed_out;$report.stderr=$result.stderr
 $after=Invoke-TikzNative -Exe $miktex -Arguments $inventoryArgs -WorkingDirectory $OutputDir -LogPrefix (Join-Path $OutputDir 'packages-after') -TimeoutSeconds 90
 if($after.exit_code -ne 0 -or $after.timed_out){throw 'Cannot confirm package inventory after fixed fixture'}
 $rowsBefore=@($before.stdout -split '\r?\n' | Where-Object {$_ -match '\|(true|false)$'} | Sort-Object)
 $rowsAfter=@($after.stdout -split '\r?\n' | Where-Object {$_ -match '\|(true|false)$'} | Sort-Object)
 if($rowsBefore.Count -lt 1 -or (Compare-Object $rowsBefore $rowsAfter)){throw 'Package inventory changed or was not canonical'}
 $report.packages_unchanged=$true;$report.package_rows=$rowsAfter.Count
 if($result.exit_code -ne 0 -or $result.timed_out -or -not (Test-Path -LiteralPath $pdf)){throw 'Real fixed-fixture XeLaTeX did not produce PDF'}
 if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected){throw 'Source changed during compilation'}
 $report.pdf_sha256=(Get-FileHash -LiteralPath $pdf -Algorithm SHA256).Hash.ToLowerInvariant()
 $report.status='PASS_FIXED_TRUSTED_MIKTEX_PDF_NOT_GENERAL_ADMIN_SANDBOX'
 $report.font_and_text_audit='PENDING_INDEPENDENT_ARTIFACT_REVIEW'
 $exit=0
} catch {$report.status='FAIL_FIXED_MIKTEX_DIAGNOSTIC';$report.error=$_.Exception.Message;Write-Error $report.error -ErrorAction Continue}
finally {$report | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutputDir 'miktex-fixed-fixture.json') -Encoding UTF8}
exit $exit
