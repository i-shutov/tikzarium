# TikZarium W2 — original pal1000 QA escrow from exact trusted main CI

## Physical blocker

Trusted-main personal Server run #42473309431 original early artifact #13613977992: W2 was BLOCKED_PINNED_MESA_STAGE_UNAVAILABLE after four pal1000 HTTPS/asset API failures. Real native W2b input/Save As and GUI→PDF were NOT_RUN. W1 native Rust/external MiKTeX still passed independently. Previous W2a physical PASS was at source SHA ef95c1c9, not current main.

Hosted Windows PR138 #42475982759 *did* obtain the original pal1000 QA archive (SHA256 da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388) and passed native Windows HWND/F1. The separately SHA-pinned MSYS2 fallback cannot be assumed to work merely because its archive hash matches; it has separate runtime dependencies.

## Escrow design and safety contract

1. On exact push-to-main hosted Windows CI, optionally fetch the original pal1000 archive. Recheck original URL, immutable 55,815,794-byte length and SHA256. Save provenance with exact main SHA and source CI run ID.
2. Upload as a distinct, private, 7-day GitHub Actions QA artifact **not** part of Windows portable ZIP or release binaries. CI native build still succeeds if the optional upstream source is unavailable.
3. On the existing persistent self-hosted Windows Server, download this artifact exclusively from the already-verified successful source main CI run ID used for its product EXE. Validate original manifest SHA, run ID, origin, immutable digest/size; recheck after copying into current RUNNER_TEMP. Any partial/tampered escrow is terminal BLOCKED, never fallback.
4. When no escrow exists, retain the existing pinned pal1000 transport followed, on transport exhaustion only, by separately SHA-pinned official MSYS2. No unverified mirrors, no TLS downgrade, system-wide OpenGL/TeX/font installation, registry, accounts/UAC or FlowBridge change.
5. Run offline Windows PowerShell 5.1 negative tests and Python source contracts. Neither escrow acquisition nor byte/manifest tests are a native GUI qualification.

## Acceptance / release gates

Pre-merge: all exact-head CI checks Windows/macOS/Linux/PowerShell PASS. Post-merge: hosted main CI upload of SHA-pinned original QA archive is useful only if artifact actually exists; self-hosted Windows must download from *same main run* and produce independent original provenance and real own HWND/PNGs, with the native Save As and source from app. W2b stage1 single C line is not six-tool W2b. Full W2b/real Windows10 W3/clean installer and stable W4 remain NOT_RUN/NO-GO until physical evidence.
