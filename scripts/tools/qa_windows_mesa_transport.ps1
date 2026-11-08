# SHA-verified fixed-origin Mesa QA transport for disposable hosted Windows OR exact trusted-main personal Server W2; never shipped or installed.
# 2 HTTP stacks + GitHub REST release-asset route; SAME release and exact SHA.
# No alternate vendor/mirror, no TLS bypass, no system install, no release packing.
$ErrorActionPreference='Stop'

function Get-TikzariumPinnedMesaArchive {
 [CmdletBinding()]
 param(
   [Parameter(Mandatory)][string]$ArchivePath,
   [ValidateRange(1,4)][int]$MaxAttempts=4,
   [ValidateRange(0,10000)][int]$RetryDelayMs=1200,
   [scriptblock]$TestDownloader
 )
 $source='https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-mingw.7z'
 $assetName='mesa3d-26.2.6-release-mingw.7z'
 $releaseApi='https://api.github.com/repos/pal1000/mesa-dist-win/releases/tags/26.2.6'
 $digest='da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'
 $parent=[IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($ArchivePath))
 if(-not (Test-Path -LiteralPath $parent -PathType Container)){
   throw 'PINNED_MESA_PRIVATE_PARENT_MISSING'
 }
 $methods=@('IWR_GITHUB_RELEASE','CURL_GITHUB_RELEASE','IWR_GITHUB_RELEASE_ASSET_API','CURL_GITHUB_RELEASE')
 $lastReason='NO_ATTEMPTS'
 for($attempt=1;$attempt -le $MaxAttempts;$attempt++){
   $method=$methods[$attempt-1]
   if(Test-Path -LiteralPath $ArchivePath -PathType Leaf){
     Remove-Item -LiteralPath $ArchivePath -Force
   }
   try {
     if($TestDownloader){
       & $TestDownloader $method $ArchivePath $attempt
     } elseif($method -eq 'IWR_GITHUB_RELEASE'){
       $ProgressPreference='SilentlyContinue'
       Invoke-WebRequest -Uri $source -OutFile $ArchivePath -MaximumRedirection 6 -TimeoutSec 150 -UseBasicParsing | Out-Null
     } elseif($method -eq 'CURL_GITHUB_RELEASE'){
       $curl=(Get-Command curl.exe -ErrorAction Stop).Source
       & $curl --fail --location --silent --show-error --connect-timeout 20 --max-time 160 --output $ArchivePath -- $source
       if($LASTEXITCODE -ne 0){throw "CURL_RELEASE_EXIT_$LASTEXITCODE"}
     } elseif($method -eq 'IWR_GITHUB_RELEASE_ASSET_API'){
       $apiHeaders=@{'Accept'='application/vnd.github+json';'User-Agent'='Tikzarium-Hosted-QA'}
       $release=Invoke-RestMethod -Uri $releaseApi -Headers $apiHeaders -TimeoutSec 35 -MaximumRedirection 6
       $matching=@($release.assets | Where-Object { $_.name -ceq $assetName })
       if($matching.Count -ne 1 -or [int64]$matching[0].id -le 0){
         throw 'PINNED_MESA_GITHUB_API_ASSET_NOT_UNIQUE'
       }
       $assetApi='https://api.github.com/repos/pal1000/mesa-dist-win/releases/assets/'+([string]$matching[0].id)
       $binaryHeaders=@{'Accept'='application/octet-stream';'User-Agent'='Tikzarium-Hosted-QA'}
       $answer=Invoke-WebRequest -Uri $assetApi -Headers $binaryHeaders -OutFile $ArchivePath -MaximumRedirection 6 -TimeoutSec 150 -UseBasicParsing
       if(([string]$answer.Headers['Content-Type']) -match 'json|text/html'){
         throw 'PINNED_MESA_GITHUB_API_RETURNED_METADATA_NOT_ARCHIVE'
       }
     } else {
       throw 'PINNED_MESA_TRANSPORT_METHOD_UNKNOWN'
     }
     if(-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)){
       throw 'PINNED_MESA_TRANSPORT_RETURNED_NO_BYTES'
     }
   } catch {
     $lastReason=$_.Exception.Message
     if(Test-Path -LiteralPath $ArchivePath){Remove-Item -LiteralPath $ArchivePath -Force}
     if($attempt -eq $MaxAttempts){
       throw "PINNED_MESA_TRANSPORT_EXHAUSTED_$($attempt)_ATTEMPTS: $lastReason"
     }
     Write-Warning "Pinned Mesa QA archive $method failed ($attempt/$MaxAttempts); next fixed-origin method"
     if($RetryDelayMs){Start-Sleep -Milliseconds $RetryDelayMs}
     continue
   }
   $actual=(Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
   if($actual -cne $digest){
     Remove-Item -LiteralPath $ArchivePath -Force
     # Treat content mismatch as a security failure, NOT a retryable HTTP failure.
     throw "PINNED_MESA_SHA256_MISMATCH: $actual"
   }
   Write-Host "PINNED_MESA_QA_ARCHIVE=PASS_EXACT_SHA256_VIA_$method (attempt $attempt)"
   return [PSCustomObject]@{sha256=$actual;source=$source;transport=$method;attempts=$attempt}
 }
 throw 'PINNED_MESA_TRANSPORT_EXHAUSTED_UNREACHABLE'
}

