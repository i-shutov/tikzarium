# Disposable hosted Windows only: SUSPENDED OS child; NEVER resume, never TeX, never OS policy changes.
# Disposable GitHub-hosted Windows only. Same Administrator restricted LUA+MEDIUM token candidate; no linked token required.
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

public sealed class TzRestrictedChildReport {
    public string Status {get;set;} = "BLOCKED_INCOMPLETE";
    public bool ParentElevated {get;set;}
    public int ParentIntegrity {get;set;}
    public int ParentSession {get;set;}
    public bool ParentTokenUnchanged {get;set;}
    public bool RestrictedTokenCreated {get;set;}
    public int RestrictedCreateError {get;set;}
    public bool MediumSetSucceeded {get;set;}
    public int MediumSetError {get;set;}
    public bool CandidateElevated {get;set;}
    public int CandidateIntegrity {get;set;}
    public bool CandidateAdminEnabled {get;set;}
    public bool CandidateSameUser {get;set;}
    public bool CandidateSameSession {get;set;}
    public bool CandidateIsRestricted {get;set;}
    public bool SuspendedCreated {get;set;}
    public int CreateError {get;set;}
    public bool ChildTokenRead {get;set;}
    public bool ChildElevated {get;set;}
    public int ChildIntegrity {get;set;}
    public bool ChildAdminEnabled {get;set;}
    public bool ChildSameUser {get;set;}
    public bool ChildSameSession {get;set;}
    public bool ChildIsRestricted {get;set;}
    public bool ChildTerminationConfirmed {get;set;}
    public bool ChildTerminateReturned {get;set;}
    public int ChildTerminationError {get;set;}
    public uint ChildWaitResult {get;set;} = 0xffffffff;
    public string Executable {get;set;} = "WINDOWS_SYSTEM32_WHOAMI_SUSPENDED_ONLY";
    public string Desktop {get;set;} = "NONINTERACTIVE_DEFAULT_NOT_AUDITED";
    public bool DesktopIsolationVerified {get;set;} = false;
    public bool AclSecurityVerified {get;set;} = false;
    public bool ApprovedLauncher {get;set;} = false;
    public string TexPdf {get;set;} = "NOT_RUN";
    public bool AccountPolicyChanged {get;set;} = false;
}
public static class TzRestrictedChildProbe {
    const uint QUERY=0x8, DUPLICATE=0x2, ASSIGN_PRIMARY=0x1, ADJUST_DEFAULT=0x80;
    const uint CREATE_SUSPENDED=0x4, CREATE_NO_WINDOW=0x08000000;
    const uint DISABLE_MAX_PRIVILEGE=1, LUA_TOKEN=4, SE_GROUP_INTEGRITY=0x20;
    [StructLayout(LayoutKind.Sequential)]
    struct SidAndAttributes { public IntPtr Sid; public uint Attributes; }
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
    [DllImport("advapi32.dll", SetLastError=true)]
    static extern bool CreateRestrictedToken(IntPtr source,uint flags,uint disabledSidCount,
        ref SidAndAttributes disabledSids,uint deletedPrivilegeCount,IntPtr deletedPrivileges,
        uint restrictingSidCount,IntPtr restrictingSids,out IntPtr restricted);
    [DllImport("advapi32.dll", SetLastError=true)]
    static extern bool SetTokenInformation(IntPtr token,int kind,IntPtr info,int size);
    [DllImport("advapi32.dll", SetLastError=true)]
    static extern bool DuplicateToken(IntPtr source,int impersonationLevel,out IntPtr duplicate);
    [DllImport("advapi32.dll", SetLastError=true)]
    static extern bool CheckTokenMembership(IntPtr token,IntPtr sid,out bool enabled);
    [DllImport("advapi32.dll", SetLastError=true)]
    static extern bool IsTokenRestricted(IntPtr token);
    [DllImport("advapi32.dll",EntryPoint="CreateProcessAsUserW",CharSet=CharSet.Unicode,SetLastError=true)]
    static extern bool CreateProcessAsUserW(IntPtr token,string app,StringBuilder cmd,
        IntPtr processAttributes,IntPtr threadAttributes,bool inheritHandles,uint flags,
        IntPtr environment,string cwd,ref STARTUPINFO startup,out PROCESSINFO pi);

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
    static bool AdminEnabled(IntPtr token,IntPtr adminSid) {
        IntPtr impersonation;
        if(!DuplicateToken(token,2,out impersonation))
            throw new Win32Exception(Marshal.GetLastWin32Error(),"DuplicateToken for membership");
        try {
            bool member;
            if(!CheckTokenMembership(impersonation,adminSid,out member))
                throw new Win32Exception(Marshal.GetLastWin32Error(),"CheckTokenMembership");
            return member;
        } finally { CloseHandle(impersonation); }
    }
    static int LowerToMedium(IntPtr token) {
        var sid=new SecurityIdentifier("S-1-16-8192");
        byte[] b=new byte[sid.BinaryLength]; sid.GetBinaryForm(b,0);
        int header=Marshal.SizeOf(typeof(SidAndAttributes));
        IntPtr data=Marshal.AllocHGlobal(header+b.Length);
        try {
            IntPtr target=IntPtr.Add(data,header);
            Marshal.Copy(b,0,target,b.Length);
            Marshal.StructureToPtr(new SidAndAttributes {Sid=target,Attributes=SE_GROUP_INTEGRITY},data,false);
            if(!SetTokenInformation(token,25,data,header+b.Length))
                return Marshal.GetLastWin32Error();
            return 0;
        } finally { Marshal.FreeHGlobal(data); }
    }
    public static TzRestrictedChildReport Run() {
        var r=new TzRestrictedChildReport();
        IntPtr parent=IntPtr.Zero;
        if(!OpenProcessToken(GetCurrentProcess(),QUERY|DUPLICATE|ASSIGN_PRIMARY|ADJUST_DEFAULT,out parent))
            throw new Win32Exception(Marshal.GetLastWin32Error(),"OpenProcessToken source");
        try {
            r.ParentElevated=Integer(parent,20)!=0;
            r.ParentIntegrity=Integrity(parent);
            r.ParentSession=Integer(parent,12);
            if(r.ParentSession==0) {r.Status="BLOCKED_SESSION0";return r;}
            if(!r.ParentElevated || r.ParentIntegrity<0x3000) {
                r.Status="BLOCKED_PARENT_NOT_HIGH";return r;
            }
            var adminId=new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid,null);
            byte[] bytes=new byte[adminId.BinaryLength];adminId.GetBinaryForm(bytes,0);
            IntPtr admin=Marshal.AllocHGlobal(bytes.Length);
            try {
                Marshal.Copy(bytes,0,admin,bytes.Length);
                var disabled=new SidAndAttributes {Sid=admin,Attributes=0};
                IntPtr candidate=IntPtr.Zero;
                if(!CreateRestrictedToken(parent,DISABLE_MAX_PRIVILEGE|LUA_TOKEN,1,ref disabled,
                        0,IntPtr.Zero,0,IntPtr.Zero,out candidate)) {
                    r.RestrictedCreateError=Marshal.GetLastWin32Error();
                    r.Status="BLOCKED_RESTRICTED_CREATE";return r;
                }
                r.RestrictedTokenCreated=true;
                try {
                    r.MediumSetError=LowerToMedium(candidate);
                    r.MediumSetSucceeded=r.MediumSetError==0;
                    if(!r.MediumSetSucceeded) {r.Status="BLOCKED_MEDIUM_SET";return r;}
                    r.CandidateElevated=Integer(candidate,20)!=0;
                    r.CandidateIntegrity=Integrity(candidate);
                    r.CandidateAdminEnabled=AdminEnabled(candidate,admin);
                    r.CandidateSameUser=Sid(parent)==Sid(candidate);
                    r.CandidateSameSession=r.ParentSession==Integer(candidate,12);
                    r.CandidateIsRestricted=IsTokenRestricted(candidate);
                    if(r.CandidateElevated || r.CandidateIntegrity!=0x2000 ||
                       r.CandidateAdminEnabled || !r.CandidateSameUser ||
                       !r.CandidateSameSession || !r.CandidateIsRestricted) {
                        r.Status="BLOCKED_CANDIDATE_FACTS";return r;
                    }
                    // Real suspended process creation, NEVER thread resume. System32 OS
                    // executable is not allowed to run even one user-mode instruction.
                    // No handles inherited and no interactive WinSta0 desktop requested.
                    string cwd=Environment.GetFolderPath(Environment.SpecialFolder.System);
                    string exe=Path.Combine(cwd,"whoami.exe");
                    if(!File.Exists(exe)) {r.Status="BLOCKED_SYSTEM_EXE";return r;}
                    var si=new STARTUPINFO();si.cb=Marshal.SizeOf(typeof(STARTUPINFO));
                    si.desktop=null;
                    PROCESSINFO pi;
                    if(!CreateProcessAsUserW(candidate,exe,new StringBuilder("\""+exe+"\""),
                        IntPtr.Zero,IntPtr.Zero,false,CREATE_SUSPENDED|CREATE_NO_WINDOW,
                        IntPtr.Zero,cwd,ref si,out pi)) {
                        r.CreateError=Marshal.GetLastWin32Error();
                        r.Status="BLOCKED_CREATEPROCESSASUSER";return r;
                    }
                    r.SuspendedCreated=true;
                    try {
                        IntPtr child=IntPtr.Zero;
                        if(!OpenProcessToken(pi.process,QUERY,out child)) {
                            r.Status="BLOCKED_CHILD_TOKEN_OPEN";return r;
                        }
                        try {
                            r.ChildTokenRead=true;
                            r.ChildElevated=Integer(child,20)!=0;
                            r.ChildIntegrity=Integrity(child);
                            r.ChildAdminEnabled=AdminEnabled(child,admin);
                            r.ChildSameUser=Sid(parent)==Sid(child);
                            r.ChildSameSession=r.ParentSession==Integer(child,12);
                            r.ChildIsRestricted=IsTokenRestricted(child);
                            r.Status=(!r.ChildElevated && r.ChildIntegrity==0x2000 &&
                                !r.ChildAdminEnabled && r.ChildSameUser &&
                                r.ChildSameSession && r.ChildIsRestricted)
                                ? "SUSPENDED_MEDIUM_CHILD_CANDIDATE_NOT_APPROVED"
                                : "BLOCKED_CHILD_FACTS";
                            return r;
                        } finally {CloseHandle(child);}
                    } finally {
                        r.ChildTerminateReturned=TerminateProcess(pi.process,0);
                        r.ChildTerminationError=r.ChildTerminateReturned?0:Marshal.GetLastWin32Error();
                        r.ChildWaitResult=WaitForSingleObject(pi.process,5000);
                        r.ChildTerminationConfirmed=r.ChildWaitResult==0;
                        if(!r.ChildTerminationConfirmed)r.Status="BLOCKED_CHILD_CLEANUP";
                        CloseHandle(pi.thread);CloseHandle(pi.process);
                    }
                } finally {CloseHandle(candidate);}
            } finally {Marshal.FreeHGlobal(admin);}
        } finally {
            // Verify parent token still reports the exact pre-probe security levels.
            try {
                r.ParentTokenUnchanged=Integer(parent,20)==(r.ParentElevated?1:0)
                    && Integrity(parent)==r.ParentIntegrity
                    && Integer(parent,12)==r.ParentSession;
                if(!r.ParentTokenUnchanged)r.Status="BLOCKED_PARENT_TOKEN_CHANGED";
            } finally {CloseHandle(parent);}
        }
    }
}
'@
Add-Type -TypeDefinition $source -ErrorAction Stop
try {
    $r = [TzRestrictedChildProbe]::Run()
} catch {
    $r = [pscustomobject]@{
        Status = 'BLOCKED_PROBE_EXCEPTION'
        ErrorType = $_.Exception.GetType().Name
        TexPdf = 'NOT_RUN'
        ApprovedLauncher = $false
        AccountPolicyChanged = $false
        DesktopIsolationVerified = $false
        AclSecurityVerified = $false
        Executable = 'WINDOWS_SYSTEM32_WHOAMI_SUSPENDED_ONLY'
        Desktop = 'NONINTERACTIVE_DEFAULT_NOT_AUDITED'
    }
}
$dir = Split-Path -Parent $OutputPath
if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$r | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Host ("Windows MEDIUM restricted-token suspended child experiment: {0}, TeX/PDF NOT_RUN" -f $r.Status)
