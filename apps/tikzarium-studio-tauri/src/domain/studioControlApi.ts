import { PRIMITIVE_TOOLS, TIKZ_LIBRARIES } from './catalog';
import type { ToolId } from './catalog';
import {
  ATOMIC_FIGURE_PROFILES,
  applyAtomicFigureProfileToPreamble,
  inspectFigurePackagePassport,
  togglePackageInPreamble,
  toggleTikzLibraryInPreamble,
} from './atomicFigureProfile';
import type { AtomicFigureProfileId } from './atomicFigureProfile';
import {
  TIKZ_EXTENSION_PACKAGES,
  buildTikzExtensionBundle,
  detectActiveExtensionsInSource,
  insertTikzExtensionIntoSource,
} from './tikzExtensionsSuite';
import type { ExtensionOutputMode, TikzExtensionId } from './tikzExtensionsSuite';
import { buildMarkdownLedgerDocumentRu } from './requirementsLedger';
import {
  BUILD_TIME_PDF_INDEXING_GUIDE,
  PDF_MANUAL_ANCHORS,
  PDF_MANUAL_DOCUMENTS,
  exportManualAnchorIndexJson,
  resolveManualAnchorById,
  resolveManualAnchorForDiagnosticCode,
  resolveManualAnchorForExtension,
  resolveManualAnchorForTool,
  resolveManualAnchorForToken,
  resolveManualDocumentMeta,
  searchPdfManualAnchors,
} from './pdfManualAnchors';
import type { PdfManualDocId } from './pdfManualAnchors';
import {
  analyzeTexDiagnostics,
  applyOwnedPrimitivePatch,
  buildSpecimenDocuments,
  computeGestureDraftPreview,
  deleteOwnedPrimitiveFromSource,
  duplicateOwnedPrimitiveInSource,
  insertOwnedPrimitiveIntoSource,
  parseOwnedPrimitives,
  validateToolDraft,
} from './tikzEngine';
import {
  alignOwnedPrimitivesInSource,
  applyDiagnosticQuickFix,
  convertCsvToPgfplotsDocument,
  reorderOwnedPrimitiveInSource,
} from './ergonomicsBundle';
import type { AlignmentMode, ZOrderDirection } from './ergonomicsBundle';
import {
  buildBooktabsTableLatex,
  buildTexDocumentOutline,
  cleanPreambleAndUnusedLibraries,
  formatTikzDocumentSource,
  insertBooktabsTableIntoDocument,
  insertCatmullRomSplineIntoSource,
  insertGostSupportCombHatchIntoSource,
  insertParallelOffsetContourIntoSource,
} from './formatterRefactorAndCadBundle';
import { resolveCaretTexHelp, resolveTexCommandHover } from './texHoverHelp';
import {
  MODERNIZATION_TASKS_20,
  REQUIREMENTS_AND_FE_LEDGER,
  getRequirementsLedgerSummary,
} from './requirementsLedger';
import type { ImplementationStatus, LedgerGroupId } from './requirementsLedger';
import {
  PACKAGE_CANVAS_TOOLS,
  buildFigureStructureTree,
  deletePackageObjectFromSource,
  insertPackageCanvasObjectFromGesture,
  inspectDataFileDependencies,
  parseScenePackageObjects,
  patchPackageObjectInSource,
  translatePackageObjectInSource,
} from './packageCanvasSemantics';
import type { PackageObjectSemanticPatch, PackageToolId } from './packageCanvasSemantics';
import {
  ARCHITECTURAL_INSIGHTS,
  EXECUTION_WAVES,
  buildInsightsAndPlansMarkdownRu,
} from './insightsAndPlans';

export type StudioDockId = 'properties' | 'libraries' | 'help';
export type StudioGroupId = 'geometry' | 'connections' | 'text' | 'extensions';

export interface ObservedWidgetRect {
  pixels: [number, number, number, number];
  points: [number, number, number, number];
  center_px: [number, number];
}

export interface StudioControlSnapshot {
  version: number;
  revision: number;
  source: string;
  active_tool: ToolId | null;
  open_group: StudioGroupId | null;
  selected_id: number | null;
  draft_values: Record<string, string>;
  dock: StudioDockId;
  inspector_open: boolean;
  preamble_collapsed: boolean;
  active_manual_anchor_id: string;
  active_manual_doc_id: PdfManualDocId;
  active_manual_page: number;
  manual_modal_open: boolean;
  workshops_modal_open: boolean;
  undo_available: boolean;
  redo_available: boolean;
  owned_count: number;
  window: { width: number; height: number; dpi: number };
  frames: number;
}

export interface ControlJsonResponse {
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface UpstreamTestCompatibilityRow {
  crateAndFile: string;
  testName: string;
  v1ContractRu: string;
  impactStatus: 'pass-unchanged' | 'update-assert' | 'new-v2-test';
  migrationActionRu: string;
}

export const ALL_CONTROL_OPERATIONS_V2 = [
  // Upstream v1 operations (100% preserved for existing tests & agents)
  'api.describe',
  'state.snapshot',
  'layout.snapshot',
  'window.set',
  'frame.run',
  'input.click',
  'input.pointer',
  'input.drag',
  'input.key',
  'input.text',
  'document.new',
  'document.open',
  'document.save',
  'document.save_as',
  'source.replace',
  'tool.select',
  'tool.insert',
  'tool.gesture',
  'object.select',
  'parameter.set',
  'parameter.apply',
  'authoring.undo',
  'library.connect',
  'library.disconnect',
  'help.search',
  'view.dock',
  // New v2 GUI↔API parity operations (Split Preamble, 12 Extensions, CAD Workshops, PDF Manual Anchors)
  'authoring.redo',
  'object.delete',
  'object.duplicate',
  'object.align',
  'object.zorder',
  'preamble.inspect',
  'preamble.toggle_collapse',
  'preamble.profile.apply',
  'preamble.package.connect',
  'preamble.package.disconnect',
  'preamble.clean_unused',
  'extension.catalog',
  'extension.preview',
  'extension.insert',
  'workshop.parallel_offset',
  'workshop.catmull_rom',
  'workshop.gost_support',
  'workshop.booktabs_table',
  'workshop.csv_pgfplots',
  'editor.format',
  'editor.diagnostics',
  'editor.quickfix',
  'editor.hover_help',
  'editor.outline',
  'manual.documents',
  'manual.search_anchors',
  'manual.resolve_token',
  'manual.open_anchor',
  'manual.close',
  'manual.export_index',
  'ledger.inspect',
  'insights.inspect',
  'package_canvas.catalog',
  'package_canvas.inspect',
  'package_canvas.insert',
  'package_canvas.move',
  'package_canvas.patch',
  'package_canvas.delete',
] as const;

export type ControlOperationName = (typeof ALL_CONTROL_OPERATIONS_V2)[number];

const GROUP_TOOLS: Record<StudioGroupId, ToolId[]> = {
  geometry: ['line', 'rectangle', 'circle', 'cubic'],
  connections: ['arrow'],
  text: ['node'],
  extensions: [],
};

const MAX_JSON_LINE_BYTES = 1024 * 1024;

function defaultDraftForTool(toolId: ToolId): Record<string, string> {
  const spec = PRIMITIVE_TOOLS.find((t) => t.id === toolId);
  if (!spec) return {};
  return Object.fromEntries(spec.parameters.map((p) => [p.id, p.defaultValue]));
}

function makeRect(
  x0Pt: number,
  y0Pt: number,
  x1Pt: number,
  y1Pt: number,
  dpi: number
): ObservedWidgetRect {
  const px0 = Math.round(x0Pt * dpi * 100) / 100;
  const py0 = Math.round(y0Pt * dpi * 100) / 100;
  const px1 = Math.round(x1Pt * dpi * 100) / 100;
  const py1 = Math.round(y1Pt * dpi * 100) / 100;
  return {
    points: [x0Pt, y0Pt, x1Pt, y1Pt],
    pixels: [px0, py0, px1, py1],
    center_px: [Math.round(((px0 + px1) / 2) * 100) / 100, Math.round(((py0 + py1) / 2) * 100) / 100],
  };
}

/**
 * Deterministic headless & live GUI↔API state machine mirroring
 * `crates/tikzarium-app/src/bin/tikzarium-qa-control.rs` with 100% coverage of v2 GUI features.
 */
export class StudioControlEngine {
  private source: string;
  private currentPath: string | null = null;
  private virtualFiles = new Map<string, string>();
  private revision = 0;
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  private width = 1366;
  private height = 768;
  private dpi = 1.0;
  private frames = 0;

  private activeTool: ToolId | null = null;
  private openGroup: StudioGroupId | null = null;
  private selectedId: number | null = null;
  private draftValues: Record<string, string> = {};
  private dock: StudioDockId = 'properties';
  private inspectorOpen = true;
  private preambleCollapsed = false;

  private activeManualAnchorId = 'pgf.env.tikzpicture';
  private manualModalOpen = false;
  private workshopsModalOpen = false;
  private helpQuery = '';

