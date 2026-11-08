"""W2b original evidence fails closed even with Python -O/-OO."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

from qa_windows_capture_evidence import EvidenceError, PngEvidence
import qa_windows_server_w2b_uploaded as w2b

SHA='ef95c1c9ef1ac2b311a654c1daac53c97c8d7ef9'
W2A='PARTIAL_W2_REAL_VISIBLE_WINDOW_EVIDENCE_NOT_FULL_ACCEPTANCE'
BASE=(b'\\documentclass{standalone}\r\n\\usepackage{tikz}\r\n'
      b'\\begin{document}\r\n\\begin{tikzpicture}\r\n'
      b'  \\node at (0,0) {ABC};\r\n'
      b'\\end{tikzpicture}\r\n\\end{document}\r\n')
INSERT=(b'  \\draw (0,0) -- (1,1); % tikzarium:n1:'
        b'[2,1,"line",{"x1":"0cm","y1":"0cm"}]\r\n')
AFTER=BASE.replace(b'\\end{tikzpicture}\r\n',INSERT+b'\\end{tikzpicture}\r\n')


class OriginalStage1Tests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.folder=self.root/'w2-interactive'/'w2b-stage1'
        self.folder.mkdir(parents=True)
        self.w2a={'source_sha':SHA,'environment':'PERSONAL_WINDOWS_SERVER',
                  'status':W2A,'full_w2_qualification':'NOT_RUN',
                  'physical_windows10':'NOT_RUN','pid':8440,
                  'f1':'KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW'}
        self.stage={'source_sha':SHA,'environment':'PERSONAL_WINDOWS_SERVER',
                    'status':w2b.STAGE1,'full_w2b_qualification':'NOT_RUN',
                    'physical_windows10':'NOT_RUN','gui_open':'NOT_RUN','ime':'NOT_RUN',
                    'gui_xelatex_pdf':'NOT_RUN','preflight':'ELIGIBLE_ONE_LINE_NOT_W2B_PASS',
                    'input_method':'WIN32_REAL_MOUSE_EVENTS_OWNED_HWND_PMV2',
                    'gui_save':'PASS_REAL_GUI_SOURCE_SAVE',
                    'source_patch':'PASS_ONE_C_OWNED_LINE_PREAMBLE_PRESERVED',
                    'six_gestures':'NOT_RUN_FIVE_MORE_TO_TEST',
                    'owner_count':1,
                    'geometry':{'owner_pid':8440,'width':1475,'height':850,
                                'window_dpi':120,'coordinate_space':'PHYSICAL_PIXELS_PER_MONITOR_V2',
                                'dpi_context_restored':True},
                    'baseline_source_copy':'stage1-original-before.tex',
                    'saved_source_copy':'stage1-original-gui-saved.tex',
                    'native_save_dialog':{
                      'status':'PASS_OWNED_NATIVE_SAVE_DIALOG',
                      'class':'#32770','process_id':8440,
                      'dpi_context_restored':True,
                      'chosen_source_path':str(self.folder.parent/'figure.tex'),
                      'original_dialog_png':'00-real-owned-save-dialog.png'}}
        self.before=self.folder/self.stage['baseline_source_copy']
        self.after=self.folder/self.stage['saved_source_copy']
        self.before.write_bytes(BASE)
        self.after.write_bytes(AFTER)
        (self.folder.parent/'figure.tex').write_bytes(AFTER)
        self.dialog=self.folder/'00-real-owned-save-dialog.png'
        self.dialog.write_bytes(b'OWNED_SAVE_DIALOG_RAW_PNG_BYTES')
        self.stage['native_save_dialog']['original_dialog_png_sha256']=w2b.sha256(self.dialog)
        self.stage['baseline_sha256']=w2b.sha256(self.before)
        self.stage['native_save_dialog']['saved_source_sha256']=w2b.sha256(self.before)
        self.stage['source_sha256']=w2b.sha256(self.after)
        self.pngs=[self.folder/n for n in
                   ('00-before-palette.png','01-real-geometry-palette.png','02-real-line-saved.png')]
        for n,p in enumerate(self.pngs):p.write_bytes(bytes([n+1]))
        self.save()

    def save(self):
        (self.root/'windows-server-w2-interactive.json').write_text(
            json.dumps(self.w2a),encoding='utf-8')
        (self.folder/'w2b-stage1-original.json').write_text(
            json.dumps(self.stage),encoding='utf-8')

    def check(self):
        frames=[PngEvidence(960,600,'d'*64,40)]
        frames.extend(PngEvidence(1475,850,chr(97+n)*64,40) for n in range(3))
        with patch.object(w2b,'inspect_png',side_effect=frames):
            return w2b.validate(self.root,SHA)

    def test_valid_stage1_never_claims_six_or_win10(self):
        r=self.check()
        self.assertEqual(r['status'],w2b.STAGE1)
        self.assertEqual(r['w2b_full'],'NOT_RUN')
        self.assertEqual(r['win10_w3'],'NOT_RUN')
        self.assertEqual(r['actual_native_line_id'],1)

    def test_foreign_owner_pid_rejected(self):
        self.stage['geometry']['owner_pid']=9882;self.save()
        with self.assertRaises(EvidenceError):self.check()

    def test_wrong_source_sha_rejected(self):
        self.stage['source_sha']='0'*40;self.save()
        with self.assertRaises(EvidenceError):self.check()

    def test_wrong_dpi_context_rejected(self):
        self.stage['geometry']['dpi_context_restored']=False;self.save()
        with self.assertRaises(EvidenceError):self.check()

    def test_forged_full_w2b_rejected(self):
        self.stage['full_w2b_qualification']='PASS';self.save()
        with self.assertRaises(EvidenceError):self.check()

    def test_forged_physical_win10_rejected(self):
        self.stage['physical_windows10']='PASS';self.save()
        with self.assertRaises(EvidenceError):self.check()

    def test_missing_original_source_rejected(self):
        self.before.unlink()
        with self.assertRaises(EvidenceError):self.check()

    def test_mutated_opaque_source_rejected(self):
        self.after.write_bytes(AFTER.replace(b'ABC',b'BAD'))
        self.stage['source_sha256']=w2b.sha256(self.after);self.save()
        with self.assertRaises(EvidenceError):self.check()

    def test_forged_tool_rejected(self):
        self.after.write_bytes(AFTER.replace(b'"line"',b'"arrow"'))
        self.stage['source_sha256']=w2b.sha256(self.after);self.save()
        with self.assertRaises(EvidenceError):self.check()

    def test_duplicate_owner_markers_rejected(self):
        self.after.write_bytes(AFTER.replace(INSERT,INSERT+INSERT))
        self.stage['source_sha256']=w2b.sha256(self.after);self.save()
        with self.assertRaises(EvidenceError):self.check()

    def test_png_metadata_only_change_rejected(self):
        frames=[PngEvidence(960,600,'d'*64,40),
                PngEvidence(1475,850,'a'*64,40),
                PngEvidence(1475,850,'a'*64,40),
                PngEvidence(1475,850,'b'*64,40)]
        with patch.object(w2b,'inspect_png',side_effect=frames):
            with self.assertRaises(EvidenceError):w2b.validate(self.root,SHA)

    def test_png_geometry_changed_rejected(self):
        frames=[PngEvidence(960,600,'d'*64,40),
                PngEvidence(1475,850,'a'*64,40),
                PngEvidence(1475,850,'b'*64,40),
                PngEvidence(900,600,'c'*64,40)]
        with patch.object(w2b,'inspect_png',side_effect=frames):
            with self.assertRaises(EvidenceError):w2b.validate(self.root,SHA)

    def test_native_save_dialog_missing_rejected(self):
        self.dialog.unlink()
        with self.assertRaises(EvidenceError):self.check()

    def test_native_save_dialog_foreign_pid_rejected(self):
        self.stage['native_save_dialog']['process_id']=9988;self.save()
        with self.assertRaises(EvidenceError):self.check()

    def test_native_save_dialog_wrong_path_rejected(self):
        self.stage['native_save_dialog']['chosen_source_path']='C:/wrong/foreign.tex';self.save()
        with self.assertRaises(EvidenceError):self.check()

    def test_native_save_dialog_png_tampering_rejected(self):
        self.dialog.write_bytes(b'MODIFIED_PNG')
        with self.assertRaises(EvidenceError):self.check()

    def test_native_save_dialog_wrong_source_sha_rejected(self):
        self.stage['native_save_dialog']['saved_source_sha256']='0'*64;self.save()
        with self.assertRaises(EvidenceError):self.check()

    def test_native_save_dialog_missing_actual_gui_file_rejected(self):
        (self.folder.parent/'figure.tex').unlink()
        with self.assertRaises(EvidenceError):self.check()

    def test_blocked_not_promoted(self):
        self.stage.update(status='BLOCKED_STAGE1',error='BLOCKED_OWNER_FOCUS',
                          gui_save='NOT_RUN',source_patch='NOT_RUN')
        self.save()
        r=self.check()
        self.assertEqual(r['w2b_full'],'NOT_RUN')

    def test_blocked_without_reason_rejected(self):
        self.stage.update(status='BLOCKED_STAGE1',error='',
                          gui_save='NOT_RUN',source_patch='NOT_RUN')
        self.save()
        with self.assertRaises(EvidenceError):self.check()


if __name__=='__main__':
    unittest.main()
