import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  RotateCcw,
  AlertCircle,
  BookOpen,
  ExternalLink,
  ArrowRight,
  Plus,
  Minus,
  Copy,
  Trash2,
  Zap,
  ArrowDownToLine,
  ArrowDown,
  ArrowUp,
  ArrowUpToLine,
  Unlink,
  BookmarkPlus,
  Wrench,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  Upload,
  Download,
  Table2,
  ImageOff,
} from 'lucide-react';
import { PRIMITIVE_TOOLS, TIKZ_LIBRARIES } from '../domain/catalog';
import type { ToolId } from '../domain/catalog';
import {
  resolveManualAnchorForDiagnosticCode,
  resolveManualAnchorForExtension,
  resolveManualAnchorForTool,
  resolveManualAnchorForToken,
  resolveManualDocumentMeta,
} from '../domain/pdfManualAnchors';
import {
  TIKZ_EXTENSION_PACKAGES,
  detectActiveExtensionsInSource,
} from '../domain/tikzExtensionsSuite';
import type { TikzExtensionId } from '../domain/tikzExtensionsSuite';
import {
  ALLOWED_BEAMER_SPECS,
  ALLOWED_COORD_MODES,
  ALLOWED_DECORATION_KINDS,
  ALLOWED_FILL_COLORS,
  ALLOWED_HATCH_PATTERNS,
  ALLOWED_LAYER_IDS,
  ALLOWED_LINE_STYLES,
  ALLOWED_NODE_ANCHORS,
  ALLOWED_ROUTING_MODES,
  ALLOWED_STROKE_COLORS,
  ALLOWED_STROKE_WIDTHS,
  stepDimensionLiteral,
  validateToolDraft,
} from '../domain/tikzEngine';
import type { OwnedPrimitive, TexDiagnostic } from '../domain/tikzEngine';
import type { AlignmentMode, ZOrderDirection } from '../domain/ergonomicsBundle';
import { describeCoordinateNotations } from '../domain/scientificCadBundle';
import {
  CAD_LAYERS,
  GOST_HATCH_SPECS,
  PATH_DECORATION_SPECS,
} from '../domain/advancedCadBundle';
import type { CadLayerId } from '../domain/advancedCadBundle';
import { ALLOWED_ROUNDED_CORNERS_OPTIONS } from '../domain/scientificNotationsAndAuditBundle';
import type { StylePassport } from '../domain/scientificNotationsAndAuditBundle';
import type {
  ContourGeometryMetrics,
  PreambleTikzStyleItem,
} from '../domain/workspaceAndEngineeringStageBundle';
import type { StudioHubTabId } from './StudioWorkshopsHubModal';
import type { ActiveCanvasTool } from './CanvasStage';
import {
  ROADMAP_STAGE_META,
  buildFigureStructureTree,
  inspectDataFileDependencies,
} from '../domain/packageCanvasSemantics';
import type {
  PackageObjectSemanticPatch,
  RecognizedPackageObject,
} from '../domain/packageCanvasSemantics';
import {
  PackageSchematicIcon,
  formatRecognizedPackageObjectLabelRu,
} from './PackageSchematicIcon';

export type InspectorTabId = 'object' | 'layers-objects' | 'diagnostics-f1';

export interface CompositeCanvasLayersState {
  vectorVisible: boolean;
  vectorOpacity: number;
  referenceVisible: boolean;
  referenceOpacity: number;
  gridVisible: boolean;
  gridOpacity: number;
}

interface InspectorAndHelpPaneProps {
  ownedPrimitives: OwnedPrimitive[];
  selectedPrimitive: OwnedPrimitive | null;
  selectedPrimitives: OwnedPrimitive[];
  activeTool: ActiveCanvasTool;
  arrowsMetaLoaded: boolean;
  onApplyPrimitivePatch: (primitiveId: number, nextValues: Record<string, string>) => void;
  onInsertNewFromInspector: (toolId: ToolId, values: Record<string, string>) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onAlignSelected: (mode: AlignmentMode) => void;
  onDeleteSelectedPrimitives: () => void;
  onOpenSaveSnippetModal: () => void;
  onReorderPrimitive: (primitiveId: number, direction: ZOrderDirection) => void;
  onDetachPrimitive: (primitiveId: number) => void;
  onRotatePrimitives: (primitiveIds: number[], angleDeg: number) => void;
  onMirrorPrimitives: (primitiveIds: number[], axis: 'x' | 'y') => void;
  onScalePrimitives: (primitiveIds: number[], factor: number) => void;
  onToggleCallout: (primitiveId: number) => void;
  onOpenForeachModal: () => void;
  onConstructGeometry: () => void;
  diagnostics: TexDiagnostic[];
  onJumpToLine: (line: number) => void;
  onApplyQuickFix: (diag: TexDiagnostic) => void;
  onQuickConnectLibrary: (libName: string) => void;
  highlightedZone: 'inspector' | 'help' | null;
  copiedStylePassport?: StylePassport | null;
  onSampleStyleFromPrimitive?: (primitiveId: number) => void;
  onApplyCopiedStyleToIds?: (targetIds: number[]) => void;
  onQuickFilletSelected?: () => void;
  onQuickFillBetweenSelected?: () => void;
  preambleStyles?: PreambleTikzStyleItem[];
  selectionGeometryMetrics?: ContourGeometryMetrics | null;
  onInsertCentroidMarker?: () => void;
  onGroupSelected?: () => void;
  onUngroupSelected?: () => void;
  onOpenWorkshopsHub?: (tab?: StudioHubTabId) => void;
  onOpenLayersModal?: () => void;
  onOpenSnippetsModal?: () => void;
  isBeamerActive?: boolean;
  connectedLibraries?: string[];
  onSelectPrimitive?: (id: number) => void;
  onOpenManualAnchor?: (anchorId: string) => void;
  source?: string;
  onOpenExtensionWorkshop?: (extId: TikzExtensionId) => void;
  packageObjects?: RecognizedPackageObject[];
  selectedPackageObject?: RecognizedPackageObject | null;
  onSelectPackageObject?: (objectId: string | null) => void;
  onPatchPackageObject?: (objectId: string, patch: PackageObjectSemanticPatch) => void;
  onDeletePackageObject?: (objectId: string) => void;
  declaredDataFiles?: string[];
  activeTabOverride?: InspectorTabId | null;
  onConsumeTabOverride?: () => void;
  compositeLayers?: CompositeCanvasLayersState;
  onChangeCompositeLayers?: (patch: Partial<CompositeCanvasLayersState>) => void;
  pdfUnderlay?: {
    enabled: boolean;
    loading: boolean;
    opacity: number;
    renderMs?: number;
    engineLabelRu?: string;
    hasPdf?: boolean;
  };
  onTogglePdfUnderlay?: () => void;
  onChangePdfUnderlayOpacity?: (opacity: number) => void;
  onDownloadRenderedPdf?: () => void;
  referenceImageUrl?: string | null;
  onUploadReferenceImageDataUrl?: (dataUrl: string) => void;
  onLoadDemoReferenceScan?: () => void;
  onClearReferenceImage?: () => void;
  hiddenLayers?: CadLayerId[];
  lockedLayers?: CadLayerId[];
  onToggleHideLayer?: (layerId: CadLayerId) => void;
  onToggleLockLayer?: (layerId: CadLayerId) => void;
  onOpenOutlinerTable?: () => void;
  hoveredPrimitiveId?: number | null;
  onHoverPrimitive?: (id: number | null) => void;
  onDuplicatePrimitiveById?: (id: number) => void;
  onDeletePrimitiveById?: (id: number) => void;
}

const STROKE_WIDTH_LABELS_RU: Record<string, string> = {
  '': 'По умолч.',
  thin: 'Тонкая (thin)',
  semithick: 'Полужирная (semithick)',
  thick: 'Толстая (thick)',
  'very thick': 'Жирная (very thick)',
};

const LINE_STYLE_LABELS_RU: Record<string, string> = {
  '': 'Сплошная',
  solid: 'Явная solid',
  dashed: 'Штриховая (dashed)',
  dotted: 'Пунктирная (dotted)',
};

const STROKE_COLOR_LABELS_RU: Record<string, string> = {
  '': 'Чёрный',
  black: 'Явный black',
  'blue!75!black': 'Синий (blue!75)',
  'red!75!black': 'Красный (red!75)',
  'teal!80!black': 'Бирюзовый (teal!80)',
  'orange!85!black': 'Оранжевый (orange!85)',
  'violet!80!black': 'Фиолетовый (violet!80)',
  oiBlue: 'Okabe–Ito Синий',
  oiVermilion: 'Okabe–Ito Алый',
  oiBluishGreen: 'Okabe–Ito Изумруд',
  oiOrange: 'Okabe–Ito Оранжевый',
  oiPurple: 'Okabe–Ito Пурпурный',
  oiSkyBlue: 'Okabe–Ito Голубой',
};

const FILL_COLOR_LABELS_RU: Record<string, string> = {
  '': 'Без заливки',
  none: 'Прозрачная (none)',
  'cyan!10': 'Голубая 10%',
  'blue!8': 'Синяя 8%',
  'emerald!10': 'Зелёная 10%',
  'amber!14': 'Янтарная 14%',
  'rose!10': 'Розовая 10%',
  'slate!12': 'Серая 12%',
  'oiBlue!12': 'OI Синяя 12%',
  'oiVermilion!12': 'OI Алая 12%',
  'oiBluishGreen!12': 'OI Изумрудная 12%',
  'oiOrange!14': 'OI Оранжевая 14%',
};

function splitDimensionValue(raw: string, fallbackUnit = 'cm'): { numPart: string; unitPart: string } {
  const m = /^([+-]?\d*(?:\.\d+)?)(pt|mm|cm|in)$/.exec(raw.trim());
  if (m) {
    return { numPart: m[1], unitPart: m[2] };
  }
  return { numPart: raw, unitPart: fallbackUnit };
}

