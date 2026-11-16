import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TAURI_V2_IPC_CATALOG,
  createAdaptiveEngineAdapter,
  isTauriRuntime,
  subscribeTauriExternalFileChanges,
  tauriDoctorEnvironment,
  tauriSaveTexDocument,
} from './tauriNativeBridge';

test('Adaptive EngineAdapter selects web-express-gs-xelatex when __TAURI_INTERNALS__ is absent', () => {
  assert.equal(isTauriRuntime({}), false);
  const webAdapter = createAdaptiveEngineAdapter('', {});
  assert.equal(webAdapter.adapterId, 'web-express-gs-xelatex');
  assert.equal(TAURI_V2_IPC_CATALOG.length, 9);
});

test('Adaptive EngineAdapter routes renderPdfUnderlay, doctor, save, and file watcher via Tauri v2 IPC', async () => {
  const calls: Array<{ cmd: string; args?: Record<string, unknown> }> = [];
  const callbackBox: { fn: ((ev: unknown) => void) | null } = { fn: null };

  const mockTauriGlobal: Record<string, unknown> = {
    __TAURI_INTERNALS__: {
      transformCallback(cb: (ev: unknown) => void) {
        callbackBox.fn = cb;
        return 42;
      },
      async invoke(cmd: string, args?: Record<string, unknown>) {
        calls.push({ cmd, args });
        if (cmd === 'tz_render_pdf_underlay') {
          return {
            ok: true,
            revision: 7,
            sourceDigest: 'abc12345',
            engine: 'xelatex',
            engineLabelRu: 'Точный нативный XeLaTeX (TeX Live 2025)',
            pngDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
            pdfBase64: 'JVBERi0xLjU=',
            pageWidthPt: 175.7,
            pageHeightPt: 107.7,
            renderMs: 38,
            objectsRendered: 3,
            hitboxes: [],
          };
        }
        if (cmd === 'tz_doctor_environment') {
          return { doctor: { exitCode: 0 } };
        }
        if (cmd === 'plugin:dialog|save') {
          return '/tmp/circuit_filter.tex';
        }
        if (cmd === 'tz_save_document') {
          return {
            ok: true,
            path: String(args?.path ?? ''),
            dirty: false,
            sha256Short: '0123456789abcdef',
          };
        }
        if (cmd === 'plugin:event|listen') {
          return 99;
        }
        return true;
      },
    },
  };

  assert.equal(isTauriRuntime(mockTauriGlobal), true);
  const tauriAdapter = createAdaptiveEngineAdapter('', mockTauriGlobal);
  assert.equal(tauriAdapter.adapterId, 'rust-tauri-v2-ipc');

  const renderOut = await tauriAdapter.renderPdfUnderlay({
    source: '\\documentclass{standalone}\\begin{document}ok\\end{document}',
    revision: 7,
    minXCm: 0,
    maxXCm: 6.2,
    minYCm: 0,
    maxYCm: 3.8,
    dpi: 144,
  });
  assert.equal(renderOut.ok, true);
  assert.equal(renderOut.engine, 'xelatex');

  const docReport = await tauriDoctorEnvironment<{ doctor: { exitCode: number } }>(mockTauriGlobal);
  assert.equal(docReport.doctor.exitCode, 0);

  const saved = await tauriSaveTexDocument(
    '\\documentclass{standalone}',
    null,
    'circuit_filter.tex',
    mockTauriGlobal
  );
  assert.ok(saved?.ok);
  assert.equal(saved?.path, '/tmp/circuit_filter.tex');

  let receivedExternalFilename = '';
  const unlisten = await subscribeTauriExternalFileChanges((ev) => {
    receivedExternalFilename = ev.filename;
  }, mockTauriGlobal);

  assert.ok(callbackBox.fn, 'Callback must be registered with transformCallback');
  callbackBox.fn({
    payload: {
      filename: 'circuit_filter.tex',
      path: '/tmp/circuit_filter.tex',
      diskSource: '% updated externally',
      externalEditor: 'Neovim',
    },
  });
  assert.equal(receivedExternalFilename, 'circuit_filter.tex');

  unlisten();
  assert.ok(calls.some((c) => c.cmd === 'plugin:event|unlisten'));
});
