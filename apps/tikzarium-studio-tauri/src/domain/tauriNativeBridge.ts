/**
 * Двухрежимный IPC-мост Tauri v2 + Rust <-> Web Preview (`MOD-18` / `ARCH-STACK`).
 *
 * - Внутри нативного десктопного окна Tauri v2 (`window.__TAURI_INTERNALS__`) все вызовы
 *   (`tz_render_pdf_underlay`, `tz_doctor_environment`, `tz_open_document`, `tz_save_document`,
 *   `tz_cancel_active_build`, `tz_render_manual_page`, `tz_resolve_manual_token`) идут напрямую
 *   в Rust (`crates/tikzarium-core` + `crates/tikzarium-extensions`) по IPC без HTTP-портов и без Node.js.
 * - В браузерном стенде автоматически используется прозрачный HTTP-адаптер Express + Ghostscript/XeLaTeX.
 */

import {
  applyCheckedSourcePatch,
  createBrowserEngineAdapter,
} from './sourcePatchEngine';
import type {
  EngineAdapter,
  PdfUnderlayRenderRequest,
  PdfUnderlayRenderResponse,
} from './sourcePatchEngine';
import { computeHexDigest } from './tikzEngine';

export interface TauriInternalsBridge {
  invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
  transformCallback?: (callback: (payload: unknown) => void, once?: boolean) => number;
}

export interface TauriRuntimeInfo {
  runtime: string;
  tauriVersion: string;
  os: string;
  arch: string;
  xelatexPresent: boolean;
  xelatexVersion: string | null;
  pdftoppmPresent: boolean;
  kpsewhichPresent: boolean;
}

export interface TauriOpenedDocument {
  path: string;
  filename: string;
  source: string;
  classDeclared: boolean;
  lineEnding: 'CRLF' | 'LF';
}

export interface TauriSavedDocument {
  ok: boolean;
  path: string;
  dirty: boolean;
  sha256Short: string;
}

export interface TauriManualPageRaster {
  ok: boolean;
  filename: string;
  page: number;
  resolvedPdfPath: string | null;
  pngDataUrl: string | null;
  errorRu?: string | null;
}

export interface TauriIpcCommandSpec {
  command: string;
  rustHandler: string;
  upstreamCrateBinding: string;
  purposeRu: string;
  securityInvariantRu: string;
}

