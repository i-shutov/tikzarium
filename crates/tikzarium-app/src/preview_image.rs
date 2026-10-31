//! B06: bounded, PNG-only decode for every native egui preview path.
//! PDF bytes and XeLaTeX output remain authoritative and unchanged.
use std::io::Cursor;

const PNG_SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";
const MAX_COMPRESSED_BYTES: usize = 64 * 1024 * 1024;
const MAX_EDGE: u32 = 8_192;
const MAX_PIXELS: u64 = 8 * 1024 * 1024;
const MAX_DECODER_ALLOC: u64 = 96 * 1024 * 1024;

fn check_compressed_size(bytes: usize) -> Result<(), String> {
    if bytes > MAX_COMPRESSED_BYTES {
        return Err(format!(
            "PNG preview exceeds compressed size budget ({} > {} bytes)",
            bytes, MAX_COMPRESSED_BYTES
        ));
    }
    Ok(())
}

fn check_dimensions(width: u32, height: u32) -> Result<(), String> {
    let pixels = u64::from(width) * u64::from(height);
    if width == 0 || height == 0 || width > MAX_EDGE || height > MAX_EDGE || pixels > MAX_PIXELS {
        return Err(format!(
            "PNG preview dimensions {width}x{height} exceed safety budget (edge <= {MAX_EDGE}, pixels <= {MAX_PIXELS})"
        ));
    }
    Ok(())
}

/// Reject oversized or malformed PNG headers before invoking any image decoder.
/// The eventual decoder still validates CRC, chunks and actual image data.
fn validate_header(png: &[u8]) -> Result<(), String> {
    check_compressed_size(png.len())?;
    if png.len() < 33 || !png.starts_with(PNG_SIGNATURE) {
        return Err("PNG preview has an invalid or truncated signature/header".into());
    }
    let length = u32::from_be_bytes([png[8], png[9], png[10], png[11]]);
    if length != 13 || &png[12..16] != b"IHDR" {
        return Err("PNG preview is missing a valid first IHDR chunk".into());
    }
    let width = u32::from_be_bytes([png[16], png[17], png[18], png[19]]);
    let height = u32::from_be_bytes([png[20], png[21], png[22], png[23]]);
    check_dimensions(width, height)
}

/// Shared by initial XeLaTeX page, page navigation, and font-proof previews.
/// No user-visible texture is replaced if this returns an error.
pub(crate) fn decode_preview_png(png: &[u8]) -> Result<image::RgbaImage, String> {
    validate_header(png)?;

    // Width/height limits are strict in image-rs; max_alloc is best-effort.
    // Our independent IHDR pixel-count check additionally bounds RGBA allocation.
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(MAX_EDGE);
    limits.max_image_height = Some(MAX_EDGE);
    limits.max_alloc = Some(MAX_DECODER_ALLOC);
    let mut reader = image::ImageReader::with_format(Cursor::new(png), image::ImageFormat::Png);
    reader.limits(limits);
    reader
        .decode()
        .map(|image| image.to_rgba8())
        .map_err(|error| format!("PNG preview decode: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::ImageEncoder;

    fn header(width: u32, height: u32) -> Vec<u8> {
        let mut png = vec![0; 33];
        png[..8].copy_from_slice(PNG_SIGNATURE);
        png[8..12].copy_from_slice(&13u32.to_be_bytes());
        png[12..16].copy_from_slice(b"IHDR");
        png[16..20].copy_from_slice(&width.to_be_bytes());
        png[20..24].copy_from_slice(&height.to_be_bytes());
        png[24] = 8; // 8-bit depth
        png[25] = 6; // RGBA
        png
    }

    #[test]
    fn valid_rgba_png_decodes_without_changing_pixels() {
        let mut png = Vec::new();
        image::codecs::png::PngEncoder::new(&mut png)
            .write_image(&[10, 20, 30, 255], 1, 1, image::ExtendedColorType::Rgba8)
            .unwrap();
        let rgba = decode_preview_png(&png).unwrap();
        assert_eq!(rgba.dimensions(), (1, 1));
        assert_eq!(rgba.as_raw().as_slice(), &[10, 20, 30, 255]);
    }

    #[test]
    fn fail_closed_on_decompression_bomb_header() {
        let err = validate_header(&header(8192, 8192)).unwrap_err();
        assert!(err.contains("dimensions"));
        assert!(validate_header(&header(8192, 1024)).is_ok());
        assert!(validate_header(&header(8193, 1)).is_err());
        assert!(validate_header(&header(1, 8193)).is_err());
        assert!(validate_header(&header(u32::MAX, u32::MAX)).is_err());
        assert!(validate_header(&header(0, 10)).is_err());
        assert!(validate_header(&header(10, 0)).is_err());
    }

    #[test]
    fn malicious_and_truncated_header_is_rejected() {
        assert!(validate_header(&[]).is_err());
        assert!(validate_header(b"not a PNG").is_err());
        assert!(validate_header(&header(1, 1)[..32]).is_err());
        let mut png = header(1, 1);
        png[12..16].copy_from_slice(b"IDAT");
        assert!(validate_header(&png).is_err());
        let mut png = header(1, 1);
        png[11] = 12; // invalid IHDR length
        assert!(validate_header(&png).is_err());
    }

    #[test]
    fn compressed_file_budget_checks_bounds_without_large_allocations() {
        assert!(check_compressed_size(MAX_COMPRESSED_BYTES).is_ok());
        assert!(check_compressed_size(MAX_COMPRESSED_BYTES + 1).is_err());
        assert!(check_dimensions(1, 1).is_ok());
        assert!(check_dimensions(4096, 2048).is_ok());
        assert!(check_dimensions(4096, 2049).is_err());
    }
}
