# Verify the actual distributable or independently server-built EXE before W2.
# Hosted origin proves package transport and personal execution, NOT a local build.
function Get-W2BinaryEvidence {
 [CmdletBinding()]
 param([string]$EvidenceDirectory,[string]$ExpectedSha,
       [ValidateSet('server-native','verified-hosted-release')][string]$BinaryOrigin='server-native')
 if($ExpectedSha -cnotmatch '^[0-9a-f]{40}$'){throw 'W2 binary requires exact source SHA'}
 if($BinaryOrigin -ceq 'verified-hosted-release'){
  $proof=Get-Content -LiteralPath (Join-Path $EvidenceDirectory 'windows-server-hosted-artifact.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if($proof.source_sha -cne $ExpectedSha -or
     $proof.status -cne 'PASS_VERIFIED_HOSTED_EXE_ZIP_ON_PERSONAL_SERVER_NOT_GUI' -or
     $proof.verification_host -cne 'personal-server' -or
     $proof.pe_gui_subsystem -ne 2 -or $proof.pe_cli_subsystem -ne 3 -or
     $proof.manifest_verified_files -ne 5 -or $proof.cli_local_help -cne 'PASS_NO_TEX_INVOCATION' -or
     $proof.source_ci_run_id -notmatch '^[0-9]+$'){
   throw 'W2 hosted origin must be independently verified exact-main EXE/ZIP on this personal Server'
  }
  $exe=Join-Path $EvidenceDirectory 'hosted-native-verified\tikzarium-app.exe'
 }else{
  $proof=Get-Content -LiteralPath (Join-Path $EvidenceDirectory 'windows-server-rust.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if($proof.source_sha -cne $ExpectedSha -or
     $proof.release_build -cne 'PASS_WINDOWS_SERVER_NOT_WIN10' -or
     $proof.gui_pe -cne 'PASS_WINDOWS_GUI_SUBSYSTEM_2'){
   throw 'W2 server-native origin requires original qualified exact-main server native GUI PE2'
  }
  $exe=Join-Path $EvidenceDirectory 'native-release\tikzarium-app.exe'
 }
 if(-not (Test-Path -LiteralPath $exe -PathType Leaf)){throw 'Original W2 EXE is absent'}
 $hash=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant()
 if($hash -cne $proof.app_sha256){throw 'Original W2 EXE differs from qualified origin SHA256'}
 # Do not trust labels alone: re-read x64 PE imports and GUI subsystem from bytes.
 . (Join-Path $PSScriptRoot 'windows_native_pe.ps1')
 $pe=Get-TikzariumPortablePe -Path $exe -ExpectedSubsystem 2
 if($pe.sha256 -and $pe.sha256 -cne $hash){throw 'W2 EXE changed during PE verification'}
 return [PSCustomObject]@{path=$exe;app_sha256=$hash;origin=$BinaryOrigin;source_sha=$ExpectedSha;source_ci_run_id=$proof.source_ci_run_id}
}