export const TAURI_V2_IPC_CATALOG: readonly TauriIpcCommandSpec[] = [
  {
    command: 'tz_runtime_info',
    rustHandler: 'commands::tz_runtime_info',
    upstreamCrateBinding: 'tikzarium_core::TexEnvironment::discover()',
    purposeRu: 'Паспорт десктопной платформы ОС (Windows 10 WebView2 / Linux WebKitGTK) и сводка TeX.',
    securityInvariantRu: 'Только чтение переменных окружения и PATH без запуска пакетных менеджеров.',
  },
  {
    command: 'tz_render_pdf_underlay',
    rustHandler: 'commands::tz_render_pdf_underlay',
    upstreamCrateBinding: 'tikzarium_core::BuildService::run + pdftoppm',
    purposeRu: 'Живая компиляция .tex в калиброванную PDF-кальку 1:1 (144 DPI PNG + PDF байты) с LRU-кэшем SHA-256.',
    securityInvariantRu: 'Строгий -no-shell-escape, запрет автоустановки MiKTeX и проверка привилегий дочернего процесса.',
  },
  {
    command: 'tz_cancel_active_build',
    rustHandler: 'commands::tz_cancel_active_build',
    upstreamCrateBinding: 'tikzarium_core::BuildService::cancel()',
    purposeRu: 'Мгновенная атомарная остановка зависшего процесса XeLaTeX без повреждения исходника.',
    securityInvariantRu: 'Атомарный флаг AtomicBool::store(true, SeqCst) + принудительное завершение временного процесса.',
  },
  {
    command: 'tz_doctor_environment',
    rustHandler: 'commands::tz_doctor_environment',
    upstreamCrateBinding: 'TexEnvironment::discover() + probe_package()',
    purposeRu: 'Read-only диагностика xelatex, kpsewhich/findtexmf, pdftoppm и 7 базовых пакетов TeX.',
    securityInvariantRu: 'Никогда не передаёт --must-exist в MiKTeX findtexmf и не вызывает скрытую докачку из сети.',
  },
  {
    command: 'tz_open_document',
    rustHandler: 'commands::tz_open_document',
    upstreamCrateBinding: 'tikzarium_core::Document::load + notify::RecommendedWatcher',
    purposeRu: 'Открытие локального .tex с диска с сохранением CRLF/LF и подпиской на внешние изменения.',
    securityInvariantRu: 'Побайтовое чтение UTF-8 и push-событие tz://external-file-change при записи из VS Code / Neovim.',
  },
  {
    command: 'tz_save_document',
    rustHandler: 'commands::tz_save_document',
    upstreamCrateBinding: 'tikzarium_core::Document::save_to',
    purposeRu: 'Безопасное сохранение .tex на диск без разрушения симлинков и с проверкой внешних правок.',
    securityInvariantRu: 'Отклоняет перезапись файла, если другой редактор изменил его на диске после открытия.',
  },
  {
    command: 'tz_apply_checked_patch',
    rustHandler: 'commands::tz_apply_checked_patch',
    upstreamCrateBinding: 'patch_engine::apply_checked_source_patch',
    purposeRu: 'Детерминированный SourcePatch по диапазону UTF-16 с генерацией inversePatch для Undo.',
    securityInvariantRu: 'Сохраняет CRLF/LF, кириллицу и отклоняет патчи с устаревшим SHA-256 дайджестом.',
  },
  {
    command: 'tz_render_manual_page',
    rustHandler: 'commands::tz_render_manual_page',
    upstreamCrateBinding: 'kpsewhich + pdftoppm -f page -l page',
    purposeRu: 'Точечная растеризация ровно одной страницы локального PDF-мануала (pgfmanual, circuitikz, pgfplots).',
    securityInvariantRu: 'Соблюдает AGENTS.md п.5 (без коммита 50 МБ PDF в Git) и блокирует path traversal в имени файла.',
  },
  {
    command: 'tz_resolve_manual_token',
    rustHandler: 'commands::tz_resolve_manual_token',
    upstreamCrateBinding: 'tikzarium_extensions::manual_anchors::ManualAnchorCatalog',
    purposeRu: 'Мгновенное разрешение команды LaTeX/TikZ в секцию, NamedDest и нормализованный bbox [0..1].',
    securityInvariantRu: 'Статический встроенный TOML-реестр с ограничением длины поискового запроса 256 байт.',
  },
] as const;

function resolveGlobalTauriInternals(
  explicitGlobal?: Record<string, unknown>
): TauriInternalsBridge | null {
  const root =
    explicitGlobal ??
    (typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>) : undefined);
  if (!root) return null;
  const internals = root.__TAURI_INTERNALS__ as Partial<TauriInternalsBridge> | undefined;
  if (internals && typeof internals.invoke === 'function') {
    return internals as TauriInternalsBridge;
  }
  return null;
}

export function isTauriRuntime(explicitGlobal?: Record<string, unknown>): boolean {
  return resolveGlobalTauriInternals(explicitGlobal) !== null;
}

export async function invokeTauriCommand<T>(
  cmd: string,
  args?: Record<string, unknown>,
  explicitGlobal?: Record<string, unknown>
): Promise<T> {
  const bridge = resolveGlobalTauriInternals(explicitGlobal);
  if (!bridge) {
    throw new Error(`Команда Tauri IPC '${cmd}' вызвана вне нативного окна Tauri v2.`);
  }
  return bridge.invoke<T>(cmd, args);
}

