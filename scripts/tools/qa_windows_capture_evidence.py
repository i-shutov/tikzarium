"""Independent PNG/content checks. No validation relies on Python ``assert``.

Decode only the RGB/RGBA, 8-bit, non-interlaced PNGs produced by the native
owned-client capture. Bounded zlib output prevents trusting IHDR alone. A change
in PNG metadata/compression is not a change in the rendered F1 frame.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
from pathlib import Path
import re
import struct
import zlib

MAX_PNG_BYTES = 64 * 1024 * 1024
MAX_DECODED_BYTES = 64 * 1024 * 1024
PNG_SIGNATURE = b'\x89PNG\r\n\x1a\n'


class EvidenceError(AssertionError):
    """An explicit failed evidence gate, also enforced by python -O/-OO."""


def require(condition: bool, message: str = 'Original evidence contract failed') -> None:
    if not condition:
        raise EvidenceError(message)


def validate_identity(report: dict, expected_sha: str) -> None:
    require(isinstance(expected_sha, str) and re.fullmatch(r'[0-9a-f]{40}', expected_sha) is not None,
            'Expected a full lowercase source SHA')
    require(isinstance(report, dict), 'Original report must be a JSON object')
    version = report.get('schema_version', 1)
    require(type(version) is int and version in (1, 2, 3), 'Unknown original evidence schema')
    require(report.get('source_sha') == expected_sha, 'Exact source SHA mismatch')


@dataclass(frozen=True)
class PngEvidence:
    width: int
    height: int
    pixel_sha256: str
    sampled_colors: int


def _unfilter(filtered: bytes, previous: bytes, kind: int, bpp: int) -> bytes:
    if kind == 0:
        return filtered
    if kind not in (1, 2, 3, 4):
        raise ValueError('Invalid PNG row filter')
    row = bytearray(filtered)
    for i in range(len(row)):
        left = row[i - bpp] if i >= bpp else 0
        above = previous[i]
        if kind == 1:
            predictor = left
        elif kind == 2:
            predictor = above
        elif kind == 3:
            predictor = (left + above) // 2
        else:
            upper_left = previous[i - bpp] if i >= bpp else 0
            p = left + above - upper_left
            distances = (abs(p - left), abs(p - above), abs(p - upper_left))
            predictor = (left, above, upper_left)[distances.index(min(distances))]
        row[i] = (row[i] + predictor) & 255
    return bytes(row)


def inspect_png(path: Path) -> PngEvidence:
    """Verify original chunks, compressed stream, actual opaque pixels and color content."""
    with path.open('rb') as stream:
        data = stream.read(MAX_PNG_BYTES + 1)
    if len(data) > MAX_PNG_BYTES:
        raise ValueError('Original PNG exceeds compressed byte budget')
    if len(data) < 57 or data[:8] != PNG_SIGNATURE:
        raise ValueError('Invalid original PNG signature')
    offset = 8
    dimensions = None
    compressed = bytearray()
    idat_started = False
    idat_ended = False
    ended = False
    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError('Truncated PNG chunk')
        length = struct.unpack_from('>I', data, offset)[0]
        kind = data[offset + 4:offset + 8]
        stop = offset + length + 12
        if stop > len(data):
            raise ValueError('PNG chunk extends past file')
        payload = data[offset + 8:stop - 4]
        crc = struct.unpack_from('>I', data, stop - 4)[0]
        if (zlib.crc32(kind + payload) & 0xffffffff) != crc:
            raise ValueError('PNG CRC mismatch')
        if len(kind) != 4 or not all(65 <= c <= 90 or 97 <= c <= 122 for c in kind):
            raise ValueError('Invalid PNG chunk type')
        if kind == b'IHDR':
            if offset != 8 or length != 13 or dimensions is not None:
                raise ValueError('Invalid or repeated PNG IHDR')
            width, height, depth, color, comp, filt, interlace = struct.unpack('>IIBBBBB', payload)
            if not (800 <= width <= 10000 and 450 <= height <= 10000):
                raise ValueError('Unexpected GUI screenshot geometry')
            if depth != 8 or color not in (2, 6) or comp or filt or interlace:
                raise ValueError('Unsupported native screenshot PNG format')
            bpp = 3 if color == 2 else 4
            required = height * (1 + width * bpp)
            if required > MAX_DECODED_BYTES:
                raise ValueError('Original PNG exceeds decoded pixel budget')
            dimensions = (width, height, bpp, required)
        elif dimensions is None:
            raise ValueError('PNG IHDR must be first')
        elif kind == b'IDAT':
            if idat_ended:
                raise ValueError('Noncontiguous PNG image data')
            idat_started = True
            compressed.extend(payload)
        elif kind == b'IEND':
            if length or stop != len(data) or not idat_started:
                raise ValueError('Malformed PNG termination')
            ended = True
        else:
            if idat_started:
                idat_ended = True
            if kind == b'PLTE':
                if idat_started or not length or length % 3 or length > 768:
                    raise ValueError('Invalid optional PNG palette')
            elif kind == b'tRNS':
                raise ValueError('Transparent color-key screenshots are not accepted')
            elif not kind[0] & 32:
                raise ValueError('Unknown critical PNG chunk')
        offset = stop
        if ended:
            break
    if not ended or dimensions is None or not compressed:
        raise ValueError('Incomplete screenshot PNG')
    width, height, bpp, required = dimensions
    try:
        decoder = zlib.decompressobj()
        raw = decoder.decompress(compressed, required + 1)
    except zlib.error as exc:
        raise ValueError('Invalid PNG compressed pixel stream') from exc
    if (len(raw) != required or not decoder.eof or decoder.unconsumed_tail or decoder.unused_data):
        raise ValueError('PNG decompression size/termination mismatch')
    pixel_digest = hashlib.sha256()
    previous = bytes(width * bpp)
    colors: set[bytes] = set()
    stride = width * bpp + 1
    for y in range(height):
        row = _unfilter(raw[y * stride + 1:(y + 1) * stride], previous, raw[y * stride], bpp)
        previous = row
        if bpp == 4:
            if row[3::4] != b'\xff' * width:
                raise ValueError('Nonopaque original client screenshot')
            # Normalize opaque RGBA and RGB to identical visible-pixel hashes.
            rgb = bytearray(width * 3)
            rgb[0::3], rgb[1::3], rgb[2::3] = row[0::4], row[1::4], row[2::4]
        else:
            rgb = row
        pixel_digest.update(rgb)
        if y % max(1, height // 32) == 0:
            for x in range(0, width, max(1, width // 48)):
                colors.add(bytes(rgb[x * 3:x * 3 + 3]))
    require(len(colors) >= 8, 'Original PNG pixels are blank or insufficiently rendered')
    return PngEvidence(width, height, pixel_digest.hexdigest(), len(colors))
