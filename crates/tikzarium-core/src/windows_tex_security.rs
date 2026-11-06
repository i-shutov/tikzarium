//! Windows current-user document execution policy; no UAC or account changes.
//! Owner correction 2026-11-06: elevated Administrator is supported, not a sandbox.
use std::io;

#[cfg(any(windows, test))]
fn check_tex_privilege(_elevated: bool, integrity_rid: u32) -> io::Result<()> {
    // LOW, MEDIUM and HIGH are supported current-user integrity levels.
    // Reject unknown/untrusted and SYSTEM tokens, not an ordinary Administrator.
    if !(0x1000..0x4000).contains(&integrity_rid) {
        Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            format!(
                "Windows document execution: unsupported/unknown token integrity 0x{integrity_rid:x}; current-user LOW/MEDIUM/HIGH required"
            ),
        ))
    } else {
        Ok(())
    }
}

/// Read-only query for a visible GUI warning, including PE subsystem 2 without a console.
/// The actual external-child guard independently rechecks current token on spawn.
pub fn external_document_privilege_notice() -> io::Result<Option<&'static str>> {
    #[cfg(windows)]
    {
        let (elevated, integrity_rid) = native::query_current_token()?;
        check_tex_privilege(elevated, integrity_rid)?;
        Ok(privilege_warning_required(elevated, integrity_rid).then_some(
            "⚠ XeLaTeX и PDF-инструменты запускаются с текущими повышенными правами Administrator. Компилируйте только доверенные документы: это не песочница. Предупреждения MiKTeX не подавляются.",
        ))
    }
    #[cfg(not(windows))]
    {
        Ok(None)
    }
}

#[cfg(any(windows, test))]
fn privilege_warning_required(elevated: bool, integrity_rid: u32) -> bool {
    elevated || integrity_rid >= 0x3000
}

/// Apply the same current-user policy to XeLaTeX and PDF helpers.
/// Historical API name retained for callers: this is NOT an OS sandbox.
pub fn require_safe_external_document_child() -> io::Result<()> {
    require_safe_tex_child()
}

/// Query the actual token, retain a visible elevated warning, never elevate.
/// Native compiler warnings and real exit codes remain authoritative.
pub(crate) fn require_safe_tex_child() -> io::Result<()> {
    #[cfg(windows)]
    {
        use std::sync::atomic::{AtomicBool, Ordering};
        static WARNED: AtomicBool = AtomicBool::new(false);
        let (elevated, integrity_rid) = native::query_current_token()?;
        check_tex_privilege(elevated, integrity_rid)?;
        if privilege_warning_required(elevated, integrity_rid) && !WARNED.swap(true, Ordering::Relaxed) {
            eprintln!(
                "TikZarium warning: external document tools inherit this user's elevated Administrator rights. Compile only trusted documents. Shell-escape/offline policies remain unchanged; this is not a sandbox."
            );
        }
        Ok(())
    }
    #[cfg(not(windows))]
    {
        Ok(())
    }
}

#[cfg(windows)]
mod native {
    use std::{ffi::c_void, io, mem, ptr};

