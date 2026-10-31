# I06 native smoke — source filesystem identity and save behavior

Status **NOT_RUN** on physical Windows 10 x64 / Apple Silicon M1 or M4. Execute against exact installer/build SHA with checksums, machine/OS versions, timestamps, screenshots and raw before/after source SHA-256.

1. Open a UTF-8 .tex containing Cyrillic and CRLF. Build twice without editing. Both builds must produce XeLaTeX PDF and preserve identical TeX file byte SHA-256, modification timestamp and stable file identity where host filesystem supports it.
2. Open source. Edit the disk file externally while the editor remains open. Build/Save must show explicit conflict and preserve external bytes. Repeat with local unsaved changes.
3. Open source via a symlink to another .tex. Build clean buffer without replacing link; modify buffer, Save must reject unsafe overwrite and offer Save As to a different regular file.
4. Open read-only .tex. Build clean source; dirty Save must fail without changing bytes.
5. Delete/move open source externally. Build must stop with explicit failure instead of silently recreating the path; Save As a new path is permitted.
6. With figure fontspec/unicode-math and all persistent egui themes, make sure UI theme changes never edit source bytes or PDF figure fonts. Test 1366x768 Win10 x64, Unicode IME, and Mac ARM Retina scaling. These cases cannot be accepted from CI_ONLY headless builds.

Retain a manifest per host with physical hostname redacted, source SHA, output PDF SHA, screenshot hashes, egui theme, TeX Live version and Poppler version. QA environment must be offline during application use. No Lua-only engine claim and no destructive source conversion.
