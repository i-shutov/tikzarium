# Research candidate only: no TeX, no child execution, no UAC/account modifications.
# Disposable GitHub-hosted Windows only. Same-admin UAC-linked limited-token check.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
if ($env:OS -cne 'Windows_NT') { throw 'Windows-only linked-token probe' }
$source = @'
using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;

public sealed class TzLinkedReport {
    public string Status {get;set;} = "NOT_RUN";
    public bool ParentElevated {get;set;}
    public int ParentIntegrity {get;set;}
    public int ParentElevationType {get;set;}
    public int ParentSession {get;set;}
    public string Linked {get;set;} = "UNKNOWN";
    public bool LinkedElevated {get;set;}
    public int LinkedIntegrity {get;set;}
    public int LinkedElevationType {get;set;}
    public bool LinkedSameUser {get;set;}
    public int CreateError {get;set;}
    public bool SuspendedCreated {get;set;}
    public bool ChildTokenRead {get;set;}
    public bool ChildElevated {get;set;}
    public int ChildIntegrity {get;set;}
    public bool ChildSameUser {get;set;}
    public int ChildElevationType {get;set;}
    public int ChildSession {get;set;}
    public bool ChildSameSession {get;set;}
    public bool ChildTerminationConfirmed {get;set;} = false;
    public bool ChildTerminateReturned {get;set;} = false;
    public int ChildTerminationError {get;set;} = 0;
    public uint ChildWaitResult {get;set;} = 0xffffffff;
    public string TexPdf {get;set;} = "NOT_RUN";
    public bool ApprovedLauncher {get;set;} = false;
    public bool AccountPolicyChanged {get;set;} = false;
}
public static class TzLinkedChildProbe {
    const uint QUERY=0x8, CREATE_SUSPENDED=0x4, CREATE_NO_WINDOW=0x08000000;
    [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]
    struct STARTUPINFO {
        public int cb;
        public string reserved, desktop, title;
        public int x,y,xsize,ysize,xchars,ychars,fill,flags;
        public short show,reserved2;
        public IntPtr reservedPtr,stdin,stdout,stderr;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct PROCESSINFO { public IntPtr process,thread; public int pid,tid; }
    [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool ProcessIdToSessionId(uint pid,out uint session);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateProcess(IntPtr h,uint code);
    [DllImport("kernel32.dll",SetLastError=true)] static extern uint WaitForSingleObject(IntPtr h,uint ms);
    [DllImport("advapi32.dll",SetLastError=true)]
    static extern bool OpenProcessToken(IntPtr p,uint access,out IntPtr token);
    [DllImport("advapi32.dll",SetLastError=true)]
    static extern bool GetTokenInformation(IntPtr token,int cls,IntPtr buffer,int size,out int used);
    [DllImport("advapi32.dll",SetLastError=true)]
    static extern IntPtr GetSidSubAuthorityCount(IntPtr sid);
    [DllImport("advapi32.dll",SetLastError=true)]
    static extern IntPtr GetSidSubAuthority(IntPtr sid,uint index);
    [DllImport("advapi32.dll",EntryPoint="CreateProcessWithTokenW",CharSet=CharSet.Unicode,SetLastError=true)]
    static extern bool CreateProcessWithTokenW(IntPtr token,uint logonFlags,string app,
        StringBuilder cmd,uint flags,IntPtr environment,string cwd,ref STARTUPINFO startup,
        out PROCESSINFO pi);

    static IntPtr Data(IntPtr token,int cls) {
        int size=0;
        GetTokenInformation(token,cls,IntPtr.Zero,0,out size);
        if(size<4 || size>8192) throw new Win32Exception(Marshal.GetLastWin32Error(),"Token size unavailable");
        IntPtr p=Marshal.AllocHGlobal(size);
        int returned=0;
        if(!GetTokenInformation(token,cls,p,size,out returned) || returned<4 || returned>size) {
            int err=Marshal.GetLastWin32Error();
            Marshal.FreeHGlobal(p);
            throw new Win32Exception(err,"Token read failed");
        }
        return p;
    }
    static int Integer(IntPtr token,int cls) {
        IntPtr p=Data(token,cls);
        try {return Marshal.ReadInt32(p);}
        finally {Marshal.FreeHGlobal(p);}
    }
    static int Integrity(IntPtr token) {
        IntPtr p=Data(token,25);
        try {
            IntPtr sid=Marshal.ReadIntPtr(p);
            if(sid==IntPtr.Zero)throw new InvalidOperationException("Null integrity SID");
            IntPtr count=GetSidSubAuthorityCount(sid);
            if(count==IntPtr.Zero)throw new InvalidOperationException("Null integrity count");
            byte n=Marshal.ReadByte(count);
            if(n==0)throw new InvalidOperationException("Empty integrity SID");
            IntPtr rid=GetSidSubAuthority(sid,(uint)(n-1));
            if(rid==IntPtr.Zero)throw new InvalidOperationException("Null RID");
            return Marshal.ReadInt32(rid);
        } finally {Marshal.FreeHGlobal(p);}
    }
    static string Sid(IntPtr token) {
        using(var identity=new WindowsIdentity(token)) {
            if(identity.User==null)throw new InvalidOperationException("Missing user SID");
            return identity.User.Value; // compare ONLY, never record SID
        }
    }
    public static TzLinkedReport Run() {
        var r=new TzLinkedReport();
        IntPtr parent;
        if(!OpenProcessToken(GetCurrentProcess(),QUERY,out parent))
            throw new Win32Exception(Marshal.GetLastWin32Error(),"OpenProcessToken parent");
        try {
            r.ParentElevated=Integer(parent,20)!=0;
            r.ParentIntegrity=Integrity(parent);
            r.ParentElevationType=Integer(parent,18);
            uint parentSession;
            if(!ProcessIdToSessionId((uint)System.Diagnostics.Process.GetCurrentProcess().Id,out parentSession))
                throw new Win32Exception(Marshal.GetLastWin32Error(),"Parent session query failed");
            r.ParentSession=(int)parentSession;
            if (parentSession==0) { r.Status="BLOCKED_SESSION0"; return r; }
            if(!r.ParentElevated && r.ParentIntegrity>=0x1000 && r.ParentIntegrity<0x3000) {
                r.Status="PARENT_ALREADY_NON_ELEVATED_NO_CHILD";return r;
            }
            if(r.ParentElevationType!=2) {
                r.Linked="NO_UAC_LINKED_TOKEN";
                r.Status="BLOCKED_NO_UAC_LINKED_TOKEN";return r;
            }
            IntPtr info=IntPtr.Zero,linked=IntPtr.Zero;
            try {
                try {
                    info=Data(parent,19); // TokenLinkedToken
                    linked=Marshal.ReadIntPtr(info);
                    if(linked==IntPtr.Zero)throw new InvalidOperationException("Null linked token");
                } catch(Win32Exception) {
                    r.Status="BLOCKED_LINKED_TOKEN_QUERY";return r;
                } finally {
                    if(info!=IntPtr.Zero)Marshal.FreeHGlobal(info);
                }
                r.Linked="PRESENT_UNVERIFIED";
                r.LinkedElevated=Integer(linked,20)!=0;
                r.LinkedElevationType=Integer(linked,18);
                r.LinkedIntegrity=Integrity(linked);
                r.LinkedSameUser=Sid(parent)==Sid(linked);
                if(r.LinkedElevated || r.LinkedElevationType!=3 || r.LinkedIntegrity<0x2000 ||
                    r.LinkedIntegrity>=0x3000 || !r.LinkedSameUser) {
                    r.Status="BLOCKED_NOT_VERIFIED_LIMITED_LINKED_TOKEN";return r;
                }

                // Create only an OS-owned executable SUSPENDED. Never resume it.
                string cwd=Environment.GetFolderPath(Environment.SpecialFolder.System);
                string exe=Path.Combine(cwd,"whoami.exe");
                if(!File.Exists(exe)){r.Status="BLOCKED_SYSTEM_EXE_MISSING";return r;}
                var startup=new STARTUPINFO();
                startup.cb=Marshal.SizeOf(typeof(STARTUPINFO));
                PROCESSINFO pi;
                if(!CreateProcessWithTokenW(linked,0,exe,new StringBuilder("\""+exe+"\""),
                    CREATE_SUSPENDED|CREATE_NO_WINDOW,IntPtr.Zero,cwd,ref startup,out pi)){
                    r.CreateError=Marshal.GetLastWin32Error();
                    r.Status="BLOCKED_CREATEPROCESSWITHTOKENW";return r;
                }
                r.SuspendedCreated=true;
                try {
                    IntPtr child=IntPtr.Zero;
                    if(!OpenProcessToken(pi.process,QUERY,out child)){
                        r.Status="BLOCKED_CHILD_TOKEN_QUERY";return r;
                    }
                    try {
                        r.ChildTokenRead=true;
                        r.ChildElevated=Integer(child,20)!=0;
                        r.ChildIntegrity=Integrity(child);
                        r.ChildSameUser=Sid(parent)==Sid(child);
                        r.ChildElevationType=Integer(child,18);
                        uint childSession;
                        if(!ProcessIdToSessionId((uint)pi.pid,out childSession)) {
                            r.Status="BLOCKED_CHILD_SESSION_QUERY";return r;
                        }
                        r.ChildSession=(int)childSession;
                        r.ChildSameSession=r.ParentSession==r.ChildSession;
                        r.Status=!r.ChildElevated && r.ChildIntegrity>=0x2000 &&
                            r.ChildIntegrity<0x3000 && r.ChildSameUser &&
                            r.ChildElevationType==3 && r.ChildSameSession
                            ? "SUSPENDED_LIMITED_CHILD_CANDIDATE_NOT_APPROVED"
                            : "BLOCKED_SUSPENDED_CHILD_NOT_LIMITED";
                        return r;
                    } finally {CloseHandle(child);}
                } finally {
                    // Never claim a candidate without observing process termination.
                    // Never ResumeThread, even if cleanup fails.
                    r.ChildTerminateReturned=TerminateProcess(pi.process,0);
                    r.ChildTerminationError=r.ChildTerminateReturned ? 0 : Marshal.GetLastWin32Error();
                    r.ChildWaitResult=WaitForSingleObject(pi.process,4000);
                    r.ChildTerminationConfirmed=r.ChildWaitResult==0; // WAIT_OBJECT_0
                    if (!r.ChildTerminationConfirmed) r.Status="BLOCKED_CHILD_CLEANUP_UNCONFIRMED";
                    CloseHandle(pi.thread);
                    CloseHandle(pi.process);
                }
            } finally {if(linked!=IntPtr.Zero)CloseHandle(linked);}
        } finally {CloseHandle(parent);}
    }
}
'@
Add-Type -TypeDefinition $source -ErrorAction Stop
try {
    $r = [TzLinkedChildProbe]::Run()
} catch {
    $r = [pscustomobject]@{
        Status = 'BLOCKED_PROBE_EXCEPTION'
        ErrorType = $_.Exception.GetType().Name
        TexPdf = 'NOT_RUN'
        ApprovedLauncher = $false
        AccountPolicyChanged = $false
    }
}
$dir = Split-Path -Parent $OutputPath
if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$r | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Host ("Windows linked-token suspended process experiment: {0}, TeX/PDF NOT_RUN" -f $r.Status)
