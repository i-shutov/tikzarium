# State-machine tests: execute the production handshake, not a copied eligibility predicate.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'qa_windows_owned_foreground.ps1')
$cases=@(
 @{name='delayed activation';invalid='';delay=2;responsive=$true;gain=$true;want='CONFIRMED_OWNED_FOREGROUND'},
 @{name='API success is not HWND proof';invalid='';delay=0;responsive=$true;gain=$false;want='BLOCKED_FOREGROUND_NOT_OWNED'},
 @{name='unresponsive event loop';invalid='';delay=0;responsive=$false;gain=$false;want='BLOCKED_FOREGROUND_NOT_OWNED'},
 @{name='foreign PID';invalid='OWNED_WINDOW_IDENTITY_CHANGED';delay=0;responsive=$true;gain=$true;want='BLOCKED_FOREGROUND_NOT_OWNED'},
 @{name='foreign session';invalid='OWNED_PROCESS_OTHER_SESSION';delay=0;responsive=$true;gain=$true;want='BLOCKED_FOREGROUND_NOT_OWNED'},
 @{name='RDP disconnect';invalid='SESSION_DISCONNECTED_OR_UNKNOWN';delay=0;responsive=$true;gain=$true;want='BLOCKED_FOREGROUND_NOT_OWNED'},
 @{name='locked input';invalid='INPUT_DESKTOP_LOCKED_OR_UNAVAILABLE';delay=0;responsive=$true;gain=$true;want='BLOCKED_FOREGROUND_NOT_OWNED'},
 @{name='hidden owned window';invalid='OWNED_WINDOW_NOT_VISIBLE';delay=0;responsive=$true;gain=$true;want='BLOCKED_FOREGROUND_NOT_OWNED'},
 @{name='wrong desktop';invalid='OWNED_THREAD_NOT_DEFAULT_DESKTOP';delay=0;responsive=$true;gain=$true;want='BLOCKED_FOREGROUND_NOT_OWNED'}
)
foreach($case in $cases){
 $state=@{fg=[IntPtr]::Zero;requests=0;barriers=0;case=$case}
 $fake=@{
  Validate={param($h,$p,$s) if($state.case.invalid){$state.case.invalid}else{'OWNED_ACTIVE_DEFAULT_DESKTOP'}}
  Foreground={ $state.fg }
  Activate={param($h) if($h -ne [IntPtr]4242){throw 'foreign activation'};$state.requests++;$true}
  Barrier={param($h,$ms)
   if($h -ne [IntPtr]4242 -or $ms -le 0 -or $ms -gt 750){throw 'invalid target/budget'}
   $state.barriers++
   if($state.case.gain -and $state.requests -gt 0 -and $state.barriers -gt $state.case.delay){$state.fg=[IntPtr]4242}
   [PSCustomObject]@{responsive=$state.case.responsive;error=0}
  }
  Delay={param($ms)}
 }
 $result=Request-W2OwnedForeground ([IntPtr]4242) 42 2 -Native $fake -MaxAttempts 4
 if($result.outcome -cne $case.want){throw "$($case.name): $($result | ConvertTo-Json -Depth 8)"}
 if($case.invalid -and ($state.requests -ne 0 -or $state.barriers -ne 0)){throw 'invalid identity reached native action'}
 if(-not $case.responsive -and $state.requests -ne 0){throw 'unresponsive child received activation request'}
 if($result.used_temporary_input_queue_attachment -or $result.used_owned_input_queue_attachment){throw 'input queues must never attach'}
}
# Ownership changes DURING WM_NULL: no subsequent activation is allowed.
$state=@{validations=0;requests=0}
$fake=@{
 Validate={param($h,$p,$s) $state.validations++;if($state.validations -gt 1){'OWNED_WINDOW_IDENTITY_CHANGED'}else{'OWNED_ACTIVE_DEFAULT_DESKTOP'}}
 Foreground={ [IntPtr]::Zero }
 Activate={param($h) $state.requests++;$true}
 Barrier={param($h,$ms) [PSCustomObject]@{responsive=$true;error=0}}
 Delay={param($ms)}
}
$r=Request-W2OwnedForeground ([IntPtr]4242) 42 2 -Native $fake -MaxAttempts 4
if($r.outcome -cne 'BLOCKED_FOREGROUND_NOT_OWNED' -or $state.requests -ne 0){throw 'TOCTOU ownership fence failed'}
$bad=Request-W2OwnedForeground ([IntPtr]::Zero) 42 2
if($bad.reason -cne 'INVALID_OWNED_HANDLE_OR_SESSION' -or $bad.attempted -ne 0){throw 'zero HWND not rejected'}
Write-Host 'W2_ASYNC_FOREGROUND_SELFTEST=PASS_11_CASES_NO_QUEUE_ATTACH_NOT_PHYSICAL'
