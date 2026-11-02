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
 cargo='NOT_RUN';font_audit='NOT_RUN';package_autoinstall='DISABLED_BY_FLAG'
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
  $engine=$env:TIKZARIUM_XELATEX
  if([string]::IsNullOrWhiteSpace($engine)){
   $cmd=Get-Command xelatex -ErrorAction SilentlyContinue
   if(-not $cmd){throw 'External XeLaTeX missing; no fallback'}
   $engine=$cmd.Source
  }
  if(-not (Test-Path -LiteralPath $engine -PathType Leaf)){throw 'Selected XeLaTeX does not exist'}
  $banner=(& $engine '--disable-installer' '--version' 2>&1 | Out-String)
  if($LASTEXITCODE -ne 0 -or $banner -notmatch 'MiKTeX-XeTeX'){
   throw 'Only verified MiKTeX XeTeX --disable-installer is permitted'
  }
  $report.engine=$engine
  $report.version=(($banner -split '\r?\n') | Where-Object { $_ })[0]
  $miktex=Get-Command miktex -ErrorAction SilentlyContinue
  if(-not $miktex){throw 'MiKTeX read-only inventory utility is missing'}
  function Inventory([string]$snapshot) {
   $rows=@(& $miktex.Source packages list --template '{id}|{isInstalled}' 2>$null)
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
  $fonts=Get-Command pdffonts -ErrorAction SilentlyContinue
  $info=Get-Command pdfinfo -ErrorAction SilentlyContinue
  if($fonts -and $info){
   $details=(& $info.Source $pdf | Out-String)
   $fontsText=(& $fonts.Source $pdf | Out-String)
   $details | Set-Content (Join-Path $OutputDir 'pdfinfo.txt')
   $fontsText | Set-Content (Join-Path $OutputDir 'pdffonts.txt')
   if($details -notmatch '(?m)^Pages:\s+1\s*$' -or $fontsText -notmatch '\byes\b'){
    throw 'PDF page count or embedded font verification failed'
   }
   $report.font_audit='PASS'
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
  $report.status=if($report.font_audit -eq 'PASS'){
   'PASS_USER_WINDOWS_SERVER_TEX_AND_PDF'
  }else{'PARTIAL_PDF_FONTS_NOT_RUN'}
  $exit=0
 }finally{Pop-Location}
}catch{
 $report.status='FAIL'
 $report.error=$_.Exception.Message
 Write-Error $report.error -ErrorAction Continue
}finally{
 $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding utf8
 Write-Host "Windows Server QA report: $reportPath"
}
exit $exit