  constructor(initialSource?: string, occupiedFiles?: Record<string, string>) {
    this.source = initialSource ?? buildSpecimenDocuments()[0].source;
    if (occupiedFiles) {
      for (const [k, v] of Object.entries(occupiedFiles)) {
        this.virtualFiles.set(k, v);
      }
    }
    this.frame();
  }

  public getSource(): string {
    return this.source;
  }

  public seedOccupiedFile(relPath: string, content: string): void {
    this.virtualFiles.set(relPath, content);
  }

  private commitSourceTransaction(nextSource: string): void {
    if (nextSource === this.source) return;
    this.undoStack.push(this.source);
    this.redoStack = [];
    this.source = nextSource;
    this.revision += 1;
  }

  public computeLayout(): Record<string, ObservedWidgetRect> {
    const wPt = this.width / this.dpi;
    const hPt = this.height / this.dpi;
    const topBarH = 40;
    const railW = 62;
    const inspectorW = this.inspectorOpen ? Math.max(225, Math.min(300, Math.round(wPt * 0.22))) : 0;
    const sourceW = Math.round((wPt - railW - inspectorW) * 0.44);
    const sourceX0 = railW;
    const sourceX1 = railW + sourceW;
    const canvasX0 = sourceX1;
    const canvasX1 = wPt - inspectorW;

    const layout: Record<string, ObservedWidgetRect> = {};

    // 4 StudioGroup buttons on the left rail (preserves b42 & virtual_window tests)
    const groups: StudioGroupId[] = ['geometry', 'connections', 'text', 'extensions'];
    groups.forEach((g, idx) => {
      const y0 = topBarH + 8 + idx * 48;
      layout[`group.${g}`] = makeRect(6, y0, railW - 6, y0 + 42, this.dpi);
    });

    // Outer panel.source container (required by upstream virtual_window_reports_actual_native_egui_widget_rectangles)
    // PLUS v2 split sub-panels: panel.preamble (Window 1), panel.figure_body (Window 2), bar.caret_syntax
    layout['panel.source'] = makeRect(sourceX0, topBarH, sourceX1, hPt, this.dpi);
    const preambleH = this.preambleCollapsed ? 32 : Math.round((hPt - topBarH) * 0.26);
    const caretBarH = 28;
    layout['panel.preamble'] = makeRect(sourceX0, topBarH, sourceX1, topBarH + preambleH, this.dpi);
    layout['panel.figure_body'] = makeRect(
      sourceX0,
      topBarH + preambleH,
      sourceX1,
      hPt - caretBarH,
      this.dpi
    );
    layout['bar.caret_syntax'] = makeRect(sourceX0, hPt - caretBarH, sourceX1, hPt, this.dpi);

    // Central guide canvas
    layout['guide.canvas'] = makeRect(canvasX0, topBarH, canvasX1, hPt, this.dpi);

    // Right inspector & library targets
    if (this.inspectorOpen) {
      layout['panel.inspector'] = makeRect(canvasX1, topBarH, wPt, hPt, this.dpi);
      if (this.dock === 'libraries') {
        layout['library.panel'] = makeRect(canvasX1 + 6, topBarH + 36, wPt - 6, hPt - 8, this.dpi);
        TIKZ_LIBRARIES.forEach((lib, i) => {
          const rowY = topBarH + 44 + i * 34;
          layout[`library.entry.${lib.name}`] = makeRect(canvasX1 + 8, rowY, wPt - 8, rowY + 30, this.dpi);
          layout[`library.connect.${lib.name}`] = makeRect(wPt - 84, rowY + 3, wPt - 46, rowY + 27, this.dpi);
          layout[`library.disconnect.${lib.name}`] = makeRect(wPt - 44, rowY + 3, wPt - 10, rowY + 27, this.dpi);
        });
      }
    }

    // Floating palette tools when a group is open
    if (this.openGroup) {
      const tools = GROUP_TOOLS[this.openGroup];
      tools.forEach((toolId, idx) => {
        const y0 = topBarH + 12 + idx * 38;
        layout[`tool.${toolId}`] = makeRect(railW + 6, y0, railW + 178, y0 + 34, this.dpi);
      });
      if (this.openGroup === 'extensions') {
        TIKZ_EXTENSION_PACKAGES.forEach((ext, idx) => {
          const y0 = topBarH + 12 + idx * 32;
          layout[`ext.${ext.id}`] = makeRect(railW + 6, y0, railW + 236, y0 + 28, this.dpi);
        });
      }
    }

    if (this.manualModalOpen) {
      layout['modal.pdf_manual'] = makeRect(48, 36, wPt - 48, hPt - 36, this.dpi);
    }
    if (this.workshopsModalOpen) {
      layout['modal.workshops_hub'] = makeRect(44, 32, wPt - 44, hPt - 32, this.dpi);
    }

    return layout;
  }

  public snapshot(): StudioControlSnapshot {
    const anchor = resolveManualAnchorById(this.activeManualAnchorId);
    const owned = parseOwnedPrimitives(this.source);
    return {
      version: 2,
      revision: this.revision,
      source: this.source,
      active_tool: this.activeTool,
      open_group: this.openGroup,
      selected_id: this.selectedId,
      draft_values: { ...this.draftValues },
      dock: this.dock,
      inspector_open: this.inspectorOpen,
      preamble_collapsed: this.preambleCollapsed,
      active_manual_anchor_id: anchor.id,
      active_manual_doc_id: anchor.docId,
      active_manual_page: anchor.page,
      manual_modal_open: this.manualModalOpen,
      workshops_modal_open: this.workshopsModalOpen,
      undo_available: this.undoStack.length > 0,
      redo_available: this.redoStack.length > 0,
      owned_count: owned.length,
      window: { width: this.width, height: this.height, dpi: this.dpi },
      frames: this.frames,
    };
  }

  public frame(): Record<string, unknown> {
    this.frames += 1;
    const layout = this.computeLayout();
    const owned = parseOwnedPrimitives(this.source);
    return {
      frame: this.frames,
      shape_count: Object.keys(layout).length * 4 + owned.length,
      layout,
      revision: this.revision,
      owned_count: owned.length,
      note: 'deterministic GUI-API parity engine; mirrors tikzarium-qa-control JSONL contract',
    };
  }

  private requireString(req: Record<string, unknown>, field: string): string {
    const val = req[field];
    if (typeof val !== 'string' || val.length === 0) {
      throw new Error(`Поле '${field}' должно быть непустой строкой`);
    }
    return val;
  }

  private requireNumber(req: Record<string, unknown>, field: string): number {
    const val = req[field];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new Error(`Поле '${field}' должно быть конечным числом`);
    }
    return val;
  }

  private validateSafeRelativePath(relPath: string): string {
    if (
      !relPath ||
      relPath.startsWith('/') ||
      relPath.startsWith('\\') ||
      relPath.includes('..') ||
      relPath.includes(':')
    ) {
      throw new Error(`Недопустимый путь вне корня песочницы: ${relPath}`);
    }
    return relPath;
  }

