# Exact-SHA pinned Mesa archive acquisition for QA-only software OpenGL.
# Bounded HTTP retries for transient 504/connection errors; fail closed on SHA mismatch.
# No system install, no global drivers, and NEVER include QA Mesa in release ZIP.
[CmdletBinding()]
param([switch]$SelfTest)
$ErrorActionPreference='Stop'

function Get-TikzariumPinnedArchive {
 [CmdletBinding()]
 param(
  [Parameter(Mandatory)][string]$SourceUrl,
  [Parameter(Mandatory)][string]$ArchivePath,
  [Parameter(Mandatory)][string]$ExpectedSha256,
  [ValidateRange(1,5)][int]$MaxAttempts=4,
  [ValidateRange(0,30000)][int]$RetryDelayMs=2500,
  [scriptblock]$TestDownloader
 )
 if(-not $SourceUrl.StartsWith('https://', [StringComparison]::Ordinal) -or
    $ExpectedSha256 -cnotmatch '^[0-9a-f]{64}$'){
  throw 'PINNED_ARCHIVE_SOURCE_OR_SHA_INVALID'
 }
 # Real Server W2 uses the same multi-transport *original* pal1000 SHA as
 # hosted GUI. No MSYS2 backup, unpinned mirrors, system install, or fake PASS.
 # Explicit TestDownloader is used only for isolated offline negative tests.
 if(-not $TestDownloader){
   if($SourceUrl -cne 'https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-mingw.7z' -or $ExpectedSha256 -cne 'da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'){
      throw 'PINNED_ARCHIVE_ORIGIN_OR_SHA_NOT_ALLOWED_ON_SERVER'
   }
   . (Join-Path $PSScriptRoot 'qa_windows_mesa_transport.ps1')
   $verified=Get-TikzariumPinnedMesaArchive -ArchivePath $ArchivePath
   if($verified.source -cne $SourceUrl -or $verified.sha256 -cne $ExpectedSha256){
     throw 'PINNED_ARCHIVE_VERIFIED_TRANSPORT_PROVENANCE_DRIFT'
   }
   Write-Host ("PERSONAL_W2_MESA_ARCHIVE_TRANSPORT="+$verified.transport)
   return $verified
 }
 $parent=Split-Path -Parent $ArchivePath
 if(-not (Test-Path -LiteralPath $parent -PathType Container)){
  throw 'PINNED_ARCHIVE_PARENT_MISSING'
 }
 for($attempt=1;$attempt -le $MaxAttempts;$attempt++){
  if(Test-Path -LiteralPath $ArchivePath){Remove-Item -LiteralPath $ArchivePath -Force}
  try {
   if($TestDownloader){& $TestDownloader $SourceUrl $ArchivePath $attempt}
   else {
    Invoke-WebRequest -Uri $SourceUrl -OutFile $ArchivePath -MaximumRedirection 6 -TimeoutSec 150 -UseBasicParsing
   }
   if(-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)){
    throw 'PINNED_ARCHIVE_DOWNLOAD_RETURNED_NO_FILE'
   }
  }catch{
   $reason=$_.Exception.Message
   if(Test-Path -LiteralPath $ArchivePath){Remove-Item -LiteralPath $ArchivePath -Force}
   if($attempt -eq $MaxAttempts){throw "PINNED_ARCHIVE_TRANSPORT_FAILED_AFTER_$($attempt)_ATTEMPTS: $reason"}
   Write-Warning "Pinned QA archive transport failed attempt $attempt/$MaxAttempts; retrying same expected SHA"
   if($RetryDelayMs){Start-Sleep -Milliseconds ([Math]::Min(30000,$RetryDelayMs*$attempt))}
   continue
  }
  $actual=(Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if($actual -cne $ExpectedSha256){
   Remove-Item -LiteralPath $ArchivePath -Force
   # Hash mismatch is not treated as a transient transport failure.
   throw "PINNED_ARCHIVE_SHA_MISMATCH: $actual"
  }
  Write-Host "PINNED_QA_ARCHIVE=PASS_SHA256_AFTER_$($attempt)_ATTEMPTS"
  return [PSCustomObject]@{sha256=$actual;attempts=$attempt;source=$SourceUrl;path=$ArchivePath}
 }
 throw 'PINNED_ARCHIVE_EXHAUSTED'
}

if($SelfTest){
 $testRoot=Join-Path ([IO.Path]::GetTempPath()) ('tikzarium-pinned-test-' + [guid]::NewGuid().ToString('N'))
 New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
 try{
  $good=Join-Path $testRoot 'bytes.bin'
  [IO.File]::WriteAllBytes($good,[byte[]](11,20,30,40,51,64))
  $sha=(Get-FileHash -LiteralPath $good -Algorithm SHA256).Hash.ToLowerInvariant()
  $destination=Join-Path $testRoot 'archive.7z'
  $source='https://example.invalid/qa-only.7z'
  $retry={param($url,$out,$attempt) if($attempt -le 2){throw 'SIMULATED_HTTP_504'} [IO.File]::WriteAllBytes($out,[byte[]](11,20,30,40,51,64))}
  $result=Get-TikzariumPinnedArchive -SourceUrl $source -ArchivePath $destination -ExpectedSha256 $sha -MaxAttempts 4 -RetryDelayMs 0 -TestDownloader $retry
  if($result.attempts -ne 3 -or $result.sha256 -cne $sha){throw 'PINNED_RETRY_SELFTEST_BAD_SUCCESS'}
  $wrong={param($url,$out,$attempt) [IO.File]::WriteAllBytes($out,[byte[]](0,0,0,0))}
  $rejected=$false
  try{
   [void](Get-TikzariumPinnedArchive -SourceUrl $source -ArchivePath $destination -ExpectedSha256 $sha -MaxAttempts 4 -RetryDelayMs 0 -TestDownloader $wrong)
  }catch{$rejected=$_.Exception.Message -like '*PINNED_ARCHIVE_SHA_MISMATCH*'}
  if(-not $rejected -or (Test-Path -LiteralPath $destination)){throw 'PINNED_HASH_MISMATCH_ACCEPTED_OR_UNCLEAN'}
  $alwaysDown={param($url,$out,$attempt) throw 'SIMULATED_HTTP_504'}
  $exhausted=$false
  try{
   [void](Get-TikzariumPinnedArchive -SourceUrl $source -ArchivePath $destination -ExpectedSha256 $sha -MaxAttempts 3 -RetryDelayMs 0 -TestDownloader $alwaysDown)
  }catch{$exhausted=$_.Exception.Message -like '*PINNED_ARCHIVE_TRANSPORT_FAILED_AFTER_3_ATTEMPTS*'}
  if(-not $exhausted){throw 'PINNED_RETRY_SELFTEST_ACCEPTED_TRANSPORT_FAILURE'}
  Write-Host 'PINNED_MESA_RETRY_SELFTEST=PASS_3_CASES_NO_NETWORK_OR_SYSTEM_CHANGES'
 }finally{Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue}
}