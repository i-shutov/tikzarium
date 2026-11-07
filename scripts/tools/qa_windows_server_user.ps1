# Existing user MiKTeX + actual TikZarium CLI. Current Administrator is supported.
# No UAC/account/registry/package/font changes. Warnings are retained, not errors.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir,[switch]$CheckRust)
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$OutputDir=(Resolve-Path -LiteralPath $OutputDir).Path
$report=[ordered]@{schema_version=2;status='INCOMPLETE';environment='USER_WINDOWS_SERVER';physical_windows10='NOT_RUN';mac_m1_m4='NOT_RUN';interactive_gui='NOT_RUN';cargo='NOT_RUN';font_audit='PENDING_INDEPENDENT_UPLOADED_PDF_AUDIT';text_audit='PENDING_INDEPENDENT_UPLOADED_PDF_AUDIT';raster='NOT_RUN';package_autoinstall='DISABLED_BY_PRODUCT';shell_escape='DISABLED_BY_PRODUCT';execution_policy='CURRENT_USER_ADMIN_SUPPORTED_NOT_SANDBOX'}
$report.expected_text=@('Тест XeLaTeX','Кириллица','Точка')
$exitCode=1
try {
 $root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
 . (Join-Path $PSScriptRoot '..\maintenance\native_process.ps1')
 Push-Location $root
 try {
  $sha=(& git.exe rev-parse HEAD | Out-String).Trim()
  if($LASTEXITCODE -ne 0 -or $sha -cne $env:GITHUB_SHA){throw 'Exact trusted main SHA lease mismatch'}
  $report.sha=$sha;$report.timestamp_utc=[DateTime]::UtcNow.ToString('o')
  $os=Get-CimInstance Win32_OperatingSystem;$report.os=$os.Caption;$report.build=$os.BuildNumber
  $security=& (Join-Path $PSScriptRoot 'qa_windows_token.ps1')
  $report.security=$security;$report.runner_session_id=$security.session_id;$report.runner_elevated=$security.token_is_elevated
  if($security.session_id -le 0 -or $security.token_integrity_rid -lt 8192 -or $security.token_integrity_rid -ge 16384){throw 'Unsupported session0/unknown/SYSTEM context; interactive current-user MEDIUM or HIGH required'}
  if($security.token_is_elevated -or $security.token_integrity_rid -ge 12288){
   Write-Warning 'Owner-authorized current-user Administrator compilation. Native privilege warnings are retained. This is not a sandbox; use trusted documents.'
  }
  $engine=$env:TIKZARIUM_XELATEX
  if([string]::IsNullOrWhiteSpace($engine)){
   $cmd=Get-Command xelatex.exe -ErrorAction SilentlyContinue
   if($cmd){$engine=$cmd.Source}
   else {$engine=Join-Path $env:ProgramFiles 'MiKTeX\miktex\bin\x64\xelatex.exe'}
  }
  if(-not (Test-Path -LiteralPath $engine -PathType Leaf)){throw 'Existing external XeLaTeX not found; no installation attempted'}
  $version=Invoke-TikzNative -Exe $engine -Arguments @('--disable-installer','--version') -WorkingDirectory $root -LogPrefix (Join-Path $OutputDir 'xelatex-version') -TimeoutSeconds 30
  if($version.timed_out -or $version.exit_code -ne 0 -or $version.stdout -notmatch 'MiKTeX-XeTeX'){throw 'Existing MiKTeX version verification failed; inspect native stdout/stderr/exit JSON'}
  $report.engine=$engine;$report.version=$version.stdout.Trim()
  $miktex=Join-Path (Split-Path -Parent $engine) 'miktex.exe'
  if(-not (Test-Path -LiteralPath $miktex -PathType Leaf)){throw 'Existing MiKTeX inventory utility not found'}
  function Inventory([string]$Label){
   $r=Invoke-TikzNative -Exe $miktex -Arguments @('packages','list','--template','{id}|{isInstalled}') -WorkingDirectory $root -LogPrefix (Join-Path $OutputDir $Label) -TimeoutSeconds 120
   if($r.timed_out -or $r.exit_code -ne 0){throw 'Read-only MiKTeX inventory failed'}
   $rows=@($r.stdout -split '\r?\n' | Where-Object {$_} | Sort-Object)
   if($rows.Count -eq 0){throw 'Empty MiKTeX inventory'}
   foreach($row in $rows){if($row -cnotmatch '^[A-Za-z0-9][A-Za-z0-9._-]*\|(true|false)$'){throw 'Noncanonical MiKTeX inventory'}}
   $rows | Set-Content -LiteralPath (Join-Path $OutputDir ($Label+'.txt')) -Encoding UTF8
   return $rows
  }
  $nativeReport=Get-Content -LiteralPath (Join-Path $OutputDir 'windows-server-rust.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $cli=Join-Path $OutputDir 'native-release\tikzarium-cli.exe'
  if($nativeReport.source_sha -cne $sha -or $nativeReport.release_build -cne 'PASS_WINDOWS_SERVER_NOT_WIN10' -or $nativeReport.crt_imports -cne 'PASS_NO_DYNAMIC_VCRUNTIME'){throw 'No verified exact-main native Rust/PE evidence for this product CLI'}
  $cliSha=(Get-FileHash -LiteralPath $cli -Algorithm SHA256).Hash.ToLowerInvariant()
  if($cliSha -cne $nativeReport.cli_sha256){throw 'Actual CLI differs from verified native build'}
  $report.cli_sha256=$cliSha;$report.cargo=$nativeReport.rust_tests
  if($CheckRust -and $report.cargo -cne 'PASS_WINDOWS_SERVER_NOT_WIN10'){throw 'Required Rust tests did not pass'}
  $work=Join-Path $OutputDir 'owner-admin-proof'
  New-Item -ItemType Directory -Force -Path $work | Out-Null
  $original=Join-Path $root 'examples\windows-cyrillic.tex'
  $source=Join-Path $work 'source.tex';$pdf=Join-Path $work 'product.pdf'
  Copy-Item -LiteralPath $original -Destination $source -Force
  if(Test-Path -LiteralPath $pdf){Remove-Item -LiteralPath $pdf -Force}
  $sourceSha=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
  $before=@(Inventory 'packages-before')
  $oldEngine=$env:TIKZARIUM_XELATEX
  try {
   $env:TIKZARIUM_XELATEX=$engine
   $build=Invoke-TikzNative -Exe $cli -Arguments @('build',$source,$pdf,'--log',(Join-Path $work 'product-xelatex.log')) -WorkingDirectory $work -LogPrefix (Join-Path $OutputDir 'product-cli-build') -TimeoutSeconds 300
  } finally {$env:TIKZARIUM_XELATEX=$oldEngine}
  $report.cli_exit=$build.exit_code;$report.compiler_timed_out=$build.timed_out
  $after=@(Inventory 'packages-after')
  if($before.Count -ne $after.Count -or (Compare-Object $before $after)){throw 'Installed package inventory changed'}
  $report.packages_unchanged=$true;$report.package_count=$after.Count
  if($build.timed_out -or $build.exit_code -ne 0){throw "Actual TikZarium CLI build failed: exit=$($build.exit_code); inspect original logs"}
  if(-not (Test-Path -LiteralPath $pdf -PathType Leaf)){throw 'Compiler did not publish a PDF'}
  if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -cne $sourceSha -or (Get-FileHash -LiteralPath $original -Algorithm SHA256).Hash.ToLowerInvariant() -cne $sourceSha){throw 'Source changed during build'}
  $report.source_sha256=$sourceSha;$report.pdf_sha256=(Get-FileHash -LiteralPath $pdf -Algorithm SHA256).Hash.ToLowerInvariant()
  $report.source_path='owner-admin-proof/source.tex';$report.pdf_path='owner-admin-proof/product.pdf'
  $report.status='PASS_ACTUAL_PRODUCT_CLI_PDF_PENDING_INDEPENDENT_FONT_TEXT_AUDIT'
  $exitCode=0
 } finally {Pop-Location}
} catch {
 $report.status='FAIL';$report.error=$_.Exception.Message
 Write-Error $report.error -ErrorAction Continue
} finally {
 $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $OutputDir 'windows-server-qa.json') -Encoding UTF8
}
exit $exitCode