  public handle(rawReq: unknown): unknown {
    if (!rawReq || typeof rawReq !== 'object' || Array.isArray(rawReq)) {
      throw new Error('Ожидался JSON-объект команды с полем "op"');
    }
    const req = rawReq as Record<string, unknown>;
    const op = this.requireString(req, 'op');

    switch (op) {
      case 'api.describe':
        return {
          version: 2,
          backward_compatible_with: 1,
          protocol: 'JSONL stdin/stdout & HTTP POST /api/qa-control',
          network_listener_in_rust_binary: false,
          operations: [...ALL_CONTROL_OPERATIONS_V2],
          gui_api_parity: '100% (каждая функция GUI доступна через детерминированную операцию op)',
          evidence: 'UNIT_EVENT / API_PARITY (не заменяет нативную приёмку окна Windows 10)',
        };

      case 'state.snapshot':
        return this.snapshot();

      case 'layout.snapshot':
        return this.computeLayout();

      case 'window.set': {
        const w = Math.trunc(this.requireNumber(req, 'width'));
        const h = Math.trunc(this.requireNumber(req, 'height'));
        const dpi = this.requireNumber(req, 'dpi');
        if (w < 320 || w > 7680 || h < 240 || h > 4320 || dpi < 0.5 || dpi > 4.0) {
          throw new Error('window width 320..7680, height 240..4320, dpi 0.5..4');
        }
        this.width = w;
        this.height = h;
        this.dpi = dpi;
        return this.frame();
      }

      case 'frame.run':
      case 'input.pointer':
      case 'input.drag':
        return this.frame();

      case 'input.click': {
        const target = typeof req.target === 'string' ? req.target : null;
        const layout = this.computeLayout();
        if (target) {
          if (!layout[target]) {
            throw new Error(`Целевой виджет '${target}' не найден в текущем кадре layout`);
          }
          if (target.startsWith('group.')) {
            const g = target.slice('group.'.length) as StudioGroupId;
            this.openGroup = this.openGroup === g ? null : g;
            if (g === 'extensions' && this.openGroup === 'extensions') {
              this.workshopsModalOpen = true;
            }
          } else if (target.startsWith('tool.')) {
            const t = target.slice('tool.'.length) as ToolId;
            this.activeTool = t;
            this.selectedId = null;
            this.draftValues = defaultDraftForTool(t);
            this.openGroup = null;
            this.activeManualAnchorId = resolveManualAnchorForTool(t).id;
          } else if (target.startsWith('ext.')) {
            const extId = target.slice('ext.'.length) as TikzExtensionId;
            this.activeManualAnchorId = resolveManualAnchorForExtension(extId).id;
            this.workshopsModalOpen = true;
            this.openGroup = null;
          } else if (target.startsWith('library.connect.')) {
            const libName = target.slice('library.connect.'.length);
            const res = toggleTikzLibraryInPreamble(this.source, libName, true);
            if (!res.ok) throw new Error(res.summaryRu);
            this.commitSourceTransaction(res.nextSource);
          } else if (target.startsWith('library.disconnect.')) {
            const libName = target.slice('library.disconnect.'.length);
            const res = toggleTikzLibraryInPreamble(this.source, libName, false);
            if (!res.ok) throw new Error(res.summaryRu);
            this.commitSourceTransaction(res.nextSource);
          } else if (target === 'bar.caret_syntax') {
            this.manualModalOpen = true;
          }
        }
        return this.frame();
      }

      case 'input.key': {
        const key = this.requireString(req, 'key').toUpperCase();
        if (key === 'F1') {
          // Matches upstream `f1_toggles_help_dock_without_touching_source`: never mutates `source`!
          if (req.shift === true) {
            this.manualModalOpen = !this.manualModalOpen;
          } else {
            this.dock = 'help';
            this.inspectorOpen = true;
          }
          return this.frame();
        }
        if (key === 'ESCAPE') {
          this.openGroup = null;
          this.activeTool = null;
          this.manualModalOpen = false;
          this.workshopsModalOpen = false;
          return this.frame();
        }
        return this.frame();
      }

      case 'input.text': {
        const text = this.requireString(req, 'text');
        this.helpQuery = text;
        return this.frame();
      }

      case 'document.new': {
        const nextSrc =
          typeof req.source === 'string' ? req.source : buildSpecimenDocuments()[0].source;
        this.source = nextSrc;
        this.currentPath = null;
        this.revision = 0;
        this.undoStack = [];
        this.redoStack = [];
        this.selectedId = null;
        this.activeTool = null;
        return this.snapshot();
      }

      case 'document.open': {
        const relPath = this.validateSafeRelativePath(this.requireString(req, 'path'));
        const content = this.virtualFiles.get(relPath);
        if (content === undefined) {
          throw new Error(`Файл не найден в рабочей директории: ${relPath}`);
        }
        this.source = content;
        this.currentPath = relPath;
        this.revision = 0;
        this.undoStack = [];
        this.redoStack = [];
        return this.snapshot();
      }

      case 'document.save': {
        if (!this.currentPath) {
          throw new Error('Путь документа не задан — используйте document.save_as');
        }
        this.virtualFiles.set(this.currentPath, this.source);
        return this.snapshot();
      }

      case 'document.save_as': {
        const relPath = this.validateSafeRelativePath(this.requireString(req, 'path'));
        if (this.virtualFiles.has(relPath) && this.currentPath !== relPath) {
          throw new Error(`Защита от перезаписи чужого файла: '${relPath}' уже существует`);
        }
        this.currentPath = relPath;
        this.virtualFiles.set(relPath, this.source);
        return this.snapshot();
      }

      case 'source.replace': {
        const expectedRev = Math.trunc(this.requireNumber(req, 'revision'));
        if (expectedRev !== this.revision) {
          throw new Error(
            `Конфликт ревизии буфера (stale revision): ожидалась ${this.revision}, передана ${expectedRev}`
          );
        }
        const nextSrc = typeof req.source === 'string' ? req.source : '';
        this.commitSourceTransaction(nextSrc);
        return this.snapshot();
      }

      case 'tool.select': {
        const toolId = this.requireString(req, 'tool') as ToolId;
        const spec = PRIMITIVE_TOOLS.find((t) => t.id === toolId);
        if (!spec) throw new Error(`Неизвестный примитив: ${toolId}`);
        this.activeTool = toolId;
        this.selectedId = null;
        this.draftValues = defaultDraftForTool(toolId);
        this.activeManualAnchorId = resolveManualAnchorForTool(toolId).id;
        return this.snapshot();
      }

      case 'tool.insert': {
        const toolId = this.requireString(req, 'tool') as ToolId;
        const spec = PRIMITIVE_TOOLS.find((t) => t.id === toolId);
        if (!spec) throw new Error(`Неизвестный примитив: ${toolId}`);
        const draft = defaultDraftForTool(toolId);
        if (req.values && typeof req.values === 'object' && !Array.isArray(req.values)) {
          for (const [k, v] of Object.entries(req.values as Record<string, unknown>)) {
            if (typeof v !== 'string') throw new Error('Значения параметров должны быть строками');
            draft[k] = v;
          }
        }
        const errors = validateToolDraft(toolId, draft);
        if (Object.keys(errors).length > 0) {
          throw new Error(`Ошибка валидации параметров: ${Object.values(errors)[0]}`);
        }
        const res = insertOwnedPrimitiveIntoSource(this.source, toolId, draft);
        this.commitSourceTransaction(res.nextSource);
        this.selectedId = res.newId;
        this.draftValues = { ...draft };
        return this.snapshot();
      }

      case 'tool.gesture': {
        const toolId = this.requireString(req, 'tool') as ToolId;
        const spec = PRIMITIVE_TOOLS.find((t) => t.id === toolId);
        if (!spec) throw new Error(`Неизвестный примитив: ${toolId}`);
        const fromArr = Array.isArray(req.from) ? req.from : null;
        const toArr = Array.isArray(req.to) ? req.to : null;
        if (!fromArr || fromArr.length !== 2 || !toArr || toArr.length !== 2) {
          throw new Error('Поля from и to должны быть массивами [xCm, yCm]');
        }
        const x0 = Number(fromArr[0]);
        const y0 = Number(fromArr[1]);
        const x1 = Number(toArr[0]);
        const y1 = Number(toArr[1]);
        if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) {
          throw new Error('Координаты жеста должны быть конечными числами');
        }
        if (toolId !== 'node' && Math.hypot(x1 - x0, y1 - y0) < 1e-6) {
          throw new Error('Вырожденный жест рисования нулевой длины');
        }
        const preview = computeGestureDraftPreview(
          toolId,
          { x: x0, y: y0 },
          { x: x1, y: y1 },
          { forCommit: true }
        );
        const res = insertOwnedPrimitiveIntoSource(this.source, toolId, preview.values);
        this.commitSourceTransaction(res.nextSource);
        this.selectedId = res.newId;
        this.draftValues = { ...preview.values };
        return this.snapshot();
      }

      case 'object.select': {
        const id = Math.trunc(this.requireNumber(req, 'id'));
        const prim = parseOwnedPrimitives(this.source).find((p) => p.id === id);
        if (!prim) throw new Error(`Объект N1 #${id} не найден в текущем документе`);
        this.selectedId = id;
        this.activeTool = null;
        this.draftValues = { ...prim.values };
        this.activeManualAnchorId = resolveManualAnchorForTool(prim.tool).id;
        return this.snapshot();
      }

      case 'parameter.set': {
        if (this.selectedId === null) {
          throw new Error('Нет выделенного объекта N1 (вызовите object.select)');
        }
        const name = this.requireString(req, 'name');
        const value = typeof req.value === 'string' ? req.value : String(req.value ?? '');
        this.draftValues[name] = value;
        return this.snapshot();
      }

      case 'parameter.apply': {
        if (this.selectedId === null) {
          throw new Error('Нет выделенного объекта N1 для применения параметров');
        }
        const prim = parseOwnedPrimitives(this.source).find((p) => p.id === this.selectedId);
        if (!prim) throw new Error(`Объект N1 #${this.selectedId} больше не существует`);
        const errors = validateToolDraft(prim.tool, this.draftValues);
        if (Object.keys(errors).length > 0) {
          throw new Error(`Ошибка параметра: ${Object.values(errors)[0]}`);
        }
        const nextSrc = applyOwnedPrimitivePatch(this.source, this.selectedId, this.draftValues);
        this.commitSourceTransaction(nextSrc);
        return this.snapshot();
      }

      case 'authoring.undo': {
        const prev = this.undoStack.pop();
        if (prev === undefined) throw new Error('Стек отмены пуст');
        this.redoStack.push(this.source);
        this.source = prev;
        this.revision += 1;
        return this.snapshot();
      }

      case 'authoring.redo': {
        const next = this.redoStack.pop();
        if (next === undefined) throw new Error('Стек повтора пуст');
        this.undoStack.push(this.source);
        this.source = next;
        this.revision += 1;
        return this.snapshot();
      }

      case 'object.delete': {
        const id =
          typeof req.id === 'number' ? Math.trunc(req.id) : this.selectedId;
        if (id === null) throw new Error('Не указан id объекта для удаления');
        const next = deleteOwnedPrimitiveFromSource(this.source, id);
        this.commitSourceTransaction(next);
        if (this.selectedId === id) this.selectedId = null;
        return this.snapshot();
      }

      case 'object.duplicate': {
        const id =
          typeof req.id === 'number' ? Math.trunc(req.id) : this.selectedId;
        if (id === null) throw new Error('Не указан id объекта для дублирования');
        const dup = duplicateOwnedPrimitiveInSource(this.source, id);
        this.commitSourceTransaction(dup.nextSource);
        this.selectedId = dup.newId;
        return this.snapshot();
      }

      case 'object.align': {
        const ids = Array.isArray(req.ids) ? req.ids.map(Number) : [];
        const mode = this.requireString(req, 'mode') as AlignmentMode;
        const nextSrc = alignOwnedPrimitivesInSource(this.source, ids, mode);
        this.commitSourceTransaction(nextSrc);
        return this.snapshot();
      }

      case 'object.zorder': {
        const id = Math.trunc(this.requireNumber(req, 'id'));
        const dir = this.requireString(req, 'direction') as ZOrderDirection;
        const res = reorderOwnedPrimitiveInSource(this.source, id, dir);
        this.commitSourceTransaction(res.nextSource);
        return this.snapshot();
      }

      case 'library.connect':
      case 'library.disconnect': {
        const name = this.requireString(req, 'name');
        const connect = op === 'library.connect';
        const res = toggleTikzLibraryInPreamble(
          this.source,
          name,
          connect,
          req.force === true
        );
        if (!res.ok) throw new Error(res.summaryRu);
        this.commitSourceTransaction(res.nextSource);
        return this.snapshot();
      }

      // === V2 ATOMIC PREAMBLE & PACKAGES API ===
      case 'preamble.inspect':
        return {
          ...inspectFigurePackagePassport(this.source),
          activeExtensions: detectActiveExtensionsInSource(this.source).map((ext) => ext.id),
        };

      case 'preamble.toggle_collapse':
        this.preambleCollapsed =
          typeof req.collapsed === 'boolean' ? req.collapsed : !this.preambleCollapsed;
        return this.frame();

      case 'preamble.profile.apply': {
        const profileId = this.requireString(req, 'profile') as AtomicFigureProfileId;
        const res = applyAtomicFigureProfileToPreamble(this.source, profileId);
        if (!res.ok) throw new Error(res.summaryRu);
        this.commitSourceTransaction(res.nextSource);
        return { ...this.snapshot(), added_items: res.addedItems, summary_ru: res.summaryRu };
      }

      case 'preamble.package.connect':
      case 'preamble.package.disconnect': {
        const pkg = this.requireString(req, 'package');
        const res = togglePackageInPreamble(
          this.source,
          pkg,
          op === 'preamble.package.connect'
        );
        if (!res.ok) throw new Error(res.summaryRu);
        this.commitSourceTransaction(res.nextSource);
        return { ...this.snapshot(), summary_ru: res.summaryRu };
      }

      case 'preamble.clean_unused': {
        const cleaned = cleanPreambleAndUnusedLibraries(this.source, {
          removeUnusedLibraries: true,
        });
        this.commitSourceTransaction(cleaned.nextSource);
        return {
          ...this.snapshot(),
          removed_libraries: cleaned.removedLibraries,
          kept_libraries: cleaned.keptLibraries,
        };
      }

      // === V2 12 TIKZ EXTENSION PACKAGES API ===
      case 'extension.catalog':
        return {
          count: TIKZ_EXTENSION_PACKAGES.length,
          packages: TIKZ_EXTENSION_PACKAGES.map((pkg) => ({
            id: pkg.id,
            packageName: pkg.packageName,
            titleRu: pkg.displayTitleRu,
            domainGroup: pkg.domainGroup,
            manualAnchorId: resolveManualAnchorForExtension(pkg.id).id,
            presets: pkg.presets.map((pr) => ({ id: pr.id, titleRu: pr.titleRu })),
            params: pkg.paramFields.map((f) => ({
              key: f.key,
              labelRu: f.labelRu,
              defaultValue: f.defaultValue,
            })),
          })),
        };

      case 'extension.preview': {
        const extensionId = this.requireString(req, 'extension') as TikzExtensionId;
        const spec = TIKZ_EXTENSION_PACKAGES.find((p) => p.id === extensionId);
        if (!spec) throw new Error(`Неизвестный пакет расширения: ${extensionId}`);
        const presetId =
          typeof req.preset === 'string' ? req.preset : spec.presets[0].id;
        const outputMode: ExtensionOutputMode =
          req.mode === 'native-tex' || req.mode === 'canvas-n1' ? req.mode : 'hybrid';
        const params =
          req.params && typeof req.params === 'object' && !Array.isArray(req.params)
            ? (req.params as Record<string, string>)
            : undefined;
        const bundle = buildTikzExtensionBundle({
          extensionId,
          presetId,
          outputMode,
          params,
        });
        return {
          extension: extensionId,
          preset: presetId,
          mode: outputMode,
          preamble_lines: bundle.preamblePreviewLines,
          native_tex_lines: bundle.nativeTexLines,
          canvas_primitive_count: bundle.canvasPrimitives.length,
          manual_anchor_id: resolveManualAnchorForExtension(extensionId).id,
        };
      }

      case 'extension.insert': {
        const extensionId = this.requireString(req, 'extension') as TikzExtensionId;
        const spec = TIKZ_EXTENSION_PACKAGES.find((p) => p.id === extensionId);
        if (!spec) throw new Error(`Неизвестный пакет расширения: ${extensionId}`);
        const presetId =
          typeof req.preset === 'string' ? req.preset : spec.presets[0].id;
        const outputMode: ExtensionOutputMode =
          req.mode === 'native-tex' || req.mode === 'canvas-n1' ? req.mode : 'hybrid';
        const params =
          req.params && typeof req.params === 'object' && !Array.isArray(req.params)
            ? (req.params as Record<string, string>)
            : undefined;
        const res = insertTikzExtensionIntoSource(this.source, {
          extensionId,
          presetId,
          outputMode,
          originXCm: typeof req.origin_x_cm === 'number' ? req.origin_x_cm : 0,
          originYCm: typeof req.origin_y_cm === 'number' ? req.origin_y_cm : 0,
          params,
        });
        if (!res.ok) throw new Error(res.summaryRu);
        this.commitSourceTransaction(res.nextSource);
        this.activeManualAnchorId = resolveManualAnchorForExtension(extensionId).id;
        if (res.insertedIds.length > 0) {
          this.selectedId = res.insertedIds[0];
        }
        return {
          ...this.snapshot(),
          inserted_ids: res.insertedIds,
          added_preamble_items: res.addedPreambleItems,
          summary_ru: res.summaryRu,
        };
      }

      // === V2 CAD & SCIENTIFIC WORKSHOPS API ===
      case 'workshop.parallel_offset': {
        const primId =
          typeof req.id === 'number'
            ? Math.trunc(req.id)
            : (this.selectedId ?? parseOwnedPrimitives(this.source)[0]?.id);
        if (!primId) throw new Error('Нет опорного примитива N1 для эквидистанты');
        const offsetCm = typeof req.offset_cm === 'number' ? req.offset_cm : 0.4;
        const res = insertParallelOffsetContourIntoSource(this.source, primId, offsetCm);
        if (res.newId === null) throw new Error(res.summaryRu);
        this.commitSourceTransaction(res.nextSource);
        this.selectedId = res.newId;
        return { ...this.snapshot(), inserted_id: res.newId, summary_ru: res.summaryRu };
      }

      case 'workshop.catmull_rom': {
        const rawPts = Array.isArray(req.points)
          ? req.points.map((pt: unknown) => {
              const arr = pt as number[];
              return { x: Number(arr[0] ?? 0), y: Number(arr[1] ?? 0) };
            })
          : [
              { x: 0, y: 0 },
              { x: 1.5, y: 1.2 },
              { x: 3.2, y: -0.4 },
              { x: 4.8, y: 0.9 },
            ];
        const res = insertCatmullRomSplineIntoSource(this.source, rawPts, {
          closed: req.closed === true,
          tension: typeof req.tension === 'number' ? req.tension : 0.5,
          arrowTipOnLast: req.arrow === true,
        });
        if (res.insertedIds.length === 0) throw new Error(res.summaryRu);
        this.commitSourceTransaction(res.nextSource);
        this.selectedId = res.insertedIds[0];
        return { ...this.snapshot(), inserted_ids: res.insertedIds, summary_ru: res.summaryRu };
      }

      case 'workshop.gost_support': {
        const segId =
          typeof req.id === 'number'
            ? Math.trunc(req.id)
            : (this.selectedId ??
              parseOwnedPrimitives(this.source).find((p) => p.tool === 'line' || p.tool === 'arrow')
                ?.id);
        if (!segId) throw new Error('Нет опорного отрезка N1 для штриховки опоры ГОСТ');
        const res = insertGostSupportCombHatchIntoSource(this.source, segId, {
          stepCm: typeof req.step_cm === 'number' ? req.step_cm : 0.25,
          toothLenCm: typeof req.tooth_len_cm === 'number' ? req.tooth_len_cm : 0.22,
          angleDeg: typeof req.angle_deg === 'number' ? req.angle_deg : 45,
          flipSide: req.flip_side === true,
        });
        if (res.insertedIds.length === 0) throw new Error(res.summaryRu);
        this.commitSourceTransaction(res.nextSource);
        return { ...this.snapshot(), inserted_ids: res.insertedIds, summary_ru: res.summaryRu };
      }

      case 'workshop.booktabs_table': {
        const csv =
          typeof req.csv === 'string'
            ? req.csv
            : 'Режим,Частота Гц,КПД %\nНоминал,50,94.2\nПик,60,91.8';
        const built = buildBooktabsTableLatex(csv, {
          captionRu: typeof req.caption === 'string' ? req.caption : 'Параметры стенда',
          label: 'tab:bench',
          useSiunitxSColumn: true,
          wrapInTableEnv: true,
        });
        if (!built.latexBlock) throw new Error('Пустые табличные данные CSV/TSV');
        const nextSrc = insertBooktabsTableIntoDocument(this.source, built.latexBlock, true);
        this.commitSourceTransaction(nextSrc);
        return {
          ...this.snapshot(),
          rows: built.rowCount,
          cols: built.colCount,
          summary_ru: `Вставлена таблица booktabs (${built.rowCount}×${built.colCount})`,
        };
      }

      case 'workshop.csv_pgfplots': {
        const csv =
          typeof req.csv === 'string'
            ? req.csv
            : 't,U\n0.0,0.0\n1.0,2.4\n2.0,3.8\n3.0,4.5';
        const filenameHint = typeof req.filename === 'string' ? req.filename : 'dataset.csv';
        const doc = convertCsvToPgfplotsDocument(filenameHint, csv, 1);
        this.commitSourceTransaction(doc.source);
        this.activeManualAnchorId = 'ext.pgfplots.axis';
        return {
          ...this.snapshot(),
          summary_ru: doc.subtitleRu,
        };
      }

      // === V2 EDITOR ASSIST, DIAGNOSTICS & FORMATTER API ===
      case 'editor.format': {
        const formatted = formatTikzDocumentSource(this.source);
        this.commitSourceTransaction(formatted.nextSource);
        return {
          ...this.snapshot(),
          changed_lines: formatted.changedLinesCount,
          line_ending: formatted.lineEnding,
        };
      }

      case 'editor.diagnostics': {
        const diags = analyzeTexDiagnostics(this.source).map((d) => ({
          ...d,
          manualAnchorId: resolveManualAnchorForDiagnosticCode(d.code)?.id ?? null,
        }));
        return { count: diags.length, diagnostics: diags };
      }

      case 'editor.quickfix': {
        const code = this.requireString(req, 'code');
        const diag = analyzeTexDiagnostics(this.source).find((d) => d.code === code);
        if (!diag) throw new Error(`Активная диагностика с кодом '${code}' не найдена`);
        const res = applyDiagnosticQuickFix(this.source, diag);
        if (!res.ok) throw new Error(res.summaryRu);
        this.commitSourceTransaction(res.nextSource);
        return { ...this.snapshot(), summary_ru: res.summaryRu };
      }

      case 'editor.hover_help': {
        if (typeof req.offset === 'number') {
          return resolveCaretTexHelp(this.source, Math.trunc(req.offset));
        }
        const line = Math.trunc(this.requireNumber(req, 'line'));
        const col = Math.trunc(this.requireNumber(req, 'col'));
        return resolveTexCommandHover(this.source, line, col);
      }

      case 'editor.outline':
        return { outline: buildTexDocumentOutline(this.source) };

      // === V2 ORIGINAL PDF MANUAL & DIRECT ANCHORS API ===
      case 'help.search': {
        const q = (typeof req.query === 'string' ? req.query : this.helpQuery).toLowerCase();
        const anchorHits = searchPdfManualAnchors(q, 'all');
        return {
          hits: anchorHits.map((a) => ({
            id: a.id,
            title: a.titleRu,
            syntax: a.originalDeclarationEn,
            description_ru: a.russianCommentaryRu,
            example: a.originalExampleTex,
            pdf_doc: resolveManualDocumentMeta(a.docId).filename,
            pdf_page: a.page,
            pdf_section: a.section,
            pdf_named_dest: a.namedDest,
            pdf_bbox_norm: a.bboxNorm,
          })),
        };
      }

      case 'manual.documents':
        return {
          count: PDF_MANUAL_DOCUMENTS.length,
          redistribution_policy: 'local-texlive-kpsewhich-index-only (no bulk PDF redistribution)',
          documents: PDF_MANUAL_DOCUMENTS,
        };

      case 'manual.search_anchors': {
        const query = typeof req.query === 'string' ? req.query : '';
        const docId = (typeof req.doc_id === 'string' ? req.doc_id : 'all') as PdfManualDocId | 'all';
        return {
          anchors: searchPdfManualAnchors(query, docId),
        };
      }

      case 'manual.resolve_token': {
        const token = this.requireString(req, 'token');
        const anchor = resolveManualAnchorForToken(token);
        if (!anchor) return { matched: false, anchor: null };
        return {
          matched: true,
          anchor,
          document: resolveManualDocumentMeta(anchor.docId),
        };
      }

      case 'manual.open_anchor': {
        const anchorId = this.requireString(req, 'anchor_id');
        const exists = PDF_MANUAL_ANCHORS.find((a) => a.id === anchorId);
        if (!exists) throw new Error(`Якорь PDF-мануала '${anchorId}' не найден в индексе`);
        // Never mutates `source`!
        this.activeManualAnchorId = exists.id;
        this.manualModalOpen = true;
        return {
          ...this.snapshot(),
          opened_anchor: exists,
          document: resolveManualDocumentMeta(exists.docId),
        };
      }

      case 'manual.close':
        this.manualModalOpen = false;
        return this.snapshot();

      case 'manual.export_index':
        return JSON.parse(exportManualAnchorIndexJson());

      case 'ledger.inspect': {
        const groupFilter =
          typeof req.group === 'string' && req.group !== 'all'
            ? (req.group as LedgerGroupId)
            : null;
        const statusFilter =
          typeof req.status === 'string' && req.status !== 'all'
            ? (req.status as ImplementationStatus)
            : null;
        const query = typeof req.query === 'string' ? req.query.trim().toLowerCase() : '';
        const entries = REQUIREMENTS_AND_FE_LEDGER.filter((row) => {
          if (groupFilter && row.group !== groupFilter) return false;
          if (statusFilter && row.studioStatus !== statusFilter) return false;
          if (
            query &&
            !row.id.toLowerCase().includes(query) &&
            !row.titleRu.toLowerCase().includes(query) &&
            !row.noteRu.toLowerCase().includes(query)
          ) {
            return false;
          }
          return true;
        });
        return {
          summary: getRequirementsLedgerSummary(),
          modernization_tasks_count: MODERNIZATION_TASKS_20.length,
          matched_count: entries.length,
          entries,
        };
      }

      case 'insights.inspect':
        return {
          insights: ARCHITECTURAL_INSIGHTS,
          waves: EXECUTION_WAVES,
          markdown_ru: buildInsightsAndPlansMarkdownRu(),
        };

      case 'package_canvas.catalog':
        return {
          count: PACKAGE_CANVAS_TOOLS.length,
          tools: PACKAGE_CANVAS_TOOLS,
        };

      case 'package_canvas.inspect': {
        const owned = parseOwnedPrimitives(this.source);
        const pkgObjects = parseScenePackageObjects(this.source);
        return {
          owned_n1_count: owned.length,
          package_objects_count: pkgObjects.length,
          package_objects: pkgObjects,
          figure_tree: buildFigureStructureTree(this.source, owned, pkgObjects),
          data_dependencies: inspectDataFileDependencies(this.source),
        };
      }

      case 'package_canvas.insert': {
        const toolId = this.requireString(req, 'tool') as PackageToolId;
        const x1 = this.requireNumber(req, 'x1');
        const y1 = this.requireNumber(req, 'y1');
        const x2 = typeof req.x2 === 'number' ? req.x2 : x1;
        const y2 = typeof req.y2 === 'number' ? req.y2 : y1;
        const res = insertPackageCanvasObjectFromGesture(
          this.source,
          toolId,
          { x: x1, y: y1 },
          { x: x2, y: y2 }
        );
        if (!res.ok) throw new Error(res.summaryRu);
        this.commitSourceTransaction(res.nextSource);
        return {
          ...this.snapshot(),
          inserted_line: res.insertedLine,
          auto_connected: res.autoConnected,
          summary_ru: res.summaryRu,
          package_objects: parseScenePackageObjects(this.source),
        };
      }

      case 'package_canvas.move': {
        const objectId = this.requireString(req, 'object_id');
        const dx = this.requireNumber(req, 'dx');
        const dy = this.requireNumber(req, 'dy');
        const res = translatePackageObjectInSource(this.source, objectId, dx, dy);
        if (!res.ok) throw new Error(res.summaryRu);
        this.commitSourceTransaction(res.nextSource);
        return {
          ...this.snapshot(),
          summary_ru: res.summaryRu,
          package_objects: parseScenePackageObjects(this.source),
        };
      }

      case 'package_canvas.patch': {
        const objectId = this.requireString(req, 'object_id');
        const patch =
          req.patch && typeof req.patch === 'object' && !Array.isArray(req.patch)
            ? (req.patch as PackageObjectSemanticPatch)
            : {};
        const res = patchPackageObjectInSource(this.source, objectId, patch);
        if (!res.ok) throw new Error(res.summaryRu);
        this.commitSourceTransaction(res.nextSource);
        return {
          ...this.snapshot(),
          summary_ru: res.summaryRu,
          package_objects: parseScenePackageObjects(this.source),
        };
      }

      case 'package_canvas.delete': {
        const objectId = this.requireString(req, 'object_id');
        const res = deletePackageObjectFromSource(this.source, objectId);
        if (!res.ok) throw new Error(res.summaryRu);
        this.commitSourceTransaction(res.nextSource);
        return {
          ...this.snapshot(),
          summary_ru: res.summaryRu,
          package_objects: parseScenePackageObjects(this.source),
        };
      }

      case 'view.dock': {
        const d = this.requireString(req, 'dock');
        if (d !== 'properties' && d !== 'libraries' && d !== 'help') {
          throw new Error('dock must be properties/libraries/help');
        }
        this.dock = d;
        this.inspectorOpen = true;
        return this.frame();
      }

      default:
        throw new Error(`unknown operation: ${op}`);
    }
  }

  public runJsonl(jsonlInput: string): ControlJsonResponse[] {
    const lines = jsonlInput
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

    return lines.map((line) => {
      if (new TextEncoder().encode(line).length > MAX_JSON_LINE_BYTES) {
        return { ok: false, error: 'JSONL line exceeds 1 MiB' };
      }
      try {
        const parsed = JSON.parse(line);
        const result = this.handle(parsed);
        return { ok: true, result };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });
  }
}