function Invoke-TikzariumMesaTransportSelfTest {
 [CmdletBinding()]
 param()
 $root=Join-Path ([IO.Path]::GetTempPath()) ('tikzarium-mesa-transport-test-'+[Guid]::NewGuid().ToString('N'))
 New-Item -ItemType Directory -Path $root -Force | Out-Null
 try {
   $archive=Join-Path $root 'only-test.7z'
   $good=[byte[]](11,22,33,44,55,66)
   # A fixed production SHA cannot be replaced by test bytes: the self-test
   # must verify the *actual* production rejection path, not bypass SHA.
   $calls=0
   $bad={param($method,$path,$attempt) [IO.File]::WriteAllBytes($path,[byte[]](11,22,33,44,55,66))}
   $rejected=$false
   try{[void](Get-TikzariumPinnedMesaArchive -ArchivePath $archive -MaxAttempts 4 -RetryDelayMs 0 -TestDownloader $bad)}
   catch{$rejected=($_.Exception.Message -like '*PINNED_MESA_SHA256_MISMATCH*')}
   if(-not $rejected -or (Test-Path -LiteralPath $archive)){
     throw 'PINNED_MESA_SELFTEST_FORGED_BYTES_ACCEPTED'
   }
   $down={param($method,$path,$attempt) throw 'SIMULATED_HTTP_504'}
   $failed=$false
   try{[void](Get-TikzariumPinnedMesaArchive -ArchivePath $archive -MaxAttempts 4 -RetryDelayMs 0 -TestDownloader $down)}
   catch{$failed=($_.Exception.Message -like '*PINNED_MESA_TRANSPORT_EXHAUSTED_4_ATTEMPTS*')}
   if(-not $failed -or (Test-Path -LiteralPath $archive)){
     throw 'PINNED_MESA_SELFTEST_504_MUST_FAIL_CLOSED'
   }
   $noFiles={param($method,$path,$attempt) }
   $missing=$false
   try{[void](Get-TikzariumPinnedMesaArchive -ArchivePath $archive -MaxAttempts 4 -RetryDelayMs 0 -TestDownloader $noFiles)}
   catch{$missing=($_.Exception.Message -like '*PINNED_MESA_TRANSPORT_EXHAUSTED_4_ATTEMPTS*')}
   if(-not $missing){throw 'PINNED_MESA_SELFTEST_EMPTY_DOWNLOAD_ACCEPTED'}
   # Alternate-origin package is NOT allowed to bypass its independent SHA.
   $backup=Join-Path $root 'msys2-package.pkg.tar.zst'
   [IO.File]::WriteAllBytes($backup,[byte[]](22,33,44))
   $backupBad=$false
   try{[void](Assert-TikzariumMsys2ArchiveHash -ArchivePath $backup)}
   catch{$backupBad=$_.Exception.Message -like '*PINNED_MSYS2_SHA256_MISMATCH*'}
   if(-not $backupBad -or (Test-Path -LiteralPath $backup)){
     throw 'PINNED_MSYS2_SELFTEST_WRONG_SHA_ACCEPTED'
   }
   # The server-side official MSYS2 fallback must fail closed independently:
   # no network is used in this test, and a checksum mismatch is terminal.
   $msys2=Join-Path $root 'official-msys2.pkg.tar.zst'
   $wrongBytes={param($url,$path,$attempt) [IO.File]::WriteAllBytes($path,[byte[]](10,20,30,40))}
   $wrongHash=$false
   try{[void](Get-TikzariumPinnedMsys2Archive -ArchivePath $msys2 -TestDownloader $wrongBytes -RetryDelayMs 0)}
   catch{$wrongHash=$_.Exception.Message -like '*PINNED_MSYS2_SHA256_MISMATCH*'}
   if(-not $wrongHash -or (Test-Path -LiteralPath $msys2)){throw 'MSYS2_WRONG_BYTES_ACCEPTED'}
   $offline={param($url,$path,$attempt) throw 'SIMULATED_OFFICIAL_MIRROR_504'}
   $offlineRejected=$false
   try{[void](Get-TikzariumPinnedMsys2Archive -ArchivePath $msys2 -TestDownloader $offline -RetryDelayMs 0)}
   catch{$offlineRejected=$_.Exception.Message -like '*PINNED_MSYS2_TRANSPORT_EXHAUSTED_3_ATTEMPTS*'}
   if(-not $offlineRejected -or (Test-Path -LiteralPath $msys2)){throw 'MSYS2_TRANSPORT_FAILURE_ACCEPTED'}
   Write-Host 'PINNED_MESA_TRANSPORT_SELFTEST=PASS_6_NEGATIVE_CASES_NO_NETWORK'
 }finally{
   Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
 }
}

