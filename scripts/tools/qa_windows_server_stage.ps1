# Verify and smoke-test exact-main Windows EXEs on personal Server without Cargo or MiKTeX.
# No installs, security policy mutations or GUI/physical Windows 10 assertions.
[CmdletBinding()]
param(
 [Parameter(Mandatory)][string]$NativeRoot,
 [Parameter(Mandatory)][string]$PortableRoot,
 [Parameter(Mandatory)][string]$OutputDir,
 [Parameter(Mandatory)][string]$ExpectedSha,
 [Parameter(Mandatory)][string]$SourceRunId
)
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$report=[ordered]@{schema_version=1;status='INCOMPLETE';source_sha=$ExpectedSha
 source_ci_run_id=$SourceRunId;host_compilation='NOT_RUN'
 external_miktex_pdf='NOT_RUN';interactive_gui='NOT_RUN';physical_windows10='NOT_RUN'}
$exitCode=1
function ShaBytes([byte[]]$bytes){
 $hash=[Security.Cryptography.SHA256]::Create()
 try{return [BitConverter]::ToString($hash.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()}
 finally{$hash.Dispose()}
}
function ReadEntry($entry){
 $stream=$entry.Open();$mem=New-Object IO.MemoryStream
 try{$stream.CopyTo($mem);return ,$mem.ToArray()}
 finally{$stream.Dispose();$mem.Dispose()}
}
function AssertPE([byte[]]$bytes,[int]$expected){
 if($bytes.Length -lt 160 -or $bytes[0] -ne 77 -or $bytes[1] -ne 90){throw 'PE image missing MZ'}
 $off=[BitConverter]::ToInt32($bytes,0x3c)
 if($off -lt 64 -or $off+96 -gt $bytes.Length){throw 'PE header offset invalid'}
 if($bytes[$off] -ne 80 -or $bytes[$off+1] -ne 69 -or $bytes[$off+2] -ne 0 -or $bytes[$off+3] -ne 0){throw 'PE signature invalid'}
 if([BitConverter]::ToUInt16($bytes,$off+4) -ne 0x8664 -or [BitConverter]::ToUInt16($bytes,$off+24) -ne 0x20b){throw 'PE is not x64 PE32+'}
 $size=[BitConverter]::ToUInt16($bytes,$off+20)
 if($size -lt 70 -or $off+24+$size -gt $bytes.Length){throw 'Truncated PE optional header'}
 if([BitConverter]::ToUInt16($bytes,$off+92) -ne $expected){throw "PE subsystem must equal $expected"}
}
try{
 if($ExpectedSha -cnotmatch '^[0-9a-f]{40}$' -or $SourceRunId -notmatch '^[0-9]+$'){
  throw 'Exact SHA and decimal source CI run ID required'
 }
 $app=Join-Path $NativeRoot 'target\release\tikzarium-app.exe'
 $cli=Join-Path $NativeRoot 'target\release\tikzarium-cli.exe'
 $archive=Join-Path $PortableRoot 'Tikzarium-Windows-x64-portable-candidate.zip'
 $auditPath=Join-Path $PortableRoot 'windows-zip-audit.json'
 foreach($path in @($app,$cli,$archive,$auditPath)){
  if(-not (Test-Path -LiteralPath $path -PathType Leaf)){throw "Missing original CI file: $path"}
 }
 $appBytes=[IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $app).Path)
 $cliBytes=[IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $cli).Path)
 AssertPE $appBytes 2
 AssertPE $cliBytes 3
 $appHash=ShaBytes $appBytes;$cliHash=ShaBytes $cliBytes
 $archiveHash=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
 $audit=Get-Content -LiteralPath $auditPath -Raw -Encoding UTF8 | ConvertFrom-Json
 if($audit.source_sha -cne $ExpectedSha -or $audit.archive_sha256 -cne $archiveHash -or
    $audit.app_sha256 -cne $appHash -or $audit.cli_sha256 -cne $cliHash -or
    $audit.status -cne 'PASS_WINDOWS_HOSTED_PORTABLE_NOT_PHYSICAL_GUI' -or
    $audit.hosted_extracted_cli -cne 'PASS_HELP_NO_XELATEX_HOSTED_WINDOWS'){
  throw 'Hosted audit not bound to verified source and binaries'
 }
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 $zip=[IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $archive).Path)
 try{
  $prefix='Tikzarium-preview/'
  $names=@('MANIFEST.sha256','PROVENANCE.json','README_RU.md','qa/figure-crlf.tex','tikzarium-app.exe','tikzarium-cli.exe')
  $fullNames=@($names | ForEach-Object { $prefix+$_ })
  if($zip.Entries.Count -ne $names.Count){throw 'Unexpected ZIP member count or duplicate'}
  $data=@{}
  foreach($entry in $zip.Entries){
   if($fullNames -cnotcontains $entry.FullName -or $data.ContainsKey($entry.FullName)){
    throw "Unexpected or duplicated ZIP member: $($entry.FullName)"
   }
   $data[$entry.FullName]=ReadEntry $entry
  }
  foreach($name in $fullNames){if(-not $data.ContainsKey($name)){throw "Missing ZIP member: $name"}}
  if((ShaBytes $data[($prefix+'tikzarium-app.exe')]) -cne $appHash -or
     (ShaBytes $data[($prefix+'tikzarium-cli.exe')]) -cne $cliHash){
   throw 'ZIP EXE differs from original hosted native EXE'
  }
  # The producer uses Python sorted() (Unicode ordinal/code-point ordering).
  # Sort-Object -CaseSensitive is *culture* aware on Windows and can order
  # lower-case 'qa/' before upper-case 'PROVENANCE.json' / 'README_RU.md',
  # rejecting a genuine, unchanged portable ZIP. Never loosen hash checks.
  $manifestNames=[string[]]@($names | Where-Object {$_ -cne 'MANIFEST.sha256'})
  [Array]::Sort($manifestNames,[StringComparer]::Ordinal)
  $manifestExpected=@(foreach($name in $manifestNames){
   "$((ShaBytes $data[($prefix+$name)]))  $name"
  })
  $expected=($manifestExpected -join [char]10)+[char]10
  $actual=[Text.Encoding]::UTF8.GetString($data[($prefix+'MANIFEST.sha256')])
  if($actual -cne $expected){throw 'ZIP member manifest SHA is invalid'}
  $prov=[Text.Encoding]::UTF8.GetString($data[($prefix+'PROVENANCE.json')]) | ConvertFrom-Json
  $ciUrl="https://github.com/i-shutov/tikzarium/actions/runs/$SourceRunId"
  if($prov.source_sha -cne $ExpectedSha -or $prov.original_ci_run -cne $ciUrl -or
     $prov.platform -cne 'windows10-x64' -or $prov.app_sha256 -cne $appHash -or
     $prov.cli_sha256 -cne $cliHash -or $prov.physical_windows10 -cne 'NOT_RUN' -or
     $prov.tex_or_fonts_bundled -ne $false){throw 'ZIP provenance mismatch'}
 }finally{$zip.Dispose()}
 $dest=Join-Path $OutputDir 'hosted-native-verified'
 New-Item -ItemType Directory -Force -Path $dest | Out-Null
 Copy-Item -LiteralPath $app -Destination (Join-Path $dest 'tikzarium-app.exe')
 Copy-Item -LiteralPath $cli -Destination (Join-Path $dest 'tikzarium-cli.exe')
 Copy-Item -LiteralPath $archive -Destination (Join-Path $dest 'Tikzarium-Windows-x64-portable-candidate.zip')
 $report.archive_sha256=$archiveHash
 $report.app_sha256=$appHash;$report.cli_sha256=$cliHash
 $report.pe_gui_subsystem=2;$report.pe_cli_subsystem=3
 $report.manifest_verified_files=5
 # Read-only native CLI help is safe to run even on an elevated CI account.
 # Never invoke actual TeX with inherited elevated rights.
 $saved=$env:TIKZARIUM_XELATEX
 $env:TIKZARIUM_XELATEX='Z:\tikzarium-external-tex-disabled.exe'
 try {
  Push-Location $dest
  try{
   $stdout=(& (Join-Path $dest 'tikzarium-cli.exe') help tikz.circle 2>&1 | Out-String)
   $exit=$LASTEXITCODE
  }finally{Pop-Location}
 }finally{$env:TIKZARIUM_XELATEX=$saved}
 if($exit -ne 0 -or $stdout -notmatch 'tikz\.circle'){throw 'Local extracted CLI help failed'}
 $report.cli_local_help='PASS_NO_TEX_INVOCATION'
 $report.status='PASS_VERIFIED_HOSTED_EXE_ZIP_ON_PERSONAL_SERVER_NOT_GUI'
 $exitCode=0
}catch{
 $report.status='FAIL_CARGO_FREE_ARTIFACT_VERIFICATION'
 $report.error=$_.Exception.Message
 Write-Error $report.error -ErrorAction Continue
}finally{
 $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $OutputDir 'windows-server-hosted-artifact.json') -Encoding utf8
}
exit $exitCode
