"""Physical-pixel provenance regressions, including original 125%-DPI failure."""
import copy
import unittest
from qa_windows_capture_geometry import SPACE, validate_capture_geometry


class PhysicalPixelTests(unittest.TestCase):
    def setUp(self):
        window = dict(left=192, top=192, width=1492, height=898, dpi=120)
        client = dict(left=201, top=230, width=1475, height=850)
        screen = dict(left=0, top=0, width=2560, height=1440)
        proof = dict(**client, coordinate_space=SPACE, capture_dpi_context='PER_MONITOR_AWARE_V2',
                     caller_dpi_context='-1', dpi_context_restored=True, window_dpi=120,
                     owner_pid=42, hwnd='1234')
        for key in ('left', 'top', 'width', 'height'):
            proof['window_'+key] = window[key]
            proof['screen_'+key] = screen[key]
        self.report = dict(schema_version=3, coordinate_space=SPACE, pid=42, window=window,
                           client_area=client, screen=screen,
                           f1='KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW',
                           geometry_preflight=copy.deepcopy(proof), capture_geometry_before=copy.deepcopy(proof),
                           capture_geometry_after=copy.deepcopy(proof))

    def test_exact_physical_measurements_at_125_percent(self):
        validate_capture_geometry(self.report)

    def test_legacy_125_percent_cannot_prove_complete_capture(self):
        self.report['schema_version'] = 2
        with self.assertRaisesRegex(AssertionError, 'Legacy non-100%'):
            validate_capture_geometry(self.report)

    def test_no_blanket_rejection_of_legacy_100_percent(self):
        self.report['schema_version'] = 1
        self.report['window']['dpi'] = 96
        validate_capture_geometry(self.report)

    def test_cropped_1180_by_680_png_is_not_1475_by_850_client(self):
        self.report['client_area'].update(width=1180, height=680)
        with self.assertRaisesRegex(AssertionError, 'physical client'):
            validate_capture_geometry(self.report)

    def test_mixed_virtualized_window_coordinates_fail(self):
        self.report['window']['width'] = 1194
        with self.assertRaises(AssertionError): validate_capture_geometry(self.report)

    def test_dpi_scope_must_restore_for_every_capture(self):
        for field in ('geometry_preflight', 'capture_geometry_before', 'capture_geometry_after'):
            with self.subTest(field=field):
                report=copy.deepcopy(self.report); report[field]['dpi_context_restored']=False
                with self.assertRaisesRegex(AssertionError, 'leaked'): validate_capture_geometry(report)

    def test_no_missing_after_f1_scope(self):
        del self.report['capture_geometry_after']
        with self.assertRaises(KeyError): validate_capture_geometry(self.report)

    def test_wrong_hwnd_or_owner_fails(self):
        self.report['capture_geometry_after']['hwnd']='9999'
        with self.assertRaises(AssertionError): validate_capture_geometry(self.report)
        self.report['capture_geometry_after']['hwnd']='1234'
        self.report['capture_geometry_after']['owner_pid']=100
        with self.assertRaises(AssertionError): validate_capture_geometry(self.report)

    def test_wrong_scope_does_not_pass_as_physical(self):
        self.report['capture_geometry_before']['capture_dpi_context']='DPI_UNAWARE'
        with self.assertRaises(AssertionError): validate_capture_geometry(self.report)

    def test_native_screen_and_window_share_space(self):
        self.report['screen']['width']=1300
        with self.assertRaises(AssertionError): validate_capture_geometry(self.report)


if __name__ == '__main__':
    unittest.main()
