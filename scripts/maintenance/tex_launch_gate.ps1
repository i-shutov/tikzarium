# Read-only current-user Windows TeX gate. Administrator is supported; no elevation.
function Test-TikzariumMaintenanceTexTokenFacts {
  [CmdletBinding()]
  param([AllowNull()]$Facts)
  $unknown=[pscustomobject]@{status='BLOCKED_TOKEN_UNKNOWN';token_is_elevated=$null;token_integrity_rid=$null;session_id=$null;token_elevation_type=$null;warning_required=$false}
  if($null -eq $Facts){return $unknown}
  $required=@('token_is_elevated','token_integrity_rid','session_id','token_elevation_type')
  $keys=@($Facts.PSObject.Properties.Name)
  foreach($key in $required){if($key -notin $keys){return $unknown}}
  if(($Facts.token_is_elevated -isnot [bool]) -or
     ($Facts.token_integrity_rid -isnot [int]) -or
     ($Facts.session_id -isnot [int]) -or
     ($Facts.token_elevation_type -notin @('DEFAULT','FULL','LIMITED'))){return $unknown}
  $status='BLOCKED_INTEGRITY'
  if($Facts.session_id -le 0){$status='BLOCKED_SESSION0'}
  elseif($Facts.token_integrity_rid -ge 8192 -and $Facts.token_integrity_rid -lt 16384){
    $status='ELIGIBLE_CURRENT_USER_TOKEN'
  }
  [pscustomobject]@{
    status=$status
    token_is_elevated=[bool]$Facts.token_is_elevated
    token_integrity_rid=[int]$Facts.token_integrity_rid
    session_id=[int]$Facts.session_id
    token_elevation_type=[string]$Facts.token_elevation_type
    warning_required=($Facts.token_is_elevated -or $Facts.token_integrity_rid -ge 12288)
  }
}
function Get-TikzariumMaintenanceTexGate {
  [CmdletBinding()]
  param()
  try {
    $inspector=Join-Path $PSScriptRoot '..\tools\qa_windows_token.ps1'
    $facts=& $inspector
    $gate=Test-TikzariumMaintenanceTexTokenFacts -Facts $facts
    if($gate.status -eq 'ELIGIBLE_CURRENT_USER_TOKEN' -and $gate.warning_required){
      Write-Warning 'Current-user Administrator execution, not an OS sandbox. Use trusted documents; native MiKTeX warnings and actual exit status are retained.'
    }
    return $gate
  } catch {
    return (Test-TikzariumMaintenanceTexTokenFacts -Facts $null)
  }
}
