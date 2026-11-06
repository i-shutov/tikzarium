# User-installed external MiKTeX on persistent Windows Server.
# NO installer, package writes, registry settings or hidden engine fallback.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir,[switch]$CheckRust)
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$reportPath=Join-Path $OutputDir 'windows-server-qa.json'
$report=[ordered]@{
 schema_version=1;status='INCOMPLETE';environment='USER_WINDOWS_SERVER'
 physical_windows10='NOT_RUN';mac_m1_m4='NOT_RUN';interactive_gui='NOT_RUN'
 cargo='NOT_RUN';font_audit='NOT_RUN';text_audit='NOT_RUN';raster='NOT_RUN';package_autoinstall='DISABLED_BY_FLAG'
}
$exit=1
try {
 $root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
 Push-Location $root
 try {
  $report.sha=(& git rev-parse HEAD | Out-String).Trim()
  if($LASTEXITCODE -ne 0 -or $report.sha -notmatch '^[0-9a-f]{40}$'){throw 'Git SHA not established'}
  $os=Get-CimInstance Win32_OperatingSystem
  $report.os=$os.Caption;$report.build=$os.BuildNumber
  # Group membership, token elevation, integrity and session are distinct.
  # Do not require a separate non-admin Windows account or change UAC.
  try {
   $security=& (Join-Path $PSScriptRoot 'qa_windows_token.ps1')
  } catch {
   $report.status='ENVIRONMENT_BLOCKED_TOKEN_QUERY'
   throw "MiKTeX PDF NOT_RUN: cannot classify Windows process token: $($_.Exception.Message)"
  }
  $report.security=$security
  $report.runner_session_id=$security.session_id
  $report.runner_elevated=$security.token_is_elevated
  if($security.session_id -eq 0){
   $report.status='ENVIRONMENT_BLOCKED_SESSION0'
   throw 'MiKTeX GUI/PDF QA NOT_RUN: Session0, not interactive desktop'
  }
  if($security.token_is_elevated -or $security.token_integrity_rid -ge 12288){
   $report.status='ENVIRONMENT_BLOCKED_ELEVATED_NO_APPROVED_CHILD'
   throw 'MiKTeX PDF NOT_RUN: elevated/high process token. Same-admin filtered child launch is not approved; no new account required.'
  }
  if($security.token_integrity_rid -lt 4096){
   $report.status='ENVIRONMENT_BLOCKED_TOKEN_UNKNOWN'
   throw 'MiKTeX PDF NOT_RUN: unknown or untrusted integrity level'
  }
  $engine=$env:TIKZARIUM_XELATEX
  if([string]::IsNullOrWhiteSpace($engine)){
   $cmd=Get-Command xelatex -ErrorAction SilentlyContinue
   if($cmd){$engine=$cmd.Source}
   else {
    # Administrator-installed MiKTeX may be present under Program Files
    # but absent from the PATH inherited by an already-running runner.
    # Never auto-install TeX or change machine-wide PATH.
    $candidates=@(
      (Join-Path $env:ProgramFiles 'MiKTeX\miktex\bin\x64\xelatex.exe'),
      (Join-Path $env:ProgramFiles 'MiKTeX\miktex\bin\xelatex.exe')
    )
    $engine=@($candidates | Where-Object {Test-Path -LiteralPath $_ -PathType Leaf} | Select-Object -First 1)
    if($engine.Count -gt 0){$engine=$engine[0]}else{$engine=$null}
   }
  }
  if([string]::IsNullOrWhiteSpace($engine)){
   throw 'External XeLaTeX unavailable to the runner account; check system MiKTeX Program Files installation and restart runner for PATH refresh'
  }
  if(-not (Test-Path -LiteralPath $engine -PathType Leaf)){throw 'Selected XeLaTeX does not exist'}
  $banner=(& $engine '--disable-installer' '--version' 2>&1 | Out-String)
  if($LASTEXITCODE -ne 0 -or $banner -notmatch 'MiKTeX-XeTeX'){
   throw 'Only verified MiKTeX XeTeX --disable-installer is permitted'
  }
  $report.engine=$engine
  $report.version=(($banner -split '\r?\n') | Where-Object { $_ })[0]
  $miktex=Get-Command miktex -ErrorAction SilentlyContinue
  $miktexExe=if($miktex){$miktex.Source}else{$null}
  if(-not $miktexExe){
   # Prefer the inventory CLI alongside the already verified MiKTeX XeLaTeX.
   $candidate=Join-Path (Split-Path -Parent $engine) 'miktex.exe'
   if(Test-Path -LiteralPath $candidate -PathType Leaf){$miktexExe=$candidate}
  }
  if(-not $miktexExe){throw 'MiKTeX read-only inventory utility is missing from PATH and selected MiKTeX bin directory'}
  function Inventory([string]$snapshot) {
   $rows=@(& $miktexExe packages list --template '{id}|{isInstalled}' 2>$null)
   if($LASTEXITCODE -ne 0 -or $rows.Count -eq 0){throw 'MiKTeX inventory unavailable'}
   $items=@($rows | ForEach-Object {[string]$_} | Sort-Object)
   foreach($line in $items){
    if($line -cnotmatch '^[A-Za-z0-9][A-Za-z0-9._-]*\|(true|false)$'){
     throw 'MiKTeX inventory output is noncanonical'
    }
   }
   $items | Set-Content -LiteralPath $snapshot -Encoding utf8
   return $items
  }
  $before=@(Inventory (Join-Path $OutputDir 'packages-before.txt'))
  $work=Join-Path $OutputDir 'scratch'
  New-Item -ItemType Directory -Force -Path $work | Out-Null
  $original=Join-Path $root 'examples\cyrillic.tex'
  $source=Join-Path $work 'cyrillic.tex'
  $sourceHash=(Get-FileHash -LiteralPath $original -Algorithm SHA256).Hash
  Copy-Item -LiteralPath $original -Destination $source -Force
  $args=@('--disable-installer','-no-shell-escape','-halt-on-error',
          '-interaction=nonstopmode','-file-line-error','-recorder',
          "-output-directory=$work",$source)
  Push-Location $work
  try {
   & $engine @args *> (Join-Path $OutputDir 'xelatex-output.log')
   $texExit=$LASTEXITCODE
  } finally {Pop-Location}
  $report.tex_exit=$texExit
  if($texExit -ne 0){throw "Real XeLaTeX failed with exit $texExit"}
  $pdf=Join-Path $work 'cyrillic.pdf'
  if(-not (Test-Path -LiteralPath $pdf -PathType Leaf)){throw 'No PDF produced'}
  if((Get-FileHash $original -Algorithm SHA256).Hash -ne $sourceHash -or
     (Get-FileHash $source -Algorithm SHA256).Hash -ne $sourceHash){
   throw 'Input source changed during compiler run'
  }
  $report.source_sha256=$sourceHash.ToLowerInvariant()
  $report.pdf_sha256=(Get-FileHash $pdf -Algorithm SHA256).Hash.ToLowerInvariant()
  # A single /yes/ anywhere in pdffonts is insufficient: each PDF font
  # needs its own embedding verdict. pdftotext is an independent Cyrillic
  # content check; neither means glyphs were visually accepted on a GUI.
  $fonts=Get-Command pdffonts -ErrorAction SilentlyContinue
  $info=Get-Command pdfinfo -ErrorAction SilentlyContinue
  if($fonts -and $info){
   $details=(& $info.Source $pdf 2>&1 | Out-String)
   $infoExit=$LASTEXITCODE
   $fontsText=(& $fonts.Source $pdf 2>&1 | Out-String)
   $fontsExit=$LASTEXITCODE
   $details | Set-Content -LiteralPath (Join-Path $OutputDir 'pdfinfo.txt') -Encoding utf8
   $fontsText | Set-Content -LiteralPath (Join-Path $OutputDir 'pdffonts.txt') -Encoding utf8
   if($infoExit -ne 0 -or $fontsExit -ne 0 -or
      $details -notmatch '(?m)^Pages:\s+1\s*$'){
    throw 'PDF metadata or one-page contract failed'
   }
   $lines=@($fontsText -split '\r?\n' | Where-Object { $_.Trim() })
   if($lines.Count -lt 3 -or $lines[0] -notmatch '\bemb\b'){
    throw 'pdffonts output missing table header or font records'
   }
   $fontRows=@($lines | Select-Object -Skip 2)
   if($fontRows.Count -eq 0){throw 'PDF has no font records'}
   foreach($row in $fontRows){
    $match=[regex]::Match($row,
      '\s+(yes|no)\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$',
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if(-not $match.Success){throw "Unparseable pdffonts record: $row"}
    if($match.Groups[1].Value -ine 'yes'){
     throw "Nonembedded PDF font: $row"
    }
   }
   if(($fontRows -join ' ') -notmatch '(?i)DejaVu.?Serif'){
    throw 'Cyrillic fixture did not embed the expected DejaVu Serif family'
   }
   $report.font_count=$fontRows.Count
   $report.font_audit='PASS_ALL_FONT_ROWS_EMBEDDED'
  }else{
   $report.font_audit='NOT_RUN_PDFINFO_OR_PDFFONTS_MISSING'
  }
  $extractor=Get-Command pdftotext -ErrorAction SilentlyContinue
  if($extractor){
   $extracted=Join-Path $OutputDir 'pdftotext.txt'
   & $extractor.Source '-enc' 'UTF-8' $pdf $extracted
   if($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $extracted)){
    throw 'pdftotext extraction failed'
   }
   $actualText=Get-Content -LiteralPath $extracted -Raw -Encoding utf8
   foreach($expected in @('Тест XeLaTeX','Кириллица','Точка')){
    if(-not $actualText.Contains($expected)){
     throw "Expected Cyrillic content absent in PDF extraction: $expected"
    }
   }
   $report.text_audit='PASS_EXPECTED_CYRILLIC_EXTRACTED'
  }else{
   $report.text_audit='NOT_RUN_PDFTOTEXT_MISSING'
  }
  $rasterizer=Get-Command pdftoppm -ErrorAction SilentlyContinue
  if($rasterizer){
   $prefix=Join-Path $OutputDir 'cyrillic-render'
   & $rasterizer.Source '-f' '1' '-l' '1' '-singlefile' '-png' '-r' '144' $pdf $prefix
   if($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath ($prefix+'.png'))){
    throw 'PDF raster generation failed'
   }
   $report.raster='GENERATED_REQUIRES_MANUAL_GLYPH_REVIEW'
  }else{
   $report.raster='NOT_RUN_PDFTOPPM_MISSING'
  }
  $after=@(Inventory (Join-Path $OutputDir 'packages-after.txt'))
  if($before.Count -ne $after.Count -or (Compare-Object $before $after)){
   throw 'Package inventory changed; offline gate is FAIL'
  }
  $report.packages_unchanged=$true
  $report.package_count=$after.Count
  if($CheckRust){
   if(-not (Get-Command cargo -ErrorAction SilentlyContinue)){
    $report.cargo='NOT_RUN_NO_CARGO'
   }else{
    $env:CARGO_BUILD_JOBS='1'
    $env:CARGO_INCREMENTAL='0'
    & cargo test --locked -p tikzarium-core -p tikzarium-extensions -p tikzarium-app
    if($LASTEXITCODE -ne 0){throw 'Cargo locked tests failed'}
    $report.cargo='PASS_WINDOWS_SERVER_NOT_WIN10'
   }
  }
  $complete=($report.font_audit -eq 'PASS_ALL_FONT_ROWS_EMBEDDED' -and
             $report.text_audit -eq 'PASS_EXPECTED_CYRILLIC_EXTRACTED' -and
             (-not $CheckRust -or $report.cargo -eq 'PASS_WINDOWS_SERVER_NOT_WIN10'))
  $report.status=if($complete){
   'PASS_USER_WINDOWS_SERVER_TEX_FONT_AND_EXTRACTED_TEXT'
  }else{'PARTIAL_REQUIRED_FONT_TEXT_OR_RUST_CHECK_NOT_RUN'}
  # A PARTIAL report must not make the self-hosted workflow green.
  $exit=if($complete){0}else{2}
 }finally{Pop-Location}
}catch{
 if($report.status -eq 'INCOMPLETE'){$report.status='FAIL'}
 $report.error=$_.Exception.Message
 Write-Error $report.error -ErrorAction Continue
}finally{
 $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding utf8
 Write-Host "Windows Server QA report: $reportPath"
}
exit $exit