# Independently pinned MSYS2 QA-only transport for a trusted-main personal
# Server. No TLS bypass, no OS install, no changing exact hash and no retry of
# a checksum failure. Hosted and personal use the identical upstream bytes.
function Get-TikzariumPinnedMsys2Archive {
 [CmdletBinding()]
 param(
   [Parameter(Mandatory)][string]$ArchivePath,
   [ValidateRange(1,3)][int]$MaxAttempts=3,
   [ValidateRange(0,10000)][int]$RetryDelayMs=1000,
   [scriptblock]$TestDownloader
 )
 $source='https://mirror.msys2.org/mingw/mingw64/mingw-w64-x86_64-mesa-26.2.6-1-any.pkg.tar.zst'
 $parent=[IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($ArchivePath))
 if(-not (Test-Path -LiteralPath $parent -PathType Container)){
   throw 'PINNED_MSYS2_PRIVATE_PARENT_MISSING'
 }
 for($attempt=1;$attempt -le $MaxAttempts;$attempt++){
   if(Test-Path -LiteralPath $ArchivePath -PathType Leaf){
     Remove-Item -LiteralPath $ArchivePath -Force
   }
   try {
     if($TestDownloader){
       & $TestDownloader $source $ArchivePath $attempt
     } else {
       $ProgressPreference='SilentlyContinue'
       Invoke-WebRequest -Uri $source -OutFile $ArchivePath -MaximumRedirection 6 -TimeoutSec 150 -UseBasicParsing | Out-Null
     }
     if(-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)){
       throw 'PINNED_MSYS2_TRANSPORT_RETURNED_NO_BYTES'
     }
   } catch {
     $reason=$_.Exception.Message
     if(Test-Path -LiteralPath $ArchivePath){Remove-Item -LiteralPath $ArchivePath -Force}
     if($attempt -eq $MaxAttempts){
       throw "PINNED_MSYS2_TRANSPORT_EXHAUSTED_$($attempt)_ATTEMPTS: $reason"
     }
     Write-Warning "Official hash-pinned MSYS2 QA transport failed ($attempt/$MaxAttempts); retrying"
     if($RetryDelayMs){Start-Sleep -Milliseconds $RetryDelayMs}
     continue
   }
   # Assert removes wrong bytes and throws. Checksum mismatch is never a
   # fallback/retry trigger: it is a security failure.
   $sha=Assert-TikzariumMsys2ArchiveHash -ArchivePath $ArchivePath
   Write-Host "PINNED_MSYS2_QA_ARCHIVE=PASS_EXACT_SHA256 (attempt $attempt)"
   return [PSCustomObject]@{
     sha256=$sha;source=$source;transport='IWR_OFFICIAL_MSYS2_SHA256';attempts=$attempt
   }
 }
 throw 'PINNED_MSYS2_TRANSPORT_EXHAUSTED_UNREACHABLE'
}

# Independently pinned official MSYS2 package as a backup, not a substitute
# for validating pal1000 bytes. Hash failure removes the file and aborts.
function Assert-TikzariumMsys2ArchiveHash {
 [CmdletBinding()]
 param([Parameter(Mandatory)][string]$ArchivePath)
 $expected='7b14de4d3f234efd0022d14dd7fb313ed751c829bb1f46026e0b2dce2d2d05a4'
 if(-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)){
   throw 'PINNED_MSYS2_FILE_NOT_FOUND'
 }
 $actual=(Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
 if($actual -cne $expected){
   Remove-Item -LiteralPath $ArchivePath -Force
   throw "PINNED_MSYS2_SHA256_MISMATCH: $actual"
 }
 return $actual
}