export const InspectorAndHelpPane: React.FC<InspectorAndHelpPaneProps> = ({
  ownedPrimitives,
  selectedPrimitive,
  selectedPrimitives,
  activeTool,
  arrowsMetaLoaded,
  onApplyPrimitivePatch,
  onInsertNewFromInspector,
  onDuplicateSelected,
  onDeleteSelected,
  onAlignSelected,
  onDeleteSelectedPrimitives,
  onOpenSaveSnippetModal,
  onReorderPrimitive,
  onDetachPrimitive,
  onRotatePrimitives,
  onMirrorPrimitives,
  onScalePrimitives,
  onToggleCallout,
  onOpenForeachModal,
  onConstructGeometry,
  diagnostics,
  onJumpToLine,
  onApplyQuickFix,
  onQuickConnectLibrary,
  highlightedZone,
  copiedStylePassport,
  onSampleStyleFromPrimitive,
  onApplyCopiedStyleToIds,
  onQuickFilletSelected,
  onQuickFillBetweenSelected,
  preambleStyles = [],
  selectionGeometryMetrics = null,
  onInsertCentroidMarker,
  onGroupSelected,
  onUngroupSelected,
  onOpenWorkshopsHub,
  onOpenLayersModal,
  onOpenSnippetsModal,
  isBeamerActive = false,
  connectedLibraries = [],
  onSelectPrimitive,
  onOpenManualAnchor,
  source,
  onOpenExtensionWorkshop,
  packageObjects = [],
  selectedPackageObject = null,
  onSelectPackageObject,
  onPatchPackageObject,
  onDeletePackageObject,
  declaredDataFiles = [],
  activeTabOverride = null,
  onConsumeTabOverride,
  compositeLayers = {
    vectorVisible: true,
    vectorOpacity: 1,
    referenceVisible: true,
    referenceOpacity: 0.38,
    gridVisible: true,
    gridOpacity: 1,
  },
  onChangeCompositeLayers,
  pdfUnderlay,
  onTogglePdfUnderlay,
  onChangePdfUnderlayOpacity,
  onDownloadRenderedPdf,
  referenceImageUrl = null,
  onUploadReferenceImageDataUrl,
  onLoadDemoReferenceScan,
  onClearReferenceImage,
  hiddenLayers = [],
  lockedLayers = [],
  onToggleHideLayer,
  onToggleLockLayer,
  onOpenOutlinerTable,
  hoveredPrimitiveId = null,
  onHoverPrimitive,
  onDuplicatePrimitiveById,
  onDeletePrimitiveById,
}) => {
  const [manualInsertToolId, setManualInsertToolId] = useState<ToolId>('line');
  const [selectedLayerTarget, setSelectedLayerTarget] = useState<
    'pdf' | 'vector' | 'reference' | 'grid'
  >('pdf');
  const [treeFilter, setTreeFilter] = useState<'all' | 'packages' | 'primitives' | 'scopes'>('all');
  const [showCadSublayers, setShowCadSublayers] = useState<boolean>(false);
  const referenceUploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const isEmptySelectMode =
    !selectedPrimitive &&
    !selectedPackageObject &&
    selectedPrimitives.length === 0 &&
    (activeTool === 'select' || activeTool === 'marquee');

  const isPrimitiveTool = (t: ActiveCanvasTool): t is ToolId =>
    t === 'line' ||
    t === 'arrow' ||
    t === 'rectangle' ||
    t === 'circle' ||
    t === 'node' ||
    t === 'cubic';

  const effectiveToolId: ToolId = selectedPrimitive
    ? selectedPrimitive.tool
    : isEmptySelectMode
      ? manualInsertToolId
      : isPrimitiveTool(activeTool)
        ? activeTool
        : activeTool === 'arc3'
          ? 'cubic'
          : 'line';

  const toolSpec = PRIMITIVE_TOOLS.find((t) => t.id === effectiveToolId) ?? PRIMITIVE_TOOLS[0];

  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [f1TopicId, setF1TopicId] = useState<string>(toolSpec.catalogId);
  const [autoApplySteps, setAutoApplySteps] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<InspectorTabId>('object');
  const [showEmptyCoordForm, setShowEmptyCoordForm] = useState<boolean>(false);

  useEffect(() => {
    if (highlightedZone === 'help') {
      setActiveTab('diagnostics-f1');
    } else if (highlightedZone === 'inspector') {
      setActiveTab('object');
    }
  }, [highlightedZone]);

  useEffect(() => {
    if (activeTabOverride) {
      setActiveTab(activeTabOverride);
      onConsumeTabOverride?.();
    }
  }, [activeTabOverride, onConsumeTabOverride]);

  const namedNodes = useMemo(
    () =>
      ownedPrimitives
        .filter((p) => p.tool === 'node' && Boolean(p.values.node_id))
        .map((p) => ({
          id: p.id,
          nodeId: p.values.node_id as string,
          content: p.values.content ?? '',
        })),
    [ownedPrimitives]
  );

  // Sync draft ONLY when selected primitive ID or its applied values change (T4)
  const syncKey = selectedPrimitive
    ? `owned:${selectedPrimitive.id}:${JSON.stringify(selectedPrimitive.values)}`
    : `preset:${effectiveToolId}`;

  useEffect(() => {
    if (selectedPrimitive) {
      setDraftValues({ ...selectedPrimitive.values });
      setF1TopicId(
        PRIMITIVE_TOOLS.find((t) => t.id === selectedPrimitive.tool)?.catalogId ?? 'tikz.circle'
      );
    } else {
      const defaults: Record<string, string> = {};
      for (const p of toolSpec.parameters) {
        defaults[p.id] = p.defaultValue;
      }
      setDraftValues(defaults);
      setF1TopicId(toolSpec.catalogId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  const validationErrors = validateToolDraft(effectiveToolId, draftValues);
  const hasErrors = Object.keys(validationErrors).length > 0;

  const isDirtyDraft = selectedPrimitive
    ? JSON.stringify(draftValues) !== JSON.stringify(selectedPrimitive.values)
    : true;

  const handleResetDraft = () => {
    if (selectedPrimitive) {
      setDraftValues({ ...selectedPrimitive.values });
    } else {
      const defaults: Record<string, string> = {};
      for (const p of toolSpec.parameters) {
        defaults[p.id] = p.defaultValue;
      }
      setDraftValues(defaults);
    }
  };

  const updateOptionalField = (key: string, nextVal: string, applyImmediately = true) => {
    const nextDraft = { ...draftValues };
    if (nextVal) {
      nextDraft[key] = nextVal;
    } else {
      delete nextDraft[key];
    }
    setDraftValues(nextDraft);
    if (selectedPrimitive && autoApplySteps && applyImmediately) {
      const nextErrs = validateToolDraft(effectiveToolId, nextDraft);
      if (Object.keys(nextErrs).length === 0) {
        onApplyPrimitivePatch(selectedPrimitive.id, nextDraft);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors) return;
    if (selectedPrimitive) {
      if (!isDirtyDraft) return;
      onApplyPrimitivePatch(selectedPrimitive.id, draftValues);
    } else {
      onInsertNewFromInspector(effectiveToolId, draftValues);
    }
  };

  const applyStepToParam = (
    paramId: string,
    currentVal: string,
    direction: 1 | -1,
    coarse: boolean,
    positiveOnly: boolean
  ) => {
    const stepped = stepDimensionLiteral(currentVal, direction, coarse, positiveOnly);
    const nextDraft = { ...draftValues, [paramId]: stepped };
    setDraftValues(nextDraft);
    if (selectedPrimitive && autoApplySteps) {
      const nextErrs = validateToolDraft(effectiveToolId, nextDraft);
      if (Object.keys(nextErrs).length === 0) {
        onApplyPrimitivePatch(selectedPrimitive.id, nextDraft);
      }
    }
  };

  const activeExtensions = useMemo(
    () => (source ? detectActiveExtensionsInSource(source) : []),
    [source]
  );

  const figureTree = useMemo(
    () => (source ? buildFigureStructureTree(source, ownedPrimitives, packageObjects) : []),
    [ownedPrimitives, packageObjects, source]
  );

  const dataAuditEntries = useMemo(
    () => (source ? inspectDataFileDependencies(source, declaredDataFiles) : []),
    [declaredDataFiles, source]
  );

  const f1Tool = PRIMITIVE_TOOLS.find((t) => t.catalogId === f1TopicId);
  const f1Library = TIKZ_LIBRARIES.find((l) => l.id === f1TopicId);
  const f1Extension = f1TopicId.startsWith('ext:')
    ? TIKZ_EXTENSION_PACKAGES.find((ext) => `ext:${ext.id}` === f1TopicId)
    : undefined;

  return (
    <aside
      aria-label="Инспектор свойств, справка F1 и диагностика"
      className="flex flex-col h-full min-h-0 bg-[var(--tz-panel)] overflow-hidden"
    >
      {/* Unified 3-Tab Right Dock: Свойства | Слои и Объекты | Проверка · F1 */}
      <div
        data-testid="inspector-tabs"
        role="tablist"
        aria-label="Разделы инспектора"
        className="shrink-0 grid grid-cols-3 border-b border-[var(--tz-outline)] bg-[var(--tz-inset)] text-[11px] font-medium"
      >
        <button
          type="button"
          role="tab"
          data-testid="inspector-tab-object"
          aria-selected={activeTab === 'object'}
          onClick={() => setActiveTab('object')}
          className={`px-2 py-1.5 border-r border-[var(--tz-outline)] truncate transition-colors ${
            activeTab === 'object'
              ? 'bg-[var(--tz-panel)] text-[var(--tz-text)] font-semibold border-b-2 border-b-[var(--tz-accent)]'
              : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)] hover:bg-[var(--tz-hover)]'
          }`}
        >
          {selectedPrimitives.length >= 2
            ? `Группа (${selectedPrimitives.length})`
            : selectedPrimitive
              ? `Свойства #${selectedPrimitive.id}`
              : selectedPackageObject
                ? `Свойства · ${selectedPackageObject.packageOwner}`
                : 'Свойства'}
        </button>
        <button
          type="button"
          role="tab"
          data-testid="inspector-tab-layers-objects"
          aria-selected={activeTab === 'layers-objects'}
          onClick={() => setActiveTab('layers-objects')}
          className={`px-2 py-1.5 border-r border-[var(--tz-outline)] truncate font-mono tabular-nums transition-colors inline-flex items-center justify-center gap-1 ${
            activeTab === 'layers-objects'
              ? 'bg-[var(--tz-panel)] text-[var(--tz-text)] font-semibold border-b-2 border-b-[var(--tz-accent)]'
              : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)] hover:bg-[var(--tz-hover)]'
          }`}
        >
          <Layers className="w-3 h-3 shrink-0" />
          <span className="font-sans truncate">
            Слои ({ownedPrimitives.length + packageObjects.length})
          </span>
        </button>
        <button
          type="button"
          role="tab"
          data-testid="inspector-tab-diag"
          aria-selected={activeTab === 'diagnostics-f1'}
          onClick={() => setActiveTab('diagnostics-f1')}
          className={`px-2 py-1.5 truncate font-mono tabular-nums transition-colors ${
            activeTab === 'diagnostics-f1'
              ? 'bg-[var(--tz-panel)] text-[var(--tz-text)] font-semibold border-b-2 border-b-[var(--tz-accent)]'
              : diagnostics.length > 0
                ? 'text-amber-500 hover:bg-[var(--tz-hover)] font-semibold'
                : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)] hover:bg-[var(--tz-hover)]'
          }`}
        >
          {diagnostics.length > 0 ? `Ошибки (${diagnostics.length})` : 'F1 · Аудит'}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {activeTab === 'object' && (
          <>
            {/* Package-Semantic Clean Object Inspector (NO % tikzarium:n1: comments) */}
            {selectedPackageObject && onPatchPackageObject && (
              <div
                data-testid="inspector-package-object-card"
                className="p-3 border-b border-[var(--tz-outline)] bg-[var(--tz-window)] flex flex-col gap-2.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex items-start gap-2">
                    <span className="mt-0.5 p-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[var(--tz-link)] shrink-0">
                      <PackageSchematicIcon
                        objectKind={selectedPackageObject.kind}
                        circuitKind={selectedPackageObject.circuitKind}
                        className="w-4 h-4"
                      />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-xs font-semibold text-[var(--tz-text)] truncate">
                        {formatRecognizedPackageObjectLabelRu(selectedPackageObject)} ·{' '}
                        <span className="font-mono text-[var(--tz-link)]">
                          {selectedPackageObject.packageOwner}
                        </span>
                      </h2>
                      <p className="text-[11px] text-[var(--tz-muted)] font-mono tabular-nums">
                        <span>
                          {selectedPackageObject.startLine === selectedPackageObject.endLine
                            ? `Стр. ${selectedPackageObject.startLine}`
                            : `Стр. ${selectedPackageObject.startLine}–${selectedPackageObject.endLine}`}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>{ROADMAP_STAGE_META[selectedPackageObject.roadmapStage].shortRu}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="text-emerald-500">чистый .tex</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onJumpToLine(selectedPackageObject.startLine)}
                      className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] text-[10.5px] font-mono tabular-nums"
                    >
                      Стр.{selectedPackageObject.startLine}
                    </button>
                    {onDeletePackageObject && (
                      <button
                        type="button"
                        onClick={() => onDeletePackageObject(selectedPackageObject.objectId)}
                        title="Удалить объект пакета из исходника .tex"
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-rose-500/15 text-rose-400 border border-[var(--tz-outline)] text-[10.5px]"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        <span>Удал.</span>
                      </button>
                    )}
                  </div>
                </div>

                {selectedPackageObject.kind === 'pgfplots-axis' && (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[var(--tz-muted)]">Шкала осей</span>
                      <select
                        value={selectedPackageObject.axisEnv ?? 'axis'}
                        onChange={(e) =>
                          onPatchPackageObject(selectedPackageObject.objectId, {
                            axisEnv: e.target.value as 'axis' | 'semilogxaxis' | 'loglogaxis',
                          })
                        }
                        className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs"
                      >
                        <option value="axis">axis (линейная)</option>
                        <option value="semilogxaxis">semilogxaxis</option>
                        <option value="loglogaxis">loglogaxis</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[var(--tz-muted)]">Заголовок title</span>
                      <input
                        type="text"
                        defaultValue={selectedPackageObject.axisTitle ?? ''}
                        key={`${selectedPackageObject.objectId}-title`}
                        onBlur={(e) =>
                          onPatchPackageObject(selectedPackageObject.objectId, {
                            axisTitle: e.target.value,
                          })
                        }
                        placeholder="Опционально"
                        className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[var(--tz-muted)]">Подпись xlabel</span>
                      <input
                        type="text"
                        defaultValue={selectedPackageObject.axisXLabel ?? '$x$'}
                        key={`${selectedPackageObject.objectId}-xlabel`}
                        onBlur={(e) =>
                          onPatchPackageObject(selectedPackageObject.objectId, {
                            axisXLabel: e.target.value,
                          })
                        }
                        className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[var(--tz-muted)]">Подпись ylabel</span>
                      <input
                        type="text"
                        defaultValue={selectedPackageObject.axisYLabel ?? '$f(x)$'}
                        key={`${selectedPackageObject.objectId}-ylabel`}
                        onBlur={(e) =>
                          onPatchPackageObject(selectedPackageObject.objectId, {
                            axisYLabel: e.target.value,
                          })
                        }
                        className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[var(--tz-muted)]">Ширина width (см)</span>
                      <input
                        type="number"
                        step="0.2"
                        min="1.8"
                        max="8.2"
                        defaultValue={(selectedPackageObject.x2Cm - selectedPackageObject.x1Cm).toFixed(2)}
                        key={`${selectedPackageObject.objectId}-w`}
                        onBlur={(e) =>
                          onPatchPackageObject(selectedPackageObject.objectId, {
                            widthCm: Number(e.target.value) || 4.2,
                          })
                        }
                        className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono tabular-nums text-xs"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[var(--tz-muted)]">Высота height (см)</span>
                      <input
                        type="number"
                        step="0.2"
                        min="1.4"
                        max="4.8"
                        defaultValue={(selectedPackageObject.y2Cm - selectedPackageObject.y1Cm).toFixed(2)}
                        key={`${selectedPackageObject.objectId}-h`}
                        onBlur={(e) =>
                          onPatchPackageObject(selectedPackageObject.objectId, {
                            heightCm: Number(e.target.value) || 2.6,
                          })
                        }
                        className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono tabular-nums text-xs"
                      />
                    </label>
                  </div>
                )}

                {selectedPackageObject.kind === 'circuit-bipole' && (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[var(--tz-muted)]">Двухполюсник</span>
                      <select
                        value={
                          selectedPackageObject.circuitKind === 'I' ||
                          selectedPackageObject.circuitKind === 'lamp'
                            ? 'R'
                            : (selectedPackageObject.circuitKind ?? 'R')
                        }
                        onChange={(e) =>
                          onPatchPackageObject(selectedPackageObject.objectId, {
                            circuitKind: e.target.value as 'R' | 'C' | 'L' | 'V' | 'Do',
                          })
                        }
                        className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs"
                      >
                        <option value="R">R — Резистор</option>
                        <option value="C">C — Конденсатор</option>
                        <option value="L">L — Индуктивность</option>
                        <option value="V">V — Источник ЭДС</option>
                        <option value="Do">Do — Диод</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[var(--tz-muted)]">Номинал / метка l=</span>
                      <input
                        type="text"
                        defaultValue={selectedPackageObject.labelLatex ?? '$R_1$'}
                        key={`${selectedPackageObject.objectId}-clbl`}
                        onBlur={(e) =>
                          onPatchPackageObject(selectedPackageObject.objectId, {
                            labelLatex: e.target.value,
                          })
                        }
                        className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs"
                      />
                    </label>
                  </div>
                )}

                {selectedPackageObject.kind === 'automata-state' && (
                  <div className="flex flex-col gap-2 text-[11px]">
                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedPackageObject.stateInitial)}
                          onChange={(e) =>
                            onPatchPackageObject(selectedPackageObject.objectId, {
                              stateInitial: e.target.checked,
                            })
                          }
                        />
                        <span>Начальное (initial)</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedPackageObject.stateAccepting)}
                          onChange={(e) =>
                            onPatchPackageObject(selectedPackageObject.objectId, {
                              stateAccepting: e.target.checked,
                            })
                          }
                        />
                        <span>Допускающее (accepting)</span>
                      </label>
                    </div>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[var(--tz-muted)]">Подпись состояния LaTeX</span>
                      <input
                        type="text"
                        defaultValue={selectedPackageObject.labelLatex ?? '$q_0$'}
                        key={`${selectedPackageObject.objectId}-slbl`}
                        onBlur={(e) =>
                          onPatchPackageObject(selectedPackageObject.objectId, {
                            labelLatex: e.target.value,
                          })
                        }
                        className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs"
                      />
                    </label>
                  </div>
                )}

                {selectedPackageObject.kind === 'chemfig-molecule' && (
                  <label className="flex flex-col gap-0.5 text-[11px]">
                    <span className="text-[var(--tz-muted)]">Структурная формула \chemfig&#123;…&#125;</span>
                    <input
                      type="text"
                      defaultValue={selectedPackageObject.chemFormula ?? '*6(-=-=-=)'}
                      key={`${selectedPackageObject.objectId}-chem`}
                      onBlur={(e) =>
                        onPatchPackageObject(selectedPackageObject.objectId, {
                          chemFormula: e.target.value,
                        })
                      }
                      className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs"
                    />
                  </label>
                )}

                {(selectedPackageObject.kind === 'clean-node' ||
                  selectedPackageObject.kind === 'automata-edge' ||
                  selectedPackageObject.kind === 'optics-lens') && (
                  <label className="flex flex-col gap-0.5 text-[11px]">
                    <span className="text-[var(--tz-muted)]">Математическая подпись LaTeX</span>
                    <input
                      type="text"
                      defaultValue={selectedPackageObject.labelLatex ?? ''}
                      key={`${selectedPackageObject.objectId}-nlbl`}
                      onBlur={(e) =>
                        onPatchPackageObject(selectedPackageObject.objectId, {
                          labelLatex: e.target.value,
                        })
                      }
                      className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs"
                    />
                  </label>
                )}

                <div className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[10.5px] text-[var(--tz-muted)] truncate">
                  {selectedPackageObject.rawSnippet}
                </div>
              </div>
            )}

            {/* Multi-Selection Batch Alignment & Snippet Card when >= 2 objects selected */}
            {selectedPrimitives.length >= 2 ? (
        <div
          data-testid="inspector-multiselect-card"
          className="p-3 border-b border-[var(--tz-outline)] flex flex-col gap-2.5"
        >
          <div>
            <h2 className="text-xs font-semibold text-[var(--tz-text)]">
              Групповое выделение · {selectedPrimitives.length} примитивов
            </h2>
            <p className="text-[11px] text-[var(--tz-muted)]">
              Пакетное выравнивание координат и сохранение заготовки
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => onAlignSelected('left')}
              className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
            >
              Влево
            </button>
            <button
              type="button"
              onClick={() => onAlignSelected('center-x')}
              className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
            >
              Центр X
            </button>
            <button
              type="button"
              onClick={() => onAlignSelected('right')}
              className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
            >
              Вправо
            </button>
            <button
              type="button"
              onClick={() => onAlignSelected('bottom')}
              className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
            >
              Низ Y
            </button>
            <button
              type="button"
              onClick={() => onAlignSelected('center-y')}
              className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
            >
              Центр Y
            </button>
            <button
              type="button"
              onClick={() => onAlignSelected('top')}
              className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
            >
              Верх Y
            </button>
            {selectedPrimitives.length >= 3 && (
              <>
                <button
                  type="button"
                  onClick={() => onAlignSelected('distribute-x')}
                  className="col-span-3 px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                >
                  Равномерно распределить по X
                </button>
                <button
                  type="button"
                  onClick={() => onAlignSelected('distribute-y')}
                  className="col-span-3 px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                >
                  Равномерно распределить по Y
                </button>
              </>
            )}
          </div>

          {/* Group Geometric Transforms & Parametric \foreach */}
          <div className="pt-1.5 border-t border-[var(--tz-outline)] flex flex-col gap-1">
            <span className="text-[10.5px] font-medium text-[var(--tz-muted)]">
              Геометрия группы и массив:
            </span>
            <div className="grid grid-cols-3 gap-1 text-[11px] font-mono tabular-nums">
              <button
                type="button"
                onClick={() =>
                  onRotatePrimitives(
                    selectedPrimitives.map((p) => p.id),
                    -45
                  )
                }
                className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
              >
                ↺ −45°
              </button>
              <button
                type="button"
                onClick={() =>
                  onRotatePrimitives(
                    selectedPrimitives.map((p) => p.id),
                    45
                  )
                }
                className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
              >
                ↻ +45°
              </button>
              <button
                type="button"
                onClick={onOpenForeachModal}
                className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-outline)] whitespace-nowrap"
              >
                \foreach…
              </button>
              <button
                type="button"
                onClick={() =>
                  onMirrorPrimitives(
                    selectedPrimitives.map((p) => p.id),
                    'x'
                  )
                }
                className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
              >
                ⇄ Ось X
              </button>
              <button
                type="button"
                onClick={() =>
                  onMirrorPrimitives(
                    selectedPrimitives.map((p) => p.id),
                    'y'
                  )
                }
                className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
              >
                ⇅ Ось Y
              </button>
              <button
                type="button"
                onClick={() =>
                  onScalePrimitives(
                    selectedPrimitives.map((p) => p.id),
                    1.25
                  )
                }
                className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
              >
                ×1.25
              </button>
            </div>
          </div>

          <button
            type="button"
            data-testid="inspector-construct-geometry-btn"
            onClick={onConstructGeometry}
            className="w-full px-2.5 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-accent)]/60 whitespace-nowrap"
          >
            Пересечение / Перпендикуляр ∟
          </button>

          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {onQuickFilletSelected && (
              <button
                type="button"
                onClick={onQuickFilletSelected}
                className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap"
              >
                Скругление R
              </button>
            )}
            {onQuickFillBetweenSelected && (
              <button
                type="button"
                onClick={onQuickFillBetweenSelected}
                className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap"
              >
                Заливка между
              </button>
            )}
          </div>

          {copiedStylePassport && onApplyCopiedStyleToIds && (
            <button
              type="button"
              onClick={() => onApplyCopiedStyleToIds(selectedPrimitives.map((p) => p.id))}
              className="w-full px-2.5 py-1 text-[11px] font-medium rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/40 whitespace-nowrap"
            >
              Вставить стиль от #{copiedStylePassport.sourcePrimitiveId}
            </button>
          )}

          {/* F04: Local Primitive Grouping / Ungrouping */}
          {(onGroupSelected || onUngroupSelected) && (
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {onGroupSelected && (
                <button
                  type="button"
                  data-testid="inspector-group-selected-btn"
                  onClick={onGroupSelected}
                  className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-accent)]/50 whitespace-nowrap font-medium"
                >
                  В группу (Ctrl+G)
                </button>
              )}
              {onUngroupSelected && selectedPrimitives.some((p) => Boolean(p.values.group_id)) && (
                <button
                  type="button"
                  data-testid="inspector-ungroup-selected-btn"
                  onClick={onUngroupSelected}
                  className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] border border-[var(--tz-outline)] whitespace-nowrap"
                >
                  Разгруппировать
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenSaveSnippetModal}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-[var(--tz-accent)] text-white hover:opacity-95 whitespace-nowrap"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>В сниппеты</span>
            </button>
            <button
              type="button"
              onClick={onDeleteSelectedPrimitives}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {isEmptySelectMode && (
            <div
              data-testid="inspector-empty-summary"
              className="p-3 border-b border-[var(--tz-outline)] flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-semibold text-[var(--tz-text)]">Сводка рисунка</h2>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Выберите объект на холсте или в списке ниже
                  </p>
                </div>
                <span className="font-mono tabular-nums text-[11px] text-[var(--tz-muted)] shrink-0">
                  Объектов:{' '}
                  <strong className="text-[var(--tz-text)]">
                    {ownedPrimitives.length + packageObjects.length}
                  </strong>
                </span>
              </div>

              {ownedPrimitives.length > 0 || packageObjects.length > 0 ? (
                <div className="max-h-44 overflow-y-auto rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] divide-y divide-[var(--tz-outline)]">
                  {packageObjects.map((po) => (
                    <div
                      key={po.objectId}
                      className="flex items-center justify-between gap-1.5 px-2 py-1 text-[11px] hover:bg-[var(--tz-hover)] transition-colors"
                    >
                      <button
                        type="button"
                        data-testid={`summary-select-pkg-${po.objectId}`}
                        onClick={() => onSelectPackageObject?.(po.objectId)}
                        className="flex-1 min-w-0 text-left truncate text-[var(--tz-text)]"
                      >
                        <span className="font-mono font-semibold text-emerald-500">
                          [{po.packageOwner}]
                        </span>{' '}
                        <span>{po.kind}</span>
                        {po.labelLatex && (
                          <span className="text-[var(--tz-muted)] font-mono"> · {po.labelLatex}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onJumpToLine(po.startLine)}
                        className="px-1 py-0.5 rounded text-[10px] font-mono tabular-nums text-[var(--tz-muted)] hover:text-[var(--tz-text)] hover:bg-[var(--tz-button)] shrink-0"
                      >
                        Стр.{po.startLine}
                      </button>
                    </div>
                  ))}
                  {ownedPrimitives.map((prim) => {
                    const spec = PRIMITIVE_TOOLS.find((t) => t.id === prim.tool);
                    const labelDetail =
                      prim.tool === 'node' && prim.values.content
                        ? ` · ${prim.values.content}`
                        : prim.values.node_id
                          ? ` (${prim.values.node_id})`
                          : '';
                    return (
                      <div
                        key={prim.id}
                        className="flex items-center justify-between gap-1.5 px-2 py-1 text-[11px] hover:bg-[var(--tz-hover)] transition-colors"
                      >
                        <button
                          type="button"
                          data-testid={`summary-select-prim-${prim.id}`}
                          onClick={() => onSelectPrimitive?.(prim.id)}
                          className="flex-1 min-w-0 text-left truncate text-[var(--tz-text)]"
                        >
                          <span className="font-mono font-semibold text-[var(--tz-link)]">
                            #{prim.id}
                          </span>{' '}
                          <span>{spec?.shortLabelRu ?? prim.tool}</span>
                          <span className="text-[var(--tz-muted)] font-mono">{labelDetail}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onJumpToLine(prim.lineNumber)}
                          title={`Перейти к строке ${prim.lineNumber}`}
                          className="px-1 py-0.5 rounded text-[10px] font-mono tabular-nums text-[var(--tz-muted)] hover:text-[var(--tz-text)] hover:bg-[var(--tz-button)] shrink-0"
                        >
                          Стр.{prim.lineNumber}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : activeExtensions.length > 0 ? (
                <div className="p-2 rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] text-[11px] text-[var(--tz-muted)]">
                  Рисунок использует блоки пакетов расширений LaTeX/TikZ. Используйте палитру объектов пакетов над холстом для интерактивного рисования.
                </div>
              ) : (
                <div className="p-2 rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] text-[11px] text-[var(--tz-muted)]">
                  Выберите объект пакета над холстом или базовый примитив слева, чтобы рисовать с живой обратной связью по PDF-подложке.
                </div>
              )}

              {activeExtensions.length > 0 && (
                <div
                  data-testid="inspector-active-extensions-card"
                  className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-2 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-[10.5px]">
                    <span className="font-semibold text-[var(--tz-text)]">
                      Пакеты расширений в рисунке ({activeExtensions.length})
                    </span>
                    <span className="text-[var(--tz-muted)]">Быстрый переход</span>
                  </div>
                  <div className="divide-y divide-[var(--tz-outline)]/60">
                    {activeExtensions.map((ext) => {
                      const extAnchor = resolveManualAnchorForExtension(ext.id);
                      return (
                        <div
                          key={ext.id}
                          className="py-1 first:pt-0 last:pb-0 flex items-center justify-between gap-1.5 text-[11px]"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setF1TopicId(`ext:${ext.id}`);
                              setActiveTab('diagnostics-f1');
                            }}
                            title={ext.displayTitleRu}
                            className="font-mono font-medium text-[var(--tz-link)] hover:underline truncate text-left"
                          >
                            {ext.shortBadgeRu}
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            {onOpenExtensionWorkshop && (
                              <button
                                type="button"
                                data-testid={`inspector-open-ext-workshop-${ext.id}`}
                                onClick={() => onOpenExtensionWorkshop(ext.id)}
                                className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] text-[10px] whitespace-nowrap"
                              >
                                Мастерская
                              </button>
                            )}
                            {onOpenManualAnchor && (
                              <button
                                type="button"
                                data-testid={`inspector-open-ext-pdf-${ext.id}`}
                                onClick={() => onOpenManualAnchor(extAnchor.id)}
                                title={`Открыть оригинальный мануал пакета (${extAnchor.section}, стр. ${extAnchor.page})`}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--tz-inset)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-outline)] font-mono tabular-nums text-[10px] whitespace-nowrap"
                              >
                                <BookOpen className="w-2.5 h-2.5" />
                                <span>стр.{extAnchor.page}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {connectedLibraries.length > 0 && (
                <div className="flex items-center justify-between gap-2 text-[10.5px] text-[var(--tz-muted)]">
                  <span>Библиотеки TikZ:</span>
                  <span className="font-mono text-[var(--tz-text)] truncate">
                    {connectedLibraries.join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Single-Primitive CAD Inspector OR Clean Disclosure Button when nothing is selected */}
          {isEmptySelectMode && (
            <button
              type="button"
              data-testid="inspector-toggle-manual-insert-btn"
              aria-expanded={showEmptyCoordForm}
              onClick={() => setShowEmptyCoordForm((v) => !v)}
              className="w-full px-3 py-2 border-b border-[var(--tz-outline)] text-left text-[11px] font-medium text-[var(--tz-link)] hover:bg-[var(--tz-hover)] flex items-center justify-between gap-2 transition-colors"
            >
              <span>
                {showEmptyCoordForm
                  ? '− Скрыть ввод по координатам'
                  : '+ Вставить примитив по точным координатам'}
              </span>
              <span className="text-[10px] font-mono text-[var(--tz-muted)]">
                {toolSpec.shortLabelRu}
              </span>
            </button>
          )}
          {(!isEmptySelectMode || showEmptyCoordForm) && (
            <form
              onSubmit={handleSubmit}
              className={`p-3 border-b border-[var(--tz-outline)] ${
                highlightedZone === 'inspector' ? 'ring-2 ring-inset ring-sky-500' : ''
              }`}
            >
              {isEmptySelectMode && (
                <div className="mb-2.5 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[var(--tz-muted)]">Тип фигуры:</span>
                  <select
                    aria-label="Тип создаваемого примитива по координатам"
                    value={manualInsertToolId}
                    onChange={(e) => setManualInsertToolId(e.target.value as ToolId)}
                    className="px-2 py-0.5 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] text-xs font-medium"
                  >
                    {PRIMITIVE_TOOLS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titleRu}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h2 className="text-xs font-semibold text-[var(--tz-text)] truncate">
                    {selectedPrimitive
                      ? `#${selectedPrimitive.id} ${toolSpec.titleRu}`
                      : `Новый объект · ${toolSpec.titleRu}`}
                  </h2>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    {selectedPrimitive ? (
                      <>
                        Строка {selectedPrimitive.lineNumber}
                    {isDirtyDraft && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span className="text-amber-500 font-medium">Черновик изменён</span>
                      </>
                    )}
                    {selectedPrimitive.values.group_id && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono text-[var(--tz-link)]">
                          grp:{selectedPrimitive.values.group_id}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  'Задайте координаты для вставки в tikzpicture'
                )}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {selectedPrimitive && (
                <button
                  type="button"
                  data-testid="inspector-autostep-btn"
                  onClick={() => setAutoApplySteps((v) => !v)}
                  aria-pressed={autoApplySteps}
                  title="Мгновенно записывать шаги кнопок −/+ и стилей в .tex"
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10.5px] rounded border transition-colors ${
                    autoApplySteps
                      ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                      : 'bg-[var(--tz-button)] text-[var(--tz-muted)] border-[var(--tz-outline)]'
                  }`}
                >
                  <Zap className="w-2.5 h-2.5" />
                  <span>Автошаг</span>
                </button>
              )}

              {onOpenManualAnchor && (
                <button
                  type="button"
                  onClick={() => onOpenManualAnchor(resolveManualAnchorForTool(effectiveToolId).id)}
                  title="Открыть точную секцию и страницу этого примитива в оригинальном PDF-мануале"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10.5px] rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-outline)] whitespace-nowrap"
                >
                  <BookOpen className="w-2.5 h-2.5" />
                  <span>PDF §{toolSpec.manualSection}</span>
                </button>
              )}

              {selectedPrimitive && isDirtyDraft && (
                <button
                  type="button"
                  onClick={handleResetDraft}
                  title="Отменить несохранённые правки черновика"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10.5px] rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] border border-[var(--tz-outline)] whitespace-nowrap"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Сброс</span>
                </button>
              )}
            </div>
          </div>

          {/* Compact Single-Row Object Actions */}
          {selectedPrimitive && (
            <div
              data-testid="inspector-object-actions-row"
              className="mb-2.5 flex flex-wrap items-center gap-1 text-[10.5px]"
            >
              <button
                type="button"
                onClick={() => onJumpToLine(selectedPrimitive.lineNumber)}
                title={`Перейти к строке ${selectedPrimitive.lineNumber} в коде рисунка`}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap"
              >
                <span>Стр.{selectedPrimitive.lineNumber}</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={onDuplicateSelected}
                title="Дублировать выбранный объект"
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap"
              >
                <Copy className="w-2.5 h-2.5" />
                <span>Копия</span>
              </button>
              {onSampleStyleFromPrimitive && (
                <button
                  type="button"
                  onClick={() => onSampleStyleFromPrimitive(selectedPrimitive.id)}
                  title="Скопировать паспорт стиля объекта"
                  className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-outline)] whitespace-nowrap"
                >
                  Стиль
                </button>
              )}
              {copiedStylePassport && onApplyCopiedStyleToIds && (
                <button
                  type="button"
                  onClick={() => onApplyCopiedStyleToIds([selectedPrimitive.id])}
                  title={`Применить стиль от #${copiedStylePassport.sourcePrimitiveId}`}
                  className="px-1.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/40 whitespace-nowrap"
                >
                  Вст. #{copiedStylePassport.sourcePrimitiveId}
                </button>
              )}
              <button
                type="button"
                onClick={() => onDetachPrimitive(selectedPrimitive.id)}
                title="Снять маркер % tikzarium:n1: и оставить чистую ручную команду TikZ"
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap"
              >
                <Unlink className="w-2.5 h-2.5" />
                <span>В TikZ</span>
              </button>
              <button
                type="button"
                onClick={onDeleteSelected}
                aria-label="Удалить выбранный объект"
                title="Удалить выбранный объект (Delete)"
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-rose-500/15 text-rose-400 border border-[var(--tz-outline)] whitespace-nowrap"
              >
                <Trash2 className="w-2.5 h-2.5" />
                <span>Удал.</span>
              </button>
            </div>
          )}

          {/* Proactive library guard BEFORE build failure */}
          {effectiveToolId === 'arrow' && !arrowsMetaLoaded && (
            <div className="mb-2.5 p-2 rounded border border-amber-500/40 bg-amber-500/10 text-[11px] flex items-center justify-between gap-2">
              <span className="text-[var(--tz-text)]">
                Наконечник <code className="font-mono">Stealth</code> требует <code className="font-mono">arrows.meta</code>.
              </span>
              <button
                type="button"
                onClick={() => onQuickConnectLibrary('arrows.meta')}
                className="px-2 py-0.5 font-medium rounded bg-[var(--tz-accent)] text-white hover:opacity-95 whitespace-nowrap shrink-0"
              >
                Подключить
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {toolSpec.parameters.map((param) => {
              const val = draftValues[param.id] ?? param.defaultValue;
              const err = validationErrors[param.id];
              const isFullWidth = param.kind === 'text' || param.kind === 'choice';

              if (param.kind === 'dimension') {
                const { numPart, unitPart } = splitDimensionValue(val, param.units[0] ?? 'cm');
                return (
                  <div key={param.id} className="flex flex-col gap-1">
                    <label
                      htmlFor={`param-${param.id}`}
                      title={`Параметр TikZ: ${param.id}`}
                      className="text-[11px] font-medium text-[var(--tz-text)] truncate"
                    >
                      {param.labelRu}
                    </label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={(e) =>
                          applyStepToParam(param.id, val, -1, e.shiftKey, Boolean(param.positive))
                        }
                        aria-label={`Уменьшить ${param.labelRu}`}
                        className="px-1.5 py-1 text-xs rounded-l bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-r-0 border-[var(--tz-outline)]"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <input
                        id={`param-${param.id}`}
                        type="text"
                        value={numPart}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            applyStepToParam(
                              param.id,
                              val,
                              e.key === 'ArrowUp' ? 1 : -1,
                              e.shiftKey,
                              Boolean(param.positive)
                            );
                          }
                        }}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (/(pt|mm|cm|in)$/.test(raw) || /[\\{}\[\]]/.test(raw)) {
                            setDraftValues((prev) => ({ ...prev, [param.id]: raw }));
                          } else {
                            setDraftValues((prev) => ({ ...prev, [param.id]: `${raw}${unitPart}` }));
                          }
                        }}
                        className={`w-full min-w-0 px-1.5 py-1 text-xs font-mono tabular-nums text-center bg-[var(--tz-window)] text-[var(--tz-text)] border ${
                          err ? 'border-rose-500' : 'border-[var(--tz-outline)]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={(e) =>
                          applyStepToParam(param.id, val, 1, e.shiftKey, Boolean(param.positive))
                        }
                        aria-label={`Увеличить ${param.labelRu}`}
                        className="px-1.5 py-1 text-xs bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-l-0 border-[var(--tz-outline)]"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                      <select
                        aria-label={`Единица измерения для ${param.labelRu}`}
                        value={unitPart}
                        onChange={(e) => {
                          const nextUnit = e.target.value;
                          setDraftValues((prev) => ({ ...prev, [param.id]: `${numPart}${nextUnit}` }));
                        }}
                        className="px-1 py-1 text-[11px] font-mono rounded-r bg-[var(--tz-button)] text-[var(--tz-text)] border border-l-0 border-[var(--tz-outline)]"
                      >
                        {param.units.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    {err && <span className="text-[10px] text-rose-500 leading-tight">{err}</span>}
                  </div>
                );
              }

              if (param.kind === 'choice') {
                return (
                  <div key={param.id} className={isFullWidth ? 'col-span-2 flex flex-col gap-1' : 'flex flex-col gap-1'}>
                    <label
                      htmlFor={`param-${param.id}`}
                      title={`Параметр TikZ: ${param.id}`}
                      className="text-[11px] font-medium text-[var(--tz-text)] truncate"
                    >
                      {param.labelRu}
                    </label>
                    <select
                      id={`param-${param.id}`}
                      value={val}
                      onChange={(e) => updateOptionalField(param.id, e.target.value)}
                      className="w-full px-2 py-1 text-xs font-mono rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)]"
                    >
                      {param.allowedValues.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={param.id} className="col-span-2 flex flex-col gap-1">
                  <label
                    htmlFor={`param-${param.id}`}
                    title={`Параметр TikZ: ${param.id}`}
                    className="text-[11px] font-medium text-[var(--tz-text)] truncate"
                  >
                    {param.labelRu}
                  </label>
                  <input
                    id={`param-${param.id}`}
                    type="text"
                    value={val}
                    onChange={(e) => setDraftValues((prev) => ({ ...prev, [param.id]: e.target.value }))}
                    className={`w-full px-2 py-1 text-xs font-mono rounded bg-[var(--tz-window)] text-[var(--tz-text)] border ${
                      err ? 'border-rose-500' : 'border-[var(--tz-outline)]'
                    }`}
                  />
                  {/* P08: Quick math symbol insert buttons for node content */}
                  {effectiveToolId === 'node' && param.id === 'content' && (
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      {['\\alpha', '\\lambda', '\\omega', '\\Delta', '\\frac{a}{b}', '\\text{}'].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() =>
                            setDraftValues((prev) => ({
                              ...prev,
                              content: `${prev.content ?? ''}${sym}`,
                            }))
                          }
                          className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)]"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  )}
                  {err && <span className="text-[10px] text-rose-500 leading-tight">{err}</span>}
                </div>
              );
            })}
          </div>

          {/* Node Symbolic ID & Anchor */}
          {effectiveToolId === 'node' && (
            <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-[var(--tz-outline)]">
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-medium text-[var(--tz-muted)]">
                  Имя узла (напр. L1)
                </label>
                <input
                  type="text"
                  value={draftValues.node_id ?? ''}
                  onChange={(e) => updateOptionalField('node_id', e.target.value, false)}
                  placeholder="L1"
                  aria-label="Символическое имя узла TikZ"
                  className="px-2 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                />
                {validationErrors.node_id && (
                  <span className="text-[10px] text-rose-500">{validationErrors.node_id}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-medium text-[var(--tz-muted)]">
                  Якорь подписи
                </label>
                <select
                  aria-label="Якорь узла TikZ"
                  value={draftValues.anchor ?? ''}
                  onChange={(e) => updateOptionalField('anchor', e.target.value)}
                  className="px-2 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                >
                  {ALLOWED_NODE_ANCHORS.map((anc) => (
                    <option key={anc || 'center-default'} value={anc}>
                      {anc || 'center (по умолч.)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Logical Smart Connectors for Arrows & Lines */}
          {(effectiveToolId === 'arrow' || effectiveToolId === 'line') && namedNodes.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-[var(--tz-outline)]">
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-medium text-[var(--tz-muted)]">
                  От узла
                </label>
                <select
                  aria-label="Привязать начало к именованному узлу"
                  value={draftValues.from_node ?? ''}
                  onChange={(e) => updateOptionalField('from_node', e.target.value)}
                  className="px-2 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                >
                  <option value="">Координаты (x,y)</option>
                  {namedNodes.map((nn) => (
                    <option key={`from-${nn.nodeId}`} value={nn.nodeId}>
                      ({nn.nodeId}) {nn.content}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-medium text-[var(--tz-muted)]">
                  К узлу
                </label>
                <select
                  aria-label="Привязать конец к именованному узлу"
                  value={draftValues.to_node ?? ''}
                  onChange={(e) => updateOptionalField('to_node', e.target.value)}
                  className="px-2 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                >
                  <option value="">Координаты (x,y)</option>
                  {namedNodes.map((nn) => (
                    <option key={`to-${nn.nodeId}`} value={nn.nodeId}>
                      ({nn.nodeId}) {nn.content}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* SMART CONDITIONAL APPLY BUTTON: hidden when Auto-step is active & synced */}
          {(!selectedPrimitive || !autoApplySteps || isDirtyDraft || hasErrors) && (
            <div className="mt-2.5">
              <button
                type="submit"
                data-testid="inspector-apply-btn"
                disabled={hasErrors || Boolean(selectedPrimitive && !isDirtyDraft)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-accent)] text-white hover:opacity-95 disabled:opacity-45 disabled:cursor-not-allowed transition-opacity whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {selectedPrimitive
                    ? 'Применить к исходнику'
                    : `Добавить «${toolSpec.shortLabelRu}» в .tex`}
                </span>
              </button>
            </div>
          )}

          {/* OPEN-BY-DEFAULT 2-COLUMN VISUAL STYLE SECTION */}
          <div
            data-testid="inspector-style-section"
            className="mt-3 pt-2.5 border-t border-[var(--tz-outline)]"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold text-[var(--tz-text)]">
                Стиль линии и заливки
              </span>
              {onOpenWorkshopsHub && (
                <button
                  type="button"
                  onClick={() => onOpenWorkshopsHub('preamble-diff')}
                  className="text-[10.5px] text-[var(--tz-link)] hover:underline whitespace-nowrap"
                >
                  +\tikzset в преамбуле
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {effectiveToolId !== 'node' && (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10.5px] text-[var(--tz-muted)]">Толщина</span>
                    <select
                      aria-label="Толщина штриха TikZ"
                      value={draftValues.stroke_width ?? ''}
                      onChange={(e) => updateOptionalField('stroke_width', e.target.value)}
                      className="px-1.5 py-1 text-xs rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    >
                      {ALLOWED_STROKE_WIDTHS.map((w) => (
                        <option key={w || 'def-w'} value={w}>
                          {STROKE_WIDTH_LABELS_RU[w] ?? (w || 'По умолч.')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10.5px] text-[var(--tz-muted)]">Пунктир</span>
                    <select
                      aria-label="Стиль линии TikZ"
                      value={draftValues.line_style ?? ''}
                      onChange={(e) => updateOptionalField('line_style', e.target.value)}
                      className="px-1.5 py-1 text-xs rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    >
                      {ALLOWED_LINE_STYLES.map((ls) => (
                        <option key={ls || 'def-ls'} value={ls}>
                          {LINE_STYLE_LABELS_RU[ls] ?? (ls || 'Сплошная')}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-[10.5px] text-[var(--tz-muted)]">Цвет штриха</span>
                <select
                  aria-label="Цвет контура TikZ"
                  value={draftValues.stroke_color ?? ''}
                  onChange={(e) => updateOptionalField('stroke_color', e.target.value)}
                  className="px-1.5 py-1 text-xs rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                >
                  {ALLOWED_STROKE_COLORS.map((sc) => (
                    <option key={sc || 'def-sc'} value={sc}>
                      {STROKE_COLOR_LABELS_RU[sc] ?? (sc || 'Чёрный')}
                    </option>
                  ))}
                </select>
              </div>

              {(effectiveToolId === 'rectangle' ||
                effectiveToolId === 'circle' ||
                effectiveToolId === 'node' ||
                draftValues.poly_closed === 'cycle') && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10.5px] text-[var(--tz-muted)]">Заливка</span>
                  <select
                    aria-label="Цвет заливки TikZ"
                    value={draftValues.fill_color ?? ''}
                    onChange={(e) => updateOptionalField('fill_color', e.target.value)}
                    className="px-1.5 py-1 text-xs rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                  >
                    {ALLOWED_FILL_COLORS.map((fc) => (
                      <option key={fc || 'def-fc'} value={fc}>
                        {FILL_COLOR_LABELS_RU[fc] ?? (fc || 'Без заливки')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(effectiveToolId === 'rectangle' || draftValues.poly_points) && (
                <div className="col-span-2 flex flex-col gap-1">
                  <span className="text-[10.5px] text-[var(--tz-muted)]">
                    Скругление углов (rounded corners)
                  </span>
                  <select
                    aria-label="Скругление углов прямоугольника или полигона TikZ"
                    value={draftValues.rounded_corners ?? ''}
                    onChange={(e) => updateOptionalField('rounded_corners', e.target.value)}
                    className="px-1.5 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                  >
                    {ALLOWED_ROUNDED_CORNERS_OPTIONS.map((rc) => (
                      <option key={rc || 'sharp-rc'} value={rc}>
                        {rc || 'острые углы (0pt)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(effectiveToolId === 'rectangle' ||
                effectiveToolId === 'circle' ||
                draftValues.poly_closed === 'cycle') && (
                <div className="col-span-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2 text-[10.5px]">
                    <span className="text-[var(--tz-muted)]">Штриховка ГОСТ 2.306</span>
                    <span className="font-mono text-[10px] text-[var(--tz-muted)]">
                      {connectedLibraries.includes('patterns')
                        ? 'patterns ✓'
                        : '+patterns в преамбулу'}
                    </span>
                  </div>
                  <select
                    aria-label="Векторная штриховка ГОСТ TikZ"
                    value={draftValues.hatch_pattern ?? ''}
                    onChange={(e) => updateOptionalField('hatch_pattern', e.target.value)}
                    className="px-1.5 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                  >
                    {ALLOWED_HATCH_PATTERNS.map((hp) => {
                      const spec = GOST_HATCH_SPECS.find((s) => s.id === hp);
                      return (
                        <option key={hp || 'no-hatch'} value={hp}>
                          {spec ? `${spec.labelRu}` : hp || 'без штриховки'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {(effectiveToolId === 'line' || effectiveToolId === 'arrow') &&
                !draftValues.poly_points && (
                  <div className="col-span-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-[10.5px]">
                      <span className="text-[var(--tz-muted)]">Декорация пути (скобка / волна)</span>
                      <span className="font-mono text-[10px] text-[var(--tz-muted)]">
                        {connectedLibraries.includes('decorations.pathreplacing') ||
                        connectedLibraries.includes('decorations.pathmorphing')
                          ? 'decorations ✓'
                          : '+decorations в преамбулу'}
                      </span>
                    </div>
                    <select
                      aria-label="Декорация пути TikZ"
                      value={draftValues.decoration_kind ?? ''}
                      onChange={(e) => updateOptionalField('decoration_kind', e.target.value)}
                      className="px-1.5 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    >
                      {ALLOWED_DECORATION_KINDS.map((dk) => {
                        const spec = PATH_DECORATION_SPECS.find((s) => s.id === dk);
                        return (
                          <option key={dk || 'no-decor'} value={dk}>
                            {spec ? spec.labelRu : dk || 'без декорации'}
                          </option>
                        );
                      })}
                    </select>
                    {(draftValues.decoration_kind === 'brace' ||
                      draftValues.decoration_kind === 'brace-mirror') && (
                      <input
                        type="text"
                        value={draftValues.decoration_label ?? ''}
                        onChange={(e) => updateOptionalField('decoration_label', e.target.value, false)}
                        placeholder="Подпись скобки, напр. L_0 = 2.4\,\text{см}"
                        aria-label="Подпись фигурной скобки"
                        className="px-2 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                      />
                    )}
                  </div>
                )}

              <div className="flex flex-col gap-1">
                <span className="text-[10.5px] text-[var(--tz-muted)]">Стиль \tikzset</span>
                <select
                  data-testid="inspector-custom-tikz-style-select"
                  aria-label="Пользовательский стиль tikzset из преамбулы документа"
                  value={draftValues.custom_style ?? ''}
                  onChange={(e) => updateOptionalField('custom_style', e.target.value)}
                  className="px-1.5 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                >
                  <option value="">нет</option>
                  {draftValues.custom_style &&
                    !preambleStyles.some((ps) => ps.name === draftValues.custom_style) && (
                      <option value={draftValues.custom_style}>
                        {draftValues.custom_style}
                      </option>
                    )}
                  {preambleStyles.map((ps) => (
                    <option key={ps.name} value={ps.name}>
                      {ps.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-1 text-[10.5px]">
                  <span className="text-[var(--tz-muted)]">Слой</span>
                  {onOpenLayersModal && (
                    <button
                      type="button"
                      onClick={onOpenLayersModal}
                      className="text-[10px] text-[var(--tz-link)] hover:underline"
                    >
                      слои
                    </button>
                  )}
                </div>
                <select
                  aria-label="Логический слой чертежа"
                  value={draftValues.layer_id ?? ''}
                  onChange={(e) => updateOptionalField('layer_id', e.target.value)}
                  className="px-1.5 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                >
                  {ALLOWED_LAYER_IDS.map((lid) => {
                    const spec = CAD_LAYERS.find((l) => l.id === lid);
                    return (
                      <option key={lid || 'auto-layer'} value={lid}>
                        {spec ? spec.shortRu : 'авто'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {(isBeamerActive || Boolean(draftValues.beamer_spec)) && (
                <div className="col-span-2 flex flex-col gap-1">
                  <span className="text-[10.5px] text-[var(--tz-muted)]">Слайд Beamer</span>
                  <select
                    aria-label="Оверлей слайда презентации Beamer"
                    value={draftValues.beamer_spec ?? ''}
                    onChange={(e) => updateOptionalField('beamer_spec', e.target.value)}
                    className="px-1.5 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                  >
                    {ALLOWED_BEAMER_SPECS.map((bs) => (
                      <option key={bs || 'all-slides'} value={bs}>
                        {bs ? `<${bs}>` : 'все кадры'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Orthogonal Routing, Polar/Relative Coordinates & Dimension Callout for lines/arrows */}
          {(effectiveToolId === 'line' || effectiveToolId === 'arrow') && (
            <details
              className="mt-2.5 pt-2 border-t border-[var(--tz-outline)]"
              open={Boolean(draftValues.routing || draftValues.coord_mode || draftValues.callout)}
            >
              <summary className="cursor-pointer text-[11px] font-medium text-[var(--tz-link)] select-none">
                Трассировка, координаты и выноска
              </summary>
              <div className="mt-2 flex flex-col gap-2 text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10.5px] text-[var(--tz-muted)]">Трасса</span>
                    <select
                      aria-label="Режим трассировки линии TikZ"
                      value={draftValues.routing ?? ''}
                      onChange={(e) => updateOptionalField('routing', e.target.value)}
                      className="px-1.5 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    >
                      {ALLOWED_ROUTING_MODES.map((rm) => (
                        <option key={rm || 'def-rm'} value={rm}>
                          {rm === '|-'
                            ? '|- (верт. → гориз.)'
                            : rm === '-|'
                              ? '-| (гориз. → верт.)'
                              : rm === '--'
                                ? '-- (прямая)'
                                : '-- по умолч.'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10.5px] text-[var(--tz-muted)]">Скругление угла</span>
                    <select
                      aria-label="Скругление ортогонального изгиба TikZ"
                      value={draftValues.rounded_corners ?? ''}
                      onChange={(e) => updateOptionalField('rounded_corners', e.target.value)}
                      className="px-1.5 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    >
                      <option value="">острый угол</option>
                      <option value="2pt">2pt</option>
                      <option value="3pt">3pt</option>
                      <option value="5pt">5pt</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10.5px] text-[var(--tz-muted)]">Запись 2-й точки в .tex</span>
                  <select
                    aria-label="Система координат конечной точки TikZ"
                    value={draftValues.coord_mode ?? ''}
                    onChange={(e) => updateOptionalField('coord_mode', e.target.value)}
                    className="px-1.5 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                  >
                    {ALLOWED_COORD_MODES.map((cm) => (
                      <option key={cm || 'def-cm'} value={cm}>
                        {cm === 'relative'
                          ? 'Относительная ++(dx,dy)'
                          : cm === 'polar'
                            ? 'Полярная +(θ:r)'
                            : 'Декартова (x,y)'}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const notations = describeCoordinateNotations(draftValues);
                    const mode = draftValues.coord_mode || 'cartesian';
                    const previewText =
                      mode === 'polar'
                        ? notations.polar
                        : mode === 'relative'
                          ? notations.relative
                          : notations.cartesian;
                    return (
                      <div className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[10px] text-[var(--tz-syn-cmd)] truncate">
                        {previewText}
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-1 border-t border-[var(--tz-outline)] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] text-[var(--tz-muted)]">Размерная выноска ГОСТ |&lt;-&gt;|</span>
                    {selectedPrimitive ? (
                      <button
                        type="button"
                        onClick={() => onToggleCallout(selectedPrimitive.id)}
                        className={`px-2 py-0.5 rounded border text-[10.5px] font-mono whitespace-nowrap ${
                          draftValues.callout === 'dim'
                            ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                            : 'bg-[var(--tz-button)] text-[var(--tz-muted)] border-[var(--tz-outline)]'
                        }`}
                      >
                        {draftValues.callout === 'dim' ? 'Выноска: ВКЛ' : 'Сделать выноской'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          updateOptionalField('callout', draftValues.callout === 'dim' ? '' : 'dim', false)
                        }
                        className={`px-2 py-0.5 rounded border text-[10.5px] font-mono whitespace-nowrap ${
                          draftValues.callout === 'dim'
                            ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                            : 'bg-[var(--tz-button)] text-[var(--tz-muted)] border-[var(--tz-outline)]'
                        }`}
                      >
                        {draftValues.callout === 'dim' ? 'Выноска: ВКЛ' : 'Выноска: ВЫКЛ'}
                      </button>
                    )}
                  </div>
                  {draftValues.callout === 'dim' && (
                    <input
                      type="text"
                      value={draftValues.callout_label ?? ''}
                      onChange={(e) => updateOptionalField('callout_label', e.target.value, false)}
                      placeholder="Авто-длина или формула, напр. f_1 = 2.5\,\text{см}"
                      aria-label="Подпись размерной выноски LaTeX"
                      className="px-2 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    />
                  )}
                  {validationErrors.callout_label && (
                    <span className="text-[10px] text-rose-500">{validationErrors.callout_label}</span>
                  )}
                </div>
              </div>
            </details>
          )}
            </form>
          )}
        </>
      )}

            {/* SECONDARY COLLAPSIBLE ACCORDION: Z-Order, Transforms, Contour Metrics & Snippets */}
            <details
              data-testid="inspector-secondary-cad-accordion"
              className="p-3 border-b border-[var(--tz-outline)] bg-[var(--tz-inset)]/30 text-xs"
              open={selectedPrimitives.length >= 2}
            >
              <summary className="cursor-pointer text-[11px] font-medium text-[var(--tz-muted)] hover:text-[var(--tz-text)] select-none flex items-center justify-between gap-2">
                <span>Трансформации, порядок Z и метрики</span>
                {selectionGeometryMetrics && (
                  <span className="font-mono tabular-nums text-[10px] text-[var(--tz-link)]">
                    {selectionGeometryMetrics.hasClosedArea
                      ? `S=${selectionGeometryMetrics.areaCm2.toFixed(2)} см²`
                      : `L=${selectionGeometryMetrics.totalLengthCm.toFixed(2)} см`}
                  </span>
                )}
              </summary>

              <div className="mt-2.5 flex flex-col gap-2.5">
                {selectedPrimitive && selectedPrimitives.length < 2 && (
                  <>
                    <div className="flex items-center justify-between gap-1 text-[10.5px] text-[var(--tz-muted)]">
                      <span>Порядок Z:</span>
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onReorderPrimitive(selectedPrimitive.id, 'back')}
                          title="Переместить в самое начало tikzpicture (задний план)"
                          aria-label="Слой: на задний план"
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)]"
                        >
                          <ArrowDownToLine className="w-2.5 h-2.5" />
                          <span>В низ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onReorderPrimitive(selectedPrimitive.id, 'backward')}
                          title="На один слой ниже"
                          aria-label="Слой: ниже"
                          className="p-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)]"
                        >
                          <ArrowDown className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onReorderPrimitive(selectedPrimitive.id, 'forward')}
                          title="На один слой выше"
                          aria-label="Слой: выше"
                          className="p-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)]"
                        >
                          <ArrowUp className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onReorderPrimitive(selectedPrimitive.id, 'front')}
                          title="Переместить в конец tikzpicture (передний план)"
                          aria-label="Слой: на передний план"
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)]"
                        >
                          <ArrowUpToLine className="w-2.5 h-2.5" />
                          <span>Наверх</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10.5px] text-[var(--tz-muted)]">
                      <span>Геометрия:</span>
                      <div className="inline-flex flex-wrap items-center gap-1 font-mono tabular-nums">
                        {((effectiveToolId !== 'circle' && effectiveToolId !== 'node') ||
                          Boolean(draftValues.poly_points)) && (
                          <>
                            <button
                              type="button"
                              onClick={() => onRotatePrimitives([selectedPrimitive.id], -45)}
                              title="Повернуть на −45°"
                              className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)]"
                            >
                              ↺−45°
                            </button>
                            <button
                              type="button"
                              onClick={() => onRotatePrimitives([selectedPrimitive.id], 45)}
                              title="Повернуть на +45°"
                              className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)]"
                            >
                              ↻+45°
                            </button>
                            <button
                              type="button"
                              onClick={() => onMirrorPrimitives([selectedPrimitive.id], 'x')}
                              title="Зеркально отразить по X"
                              className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)]"
                            >
                              ⇄X
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onScalePrimitives([selectedPrimitive.id], 1.25)}
                          title="Масштабировать ×1.25"
                          className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)]"
                        >
                          ×1.25
                        </button>
                        <button
                          type="button"
                          onClick={onOpenForeachModal}
                          title="Размножить примитив в параметрический цикл \foreach"
                          className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-outline)]"
                        >
                          \foreach…
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {selectionGeometryMetrics && (
                  <div
                    data-testid="inspector-geometry-metrics-card"
                    className="p-2 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[var(--tz-text)]">
                        Метрики контура
                      </span>
                      {onInsertCentroidMarker && (
                        <button
                          type="button"
                          data-testid="inspector-insert-centroid-btn"
                          onClick={onInsertCentroidMarker}
                          title="Вставить перекрестие и метку центра масс C в чертёж"
                          className="px-2 py-0.5 text-[10.5px] font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-outline)] whitespace-nowrap"
                        >
                          +Центр масс C
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums">
                      <div className="text-[var(--tz-muted)]">
                        Длина L:{' '}
                        <span className="text-[var(--tz-text)] font-medium">
                          {selectionGeometryMetrics.totalLengthCm.toFixed(2)} см
                        </span>
                      </div>
                      <div className="text-[var(--tz-muted)]">
                        Габарит:{' '}
                        <span className="text-[var(--tz-text)] font-medium">
                          {selectionGeometryMetrics.bboxCm.width.toFixed(2)}×
                          {selectionGeometryMetrics.bboxCm.height.toFixed(2)} см
                        </span>
                      </div>
                      {selectionGeometryMetrics.hasClosedArea && (
                        <>
                          <div className="text-[var(--tz-muted)]">
                            Площадь S:{' '}
                            <span className="text-emerald-500 font-semibold">
                              {selectionGeometryMetrics.areaCm2.toFixed(2)} см²
                            </span>
                          </div>
                          <div className="text-[var(--tz-muted)]">
                            Периметр P:{' '}
                            <span className="text-[var(--tz-text)]">
                              {selectionGeometryMetrics.perimeterCm.toFixed(2)} см
                            </span>
                          </div>
                        </>
                      )}
                      <div className="col-span-2 text-[var(--tz-muted)]">
                        Центр C:{' '}
                        <span className="text-[var(--tz-text)]">
                          ({selectionGeometryMetrics.centroidCm.x.toFixed(2)},{' '}
                          {selectionGeometryMetrics.centroidCm.y.toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {onOpenSnippetsModal && (
                  <button
                    type="button"
                    onClick={onOpenSnippetsModal}
                    className="w-full px-2.5 py-1 text-[11px] font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] text-center"
                  >
                    Пользовательские заготовки и сниппеты
                  </button>
                )}
              </div>
            </details>

            {diagnostics.length > 0 && (
              <div className="px-3 py-2 border-b border-[var(--tz-outline)] bg-amber-500/10 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-amber-500 font-medium font-mono tabular-nums">
                  Диагностика TeX: {diagnostics.length} замечаний
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('diagnostics-f1')}
                  className="text-[var(--tz-link)] hover:underline font-medium whitespace-nowrap"
                >
                  Открыть проверку →
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'layers-objects' && (
          <div
            data-testid="inspector-layers-objects-pane"
            className="flex flex-col divide-y divide-[var(--tz-outline)] text-xs"
          >
            {/* 1. Photoshop-Style Composite Layer & Tracing Stack */}
            <div className="p-3 bg-[var(--tz-panel)] flex flex-col gap-2.5">
              {(() => {
                const activeOpacityPct = Math.round(
                  (selectedLayerTarget === 'pdf'
                    ? (pdfUnderlay?.opacity ?? 0.72)
                    : selectedLayerTarget === 'vector'
                      ? compositeLayers.vectorOpacity
                      : selectedLayerTarget === 'reference'
                        ? compositeLayers.referenceOpacity
                        : compositeLayers.gridOpacity) * 100
                );
                const layerTargetLabelRu =
                  selectedLayerTarget === 'pdf'
                    ? 'Калька PDF 1:1'
                    : selectedLayerTarget === 'vector'
                      ? 'Векторный чертёж'
                      : selectedLayerTarget === 'reference'
                        ? 'Калька-скан (PNG)'
                        : 'Сетка листа';

                const applyActiveLayerOpacityPct = (pct: number) => {
                  const clamped = Math.max(0, Math.min(100, pct)) / 100;
                  if (selectedLayerTarget === 'pdf') {
                    onChangePdfUnderlayOpacity?.(clamped);
                  } else if (selectedLayerTarget === 'vector') {
                    onChangeCompositeLayers?.({ vectorOpacity: clamped });
                  } else if (selectedLayerTarget === 'reference') {
                    onChangeCompositeLayers?.({ referenceOpacity: clamped });
                  } else {
                    onChangeCompositeLayers?.({ gridOpacity: clamped });
                  }
                };

                return (
                  <div
                    data-testid="photoshop-layer-opacity-bar"
                    className="p-2 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-[var(--tz-muted)] truncate">
                        Непрозрачность ·{' '}
                        <strong className="text-[var(--tz-text)] font-medium">
                          {layerTargetLabelRu}
                        </strong>
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-[var(--tz-link)] shrink-0">
                        {activeOpacityPct}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        aria-label={`Непрозрачность слоя ${layerTargetLabelRu}`}
                        value={activeOpacityPct}
                        onChange={(e) => applyActiveLayerOpacityPct(Number(e.target.value))}
                        className="flex-1 h-1.5 accent-[var(--tz-accent)] cursor-pointer"
                      />
                      <div className="inline-flex items-center gap-0.5 font-mono tabular-nums text-[10px]">
                        {[35, 65, 100].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => applyActiveLayerOpacityPct(preset)}
                            className={`px-1 py-0.5 rounded border ${
                              Math.abs(activeOpacityPct - preset) <= 2
                                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                                : 'bg-[var(--tz-inset)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Z-Ordered Composite Stack (Top -> Bottom, like Photoshop Layers) */}
              <div
                role="list"
                aria-label="Композитные слои холста и кальки"
                className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] divide-y divide-[var(--tz-outline)] overflow-hidden"
              >
                {/* Z4 (Top): Interactive Vector Sketch + CAD Sublayers */}
                <div role="listitem" className="flex flex-col">
                  <div
                    onClick={() => setSelectedLayerTarget('vector')}
                    className={`px-2 py-1.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      selectedLayerTarget === 'vector'
                        ? 'bg-[var(--tz-active)]/60'
                        : 'hover:bg-[var(--tz-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeCompositeLayers?.({
                            vectorVisible: !compositeLayers.vectorVisible,
                          });
                        }}
                        aria-label="Показать или скрыть интерактивный векторный чертёж"
                        className={`p-1 rounded border ${
                          compositeLayers.vectorVisible
                            ? 'text-[var(--tz-text)] border-[var(--tz-outline)] bg-[var(--tz-panel)]'
                            : 'text-[var(--tz-muted)] border-transparent opacity-60'
                        }`}
                      >
                        {compositeLayers.vectorVisible ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-medium text-[var(--tz-text)] truncate">
                          Интерактивный чертёж
                        </div>
                        <div className="text-[10px] text-[var(--tz-muted)] truncate">
                          Ручки, пакеты и геометрия ({ownedPrimitives.length + packageObjects.length})
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCadSublayers((v) => !v);
                        }}
                        className="px-1.5 py-0.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] hover:bg-[var(--tz-hover)] text-[10px] text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
                      >
                        Подслои {showCadSublayers ? '▴' : '▾'}
                      </button>
                      <span className="font-mono tabular-nums text-[10.5px] text-[var(--tz-muted)] w-8 text-right">
                        {Math.round(compositeLayers.vectorOpacity * 100)}%
                      </span>
                    </div>
                  </div>

                  {showCadSublayers && (
                    <div className="px-2.5 py-1.5 bg-[var(--tz-inset)] border-t border-[var(--tz-outline)]/60 grid grid-cols-2 gap-1">
                      {CAD_LAYERS.map((layer) => {
                        const isHidden = hiddenLayers.includes(layer.id);
                        const isLocked = lockedLayers.includes(layer.id);
                        return (
                          <div
                            key={layer.id}
                            className="flex items-center justify-between px-1.5 py-0.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[10.5px]"
                          >
                            <span className="truncate text-[var(--tz-text)]">{layer.shortRu}</span>
                            <div className="inline-flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => onToggleLockLayer?.(layer.id)}
                                aria-label={`Заблокировать подслой ${layer.shortRu}`}
                                className={
                                  isLocked
                                    ? 'text-amber-400'
                                    : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                                }
                              >
                                {isLocked ? (
                                  <Lock className="w-2.5 h-2.5" />
                                ) : (
                                  <Unlock className="w-2.5 h-2.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggleHideLayer?.(layer.id)}
                                aria-label={`Скрыть подслой ${layer.shortRu}`}
                                className={
                                  isHidden
                                    ? 'text-rose-400'
                                    : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                                }
                              >
                                {isHidden ? (
                                  <EyeOff className="w-2.5 h-2.5" />
                                ) : (
                                  <Eye className="w-2.5 h-2.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Z3: Live 1:1 Rendered PDF Underlay (XeLaTeX / Ghostscript) */}
                <div
                  role="listitem"
                  onClick={() => setSelectedLayerTarget('pdf')}
                  className={`px-2 py-1.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    selectedLayerTarget === 'pdf'
                      ? 'bg-[var(--tz-active)]/60'
                      : 'hover:bg-[var(--tz-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePdfUnderlay?.();
                      }}
                      aria-label="Показать или скрыть живую PDF-кальку 1:1"
                      className={`p-1 rounded border ${
                        pdfUnderlay?.enabled
                          ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                          : 'text-[var(--tz-muted)] border-transparent opacity-60'
                      }`}
                    >
                      {pdfUnderlay?.enabled ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-medium text-[var(--tz-text)] truncate">
                        Калька PDF 1:1 (Рендер)
                      </div>
                      <div className="text-[10px] text-[var(--tz-muted)] font-mono tabular-nums truncate">
                        {pdfUnderlay?.loading
                          ? 'Компиляция кадра…'
                          : pdfUnderlay?.engineLabelRu
                            ? `${pdfUnderlay.engineLabelRu}${pdfUnderlay.renderMs !== undefined ? ` · ${pdfUnderlay.renderMs}мс` : ''}`
                            : 'Обратная связь 1:1 под сеткой'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {pdfUnderlay?.hasPdf && onDownloadRenderedPdf && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadRenderedPdf();
                        }}
                        title="Скачать векторный .pdf текущей сцены"
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] hover:bg-[var(--tz-hover)] text-[10px] font-mono text-[var(--tz-link)]"
                      >
                        <Download className="w-2.5 h-2.5" />
                        <span>.pdf</span>
                      </button>
                    )}
                    <span className="font-mono tabular-nums text-[10.5px] text-[var(--tz-muted)] w-8 text-right">
                      {Math.round((pdfUnderlay?.opacity ?? 0.72) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Z2: Reference Bitmap Scan / PNG Underlay for Tracing & Digitizing */}
                <div
                  role="listitem"
                  onClick={() => setSelectedLayerTarget('reference')}
                  className={`px-2 py-1.5 flex flex-col gap-1.5 cursor-pointer transition-colors ${
                    selectedLayerTarget === 'reference'
                      ? 'bg-[var(--tz-active)]/60'
                      : 'hover:bg-[var(--tz-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        disabled={!referenceImageUrl}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeCompositeLayers?.({
                            referenceVisible: !compositeLayers.referenceVisible,
                          });
                        }}
                        aria-label="Показать или скрыть растровую кальку-эталон"
                        className={`p-1 rounded border disabled:opacity-35 ${
                          referenceImageUrl && compositeLayers.referenceVisible
                            ? 'text-[var(--tz-text)] border-[var(--tz-outline)] bg-[var(--tz-panel)]'
                            : 'text-[var(--tz-muted)] border-transparent opacity-60'
                        }`}
                      >
                        {referenceImageUrl && compositeLayers.referenceVisible ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-medium text-[var(--tz-text)] truncate">
                          Калька-скан (PNG / Эталон)
                        </div>
                        <div className="text-[10px] text-[var(--tz-muted)] truncate">
                          {referenceImageUrl ? 'Загружено изображение для обводки' : 'Нет загруженного скана'}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono tabular-nums text-[10.5px] text-[var(--tz-muted)] w-8 text-right shrink-0">
                      {Math.round(compositeLayers.referenceOpacity * 100)}%
                    </span>
                  </div>

                  <div className="pl-7 flex flex-wrap items-center gap-1">
                    <input
                      ref={referenceUploadInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file || !onUploadReferenceImageDataUrl) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            onUploadReferenceImageDataUrl(reader.result);
                            onChangeCompositeLayers?.({ referenceVisible: true });
                          }
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        referenceUploadInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] hover:bg-[var(--tz-hover)] text-[10px] text-[var(--tz-text)]"
                    >
                      <Upload className="w-2.5 h-2.5" />
                      <span>Файл PNG/JPG</span>
                    </button>
                    {onLoadDemoReferenceScan && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadDemoReferenceScan();
                          onChangeCompositeLayers?.({ referenceVisible: true });
                        }}
                        className="px-1.5 py-0.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] hover:bg-[var(--tz-hover)] text-[10px] text-[var(--tz-link)]"
                      >
                        Демо-скан
                      </button>
                    )}
                    {referenceImageUrl && onClearReferenceImage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearReferenceImage();
                        }}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] hover:bg-rose-500/15 text-[10px] text-rose-400"
                      >
                        <ImageOff className="w-2.5 h-2.5" />
                        <span>Очистить</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Z1 (Bottom): Coordinate Grid (Millimeter / Polar / Isometric) */}
                <div
                  role="listitem"
                  onClick={() => setSelectedLayerTarget('grid')}
                  className={`px-2 py-1.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    selectedLayerTarget === 'grid'
                      ? 'bg-[var(--tz-active)]/60'
                      : 'hover:bg-[var(--tz-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeCompositeLayers?.({
                          gridVisible: !compositeLayers.gridVisible,
                        });
                      }}
                      aria-label="Показать или скрыть координатную сетку"
                      className={`p-1 rounded border ${
                        compositeLayers.gridVisible
                          ? 'text-[var(--tz-text)] border-[var(--tz-outline)] bg-[var(--tz-panel)]'
                          : 'text-[var(--tz-muted)] border-transparent opacity-60'
                      }`}
                    >
                      {compositeLayers.gridVisible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-medium text-[var(--tz-text)] truncate">
                        Координатная сетка (см)
                      </div>
                      <div className="text-[10px] text-[var(--tz-muted)] truncate">
                        Миллиметровка 1:1 и оси отсчёта
                      </div>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-[10.5px] text-[var(--tz-muted)] w-8 text-right shrink-0">
                    {Math.round(compositeLayers.gridOpacity * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Single Unified Scene Object Tree (No Duplication with Canvas Bottom Bar) */}
            <div
              data-testid="inspector-figure-explorer"
              className="p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold text-[var(--tz-text)]">
                  Дерево объектов сцены
                </h2>
                {onOpenOutlinerTable && (
                  <button
                    type="button"
                    onClick={onOpenOutlinerTable}
                    title="Открыть табличный реестр и групповую замену параметров"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[10.5px] text-[var(--tz-link)] font-medium"
                  >
                    <Table2 className="w-3 h-3" />
                    <span>Таблица</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1 text-[10.5px]">
                {[
                  { id: 'all' as const, label: `Все (${packageObjects.length + ownedPrimitives.length})` },
                  { id: 'packages' as const, label: `Пакеты (${packageObjects.length})` },
                  { id: 'primitives' as const, label: `База (${ownedPrimitives.length})` },
                  { id: 'scopes' as const, label: `.tex (${figureTree.length})` },
                ].map((flt) => (
                  <button
                    key={flt.id}
                    type="button"
                    onClick={() => setTreeFilter(flt.id)}
                    className={`px-1.5 py-0.5 rounded border font-mono tabular-nums truncate ${
                      treeFilter === flt.id
                        ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)] font-semibold'
                        : 'bg-[var(--tz-inset)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>

              <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] divide-y divide-[var(--tz-outline)]/60 max-h-80 overflow-y-auto">
                {(treeFilter === 'all' || treeFilter === 'packages') &&
                  packageObjects.map((pkg) => {
                    const isSelected = selectedPackageObject?.objectId === pkg.objectId;
                    return (
                      <div
                        key={pkg.objectId}
                        className={`px-2 py-1 flex items-center justify-between gap-1.5 text-[11px] transition-colors ${
                          isSelected
                            ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                            : 'hover:bg-[var(--tz-hover)] text-[var(--tz-text)]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPackageObject?.(pkg.objectId);
                            setActiveTab('object');
                          }}
                          className="flex-1 min-w-0 flex items-center gap-2 text-left"
                        >
                          <PackageSchematicIcon
                            objectKind={pkg.kind}
                            circuitKind={pkg.circuitKind}
                            className="w-3.5 h-3.5 text-[var(--tz-link)] shrink-0"
                          />
                          <span className="truncate">
                            {formatRecognizedPackageObjectLabelRu(pkg)}
                          </span>
                        </button>
                        <div className="flex items-center gap-1 shrink-0 font-mono tabular-nums text-[10px]">
                          <button
                            type="button"
                            onClick={() => onJumpToLine(pkg.startLine)}
                            className="px-1 py-0.5 rounded hover:bg-[var(--tz-inset)] text-[var(--tz-muted)] hover:text-[var(--tz-link)]"
                          >
                            :{pkg.startLine}
                          </button>
                          {onDeletePackageObject && (
                            <button
                              type="button"
                              onClick={() => onDeletePackageObject(pkg.objectId)}
                              aria-label={`Удалить ${formatRecognizedPackageObjectLabelRu(pkg)}`}
                              className="p-0.5 rounded hover:bg-rose-500/20 text-[var(--tz-muted)] hover:text-rose-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {(treeFilter === 'all' || treeFilter === 'primitives') &&
                  ownedPrimitives.map((prim) => {
                    const spec = PRIMITIVE_TOOLS.find((t) => t.id === prim.tool);
                    const isSel =
                      selectedPrimitive?.id === prim.id ||
                      selectedPrimitives.some((p) => p.id === prim.id);
                    const isHov = hoveredPrimitiveId === prim.id;
                    return (
                      <div
                        key={prim.id}
                        onMouseEnter={() => onHoverPrimitive?.(prim.id)}
                        onMouseLeave={() => onHoverPrimitive?.(null)}
                        className={`px-2 py-1 flex items-center justify-between gap-1.5 text-[11px] transition-colors ${
                          isSel
                            ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                            : isHov
                              ? 'bg-sky-500/15 text-[var(--tz-text)]'
                              : 'hover:bg-[var(--tz-hover)] text-[var(--tz-text)]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPrimitive?.(prim.id);
                            setActiveTab('object');
                          }}
                          className="flex-1 min-w-0 flex items-center gap-2 text-left"
                        >
                          <span className="font-mono tabular-nums text-[10px] text-[var(--tz-muted)] shrink-0">
                            #{prim.id}
                          </span>
                          <span className="truncate">
                            {spec?.shortLabelRu ?? prim.tool}
                            {prim.values.node_id ? ` (${prim.values.node_id})` : ''}
                          </span>
                        </button>
                        <div className="flex items-center gap-1 shrink-0 font-mono tabular-nums text-[10px]">
                          <button
                            type="button"
                            onClick={() => onJumpToLine(prim.lineNumber)}
                            className="px-1 py-0.5 rounded hover:bg-[var(--tz-inset)] text-[var(--tz-muted)] hover:text-[var(--tz-link)]"
                          >
                            :{prim.lineNumber}
                          </button>
                          {onDuplicatePrimitiveById && (
                            <button
                              type="button"
                              onClick={() => onDuplicatePrimitiveById(prim.id)}
                              title="Дублировать примитив"
                              className="p-0.5 rounded hover:bg-[var(--tz-inset)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                          {onDeletePrimitiveById && (
                            <button
                              type="button"
                              onClick={() => onDeletePrimitiveById(prim.id)}
                              title="Удалить примитив"
                              className="p-0.5 rounded hover:bg-rose-500/20 text-[var(--tz-muted)] hover:text-rose-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {treeFilter === 'scopes' &&
                  figureTree.map((node) => {
                    const indentCls =
                      node.depth >= 2 ? 'pl-5' : node.depth === 1 ? 'pl-3.5' : 'pl-2';
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => {
                          if (node.packageObjectId && onSelectPackageObject) {
                            onSelectPackageObject(node.packageObjectId);
                            setActiveTab('object');
                          } else if (node.n1PrimitiveId !== undefined && onSelectPrimitive) {
                            onSelectPrimitive(node.n1PrimitiveId);
                            setActiveTab('object');
                          } else {
                            onJumpToLine(node.lineNumber);
                          }
                        }}
                        className={`w-full py-1 pr-2 ${indentCls} text-left flex items-center justify-between gap-2 text-[11px] hover:bg-[var(--tz-hover)]`}
                      >
                        <span className="truncate text-[var(--tz-text)]">
                          <span className="font-mono text-[10px] text-[var(--tz-muted)] mr-1.5">
                            {node.packageBadge}
                          </span>
                          <span>{node.titleRu}</span>
                        </span>
                        <span className="font-mono tabular-nums text-[10px] text-[var(--tz-muted)] shrink-0">
                          :{node.lineNumber}
                        </span>
                      </button>
                    );
                  })}

                {packageObjects.length === 0 &&
                  ownedPrimitives.length === 0 &&
                  (treeFilter !== 'scopes' || figureTree.length === 0) && (
                    <p className="p-2.5 text-[11px] text-[var(--tz-muted)]">
                      На холсте пока нет интерактивных объектов. Выберите схемный значок над холстом и растяните фигуру.
                    </p>
                  )}
              </div>
            </div>

            {/* 3. SC-DATA External Table Dependency Containment Audit */}
            {dataAuditEntries.length > 0 && (
              <div
                data-testid="inspector-data-audit"
                className="p-3 bg-[var(--tz-window)] text-[11px] flex flex-col gap-1"
              >
                <div className="font-semibold text-[var(--tz-text)]">
                  Файлы данных таблицы ({dataAuditEntries.length})
                </div>
                {dataAuditEntries.map((entry, idx) => (
                  <div
                    key={`${entry.path}-${idx}`}
                    className="flex items-center justify-between gap-2 font-mono tabular-nums"
                  >
                    <span
                      className={
                        entry.isRelativeSafe ? 'text-emerald-500 truncate' : 'text-rose-500 truncate'
                      }
                      title={entry.violationRu ?? entry.command}
                    >
                      {entry.path}
                    </span>
                    <button
                      type="button"
                      onClick={() => onJumpToLine(entry.lineNumber)}
                      className="text-[10px] text-[var(--tz-link)] hover:underline shrink-0"
                    >
                      стр.{entry.lineNumber}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'diagnostics-f1' && (
          <>
            {/* 2. Diagnostics Click-to-Source + P17 One-Click Quick Fix Section */}
            <div className="p-3 border-b border-[var(--tz-outline)]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-[var(--tz-text)]">
                  Диагностика TeX / PGF ({diagnostics.length})
                </h2>
                <span className="text-[11px] text-[var(--tz-muted)]">Быстрое исправление</span>
              </div>

              {diagnostics.length === 0 ? (
                <p className="text-xs text-[var(--tz-muted)]">
                  Синтаксических конфликтов преамбулы и примитивов не обнаружено.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {diagnostics.map((diag, idx) => (
                    <div
                      key={`${diag.code}-${diag.lineNumber}-${idx}`}
                      className="p-2.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 font-medium font-mono tabular-nums ${
                            diag.severity === 'error' ? 'text-rose-500' : 'text-amber-500'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Строка {diag.lineNumber} · {diag.code}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onJumpToLine(diag.lineNumber)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--tz-link)] hover:underline whitespace-nowrap shrink-0"
                        >
                          <span>К строке {diag.lineNumber}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[var(--tz-text)] leading-snug">{diag.messageRu}</p>
                      <p className="text-[11px] text-[var(--tz-muted)]">{diag.hintRu}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {diag.quickFixId && diag.quickFixLabelRu && (
                          <button
                            type="button"
                            data-testid={`quickfix-${diag.code}-${diag.lineNumber}`}
                            onClick={() => onApplyQuickFix(diag)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-accent)]/60 whitespace-nowrap"
                          >
                            <Wrench className="w-3 h-3 text-[var(--tz-link)]" />
                            <span>{diag.quickFixLabelRu}</span>
                          </button>
                        )}
                        {onOpenManualAnchor && (
                          <button
                            type="button"
                            onClick={() => {
                              const anchor = resolveManualAnchorForDiagnosticCode(diag.code);
                              if (anchor) onOpenManualAnchor(anchor.id);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10.5px] font-mono rounded bg-[var(--tz-inset)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-outline)] whitespace-nowrap"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Правило в PDF</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Single Unified Contextual F1 Help Card */}
            <div
              className={`p-3 flex-1 ${
                highlightedZone === 'help' ? 'ring-2 ring-inset ring-sky-500' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[var(--tz-link)]" />
                  <h2 className="text-xs font-semibold text-[var(--tz-text)]">Контекстная справка F1</h2>
                </div>
                <select
                  aria-label="Тема контекстной справки F1 (переключение сохраняет черновик)"
                  value={f1TopicId}
                  onChange={(e) => setF1TopicId(e.target.value)}
                  className="max-w-[175px] px-2 py-1 text-[11px] rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] truncate"
                >
                  <optgroup label="6 базовых примитивов">
                    {PRIMITIVE_TOOLS.map((t) => (
                      <option key={t.catalogId} value={t.catalogId}>
                        {t.titleRu}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Библиотеки PGF/TikZ">
                    {TIKZ_LIBRARIES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Пакеты расширений TikZ (12)">
                    {TIKZ_EXTENSION_PACKAGES.map((ext) => (
                      <option key={ext.id} value={`ext:${ext.id}`}>
                        {ext.shortBadgeRu} — {ext.displayTitleRu}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {f1Extension && (
                <div className="p-2.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-xs flex flex-col gap-2">
                  <div className="text-[var(--tz-text)] font-medium">
                    {f1Extension.displayTitleRu}
                  </div>
                  <p className="text-[var(--tz-muted)] leading-relaxed">
                    {f1Extension.summaryRu}
                  </p>
                  <div className="p-2 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[11px] text-[var(--tz-syn-cmd)] overflow-x-auto">
                    \usepackage&#123;{f1Extension.packageName}&#125;
                    {f1Extension.companionPackages.length > 0
                      ? ` · +[${f1Extension.companionPackages.join(', ')}]`
                      : ''}
                  </div>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    {f1Extension.xelatexNoteRu}
                  </p>

                  {onOpenManualAnchor && (
                    <button
                      type="button"
                      data-testid="f1-open-direct-pdf-anchor-btn"
                      onClick={() =>
                        onOpenManualAnchor(resolveManualAnchorForExtension(f1Extension.id).id)
                      }
                      className="w-full inline-flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-accent)]/50 text-[11px] font-medium"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Прямая точка в оригинальном PDF-мануале</span>
                      </span>
                      <span className="font-mono tabular-nums text-[10px] text-[var(--tz-muted)]">
                        {(() => {
                          const targetAnchor = resolveManualAnchorForExtension(f1Extension.id);
                          const meta = resolveManualDocumentMeta(targetAnchor.docId);
                          return `${meta.filename} · стр. ${targetAnchor.page}`;
                        })()}
                      </span>
                    </button>
                  )}

                  {onOpenExtensionWorkshop && (
                    <button
                      type="button"
                      onClick={() => onOpenExtensionWorkshop(f1Extension.id)}
                      className="w-full px-2.5 py-1.5 rounded bg-[var(--tz-accent)] text-white hover:opacity-95 text-[11px] font-medium text-center"
                    >
                      Открыть генератор «{f1Extension.shortBadgeRu}» в Мастерских
                    </button>
                  )}
                </div>
              )}

              {(f1Tool || f1Library) && (
                <div className="p-2.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-xs flex flex-col gap-2">
                  <div className="text-[var(--tz-text)] font-medium">
                    {f1Tool ? f1Tool.titleRu : f1Library?.titleRu}
                  </div>
                  <p className="text-[var(--tz-muted)] leading-relaxed">
                    {f1Tool ? f1Tool.helpRu : f1Library?.helpRu}
                  </p>
                  <div className="p-2 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[11px] text-[var(--tz-syn-cmd)] overflow-x-auto">
                    {f1Tool ? f1Tool.syntax : f1Library?.syntax}
                  </div>

                  {onOpenManualAnchor && (
                    <button
                      type="button"
                      data-testid="f1-open-direct-pdf-anchor-btn"
                      onClick={() => {
                        const targetAnchor = f1Tool
                          ? resolveManualAnchorForTool(f1Tool.id)
                          : f1Library
                            ? (resolveManualAnchorForToken(f1Library.name) ??
                              resolveManualAnchorForTool('arrow'))
                            : resolveManualAnchorForTool('line');
                        onOpenManualAnchor(targetAnchor.id);
                      }}
                      className="w-full inline-flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-accent)]/50 text-[11px] font-medium"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Прямая точка в оригинальном PDF-мануале</span>
                      </span>
                      <span className="font-mono tabular-nums text-[10px] text-[var(--tz-muted)]">
                        {(() => {
                          const targetAnchor = f1Tool
                            ? resolveManualAnchorForTool(f1Tool.id)
                            : f1Library
                              ? (resolveManualAnchorForToken(f1Library.name) ??
                                resolveManualAnchorForTool('arrow'))
                              : resolveManualAnchorForTool('line');
                          const meta = resolveManualDocumentMeta(targetAnchor.docId);
                          return `${meta.filename} · стр. ${targetAnchor.page}`;
                        })()}
                      </span>
                    </button>
                  )}

                  <details className="group border-t border-[var(--tz-outline)] pt-2">
                    <summary className="cursor-pointer text-[11px] font-medium text-[var(--tz-link)] select-none">
                      Пример и ограничения PGF 3.1.12
                    </summary>
                    <div className="mt-2 flex flex-col gap-1.5 text-[11px] text-[var(--tz-muted)]">
                      <pre className="p-2 rounded bg-[var(--tz-inset)] font-mono overflow-x-auto text-[var(--tz-text)]">
                        {f1Tool ? f1Tool.example : f1Library?.example}
                      </pre>
                      <p>{f1Tool ? f1Tool.warningRu : f1Library?.warningRu}</p>
                      <p>{f1Tool ? f1Tool.interactionRu : f1Library?.interactionRu}</p>
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <span>
                          Раздел PGF Manual: §{f1Tool ? f1Tool.manualSection : f1Library?.manualSection} · Движок: XeLaTeX
                        </span>
                        <a
                          href={f1Tool ? f1Tool.manualUrl : f1Library?.manualUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--tz-link)] hover:underline"
                        >
                          <span>tikz.dev</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
