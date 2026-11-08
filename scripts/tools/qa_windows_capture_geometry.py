"""Reject DPI-virtualized/cropped HWND evidence; never infer physical GUI PASS."""
from __future__ import annotations

SPACE = 'PHYSICAL_PIXELS_PER_MONITOR_V2'


def validate_capture_geometry(report: dict) -> None:
    window = report['window']
    client = report['client_area']
    assert client['left'] >= window['left'] and client['top'] >= window['top']
    assert client['left'] + client['width'] <= window['left'] + window['width']
    assert client['top'] + client['height'] <= window['top'] + window['height']
    version = report.get('schema_version', 1)
    # Old reports cannot establish complete pixels at non-100% scaling. This
    # explicitly rejects the original cropped 125% personal run #42450616810.
    if version < 3:
        assert window.get('dpi', 96) == 96, 'Legacy non-100%-DPI capture lacks physical-pixel proof'
        return
    assert report['coordinate_space'] == SPACE
    assert 96 <= window['dpi'] <= 768, 'Unexpected or missing native window DPI'
    screen = report['screen']
    assert screen['left'] <= window['left'] and screen['top'] <= window['top']
    assert window['left'] + window['width'] <= screen['left'] + screen['width']
    assert window['top'] + window['height'] <= screen['top'] + screen['height']
    fields = ['geometry_preflight', 'capture_geometry_before']
    if report['f1'] == 'KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW':
        fields.append('capture_geometry_after')
    for field in fields:
        proof = report[field]
        assert proof['coordinate_space'] == SPACE, 'Mixed virtual and physical coordinates'
        assert proof['capture_dpi_context'] == 'PER_MONITOR_AWARE_V2'
        assert proof['dpi_context_restored'] is True, 'Capture leaked helper-thread DPI context'
        assert isinstance(proof['caller_dpi_context'], str) and proof['caller_dpi_context'] not in ('', '0')
        assert proof['window_dpi'] == window['dpi']
        assert proof['owner_pid'] == report['pid']
        assert isinstance(proof['hwnd'], str) and proof['hwnd'].isdigit() and int(proof['hwnd']) > 0
        for key in ('left', 'top', 'width', 'height'):
            assert proof[key] == client[key], 'Measured physical client and PNG report disagree'
            assert proof['window_' + key] == window[key]
            assert proof['screen_' + key] == screen[key]
        assert proof['hwnd'] == report['capture_geometry_before']['hwnd']
