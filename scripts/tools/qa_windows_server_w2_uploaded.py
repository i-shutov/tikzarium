#!/usr/bin/env python3
"""Check original uploaded server GUI evidence without claiming full W2 acceptance."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

from qa_windows_capture_geometry import validate_capture_geometry
from qa_windows_capture_evidence import inspect_png, require, validate_identity

PARTIAL = 'PARTIAL_W2_REAL_VISIBLE_WINDOW_EVIDENCE_NOT_FULL_ACCEPTANCE'

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def png_size(path: Path) -> tuple[int, int]:
    """Validate decoded original pixels, not merely PNG metadata and CRC."""
    frame = inspect_png(path)
    return frame.width, frame.height


def validate(root: Path, expected_sha: str) -> dict:
    report = json.loads((root / 'windows-server-w2-interactive.json').read_text(encoding='utf-8-sig'))
    validate_identity(report, expected_sha)
    require(report['source_sha'] == expected_sha, 'Exact source SHA mismatch')
    require(report['environment'] == 'PERSONAL_WINDOWS_SERVER', "Original evidence contract failed: report['environment'] == 'PERSONAL_WINDOWS_SERVER'")
    require(report['physical_windows10'] == 'NOT_RUN', "Original evidence contract failed: report['physical_windows10'] == 'NOT_RUN'")
    require(report['full_w2_qualification'] == 'NOT_RUN', "Original evidence contract failed: report['full_w2_qualification'] == 'NOT_RUN'")
    for field in ('gesture_six','source_patch','save_open','native_dialogs','ime','dpi_200','gui_xelatex_pdf'):
        require(report[field] == 'NOT_RUN', 'False full desktop qualification: ' + field)
    status = report['status']
    if status == PARTIAL and report.get('schema_version', 1) >= 2:
        origin = report['binary_origin']
        require(origin in ('server-native', 'verified-hosted-release'), 'Unknown original binary origin')
        proof_name = ('windows-server-hosted-artifact.json' if origin == 'verified-hosted-release'
                      else 'windows-server-rust.json')
        proof = json.loads((root / proof_name).read_text(encoding='utf-8-sig'))
        require(proof['source_sha'] == expected_sha and proof['app_sha256'] == report['app_sha256'], "Original evidence contract failed: proof['source_sha'] == expected_sha and proof['app_sha256'] == report['app_sha256']")
        if origin == 'verified-hosted-release':
            require(proof['status'] == 'PASS_VERIFIED_HOSTED_EXE_ZIP_ON_PERSONAL_SERVER_NOT_GUI', "Original evidence contract failed: proof['status'] == 'PASS_VERIFIED_HOSTED_EXE_ZIP_ON_PERSONAL_SERVER_NOT_GUI'")
            require(proof['verification_host'] == 'personal-server', "Original evidence contract failed: proof['verification_host'] == 'personal-server'")
            require(proof['pe_gui_subsystem'] == 2 and proof['pe_cli_subsystem'] == 3, "Original evidence contract failed: proof['pe_gui_subsystem'] == 2 and proof['pe_cli_subsystem'] == 3")
            require(proof['manifest_verified_files'] == 5 and proof['cli_local_help'] == 'PASS_NO_TEX_INVOCATION', "Original evidence contract failed: proof['manifest_verified_files'] == 5 and proof['cli_local_help'] == 'PASS_NO_TEX_INVOCATION'")
            require(str(proof['source_ci_run_id']).isdigit(), "Original evidence contract failed: str(proof['source_ci_run_id']).isdigit()")
            require(proof['source_ci_run_id'] == report['source_ci_run_id'], "Original evidence contract failed: proof['source_ci_run_id'] == report['source_ci_run_id']")
        else:
            require(proof['release_build'] == 'PASS_WINDOWS_SERVER_NOT_WIN10', "Original evidence contract failed: proof['release_build'] == 'PASS_WINDOWS_SERVER_NOT_WIN10'")
            require(proof['gui_pe'] == 'PASS_WINDOWS_GUI_SUBSYSTEM_2', "Original evidence contract failed: proof['gui_pe'] == 'PASS_WINDOWS_GUI_SUBSYSTEM_2'")
        focus = report['foreground_ownership']
        require(focus['outcome'] == 'CONFIRMED_OWNED_FOREGROUND', "Original evidence contract failed: focus['outcome'] == 'CONFIRMED_OWNED_FOREGROUND'")
        require(focus['method'] == 'SETFOREGROUND_WM_NULL_BARRIER_NO_QUEUE_ATTACH', "Original evidence contract failed: focus['method'] == 'SETFOREGROUND_WM_NULL_BARRIER_NO_QUEUE_ATTACH'")
        require(not focus['used_temporary_input_queue_attachment'] and not focus['used_owned_input_queue_attachment'], "Original evidence contract failed: not focus['used_temporary_input_queue_attachment'] and not focus['used_owned_input_queue_attachment']")
        require(1 <= focus['attempted'] <= 30 and focus['trace'], "Original evidence contract failed: 1 <= focus['attempted'] <= 30 and focus['trace']")
        last = focus['trace'][-1]
        require(last['ready'] is True and last['processed'] is True, "Original evidence contract failed: last['ready'] is True and last['processed'] is True")
        require(last['reason'] == 'RESPONSIVE_AND_STABLE_OWNED_FOREGROUND', "Original evidence contract failed: last['reason'] == 'RESPONSIVE_AND_STABLE_OWNED_FOREGROUND'")
        require(int(last['foreground_hwnd']) > 0, "Original evidence contract failed: int(last['foreground_hwnd']) > 0")
    if status == PARTIAL:
        require(report['preflight'] == 'ELIGIBLE_FOR_WINDOW_PROBE_NOT_W2_PASS', "Original evidence contract failed: report['preflight'] == 'ELIGIBLE_FOR_WINDOW_PROBE_NOT_W2_PASS'")
        # Software GL is an evidence-scoped experiment, not a shipped renderer.
        gl = report.get('gl_renderer')
        require(gl in ('SYSTEM_GL_UNMODIFIED', 'PINNED_MESA_LLVMPIPE_TEMP_ONLY_NOT_PRODUCT'), "Original evidence contract failed: gl in ('SYSTEM_GL_UNMODIFIED', 'PINNED_MESA_LLVMPIPE_TEMP_ONLY_NOT_PRODUCT')")
        if gl == 'PINNED_MESA_LLVMPIPE_TEMP_ONLY_NOT_PRODUCT':
            # Legacy accepted pal1000 physical evidence did not include
            # archive_kind / per-DLL manifest. Preserve exact old SHA
            # recognition, but new two-source evidence must be fully bound
            # to the actual original provenance and DLL attestations.
            allowed = {
                'PAL1000_MINGW_26_2_6': (
                    'https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-mingw.7z',
                    'da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'),
                'MSYS2_MINGW64_MESA_26_2_6_1': (
                    'https://mirror.msys2.org/mingw/mingw64/mingw-w64-x86_64-mesa-26.2.6-1-any.pkg.tar.zst',
                    '7b14de4d3f234efd0022d14dd7fb313ed751c829bb1f46026e0b2dce2d2d05a4'),
            }
            manifest = json.loads((root / 'w2-mesa-software-gl-provenance.json').read_text(encoding='utf-8-sig'))
            kind = manifest.get('archive_kind')
            if kind is None:
                # Historic original physical W2a predates archive_kind.
                # It can only be the original pal1000 SHA, NEVER MSYS2.
                expected = allowed['PAL1000_MINGW_26_2_6'][1]
                require(report.get('gl_archive_kind') in (None, 'PAL1000_MINGW_26_2_6'),
                        'Legacy Mesa cannot claim unknown archive kind')
            else:
                require(kind in allowed, 'Unknown W2 Mesa archive kind')
                source, expected = allowed[kind]
                require(manifest.get('archive_url') == source,
                        'New Mesa provenance URL and known SHA must be bound')
                require(report.get('gl_archive_kind') == kind,
                        'W2 Mesa archive kind differs between GUI and staging')
                entries = manifest.get('dll_manifest')
                require(isinstance(entries, list) and len(entries) == manifest.get('dll_count'),
                        'New Mesa manifest missing exact DLL inventory')
                hashes = {}
                for entry in entries:
                    name, digest = entry.get('name'), entry.get('sha256')
                    require(isinstance(name, str) and name.lower().endswith('.dll') and
                            name.isascii() and all(c.isalnum() or c in '._-' for c in name) and
                            name.lower() not in hashes and isinstance(digest, str) and
                            len(digest) == 64 and all(c in '0123456789abcdef' for c in digest),
                            'New Mesa DLL inventory has duplicate/malformed names or hashes')
                    hashes[name.lower()] = digest
                require('opengl32.dll' in hashes and 'libgallium_wgl.dll' in hashes,
                        'New Mesa provenance lacks actual OpenGL+Gallium pair')
            require(report['gl_archive_sha256'] == expected, 'Wrong W2 Mesa archive SHA')
            require(manifest['status'] == 'PASS_TEMPORARY_PINNED_TEST_ONLY', 'Mesa original status invalid')
            require(manifest['source_sha'] == expected_sha, 'Mesa wrong app source SHA')
            require(manifest['archive_sha256'] == expected, 'Mesa original archive SHA mismatch')
            require(manifest['app_sha256'] == report['app_sha256'], 'Mesa wrong native EXE SHA')
            require(manifest['no_system_install'] is True and manifest['no_product_distribution'] is True,
                    'Mesa QA-only boundaries not preserved')
            require(manifest['dll_count'] >= 2, 'Mesa original DLL inventory absent')
        require(report['window_screenshot'] == 'CAPTURED_CLIENT_PRINTWINDOW_NO_SCREEN_READ_NOT_MANUALLY_REVIEWED', "Original evidence contract failed: report['window_screenshot'] == 'CAPTURED_CLIENT_PRINTWINDOW_NO_SCREEN_READ_NOT_MANUALLY_REVIEWED'")
        require(report['capture_method'] == 'WIN32_PRINTWINDOW_PW_CLIENTONLY_RENDERFULLCONTENT_NO_SCREEN_READ', "Original evidence contract failed: report['capture_method'] == 'WIN32_PRINTWINDOW_PW_CLIENTONLY_RENDERFULLCONTENT_NO_SCREEN_READ'")
        validate_capture_geometry(report)
        client = report['client_area']
        window = report['window']
        require(640 <= client['width'] <= window['width'] <= 10000, "Original evidence contract failed: 640 <= client['width'] <= window['width'] <= 10000")
        require(360 <= client['height'] <= window['height'] <= 10000, "Original evidence contract failed: 360 <= client['height'] <= window['height'] <= 10000")
        require(client['left'] >= window['left'] and client['top'] >= window['top'], "Original evidence contract failed: client['left'] >= window['left'] and client['top'] >= window['top']")
        require(report['client_sample_colors'] >= 8, "Original evidence contract failed: report['client_sample_colors'] >= 8")
        require(report['client_unpainted_samples'] == 0, "Original evidence contract failed: report['client_unpainted_samples'] == 0")
        require(report['window']['visible'] is True, "Original evidence contract failed: report['window']['visible'] is True")
        require(report['window']['owner_pid'] == report['pid'], "Original evidence contract failed: report['window']['owner_pid'] == report['pid']")
        require('TikZarium' in report['window']['title'], "Original evidence contract failed: 'TikZarium' in report['window']['title']")
        require(report['window_station'] == 'WinSta0' and report['desktop'] == 'Default', "Original evidence contract failed: report['window_station'] == 'WinSta0' and report['desktop'] == 'Default'")
        require(report['input_desktop'] == 'Default', 'Input desktop locked or inaccessible')
        require(report['wts_connection_state'] == 0, 'WTS session disconnected')
        require(report['session_id'] > 0, "Original evidence contract failed: report['session_id'] > 0")
        first = root / 'w2-interactive/real-window-before-f1.png'
        require(first.is_file(), 'Original evidence contract failed: first.is_file()')
        require(sha256(first) == report['first_png_sha256'], "Original evidence contract failed: sha256(first) == report['first_png_sha256']")
        first_pixels = inspect_png(first)
        require((first_pixels.width, first_pixels.height) == (client['width'], client['height']), 'Original PNG/client geometry mismatch')
        require(report['f1'] in ('KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW', 'BLOCKED_FOCUS_LOST_AFTER_KEY'), 'Unknown F1 evidence state')
        if report['f1'] == 'KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW':
            second = root / 'w2-interactive/real-window-after-f1.png'
            require(second.is_file(), 'Original evidence contract failed: second.is_file()')
            require(sha256(second) == report['second_png_sha256'], "Original evidence contract failed: sha256(second) == report['second_png_sha256']")
            second_pixels = inspect_png(second)
            require((second_pixels.width, second_pixels.height) == (first_pixels.width, first_pixels.height), 'F1 PNG/client geometry changed')
            require(second_pixels.pixel_sha256 != first_pixels.pixel_sha256, 'F1 changed only PNG encoding/metadata, not rendered pixels')
            require(sha256(second) != sha256(first), 'F1 did not change client image')
        require(report.get('child_terminated') is True, "Original evidence contract failed: report.get('child_terminated') is True")
    elif status.startswith('BLOCKED_'):
        require(report.get('error'), 'Blocked state must include reason')
        require(report['window_screenshot'] == 'NOT_RUN', 'Blocked W2 cannot claim client screenshot')
    else:
        raise ValueError(f'Unrecognized W2 status: {status}')
    return {'status':status,'source_sha':expected_sha,
            'window_png_sha256':report.get('first_png_sha256'),
            'f1_png_sha256':report.get('second_png_sha256'),
            'full_w2_qualification':'NOT_RUN','physical_windows10':'NOT_RUN',
            'f1_evidence':report.get('f1'), 'visual_review':'REQUIRED_NOT_AUTOMATED'}

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