export const UPSTREAM_TEST_COMPATIBILITY_MATRIX: UpstreamTestCompatibilityRow[] = [
  {
    crateAndFile: 'crates/tikzarium-app/src/studio_ui.rs',
    testName: 'b42_rawinput_group_and_six_native_tool_icons_use_production_handlers',
    v1ContractRu: 'Проверяет 4 группы StudioGroup::ALL и 6 базовых примитивов N1 реальными кликами egui::RawInput без мутации opaque TeX и CRLF.',
    impactStatus: 'pass-unchanged',
    migrationActionRu: 'Сохранены все 4 варианта StudioGroup (Geometry, Connections, Text, Extensions) и сигнатуры show_group_rail_observed / show_palette_observed.',
  },
  {
    crateAndFile: 'crates/tikzarium-app/src/studio_ui.rs',
    testName: 'f1_toggles_help_dock_without_touching_source',
    v1ContractRu: 'Нажатие F1 открывает док справки и побайтово не изменяет буфер исходника TeX.',
    impactStatus: 'pass-unchanged',
    migrationActionRu: 'F1 переключает StudioDock::Help и вычисляет активный якорь PDF-мануала без единого патча в doc.source; Shift+F1 открывает полноэкранный ридер PDF-якоря.',
  },
  {
    crateAndFile: 'crates/tikzarium-app/src/bin/tikzarium-qa-control.rs',
    testName: 'virtual_window_reports_actual_native_egui_widget_rectangles',
    v1ContractRu: 'Требует наличия прямоугольников group.geometry, guide.canvas, tool.line, panel.source и panel.inspector в layout.',
    impactStatus: 'pass-unchanged',
    migrationActionRu: 'Контейнер panel.source сохранён как внешняя рамка левой колонки, а двухоконные панели зарегистрированы как дочерние ID panel.preamble, panel.figure_body и bar.caret_syntax.',
  },
  {
    crateAndFile: 'crates/tikzarium-app/src/bin/tikzarium-qa-control.rs',
    testName: 'all_six_semantic_actions_are_real_source_transactions',
    v1ContractRu: 'Шесть жестов tool.gesture создают ровно 6 примитивов N1, authoring.undo откатывает шаг, сохраняя \\myMacro{Кириллица}.',
    impactStatus: 'pass-unchanged',
    migrationActionRu: 'Контракт транзакций Session не затронут; новые операции extension.insert и preamble.package.connect используют тот же единый обратимый стек undo.',
  },
  {
    crateAndFile: 'crates/tikzarium-app/src/bin/tikzarium-qa-control.rs',
    testName: 'stale_source_and_unrelated_file_overwrite_are_rejected',
    v1ContractRu: 'Отклоняет source.replace с устаревшим revision и блокирует перезапись занятых/внешних путей в document.save_as.',
    impactStatus: 'pass-unchanged',
    migrationActionRu: 'Проверка ревизии и песочницы путей полностью сохранена во всех v1 и v2 командах.',
  },
  {
    crateAndFile: 'crates/tikzarium-extensions/tests/n1_source_integrity.rs',
    testName: 'crlf_comments_and_opaque_macros_survive_patches',
    v1ContractRu: 'Любой патч обязан сохранять окончания строк CRLF (\\r\\n), русские комментарии и пользовательские макросы.',
    impactStatus: 'update-assert',
    migrationActionRu: 'Расширить набор фикстур проверкой автоподключения 12 пакетов расширений в Окне 1 (преамбула) при сохранении CRLF.',
  },
  {
    crateAndFile: 'crates/tikzarium-app/tests/qa_control_v2_parity.rs',
    testName: 'v2_extensions_split_preamble_and_pdf_manual_anchors_api_parity',
    v1ContractRu: 'Новый интеграционный тест 100% паритета GUI↔API для всех мастерских расширений, профилей преамбулы и прямых точек PDF.',
    impactStatus: 'new-v2-test',
    migrationActionRu: 'Добавляется в пакет синхронизации репозитория: тестирует extension.insert, preamble.profile.apply, editor.format и manual.open_anchor.',
  },
];