    type Handle = *mut c_void;
    const TOKEN_QUERY: u32 = 0x0008;
    const TOKEN_ELEVATION_CLASS: u32 = 20;
    const TOKEN_INTEGRITY_CLASS: u32 = 25;

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn GetCurrentProcess() -> Handle;
        fn CloseHandle(handle: Handle) -> i32;
    }
    #[link(name = "advapi32")]
    unsafe extern "system" {
        fn OpenProcessToken(process: Handle, access: u32, token: *mut Handle) -> i32;
        fn GetTokenInformation(
            token: Handle,
            class: u32,
            buffer: *mut c_void,
            length: u32,
            returned_length: *mut u32,
        ) -> i32;
        fn GetSidSubAuthorityCount(sid: *const c_void) -> *const u8;
        fn GetSidSubAuthority(sid: *const c_void, index: u32) -> *const u32;
    }

    struct Token(Handle);
    impl Drop for Token {
        fn drop(&mut self) {
            // SAFETY: OpenProcessToken returned a real owned handle.
            unsafe { CloseHandle(self.0) };
        }
    }

    fn query(token: Handle, class: u32) -> io::Result<Vec<usize>> {
        let mut size: u32 = 0;
        // SAFETY: documented size query with null output.
        unsafe { GetTokenInformation(token, class, ptr::null_mut(), 0, &mut size) };
        if !(4..=8192).contains(&size) {
            return Err(io::Error::other(format!(
                "Cannot size Windows token information class {class}: {}",
                io::Error::last_os_error()
            )));
        }
        let word = mem::size_of::<usize>();
        let mut buffer = vec![0usize; (size as usize).div_ceil(word)];
        // Keep the exact API length, even when the allocation is aligned up.
        let required_len = size;
        debug_assert!((buffer.len() * word) >= required_len as usize);
        let mut returned_len = 0;
        // SAFETY: writable pointer-aligned buffer of at least required_len bytes.
        if unsafe {
            GetTokenInformation(
                token,
                class,
                buffer.as_mut_ptr().cast(),
                required_len,
                &mut returned_len,
            )
        } == 0
        {
            return Err(io::Error::other(format!(
                "GetTokenInformation class {class} ({required_len} bytes): {}",
                io::Error::last_os_error()
            )));
        }
        if returned_len < 4 || returned_len > required_len {
            return Err(io::Error::other(format!(
                "GetTokenInformation class {class} returned invalid length {returned_len}/{required_len}"
            )));
        }
        Ok(buffer)
    }

    pub(super) fn query_current_token() -> io::Result<(bool, u32)> {
        let mut raw: Handle = ptr::null_mut();
        // SAFETY: pseudo-process handle and output pointer are valid.
        if unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut raw) } == 0 {
            return Err(io::Error::last_os_error());
        }
        let token = Token(raw);
        let elevation = query(token.0, TOKEN_ELEVATION_CLASS)?;
        let elevated = elevation[0] as u32 != 0;
        let integrity = query(token.0, TOKEN_INTEGRITY_CLASS)?;
        let sid = integrity[0] as *const c_void;
        if sid.is_null() {
            return Err(io::Error::other("Windows token integrity SID is null"));
        }
        // SAFETY: SID returned by GetTokenInformation remains alive in integrity.
        let count = unsafe { GetSidSubAuthorityCount(sid) };
        if count.is_null() {
            return Err(io::Error::last_os_error());
        }
        let n = unsafe { *count };
        if n == 0 {
            return Err(io::Error::other("Windows token integrity SID has no RID"));
        }
        // SAFETY: index of the last valid SID subauthority.
        let pointer = unsafe { GetSidSubAuthority(sid, u32::from(n - 1)) };
        if pointer.is_null() {
            return Err(io::Error::last_os_error());
        }
        Ok((elevated, unsafe { *pointer }))
    }
}

#[cfg(test)]
mod tests {
    use super::{check_tex_privilege, privilege_warning_required};

    #[cfg(windows)]
    #[test]
    fn live_windows_token_information_is_readable_without_bad_length() {
        let (elevated, integrity_rid) =
            super::native::query_current_token().expect("real Windows token information");
        assert_eq!(
            super::require_safe_tex_child().is_ok(),
            (0x1000..0x4000).contains(&integrity_rid),
            "actual token policy, including elevated={elevated}, must agree"
        );
    }

    #[test]
    fn filtered_administrator_medium_token_is_eligible() {
        assert!(check_tex_privilege(false, 0x2000).is_ok());
        assert!(check_tex_privilege(false, 0x2100).is_ok());
    }

    #[test]
    fn owner_administrator_high_token_is_supported_without_elevation() {
        for (elevated, rid) in [(true, 0x3000), (true, 0x2000), (false, 0x3000)] {
            assert!(check_tex_privilege(elevated, rid).is_ok());
        }
    }

    #[test]
    fn high_or_elevated_current_user_requires_visible_warning() {
        assert!(privilege_warning_required(true, 0x2000));
        assert!(privilege_warning_required(false, 0x3000));
        assert!(privilege_warning_required(true, 0x3000));
        assert!(!privilege_warning_required(false, 0x2000));
    }

    #[test]
    fn unknown_and_system_tokens_are_not_user_document_execution() {
        for rid in [0, 0x800, 0x4000, 0x5000, u32::MAX] {
            assert!(check_tex_privilege(false, rid).is_err());
            assert!(check_tex_privilege(true, rid).is_err());
        }
    }
}
