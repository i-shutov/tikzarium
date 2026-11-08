"""Negative contracts for original Windows Server W2 evidence."""
import importlib.util
import json
from pathlib import Path
import struct
import zlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('w2_audit', Path(__file__).with_name('qa_windows_server_w2_uploaded.py'))
w2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w2)

class W2AuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'w2-interactive').mkdir()
        def chunk(kind, data):
            return struct.pack('>I', len(data)) + kind + data + struct.pack(
                '>I', zlib.crc32(kind + data) & 0xffffffff)
        ihdr = struct.pack('>IIBBBBB', 1164, 646, 8, 2, 0, 0, 0)
        pixels = (b'\0' + b'\0' * (1164 * 3)) * 646
        image = (b'\x89PNG\r\n\x1a\n'
                 + chunk(b'IHDR', ihdr)
                 + chunk(b'IDAT', zlib.compress(pixels))
                 + chunk(b'IEND', b''))
        (self.root/'w2-interactive/real-window-before-f1.png').write_bytes(image)
        self.report = dict(schema_version=1,status=w2.PARTIAL,source_sha='a'*40,
            environment='PERSONAL_WINDOWS_SERVER',physical_windows10='NOT_RUN',
            full_w2_qualification='NOT_RUN',gesture_six='NOT_RUN',
            source_patch='NOT_RUN',save_open='NOT_RUN',native_dialogs='NOT_RUN',
            ime='NOT_RUN',dpi_200='NOT_RUN',gui_xelatex_pdf='NOT_RUN',
            preflight='ELIGIBLE_FOR_WINDOW_PROBE_NOT_W2_PASS',
            window_screenshot='CAPTURED_CLIENT_PRINTWINDOW_NO_SCREEN_READ_NOT_MANUALLY_REVIEWED',
            window={'visible':True,'owner_pid':200,'title':'TikZarium','width':1180,'height':680,'left':90,'top':98},
            client_area={'left':100,'top':130,'width':1164,'height':646},
            capture_method='WIN32_PRINTWINDOW_PW_CLIENTONLY_RENDERFULLCONTENT_NO_SCREEN_READ',
            gl_renderer='SYSTEM_GL_UNMODIFIED',
            client_sample_colors=16,client_unpainted_samples=0,
            window_station='WinSta0',desktop='Default',input_desktop='Default',wts_connection_state=0,session_id=2,pid=200,
            f1='BLOCKED_FOCUS_LOST_AFTER_KEY',child_terminated=True,
            first_png_sha256=w2.sha256(self.root/'w2-interactive/real-window-before-f1.png'))

    def verify(self):
        (self.root/'windows-server-w2-interactive.json').write_text(json.dumps(self.report))
        return w2.validate(self.root,'a'*40)

    def with_hosted_v2(self):
        self.report.update(schema_version=2, binary_origin='verified-hosted-release',
            app_sha256='c'*64, source_ci_run_id='1234', foreground_ownership={
                'outcome': 'CONFIRMED_OWNED_FOREGROUND',
                'method': 'SETFOREGROUND_WM_NULL_BARRIER_NO_QUEUE_ATTACH',
                'used_temporary_input_queue_attachment': False,
                'used_owned_input_queue_attachment': False, 'attempted': 1,
                'trace': [{'ready': True, 'processed': True, 'foreground_hwnd': '4321',
                           'reason': 'RESPONSIVE_AND_STABLE_OWNED_FOREGROUND'}]})
        proof=dict(source_sha='a'*40, app_sha256='c'*64,
                   status='PASS_VERIFIED_HOSTED_EXE_ZIP_ON_PERSONAL_SERVER_NOT_GUI',
                   verification_host='personal-server', pe_gui_subsystem=2, pe_cli_subsystem=3,
                   manifest_verified_files=5, cli_local_help='PASS_NO_TEX_INVOCATION', source_ci_run_id='1234')
        (self.root/'windows-server-hosted-artifact.json').write_text(json.dumps(proof))

    def test_v2_distributed_exe_personal_execution_is_not_server_build_or_full_w2(self):
        self.with_hosted_v2()
        self.assertEqual(self.verify()['full_w2_qualification'], 'NOT_RUN')

    def test_v2_reject_original_exe_sha_mismatch(self):
        self.with_hosted_v2(); self.report['app_sha256']='d'*64
        with self.assertRaises(AssertionError): self.verify()

    def test_v2_reject_missing_responsive_foreground_handshake(self):
        self.with_hosted_v2(); self.report['foreground_ownership']['trace'][0]['processed']=False
        with self.assertRaises(AssertionError): self.verify()

    def test_v2_reject_hosted_only_verifier_mislabeled_personal(self):
        self.with_hosted_v2()
        path=self.root/'windows-server-hosted-artifact.json';proof=json.loads(path.read_text())
        proof['verification_host']='hosted-ci';path.write_text(json.dumps(proof))
        with self.assertRaises(AssertionError): self.verify()

    def test_valid_partial_remains_not_run(self):
        self.assertEqual(self.verify()['full_w2_qualification'],'NOT_RUN')
    def test_reject_unknown_gl_provenance_on_personal_server(self):
        self.report['gl_renderer']='UNKNOWN_GPU_APPROVED'
        with self.assertRaises(AssertionError): self.verify()

    def test_reject_claimed_temporary_mesa_without_original_report(self):
        self.report['gl_renderer']='PINNED_MESA_LLVMPIPE_TEMP_ONLY_NOT_PRODUCT'
        self.report['gl_archive_sha256']='da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'
        with self.assertRaises(FileNotFoundError): self.verify()

    def test_accept_exact_mesa_provenance_but_never_full_w2(self):
        self.report['gl_renderer']='PINNED_MESA_LLVMPIPE_TEMP_ONLY_NOT_PRODUCT'
        expected='da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'
        self.report['gl_archive_sha256']=expected
        manifest=dict(status='PASS_TEMPORARY_PINNED_TEST_ONLY',source_sha='a'*40,
                      archive_sha256=expected,app_sha256='b'*64,
                      no_system_install=True,no_product_distribution=True,dll_count=19)
        self.report['app_sha256']='b'*64
        (self.root/'w2-mesa-software-gl-provenance.json').write_text(json.dumps(manifest))
        self.assertEqual(self.verify()['full_w2_qualification'],'NOT_RUN')
        manifest['no_product_distribution']=False
        (self.root/'w2-mesa-software-gl-provenance.json').write_text(json.dumps(manifest))
        with self.assertRaises(AssertionError): self.verify()

    def test_reject_screen_copy_pretext(self):
        self.report['capture_method']='COPYFROMSCREEN_OUTER_HWND'
        with self.assertRaises(AssertionError): self.verify()

    def test_reject_wrong_client_bounds(self):
        self.report['client_area']['width']=1180
        self.report['client_area']['height']=680
        with self.assertRaises(AssertionError): self.verify()
        self.report['client_area']['width']=1164
        self.report['client_area']['left']=70
        with self.assertRaises(AssertionError): self.verify()

    def test_reject_no_rendered_client_pixels(self):
        self.report['client_sample_colors']=1
        with self.assertRaises(AssertionError): self.verify()
        self.report['client_sample_colors']=16
        self.report['client_unpainted_samples']=1
        with self.assertRaises(AssertionError): self.verify()

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
        png = self.root/'w2-interactive/real-window-before-f1.png'
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