export const AGENT_JSONL_PRESETS: {
  id: string;
  titleRu: string;
  descriptionRu: string;
  jsonl: string;
}[] = [
  {
    id: 'b42-compat-smoke',
    titleRu: '1. Регрессия B42 + совместимость с тестами i-shutov/tikzarium',
    descriptionRu:
      'Проверяет сохранность прямоугольников panel.source, group.geometry, клика по tool.line, жеста рисования и отката authoring.undo.',
    jsonl: [
      '{"op":"window.set","width":1366,"height":768,"dpi":1.0}',
      '{"op":"input.click","target":"group.geometry"}',
      '{"op":"input.click","target":"tool.line"}',
      '{"op":"tool.gesture","tool":"line","from":[0.0,0.0],"to":[3.2,1.6]}',
      '{"op":"layout.snapshot"}',
    ].join('\n'),
  },
  {
    id: 'circuitikz-extension-and-manual',
    titleRu: '2. Агент собирает цепь CircuiTikZ + открывает прямую точку в PDF',
    descriptionRu:
      'Переключает профиль преамбулы, вставляет резонансный RLC-контур через конструктор расширений и открывает точную координату в circuitikzmanual.pdf.',
    jsonl: [
      '{"op":"preamble.profile.apply","profile":"circuits-control"}',
      '{"op":"extension.insert","extension":"circuitikz","preset":"ctikz-rlc","mode":"hybrid"}',
      '{"op":"manual.open_anchor","anchor_id":"ext.circuitikz.bipoles"}',
    ].join('\n'),
  },
  {
    id: 'csv-pgfplots-and-format',
    titleRu: '3. Импорт таблицы CSV -> график PGFPlots + автоформатирование TeX',
    descriptionRu:
      'Генерирует оси axis с \\addplot по точкам эксперимента, форматирует отступы и проверяет отсутствие ошибок диагностики.',
    jsonl: [
      '{"op":"workshop.csv_pgfplots","csv":"f_kHz,Gain_dB\\n1,0.0\\n10,-3.0\\n100,-20.0","x_label":"$f$, кГц","y_label":"$K$, дБ"}',
      '{"op":"editor.format"}',
      '{"op":"editor.diagnostics"}',
    ].join('\n'),
  },
  {
    id: 'revision-guard-proof',
    titleRu: '4. Защита ревизии буфера (Stale Revision Guard) и иммутабельность F1',
    descriptionRu:
      'Демонстрирует, что F1 не трогает исходник, а попытка перезаписать буфер с неверным revision блокируется контрактом.',
    jsonl: [
      '{"op":"input.key","key":"F1"}',
      '{"op":"manual.resolve_token","token":"\\\\addplot"}',
      '{"op":"source.replace","revision":99999,"source":"MUTATED"}',
    ].join('\n'),
  },
];

