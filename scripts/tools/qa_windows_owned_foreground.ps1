# Async Win32 activation handshake. No input queue attachment or foreign-window activation.
# One bounded BringWindowToTop fallback is allowed only on the verified owned HWND,
# never on another process or desktop, and never substitutes for foreground proof.
# https://devblogs.microsoft.com/oldnewthing/20161118-00/?p=94745
# Dot-source after TikzariumW2Win32 is defined, or supply a fake adapter in SelfTest.
function Get-W2OwnedRuntimeStatus([IntPtr]$Handle,[int]$ExpectedPid,[int]$ExpectedSession) {
 [uint32]$observed=0
 [uint32]$thread=[TikzariumW2Win32]::GetWindowThreadProcessId($Handle,[ref]$observed)
 if($observed -ne $ExpectedPid -or $thread -eq 0){return 'OWNED_WINDOW_IDENTITY_CHANGED'}
 if(-not [TikzariumW2Win32]::IsWindowVisible($Handle)){return 'OWNED_WINDOW_NOT_VISIBLE'}
 try{$session=[Diagnostics.Process]::GetProcessById($ExpectedPid).SessionId}
 catch{return 'OWNED_PROCESS_DISAPPEARED'}
 if($session -ne $ExpectedSession){return 'OWNED_PROCESS_OTHER_SESSION'}
 $desktop=[TikzariumW2Win32]::ObjectName([TikzariumW2Win32]::GetThreadDesktop($thread))
 if($desktop -cne 'Default'){return 'OWNED_THREAD_NOT_DEFAULT_DESKTOP'}
 $input=[TikzariumW2Win32]::OpenInputDesktop(0,$false,1)
 try{$name=[TikzariumW2Win32]::ObjectName($input)}
 finally{if($input -ne [IntPtr]::Zero){[void][TikzariumW2Win32]::CloseDesktop($input)}}
 if($name -cne 'Default'){return 'INPUT_DESKTOP_LOCKED_OR_UNAVAILABLE'}
 [IntPtr]$buffer=[IntPtr]::Zero;[int]$bytes=0;$state=-1
 try{
  if([TikzariumW2Win32]::WTSQuerySessionInformation([IntPtr]::Zero,$ExpectedSession,8,[ref]$buffer,[ref]$bytes) -and $bytes -ge 4){
   $state=[Runtime.InteropServices.Marshal]::ReadInt32($buffer)
  }
 }finally{if($buffer -ne [IntPtr]::Zero){[TikzariumW2Win32]::WTSFreeMemory($buffer)}}
 if($state -ne 0){return 'SESSION_DISCONNECTED_OR_UNKNOWN'}
 return 'OWNED_ACTIVE_DEFAULT_DESKTOP'
}

