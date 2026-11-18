# SCI-1.0 / G3 — bounded scientific source Undo history

Owner release target: full Scientific Studio v1.0.0. This is a limited memory-safety improvement in the source session, not proof of native editor responsiveness.

Original SC1 OneFigureSession stored 64 entire String snapshots. On a 10 MiB scientific source this can retain about 640 MiB in history alone. We now retain up to 64 snapshots subject to a 32 MiB retained-source byte budget; oldest entries are evicted before adding a new inverse. If a single source is larger than the byte budget, retain one whole inverse (source not truncated), not zero history. No source rewrite.

Regression: 42 consecutive distinct 1 MiB source revisions keep exactly 32 MiB and 32 inverse snapshots, allow Undo of surviving revisions and refuse older discarded history; UTF-8 Cyrillic/Greek CRLF plus unknown macro restores byte-identically. Existing source/dependency/revision/epoch tests remain binding.

NO release acceptance: this does not solve egui full-layout G3 latency, native p95 <=50ms at 10k lines, first editable <=2s, 100k/10MiB stress or project-wide per-document memory. Further work on incremental layout and shared transaction strategy belongs to issue #176. All CI/real Windows QA mandatory.