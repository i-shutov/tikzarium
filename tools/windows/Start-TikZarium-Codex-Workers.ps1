#requires -Version 5.1
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$RepoPath,
 [ValidateSet('UX2','SCI')][string]$Batch='UX2',
 [string]$Model='gpt-6.1-sol'
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$git=(Get-Command git -ErrorAction Stop).Source
$codex=(Get-Command codex -ErrorAction Stop).Source
$root=(Resolve-Path -LiteralPath $RepoPath -ErrorAction Stop).ProviderPath
$remote=(& $git -C $root remote get-url origin).Trim()
if($LASTEXITCODE -ne 0 -or $remote -notmatch '(?i)github\.com[:/]i-shutov/tikzarium(\.git)?$'){
 throw 'Refusing unexpected Git repository origin'
}
$top=(& $git -C $root rev-parse --show-toplevel).Trim()
if($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath($top).TrimEnd('\') -ne [IO.Path]::GetFullPath($root).TrimEnd('\')){
 throw 'RepoPath must be the repository root'
}
$dirty=(& $git -C $root status --porcelain)
if($LASTEXITCODE -ne 0 -or $dirty){throw 'Use a clean Git checkout; script does not stash/discard edits'}
if($Batch -eq 'UX2'){
 $ref='refs/heads/feat/ux2-studio-direct-tools-20261111'
 $tasks=@(
  @{Name='rail';Issue=170;Ownership='crates/tikzarium-app/src/studio_ui.rs and its unit tests ONLY';Goal='Improve premium six direct TikZ tool buttons, Russian captions, hover/focus/active and keyboard accessibility at 1180x680/1366x768. Extend raw egui pointer/keyboard and source-integrity tests. Never touch main.rs, tikz_canvas.rs or ui_theme.rs.'},
  @{Name='qa';Issue=171;Ownership='scripts/qa_i61_b42_studio_x11.py, scripts/qa_n2_studio_x11.py, scripts/tests/test_qa_* ONLY';Goal='Independently strengthen I61/N2 GUI evidence, negative source/PNG/PDF SHA and CRLF checks, literal widget click verification, F1/Apply/Undo; fail closed instead of replacing screenshots with synthetic passes. No production code changes.'}
 )
}else{
 $ref='refs/heads/main'
 $tasks=@(
  @{Name='pgf-scanner';Issue=177;Ownership='crates/tikzarium-extensions/tests/scientific_*.rs and isolated scientific QA docs ONLY';Goal='Add adversarial PGFPlots axis/addplot SourcePatch tests: unknown TeX/macros, nested options, Unicode/CRLF, revision invalidation, missing/multiple keys, byte-perfect negative edits. No production API changes or scientific fixture edits.'},
  @{Name='g3-review';Issue=176;Ownership='new isolated performance test/insights files ONLY';Goal='Measure and analyze 10k/1MiB vs 100k/10MiB editor layout and up-to-64-full-copy SC1 Undo memory. Propose bounded solution and reproducible CPU test. Never label CPU time native input-to-frame p95 and never change production main.rs.'}
 )
}
& $git -C $root fetch --no-tags origin $ref
if($LASTEXITCODE -ne 0){throw 'Git fetch failed: no user environment auto-repair'}
$sourceSha=(& $git -C $root rev-parse FETCH_HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $sourceSha -notmatch '^[0-9a-f]{40}$'){throw 'Invalid base SHA'}
$stamp=(Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$target=Join-Path (Join-Path $env:USERPROFILE 'Documents\TikZarium-Codex-Workers') ($stamp+'-'+$Batch)
New-Item -ItemType Directory -Path $target -Force | Out-Null
$records=@()
foreach($task in $tasks){
 $name=$task.Name
 $worktree=Join-Path $target $name
 $branch='codex/'+$Batch.ToLower()+'-'+$name+'-'+$stamp
 & $git -C $root worktree add -b $branch $worktree $sourceSha
 if($LASTEXITCODE -ne 0){throw ('Failed worktree '+$name)}
 $prompt=Join-Path $target ($name+'.prompt.txt')
 $policy='Read AGENTS.md and docs/RELEASE_SCOPE_SCIENTIFIC_STUDIO_1_0_RU.md. You are a junior Codex, issue #'+$task.Issue+'. File ownership: '+$task.Ownership+'. Task: '+$task.Goal+'. Make one local commit. Never push/merge, install programs, change UAC/RDP/MiKTeX/drivers/FlowBridge, run untrusted sources, alter unrelated files or weaken QA. Include exact SHA, modified files, test stdout, failures, NOT_RUN native/scientific gates in final answer.'
 [IO.File]::WriteAllText($prompt,$policy,(New-Object System.Text.UTF8Encoding($false)))
 $records += [pscustomobject]@{
  Name=$name;Issue=$task.Issue;Sha=$sourceSha;Branch=$branch;
  Worktree=$worktree;Prompt=$prompt;Log=(Join-Path $target ($name+'.log'));
  Final=(Join-Path $target ($name+'.final.md'))
 }
}
$records | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $target 'manifest.json') -Encoding UTF8
$jobs=@()
foreach($w in $records){
 $jobs+=Start-Job -Name $w.Name -ArgumentList @($codex,$Model,$w.Worktree,$w.Prompt,$w.Log,$w.Final) -ScriptBlock {
  param($exe,$model,$dir,$prompt,$log,$final)
  $ErrorActionPreference='Stop'
  Set-Location -LiteralPath $dir
  Get-Content -LiteralPath $prompt -Raw -Encoding UTF8 |
   & $exe exec --sandbox workspace-write --model $model -C $dir -o $final - 2>&1 |
   Out-File -LiteralPath $log -Encoding UTF8
  if($LASTEXITCODE -ne 0){throw ('Codex worker failed, inspect '+$log)}
  Write-Output ('Worker completed: '+$dir)
 }
 Write-Host ('STARTED Codex '+$Model+' '+$w.Name+' issue #'+$w.Issue)
}
$null=$jobs | Wait-Job
$failed=$false
foreach($j in $jobs){
 Receive-Job -Job $j
 if($j.State -ne 'Completed'){$failed=$true}
 Write-Host ($j.Name+': '+$j.State)
 Remove-Job $j
}
Write-Host ('Manifest and exact worker logs: '+$target)
Write-Host 'No remote pushes or merges; review local commits and source evidence.'
if($failed){throw 'One or more agents failed; original worktrees/logs preserved'}
