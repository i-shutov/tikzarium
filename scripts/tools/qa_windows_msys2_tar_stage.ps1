# Extract only an already SHA-verified official MSYS2 QA-only Mesa .pkg.tar.zst.
# On Windows Server 2025 use the existing Windows tar.exe/libarchive.
# No installers, 7-Zip requirement, system DLL copies, registry or UAC changes.
[CmdletBinding()]
param([switch]$SelfTest)
$ErrorActionPreference='Stop'

function Expand-TikzariumPinnedMsys2WithWindowsTar {
 [CmdletBinding()]
 param(
  [Parameter(Mandatory)][string]$Archive,
  [Parameter(Mandatory)][string]$Destination
 )
 $tar=(Get-Command tar.exe -ErrorAction SilentlyContinue).Source
 if(-not $tar){throw 'PINNED_MSYS2_NATIVE_WINDOWS_TAR_UNAVAILABLE'}
 if(-not (Test-Path -LiteralPath $Archive -PathType Leaf)){
  throw 'PINNED_MSYS2_NATIVE_TAR_ARCHIVE_MISSING'
 }
 if(-not (Test-Path -LiteralPath $Destination -PathType Container)){
  throw 'PINNED_MSYS2_NATIVE_TAR_OUTPUT_DIRECTORY_MISSING'
 }
 # libarchive tar.exe reads the compressed .pkg.tar.zst directly when the
 # installed Windows build supports Zstandard. This is not an archive-format
 # claim until the REAL pinned source has passed on the personal Server.
 & $tar -xf $Archive -C $Destination
 if($LASTEXITCODE -ne 0){
  throw "PINNED_MSYS2_NATIVE_TAR_ZSTD_EXTRACTION_FAILED_EXIT_$LASTEXITCODE"
 }
 $bin=Join-Path $Destination 'mingw64\bin'
 if(-not (Test-Path -LiteralPath $bin -PathType Container)){
  throw 'PINNED_MSYS2_NATIVE_TAR_NO_MINGW64_BIN'
 }
 foreach($name in @('opengl32.dll','libgallium_wgl.dll')){
  if(-not (Test-Path -LiteralPath (Join-Path $bin $name) -PathType Leaf)){
   throw "PINNED_MSYS2_NATIVE_TAR_REQUIRED_DLL_MISSING_$name"
  }
 }
 Write-Host 'PINNED_MSYS2_NATIVE_TAR=PASS_STRUCTURAL_NOT_GL_GUI_ACCEPTANCE'
 return [PSCustomObject]@{method='EXISTING_WINDOWS_TAR_DIRECT_ZST';bin=$bin}
}

if($SelfTest){
 # Use a tiny locally-created .tar fixture to exercise the native CLI/paths;
 # the real .pkg.tar.zst decompression still requires actual pinned bytes on
 # the private Windows Server and is never assumed from this synthetic tar.
 $root=Join-Path ([IO.Path]::GetTempPath()) ('tikzarium-tar-noinstall-'+[guid]::NewGuid().ToString('N'))
 $src=Join-Path $root 'source'
 $dest=Join-Path $root 'output'
 New-Item -ItemType Directory -Path (Join-Path $src 'mingw64\bin') -Force | Out-Null
 New-Item -ItemType Directory -Path $dest -Force | Out-Null
 try{
  [IO.File]::WriteAllBytes((Join-Path $src 'mingw64\bin\opengl32.dll'),[byte[]](1,2))
  [IO.File]::WriteAllBytes((Join-Path $src 'mingw64\bin\libgallium_wgl.dll'),[byte[]](3,4))
  $tar=(Get-Command tar.exe -ErrorAction SilentlyContinue).Source
  if(-not $tar){throw 'PINNED_MSYS2_NATIVE_TAR_SELFTEST_REQUIRES_HOSTED_WINDOWS_TAR'}
  $tarFixture=Join-Path $root 'synthetic-layout-only.tar'
  & $tar -cf $tarFixture -C $src mingw64
  if($LASTEXITCODE -ne 0){throw 'PINNED_MSYS2_SYNTHETIC_TAR_FIXTURE_CREATE_FAILED'}
  $result=Expand-TikzariumPinnedMsys2WithWindowsTar -Archive $tarFixture -Destination $dest
  if($result.method -cne 'EXISTING_WINDOWS_TAR_DIRECT_ZST' -or
     -not (Test-Path -LiteralPath (Join-Path $dest 'mingw64\bin\opengl32.dll'))){
   throw 'PINNED_MSYS2_NATIVE_TAR_POSITIVE_SYNTHETIC_LAYOUT_FAILED'
  }
  $bad=$false
  try{
   [void](Expand-TikzariumPinnedMsys2WithWindowsTar -Archive (Join-Path $root 'absent.pkg.tar.zst') -Destination $dest)
  }catch{$bad=$_.Exception.Message -like '*PINNED_MSYS2_NATIVE_TAR_ARCHIVE_MISSING*'}
  if(-not $bad){throw 'PINNED_MSYS2_NATIVE_TAR_ABSENT_ARCHIVE_WAS_ACCEPTED'}
  # Synthetic negative: a parseable archive with only one of the two
  # required DLLs must fail before ANY real GUI process can be launched.
  $badSource=Join-Path $root 'missing-opengl'
  New-Item -ItemType Directory -Path (Join-Path $badSource 'mingw64\bin') -Force | Out-Null
  [IO.File]::WriteAllBytes((Join-Path $badSource 'mingw64\bin\libgallium_wgl.dll'),[byte[]](8,9))
  $badTar=Join-Path $root 'missing-opengl.tar'
  & $tar -cf $badTar -C $badSource mingw64
  if($LASTEXITCODE -ne 0){throw 'PINNED_MSYS2_BAD_LAYOUT_FIXTURE_CREATE_FAILED'}
  $badOutput=Join-Path $root 'missing-opengl-output'
  New-Item -ItemType Directory -Path $badOutput -Force | Out-Null
  $missingRejected=$false
  try{
   [void](Expand-TikzariumPinnedMsys2WithWindowsTar -Archive $badTar -Destination $badOutput)
  }catch{$missingRejected=$_.Exception.Message -like '*PINNED_MSYS2_NATIVE_TAR_REQUIRED_DLL_MISSING_opengl32.dll*'}
  if(-not $missingRejected){throw 'PINNED_MSYS2_NATIVE_TAR_ACCEPTED_MISSING_OPENGL_DLL'}
  Write-Host 'PINNED_MSYS2_NATIVE_TAR_SELFTEST=PASS_NATIVE_TAR_LAYOUT_ABSENT_ARCHIVE_MISSING_DLL_NO_INSTALL'
 }finally{Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue}
}