export function createAdaptiveEngineAdapter(
  apiBaseUrl = '',
  explicitGlobal?: Record<string, unknown>
): EngineAdapter {
  if (!isTauriRuntime(explicitGlobal)) {
    return createBrowserEngineAdapter(apiBaseUrl);
  }

  return {
    adapterId: 'rust-tauri-v2-ipc',
    applyPatch(source, patch, expectedDigest) {
      return applyCheckedSourcePatch(source, patch, expectedDigest);
    },
    async renderPdfUnderlay(req: PdfUnderlayRenderRequest): Promise<PdfUnderlayRenderResponse> {
      try {
        return await invokeTauriCommand<PdfUnderlayRenderResponse>(
          'tz_render_pdf_underlay',
          { req },
          explicitGlobal
        );
      } catch (err) {
        return {
          ok: false,
          revision: req.revision,
          sourceDigest: computeHexDigest(req.source),
          engine: 'svg-vector-fallback',
          engineLabelRu: 'Ошибка IPC-вызова tz_render_pdf_underlay (Tauri v2)',
          pngDataUrl: null,
          pdfBase64: null,
          pageWidthPt: 0,
          pageHeightPt: 0,
          renderMs: 0,
          objectsRendered: 0,
          hitboxes: [],
          errorRu: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}

export async function tauriCancelActiveBuild(
  explicitGlobal?: Record<string, unknown>
): Promise<boolean> {
  if (!isTauriRuntime(explicitGlobal)) return false;
  return invokeTauriCommand<boolean>('tz_cancel_active_build', {}, explicitGlobal);
}

export async function tauriDoctorEnvironment<T = unknown>(
  explicitGlobal?: Record<string, unknown>
): Promise<T> {
  return invokeTauriCommand<T>('tz_doctor_environment', {}, explicitGlobal);
}

export async function tauriPickAndOpenTexFile(
  explicitGlobal?: Record<string, unknown>
): Promise<TauriOpenedDocument | null> {
  const selected = await invokeTauriCommand<string | string[] | null>(
    'plugin:dialog|open',
    {
      options: {
        multiple: false,
        directory: false,
        title: 'Открыть рисунок LaTeX / TikZ (.tex)',
        filters: [{ name: 'Документы LaTeX / TikZ', extensions: ['tex', 'tikz'] }],
      },
    },
    explicitGlobal
  );
  const pickedPath = Array.isArray(selected) ? selected[0] : selected;
  if (!pickedPath || typeof pickedPath !== 'string') return null;
  return invokeTauriCommand<TauriOpenedDocument>(
    'tz_open_document',
    { path: pickedPath },
    explicitGlobal
  );
}

export async function tauriSaveTexDocument(
  source: string,
  existingPath: string | null,
  defaultFilename: string,
  explicitGlobal?: Record<string, unknown>
): Promise<TauriSavedDocument | null> {
  let targetPath = existingPath;
  if (!targetPath) {
    const picked = await invokeTauriCommand<string | null>(
      'plugin:dialog|save',
      {
        options: {
          defaultPath: defaultFilename,
          title: 'Сохранить рисунок LaTeX / TikZ (.tex)',
          filters: [{ name: 'Документы LaTeX / TikZ', extensions: ['tex', 'tikz'] }],
        },
      },
      explicitGlobal
    );
    if (!picked) return null;
    targetPath = picked;
  }
  return invokeTauriCommand<TauriSavedDocument>(
    'tz_save_document',
    { path: targetPath, source },
    explicitGlobal
  );
}

export async function tauriRenderLocalManualPage(
  filename: string,
  page: number,
  explicitGlobal?: Record<string, unknown>
): Promise<TauriManualPageRaster | null> {
  if (!isTauriRuntime(explicitGlobal)) return null;
  return invokeTauriCommand<TauriManualPageRaster>(
    'tz_render_manual_page',
    { filename, page },
    explicitGlobal
  );
}

export async function subscribeTauriExternalFileChanges(
  onExternalChange: (payload: {
    filename: string;
    path: string;
    diskSource: string;
    externalEditor: string;
  }) => void,
  explicitGlobal?: Record<string, unknown>
): Promise<() => void> {
  const bridge = resolveGlobalTauriInternals(explicitGlobal);
  if (!bridge || typeof bridge.transformCallback !== 'function') {
    return () => {};
  }

  const handlerId = bridge.transformCallback((rawEvent: unknown) => {
    const wrapper = rawEvent as { payload?: Record<string, unknown> } | null;
    const p = wrapper?.payload;
    if (p && typeof p.filename === 'string' && typeof p.diskSource === 'string') {
      onExternalChange({
        filename: p.filename,
        path: typeof p.path === 'string' ? p.path : p.filename,
        diskSource: p.diskSource,
        externalEditor:
          typeof p.externalEditor === 'string'
            ? p.externalEditor
            : 'Внешний редактор ОС (Tauri v2 notify)',
      });
    }
  });

  const eventId = await bridge.invoke<number>('plugin:event|listen', {
    event: 'tz://external-file-change',
    target: { kind: 'Any' },
    handler: handlerId,
  });

  return () => {
    void bridge.invoke('plugin:event|unlisten', {
      event: 'tz://external-file-change',
      eventId,
    });
  };
}
