//! Windows TeX child-process privilege gate; no UAC or account changes.
//! Elevated TeX remains BLOCKED until an isolated filtered-child launcher passes real QA.
use std::io;

#[cfg(any(windows, test))]
fn check_tex_privilege(elevated: bool, integrity_rid: u32) -> io::Result<()> {
    // Windows mandatory levels: LOW 0x1000, MEDIUM 0x2000, HIGH 0x3000.
    // A token whose integrity cannot be classified must not execute TeX.
    if elevated || !(0x1000..0x3000).contains(&integrity_rid) {
        Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            format!(
                "Windows TeX BLOCKED: elevated/unknown token (elevated={elevated}, integrity=0x{integrity_rid:x}). No approved non-elevated child launcher; Administrator membership alone is not a blocker."
            ),
        ))
    } else {
        Ok(())
    }
}

/// Reuse the same fail-closed Windows boundary for every external
/// document interpreter (XeLaTeX and Poppler). A PDF parser must not
/// inherit elevated privileges merely because XeLaTeX was blocked.
pub fn require_safe_external_document_child() -> io::Result<()> {
    require_safe_tex_child()
}

/// Checked before each direct XeLaTeX/helper spawn; fail closed on token query errors.
pub(crate) fn require_safe_tex_child() -> io::Result<()> {
    #[cfg(windows)]
    {
        let (elevated, integrity_rid) = native::query_current_token()?;
        check_tex_privilege(elevated, integrity_rid)
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

    // Vec<usize> is pointer-aligned for TOKEN_MANDATORY_LABEL.
    fn query(token: Handle, class: u32) -> io::Result<Vec<usize>> {
        let mut size: u32 = 0;
        // SAFETY: Win32 documented size query with null output.
        unsafe { GetTokenInformation(token, class, ptr::null_mut(), 0, &mut size) };
        if !(4..=8192).contains(&size) {
            return Err(io::Error::other(format!(
                "Cannot size Windows token information class {class}: {}",
                io::Error::last_os_error()
            )));
        }
        let word = mem::size_of::<usize>();
        let mut buffer = vec![0usize; (size as usize).div_ceil(word)];
        // Win32 classes such as TokenElevation have an exact 4-byte payload.
        // Rounding the *allocation* up to pointer alignment is required, but
        // passing that rounded capacity as BufferLength can return ERROR_BAD_LENGTH
        // (24) on real Windows. Pass the exact size returned by the first query.
        let required_len = size;
        debug_assert!((buffer.len() * word) >= required_len as usize);
        let mut returned_len = 0;
        // SAFETY: writable, pointer-aligned owned buffer of at least required_len.
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
        // SAFETY: pseudo-process handle and output pointer valid.
        if unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut raw) } == 0 {
            return Err(io::Error::last_os_error());
        }
        let token = Token(raw);
        let elevation = query(token.0, TOKEN_ELEVATION_CLASS)?;
        let elevated = elevation[0] as u32 != 0;
        let integrity = query(token.0, TOKEN_INTEGRITY_CLASS)?;
        // TOKEN_MANDATORY_LABEL begins with a SID pointer inside the retained buffer.
        let sid = integrity[0] as *const c_void;
        if sid.is_null() {
            return Err(io::Error::other("Windows token integrity SID is null"));
        }
        // SAFETY: The SID is returned by GetTokenInformation and remains alive.
        let count = unsafe { GetSidSubAuthorityCount(sid) };
        if count.is_null() {
            return Err(io::Error::last_os_error());
        }
        let n = unsafe { *count };
        if n == 0 {
            return Err(io::Error::other("Windows token integrity SID has no RID"));
        }
        // SAFETY: Index of last valid SID subauthority.
        let pointer = unsafe { GetSidSubAuthority(sid, u32::from(n - 1)) };
        if pointer.is_null() {
            return Err(io::Error::last_os_error());
        }
        Ok((elevated, unsafe { *pointer }))
    }
}

#[cfg(test)]
mod tests {
    use super::check_tex_privilege;

    /// Runs on the actual hosted Windows token, not a synthetic boolean.
    /// In particular TokenElevation is four bytes even on 64-bit Windows.
    #[cfg(windows)]
    #[test]
    fn live_windows_token_information_is_readable_without_bad_length() {
        let (elevated, integrity_rid) =
            super::native::query_current_token().expect("real Windows token information");
        assert!(integrity_rid >= 0x1000, "unknown token integrity RID");
        assert_eq!(
            super::require_safe_tex_child().is_ok(),
            !elevated && (0x1000..0x3000).contains(&integrity_rid),
            "read-only token audit and fail-closed TeX guard must agree"
        );
    }

    #[test]
    fn filtered_administrator_medium_token_is_eligible() {
        assert!(check_tex_privilege(false, 0x2000).is_ok());
        assert!(check_tex_privilege(false, 0x2100).is_ok());
    }

    #[test]
    fn full_elevated_high_and_unknown_tokens_fail_closed() {
        for (elevated, rid) in [
            (true, 0x2000),
            (true, 0x3000),
            (false, 0x3000),
            (false, 0x4000),
            (false, 0),
            (false, 0x800),
        ] {
            assert!(check_tex_privilege(elevated, rid).is_err());
        }
    }
}
