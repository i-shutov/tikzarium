"""Negative contracts for native hosted Windows HWND/F1 evidence."""
import importlib.util
import json
from pathlib import Path
import struct
import zlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('w2_audit', Path(__file__).with_name('qa_windows_hosted_gui_audit.py'))
w2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w2)

class W2AuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'hosted-window').mkdir()
        def chunk(kind, data):
            return struct.pack('>I', len(data)) + kind + data + struct.pack(
                '>I', zlib.crc32(kind + data) & 0xffffffff)
        ihdr = struct.pack('>IIBBBBB', 1180, 680, 8, 2, 0, 0, 0)
        pixels = (b'\0' + b'\0' * (1180 * 3)) * 680
        image = (b'\x89PNG\r\n\x1a\n'
                 + chunk(b'IHDR', ihdr)
                 + chunk(b'IDAT', zlib.compress(pixels))
                 + chunk(b'IEND', b''))
        (self.root/'hosted-window/real-window-before-f1.png').write_bytes(image)
        self.report = dict(schema_version=1,status=w2.PARTIAL,source_sha='a'*40,
            environment='GITHUB_HOSTED_WINDOWS_2022',physical_windows10='NOT_RUN',
            full_w2_qualification='NOT_RUN',gesture_six='NOT_RUN',
            source_patch='NOT_RUN',save_open='NOT_RUN',native_dialogs='NOT_RUN',
            ime='NOT_RUN',dpi_200='NOT_RUN',gui_xelatex_pdf='NOT_RUN',
            preflight='ELIGIBLE_FOR_WINDOW_PROBE_NOT_W2_PASS',
            window_screenshot='CAPTURED_REAL_HOSTED_HWND_NOT_MANUALLY_REVIEWED',
            window={'visible':True,'owner_pid':200,'title':'TikZarium','width':1180,'height':680},
            window_station='WinSta0',desktop='Default',input_desktop='Default',wts_connection_state=0,session_id=2,pid=200,
            f1='BLOCKED_FOCUS_LOST_AFTER_KEY',child_terminated=True,
            first_png_sha256=w2.sha256(self.root/'hosted-window/real-window-before-f1.png'))

    def verify(self):
        (self.root/'hosted-windows-native-gui.json').write_text(json.dumps(self.report))
        return w2.validate(self.root,'a'*40)

    def test_valid_partial_remains_not_run(self):
        self.assertEqual(self.verify()['full_w2_qualification'],'NOT_RUN')
    def test_reject_forged_full_gui_pass(self):
        self.report['full_w2_qualification']='PASS'
        with self.assertRaises(AssertionError): self.verify()
    def test_reject_wrong_source(self):
        self.report['source_sha']='b'*40
        with self.assertRaises(AssertionError): self.verify()
    def test_reject_screenshot_tamper(self):
        self.report['first_png_sha256']='0'*64
        with self.assertRaises(AssertionError): self.verify()
    def test_reject_corrupt_original_png_crc(self):
        png = self.root/'hosted-window/real-window-before-f1.png'
        data = bytearray(png.read_bytes())
        data[29] ^= 1
        png.write_bytes(data)
        self.report['first_png_sha256'] = w2.sha256(png)
        with self.assertRaises(ValueError): self.verify()

    def test_reject_wrong_pid(self):
        self.report['window']['owner_pid']=199
        with self.assertRaises(AssertionError): self.verify()
    def test_reject_disconnected_or_locked_desktop(self):
        self.report['wts_connection_state']=4
        with self.assertRaises(AssertionError): self.verify()
        self.report['wts_connection_state']=0
        self.report['input_desktop']='Winlogon'
        with self.assertRaises(AssertionError): self.verify()

    def test_reject_blocked_report_claiming_captured_gui(self):
        self.report['status']='BLOCKED_DISCONNECTED_OR_UNKNOWN_SESSION_STATE'
        self.report['error']='WTS disconnected'
        with self.assertRaises(AssertionError): self.verify()

    def test_reject_forged_personal_server(self):
        self.report['environment']='PERSONAL_WINDOWS_SERVER'
        with self.assertRaises(AssertionError): self.verify()
        self.report['environment']='GITHUB_HOSTED_WINDOWS_2022'

    def test_reject_false_windows10(self):
        self.report['physical_windows10']='PASS'
        with self.assertRaises(AssertionError): self.verify()
    def test_blocked_proof_requires_reason(self):
        self.report['status']='BLOCKED_FOREGROUND_NOT_OWNED'
        with self.assertRaises(AssertionError): self.verify()
        self.report['error']='different foreground application'
        self.report['window_screenshot']='NOT_RUN'
        self.assertEqual(self.verify()['status'],'BLOCKED_FOREGROUND_NOT_OWNED')

if __name__ == '__main__':
    unittest.main()
