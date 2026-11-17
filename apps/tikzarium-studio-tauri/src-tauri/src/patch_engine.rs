//! Проверенный движок точечных правок `SourcePatch` (MOD-04) для Tauri v2 + Rust.
//! Сохраняет побайтовую целостность UTF-8, кириллицу и оригинальные окончания строк LF / CRLF,
//! блокирует мутацию устаревших ревизий по SHA-256 и возвращает точный `inverse_patch` для Undo.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourcePatchSpan {
    /// Смещение начала в символах UTF-16 / Unicode scalar (совместимое с JS-строками WebView).
    pub start_offset: usize,
    /// Смещение конца в символах UTF-16.
    pub end_offset: usize,
    pub replacement: String,
    pub description_ru: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckedSourcePatchResult {
    pub ok: bool,
    pub next_source: String,
    pub line_ending: String,
    pub before_digest: String,
    pub after_digest: String,
    pub byte_delta: isize,
    pub changed_start_line: usize,
    pub changed_end_line: usize,
    pub description_ru: String,
    pub inverse_patch: Option<SourcePatchSpan>,
    pub error_ru: Option<String>,
}

#[must_use]
pub fn sha256_short_hex(source: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(source.as_bytes());
    let full = format!("{:x}", hasher.finalize());
    full[..16].to_owned()
}

#[must_use]
pub fn detect_document_line_ending(source: &str) -> &'static str {
    if source.contains("\r\n") {
        "\r\n"
    } else {
        "\n"
    }
}

#[must_use]
pub fn normalize_fragment_eol(fragment: &str, target_eol: &str) -> String {
    let lf = fragment.replace("\r\n", "\n");
    if target_eol == "\r\n" {
        lf.replace('\n', "\r\n")
    } else {
        lf
    }
}

/// Перевод индекса UTF-16 кодовых единиц (JS `string.length`) в байтовый индекс UTF-8 `&str`.
fn utf16_offset_to_utf8_byte(source: &str, target_utf16: usize) -> Option<usize> {
    if target_utf16 == 0 {
        return Some(0);
    }
    let mut seen_utf16 = 0usize;
    for (byte_idx, ch) in source.char_indices() {
        if seen_utf16 == target_utf16 {
            return Some(byte_idx);
        }
        seen_utf16 += ch.len_utf16();
        if seen_utf16 > target_utf16 {
            return None; // Попадание внутрь суррогатной пары
        }
    }
    if seen_utf16 == target_utf16 {
        Some(source.len())
    } else {
        None
    }
}

fn byte_offset_to_line1(source: &str, byte_offset: usize) -> usize {
    let clamped = byte_offset.min(source.len());
    1 + source.as_bytes()[..clamped]
        .iter()
        .filter(|&&b| b == b'\n')
        .count()
}

#[must_use]
pub fn apply_checked_source_patch(
    source: &str,
    patch: &SourcePatchSpan,
    expected_digest: Option<&str>,
) -> CheckedSourcePatchResult {
    let eol = detect_document_line_ending(source);
    let before_digest = sha256_short_hex(source);

    if let Some(expected) = expected_digest
        && !expected.is_empty()
        && expected != before_digest
    {
        return CheckedSourcePatchResult {
            ok: false,
            next_source: source.to_owned(),
            line_ending: eol.to_owned(),
            before_digest: before_digest.clone(),
            after_digest: before_digest,
            byte_delta: 0,
            changed_start_line: 1,
            changed_end_line: 1,
            description_ru: patch.description_ru.clone(),
            inverse_patch: None,
            error_ru: Some(
                "Отклонён патч устаревшей ревизии исходника (несовпадение SHA-256 дайджеста)."
                    .to_owned(),
            ),
        };
    }

    if patch.end_offset < patch.start_offset {
        return CheckedSourcePatchResult {
            ok: false,
            next_source: source.to_owned(),
            line_ending: eol.to_owned(),
            before_digest: before_digest.clone(),
            after_digest: before_digest,
            byte_delta: 0,
            changed_start_line: 1,
            changed_end_line: 1,
            description_ru: patch.description_ru.clone(),
            inverse_patch: None,
            error_ru: Some(format!(
                "Обратный диапазон SourcePatch [{}..{}].",
                patch.start_offset, patch.end_offset
            )),
        };
    }

    let (Some(start_byte), Some(end_byte)) = (
        utf16_offset_to_utf8_byte(source, patch.start_offset),
        utf16_offset_to_utf8_byte(source, patch.end_offset),
    ) else {
        return CheckedSourcePatchResult {
            ok: false,
            next_source: source.to_owned(),
            line_ending: eol.to_owned(),
            before_digest: before_digest.clone(),
            after_digest: before_digest,
            byte_delta: 0,
            changed_start_line: 1,
            changed_end_line: 1,
            description_ru: patch.description_ru.clone(),
            inverse_patch: None,
            error_ru: Some(format!(
                "Диапазон UTF-16 [{}..{}] выходит за границы буфера.",
                patch.start_offset, patch.end_offset
            )),
        };
    };

    let old_slice = &source[start_byte..end_byte];
    let normalized_replacement = normalize_fragment_eol(&patch.replacement, eol);
    let replacement_utf16_len: usize = normalized_replacement.chars().map(char::len_utf16).sum();

    let mut next_source =
        String::with_capacity(source.len() - old_slice.len() + normalized_replacement.len());
    next_source.push_str(&source[..start_byte]);
    next_source.push_str(&normalized_replacement);
    next_source.push_str(&source[end_byte..]);

    let after_digest = sha256_short_hex(&next_source);
    let byte_delta = (next_source.len() as isize) - (source.len() as isize);
    let changed_start_line = byte_offset_to_line1(source, start_byte);
    let changed_end_line =
        byte_offset_to_line1(&next_source, start_byte + normalized_replacement.len());

    CheckedSourcePatchResult {
        ok: true,
        next_source,
        line_ending: eol.to_owned(),
        before_digest,
        after_digest,
        byte_delta,
        changed_start_line,
        changed_end_line,
        description_ru: patch.description_ru.clone(),
        inverse_patch: Some(SourcePatchSpan {
            start_offset: patch.start_offset,
            end_offset: patch.start_offset + replacement_utf16_len,
            replacement: old_slice.to_owned(),
            description_ru: format!("Отмена: {}", patch.description_ru),
        }),
        error_ru: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_crlf_and_cyrillic_with_exact_inverse_undo() {
        let original = "% Кириллический заголовок\r\n\\documentclass[tikz]{standalone}\r\n\\begin{document}\r\n\\begin{tikzpicture}\r\n\\end{tikzpicture}\r\n\\end{document}\r\n";
        let needle = "\\end{tikzpicture}";
        let start_utf16: usize = original[..original.find(needle).unwrap()]
            .chars()
            .map(char::len_utf16)
            .sum();

        let patch = SourcePatchSpan {
            start_offset: start_utf16,
            end_offset: start_utf16,
            replacement: "  \\draw (0cm,0cm) to[R=$R_1$] (2.4cm,0cm);\n".to_owned(),
            description_ru: "Вставка резистора CircuiTikZ".to_owned(),
        };

        let applied = apply_checked_source_patch(original, &patch, None);
        assert!(applied.ok);
        assert!(applied.next_source.contains("\r\n"));
        assert!(!applied.next_source.contains("tikzarium:n1:"));

        let inverse = applied.inverse_patch.unwrap();
        let undone =
            apply_checked_source_patch(&applied.next_source, &inverse, Some(&applied.after_digest));
        assert!(undone.ok);
        assert_eq!(undone.next_source, original);
    }
}
