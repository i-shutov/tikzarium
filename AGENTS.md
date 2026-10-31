# TikZarium engineering instructions

1. **Follow the architecture:** XeLaTeX is the primary and default renderer, Rust + egui the application. Target Windows 10 x64 and Apple Silicon macOS first.
2. **Source is authoritative.** Never silently normalize or regenerate an existing full TeX document. Unknown TeX constructs must survive. Use minimal source-range edits with version checks, undo and round-trip tests.
3. **Report capability honestly:** installed/buildable, inspectable and visually editable are independent levels. Do not promise LuaTeX-only `graphdrawing` features under XeLaTeX.
4. **No external runtime dependency by default.** Offline local mode is first-class. Do not require cloud, telemetry or an account.
5. **Security:** launch XeLaTeX directly without an intermediate shell. Disable shell escape by default. Do not equate this with OS sandboxing. External executable permissions are an explicit project setting.
6. **Cross-platform:** no platform-exclusive core design without a fallback. Test Windows 10 real host and physical Mac ARM64, beyond CI Windows Server/macOS builds.
7. **Plugin boundary:** TeX package discovery is not Rust plugin execution; a visual adapter is not allowed to mutate unknown source. Introduce executable WASM plugins only with a reviewed capability sandbox.
8. **Evidence:** keep package matrix, real tool versions, SHA, failing fixture IDs and links to logs. R4 has four unresolved strict-warning cases; never silently mark them fixed.
9. **PR discipline:** one coherent vertical workpack per PR. Include before/after source, CI status, tested workflows and known limits. Commit generated binaries only if explicitly approved.
10. **Visual QA:** inspect actual screenshots on both target platforms at compact resolution and HiDPI; do not declare done from cargo build alone.
11. **Architecture changes:** update related docs and ADRs in the same PR; assess licensing of GeoGebra, TeX packages, PDF renderers and source fixture assets before incorporation.
12. **Prioritize integration:** first operational XeLaTeX project → exact PDF on both machines, then progressively richer visual editing. Avoid speculative plugin APIs before two implementations validate the contract.

See docs/ROADMAP.md and docs/QA_ACCEPTANCE.md for release gates and workstream ownership.
