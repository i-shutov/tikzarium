# Private Cargo must survive the maintenance job

Owner requested Cargo/MiKTeX repair on dedicated personal Windows Server, no extra user. Isolated Rust is installed under RUNNER_TOOL_CACHE/tikzarium-rust, with cargo and rustup homes, without global/user PATH changes. GITHUB_ENV/GITHUB_PATH from a maintenance job do not survive into a separate future job; merely reporting installed binaries would therefore leave normal self-hosted CI unable to discover Cargo.

Use-TikzariumPrivateRust activates only the already installed private toolchain in the current process. It performs no download/install or registry mutation, checks both proxy executables and rustup home, sets Rust1.91.0 exact MSVC host, and returns path for evidence. qa_windows_server_rust.ps1 invokes it before its original fallback lookup. Hosted PowerShell5.1 regression checks absent cache is a no-op, existing private cache selects the pinned paths, machine PATH is unchanged, and all process variables are restored after the test. Fake executable placeholders are never executed.

This change fixes continuing availability of the maintenance-installed toolchain for real TikZarium jobs. It is not a replacement for actual compile/link/run evidence or MiKTeX/PDF/GUI qualification. FlowBridge and any other runner environments remain unmodified. Production elevated-TeX guards untouched.