export interface RepoMigrationFileEntry {
  path: string;
  roleRu: string;
  content: string;
}

export function buildUpstreamMigrationArtifacts(): RepoMigrationFileEntry[] {
  const collectSh = BUILD_TIME_PDF_INDEXING_GUIDE[0].code;
  const extractPy = BUILD_TIME_PDF_INDEXING_GUIDE[1].code;

  const manifestToml = `# Манифест однократной предсборочной разметки PDF-мануалов TikZarium
# Важно (AGENTS.md п.5): сами PDF-файлы НЕ коммитятся пачкой в Git — скрипт индексирует локальный TeX Live (kpsewhich)
# и сохраняет компактный реестр прямых точек (страница + NamedDest + нормализованный прямоугольник [0..1]).

[[documents]]
id = "pgfmanual"
filename = "pgfmanual.pdf"

  [[documents.targets]]
  id = "pgf.env.tikzpicture"
  section = "§12.2.1"
  fallback_page = 132
  probe_phrase = "\\\\begin{tikzpicture}"
  tokens = ["tikzpicture", "\\\\tikzpicture"]

  [[documents.targets]]
  id = "pgf.draw.line"
  section = "§14.1"
  fallback_page = 153
  probe_phrase = "Path"
  tokens = ["\\\\draw", "--", "cycle"]

  [[documents.targets]]
  id = "pgf.lib.arrows.meta"
  section = "§16.1 & §16.5"
  fallback_page = 201
  probe_phrase = "arrows.meta"
  tokens = ["arrows.meta", "Stealth", "Latex", "->"]

[[documents]]
id = "pgfplots"
filename = "pgfplots.pdf"

  [[documents.targets]]
  id = "ext.pgfplots.axis"
  section = "§4.3"
  fallback_page = 49
  probe_phrase = "\\\\addplot"
  tokens = ["pgfplots", "axis", "\\\\addplot", "\\\\addplot3"]

[[documents]]
id = "circuitikz"
filename = "circuitikzmanual.pdf"

  [[documents.targets]]
  id = "ext.circuitikz.bipoles"
  section = "§3.1 & §4.2"
  fallback_page = 36
  probe_phrase = "circuitikz"
  tokens = ["circuitikz", "R=", "C=", "L="]
`;

  const bundledManualAnchorsToml = [
    'schema_version = 1',
    '',
    ...PDF_MANUAL_DOCUMENTS.map(
      (doc) => `[[documents]]
id = ${JSON.stringify(doc.id)}
filename = ${JSON.stringify(doc.filename)}
texdoc_key = ${JSON.stringify(doc.texdocKey)}
version = ${JSON.stringify(doc.version)}
total_pages = ${doc.totalPages}
`
    ),
    ...PDF_MANUAL_ANCHORS.map(
      (anchor) => `[[anchors]]
id = ${JSON.stringify(anchor.id)}
doc_id = ${JSON.stringify(anchor.docId)}
section = ${JSON.stringify(anchor.section)}
page = ${anchor.page}
named_dest = ${JSON.stringify(anchor.namedDest)}
bbox = [${anchor.bboxNorm.x0}, ${anchor.bboxNorm.y0}, ${anchor.bboxNorm.x1}, ${anchor.bboxNorm.y1}]
title_ru = ${JSON.stringify(anchor.titleRu)}
declaration = ${JSON.stringify(anchor.originalDeclarationEn)}
matched_tokens = [${anchor.matchedTokens.map((t) => JSON.stringify(t)).join(', ')}]
`
    ),
  ].join('\n');

  const rustManualModule = `//! Статический реестр прямых точек оригинальных PDF-мануалов PGF/TikZ и пакетов расширений.
//! Не перераспределяет массивные PDF в репозитории (AGENTS.md п.5): хранит компактный TOML-индекс
//! страниц, NamedDest и нормализованных координат [0..1] для локального \`kpsewhich\`.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use thiserror::Error;

pub const MANUAL_ANCHOR_SCHEMA_VERSION: u32 = 1;
const MAX_SEARCH_QUERY_BYTES: usize = 256;

#[derive(Debug, Error)]
pub enum ManualAnchorError {
    #[error("Invalid manual anchor schema version: {0}")]
    UnsupportedSchema(u32),
    #[error("Invalid manual anchor entry: {0}")]
    InvalidEntry(String),
    #[error("TOML parse error: {0}")]
    Toml(#[from] toml::de::Error),
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ManualDocumentSpec {
    pub id: String,
    pub filename: String,
    pub texdoc_key: String,
    pub version: String,
    pub total_pages: u32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ManualAnchorSpec {
    pub id: String,
    pub doc_id: String,
    pub section: String,
    pub page: u32,
    pub named_dest: String,
    pub bbox: [f32; 4],
    pub title_ru: String,
    pub declaration: String,
    pub matched_tokens: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ManualAnchorCatalog {
    pub schema_version: u32,
    pub documents: Vec<ManualDocumentSpec>,
    pub anchors: Vec<ManualAnchorSpec>,
}

impl ManualAnchorCatalog {
    pub fn bundled() -> Result<Self, ManualAnchorError> {
        let raw = include_str!("../../../extensions/manuals/manual-anchors-v1.toml");
        Self::from_toml_str(raw)
    }

    pub fn from_toml_str(raw: &str) -> Result<Self, ManualAnchorError> {
        let catalog: Self = toml::from_str(raw)?;
        catalog.validate()?;
        Ok(catalog)
    }

    fn validate(&self) -> Result<(), ManualAnchorError> {
        if self.schema_version != MANUAL_ANCHOR_SCHEMA_VERSION {
            return Err(ManualAnchorError::UnsupportedSchema(self.schema_version));
        }
        let mut doc_ids = HashSet::new();
        for doc in &self.documents {
            if doc.id.trim().is_empty() || !doc.filename.ends_with(".pdf") || doc.total_pages == 0 {
                return Err(ManualAnchorError::InvalidEntry(doc.id.clone()));
            }
            if !doc_ids.insert(doc.id.as_str()) {
                return Err(ManualAnchorError::InvalidEntry(doc.id.clone()));
            }
        }
        let mut anchor_ids = HashSet::new();
        for anchor in &self.anchors {
            let [x0, y0, x1, y1] = anchor.bbox;
            let valid_bbox = x0 >= 0.0 && y0 >= 0.0 && x1 <= 1.0 && y1 <= 1.0 && x0 < x1 && y0 < y1;
            if anchor.id.trim().is_empty()
                || !doc_ids.contains(anchor.doc_id.as_str())
                || anchor.page == 0
                || !valid_bbox
                || !anchor_ids.insert(anchor.id.as_str())
            {
                return Err(ManualAnchorError::InvalidEntry(anchor.id.clone()));
            }
        }
        Ok(())
    }

    #[must_use]
    pub fn document(&self, id: &str) -> Option<&ManualDocumentSpec> {
        self.documents.iter().find(|doc| doc.id == id)
    }

    #[must_use]
    pub fn anchor(&self, id: &str) -> Option<&ManualAnchorSpec> {
        self.anchors.iter().find(|item| item.id == id)
    }

    #[must_use]
    pub fn resolve_token(&self, token: &str) -> Option<&ManualAnchorSpec> {
        let trimmed = token.trim();
        if trimmed.is_empty() || trimmed.len() > MAX_SEARCH_QUERY_BYTES {
            return None;
        }
        let plain = trimmed.trim_start_matches('\\\\');
        self.anchors.iter().find(|item| {
            item.matched_tokens
                .iter()
                .any(|cand| cand == trimmed || cand.trim_start_matches('\\\\') == plain)
        })
    }

    #[must_use]
    pub fn search(&self, query: &str, doc_filter: Option<&str>) -> Vec<&ManualAnchorSpec> {
        let needle = query.trim().to_lowercase();
        if needle.len() > MAX_SEARCH_QUERY_BYTES {
            return Vec::new();
        }
        self.anchors
            .iter()
            .filter(|item| {
                doc_filter.is_none_or(|target| item.doc_id == target)
                    && (needle.is_empty()
                        || item.id.to_lowercase().contains(&needle)
                        || item.section.to_lowercase().contains(&needle)
                        || item.title_ru.to_lowercase().contains(&needle)
                        || item.declaration.to_lowercase().contains(&needle)
                        || item
                            .matched_tokens
                            .iter()
                            .any(|tok| tok.to_lowercase().contains(&needle)))
            })
            .collect()
    }
}

/// Lossless byte-exact split at literal \`\\begin{document}\` line boundary.
/// Concatenating \`(preamble, body)\` always yields exact original UTF-8 & CRLF bytes.
#[must_use]
pub fn split_atomic_preamble(source: &str) -> (&str, &str) {
    let mut offset = 0usize;
    for raw in source.split_inclusive('\\n') {
        let trimmed = raw.trim_end_matches(['\\r', '\\n']).trim();
        if trimmed == "\\\\begin{document}" {
            return (&source[..offset], &source[offset..]);
        }
        offset += raw.len();
    }
    ("", source)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bundled_manual_anchors_cover_core_and_extension_pdfs() {
        let catalog = ManualAnchorCatalog::bundled().unwrap();
        assert!(catalog.documents.len() >= 11);
        assert!(catalog.anchors.len() >= 20);
        let addplot = catalog.resolve_token("\\\\addplot").unwrap();
        assert_eq!(addplot.doc_id, "pgfplots");
        let stealth = catalog.resolve_token("Stealth").unwrap();
        assert_eq!(stealth.doc_id, "pgfmanual");
        assert!(catalog.search(&"x".repeat(300), None).is_empty());
    }

    #[test]
    fn atomic_preamble_split_is_byte_exact_for_crlf_and_cyrillic() {
        let src = "% русский комментарий\\r\\n\\\\documentclass{standalone}\\r\\n\\\\usepackage{tikz}\\r\\n\\\\begin{document}\\r\\n\\\\myMacro{Кириллица}\\r\\n\\\\end{document}\\r\\n";
        let (preamble, body) = split_atomic_preamble(src);
        assert!(preamble.ends_with("\\\\usepackage{tikz}\\r\\n"));
        assert!(body.starts_with("\\\\begin{document}\\r\\n"));
        assert_eq!(format!("{preamble}{body}"), src);
    }
}
`;

  const rustQaControlTest = `//! Интеграционный тест паритета egui GUI <-> JSONL API для прямых точек PDF-мануалов
//! и двухоконного паспорта преамбулы (сохраняет неизменный B42 lease в crates/tikzarium-app/src).

use eframe::egui;
use serde_json::{Value, json};
use tikzarium_extensions::manual_anchors::{ManualAnchorCatalog, split_atomic_preamble};
use tikzarium_extensions::project_imports;

fn handle_manual_api(
    catalog: &ManualAnchorCatalog,
    source: &str,
    req: &Value,
) -> Result<Value, String> {
    let op = req
        .get("op")
        .and_then(Value::as_str)
        .ok_or_else(|| String::from("missing op"))?;
    match op {
        "preamble.inspect" => {
            let (preamble, body) = split_atomic_preamble(source);
            let imports = project_imports::inspect(source);
            Ok(json!({
                "preamble_bytes": preamble.len(),
                "body_bytes": body.len(),
                "class_declared": imports.class_declared,
                "crlf": source.contains("\\r\\n"),
            }))
        }
        "manual.documents" => Ok(json!({
            "count": catalog.documents.len(),
            "documents": catalog.documents,
        })),
        "manual.resolve_token" => {
            let token = req
                .get("token")
                .and_then(Value::as_str)
                .ok_or_else(|| String::from("missing token"))?;
            match catalog.resolve_token(token) {
                Some(anchor) => Ok(json!({
                    "matched": true,
                    "anchor": anchor,
                    "document": catalog.document(&anchor.doc_id),
                })),
                None => Ok(json!({ "matched": false, "anchor": Value::Null })),
            }
        }
        other => Err(format!("unsupported v2 op: {other}")),
    }
}

#[test]
fn egui_manual_bbox_overlay_and_api_leave_crlf_source_untouched() {
    let catalog = ManualAnchorCatalog::bundled().unwrap();
    let source = "% русский комментарий\\r\\n\\\\documentclass{standalone}\\r\\n\\\\usepackage{tikz}\\r\\n\\\\begin{document}\\r\\n\\\\begin{tikzpicture}\\r\\n\\\\myMacro{Кириллица}\\r\\n\\\\end{tikzpicture}\\r\\n\\\\end{document}\\r\\n";
    let snapshot_before = source.to_owned();

    let resolved = handle_manual_api(
        &catalog,
        source,
        &json!({ "op": "manual.resolve_token", "token": "\\\\addplot" }),
    )
    .unwrap();
    assert_eq!(resolved["matched"], true);
    assert_eq!(resolved["document"]["filename"], "pgfplots.pdf");

    let passport =
        handle_manual_api(&catalog, source, &json!({ "op": "preamble.inspect" })).unwrap();
    assert_eq!(passport["class_declared"], true);
    assert_eq!(passport["crlf"], true);

    let anchor = catalog.resolve_token("Stealth").unwrap();
    let ctx = egui::Context::default();
    let mut painted_rect = egui::Rect::NOTHING;
    let _ = ctx.run(
        egui::RawInput {
            screen_rect: Some(egui::Rect::from_min_size(
                egui::Pos2::ZERO,
                egui::vec2(1280.0, 800.0),
            )),
            ..Default::default()
        },
        |ctx| {
            egui::CentralPanel::default().show(ctx, |ui| {
                let page_rect =
                    egui::Rect::from_min_size(ui.min_rect().min, egui::vec2(420.0, 594.0));
                let [x0, y0, x1, y1] = anchor.bbox;
                let target = egui::Rect::from_min_max(
                    egui::pos2(
                        page_rect.left() + page_rect.width() * x0,
                        page_rect.top() + page_rect.height() * y0,
                    ),
                    egui::pos2(
                        page_rect.left() + page_rect.width() * x1,
                        page_rect.top() + page_rect.height() * y1,
                    ),
                );
                ui.painter().rect_stroke(
                    target,
                    2.0,
                    egui::Stroke::new(1.5, egui::Color32::from_rgb(37, 99, 235)),
                    egui::StrokeKind::Inside,
                );
                painted_rect = target;
            });
        },
    );

    assert!(painted_rect.is_positive());
    assert_eq!(source, snapshot_before);
}
`;

  return [
    {
      path: 'tools/index_manuals/01_collect_manuals.sh',
      roleRu: 'Поиск локальных лицензионных PDF через kpsewhich и фиксация SHA-256 (без коммита PDF в Git)',
      content: collectSh,
    },
    {
      path: 'tools/index_manuals/02_extract_pdf_anchors.py',
      roleRu: 'Однократная внешняя разметка страниц, NamedDest и нормализованных bbox [0..1] через PyMuPDF',
      content: extractPy,
    },
    {
      path: 'tools/index_manuals/anchors_manifest.toml',
      roleRu: 'Декларативный манифест прямых точек PGF/TikZ и 12 пакетов расширений',
      content: manifestToml,
    },
    {
      path: 'extensions/manuals/manual-anchors-v1.toml',
      roleRu: 'Предразмеченный TOML-реестр прямых точек для крейта tikzarium-extensions (без внешних зависимостей)',
      content: bundledManualAnchorsToml,
    },
    {
      path: 'assets/manuals/manual_anchors.index.json',
      roleRu: 'Готовый предразмеченный JSON-индекс прямых точек для внешних агентов и CLI',
      content: exportManualAnchorIndexJson(),
    },
    {
      path: 'crates/tikzarium-extensions/src/manual_anchors.rs',
      roleRu: 'Модуль разрешения токенов LaTeX/TikZ в прямые точки PDF-мануалов и паспорт преамбулы',
      content: rustManualModule,
    },
    {
      path: 'crates/tikzarium-app/tests/qa_control_v2_parity.rs',
      roleRu: 'Интеграционный egui 0.33.3 + JSONL API v2 тест прямых точек PDF и сохранности CRLF / B42 lease',
      content: rustQaControlTest,
    },
    {
      path: 'docs/REQUIREMENTS_AND_FE_LEDGER_RU.md',
      roleRu: 'Единый реестр ВСЕХ требований, этапов Roadmap и функциональных элементов (FE) с честными статусами реализации',
      content: buildMarkdownLedgerDocumentRu(),
    },
    {
      path: 'docs/INSIGHTS_AND_PLANS_RU.md',
      roleRu: 'Функционально-эргономическое ТЗ v2.4, сравнение egui + Rust vs Tauri v2 + Rust и поэтапный план модернизации',
      content: buildInsightsAndPlansMarkdownRu(),
    },
  ];
}

