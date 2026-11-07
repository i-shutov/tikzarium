# PowerShell 5.1 executable contract tests; no Python or elevated document execution.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'windows_native_pe.ps1')
$root=Join-Path ([IO.Path]::GetTempPath()) ('tikzarium-pe-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null
function Fixture([string]$Name,[int]$Subsystem=3){
 $b=New-Object byte[] 1536
 function W16([int]$p,[uint16]$v){[BitConverter]::GetBytes($v).CopyTo($b,$p)}
 function W32([int]$p,[uint32]$v){[BitConverter]::GetBytes($v).CopyTo($b,$p)}
 W16 0 0x5a4d;W32 60 128;W32 128 0x4550;W16 132 0x8664;W16 134 1;W16 148 240
 W16 152 0x20b;W16 220 $Subsystem;W32 212 1024;W32 260 16
 W32 272 4096;W32 276 40
 W32 400 512;W32 404 4096;W32 408 512;W32 412 1024
 W32 1036 4160;W32 1040 4224
 [Text.Encoding]::ASCII.GetBytes($Name).CopyTo($b,1088)
 return ,$b
}
function MustFail([scriptblock]$Action){
 $failed=$false
 try {& $Action | Out-Null} catch {$failed=$true}
 if(-not $failed){throw 'Negative PE fixture was falsely accepted'}
}
try {
 $p=Join-Path $root 'cli.exe';[IO.File]::WriteAllBytes($p,(Fixture 'KERNEL32.dll' 3))
 $r=Get-TikzariumPortablePe -Path $p -ExpectedSubsystem 3
 if($r.imports -notcontains 'KERNEL32.dll' -or $r.crt_imports -cne 'PASS_NO_DYNAMIC_VCRUNTIME'){throw 'Genuine fixture not audited'}
 MustFail {Get-TikzariumPortablePe -Path $p -ExpectedSubsystem 2}
 $p2=Join-Path $root 'gui.exe';[IO.File]::WriteAllBytes($p2,(Fixture 'USER32.dll' 2))
 $null=Get-TikzariumPortablePe -Path $p2 -ExpectedSubsystem 2
 foreach($dll in @('VCRUNTIME140.dll','msvcp140.dll')){
  [IO.File]::WriteAllBytes($p,(Fixture $dll 3));MustFail {Get-TikzariumPortablePe -Path $p -ExpectedSubsystem 3}
 }
 [IO.File]::WriteAllBytes($p,(New-Object byte[] 20));MustFail {Get-TikzariumPortablePe -Path $p -ExpectedSubsystem 3}
 $bad=Fixture 'KERNEL32.dll' 3;$bad[0]=0
 [IO.File]::WriteAllBytes($p,$bad);MustFail {Get-TikzariumPortablePe -Path $p -ExpectedSubsystem 3}
 # PS5.1 parses 0xfffffff0 as signed -16; use the explicit positive decimal.
 $bad=Fixture 'KERNEL32.dll' 3;[BitConverter]::GetBytes([uint32]4294967280).CopyTo($bad,1036)
 [IO.File]::WriteAllBytes($p,$bad);MustFail {Get-TikzariumPortablePe -Path $p -ExpectedSubsystem 3}
 Write-Host 'PASS: PE GUI/CLI, import names, both VC runtime negatives, truncated/MZ/RVA negatives; no Python required'
} finally {Remove-Item -LiteralPath $root -Recurse -Force}
