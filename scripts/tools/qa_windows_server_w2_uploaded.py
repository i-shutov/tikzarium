#!/usr/bin/env python3
"""Check original uploaded server GUI evidence without claiming full W2 acceptance."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zlib

PARTIAL = 'PARTIAL_W2_REAL_VISIBLE_WINDOW_EVIDENCE_NOT_FULL_ACCEPTANCE'

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def png_size(path: Path) -> tuple[int, int]:
    """Parse real PNG chunks/CRCs, not a forged 24-byte IHDR prefix."""
    data = path.read_bytes()
    if len(data) < 57 or data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Invalid original PNG signature')
    at = 8
    ihdr = None
    idat_size = 0
    finished = False
    while at < len(data):
        if at + 12 > len(data):
            raise ValueError('Truncated PNG chunk')
        length = struct.unpack_from('>I', data, at)[0]
        kind = data[at + 4:at + 8]
        stop = at + 12 + length
        if stop > len(data):
            raise ValueError('PNG chunk extends past file')
        payload = data[at + 8:at + 8 + length]
        crc = struct.unpack_from('>I', data, at + 8 + length)[0]
        if (zlib.crc32(kind + payload) & 0xffffffff) != crc:
            raise ValueError('PNG CRC mismatch')
        if at == 8:
            if kind != b'IHDR' or length != 13:
                raise ValueError('Invalid PNG IHDR')
            w, h, bit_depth, color, comp, filt, interlace = struct.unpack('>IIBBBBB', payload)
            if not (800 <= w <= 10000 and 450 <= h <= 10000):
                raise ValueError('Unexpected GUI screenshot geometry')
            if bit_depth != 8 or color not in (2, 6) or comp or filt or interlace:
                raise ValueError('Unsupported native screenshot PNG format')
            ihdr = (w, h)
        elif kind == b'IDAT':
            idat_size += length
        elif kind == b'IEND':
            if length != 0 or stop != len(data):
                raise ValueError('Malformed PNG termination')
            finished = True
        at = stop
        if finished:
            break
    if not (finished and ihdr and idat_size > 0):
        raise ValueError('Incomplete screenshot PNG')
    return ihdr


def validate(root: Path, expected_sha: str) -> dict:
    report = json.loads((root / 'windows-server-w2-interactive.json').read_text(encoding='utf-8-sig'))
    assert report['source_sha'] == expected_sha, 'Exact source SHA mismatch'
    assert report['environment'] == 'PERSONAL_WINDOWS_SERVER'
    assert report['physical_windows10'] == 'NOT_RUN'
    assert report['full_w2_qualification'] == 'NOT_RUN'
    for field in ('gesture_six','source_patch','save_open','native_dialogs','ime','dpi_200','gui_xelatex_pdf'):
        assert report[field] == 'NOT_RUN', 'False full desktop qualification: ' + field
    status = report['status']
    if status == PARTIAL and report.get('schema_version', 1) >= 2:
        origin = report['binary_origin']
        assert origin in ('server-native', 'verified-hosted-release'), 'Unknown original binary origin'
        proof_name = ('windows-server-hosted-artifact.json' if origin == 'verified-hosted-release'
                      else 'windows-server-rust.json')
        proof = json.loads((root / proof_name).read_text(encoding='utf-8-sig'))
        assert proof['source_sha'] == expected_sha and proof['app_sha256'] == report['app_sha256']
        if origin == 'verified-hosted-release':
            assert proof['status'] == 'PASS_VERIFIED_HOSTED_EXE_ZIP_ON_PERSONAL_SERVER_NOT_GUI'
            assert proof['verification_host'] == 'personal-server'
            assert proof['pe_gui_subsystem'] == 2 and proof['pe_cli_subsystem'] == 3
            assert proof['manifest_verified_files'] == 5 and proof['cli_local_help'] == 'PASS_NO_TEX_INVOCATION'
            assert str(proof['source_ci_run_id']).isdigit()
            assert proof['source_ci_run_id'] == report['source_ci_run_id']
        else:
            assert proof['release_build'] == 'PASS_WINDOWS_SERVER_NOT_WIN10'
            assert proof['gui_pe'] == 'PASS_WINDOWS_GUI_SUBSYSTEM_2'
        focus = report['foreground_ownership']
        assert focus['outcome'] == 'CONFIRMED_OWNED_FOREGROUND'
        assert focus['method'] == 'SETFOREGROUND_WM_NULL_BARRIER_NO_QUEUE_ATTACH'
        assert not focus['used_temporary_input_queue_attachment'] and not focus['used_owned_input_queue_attachment']
        assert 1 <= focus['attempted'] <= 30 and focus['trace']
        last = focus['trace'][-1]
        assert last['ready'] is True and last['processed'] is True
        assert last['reason'] == 'RESPONSIVE_AND_STABLE_OWNED_FOREGROUND'
        assert int(last['foreground_hwnd']) > 0
    if status == PARTIAL:
        assert report['preflight'] == 'ELIGIBLE_FOR_WINDOW_PROBE_NOT_W2_PASS'
        # Software GL is an evidence-scoped experiment, not a shipped renderer.
        gl = report.get('gl_renderer')
        assert gl in ('SYSTEM_GL_UNMODIFIED', 'PINNED_MESA_LLVMPIPE_TEMP_ONLY_NOT_PRODUCT')
        if gl == 'PINNED_MESA_LLVMPIPE_TEMP_ONLY_NOT_PRODUCT':
            expected = 'da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'
            assert report['gl_archive_sha256'] == expected
            manifest = json.loads((root / 'w2-mesa-software-gl-provenance.json').read_text(encoding='utf-8-sig'))
            assert manifest['status'] == 'PASS_TEMPORARY_PINNED_TEST_ONLY'
            assert manifest['source_sha'] == expected_sha
            assert manifest['archive_sha256'] == expected
            assert manifest['app_sha256'] == report['app_sha256']
            assert manifest['no_system_install'] is True and manifest['no_product_distribution'] is True
            assert manifest['dll_count'] >= 2
        assert report['window_screenshot'] == 'CAPTURED_CLIENT_PRINTWINDOW_NO_SCREEN_READ_NOT_MANUALLY_REVIEWED'
        assert report['capture_method'] == 'WIN32_PRINTWINDOW_PW_CLIENTONLY_RENDERFULLCONTENT_NO_SCREEN_READ'
        client = report['client_area']
        window = report['window']
        assert 640 <= client['width'] <= window['width'] <= 10000
        assert 360 <= client['height'] <= window['height'] <= 10000
        assert client['left'] >= window['left'] and client['top'] >= window['top']
        assert report['client_sample_colors'] >= 8
        assert report['client_unpainted_samples'] == 0
        assert report['window']['visible'] is True
        assert report['window']['owner_pid'] == report['pid']
        assert 'TikZarium' in report['window']['title']
        assert report['window_station'] == 'WinSta0' and report['desktop'] == 'Default'
        assert report['input_desktop'] == 'Default', 'Input desktop locked or inaccessible'
        assert report['wts_connection_state'] == 0, 'WTS session disconnected'
        assert report['session_id'] > 0
        first = root / 'w2-interactive/real-window-before-f1.png'
        assert first.is_file()
        assert sha256(first) == report['first_png_sha256']
        assert png_size(first) == (client['width'], client['height'])
        if report['f1'] == 'KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW':
            second = root / 'w2-interactive/real-window-after-f1.png'
            assert second.is_file()
            assert sha256(second) == report['second_png_sha256']
            assert png_size(second) == png_size(first)
            assert sha256(second) != sha256(first), 'F1 did not change client image'
        assert report.get('child_terminated') is True
    elif status.startswith('BLOCKED_'):
        assert report.get('error'), 'Blocked state must include reason'
        assert report['window_screenshot'] == 'NOT_RUN', 'Blocked W2 cannot claim client screenshot'
    else:
        raise ValueError(f'Unrecognized W2 status: {status}')
    return {'status':status,'source_sha':expected_sha,
            'window_png_sha256':report.get('first_png_sha256'),
            'f1_png_sha256':report.get('second_png_sha256'),
            'full_w2_qualification':'NOT_RUN','physical_windows10':'NOT_RUN'}

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--root', type=Path, required=True)
    p.add_argument('--source-sha', required=True)
    a = p.parse_args()
    result = validate(a.root, a.source_sha)
    (a.root / 'independent-w2-window-audit.json').write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('W2_ORIGINAL_EVIDENCE=' + result['status'] + '_NOT_FULL_W2_PASS')

if __name__ == '__main__':
    main()