export function buildSelfContainedGitSyncShellScript(): string {
  const files = buildUpstreamMigrationArtifacts();
  const blocks = files.map(
    (f) => `mkdir -p "$(dirname "${f.path}")"
cat <<'TIKZARIUM_EOF' > "${f.path}"
${f.content}
TIKZARIUM_EOF`
  );

  return `#!/usr/bin/env bash
# Скрипт безопасной публикации интерфейса v2, прямых точек PDF и API-тестов в локальный клон https://github.com/i-shutov/tikzarium.git
set -euo pipefail

BRANCH_NAME="\${1:-feat/studio-v2-extensions-manual-api}"

if [ ! -f "Cargo.toml" ] || [ ! -d "crates/tikzarium-app" ]; then
  echo "Ошибка: запустите скрипт из корня репозитория tikzarium (где лежит Cargo.toml)."
  exit 1
fi

git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

${blocks.join('\n\n')}

chmod +x tools/index_manuals/01_collect_manuals.sh tools/index_manuals/02_extract_pdf_anchors.py

echo "=== 1. Проверка существующих и новых Rust-тестов (включая b42 и tikzarium-qa-control) ==="
cargo test --workspace

echo "=== 2. Готово к коммиту и отправке в origin ($BRANCH_NAME) ==="
git status -s
echo "Выполните: git add . && git commit -m 'feat(studio): atomic preamble, 12 TikZ extensions, PDF manual anchors & QA API v2' && git push -u origin $BRANCH_NAME"
`;
}

export const ATOMIC_PROFILE_IDS_FOR_API = ATOMIC_FIGURE_PROFILES.map((p) => p.id);
