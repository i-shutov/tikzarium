# F01 N1 source-integrity fixtures

- opaque-crlf.tex: actual UTF-8 Cyrillic with CRLF, user preamble, unknown macro usage and comments. Intentionally not a stand-alone compile oracle: the unknown macro must remain opaque.
- duplicate-lf.tex: UTF-8 LF with two identical TikZ paths, opaque user macro and extra code between paths. It is a source-preservation fixture, not a PDF screenshot proof.

Never normalize either fixture's bytes. Tests compare original byte buffers after inverses, including the CRLF file. No raw user documents or proprietary scans are included.
