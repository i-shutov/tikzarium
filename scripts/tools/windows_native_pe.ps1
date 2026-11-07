# PowerShell 5.1 / .NET PE32+ audit. No Python, installation or native execution.
function Get-TikzariumPortablePe {
 [CmdletBinding()]
 param([Parameter(Mandatory)][string]$Path,[Parameter(Mandatory)][ValidateSet(2,3)][int]$ExpectedSubsystem)
 $file=Get-Item -LiteralPath $Path -ErrorAction Stop
 if($file.Length -lt 256 -or $file.Length -gt 268435456){throw 'PE file size outside audit bounds'}
 $bytes=[IO.File]::ReadAllBytes($file.FullName)
 function Bounds([long]$Offset,[long]$Count) {
  if($Offset -lt 0 -or $Count -lt 0 -or $Offset -gt $bytes.LongLength-$Count){throw 'Truncated PE data'}
 }
 function U16([long]$Offset){Bounds $Offset 2; return [BitConverter]::ToUInt16($bytes,[int]$Offset)}
 function U32([long]$Offset){Bounds $Offset 4; return [long][BitConverter]::ToUInt32($bytes,[int]$Offset)}
 if((U16 0) -ne 0x5a4d){throw 'Missing MZ signature'}
 $pe=U32 0x3c
 if($pe -lt 64 -or (U32 $pe) -ne 0x4550){throw 'Missing PE signature'}
 if((U16 ($pe+4)) -ne 0x8664){throw 'Expected AMD64 PE'}
 $count=U16 ($pe+6);$optionalSize=U16 ($pe+20);$opt=$pe+24
 if($count -lt 1 -or $count -gt 96 -or $optionalSize -lt 112){throw 'Invalid PE header dimensions'}
 Bounds $opt $optionalSize
 if((U16 $opt) -ne 0x20b){throw 'Expected PE32+'}
 $subsystem=U16 ($opt+68)
 if($subsystem -ne $ExpectedSubsystem){throw "Wrong PE subsystem $subsystem, expected $ExpectedSubsystem"}
 $headers=U32 ($opt+60);$directoryCount=U32 ($opt+108)
 if($headers -gt $bytes.LongLength -or $directoryCount -gt 16 -or 112+8*$directoryCount -gt $optionalSize){throw 'Invalid PE directories'}
 $sections=@()
 for($i=0;$i -lt $count;$i++){
  $s=$opt+$optionalSize+40*$i;Bounds $s 40
  $raw=U32 ($s+20);$length=U32 ($s+16);$rva=U32 ($s+12)
  Bounds $raw $length
  $sections+=,[pscustomobject]@{rva=$rva;raw=$raw;length=$length}
 }
 function RvaOffset([long]$Rva,[long]$Length){
  if($Rva -lt $headers -and $Rva+$Length -le $headers){Bounds $Rva $Length;return $Rva}
  $matches=@($sections | Where-Object {$Rva -ge $_.rva -and $Rva+$Length -le $_.rva+$_.length})
  if($matches.Count -ne 1){throw 'Unmapped or ambiguous PE RVA'}
  $offset=$matches[0].raw+$Rva-$matches[0].rva;Bounds $offset $Length;return $offset
 }
 function DllName([long]$Rva){
  $name=New-Object Text.StringBuilder
  for($j=0;$j -lt 512;$j++){
   $offset=RvaOffset ($Rva+$j) 1;$c=$bytes[[int]$offset]
   if($c -eq 0){
    $value=$name.ToString()
    if($value -cnotmatch '^[A-Za-z0-9_.-]+\.[dD][lL][lL]$'){throw 'Invalid import DLL name'}
    return $value
   }
   if($c -lt 33 -or $c -gt 126){throw 'Non-ASCII import DLL name'}
   [void]$name.Append([char]$c)
  }
  throw 'Unterminated import DLL name'
 }
 $names=@()
 foreach($dir in @(@{index=1;stride=20;nameOffset=12},@{index=13;stride=32;nameOffset=4})){
  if($directoryCount -le $dir.index){continue}
  $table=U32 ($opt+112+8*$dir.index);$size=U32 ($opt+116+8*$dir.index)
  if($table -eq 0 -and $size -eq 0){continue}
  if($table -eq 0 -or $size -lt $dir.stride -or $size -gt 1048576){throw 'Invalid import table size'}
  $terminated=$false
  for($n=0;$n -lt [Math]::Min(4096,[Math]::Floor($size/$dir.stride));$n++){
   $pos=RvaOffset ($table+$n*$dir.stride) $dir.stride
   $nonzero=$false
   for($k=0;$k -lt $dir.stride;$k+=4){if((U32 ($pos+$k)) -ne 0){$nonzero=$true}}
   if(-not $nonzero){$terminated=$true;break}
   if($dir.index -eq 13 -and (U32 $pos) -ne 1){throw 'Unsupported non-RVA delay imports'}
   $nameRva=U32 ($pos+$dir.nameOffset)
   if($nameRva -eq 0){throw 'Import descriptor has no DLL name'}
   $names+=DllName $nameRva
  }
  if(-not $terminated){throw 'Unterminated PE import descriptors'}
 }
 if($names.Count -eq 0){throw 'No PE imports found'}
 $dlls=@($names | Sort-Object -Unique)
 $forbidden=@($dlls | Where-Object {$_ -match '^(VCRUNTIME|MSVCP).*\.dll$'})
 if($forbidden.Count -ne 0){throw ('External VC runtime imports: '+($forbidden -join ', '))}
 [pscustomobject]@{path=$file.FullName;sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant();machine='AMD64';subsystem=$subsystem;imports=$dlls;crt_imports='PASS_NO_DYNAMIC_VCRUNTIME';auditor='POWERSHELL_DOTNET_NO_PYTHON'}
}