function Request-W2OwnedForeground {
 [CmdletBinding()]
 param([IntPtr]$OwnedHandle,[int]$OwnedPid,[int]$SessionId,
       [ValidateRange(1,30)][int]$MaxAttempts=20,
       [ValidateRange(100,30000)][int]$DeadlineMs=30000,
       [hashtable]$Native)
 $evidence=[ordered]@{
  outcome='BLOCKED_FOREGROUND_NOT_OWNED';reason='INVALID_OWNED_HANDLE_OR_SESSION'
  method='SETFOREGROUND_WM_NULL_BARRIER_NO_QUEUE_ATTACH';attempted=0
  trace=@();elapsed_ms=0;used_temporary_input_queue_attachment=$false
  used_owned_input_queue_attachment=$false
 }
 if($OwnedHandle -eq [IntPtr]::Zero -or $OwnedPid -le 0 -or $SessionId -le 0){return [PSCustomObject]$evidence}
 if(-not $Native){
  $Native=@{
   Validate={param($h,$p,$s) Get-W2OwnedRuntimeStatus $h $p $s}
   Foreground={ [TikzariumW2Win32]::GetForegroundWindow() }
   Activate={param($h) [TikzariumW2Win32]::SetForegroundWindow($h)}
   RaiseOwned={param($h) [TikzariumW2Win32]::BringWindowToTop($h)}
   Barrier={param($h,$timeout)
    [UIntPtr]$result=[UIntPtr]::Zero
    # WM_NULL=0. ABORTIFHUNG|ERRORONEXIT=0x22. No NOTIMEOUTIFNOTHUNG.
    $ok=[TikzariumW2Win32]::SendMessageTimeout($h,0,[UIntPtr]::Zero,[IntPtr]::Zero,0x22,[uint32]$timeout,[ref]$result)
    $lastError=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
    [PSCustomObject]@{responsive=($ok -ne [IntPtr]::Zero);error=$lastError}
   }
   Delay={param($ms) Start-Sleep -Milliseconds $ms}
  }
 }
 $promotionTried=$false
 $clock=[Diagnostics.Stopwatch]::StartNew()
 try{
  for($attempt=1;$attempt -le $MaxAttempts -and $clock.ElapsedMilliseconds -lt $DeadlineMs;$attempt++){
   $evidence.attempted=$attempt
   $row=[ordered]@{attempt=$attempt;elapsed_ms=$clock.ElapsedMilliseconds;activation_return=$null;owned_raise_return=$null;activation_route='SETFOREGROUND_ONLY';ready=$false;processed=$false;foreground_hwnd='0';reason='NOT_RUN'}
   $evidence.trace+=([PSCustomObject]$row)
   $row=$evidence.trace[-1]
   $valid=& $Native.Validate $OwnedHandle $OwnedPid $SessionId
   if($valid -cne 'OWNED_ACTIVE_DEFAULT_DESKTOP'){$evidence.reason=$valid;$row.reason=$valid;break}
   $budget=[Math]::Min(750,[Math]::Max(1,$DeadlineMs-$clock.ElapsedMilliseconds))
   $ready=& $Native.Barrier $OwnedHandle $budget
   $row.ready=[bool]$ready.responsive
   if(-not $ready.responsive){
    $row.reason='OWNED_EVENT_LOOP_NOT_READY_ERROR_'+$ready.error
    $evidence.reason='OWNED_EVENT_LOOP_UNRESPONSIVE'
    & $Native.Delay 100
    continue
   }
   # The PID/session/input desktop may change while waiting for the event loop.
   $valid=& $Native.Validate $OwnedHandle $OwnedPid $SessionId
   if($valid -cne 'OWNED_ACTIVE_DEFAULT_DESKTOP'){$evidence.reason=$valid;$row.reason=$valid;break}
   # Only after the first unsuccessful foreground handshake: try Win32's normal
   # activation of this same verified top-level window once. No user input,
   # queue attachment, registry changes, foreign activation, or desktop capture.
   if(-not $promotionTried -and $attempt -ge 2 -and
      $Native.ContainsKey('RaiseOwned') -and
      (& $Native.Foreground) -ne $OwnedHandle){
    $promotionTried=$true
    $row.activation_route='OWNED_BRING_TO_TOP_THEN_SETFOREGROUND'
    $row.owned_raise_return=[bool](& $Native.RaiseOwned $OwnedHandle)
   }
   if((& $Native.Foreground) -ne $OwnedHandle){$row.activation_return=[bool](& $Native.Activate $OwnedHandle)}
   $budget=[Math]::Min(750,[Math]::Max(1,$DeadlineMs-$clock.ElapsedMilliseconds))
   $barrier=& $Native.Barrier $OwnedHandle $budget
   $row.processed=[bool]$barrier.responsive
   $valid=& $Native.Validate $OwnedHandle $OwnedPid $SessionId
   if($valid -cne 'OWNED_ACTIVE_DEFAULT_DESKTOP'){$evidence.reason=$valid;$row.reason=$valid;break}
   $fg=& $Native.Foreground
   $row.foreground_hwnd=$fg.ToInt64().ToString()
   if($barrier.responsive -and $fg -eq $OwnedHandle){
    & $Native.Delay 100
    $valid=& $Native.Validate $OwnedHandle $OwnedPid $SessionId
    if($valid -cne 'OWNED_ACTIVE_DEFAULT_DESKTOP'){$evidence.reason=$valid;$row.reason=$valid;break}
    if((& $Native.Foreground) -eq $OwnedHandle){
     $row.reason='RESPONSIVE_AND_STABLE_OWNED_FOREGROUND'
     $evidence.reason=$row.reason;$evidence.outcome='CONFIRMED_OWNED_FOREGROUND'
     break
    }
   }
   $row.reason=if($barrier.responsive){'RESPONSIVE_BUT_FOREGROUND_NOT_OWNED'}else{'ACTIVATION_MESSAGE_NOT_PROCESSED_ERROR_'+$barrier.error}
   $evidence.reason=$row.reason
   & $Native.Delay 100
  }
 }catch{$evidence.reason='NATIVE_PROBE_EXCEPTION: '+$_.Exception.Message}
 finally{$clock.Stop();$evidence.elapsed_ms=$clock.ElapsedMilliseconds}
 return [PSCustomObject]$evidence
}
