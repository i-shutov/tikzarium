//! Literal, byte-preserving editor navigation. No TeX parsing or regeneration.
use std::ops::Range;

/// egui uses Unicode scalar indices; source transactions use UTF-8 byte indices.
#[derive(Clone, Debug)]
pub struct PhysicalLine {
    pub character: usize,
}

pub fn physical_lines(source: &str) -> Vec<PhysicalLine> {
    let mut lines = vec![PhysicalLine { character: 0 }];
    for (character, ch) in source.chars().enumerate() {
        if ch == '\n' {
            lines.push(PhysicalLine {
                character: character + 1,
            });
        }
    }
    lines
}

#[cfg(test)]
pub fn line_column(source: &str, character: usize) -> (usize, usize) {
    let lines = physical_lines(source);
    let character = character.min(source.chars().count());
    let line = lines
        .partition_point(|line| line.character <= character)
        .saturating_sub(1);
    (line + 1, character - lines[line].character + 1)
}

#[cfg(test)]
pub fn char_range(source: &str, bytes: &Range<usize>) -> Range<usize> {
    source[..bytes.start].chars().count()..source[..bytes.end].chars().count()
}

/// Convert sorted non-overlapping match ranges with one UTF-8 traversal.
pub fn char_ranges(source: &str, ranges: &[Range<usize>]) -> Vec<Range<usize>> {
    let mut result = Vec::with_capacity(ranges.len());
    let mut byte = 0;
    let mut character = 0;
    for range in ranges {
        character += source[byte..range.start].chars().count();
        let start = character;
        character += source[range.start..range.end].chars().count();
        result.push(start..character);
        byte = range.end;
    }
    result
}

pub fn matches(source: &str, needle: &str) -> Vec<Range<usize>> {
    if needle.is_empty() {
        return Vec::new();
    }
    source
        .match_indices(needle)
        .map(|(start, text)| start..start + text.len())
        .collect()
}

#[derive(Clone, Debug)]
pub struct ReplacementPreview {
    revision: u64,
    source: String,
    replacement: String,
    ranges: Vec<Range<usize>>,
}

impl ReplacementPreview {
    pub fn new(
        source: &str,
        revision: u64,
        needle: &str,
        replacement: &str,
        selected: Option<usize>,
    ) -> Self {
        let mut ranges = matches(source, needle);
        if let Some(index) = selected {
            ranges = ranges.get(index).cloned().into_iter().collect();
        }
        Self {
            revision,
            source: source.into(),
            replacement: replacement.into(),
            ranges,
        }
    }
    pub fn count(&self) -> usize {
        self.ranges.len()
    }
    /// Equality protects against document resets that happen to reuse a revision.
    pub fn apply(&self, source: &mut String, revision: u64) -> Result<bool, &'static str> {
        if self.revision != revision || self.source != *source {
            return Err("Исходник изменился: повторите предпросмотр замены");
        }
        let mut result = String::with_capacity(source.len());
        let mut copied = 0;
        for range in &self.ranges {
            result.push_str(&source[copied..range.start]);
            result.push_str(&self.replacement);
            copied = range.end;
        }
        result.push_str(&source[copied..]);
        let changed = result != *source;
        *source = result;
        Ok(changed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn physical_lines_unicode_crlf_and_trailing_empty() {
        let source = "Ж🦀\r\nnext\n";
        let lines = physical_lines(source);
        assert_eq!(
            lines.iter().map(|l| l.character).collect::<Vec<_>>(),
            vec![0, 4, 9]
        );
        assert_eq!(line_column(source, 2), (1, 3));
        assert_eq!(line_column(source, 4), (2, 1));
        assert_eq!(line_column(source, 999), (3, 1));
        assert_eq!(physical_lines("").len(), 1);
        assert_eq!(physical_lines("no newline").len(), 1);
    }
    #[test]
    fn literal_replacement_preserves_unrelated_bytes_and_rejects_stale() {
        let original = "% keep\r\n\\opaque{Ж🦀} Ж🦀\r\n";
        let mut source = original.to_owned();
        let preview = ReplacementPreview::new(&source, 7, "Ж🦀", "$1\\raw", None);
        assert_eq!(preview.count(), 2);
        assert!(preview.apply(&mut source, 8).is_err());
        assert_eq!(source, original);
        assert!(preview.apply(&mut source, 7).unwrap());
        assert_eq!(source, "% keep\r\n\\opaque{$1\\raw} $1\\raw\r\n");
        assert!(preview.apply(&mut source, 7).is_err());
    }
    #[test]
    fn nonoverlap_empty_and_single_match() {
        assert_eq!(matches("aaaa", "aa"), vec![0..2, 2..4]);
        assert!(matches("abc", "").is_empty());
        let mut source = String::from("αβ αβ");
        assert_eq!(char_range(&source, &(5..9)), 3..5);
        let preview = ReplacementPreview::new(&source, 0, "αβ", "", Some(1));
        assert_eq!(preview.count(), 1);
        preview.apply(&mut source, 0).unwrap();
        assert_eq!(source, "αβ ");
    }
}
