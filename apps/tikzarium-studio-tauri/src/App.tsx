import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Undo2,
  Redo2,
  Play,
  Square as StopIcon,
  Download,
  FolderOpen,
  PlugZap,
  Columns3,
  Maximize2,
  Code2,
  Command,
  PanelRightClose,
  PanelRightOpen,
  FilePlus2,
  History,
  Zap,
  HardDrive,
  Compass,
  Star,
  ArrowLeft,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import { UI_THEMES, PRIMITIVE_TOOLS, TIKZ_LIBRARIES } from './domain/catalog';
import type { SpecimenDocument, ToolId, UiThemeId, UxFindingItem } from './domain/catalog';
import {
  buildSpecimenDocuments,
  parseOwnedPrimitives,
  applyOwnedPrimitivePatch,
  insertOwnedPrimitiveIntoSource,
  analyzeTexDiagnostics,
  proposeLibraryConnect,
  inspectPreambleConnections,
  translateOwnedPrimitiveCm,
  duplicateOwnedPrimitiveInSource,
  deleteOwnedPrimitiveFromSource,
  computeGestureDraftPreview,
} from './domain/tikzEngine';
import type { OwnedPrimitive, TexDiagnostic } from './domain/tikzEngine';
import {
  adoptRawTikzLineIntoN1,
  alignOwnedPrimitivesInSource,
  applyDiagnosticQuickFix,
  convertCsvToPgfplotsDocument,
  createSnippetFromPrimitives,
  detachOwnedPrimitiveToCleanTikz,
  detectAdoptableTikzLines,
  insertSnippetIntoSource,
  loadEframeStorage,
  reorderOwnedPrimitiveInSource,
  saveEframeStorage,
} from './domain/ergonomicsBundle';
import type { AlignmentMode, UserSnippetItem, ZOrderDirection } from './domain/ergonomicsBundle';
import { CanvasStage } from './components/CanvasStage';
import type { ActiveCanvasTool, CanvasMode } from './components/CanvasStage';
import { TexSourceEditor } from './components/TexSourceEditor';
import { InspectorAndHelpPane } from './components/InspectorAndHelpPane';
import type {
  CompositeCanvasLayersState,
  InspectorTabId,
} from './components/InspectorAndHelpPane';
import { ConnectionsAuditView } from './components/ConnectionsAuditView';
import type { BackendConnectionReport } from './components/ConnectionsAuditView';
import {
  LibrariesManagerView,
  UxAuditMatrixView,
  SaveAndBuildModal,
} from './components/LibrariesAndUxViews';
import {
  CommandPaletteModal,
  DirtyDocumentGuardModal,
} from './components/CommandPaletteAndGuards';
import type { CommandPaletteAction } from './components/CommandPaletteAndGuards';
import { EguiNativeBlueprintView } from './components/EguiNativeBlueprintView';
import {
  DOCUMENT_TEMPLATES,
  buildDocumentFromTemplate,
} from './domain/documentTemplates';
import type { DocumentTemplateId, TemplateCreationOptions } from './domain/documentTemplates';
import { NewDocumentTemplateModal } from './components/NewDocumentTemplateModal';
import {
  PublicationExportModal,
  RevisionHistoryDiffModal,
  WorkspaceSnippetsAndOsModal,
  buildStandaloneVectorSvgMarkup,
} from './components/PublicationAndHistoryModals';
import type {
  ProjectModalTab,
  ScientificModalTab,
} from './components/ScientificAndProjectModals';

const ArticleProjectModal = lazy(() =>
  import('./components/ScientificAndProjectModals').then((m) => ({
    default: m.ArticleProjectModal,
  }))
);
const ScientificCadModal = lazy(() =>
  import('./components/ScientificAndProjectModals').then((m) => ({
    default: m.ScientificCadModal,
  }))
);
import {
  SHARED_STYLE_DEFAULT_TIKZ,
  convertPrimitiveToDimensionCallout,
  ensureDefineColorInPreamble,
  generateForeachArrayInSource,
  injectSharedStyleIntoDocument,
  insertAngleArcIntoSource,
  insertDimensionCalloutIntoSource,
  insertScientificStampIntoSource,
  mirrorOwnedPrimitivesInSource,
  parseClipboardTableToSource,
  resolveSyncTexClick,
  rotateOwnedPrimitivesInSource,
  scaleOwnedPrimitivesInSource,
  upsertPgfplotsAxisInSource,
} from './domain/scientificCadBundle';
import type {
  ColorProofMode,
  ForeachArrayConfig,
  JournalGaugeId,
  PgfplotsAxisConfig,
} from './domain/scientificCadBundle';
import {
  DEMO_PLOT_SCAN_DATA_URI,
  PATH_DECORATION_SPECS,
  clampSplitterColumns,
  constructIntersectionOrPerpendicularInSource,
  insertAnalyticalPlotIntoSource,
  insertDigitizedCurveIntoSource,
  insertPolygonContourIntoSource,
  insertVectorFieldIntoSource,
  mapCanvasPointsToPhysical,
  upsertPgfMathMacroInSource,
} from './domain/advancedCadBundle';
import type {
  AnalyticalFormulaId,
  CadLayerId,
  DigitizerCalibration,
  VectorFieldPresetId,
} from './domain/advancedCadBundle';
import type { AdvancedModalTab } from './components/AdvancedCadAndLayersModal';

const AdvancedCadAndLayersModal = lazy(() =>
  import('./components/AdvancedCadAndLayersModal').then((m) => ({
    default: m.AdvancedCadAndLayersModal,
  }))
);
import {
  JOURNAL_COLUMN_GAUGES,
} from './domain/scientificCadBundle';
import {
  applySpreadsheetCellEditInSource,
  applyStylePassportToPrimitivesInSource,
  applyVisualLintAutoFix,
  constructFilletOrChamferInSource,
  extractStylePassport,
  insert3dProjectedSceneIntoSource,
  insertFillBetweenCurvesIntoSource,
  insertNotationPresetIntoSource,
  insertPositionalLeaderShelfIntoSource,
  insertSpyMagnifierInsetIntoSource,
  parseTikzprojSession,
  serializeTikzprojSession,
} from './domain/scientificNotationsAndAuditBundle';
import type {
  EditableSpreadsheetField,
  Scene3dPresetId,
  StylePassport,
  VisualLintFinding,
} from './domain/scientificNotationsAndAuditBundle';
import type { NotationsModalTabId } from './components/ScientificNotationsAndOutlinerModal';

const ScientificNotationsAndOutlinerModal = lazy(() =>
  import('./components/ScientificNotationsAndOutlinerModal').then((m) => ({
    default: m.ScientificNotationsAndOutlinerModal,
  }))
);
import {
  cleanPreambleAndUnusedLibraries,
  convertDocumentUnitsInSource,
  extractRepeatedStyleToTikzset,
  formatTikzDocumentSource,
  importExternalSvgIntoSource,
  insertBooktabsTableIntoDocument,
  insertCatmullRomSplineIntoSource,
  insertGostSupportCombHatchIntoSource,
  insertParallelOffsetContourIntoSource,
  trimOrExtendSegmentToBoundaryInSource,
} from './domain/formatterRefactorAndCadBundle';
import type { AutoFormatOptions, TikzLengthUnit } from './domain/formatterRefactorAndCadBundle';
import type { FormatterModalTabId } from './components/FormatterRefactorAndCadModal';

const FormatterRefactorAndCadModal = lazy(() =>
  import('./components/FormatterRefactorAndCadModal').then((m) => ({
    default: m.FormatterRefactorAndCadModal,
  }))
);
import {
  WORKSHOP_CATALOG_ITEMS,
  computeSelectionGeometryMetrics,
  computeVisualPrimitiveDiff,
  deletePolyVertexAtIndexInSource,
  expandSelectionWithGroups,
  extractTikzsetStylesFromPreamble,
  groupPrimitivesInSource,
  insertCentroidMarkerIntoSource,
  insertPolyVertexAtEdgeInSource,
  insertThreePointArcIntoSource,
  loadPinnedWorkshopIds,
  rerouteBoundConnectorsInSource,
  revertSinglePrimitiveFromRevision,
  savePinnedWorkshopIds,
  togglePolyClosedInSource,
  ungroupPrimitivesInSource,
} from './domain/workspaceAndEngineeringStageBundle';
import type { WorkshopTargetId } from './domain/workspaceAndEngineeringStageBundle';
import { StudioWorkshopsHubModal } from './components/StudioWorkshopsHubModal';
import type { StudioHubTabId } from './components/StudioWorkshopsHubModal';
import {
  ATOMIC_FIGURE_PROFILES,
  applyAtomicFigureProfileToPreamble,
  ensureRequiredLibsForInspectorPatch,
  inspectFigurePackagePassport,
  togglePackageInPreamble,
} from './domain/atomicFigureProfile';
import type { AtomicFigureProfileId } from './domain/atomicFigureProfile';
import { PdfManualAnchorModal } from './components/PdfManualAnchorModal';
import type { ManualModalTabId } from './components/PdfManualAnchorModal';
import type { StudioControlSnapshot } from './domain/studioControlApi';
import type { TikzExtensionId } from './domain/tikzExtensionsSuite';
import type { PdfUnderlayRenderResponse } from './domain/sourcePatchEngine';
import { NativeBuildGate, LiveBuildAdmission, requestAuthoritativePdf, assertAuthoritativePdf, saveThenContinue } from './domain/nativeBuildGate';
import {
  createAdaptiveEngineAdapter,
  isTauriRuntime,
  subscribeTauriExternalFileChanges,
  tauriCancelActiveBuild,
  tauriDoctorEnvironment,
  tauriPickAndOpenTexFile,
  tauriSaveTexDocument,
} from './domain/tauriNativeBridge';
import {
  PACKAGE_CANVAS_TOOLS,
  deletePackageObjectFromSource,
  insertPackageCanvasObjectFromGesture,
  parseScenePackageObjects,
  patchPackageObjectInSource,
  translatePackageObjectInSource,
} from './domain/packageCanvasSemantics';
import type {
  PackageObjectSemanticPatch,
  PackageToolId,
} from './domain/packageCanvasSemantics';

const TauriV2BranchWorkbenchView = lazy(() =>
  import('./components/TauriV2BranchWorkbenchView').then((m) => ({
    default: m.TauriV2BranchWorkbenchView,
  }))
);

type ActiveTab = 'studio' | 'connections' | 'libraries' | 'ux-audit' | 'egui-native' | 'tauri-v2';
type LayoutFocus = 'tri-pane' | 'focus-canvas' | 'focus-code';
type BuildStatus = 'idle' | 'running' | 'succeeded' | 'failed' | 'cancelled';

const LG_FLEX_WIDTH_24: Record<number, string> = {
  5: 'lg:w-[20.8333%]',
  6: 'lg:w-[25%]',
  7: 'lg:w-[29.1667%]',
  8: 'lg:w-[33.3333%]',
  9: 'lg:w-[37.5%]',
  10: 'lg:w-[41.6667%]',
  11: 'lg:w-[45.8333%]',
  12: 'lg:w-[50%]',
  13: 'lg:w-[54.1667%]',
  14: 'lg:w-[58.3333%]',
  15: 'lg:w-[62.5%]',
  16: 'lg:w-[66.6667%]',
  17: 'lg:w-[70.8333%]',
  18: 'lg:w-[75%]',
  24: 'lg:w-full',
};

interface HistoryEntry {
  source: string;
  revision: number;
  labelRu: string;
}

export default function App() {
  const specimens = useMemo(() => buildSpecimenDocuments(), []);
  const initialStored = useMemo(() => loadEframeStorage(), []);

  // Top-level navigation & persistent eframe::Storage preferences (P20)
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [theme, setTheme] = useState<UiThemeId>(initialStored.theme ?? 'midnight');
  const [layoutFocus, setLayoutFocus] = useState<LayoutFocus>('tri-pane');
  const [fontSizePt, setFontSizePt] = useState<12 | 14 | 16 | 18 | 20 | 24>(
    initialStored.fontSizePt ?? 14
  );
  const [softWrap, setSoftWrap] = useState<boolean>(initialStored.softWrap ?? false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState<boolean>(
    initialStored.inspectorCollapsed ?? false
  );
  const [liveAutoBuild, setLiveAutoBuild] = useState<boolean>(
    false // Execution consent is session/document-scoped; never restore it from storage.
  );
  const [recentFiles, setRecentFiles] = useState<
    { filename: string; titleRu: string; openedAt: string }[]
  >(
    initialStored.recentFiles ?? [
      {
        filename: specimens[0].filename,
        titleRu: specimens[0].titleRu,
        openedAt: 'сегодня',
      },
    ]
  );
  const [customSnippets, setCustomSnippets] = useState<UserSnippetItem[]>(
    initialStored.customSnippets ?? []
  );

  // Document & History state
  const [createdDocs, setCreatedDocs] = useState<SpecimenDocument[]>([]);
  const allDocuments = useMemo(() => [...createdDocs, ...specimens], [createdDocs, specimens]);
  const [specimenId, setSpecimenId] = useState<string>(specimens[0].id);
  const [filename, setFilename] = useState<string>(specimens[0].filename);
  const [savedDirectory, setSavedDirectory] = useState<string | null>(null);
  const [nativeFilePath, setNativeFilePath] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([
    { source: specimens[0].source, revision: 1, labelRu: 'Исходный документ' },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [savedRevision, setSavedRevision] = useState<number>(1);

  // Authoring, Multi-Selection & Bidirectional Hover state (P03, P10, P19)
  const [activeTool, setActiveTool] = useState<ActiveCanvasTool>('select');
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('sketch');
  const [selectedPrimitiveId, setSelectedPrimitiveId] = useState<number | null>(3);
  const [selectedPrimitiveIds, setSelectedPrimitiveIds] = useState<number[]>([3]);
  const [selectedPackageObjectId, setSelectedPackageObjectId] = useState<string | null>(null);
  const [hoveredPrimitiveId, setHoveredPrimitiveId] = useState<number | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState<number>(11);
  const [searchBarOpen, setSearchBarOpen] = useState<boolean>(false);
  const [highlightedZone, setHighlightedZone] = useState<string | null>(null);

  // Live Rendered PDF Underlay & Stage Bounds state (INS-01 / MOD-09 / MOD-17 / MOD-18)
  const engineAdapter = useMemo(() => createAdaptiveEngineAdapter(''), []);
  const [stageBoundsCm, setStageBoundsCm] = useState<{
    minXCm: number;
    maxXCm: number;
    minYCm: number;
    maxYCm: number;
  }>({ minXCm: 0, maxXCm: 6.2, minYCm: 0, maxYCm: 3.8 });
  const [pdfUnderlayEnabled, setPdfUnderlayEnabled] = useState<boolean>(true);
  const [pdfUnderlayOpacity, setPdfUnderlayOpacity] = useState<number>(0.65);
  const [pdfUnderlayLoading, setPdfUnderlayLoading] = useState<boolean>(false);
  const [pdfUnderlayResponse, setPdfUnderlayResponse] =
    useState<PdfUnderlayRenderResponse | null>(null);
  const [compositeLayers, setCompositeLayers] = useState<CompositeCanvasLayersState>({
    vectorVisible: true,
    vectorOpacity: 1,
    referenceVisible: true,
    referenceOpacity: 0.38,
    gridVisible: true,
    gridOpacity: 1,
  });
  const [inspectorTabOverride, setInspectorTabOverride] = useState<InspectorTabId | null>(null);

  // Build, PDF triad & Modals state (P13, P15, P16, P18, P19, P20)
  const [buildStatus, setBuildStatus] = useState<BuildStatus>('idle');
  const [builtRevision, setBuiltRevision] = useState<number | null>(null);
  const [builtAt, setBuiltAt] = useState<string | null>(null);
  const [lastGoodPrimitives, setLastGoodPrimitives] = useState<OwnedPrimitive[]>([]);
  const [builtSource, setBuiltSource] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [newTemplateModalOpen, setNewTemplateModalOpen] = useState<boolean>(false);
  const [initialTemplateId, setInitialTemplateId] = useState<DocumentTemplateId>('diagram');
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [snippetsModalOpen, setSnippetsModalOpen] = useState<boolean>(false);
  const [cadModalOpen, setCadModalOpen] = useState<boolean>(false);
  const [cadModalTab, setCadModalTab] = useState<ScientificModalTab>('stamps');
  const [advModalOpen, setAdvModalOpen] = useState<boolean>(false);
  const [advModalTab, setAdvModalTab] = useState<AdvancedModalTab>('geometry-gost');
  const [projectModalOpen, setProjectModalOpen] = useState<boolean>(false);
  const [projectModalTab, setProjectModalTab] = useState<ProjectModalTab>('workspace');
  const [journalGaugeId, setJournalGaugeId] = useState<JournalGaugeId>('none');
  const [colorProofMode, setColorProofMode] = useState<ColorProofMode>('normal');
  const [sharedStyleTikz, setSharedStyleTikz] = useState<string>(SHARED_STYLE_DEFAULT_TIKZ);

  // P43, P46, P47, P49 state
  const [hiddenLayers, setHiddenLayers] = useState<CadLayerId[]>([]);
  const [lockedLayers, setLockedLayers] = useState<CadLayerId[]>([]);
  const [activeBeamerSlide, setActiveBeamerSlide] = useState<number | null>(null);
  const [digitizerPointsCm, setDigitizerPointsCm] = useState<{ x: number; y: number }[]>([]);
  const [digitizerCalibration, setDigitizerCalibration] = useState<DigitizerCalibration>({
    ref1CanvasCm: { x: 0.8, y: 0.7 },
    ref1Phys: { x: 400, y: 0.0 },
    ref2CanvasCm: { x: 5.4, y: 3.2 },
    ref2Phys: { x: 700, y: 1.0 },
  });
  const [panelCols, setPanelCols] = useState<{ canvas: number; code: number; inspector: number }>(
    initialStored.panelCols ?? { canvas: 10, code: 8, inspector: 6 }
  );

  // P51-P65: Notations/3D/Outliner/Audit Modal & Eyedropper Style Passport
  const [notationsModalOpen, setNotationsModalOpen] = useState<boolean>(false);
  const [notationsModalTab, setNotationsModalTab] = useState<NotationsModalTabId>('notations');
  const [copiedStylePassport, setCopiedStylePassport] = useState<StylePassport | null>(null);

  // P66-P80: AST-Safe Formatter, Refactoring, Splines/Offset & SVG/Archive Modal
  const [formatterModalOpen, setFormatterModalOpen] = useState<boolean>(false);
  const [formatterModalTab, setFormatterModalTab] = useState<FormatterModalTabId>('format-refactor');
  const [formatOnSave, setFormatOnSave] = useState<boolean>(false);
  const [indentSpaces, setIndentSpaces] = useState<2 | 4>(2);

  // Stage 1–4 (E01–E08, F01–F16) & Atomic Figure Specialization Profile
  const [workshopsHubOpen, setWorkshopsHubOpen] = useState<boolean>(false);
  const [workshopsHubTab, setWorkshopsHubTab] = useState<StudioHubTabId>('extensions');
  const [workshopsHubExtensionId, setWorkshopsHubExtensionId] = useState<
    TikzExtensionId | undefined
  >(undefined);
  const [pinnedWorkshopIds, setPinnedWorkshopIds] = useState<WorkshopTargetId[]>(() =>
    loadPinnedWorkshopIds()
  );
  const [figureProfileOverride, setFigureProfileOverride] = useState<AtomicFigureProfileId | null>(
    null
  );

  // Original PDF Manual Direct-Anchor Reader, Build-Time Index & QA Control API v2 / GitHub Sync
  const [manualModalOpen, setManualModalOpen] = useState<boolean>(false);
  const [manualModalTab, setManualModalTab] = useState<ManualModalTabId>('reader');
  const [activeManualAnchorId, setActiveManualAnchorId] = useState<string>('pgf.env.tikzpicture');
  const [caretManualAnchorId, setCaretManualAnchorId] = useState<string | null>(null);

  const [cmdPaletteOpen, setCmdPaletteOpen] = useState<boolean>(false);
  const [helpEnvMenuOpen, setHelpEnvMenuOpen] = useState<boolean>(false);
  const helpEnvMenuRef = useRef<HTMLDivElement | null>(null);
  const [pendingSpecimenId, setPendingSpecimenId] = useState<string | null>(null);
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const [isWindowDragOver, setIsWindowDragOver] = useState<boolean>(false);

  useEffect(() => {
    if (!helpEnvMenuOpen) return;
    const onPointerDown = (ev: MouseEvent) => {
      if (helpEnvMenuRef.current && !helpEnvMenuRef.current.contains(ev.target as Node)) {
        setHelpEnvMenuOpen(false);
      }
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setHelpEnvMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [helpEnvMenuOpen]);
  const [externalDiskChange, setExternalDiskChange] = useState<{
    filename: string;
    diskSource: string;
    updatedAt: string;
    externalEditor: string;
  } | null>(null);

  const buildGateRef = useRef(new NativeBuildGate());
  const liveAdmissionRef = useRef(new LiveBuildAdmission());
  const documentEpochRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const liveDebounceRef = useRef<number | null>(null);
  const studioRowRef = useRef<HTMLDivElement | null>(null);
  const splitterDragRef = useRef<{
    which: 'canvas-code' | 'code-inspector';
    startX: number;
    startCols: { canvas: number; code: number; inspector: number };
  } | null>(null);

  // Connection Audit state
  const [connProfile, setConnProfile] = useState<'host-actual' | 'win10-miktex'>('host-actual');
  const [connReport, setConnReport] = useState<BackendConnectionReport | null>(null);
  const [connLoading, setConnLoading] = useState<boolean>(false);
  const [connError, setConnError] = useState<string | null>(null);

  const currentEntry = history[historyIndex];
  const source = currentEntry.source;
  const sourceRevision = currentEntry.revision;
  const isDirtyDocument = sourceRevision !== savedRevision;
  const liveSourceRef = useRef({ source, revision: sourceRevision });
  liveSourceRef.current = { source, revision: sourceRevision };

  const ownedPrimitives = useMemo(() => parseOwnedPrimitives(source), [source]);
  const packageObjects = useMemo(() => parseScenePackageObjects(source), [source]);
  const selectedPackageObject = useMemo(
    () => packageObjects.find((obj) => obj.objectId === selectedPackageObjectId) ?? null,
    [packageObjects, selectedPackageObjectId]
  );
  const diagnostics = useMemo(() => analyzeTexDiagnostics(source), [source]);
  const preambleInfo = useMemo(() => inspectPreambleConnections(source), [source]);
  const packagePassport = useMemo(() => inspectFigurePackagePassport(source), [source]);
  const effectiveFigureProfileId: AtomicFigureProfileId =
    figureProfileOverride ?? packagePassport.inferredProfileId;
  const isBeamerActive =
    packagePassport.isBeamerActive || effectiveFigureProfileId === 'beamer-slides';
  const connectedLibraries = useMemo(
    () => packagePassport.libraries.map((l) => l.name),
    [packagePassport]
  );
  const arrowsMetaLoaded = useMemo(
    () => preambleInfo.tikzLibraries.some((l) => l.name === 'arrows.meta'),
    [preambleInfo]
  );

  const selectedPrimitive = useMemo(
    () => ownedPrimitives.find((p) => p.id === selectedPrimitiveId) ?? null,
    [ownedPrimitives, selectedPrimitiveId]
  );

  const selectedPrimitivesList = useMemo(
    () => ownedPrimitives.filter((p) => selectedPrimitiveIds.includes(p.id)),
    [ownedPrimitives, selectedPrimitiveIds]
  );

  // F06: Engineering Contour Geometry Metrics (Length, Gauss Shoelace Area, Perimeter, Centroid, BBox)
  const selectionGeometryMetrics = useMemo(() => {
    const targets =
      selectedPrimitivesList.length > 0
        ? selectedPrimitivesList
        : selectedPrimitive
          ? [selectedPrimitive]
          : [];
    return computeSelectionGeometryMetrics(targets);
  }, [selectedPrimitive, selectedPrimitivesList]);

  // F07: Preamble \tikzset custom style definitions
  const preambleStyles = useMemo(() => extractTikzsetStylesFromPreamble(source), [source]);

  // F11: Visual Canvas Diff Report against immediately preceding revision in history
  const previousRevisionSource = historyIndex > 0 ? history[historyIndex - 1]?.source ?? null : null;
  const visualDiffReport = useMemo(() => {
    if (!previousRevisionSource) return null;
    return computeVisualPrimitiveDiff(previousRevisionSource, source);
  }, [previousRevisionSource, source]);

  const activeSpecimenMeta = useMemo(
    () => allDocuments.find((s) => s.id === specimenId) ?? allDocuments[0],
    [allDocuments, specimenId]
  );

  const pendingSpecimenMeta = useMemo(
    () => (pendingSpecimenId ? allDocuments.find((s) => s.id === pendingSpecimenId) ?? null : null),
    [allDocuments, pendingSpecimenId]
  );

  const pdfStatus: 'absent' | 'current' | 'stale' =
    builtRevision === null ? 'absent' :
      builtRevision === sourceRevision && builtSource === source && buildStatus === 'succeeded' &&
      pdfUnderlayResponse !== null && externalDiskChange === null ? 'current' : 'stale';

  // P20 + P49: Persist workspace settings, panelCols, snippets & recent files to eframe::Storage mirror
  useEffect(() => {
    saveEframeStorage({
      theme,
      fontSizePt,
      softWrap,
      inspectorCollapsed,
      liveAutoBuild,
      recentFiles,
      customSnippets,
      panelCols,
    });
  }, [
    customSnippets,
    fontSizePt,
    inspectorCollapsed,
    liveAutoBuild,
    panelCols,
    recentFiles,
    softWrap,
    theme,
  ]);

  // P49: Native pointer drag for vertical panel splitters
  useEffect(() => {
    const onPointerMove = (ev: PointerEvent) => {
      const drag = splitterDragRef.current;
      const rowEl = studioRowRef.current;
      if (!drag || !rowEl) return;
      const rect = rowEl.getBoundingClientRect();
      if (rect.width <= 200) return;
      const deltaCols = Math.round(((ev.clientX - drag.startX) / rect.width) * 24);
      if (drag.which === 'canvas-code') {
        const nextCanvas = drag.startCols.canvas + deltaCols;
        const nextCode = inspectorCollapsed ? 24 - nextCanvas : drag.startCols.code - deltaCols;
        setPanelCols(clampSplitterColumns(nextCanvas, nextCode, inspectorCollapsed));
      } else {
        const nextCode = drag.startCols.code + deltaCols;
        setPanelCols(clampSplitterColumns(drag.startCols.canvas, nextCode, false));
      }
    };
    const onPointerUp = () => {
      splitterDragRef.current = null;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [inspectorCollapsed]);

  // Sync theme attributes to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-tikz-theme', theme);
    const themeMeta = UI_THEMES.find((t) => t.id === theme);
    if (themeMeta?.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Fetch real connection report on startup & when profile switches
  const runConnectionsCheck = useCallback(async (targetProfile: 'host-actual' | 'win10-miktex') => {
    setConnLoading(true);
    setConnError(null);
    try {
      if (isTauriRuntime() && targetProfile === 'host-actual') {
        const nativeReport = await tauriDoctorEnvironment<BackendConnectionReport>();
        setConnReport(nativeReport);
        return;
      }
      const res = await fetch(`/api/connections/check?profile=${targetProfile}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as BackendConnectionReport;
      setConnReport(data);
    } catch (err) {
      setConnError(err instanceof Error ? err.message : 'Сбой сетевого запроса');
    } finally {
      setConnLoading(false);
    }
  }, []);

  useEffect(() => {
    runConnectionsCheck(connProfile);
  }, [connProfile, runConnectionsCheck]);

  // P18: Subscribe to Tauri v2 `notify::RecommendedWatcher` IPC events or poll HTTP mirror
  useEffect(() => {
    let cancelled = false;
    let unlistenTauri: (() => void) | null = null;

    if (isTauriRuntime()) {
      void subscribeTauriExternalFileChanges((payload) => {
        if (cancelled) return;
        setExternalDiskChange({
          filename: payload.filename,
          diskSource: payload.diskSource,
          updatedAt: new Date().toLocaleTimeString('ru-RU'),
          externalEditor: payload.externalEditor,
        });
      }).then((fn) => {
        if (cancelled) fn();
        else unlistenTauri = fn;
      });
      return () => {
        cancelled = true;
        if (unlistenTauri) unlistenTauri();
      };
    }

    const checkWatcher = async () => {
      try {
        const res = await fetch(`/api/fs/watch-status?filename=${encodeURIComponent(filename)}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          externalChange?: {
            filename: string;
            diskSource: string;
            updatedAt: string;
            externalEditor: string;
          } | null;
        };
        if (!cancelled && data.externalChange) {
          setExternalDiskChange((prev) =>
            prev?.updatedAt === data.externalChange?.updatedAt ? prev : data.externalChange ?? null
          );
        }
      } catch {
        // Ignore transient network hiccups during background polling
      }
    };
    const interval = window.setInterval(checkWatcher, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [filename]);

  const recordRecentFile = useCallback((fname: string, titleRu: string) => {
    const stamp = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    setRecentFiles((prev) => [
      { filename: fname, titleRu, openedAt: stamp },
      ...prev.filter((r) => r.filename !== fname).slice(0, 7),
    ]);
  }, []);

  const pushSourceChange = useCallback(
    (nextSource: string, labelRu: string) => {
      if (nextSource === source) return;
      buildGateRef.current.invalidate();
      setBuildStatus((prev) => prev === 'running' ? 'cancelled' : prev);
      setPdfUnderlayLoading(false);
      const nextRev = history[history.length - 1].revision + 1;
      const truncated = history.slice(0, historyIndex + 1);
      const nextStack = [...truncated, { source: nextSource, revision: nextRev, labelRu }];
      liveSourceRef.current = { source: nextSource, revision: nextRev };
      setHistory(nextStack);
      setHistoryIndex(nextStack.length - 1);
    },
    [history, historyIndex, source]
  );

  const executeBuildCycle = useCallback(
    async (targetRev: number, targetSource: string, switchToPdfTab = true) => {
      const ticket = buildGateRef.current.begin(targetSource, targetRev, documentEpochRef.current);
      liveAdmissionRef.current.remember(targetSource, targetRev, documentEpochRef.current);
      const current = () => buildGateRef.current.isCurrent(ticket,
        liveSourceRef.current.source, liveSourceRef.current.revision, documentEpochRef.current);
      setBuildStatus('running');
      setPdfUnderlayLoading(true);
      try {
        const result = await requestAuthoritativePdf(engineAdapter, {
          source: targetSource, revision: targetRev, ...stageBoundsCm, dpi: 144,
        });
        if (!current()) return;
        setPdfUnderlayResponse(result);
        setBuildStatus('succeeded');
        setBuiltRevision(targetRev);
        setBuiltSource(targetSource);
        setBuiltAt(`XeLaTeX · rev #${targetRev} · ${new Date().toLocaleTimeString('ru-RU')}`);
        setLastGoodPrimitives(parseOwnedPrimitives(targetSource));
        if (switchToPdfTab) {
          setCanvasMode((prev) => prev === 'onion' || prev === 'split' ? prev : 'pdf');
          setToastBanner(`PDF ${filename}: внешний XeLaTeX подтвердил ревизию #${targetRev}.`);
        }
      } catch (error) {
        if (!current()) return;
        setBuildStatus('failed');
        setToastBanner(error instanceof Error ? error.message : String(error));
      } finally {
        if (current()) setPdfUnderlayLoading(false);
      }
    },
    [engineAdapter, filename, stageBoundsCm.minXCm, stageBoundsCm.maxXCm, stageBoundsCm.minYCm, stageBoundsCm.maxYCm]
  );

  // P15: Debounced Live Auto-Build on idle (900ms) when enabled
  useEffect(() => {
    if (!liveAutoBuild) { liveAdmissionRef.current.reset(); return; }
    if (pdfStatus === 'current' || buildStatus === 'running' ||
        !liveAdmissionRef.current.shouldSchedule(source, sourceRevision, documentEpochRef.current)) return;
    if (liveDebounceRef.current) {
      window.clearTimeout(liveDebounceRef.current);
    }
    liveDebounceRef.current = window.setTimeout(() => {
      liveDebounceRef.current = null;
      executeBuildCycle(sourceRevision, source, false);
    }, 900);
    return () => {
      if (liveDebounceRef.current) {
        window.clearTimeout(liveDebounceRef.current);
      }
    };
  }, [executeBuildCycle, liveAutoBuild, pdfStatus, buildStatus, source, sourceRevision]);

  // A visible PDF pane is not consent to execute TeX. Only explicit Build or
  // the session-scoped Live toggle calls the native engine. Opening stays read-only.

  const loadDocumentObject = useCallback(
    (doc: SpecimenDocument) => {
      buildGateRef.current.invalidate();
      documentEpochRef.current++;
      liveSourceRef.current = { source: doc.source, revision: 1 };
      setNativeFilePath(null);
      setSavedDirectory(null);
      setLiveAutoBuild(false);
      setPdfUnderlayLoading(false);
      setPdfUnderlayResponse(null);
      setBuiltSource(null);
      setSpecimenId(doc.id);
      setFilename(doc.filename);
      setExternalDiskChange(null);
      setFigureProfileOverride(null);
      setActiveBeamerSlide(null);
      recordRecentFile(doc.filename, doc.titleRu);
      const initialOwned = parseOwnedPrimitives(doc.source);
      setHistory([{ source: doc.source, revision: 1, labelRu: `Открыт ${doc.filename}` }]);
      setHistoryIndex(0);
      setSavedRevision(1);
      const firstId = initialOwned[0]?.id ?? null;
      setSelectedPrimitiveId(firstId);
      setSelectedPrimitiveIds(firstId !== null ? [firstId] : []);
      setSelectedPackageObjectId(null);
      setActiveLine(initialOwned[0]?.lineNumber ?? 1);

      // No source-analysis timer or sample document can stand in for a real build.
      setBuildStatus('idle');
      setBuiltRevision(null);
      setBuiltAt(null);
      setLastGoodPrimitives([]);
    },
    [recordRecentFile]
  );

  const loadSpecimenNow = useCallback(
    (nextId: string) => {
      const found = allDocuments.find((s) => s.id === nextId);
      if (!found) return;
      loadDocumentObject(found);
    },
    [allDocuments, loadDocumentObject]
  );

  const handleCreateFromTemplate = useCallback(
    (
      templateId: DocumentTemplateId,
      options: TemplateCreationOptions,
      saveCurrentFirst: boolean
    ) => {
      const serial = createdDocs.length + 1;
      const newDoc = buildDocumentFromTemplate(templateId, options, serial);
      const tplSpec = DOCUMENT_TEMPLATES.find((t) => t.id === templateId);

      setCreatedDocs((prev) => [newDoc, ...prev.filter((d) => d.filename !== newDoc.filename)]);
      loadDocumentObject(newDoc);
      setActiveTool('select');
      setCanvasMode('sketch');
      setActiveTab('studio');
      setNewTemplateModalOpen(false);

      const savedPrefix = saveCurrentFirst ? `Текущий файл сохранён · ` : '';
      setToastBanner(
        `${savedPrefix}Создан новый документ ${newDoc.filename} по шаблону «${
          tplSpec?.titleRu ?? templateId
        }».`
      );
    },
    [createdDocs.length, loadDocumentObject]
  );

  const handleSelectSpecimen = (nextId: string) => {
    if (nextId === specimenId) return;
    if (isDirtyDocument) {
      setPendingSpecimenId(nextId);
      return;
    }
    loadSpecimenNow(nextId);
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      buildGateRef.current.invalidate();
      setPdfUnderlayLoading(false);
      setBuildStatus((prev) => prev === 'running' ? 'cancelled' : prev);
      setHistoryIndex(historyIndex - 1);
      setToastBanner(`Отменено действие: возврат к ревизии #${history[historyIndex - 1].revision}`);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      buildGateRef.current.invalidate();
      setPdfUnderlayLoading(false);
      setBuildStatus((prev) => prev === 'running' ? 'cancelled' : prev);
      setHistoryIndex(historyIndex + 1);
      setToastBanner(`Возвращено действие: ревизия #${history[historyIndex + 1].revision}`);
    }
  }, [history, historyIndex]);

  const handleSelectPrimitiveOnCanvas = useCallback(
    (id: number | null, toggleMulti = false) => {
      if (id === null) {
        setSelectedPrimitiveId(null);
        setSelectedPrimitiveIds([]);
        return;
      }
      setSelectedPackageObjectId(null);
      if (toggleMulti) {
        setSelectedPrimitiveIds((prev) => {
          const exists = prev.includes(id);
          const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
          setSelectedPrimitiveId(next[next.length - 1] ?? null);
          return next;
        });
      } else {
        const expanded = expandSelectionWithGroups(ownedPrimitives, [id]);
        setSelectedPrimitiveId(id);
        setSelectedPrimitiveIds(expanded);
      }
      const found = ownedPrimitives.find((p) => p.id === id);
      if (found) setActiveLine(found.lineNumber);
    },
    [ownedPrimitives]
  );

  const handleSelectPackageObject = useCallback(
    (objectId: string | null) => {
      if (objectId === null) {
        setSelectedPackageObjectId(null);
        return;
      }
      setSelectedPrimitiveId(null);
      setSelectedPrimitiveIds([]);
      setSelectedPackageObjectId(objectId);
      const found = packageObjects.find((o) => o.objectId === objectId);
      if (found) {
        setActiveLine(found.startLine);
      }
    },
    [packageObjects]
  );

  const handleCreatePackageObjectFromGesture = useCallback(
    (
      toolId: PackageToolId,
      startCm: { x: number; y: number },
      endCm: { x: number; y: number }
    ) => {
      const res = insertPackageCanvasObjectFromGesture(source, toolId, startCm, endCm);
      if (res.ok && res.nextSource !== source) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveId(null);
        setSelectedPrimitiveIds([]);
        setSelectedPackageObjectId(`pkg-L${res.insertedLine}`);
        setActiveLine(res.insertedLine);
        setActiveTool('select');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  const handleMovePackageObjectCm = useCallback(
    (objectId: string, dxCm: number, dyCm: number) => {
      const res = translatePackageObjectInSource(source, objectId, dxCm, dyCm);
      if (res.ok && res.nextSource !== source) {
        pushSourceChange(res.nextSource, res.summaryRu);
      }
    },
    [pushSourceChange, source]
  );

  const handlePatchPackageObject = useCallback(
    (objectId: string, patch: PackageObjectSemanticPatch) => {
      const res = patchPackageObjectInSource(source, objectId, patch);
      if (res.ok && res.nextSource !== source) {
        pushSourceChange(res.nextSource, res.summaryRu);
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  const handleDeletePackageObject = useCallback(
    (objectId: string) => {
      const res = deletePackageObjectFromSource(source, objectId);
      if (res.ok && res.nextSource !== source) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPackageObjectId(null);
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  const handleDownloadRenderedPdf = useCallback(() => {
    if (pdfStatus !== 'current' || !pdfUnderlayResponse) {
      setToastBanner('Экспорт отклонён: нет актуального PDF внешнего XeLaTeX.');
      return;
    }
    try { assertAuthoritativePdf({ source, revision: sourceRevision, ...stageBoundsCm }, pdfUnderlayResponse); }
    catch (error) { setToastBanner(String(error)); return; }
    const b64 = pdfUnderlayResponse.pdfBase64!;
    const binary = window.atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stem = filename.replace(/\.(tex|tikz)$/i, '') || 'figure';
    a.href = url;
    a.download = `${stem}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastBanner(`Скачан отрендеренный PDF «${stem}.pdf» (${pdfUnderlayResponse.engineLabelRu}).`);
  }, [filename, pdfUnderlayResponse, pdfStatus, source, sourceRevision, stageBoundsCm]);

  const handleSelectMultiplePrimitives = useCallback((ids: number[]) => {
    setSelectedPrimitiveIds(ids);
    setSelectedPrimitiveId(ids[0] ?? null);
    if (ids.length >= 2) {
      setToastBanner(`Выделено объектов: ${ids.length} шт.`);
    }
  }, []);

  const handleMovePrimitivesCm = useCallback(
    (primitiveIds: number[], dxCm: number, dyCm: number) => {
      let nextSource = source;
      for (const id of primitiveIds) {
        const cur = parseOwnedPrimitives(nextSource).find((p) => p.id === id);
        if (!cur) continue;
        const movedValues = translateOwnedPrimitiveCm(cur.tool, cur.values, dxCm, dyCm);
        nextSource = applyOwnedPrimitivePatch(nextSource, id, movedValues);
      }
      // F03: Automatically reroute bound from_node / to_node connectors when named nodes move
      const rerouted = rerouteBoundConnectorsInSource(nextSource);
      nextSource = rerouted.nextSource;
      pushSourceChange(
        nextSource,
        primitiveIds.length > 1
          ? `Перемещена группа (${primitiveIds.length} шт.)`
          : `Перемещён примитив #${primitiveIds[0]}`
      );
    },
    [pushSourceChange, source]
  );

  const handleAlignSelected = useCallback(
    (mode: AlignmentMode) => {
      if (selectedPrimitiveIds.length < 2) return;
      const nextSource = alignOwnedPrimitivesInSource(source, selectedPrimitiveIds, mode);
      pushSourceChange(nextSource, `Выравнивание (${mode}) для ${selectedPrimitiveIds.length} примитивов`);
      setToastBanner(`Выполнено пакетное выравнивание (${selectedPrimitiveIds.length} объектов).`);
    },
    [pushSourceChange, selectedPrimitiveIds, source]
  );

  const handleDeleteSelectedPrimitives = useCallback(() => {
    if (selectedPrimitiveIds.length === 0) return;
    let nextSource = source;
    for (const id of selectedPrimitiveIds) {
      if (parseOwnedPrimitives(nextSource).some((p) => p.id === id)) {
        nextSource = deleteOwnedPrimitiveFromSource(nextSource, id);
      }
    }
    pushSourceChange(nextSource, `Удалено объектов: ${selectedPrimitiveIds.length}`);
    const remaining = parseOwnedPrimitives(nextSource);
    const first = remaining[0]?.id ?? null;
    setSelectedPrimitiveId(first);
    setSelectedPrimitiveIds(first !== null ? [first] : []);
    setToastBanner(`Удалено примитивов из .tex: ${selectedPrimitiveIds.length} шт.`);
  }, [pushSourceChange, selectedPrimitiveIds, source]);

  const handleDuplicatePrimitive = useCallback(
    (primitiveId: number) => {
      const { nextSource, newId, insertedLine } = duplicateOwnedPrimitiveInSource(source, primitiveId);
      pushSourceChange(nextSource, `Дублирован примитив #${primitiveId} → #${newId}`);
      setSelectedPrimitiveId(newId);
      setSelectedPrimitiveIds([newId]);
      setActiveLine(insertedLine);
      setToastBanner(`Создана копия #${newId} со сдвигом (строка ${insertedLine}).`);
    },
    [pushSourceChange, source]
  );

  const handleDeletePrimitive = useCallback(
    (primitiveId: number) => {
      const nextSource = deleteOwnedPrimitiveFromSource(source, primitiveId);
      pushSourceChange(nextSource, `Удалён примитив #${primitiveId}`);
      const remaining = parseOwnedPrimitives(nextSource);
      const first = remaining[0]?.id ?? null;
      setSelectedPrimitiveId(first);
      setSelectedPrimitiveIds(first !== null ? [first] : []);
      setToastBanner(`Примитив #${primitiveId} удалён из исходника .tex.`);
    },
    [pushSourceChange, source]
  );

  const handleCreatePrimitiveFromGesture = (
    tool: ToolId,
    startCm: { x: number; y: number },
    endCm: { x: number; y: number },
    constrainShift = false,
    smartBind?: { fromNodeId?: string; toNodeId?: string }
  ) => {
    const draft = computeGestureDraftPreview(tool, startCm, endCm, {
      constrainShift,
      forCommit: true,
    });
    const nextValues = { ...draft.values };
    if (smartBind?.fromNodeId) nextValues.from_node = smartBind.fromNodeId;
    if (smartBind?.toNodeId) nextValues.to_node = smartBind.toNodeId;
    const { nextSource, newId, insertedLine } = insertOwnedPrimitiveIntoSource(source, tool, nextValues);
    pushSourceChange(nextSource, `Создан примитив #${newId} (${tool})`);
    setSelectedPrimitiveId(newId);
    setSelectedPrimitiveIds([newId]);
    setActiveLine(insertedLine);
    setActiveTool('select');
  };

  const handleSelectFigureProfile = useCallback(
    (nextProfileId: AtomicFigureProfileId) => {
      setFigureProfileOverride(nextProfileId);
      const res = applyAtomicFigureProfileToPreamble(source, nextProfileId);
      if (res.ok && res.nextSource !== source) {
        pushSourceChange(res.nextSource, res.summaryRu);
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  const handleApplyPrimitivePatch = (
    primitiveId: number,
    nextValues: Record<string, string>,
    customLabelRu?: string
  ) => {
    let base = source;
    if (nextValues.stroke_color?.startsWith('oi')) {
      base = ensureDefineColorInPreamble(base, nextValues.stroke_color);
    }
    if (nextValues.fill_color?.startsWith('oi')) {
      base = ensureDefineColorInPreamble(base, nextValues.fill_color);
    }
    const targetPrim = ownedPrimitives.find((p) => p.id === primitiveId);
    const autoLibs = targetPrim
      ? ensureRequiredLibsForInspectorPatch(base, targetPrim.tool, nextValues)
      : { nextSource: base, autoConnectedLibs: [] };
    base = autoLibs.nextSource;
    let nextSource = applyOwnedPrimitivePatch(base, primitiveId, nextValues);
    // F03: Keep bound connectors synced when node coordinates change via Inspector or handles
    nextSource = rerouteBoundConnectorsInSource(nextSource).nextSource;
    pushSourceChange(nextSource, customLabelRu ?? `Обновлён примитив #${primitiveId}`);
    if (autoLibs.autoConnectedLibs.length > 0) {
      setToastBanner(
        `В паспорт преамбулы автоматически подключено: ${autoLibs.autoConnectedLibs.join(', ')}.`
      );
    }
  };

  // E02, E08, F01, F02, F04, F06, F11: Stage 1–4 Handlers
  const handleTogglePinWorkshop = useCallback((id: WorkshopTargetId) => {
    setPinnedWorkshopIds((prev) => {
      let next: WorkshopTargetId[];
      if (prev.includes(id)) {
        next = prev.filter((x) => x !== id);
      } else {
        next = [...prev, id].slice(-4);
      }
      savePinnedWorkshopIds(next);
      return next;
    });
  }, []);

  const handleLaunchWorkshopTarget = useCallback((id: WorkshopTargetId) => {
    setWorkshopsHubOpen(false);
    switch (id) {
      case 'hub-extensions':
        setWorkshopsHubTab('extensions');
        setWorkshopsHubOpen(true);
        break;
      case 'hub-geometry':
        setWorkshopsHubTab('geometry');
        setWorkshopsHubOpen(true);
        break;
      case 'hub-engineering':
        setWorkshopsHubTab('engineering');
        setWorkshopsHubOpen(true);
        break;
      case 'hub-stats':
        setWorkshopsHubTab('stats');
        setWorkshopsHubOpen(true);
        break;
      case 'hub-preamble-diff':
        setWorkshopsHubTab('preamble-diff');
        setWorkshopsHubOpen(true);
        break;
      case 'legacy-cad-stamps':
        setCadModalTab('stamps');
        setCadModalOpen(true);
        break;
      case 'legacy-cad-foreach':
        setCadModalTab('foreach');
        setCadModalOpen(true);
        break;
      case 'legacy-cad-pgfplots':
        setWorkshopsHubExtensionId('pgfplots');
        setWorkshopsHubTab('extensions');
        setWorkshopsHubOpen(true);
        break;
      case 'legacy-adv-gost':
        setAdvModalTab('geometry-gost');
        setAdvModalOpen(true);
        break;
      case 'legacy-adv-plots':
        setAdvModalTab('plots-fields');
        setAdvModalOpen(true);
        break;
      case 'legacy-adv-layers':
        setAdvModalTab('layers-beamer');
        setAdvModalOpen(true);
        break;
      case 'legacy-notations':
        setNotationsModalTab('notations');
        setNotationsModalOpen(true);
        break;
      case 'legacy-3d-fillet':
        setNotationsModalTab('cad-fillet-spy');
        setNotationsModalOpen(true);
        break;
      case 'legacy-outliner':
        setNotationsModalTab('outliner-table');
        setNotationsModalOpen(true);
        break;
      case 'legacy-audit-session':
        setNotationsModalTab('audit-session');
        setNotationsModalOpen(true);
        break;
      case 'legacy-formatter':
        setFormatterModalTab('format-refactor');
        setFormatterModalOpen(true);
        break;
      case 'legacy-spline-offset':
        setFormatterModalTab('cad-spline-offset');
        setFormatterModalOpen(true);
        break;
      case 'legacy-svg-booktabs':
        setFormatterModalTab('svg-booktabs-bundle');
        setFormatterModalOpen(true);
        break;
      case 'legacy-project':
        setProjectModalTab('workspace');
        setProjectModalOpen(true);
        break;
      case 'legacy-snippets':
        setSnippetsModalOpen(true);
        break;
    }
  }, []);

  const handleInsertPolyVertexAtEdge = useCallback(
    (primitiveId: number, edgeIndex: number) => {
      const res = insertPolyVertexAtEdgeInSource(source, primitiveId, edgeIndex);
      if (res.ok) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setToastBanner(res.summaryRu);
      }
    },
    [pushSourceChange, source]
  );

  const handleDeletePolyVertexAtIndex = useCallback(
    (primitiveId: number, vertexIndex: number) => {
      const res = deletePolyVertexAtIndexInSource(source, primitiveId, vertexIndex);
      setToastBanner(res.summaryRu);
      if (res.ok) {
        pushSourceChange(res.nextSource, res.summaryRu);
      }
    },
    [pushSourceChange, source]
  );

  const handleTogglePolyClosed = useCallback(
    (primitiveId: number) => {
      const res = togglePolyClosedInSource(source, primitiveId);
      setToastBanner(res.summaryRu);
      if (res.ok) {
        pushSourceChange(res.nextSource, res.summaryRu);
      }
    },
    [pushSourceChange, source]
  );

  const handleCreateThreePointArc = useCallback(
    (p1: { x: number; y: number }, pMid: { x: number; y: number }, p2: { x: number; y: number }) => {
      const res = insertThreePointArcIntoSource(source, p1, pMid, p2);
      pushSourceChange(res.nextSource, res.summaryRu);
      if (res.insertedIds.length > 0) {
        setSelectedPrimitiveIds(res.insertedIds);
        setSelectedPrimitiveId(res.insertedIds[0]);
      }
      setActiveTool('select');
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  const handleGroupSelected = useCallback(() => {
    const res = groupPrimitivesInSource(source, selectedPrimitiveIds);
    setToastBanner(res.summaryRu);
    if (res.ok) {
      pushSourceChange(res.nextSource, res.summaryRu);
    }
  }, [pushSourceChange, selectedPrimitiveIds, source]);

  const handleUngroupSelected = useCallback(() => {
    const targets =
      selectedPrimitiveIds.length > 0
        ? selectedPrimitiveIds
        : selectedPrimitiveId !== null
          ? [selectedPrimitiveId]
          : [];
    const res = ungroupPrimitivesInSource(source, targets);
    setToastBanner(res.summaryRu);
    if (res.ok) {
      pushSourceChange(res.nextSource, res.summaryRu);
    }
  }, [pushSourceChange, selectedPrimitiveId, selectedPrimitiveIds, source]);

  const handleInsertCentroidMarker = useCallback(() => {
    if (!selectionGeometryMetrics) return;
    const res = insertCentroidMarkerIntoSource(source, selectionGeometryMetrics.centroidCm, 'C');
    pushSourceChange(res.nextSource, res.summaryRu);
    if (res.insertedIds.length > 0) {
      setSelectedPrimitiveIds(res.insertedIds);
      setSelectedPrimitiveId(res.insertedIds[0]);
    }
    setToastBanner(res.summaryRu);
  }, [pushSourceChange, selectionGeometryMetrics, source]);

  const handleRevertSinglePrimitiveFromDiff = useCallback(
    (primitiveId: number) => {
      if (!previousRevisionSource) return;
      const res = revertSinglePrimitiveFromRevision(source, previousRevisionSource, primitiveId);
      setToastBanner(res.summaryRu);
      if (res.ok) {
        pushSourceChange(res.nextSource, res.summaryRu);
      }
    },
    [previousRevisionSource, pushSourceChange, source]
  );

  const handleInsertNewFromInspector = (toolId: ToolId, values: Record<string, string>) => {
    let base = source;
    if (values.stroke_color?.startsWith('oi')) {
      base = ensureDefineColorInPreamble(base, values.stroke_color);
    }
    if (values.fill_color?.startsWith('oi')) {
      base = ensureDefineColorInPreamble(base, values.fill_color);
    }
    const autoLibs = ensureRequiredLibsForInspectorPatch(base, toolId, values);
    base = autoLibs.nextSource;
    const { nextSource, newId, insertedLine } = insertOwnedPrimitiveIntoSource(base, toolId, values);
    pushSourceChange(nextSource, `Добавлен примитив #${newId}`);
    setSelectedPrimitiveId(newId);
    setSelectedPrimitiveIds([newId]);
    setActiveLine(insertedLine);
    if (autoLibs.autoConnectedLibs.length > 0) {
      setToastBanner(
        `Добавлен примитив #${newId} · в преамбулу подключено: ${autoLibs.autoConnectedLibs.join(', ')}.`
      );
    }
  };

  // P21: Dimension Callouts & Angle Arcs
  const handleCreateCalloutFromGesture = useCallback(
    (startCm: { x: number; y: number }, endCm: { x: number; y: number }) => {
      const { nextSource, newId, insertedLine } = insertDimensionCalloutIntoSource(
        source,
        startCm,
        endCm
      );
      pushSourceChange(nextSource, `Добавлена размерная выноска ГОСТ #${newId} (P21)`);
      setSelectedPrimitiveId(newId);
      setSelectedPrimitiveIds([newId]);
      setActiveLine(insertedLine);
      setActiveTool('select');
      setToastBanner(`Создана размерная выноска #${newId} |<->| на строке ${insertedLine}.`);
    },
    [pushSourceChange, source]
  );

  const handleToggleCalloutOnPrimitive = useCallback(
    (primitiveId: number) => {
      const nextSource = convertPrimitiveToDimensionCallout(source, primitiveId);
      if (nextSource !== source) {
        pushSourceChange(nextSource, `Переключён режим размерной выноски #${primitiveId} (P21)`);
        setToastBanner(`Переключена размерная выноска |<->| на объекте #${primitiveId}.`);
      }
    },
    [pushSourceChange, source]
  );

  const handleInsertAngleArc = useCallback(
    (
      vertexCm: { x: number; y: number },
      ray1Deg: number,
      ray2Deg: number,
      radiusCm: number,
      labelLatex: string
    ) => {
      const res = insertAngleArcIntoSource(source, vertexCm, ray1Deg, ray2Deg, radiusCm, labelLatex);
      pushSourceChange(res.nextSource, `Добавлена угловая дуга ${res.computedDeg.toFixed(0)}° (P21)`);
      setActiveLine(res.insertedLine);
      setActiveTab('studio');
      setToastBanner(`Вставлена угловая дуга ${res.computedDeg.toFixed(0)}° и узел подписи $${labelLatex}$.`);
    },
    [pushSourceChange, source]
  );

  // P22: Geometric Rotate / Mirror / Scale
  const handleRotatePrimitives = useCallback(
    (primitiveIds: number[], angleDeg: number) => {
      if (primitiveIds.length === 0) return;
      const nextSource = rotateOwnedPrimitivesInSource(source, primitiveIds, angleDeg);
      pushSourceChange(
        nextSource,
        `Поворот на ${angleDeg > 0 ? `+${angleDeg}` : angleDeg}° (${primitiveIds.length} шт.)`
      );
      setToastBanner(`Повернуто объектов: ${primitiveIds.length} на ${angleDeg > 0 ? `+${angleDeg}` : angleDeg}°.`);
    },
    [pushSourceChange, source]
  );

  const handleMirrorPrimitives = useCallback(
    (primitiveIds: number[], axis: 'x' | 'y') => {
      if (primitiveIds.length === 0) return;
      const nextSource = mirrorOwnedPrimitivesInSource(source, primitiveIds, axis);
      pushSourceChange(nextSource, `Зеркальное отражение по оси ${axis.toUpperCase()} (${primitiveIds.length} шт.)`);
      setToastBanner(`Зеркально отражено (${primitiveIds.length} шт.) по оси ${axis.toUpperCase()}.`);
    },
    [pushSourceChange, source]
  );

  const handleScalePrimitives = useCallback(
    (primitiveIds: number[], factor: number) => {
      if (primitiveIds.length === 0) return;
      const nextSource = scaleOwnedPrimitivesInSource(source, primitiveIds, factor);
      pushSourceChange(nextSource, `Масштабирование ×${factor} (${primitiveIds.length} шт.)`);
      setToastBanner(`Масштабировано объектов: ${primitiveIds.length} (×${factor}).`);
    },
    [pushSourceChange, source]
  );

  // P23: Parametric \foreach Array
  const handleApplyForeachArray = useCallback(
    (cfg: ForeachArrayConfig) => {
      const targetIds =
        selectedPrimitiveIds.length > 0
          ? selectedPrimitiveIds
          : selectedPrimitiveId !== null
            ? [selectedPrimitiveId]
            : [];
      const res = generateForeachArrayInSource(source, targetIds, cfg);
      pushSourceChange(
        res.nextSource,
        `Сгенерирован параметрический цикл \\foreach (${cfg.kind === 'linear' ? 'линейный' : 'круговой'}, ${cfg.count} шт.)`
      );
      setActiveLine(res.insertedLine);
      setActiveTab('studio');
      setToastBanner(`Вставлен цикл \\foreach (${cfg.count} повторений) на строке ${res.insertedLine}.`);
    },
    [pushSourceChange, selectedPrimitiveId, selectedPrimitiveIds, source]
  );

  // P25: Scientific Component Stamps
  const handleInsertScientificStamp = useCallback(
    (stampId: string, xCm: number, yCm: number, scale = 1.0, labelLatex?: string) => {
      const res = insertScientificStampIntoSource(source, stampId, xCm, yCm, scale, labelLatex);
      pushSourceChange(res.nextSource, `Вставлен научный штамп (${stampId}, ${res.insertedIds.length} прим.)`);
      setSelectedPrimitiveIds(res.insertedIds);
      setSelectedPrimitiveId(res.insertedIds[0] ?? null);
      setActiveLine(res.lastLine);
      setActiveTab('studio');
      setToastBanner(`На холст добавлен штамп (${res.insertedIds.length} примитивов n1).`);
    },
    [pushSourceChange, source]
  );

  // P27: PGFPlots Axis Inspector
  const handleApplyPgfplotsAxis = useCallback(
    (cfg: PgfplotsAxisConfig) => {
      const nextSource = upsertPgfplotsAxisInSource(source, cfg);
      pushSourceChange(nextSource, 'Обновлён паспорт осей \\begin{axis} PGFPlots (P27)');
      setActiveTab('studio');
      setToastBanner('Окружение \\begin{axis} PGFPlots синхронизировано с исходником .tex.');
    },
    [pushSourceChange, source]
  );

  // P29: Okabe-Ito Palette
  const handleApplyOkabeItoColor = useCallback(
    (colorId: string, recommendedDash: string) => {
      let cur = ensureDefineColorInPreamble(source, colorId);
      const targetIds =
        selectedPrimitiveIds.length > 0
          ? selectedPrimitiveIds
          : selectedPrimitiveId !== null
            ? [selectedPrimitiveId]
            : [];
      for (const id of targetIds) {
        const p = parseOwnedPrimitives(cur).find((item) => item.id === id);
        if (!p) continue;
        const nextVals: Record<string, string> = { ...p.values, stroke_color: colorId };
        if (p.tool !== 'node' && recommendedDash && recommendedDash !== 'solid') {
          nextVals.line_style = recommendedDash;
        }
        cur = applyOwnedPrimitivePatch(cur, id, nextVals);
      }
      pushSourceChange(cur, `Подключён цвет Okabe–Ito ${colorId} (P29)`);
      setToastBanner(
        targetIds.length > 0
          ? `Цвет \\definecolor{${colorId}} применён к ${targetIds.length} объектам.`
          : `В преамбулу добавлен \\definecolor{${colorId}} палитры Okabe–Ito.`
      );
    },
    [pushSourceChange, selectedPrimitiveId, selectedPrimitiveIds, source]
  );

  // P30: Bidirectional SyncTeX Click-to-Source in PDF Mode
  const handleSyncTexJump = useCallback(
    (clickCm: { x: number; y: number }) => {
      const hit = resolveSyncTexClick(source, ownedPrimitives, clickCm);
      if (layoutFocus === 'focus-canvas') {
        setLayoutFocus('tri-pane');
      }
      setActiveLine(hit.lineNumber);
      const matchedOwned = ownedPrimitives.find((p) => p.lineNumber === hit.lineNumber);
      if (matchedOwned) {
        setSelectedPrimitiveId(matchedOwned.id);
        setSelectedPrimitiveIds([matchedOwned.id]);
      }
      setToastBanner(`SyncTeX → строка ${hit.lineNumber} (${hit.kindRu}): ${hit.snippet}`);
    },
    [layoutFocus, ownedPrimitives, source]
  );

  // P31 + P32: Shared Style & Composite Subfigure Matrix
  const handleInjectSharedStyleCurrent = useCallback(() => {
    const nextSource = injectSharedStyleIntoDocument(source, sharedStyleTikz);
    pushSourceChange(nextSource, 'Внедрены единые макросы shared_style.tikz (P31)');
    setToastBanner(`Единый стилевой паспорт внедрён в ${filename}.`);
  }, [filename, pushSourceChange, sharedStyleTikz, source]);

  const handleInjectSharedStyleAll = useCallback(() => {
    const nextSource = injectSharedStyleIntoDocument(source, sharedStyleTikz);
    pushSourceChange(nextSource, 'Синхронизирован shared_style.tikz по проекту (P31)');
    setCreatedDocs((prev) =>
      prev.map((d) => ({
        ...d,
        source: injectSharedStyleIntoDocument(d.source, sharedStyleTikz),
      }))
    );
    setToastBanner('Единый стилевой паспорт shared_style.tikz обновлён во всех файлах проекта.');
  }, [pushSourceChange, sharedStyleTikz, source]);

  const handleCreateCompositeSubfigureDoc = useCallback(
    (doc: SpecimenDocument) => {
      setCreatedDocs((prev) => [doc, ...prev.filter((d) => d.filename !== doc.filename)]);
      loadDocumentObject(doc);
      setActiveTab('studio');
      setCanvasMode('sketch');
      setToastBanner(`Собрана составная мультипанель ${doc.filename} (P32).`);
    },
    [loadDocumentObject]
  );

  // P35: System Clipboard Copy Rendered SVG/PNG & Paste TSV Table
  const handleCopyRenderedCanvasToClipboard = useCallback(async () => {
    const svgMarkup = buildStandaloneVectorSvgMarkup(ownedPrimitives);
    try {
      await navigator.clipboard.writeText(svgMarkup);
      setToastBanner(
        `Векторный рендер схемы (${ownedPrimitives.length} объектов, SVG) скопирован в системный буфер ОС (P35).`
      );
    } catch {
      setToastBanner('Сформирован буфер векторного изображения для копирования (P35).');
    }
  }, [ownedPrimitives]);

  const handlePasteClipboardTable = useCallback(
    (tsvText: string, mode: 'n1-points' | 'pgfplots-addplot') => {
      const res = parseClipboardTableToSource(source, tsvText, mode);
      if (res.ok) {
        pushSourceChange(res.nextSource, res.summaryRu);
        const updatedOwned = parseOwnedPrimitives(res.nextSource);
        if (updatedOwned.length > 0) {
          const last = updatedOwned[updatedOwned.length - 1];
          setSelectedPrimitiveId(last.id);
          setSelectedPrimitiveIds([last.id]);
          setActiveLine(last.lineNumber);
        }
        setActiveTab('studio');
        setToastBanner(res.summaryRu);
      } else {
        setToastBanner(res.summaryRu);
      }
    },
    [pushSourceChange, source]
  );

  // P36: Closed Polygons (-- cycle) & Multi-Vertex Contours
  const handleCreatePolygonFromGesture = useCallback(
    (pointsCm: { xCm: number; yCm: number }[], closed: boolean) => {
      const res = insertPolygonContourIntoSource(
        source,
        pointsCm,
        closed,
        closed ? { fillColor: 'cyan!10' } : { strokeWidth: 'thick' }
      );
      pushSourceChange(
        res.nextSource,
        closed
          ? `Построен замкнутый полигон -- cycle #${res.newId} (${pointsCm.length} вершин, P36)`
          : `Построена ломаная #${res.newId} (${pointsCm.length} узлов, P36)`
      );
      setSelectedPrimitiveId(res.newId);
      setSelectedPrimitiveIds([res.newId]);
      setActiveLine(res.insertedLine);
      setActiveTool('select');
      setToastBanner(
        closed
          ? `Создан замкнутый контур #${res.newId} (${pointsCm.length} вершин, -- cycle).`
          : `Создана многозвенная ломаная #${res.newId} (${pointsCm.length} узлов).`
      );
    },
    [pushSourceChange, source]
  );

  const handleInsertPolygonPreset = useCallback(
    (
      pointsCm: { xCm: number; yCm: number }[],
      closed: boolean,
      options?: { hatchPattern?: string; fillColor?: string; titleRu?: string }
    ) => {
      const res = insertPolygonContourIntoSource(source, pointsCm, closed, {
        hatchPattern: options?.hatchPattern,
        fillColor: options?.fillColor,
        strokeWidth: 'thick',
      });
      pushSourceChange(
        res.nextSource,
        `Вставлен контур «${options?.titleRu ?? 'Полигон'}» #${res.newId} (P36)`
      );
      setSelectedPrimitiveId(res.newId);
      setSelectedPrimitiveIds([res.newId]);
      setActiveLine(res.insertedLine);
      setActiveTab('studio');
      setToastBanner(`На холст добавлен контур «${options?.titleRu ?? 'Полигон'}» #${res.newId}.`);
    },
    [pushSourceChange, source]
  );

  // P37: Exact Intersections & Perpendiculars
  const handleConstructGeometry = useCallback(() => {
    const targetIds =
      selectedPrimitiveIds.length >= 2
        ? selectedPrimitiveIds
        : ownedPrimitives.slice(0, 2).map((p) => p.id);
    const res = constructIntersectionOrPerpendicularInSource(source, targetIds);
    if (res.ok) {
      pushSourceChange(res.nextSource, res.summaryRu);
      if (res.insertedIds.length > 0) {
        setSelectedPrimitiveIds(res.insertedIds);
        setSelectedPrimitiveId(res.insertedIds[0] ?? null);
      }
      setActiveTab('studio');
    }
    setToastBanner(res.summaryRu);
  }, [ownedPrimitives, pushSourceChange, selectedPrimitiveIds, source]);

  // P38: ГОСТ 2.306 Hatch Patterns
  const handleApplyHatchToSelection = useCallback(
    (hatchId: string) => {
      const targetIds =
        selectedPrimitiveIds.length > 0
          ? selectedPrimitiveIds
          : selectedPrimitiveId !== null
            ? [selectedPrimitiveId]
            : [];
      if (targetIds.length === 0) {
        setToastBanner('Выделите замкнутую фигуру (прямоугольник, окружность или полигон) для штриховки.');
        return;
      }
      let cur = source;
      if (hatchId) {
        const lib = proposeLibraryConnect(cur, 'patterns');
        if (lib.ok) cur = lib.nextSource;
      }
      let applied = 0;
      for (const id of targetIds) {
        const p = parseOwnedPrimitives(cur).find((item) => item.id === id);
        if (!p) continue;
        if (p.tool === 'rectangle' || p.tool === 'circle' || p.values.closed_cycle === 'true') {
          cur = applyOwnedPrimitivePatch(cur, id, { ...p.values, hatch_pattern: hatchId });
          applied++;
        }
      }
      if (applied > 0) {
        pushSourceChange(
          cur,
          hatchId
            ? `Применена штриховка ГОСТ (${hatchId}) к ${applied} объектам (P38)`
            : `Снята штриховка с ${applied} объектов`
        );
        setToastBanner(
          hatchId
            ? `Штриховка ГОСТ (${hatchId}) применена к ${applied} объектам; подключён patterns.`
            : 'Векторная штриховка снята.'
        );
      } else {
        setToastBanner('Штриховка поддерживается на прямоугольниках, окружностях и замкнутых полигонах.');
      }
    },
    [pushSourceChange, selectedPrimitiveId, selectedPrimitiveIds, source]
  );

  // P39: Curly Braces, Waves & Coils
  const handleApplyDecorationToSelection = useCallback(
    (decorationId: string, labelLatex: string) => {
      const targetIds =
        selectedPrimitiveIds.length > 0
          ? selectedPrimitiveIds
          : selectedPrimitiveId !== null
            ? [selectedPrimitiveId]
            : [];
      let cur = source;
      const spec = PATH_DECORATION_SPECS.find((d) => d.id === decorationId);
      if (spec?.tikzLibrary) {
        const lib = proposeLibraryConnect(cur, spec.tikzLibrary);
        if (lib.ok) cur = lib.nextSource;
      }
      if (targetIds.length === 0) {
        // Insert a ready-to-drag decorated segment on canvas
        const res = insertOwnedPrimitiveIntoSource(cur, 'line', {
          x1: '1.40cm',
          y1: '2.65cm',
          x2: '4.20cm',
          y2: '2.65cm',
          stroke_color: 'black',
          stroke_width: 'semithick',
          line_style: 'solid',
          decoration_kind: decorationId,
          decoration_label: decorationId.startsWith('brace') ? labelLatex : '',
        });
        pushSourceChange(res.nextSource, `Вставлена декорация пути (${decorationId}) #${res.newId} (P39)`);
        setSelectedPrimitiveId(res.newId);
        setSelectedPrimitiveIds([res.newId]);
        setActiveLine(res.insertedLine);
        setActiveTab('studio');
        setToastBanner(`На холст добавлена декорация «${spec?.labelRu ?? decorationId}» #${res.newId}.`);
        return;
      }
      let count = 0;
      for (const id of targetIds) {
        const p = parseOwnedPrimitives(cur).find((item) => item.id === id);
        if (!p || (p.tool !== 'line' && p.tool !== 'arrow')) continue;
        cur = applyOwnedPrimitivePatch(cur, id, {
          ...p.values,
          decoration_kind: decorationId,
          decoration_label: decorationId.startsWith('brace') ? labelLatex : '',
        });
        count++;
      }
      if (count > 0) {
        pushSourceChange(cur, `Обновлена декорация пути (${decorationId || 'нет'}) для ${count} линий`);
        setToastBanner(`Декорация применена к ${count} линиям.`);
      } else {
        setToastBanner('Выберите линию или стрелку (или снимите выделение, чтобы вставить новый образец).');
      }
    },
    [pushSourceChange, selectedPrimitiveId, selectedPrimitiveIds, source]
  );

  // Document Macro Variables (\pgfmathsetmacro)
  const handleUpsertMacro = useCallback(
    (
      name: string,
      value: number,
      commentRu: string,
      linked?: { primitiveId: number; paramKey: string }
    ) => {
      const nextSource = upsertPgfMathMacroInSource(source, name, value, commentRu, linked);
      pushSourceChange(nextSource, `Обновлён макро-параметр \\${name} = ${value.toFixed(2)}`);
      setToastBanner(`Записано \\pgfmathsetmacro{\\${name}}{${value.toFixed(2)}}${linked ? ` и синхронизирован #${linked.primitiveId}` : ''}.`);
    },
    [pushSourceChange, source]
  );

  // Physical Units & ГОСТ / siunitx Node Insertion
  const handleInsertQuantityNode = useCallback(
    (latexContent: string) => {
      let cur = source;
      if (latexContent.includes('\\qty') && !cur.includes('{siunitx}')) {
        const docClassIdx = cur.indexOf('\\documentclass');
        if (docClassIdx !== -1) {
          const lineEnd = cur.indexOf('\n', docClassIdx);
          if (lineEnd !== -1) {
            const eol = cur.includes('\r\n') ? '\r\n' : '\n';
            cur = `${cur.slice(0, lineEnd + 1)}\\usepackage{siunitx}${eol}${cur.slice(lineEnd + 1)}`;
          }
        }
      }
      const res = insertOwnedPrimitiveIntoSource(cur, 'node', {
        x: '3.10cm',
        y: '2.95cm',
        mode: 'math',
        content: latexContent,
      });
      pushSourceChange(res.nextSource, `Вставлена размерная величина СИ/ГОСТ #${res.newId}`);
      setSelectedPrimitiveId(res.newId);
      setSelectedPrimitiveIds([res.newId]);
      setActiveLine(res.insertedLine);
      setActiveTab('studio');
      setToastBanner(`На холст добавлена подпись физической величины #${res.newId} ($${latexContent}$).`);
    },
    [pushSourceChange, source]
  );

  // P43: Reference Plot Digitizer
  const handleCommitDigitizedCurve = useCallback(
    (mode: 'n1-polyline' | 'pgfplots-coordinates') => {
      const mapped = mapCanvasPointsToPhysical(digitizerPointsCm, digitizerCalibration);
      const res = insertDigitizedCurveIntoSource(source, mapped, mode);
      if (res.insertedId !== null) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveId(res.insertedId);
        setSelectedPrimitiveIds([res.insertedId]);
        setActiveTool('select');
        setActiveTab('studio');
      }
      setToastBanner(res.summaryRu);
    },
    [digitizerCalibration, digitizerPointsCm, pushSourceChange, source]
  );

  // P44: Analytical Function Plotter F(x)
  const handleInsertAnalyticalPlot = useCallback(
    (
      formulaId: AnalyticalFormulaId,
      domainMin: number,
      domainMax: number,
      samplesCount: number,
      paramA: number
    ) => {
      const res = insertAnalyticalPlotIntoSource(
        source,
        formulaId,
        domainMin,
        domainMax,
        samplesCount,
        paramA
      );
      if (res.ok && res.newId !== null) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveId(res.newId);
        setSelectedPrimitiveIds([res.newId]);
        setActiveTab('studio');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  // P45: Vector Field Quiver
  const handleInsertVectorField = useCallback(
    (presetId: VectorFieldPresetId, cols: number, rows: number) => {
      const res = insertVectorFieldIntoSource(source, presetId, cols, rows);
      pushSourceChange(res.nextSource, res.summaryRu);
      if (res.insertedIds.length > 0) {
        setSelectedPrimitiveIds(res.insertedIds);
        setSelectedPrimitiveId(res.insertedIds[0] ?? null);
      }
      setActiveTab('studio');
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  // P46 & P47: Layer Assignment & Beamer Overlay Assignment
  const handleToggleHideLayer = useCallback((layerId: CadLayerId) => {
    setHiddenLayers((prev) =>
      prev.includes(layerId) ? prev.filter((x) => x !== layerId) : [...prev, layerId]
    );
  }, []);

  const handleToggleLockLayer = useCallback((layerId: CadLayerId) => {
    setLockedLayers((prev) =>
      prev.includes(layerId) ? prev.filter((x) => x !== layerId) : [...prev, layerId]
    );
  }, []);

  const handleAssignLayerToSelection = useCallback(
    (layerId: CadLayerId) => {
      const targetIds =
        selectedPrimitiveIds.length > 0
          ? selectedPrimitiveIds
          : selectedPrimitiveId !== null
            ? [selectedPrimitiveId]
            : [];
      if (targetIds.length === 0) return;
      let cur = source;
      for (const id of targetIds) {
        const p = parseOwnedPrimitives(cur).find((item) => item.id === id);
        if (!p) continue;
        cur = applyOwnedPrimitivePatch(cur, id, { ...p.values, layer_id: layerId });
      }
      pushSourceChange(cur, `Назначен слой «${layerId}» для ${targetIds.length} объектов`);
      setToastBanner(`Объекты (${targetIds.length} шт.) перенесены на слой «${layerId}».`);
    },
    [pushSourceChange, selectedPrimitiveId, selectedPrimitiveIds, source]
  );

  const handleAssignBeamerSpecToSelection = useCallback(
    (spec: string) => {
      const targetIds =
        selectedPrimitiveIds.length > 0
          ? selectedPrimitiveIds
          : selectedPrimitiveId !== null
            ? [selectedPrimitiveId]
            : [];
      if (targetIds.length === 0) return;
      let cur = source;
      for (const id of targetIds) {
        const p = parseOwnedPrimitives(cur).find((item) => item.id === id);
        if (!p) continue;
        cur = applyOwnedPrimitivePatch(cur, id, { ...p.values, beamer_spec: spec });
      }
      pushSourceChange(
        cur,
        spec
          ? `Задано появление Beamer <${spec}> для ${targetIds.length} объектов`
          : `Снята маска слайдов Beamer с ${targetIds.length} объектов`
      );
      setToastBanner(
        spec ? `Применено \\onslide<${spec}> к ${targetIds.length} объектам.` : 'Показ на всех слайдах.'
      );
    },
    [pushSourceChange, selectedPrimitiveId, selectedPrimitiveIds, source]
  );

  // P51-P55: Insert Specialized Scientific Notation Preset
  const handleInsertNotationPreset = useCallback(
    (presetId: string, originCm: { x: number; y: number }) => {
      const res = insertNotationPresetIntoSource(source, presetId, originCm);
      if (res.insertedIds.length > 0) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveIds(res.insertedIds);
        setSelectedPrimitiveId(res.insertedIds[0] ?? null);
        setActiveTab('studio');
        setCanvasMode('sketch');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  // P54: Project 3D Scene onto 2D n1
  const handleInsert3dScene = useCallback(
    (
      sceneId: Scene3dPresetId,
      azimuthDeg: number,
      elevationDeg: number,
      originCm: { x: number; y: number },
      scaleCm: number
    ) => {
      const res = insert3dProjectedSceneIntoSource(
        source,
        sceneId,
        azimuthDeg,
        elevationDeg,
        originCm,
        scaleCm
      );
      if (res.insertedIds.length > 0) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveIds(res.insertedIds);
        setSelectedPrimitiveId(res.insertedIds[0] ?? null);
        setActiveTab('studio');
        setCanvasMode('sketch');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  // P56: Tangent Fillet / Chamfer between 2 selected segments
  const handleConstructFilletOrChamfer = useCallback(
    (radiusCm: number, mode: 'fillet' | 'chamfer') => {
      const targetIds =
        selectedPrimitiveIds.length > 0
          ? selectedPrimitiveIds
          : selectedPrimitiveId !== null
            ? [selectedPrimitiveId]
            : [];
      const res = constructFilletOrChamferInSource(source, targetIds, radiusCm, mode);
      if (res.newId !== null) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveId(res.newId);
        setSelectedPrimitiveIds([res.newId]);
        setActiveTab('studio');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, selectedPrimitiveId, selectedPrimitiveIds, source]
  );

  // P57: FillBetween Shaded Corridor / Baseline Area
  const handleInsertFillBetween = useCallback(
    (baselineYCm: number, options: { fillColor?: string; hatchPattern?: string }) => {
      const targetIds =
        selectedPrimitiveIds.length > 0
          ? selectedPrimitiveIds
          : selectedPrimitiveId !== null
            ? [selectedPrimitiveId]
            : [];
      const res = insertFillBetweenCurvesIntoSource(source, targetIds, baselineYCm, options);
      if (res.newId !== null) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveId(res.newId);
        setSelectedPrimitiveIds([res.newId]);
        setActiveTab('studio');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, selectedPrimitiveId, selectedPrimitiveIds, source]
  );

  // P58: Spy Magnifier Inset
  const handleInsertSpyMagnifier = useCallback(
    (
      lensCenterCm: { x: number; y: number },
      lensRadiusCm: number,
      insetCenterCm: { x: number; y: number },
      magnification: number
    ) => {
      const res = insertSpyMagnifierInsetIntoSource(
        source,
        lensCenterCm,
        lensRadiusCm,
        insetCenterCm,
        magnification
      );
      if (res.insertedIds.length > 0) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveIds(res.insertedIds);
        setSelectedPrimitiveId(res.insertedIds[0] ?? null);
        setActiveTab('studio');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  // P59: Patent & ГОСТ Positional Leader Shelf
  const handleInsertPositionalShelf = useCallback(
    (
      posNumber: number,
      targetCm: { x: number; y: number },
      shelfCm: { x: number; y: number },
      labelRu: string
    ) => {
      const res = insertPositionalLeaderShelfIntoSource(source, posNumber, targetCm, shelfCm);
      if (res.insertedIds.length > 0) {
        pushSourceChange(res.nextSource, `${res.summaryRu} (${labelRu})`);
        setSelectedPrimitiveIds(res.insertedIds);
        setSelectedPrimitiveId(res.insertedIds[0] ?? null);
        setActiveTab('studio');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  // P61: Eyedropper Style Sample & Apply
  const handleSampleStyleFromPrimitive = useCallback(
    (primitiveId: number) => {
      const prim = parseOwnedPrimitives(source).find((p) => p.id === primitiveId);
      if (!prim) return;
      const passport = extractStylePassport(prim);
      setCopiedStylePassport(passport);
      setToastBanner(
        `Скопирован стиль от объекта #${primitiveId}. Кликните целевые объекты для применения.`
      );
    },
    [source]
  );

  const handleApplyCopiedStyleToIds = useCallback(
    (targetIds: number[]) => {
      if (!copiedStylePassport || targetIds.length === 0) return;
      const res = applyStylePassportToPrimitivesInSource(source, targetIds, copiedStylePassport);
      if (res.updatedCount > 0) {
        pushSourceChange(
          res.nextSource,
          `Применён паспорт стиля от #${copiedStylePassport.sourcePrimitiveId} к ${res.updatedCount} объектам`
        );
        setToastBanner(
          `Стиль от #${copiedStylePassport.sourcePrimitiveId} перенесён на ${res.updatedCount} объектов.`
        );
      }
    },
    [copiedStylePassport, pushSourceChange, source]
  );

  const handleEyedropperClickPrimitive = useCallback(
    (primitiveId: number, forceSample: boolean) => {
      if (forceSample || !copiedStylePassport) {
        handleSampleStyleFromPrimitive(primitiveId);
      } else {
        handleApplyCopiedStyleToIds([primitiveId]);
      }
    },
    [copiedStylePassport, handleApplyCopiedStyleToIds, handleSampleStyleFromPrimitive]
  );

  // Spreadsheet Cell Edit
  const handleEditSpreadsheetCell = useCallback(
    (primitiveId: number, field: EditableSpreadsheetField, rawValue: string) => {
      const res = applySpreadsheetCellEditInSource(source, primitiveId, field, rawValue);
      if (res.ok && res.nextSource !== source) {
        pushSourceChange(res.nextSource, `Таблица объектов: обновлено поле ${field} у #${primitiveId}`);
      }
    },
    [pushSourceChange, source]
  );

  // Visual Pre-Submission Lint Auto-Fix
  const handleApplyVisualLintFix = useCallback(
    (finding: VisualLintFinding) => {
      const nextSrc = applyVisualLintAutoFix(source, finding);
      if (nextSrc !== source) {
        pushSourceChange(nextSrc, `Автоисправление пре-принт аудита [${finding.code}]`);
        setToastBanner(`Исправлено замечание [${finding.code}]: ${finding.titleRu}`);
      }
    },
    [pushSourceChange, source]
  );

  // Portable .tikzproj Session Export & Import
  const handleExportTikzprojFile = useCallback((): string => {
    const json = serializeTikzprojSession({
      activeSpecimenId: specimenId,
      activeFilename: filename,
      activeSource: source,
      createdDocs,
      customSnippets,
      sharedStyleTikz,
      digitizerCalibration,
      digitizerPointsCm,
      hiddenLayers,
      lockedLayers,
      panelCols,
    });
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/\.tex$/i, '') || 'tikzarium_project'}.tikzproj`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToastBanner('Сессия проекта сохранена в переносимый файл .tikzproj.');
    return json;
  }, [
    createdDocs,
    customSnippets,
    digitizerCalibration,
    digitizerPointsCm,
    filename,
    hiddenLayers,
    lockedLayers,
    panelCols,
    sharedStyleTikz,
    source,
    specimenId,
  ]);

  const handleImportTikzprojJson = useCallback(
    (jsonText: string) => {
      const parsed = parseTikzprojSession(jsonText);
      if (!parsed.ok) {
        setToastBanner(parsed.errorRu);
        return;
      }
      const s = parsed.session;
      buildGateRef.current.invalidate();
      documentEpochRef.current++;
      liveSourceRef.current = { source: s.activeSource, revision: 1 };
      setLiveAutoBuild(false);
      setNativeFilePath(null);
      setSavedDirectory(null);
      setExternalDiskChange(null);
      setPdfUnderlayLoading(false);
      setPdfUnderlayResponse(null);
      setBuildStatus('idle');
      setBuiltRevision(null);
      setBuiltSource(null);
      setBuiltAt(null);
      setCreatedDocs(s.createdDocs);
      setCustomSnippets(s.customSnippets);
      setSharedStyleTikz(s.sharedStyleTikz || SHARED_STYLE_DEFAULT_TIKZ);
      setDigitizerCalibration(s.digitizerCalibration);
      setDigitizerPointsCm(s.digitizerPointsCm);
      setHiddenLayers(s.hiddenLayers);
      setLockedLayers(s.lockedLayers);
      setPanelCols(s.panelCols);
      setSpecimenId(s.activeSpecimenId);
      setFilename(s.activeFilename);
      setHistory([{ source: s.activeSource, revision: 1, labelRu: 'Восстановлено из .tikzproj' }]);
      setHistoryIndex(0);
      setSavedRevision(0); // Imported project is not an acknowledged native .tex Save.
      const owned = parseOwnedPrimitives(s.activeSource);
      setLastGoodPrimitives([]);
      setSelectedPrimitiveId(owned[0]?.id ?? null);
      setSelectedPrimitiveIds(owned[0] ? [owned[0].id] : []);
      setActiveTab('studio');
      setToastBanner(`Восстановлена сессия проекта «${s.activeFilename}» из пакета .tikzproj.`);
    },
    []
  );

  // P06: Reorder Z-layer
  const handleReorderPrimitive = (primitiveId: number, direction: ZOrderDirection) => {
    const { nextSource, newLineNumber } = reorderOwnedPrimitiveInSource(source, primitiveId, direction);
    if (nextSource !== source) {
      pushSourceChange(nextSource, `Изменён порядок слоя примитива #${primitiveId}`);
      setActiveLine(newLineNumber);
    }
  };

  // P12: Adopt raw TikZ line or Detach owned primitive
  const handleAdoptRawLine = (lineNumber: number) => {
    const res = adoptRawTikzLineIntoN1(source, lineNumber);
    if (res.ok) {
      pushSourceChange(res.nextSource, `Строка ${lineNumber} привязана к холсту как n1 #${res.newId}`);
      setSelectedPrimitiveId(res.newId);
      setSelectedPrimitiveIds([res.newId]);
      setToastBanner(`Строка ${lineNumber} принята под управление холста (примитив #${res.newId}).`);
    }
  };

  const handleAdoptAllRawLines = () => {
    let cur = source;
    let count = 0;
    let lastId = -1;
    // Re-detect iteratively so line offsets stay exact
    while (true) {
      const candidates = detectAdoptableTikzLines(cur);
      if (candidates.length === 0) break;
      const step = adoptRawTikzLineIntoN1(cur, candidates[0].lineNumber);
      if (!step.ok) break;
      cur = step.nextSource;
      lastId = step.newId;
      count++;
      if (count > 50) break;
    }
    if (count > 0) {
      pushSourceChange(cur, `Привязано ручных команд TikZ в n1: ${count} шт.`);
      if (lastId !== -1) {
        setSelectedPrimitiveId(lastId);
        setSelectedPrimitiveIds([lastId]);
      }
      setToastBanner(`Все распознанные команды TikZ (${count} шт.) теперь интерактивны на холсте!`);
    }
  };

  const handleDetachPrimitive = (primitiveId: number) => {
    const nextSource = detachOwnedPrimitiveToCleanTikz(source, primitiveId);
    if (nextSource !== source) {
      pushSourceChange(nextSource, `Снят маркер n1 с примитива #${primitiveId} (чистый TikZ)`);
      const remaining = parseOwnedPrimitives(nextSource);
      const first = remaining[0]?.id ?? null;
      setSelectedPrimitiveId(first);
      setSelectedPrimitiveIds(first !== null ? [first] : []);
      setToastBanner(`Маркер владения снят с #${primitiveId}: оставлена чистая команда TikZ.`);
    }
  };

  // P17: Apply One-Click Diagnostic Quick Fix
  const handleApplyQuickFix = (diag: TexDiagnostic) => {
    const res = applyDiagnosticQuickFix(source, diag);
    if (res.ok) {
      pushSourceChange(res.nextSource, res.summaryRu);
      setToastBanner(`${res.summaryRu}. Нажмите «Сохранить и собрать PDF» для проверки.`);
    }
  };

  const clearServerExternalDiskChange = useCallback(async (targetFile: string) => {
    try {
      await fetch('/api/fs/simulate-external-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: targetFile, mode: 'clear' }),
      });
    } catch {
      // Best-effort clear
    }
  }, []);

  // P18: Simulate external OS editor save via real Express endpoint
  const handleSimulateExternalDiskWrite = async () => {
    try {
      const res = await fetch('/api/fs/simulate-external-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, currentSource: source }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as {
        externalChange?: {
          filename: string;
          diskSource: string;
          updatedAt: string;
          externalEditor: string;
        };
      };
      if (payload.externalChange) {
        setExternalDiskChange(payload.externalChange);
      }
    } catch {
      setToastBanner('Не удалось опросить файловый монитор ОС.');
    }
  };

  // P19: CSV Import & Window Drag-and-Drop (.tex / .csv / .png)
  const handleImportCsvText = useCallback(
    (csvFilename: string, csvText: string) => {
      const doc = convertCsvToPgfplotsDocument(csvFilename, csvText, createdDocs.length + 1);
      setCreatedDocs((prev) => [doc, ...prev.filter((d) => d.filename !== doc.filename)]);
      loadDocumentObject(doc);
      setActiveTab('studio');
      setCanvasMode('sketch');
      setToastBanner(`Построен график PGFPlots + n1 из таблицы ${csvFilename}.`);
    },
    [createdDocs.length, loadDocumentObject]
  );

  const handleWindowDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsWindowDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();

    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setReferenceImageUrl(reader.result);
          setActiveTab('studio');
          setCanvasMode('sketch');
          setToastBanner(`Референс-подложка «${file.name}» помещена под сетку холста.`);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (lower.endsWith('.tikzproj') || lower.endsWith('.json')) {
        handleImportTikzprojJson(text);
      } else if (lower.endsWith('.svg')) {
        const res = importExternalSvgIntoSource(source, text, { targetWidthCm: 8.8 });
        if (res.insertedIds.length > 0) {
          pushSourceChange(res.nextSource, `Импорт файла ${file.name} в интерактивные примитивы`);
          setSelectedPrimitiveIds(res.insertedIds);
          setSelectedPrimitiveId(res.insertedIds[0] ?? null);
          setActiveTab('studio');
        }
        setToastBanner(res.summaryRu);
      } else if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.dat')) {
        handleImportCsvText(file.name, text);
      } else if (lower.endsWith('.tex')) {
        const importedDoc: SpecimenDocument = {
          id: `drop-tex-${Date.now()}`,
          filename: file.name,
          titleRu: `${file.name} (с диска ОС)`,
          subtitleRu: 'Открыт перетаскиванием файла',
          lineEnding: text.includes('\r\n') ? 'CRLF' : 'LF',
          dataDependencies: [],
          source: text,
        };
        setCreatedDocs((prev) => [importedDoc, ...prev]);
        loadDocumentObject(importedDoc);
        setActiveTab('studio');
        setToastBanner(`Открыт файл ${file.name} перетаскиванием из ОС.`);
      }
    };
    reader.readAsText(file);
  };

  // Formatter, Refactoring & Spline/SVG Handlers
  const handleRunAutoFormat = useCallback(
    (opts: AutoFormatOptions = { indentSpaces }) => {
      const res = formatTikzDocumentSource(source, {
        indentSpaces: opts.indentSpaces ?? indentSpaces,
        sortBracketOptions: opts.sortBracketOptions ?? true,
        normalizePathOperators: opts.normalizePathOperators ?? true,
        alignTrailingComments: opts.alignTrailingComments ?? true,
      });
      if (res.nextSource !== source) {
        pushSourceChange(
          res.nextSource,
          `Автоформатирование кода .tex (${res.changedLinesCount} стр., объектов: ${res.preservedOwnedCount})`
        );
        setToastBanner(
          `Код отформатирован: обновлено ${res.changedLinesCount} строк, сохранено ${res.preservedOwnedCount} объектов (${res.lineEnding}).`
        );
      } else {
        setToastBanner(`Исходный код уже соответствует каноническому форматированию (${res.lineEnding}).`);
      }
    },
    [indentSpaces, pushSourceChange, source]
  );

  const handleConvertUnits = useCallback(
    (unit: TikzLengthUnit, decimals: number, scope: 'all' | 'selected') => {
      const activeIds =
        selectedPrimitiveIds.length > 0
          ? selectedPrimitiveIds
          : selectedPrimitiveId !== null
            ? [selectedPrimitiveId]
            : [];
      const res = convertDocumentUnitsInSource(source, unit, {
        decimals,
        onlyPrimitiveIds: scope === 'selected' ? activeIds : undefined,
        convertRawCoordinates: scope === 'all',
      });
      pushSourceChange(
        res.nextSource,
        `Конвертация единиц в ${unit} (${res.convertedPrimitivesCount} объектов, ${res.convertedRawLiteralsCount} литералов)`
      );
      setToastBanner(
        `Единицы пересчитаны в ${unit}: обновлено ${res.convertedPrimitivesCount} объектов и ${res.convertedRawLiteralsCount} литералов.`
      );
    },
    [pushSourceChange, selectedPrimitiveId, selectedPrimitiveIds, source]
  );

  const handleExtractStyleToTikzset = useCallback(
    (styleName: string, tikzOptionsBody: string) => {
      const res = extractRepeatedStyleToTikzset(source, styleName, tikzOptionsBody);
      pushSourceChange(res.nextSource, `Вынесен именованный стиль ${res.ruleLine}`);
      setToastBanner(`В преамбулу добавлен стиль ${res.ruleLine}.`);
    },
    [pushSourceChange, source]
  );

  const handleCleanPreamble = useCallback(
    (removeUnusedLibraries: boolean) => {
      const res = cleanPreambleAndUnusedLibraries(source, { removeUnusedLibraries });
      pushSourceChange(
        res.nextSource,
        `Оптимизация преамбулы: оставлено ${res.keptLibraries.length} библиотек, удалено ${res.removedLibraries.length}`
      );
      setToastBanner(
        res.removedLibraries.length > 0
          ? `Преамбула упорядочена; удалены неиспользуемые библиотеки: ${res.removedLibraries.join(', ')}.`
          : `Преамбула упорядочена (${res.keptLibraries.join(', ')}).`
      );
    },
    [pushSourceChange, source]
  );

  const handleInsertOffsetContour = useCallback(
    (primitiveId: number, offsetCm: number) => {
      const res = insertParallelOffsetContourIntoSource(source, primitiveId, offsetCm);
      if (res.newId !== null) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveId(res.newId);
        setSelectedPrimitiveIds([res.newId]);
        setActiveTab('studio');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  const handleInsertSpline = useCallback(
    (
      pointsCm: Array<{ x: number; y: number }>,
      opts: { closed: boolean; tension: number; arrowTipOnLast: boolean }
    ) => {
      const res = insertCatmullRomSplineIntoSource(source, pointsCm, opts);
      if (res.insertedIds.length > 0) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveIds(res.insertedIds);
        setSelectedPrimitiveId(res.insertedIds[0] ?? null);
        setActiveTab('studio');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  const handleTrimOrExtendSegment = useCallback(
    (targetSegId: number, boundarySegId: number, mode: 'trim' | 'extend') => {
      const res = trimOrExtendSegmentToBoundaryInSource(source, targetSegId, boundarySegId, mode);
      if (res.ok) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveId(targetSegId);
        setSelectedPrimitiveIds([targetSegId]);
        setActiveTab('studio');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  const handleInsertGostSupportComb = useCallback(
    (
      segmentId: number,
      opts: { stepCm: number; toothLenCm: number; angleDeg: number; flipSide: boolean }
    ) => {
      const res = insertGostSupportCombHatchIntoSource(source, segmentId, opts);
      if (res.insertedIds.length > 0) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveIds(res.insertedIds);
        setSelectedPrimitiveId(res.insertedIds[0] ?? null);
        setActiveTab('studio');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  const handleImportSvgMarkup = useCallback(
    (svgMarkup: string, targetWidthCm: number) => {
      const res = importExternalSvgIntoSource(source, svgMarkup, { targetWidthCm });
      if (res.insertedIds.length > 0) {
        pushSourceChange(res.nextSource, res.summaryRu);
        setSelectedPrimitiveIds(res.insertedIds);
        setSelectedPrimitiveId(res.insertedIds[0] ?? null);
        setActiveTab('studio');
      }
      setToastBanner(res.summaryRu);
    },
    [pushSourceChange, source]
  );

  const handleInsertBooktabsTable = useCallback(
    (latexBlock: string, useSiunitx: boolean) => {
      const next = insertBooktabsTableIntoDocument(source, latexBlock, useSiunitx);
      pushSourceChange(next, 'Вставлена академическая таблица booktabs + siunitx');
      setToastBanner('Таблица \\toprule / \\midrule / \\bottomrule вставлена в документ .tex.');
    },
    [pushSourceChange, source]
  );

  const handleOpenManualAnchor = useCallback(
    (anchorId: string, tab: ManualModalTabId = 'reader') => {
      setActiveManualAnchorId(anchorId);
      setManualModalTab(tab);
      setManualModalOpen(true);
    },
    []
  );

  const handleInsertManualExample = useCallback(
    (exampleTex: string, labelRu: string) => {
      const eol = source.includes('\r\n') ? '\r\n' : '\n';
      let cur = source;
      const rawLines = exampleTex.split(/\r?\n/);
      const bodyLines: string[] = [];

      for (const ln of rawLines) {
        const trimmed = ln.trim();
        if (!trimmed) continue;
        const pkgMatch = /^\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}$/.exec(trimmed);
        if (pkgMatch) {
          for (const pkg of pkgMatch[1].split(',').map((s) => s.trim()).filter(Boolean)) {
            const res = togglePackageInPreamble(cur, pkg, true);
            if (res.ok) cur = res.nextSource;
          }
          continue;
        }
        const libMatch = /^\\usetikzlibrary\{([^}]+)\}$/.exec(trimmed);
        if (libMatch) {
          for (const lib of libMatch[1].split(',').map((s) => s.trim()).filter(Boolean)) {
            const plan = proposeLibraryConnect(cur, lib);
            if (plan.ok) cur = plan.nextSource;
          }
          continue;
        }
        if (/^\\pgfplotsset\{/.test(trimmed) && cur.includes('\\pgfplotsset')) {
          continue;
        }
        bodyLines.push(ln);
      }

      if (bodyLines.length > 0) {
        const cleanedBody = bodyLines
          .filter(
            (ln) =>
              !/^\\begin\{tikzpicture\}/.test(ln.trim()) &&
              !/^\\end\{tikzpicture\}/.test(ln.trim())
          )
          .map((ln) => (ln.startsWith('  ') ? ln : `  ${ln}`));

        if (cleanedBody.length > 0) {
          const endTikzIdx = cur.lastIndexOf('\\end{tikzpicture}');
          if (endTikzIdx !== -1) {
            let lineStart = endTikzIdx;
            while (lineStart > 0 && cur[lineStart - 1] !== '\n') {
              lineStart--;
            }
            cur =
              cur.slice(0, lineStart) +
              cleanedBody.join(eol) +
              eol +
              cur.slice(lineStart);
          } else {
            cur = cur + (cur.endsWith('\n') ? '' : eol) + cleanedBody.join(eol) + eol;
          }
        }
      }

      if (cur !== source) {
        pushSourceChange(cur, `Вставлен пример из оригинального PDF-мануала: ${labelRu}`);
      }
      setManualModalOpen(false);
      setActiveTab('studio');
      setToastBanner(`Пример «${labelRu}» из оригинального PDF-мануала вставлен в документ.`);
    },
    [pushSourceChange, source]
  );

  const handleApplyAgentSnapshotToGui = useCallback(
    (snapshot: StudioControlSnapshot, summaryRu: string) => {
      if (snapshot.source !== source) {
        pushSourceChange(snapshot.source, summaryRu);
      }
      if (snapshot.selected_id !== null) {
        setSelectedPrimitiveId(snapshot.selected_id);
        setSelectedPrimitiveIds([snapshot.selected_id]);
      }
      setActiveManualAnchorId(snapshot.active_manual_anchor_id);
      setActiveTab('studio');
      setToastBanner(summaryRu);
    },
    [pushSourceChange, source]
  );

  // Save & Insert Author Snippets
  const handleSaveSelectionAsSnippet = (titleRu: string) => {
    const targetList =
      selectedPrimitivesList.length > 0
        ? selectedPrimitivesList
        : selectedPrimitive
          ? [selectedPrimitive]
          : [];
    const snip = createSnippetFromPrimitives(titleRu, targetList);
    if (!snip) return;
    setCustomSnippets((prev) => [snip, ...prev]);
    setToastBanner(`Заготовка «${snip.titleRu}» (${snip.primitives.length} объектов) сохранена в полку сниппетов.`);
  };

  const handleInsertSnippet = (snip: UserSnippetItem) => {
    const { nextSource, insertedIds, lastLine } = insertSnippetIntoSource(source, snip);
    pushSourceChange(nextSource, `Вставлена заготовка «${snip.titleRu}» (${insertedIds.length} шт.)`);
    setSelectedPrimitiveIds(insertedIds);
    setSelectedPrimitiveId(insertedIds[0] ?? null);
    setActiveLine(lastLine);
    setActiveTab('studio');
    setToastBanner(`Вставлена заготовка «${snip.titleRu}» (${insertedIds.length} объектов).`);
  };

  const handleOpenOrPathDialogClick = useCallback(async () => {
    if (isTauriRuntime()) {
      try {
        const opened = await tauriPickAndOpenTexFile();
        if (!opened) return;
        const customDoc: SpecimenDocument = {
          id: `native-${Date.now()}`,
          filename: opened.filename,
          titleRu: `${opened.filename} (диск ОС)`,
          subtitleRu: `Открыт напрямую с диска ОС: ${opened.path} (${opened.lineEnding})`,
          lineEnding: opened.lineEnding,
          dataDependencies: [],
          source: opened.source,
        };
        setCreatedDocs((prev) => [customDoc, ...prev.filter((d) => d.filename !== opened.filename)]);
        loadDocumentObject(customDoc);
        setNativeFilePath(opened.path);
        setSavedDirectory(opened.path.replace(/[\\/][^\\/]+$/, ''));
        setToastBanner(`Открыт локальный файл ${opened.path} (${opened.lineEnding}).`);
      } catch (err) {
        setToastBanner(
          `Ошибка чтения .tex через Tauri IPC: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      return;
    }
    setSaveModalOpen(true);
  }, [loadDocumentObject]);

  const handleSaveAndBuildClick = useCallback(async () => {
    if (!isTauriRuntime()) {
      setToastBanner('Сохранение на диск и сборка доступны в нативном окне Tauri; browser preview не выдаёт PASS.');
      return;
    }
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    const epoch = documentEpochRef.current;
    let buildSrc = source;
    let buildRev = sourceRevision;
    if (formatOnSave) {
      const fmt = formatTikzDocumentSource(source, { indentSpaces });
      if (fmt.nextSource !== source) {
        buildSrc = fmt.nextSource;
        buildRev = history[history.length - 1].revision + 1;
        pushSourceChange(fmt.nextSource, 'Автоформатирование при сохранении');
      }
    }
    try {
      const outcome = await saveThenContinue(buildSrc,
        () => tauriSaveTexDocument(buildSrc, nativeFilePath, filename),
        () => epoch === documentEpochRef.current && liveSourceRef.current.source === buildSrc &&
          liveSourceRef.current.revision === buildRev,
        (saved) => {
          setNativeFilePath(saved.path);
          setFilename(saved.path.split(/[\\/]/).pop() || filename);
          setSavedDirectory(saved.path.replace(/[\\/][^\\/]+$/, ''));
          setSavedRevision(buildRev);
        },
        () => executeBuildCycle(buildRev, buildSrc, true));
      if (epoch === documentEpochRef.current && outcome !== 'continued') {
        setToastBanner(outcome === 'cancelled' ? 'Сохранение отменено; сборка не запущена.' :
          'Сохранён снимок предыдущей ревизии; текущий буфер не помечен сохранённым, сборка не запущена.');
      }
    } catch (error) {
      if (epoch === documentEpochRef.current) setToastBanner(`Сохранение/сборка: ${error instanceof Error ? error.message : String(error)}`);
    } finally { saveInFlightRef.current = false; }
  }, [executeBuildCycle, filename, formatOnSave, history, indentSpaces, nativeFilePath,
      pushSourceChange, source, sourceRevision]);

  // Global desktop-grade keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      const mod = ev.ctrlKey || ev.metaKey;
      const lower = ev.key.toLowerCase();

      if (ev.shiftKey && ev.altKey && lower === 'f') {
        ev.preventDefault();
        handleRunAutoFormat();
        return;
      }

      if (mod && lower === 'k') {
        ev.preventDefault();
        setCmdPaletteOpen((open) => !open);
        return;
      }

      if (ev.altKey && !mod && lower === 'n') {
        ev.preventDefault();
        setNewTemplateModalOpen(true);
        return;
      }

      if (mod && (lower === 's' || ev.key === 'Enter')) {
        ev.preventDefault();
        handleSaveAndBuildClick();
        return;
      }

      if (mod && lower === 'f' && activeTab === 'studio') {
        ev.preventDefault();
        if (layoutFocus === 'focus-canvas') setLayoutFocus('tri-pane');
        setSearchBarOpen(true);
        return;
      }

      if (ev.key === 'F1') {
        ev.preventDefault();
        if (ev.shiftKey) {
          if (caretManualAnchorId) {
            setActiveManualAnchorId(caretManualAnchorId);
          }
          setManualModalTab('reader');
          setManualModalOpen((open) => !open);
          return;
        }
        setActiveTab('studio');
        setInspectorCollapsed(false);
        setHighlightedZone('help');
        window.setTimeout(() => setHighlightedZone(null), 2200);
        return;
      }

      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;

      if (mod && ev.shiftKey && lower === 'c') {
        ev.preventDefault();
        void handleCopyRenderedCanvasToClipboard();
        return;
      }

      if (mod && lower === 'z') {
        ev.preventDefault();
        if (ev.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (mod && lower === 'y') {
        ev.preventDefault();
        handleRedo();
        return;
      }
      if (mod && lower === 'd' && selectedPrimitiveId !== null) {
        ev.preventDefault();
        handleDuplicatePrimitive(selectedPrimitiveId);
        return;
      }
      if (
        (ev.key === 'Delete' || ev.key === 'Backspace') &&
        activeTab === 'studio'
      ) {
        if (selectedPrimitiveIds.length > 0) {
          ev.preventDefault();
          if (selectedPrimitiveIds.length > 1) {
            handleDeleteSelectedPrimitives();
          } else if (selectedPrimitiveId !== null) {
            handleDeletePrimitive(selectedPrimitiveId);
          }
          return;
        }
        if (selectedPackageObjectId) {
          ev.preventDefault();
          handleDeletePackageObject(selectedPackageObjectId);
          return;
        }
      }

      if ((mod && ev.shiftKey && lower === 't') || (ev.altKey && !mod && lower === 'm')) {
        ev.preventDefault();
        setWorkshopsHubTab('extensions');
        setWorkshopsHubOpen((open) => !open);
        return;
      }

      if (ev.altKey && !mod && lower === 't') {
        ev.preventDefault();
        setNotationsModalTab('outliner-table');
        setNotationsModalOpen(true);
        return;
      }

      if (mod && lower === 'g' && activeTab === 'studio') {
        ev.preventDefault();
        if (ev.shiftKey) {
          handleUngroupSelected();
        } else {
          handleGroupSelected();
        }
        return;
      }

      if (
        ev.key === 'Tab' &&
        !mod &&
        !ev.altKey &&
        !ev.shiftKey &&
        activeTab === 'studio' &&
        document.activeElement === document.body
      ) {
        ev.preventDefault();
        setLayoutFocus((prev) => (prev === 'focus-canvas' ? 'tri-pane' : 'focus-canvas'));
        return;
      }

      if (!mod && !ev.altKey) {
        const key = ev.key.toUpperCase();
        if (key === 'V') setActiveTool('select');
        else if (key === 'B') setActiveTool('marquee');
        else if (key === 'M') setActiveTool('measure');
        else if (key === 'D') setActiveTool('callout');
        else if (key === 'P') setActiveTool('polygon');
        else if (key === 'G') setActiveTool('arc3');
        else if (key === 'I') setActiveTool('eyedropper');
        const matched = PRIMITIVE_TOOLS.find((t) => t.hotkey === key);
        if (matched) {
          setActiveTool(matched.id);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeTab,
    caretManualAnchorId,
    handleCopyRenderedCanvasToClipboard,
    handleDeletePackageObject,
    handleDeletePrimitive,
    handleDeleteSelectedPrimitives,
    handleDuplicatePrimitive,
    handleGroupSelected,
    handleRedo,
    handleRunAutoFormat,
    handleSaveAndBuildClick,
    handleUndo,
    handleUngroupSelected,
    layoutFocus,
    selectedPackageObjectId,
    selectedPrimitiveId,
    selectedPrimitiveIds,
  ]);

  const handleCancelBuild = () => {
    setLiveAutoBuild(false);
    if (liveDebounceRef.current) window.clearTimeout(liveDebounceRef.current);
    buildGateRef.current.invalidate();
    setPdfUnderlayLoading(false);
    setBuildStatus('cancelled');
    void tauriCancelActiveBuild().catch((error) =>
      setToastBanner(`IPC отмены: ${error instanceof Error ? error.message : String(error)}`));
    setToastBanner('Результат отменённой сборки не будет принят; исходник не изменён.');
  };

  const handleJumpToUxSolution = (item: UxFindingItem) => {
    setActiveTab(item.targetAction.tab);
    setHighlightedZone(item.targetAction.highlightZone);
    if (item.targetAction.highlightZone === 'search') {
      setSearchBarOpen(true);
    }
    if (item.targetAction.highlightZone === 'save-dialog') {
      setSaveModalOpen(true);
    }
    window.setTimeout(() => setHighlightedZone(null), 2600);
  };

  const customNodesNote = source.includes('\\myOpticsNote')
    ? 'Оптическая ось и фокус собирающей линзы (% точность PGF)'
    : source.includes('TikZarium') && source.includes('exact PDF')
      ? '[TikZarium] ── exact PDF ──▶ [XeLaTeX]'
      : null;

  const toolchainReady = connReport?.doctor.exitCode === 0;

  const commandPaletteActions: CommandPaletteAction[] = useMemo(() => {
    const items: CommandPaletteAction[] = [
      {
        id: 'act-pdf-manual-reader',
        categoryRu: 'Оригинальный PDF-мануал',
        labelRu:
          'Открыть оригинальный PDF-мануал PGF/TikZ и пакетов с переходом на прямую точку [страница + NamedDest + bbox]',
        shortcut: 'Shift+F1',
        keywords:
          'pdf manual pgfmanual pgfplots circuitikz chemfig tikz-cd anchor документация мануал прямая точка страница',
        run: () =>
          handleOpenManualAnchor(
            caretManualAnchorId ?? activeManualAnchorId,
            'reader'
          ),
      },
      {
        id: 'act-pdf-build-index-pipeline',
        categoryRu: 'Сборка PDF-индекса',
        labelRu:
          'Инструкция и скрипты однократной предсборочной разметки PDF-мануалов (kpsewhich + PyMuPDF + build.rs)',
        keywords:
          'kpsewhich pymupdf fitz qpdf build.rs index anchors разметка сборка мануал индекс',
        run: () =>
          handleOpenManualAnchor(
            caretManualAnchorId ?? activeManualAnchorId,
            'build-pipeline'
          ),
      },
      {
        id: 'act-agent-api-github-sync',
        categoryRu: 'Control API & GitHub',
        labelRu:
          'Консоль JSONL API агентов (49 операций GUI↔API), матрица тестов и публикация в i-shutov/tikzarium',
        keywords:
          'api jsonl qa-control agent github git pr b42 tests публикация репозиторий тесты агент',
        run: () =>
          handleOpenManualAnchor(
            caretManualAnchorId ?? activeManualAnchorId,
            'agent-api-github'
          ),
      },
      {
        id: 'act-tikz-extensions-suite',
        categoryRu: 'Пакеты TikZ',
        labelRu:
          'Открыть мастерскую «Пакеты расширений TikZ» (pgfplots, circuitikz, chemfig, tikz-cd, forest, quantikz, timing…)',
        shortcut: 'Ctrl+Shift+T',
        keywords:
          'extensions packages pgfplots circuitikz tikz-cd chemfig mhchem forest pgfgantt quantikz feynman tkz-euclide tikz-timing tikz-optics stanli пакеты расширений',
        run: () => {
          setWorkshopsHubTab('extensions');
          setWorkshopsHubOpen(true);
        },
      },
      {
        id: 'act-workshops-hub',
        categoryRu: 'Мастерские',
        labelRu:
          'Открыть полный каталог инженерных мастерских: Булевы 2D, Цепи/Оптика/Балки, Регрессия МНК, Макросы и Diff',
        keywords: 'workshops hub boolean circuit optics beam regression boxplot мастерские булевы цепи оптика балка регрессия',
        run: () => {
          setWorkshopsHubTab('catalog');
          setWorkshopsHubOpen(true);
        },
      },
      {
        id: 'act-group-primitives',
        categoryRu: 'Группы',
        labelRu: 'Сгруппировать выделенные объекты на холсте в единый блок',
        shortcut: 'Ctrl+G',
        keywords: 'group объединить группа примитивы',
        run: () => handleGroupSelected(),
      },
      {
        id: 'act-new-template',
        categoryRu: 'Файл',
        labelRu: 'Создать новый документ по шаблону (Диаграмма, График, Схема оптики…)',
        shortcut: 'Alt+N',
        keywords: 'new template новый файл шаблон диаграмма график оптика',
        run: () => {
          setInitialTemplateId('diagram');
          setNewTemplateModalOpen(true);
        },
      },
      {
        id: 'act-export-master',
        categoryRu: 'Публикация',
        labelRu: 'Открыть мастер экспорта: чистый .tex для Overleaf, tikzpicture, SVG, PNG 300/600 DPI',
        keywords: 'export overleaf svg png clean чистый экспорт статья',
        run: () => setExportModalOpen(true),
      },
      {
        id: 'act-history-diff',
        categoryRu: 'Ревизии',
        labelRu: 'Открыть историю ревизий и построчный предпросмотр изменений (Diff)',
        keywords: 'history diff ревизии история сравнение',
        run: () => setHistoryModalOpen(true),
      },
      {
        id: 'act-snippets-os',
        categoryRu: 'Заготовки и CSV',
        labelRu: 'Полка заготовок автора, импорт данных CSV→PGFPlots и мониторинг диска',
        keywords: 'snippets csv notify storage сниппеты данные диск',
        run: () => setSnippetsModalOpen(true),
      },
      {
        id: 'act-cad-stamps',
        categoryRu: 'Научный САПР',
        labelRu: 'Штампы (линзы, резисторы, пружины), угловые дуги, \\foreach, PGFPlots и буфер Excel',
        keywords: 'cad stamps foreach pgfplots lens resistor штампы массив график буфер',
        run: () => {
          setCadModalTab('stamps');
          setCadModalOpen(true);
        },
      },
      {
        id: 'act-cad-journal',
        categoryRu: 'Журнал и палитра',
        labelRu: 'Калибр колонки IEEE / Elsevier / ГОСТ, аудит кегля и палитра Okabe–Ito',
        keywords: 'journal ieee gost okabe ito grayscale журнал колонка цветопроба',
        run: () => {
          setCadModalTab('journal-palette');
          setCadModalOpen(true);
        },
      },
      {
        id: 'act-article-project',
        categoryRu: 'Проект статьи',
        labelRu: 'Дерево фигур статьи, матрица субфигур (а) (б) (в) и пакетный профилировщик XeLaTeX',
        keywords: 'project subfigure batch profiler проект статья субфигуры профилировщик',
        run: () => {
          setProjectModalTab('workspace');
          setProjectModalOpen(true);
        },
      },
      {
        id: 'act-adv-cad',
        categoryRu: 'Инженерия и слои',
        labelRu:
          'Контуры (-- cycle), пересечения ∩/⊥, штриховки ГОСТ, скруббер макросов, оцифровка графиков, F(x), поля и Beamer',
        keywords:
          'polygon hatch brace macro siunitx digitizer plot quiver layers beamer полигон штриховка оцифровка слои',
        run: () => {
          setAdvModalTab('geometry-gost');
          setAdvModalOpen(true);
        },
      },
      {
        id: 'act-adv-digitizer',
        categoryRu: 'Оцифровка',
        labelRu: 'Интерактивный оцифровщик экспериментального графика по референс-скану (Ref1 / Ref2)',
        keywords: 'digitizer scan calibration оцифровка график скан точки',
        run: () => {
          setAdvModalTab('digitizer');
          setAdvModalOpen(true);
        },
      },
      {
        id: 'act-adv-layers-beamer',
        categoryRu: 'Слои и Beamer',
        labelRu: 'Менеджер слоёв \\begin{scope} (Lock / Hide) и пошаговые слайды Beamer \\onslide<1->',
        keywords: 'layers scope lock hide beamer onslide слои презентация слайды',
        run: () => {
          setAdvModalTab('layers-beamer');
          setAdvModalOpen(true);
        },
      },
      {
        id: 'act-notations-suite',
        categoryRu: 'Нотации и 3D',
        labelRu: 'Квантовые цепи, диаграммы Фейнмана, уровни Яблонского, контуры ТАУ и 3D-проектор ГОСТ 2.317',
        keywords: 'quantum feynman jablonski chem control tau 3d automata кванты фейнман химия тау аксонометрия',
        run: () => {
          setNotationsModalTab('notations');
          setNotationsModalOpen(true);
        },
      },
      {
        id: 'act-cad-fillet-spy',
        categoryRu: 'Сопряжения и Лупа',
        labelRu: 'Касательные скругления R (Fillet), заливка FillBetween, лупа spy (×M) и полки ГОСТ 2.316',
        keywords: 'fillet chamfer fillbetween spy magnifier callout скругление фаска лупа выноски полка',
        run: () => {
          setNotationsModalTab('cad-fillet-spy');
          setNotationsModalOpen(true);
        },
      },
      {
        id: 'act-outliner-table',
        categoryRu: 'Таблица объектов',
        labelRu: 'Табличный реестр всех объектов чертежа и пипетка паспорта стиля',
        shortcut: 'Alt+T',
        keywords: 'table outliner spreadsheet eyedropper style таблица реестр пипетка стиль',
        run: () => {
          setNotationsModalTab('outliner-table');
          setNotationsModalOpen(true);
        },
      },
      {
        id: 'act-visual-audit-session',
        categoryRu: 'Пре-принт и Сессия',
        labelRu: 'Геометрический пре-принт аудит (омоглифы, коллизии BBox) и экспорт/импорт пакета .tikzproj',
        keywords: 'audit lint homoglyph bbox tikzproj session аудит омоглифы коллизии сессия',
        run: () => {
          setNotationsModalTab('audit-session');
          setNotationsModalOpen(true);
        },
      },
      {
        id: 'act-autoformat-now',
        categoryRu: 'Автоформат .tex',
        labelRu: 'AST-безопасное автоформатирование кода LaTeX/TikZ (отступы, опции [...], сохранение CRLF)',
        shortcut: 'Shift+Alt+F',
        keywords: 'format prettify indent autoformat автоформатирование отступы код рефакторинг',
        run: () => handleRunAutoFormat(),
      },
      {
        id: 'act-refactor-units-tikzset',
        categoryRu: 'Рефакторинг .tex',
        labelRu: 'Конвертер единиц cm↔mm↔pt, вынос стилей в \\tikzset и очистка преамбулы TikZ',
        keywords: 'units mm pt cm tikzset dry preamble рефакторинг единицы преамбула стили',
        run: () => {
          setFormatterModalTab('format-refactor');
          setFormatterModalOpen(true);
        },
      },
      {
        id: 'act-cad-spline-offset-trim',
        categoryRu: 'Сплайны и Offset',
        labelRu: 'Эквидистанта ±Δd, гладкий сплайн Catmull–Rom C¹, подрезка луча Trim/Extend и гребёнка ГОСТ',
        keywords: 'offset spline catmull rom trim extend gost comb эквидистанта сплайн подрезка гребенка',
        run: () => {
          setFormatterModalTab('cad-spline-offset');
          setFormatterModalOpen(true);
        },
      },
      {
        id: 'act-svg-booktabs-bundle',
        categoryRu: 'Импорт SVG и Архив',
        labelRu: 'Импорт векторного SVG в чертёж, конструктор таблиц booktabs+siunitx и автономный архив filecontents*',
        keywords: 'svg import booktabs siunitx table filecontents bundle импорт таблица архив',
        run: () => {
          setFormatterModalTab('svg-booktabs-bundle');
          setFormatterModalOpen(true);
        },
      },
      {
        id: 'tool-eyedropper',
        categoryRu: 'Инструмент',
        labelRu: 'Пипетка стиля контура, заливки, штриховки ГОСТ и скругления углов',
        shortcut: 'I',
        keywords: 'eyedropper style пипетка стиль копировать',
        run: () => {
          setActiveTab('studio');
          setActiveTool('eyedropper');
        },
      },
      {
        id: 'tool-polygon',
        categoryRu: 'Инструмент',
        labelRu: 'Замкнутый многоугольник (-- cycle) / многозвенный контур (призмы, клинья)',
        shortcut: 'P',
        keywords: 'polygon cycle contour призма клин полигон контур',
        run: () => {
          setActiveTab('studio');
          setActiveTool('polygon');
        },
      },
      {
        id: 'tool-callout',
        categoryRu: 'Инструмент',
        labelRu: 'Размерная выноска ГОСТ / ISO |<->| с авто-расчётом длины',
        shortcut: 'D',
        keywords: 'callout dimension выноска размер гост',
        run: () => {
          setActiveTab('studio');
          setActiveTool('callout');
        },
      },
      {
        id: 'act-onion-mode',
        categoryRu: 'Холст',
        labelRu: 'Включить режим «Калька» (полупрозрачный PDF поверх интерактивного эскиза)',
        keywords: 'onion skin калька наложение pdf эскиз',
        run: () => {
          setActiveTab('studio');
          setCanvasMode('onion');
        },
      },
      {
        id: 'act-live-autobuild',
        categoryRu: 'Сборка',
        labelRu: liveAutoBuild ? 'Выключить фоновую автосборку PDF' : 'Включить фоновую автосборку PDF (пауза 900 мс)',
        keywords: 'live build auto автосборка pdf',
        run: () => setLiveAutoBuild((v) => !v),
      },
      ...DOCUMENT_TEMPLATES.map((tpl) => ({
        id: `act-tpl-${tpl.id}`,
        categoryRu: 'Шаблон документа',
        labelRu: `Новый файл из шаблона «${tpl.titleRu}» (${tpl.defaultFilename})`,
        keywords: `template шаблон ${tpl.id} ${tpl.titleRu} ${tpl.categoryRu} ${tpl.defaultFilename}`,
        run: () => {
          setInitialTemplateId(tpl.id);
          setNewTemplateModalOpen(true);
        },
      })),
      {
        id: 'act-build',
        categoryRu: 'Сборка',
        labelRu: 'Сохранить исходник .tex и собрать актуальный PDF',
        shortcut: 'Ctrl+Enter',
        keywords: 'build pdf xelatex save сохранить собрать',
        run: handleSaveAndBuildClick,
      },
      {
        id: 'act-search',
        categoryRu: 'Редактор',
        labelRu: 'Поиск по коду .tex и переход к строке (:N)',
        shortcut: 'Ctrl+F',
        keywords: 'search find line строка поиск',
        run: () => {
          setActiveTab('studio');
          if (layoutFocus === 'focus-canvas') setLayoutFocus('tri-pane');
          setSearchBarOpen(true);
        },
      },
      {
        id: 'act-toggle-inspector',
        categoryRu: 'Раскладка',
        labelRu: inspectorCollapsed
          ? 'Показать правую панель Инспектора и F1'
          : 'Скрыть правую панель Инспектора (расширить Холст и Код)',
        keywords: 'inspector panel layout скрыть инспектор ширина',
        run: () => {
          setActiveTab('studio');
          setInspectorCollapsed((v) => !v);
        },
      },
      {
        id: 'act-connections',
        categoryRu: 'Диагностика',
        labelRu: 'Проверить все подключения (GitHub API, doctor, преамбула)',
        keywords: 'doctor connections xelatex ghostscript подключения',
        run: () => {
          setActiveTab('connections');
          runConnectionsCheck(connProfile);
        },
      },
      {
        id: 'act-egui-native',
        categoryRu: 'Нативный ОС стек',
        labelRu: 'Нативный egui 0.33.3: 7 Rust-модулей (ручки фигур, Galley, notify, Storage)',
        keywords: 'egui eframe rust native os windows linux wayland galley tooltip нативный',
        run: () => setActiveTab('egui-native'),
      },
      {
        id: 'act-tauri-v2',
        categoryRu: 'Нативный ОС стек',
        labelRu: 'Tauri v2 + Rust: отдельная ветка feat/tauri-v2-studio и 9 IPC-команд #[tauri::command]',
        keywords: 'tauri v2 rust webview2 webkitgtk ipc ветка branch github feat/tauri-v2-studio',
        run: () => setActiveTab('tauri-v2'),
      },
      {
        id: 'tool-select',
        categoryRu: 'Инструмент',
        labelRu: 'Выбор и перетаскивание ручек фигур на холсте',
        shortcut: 'V',
        keywords: 'select move выбор курсор ручки',
        run: () => {
          setActiveTab('studio');
          setActiveTool('select');
        },
      },
      {
        id: 'tool-marquee',
        categoryRu: 'Инструмент',
        labelRu: 'Рамка группового выделения и пакетного выравнивания',
        shortcut: 'B',
        keywords: 'marquee lasso рамка группа выравнивание',
        run: () => {
          setActiveTab('studio');
          setActiveTool('marquee');
        },
      },
      {
        id: 'tool-measure',
        categoryRu: 'Инструмент',
        labelRu: 'Линейка-измеритель расстояний и углов (ΔX, ΔY, L, ∠°)',
        shortcut: 'M',
        keywords: 'measure ruler линейка угол расстояние',
        run: () => {
          setActiveTab('studio');
          setActiveTool('measure');
        },
      },
    ];

    for (const tool of PRIMITIVE_TOOLS) {
      items.push({
        id: `tool-${tool.id}`,
        categoryRu: 'Инструмент',
        labelRu: `Включить инструмент «${tool.titleRu}»`,
        shortcut: tool.hotkey,
        keywords: `${tool.id} ${tool.titleRu} ${tool.syntax}`,
        run: () => {
          setActiveTab('studio');
          setActiveTool(tool.id);
        },
      });
    }

    for (const pkgTool of PACKAGE_CANVAS_TOOLS) {
      items.push({
        id: `pkg-tool-${pkgTool.id}`,
        categoryRu: 'Инструмент пакета на холсте',
        labelRu: `Рисовать объектом пакета: ${pkgTool.titleRu} (${pkgTool.sampleSyntax})`,
        keywords: `package canvas ${pkgTool.id} ${pkgTool.familyId} ${pkgTool.familyLabelRu} ${pkgTool.titleRu} ${pkgTool.requiredPackages.join(' ')} ${pkgTool.requiredLibraries.join(' ')}`,
        run: () => {
          setActiveTab('studio');
          setCanvasMode('sketch');
          setActiveTool(pkgTool.id);
        },
      });
    }

    items.push(
      {
        id: 'act-toggle-pdf-underlay',
        categoryRu: 'PDF-подложка холста',
        labelRu: pdfUnderlayEnabled
          ? 'Скрыть живую PDF-подложку под сеткой холста'
          : 'Включить живую PDF-подложку 1:1 под сеткой холста (обратная связь рендера)',
        keywords: 'pdf underlay ghostscript xelatex подложка рендер обратная связь холст',
        run: () => {
          setActiveTab('studio');
          setPdfUnderlayEnabled((v) => !v);
        },
      },
      {
        id: 'act-download-rendered-pdf',
        categoryRu: 'PDF-подложка холста',
        labelRu: 'Скачать отрендеренный PDF-файл текущего чертежа (.pdf)',
        keywords: 'pdf download экспорт скачать рендер',
        run: handleDownloadRenderedPdf,
      }
    );

    for (const lib of TIKZ_LIBRARIES) {
      items.push({
        id: `lib-${lib.name}`,
        categoryRu: 'Библиотека TikZ',
        labelRu: `Подключить \\usetikzlibrary{${lib.name}} в преамбулу`,
        keywords: `usetikzlibrary ${lib.name} ${lib.titleRu}`,
        run: () => {
          const plan = proposeLibraryConnect(source, lib.name);
          if (plan.ok) {
            pushSourceChange(plan.nextSource, `Подключена библиотека ${lib.name}`);
            setToastBanner(`Подключено \\usetikzlibrary{${lib.name}}.`);
          } else {
            setToastBanner(plan.reasonRu ?? `Библиотека ${lib.name} уже активна.`);
          }
        },
      });
    }

    for (const prof of ATOMIC_FIGURE_PROFILES) {
      items.push({
        id: `fig-prof-${prof.id}`,
        categoryRu: 'Специализация рисунка',
        labelRu: `Профиль атомарного рисунка: ${prof.shortLabelRu} (${prof.titleRu})`,
        keywords: `profile профиль пакеты ${prof.id} ${prof.shortLabelRu} ${prof.recommendedPackages.join(' ')}`,
        run: () => {
          setActiveTab('studio');
          handleSelectFigureProfile(prof.id);
        },
      });
    }

    for (const t of UI_THEMES) {
      items.push({
        id: `theme-${t.id}`,
        categoryRu: 'Тема GUI',
        labelRu: `Переключить тему интерфейса: ${t.labelRu} (${t.codeLabel})`,
        keywords: `theme ${t.id} ${t.labelRu}`,
        run: () => setTheme(t.id),
      });
    }

    return items;
  }, [
    activeManualAnchorId,
    caretManualAnchorId,
    connProfile,
    handleDownloadRenderedPdf,
    handleGroupSelected,
    handleOpenManualAnchor,
    handleRunAutoFormat,
    handleSaveAndBuildClick,
    handleSelectFigureProfile,
    inspectorCollapsed,
    layoutFocus,
    liveAutoBuild,
    pdfUnderlayEnabled,
    pushSourceChange,
    runConnectionsCheck,
    source,
  ]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!isWindowDragOver) setIsWindowDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsWindowDragOver(false);
      }}
      onDrop={handleWindowDrop}
      className="min-h-screen lg:h-screen w-full lg:overflow-hidden flex flex-col bg-[var(--tz-panel)] text-[var(--tz-text)] relative"
    >
      {/* Window Drag-and-Drop Overlay */}
      {isWindowDragOver && (
        <div className="fixed inset-0 z-50 bg-sky-950/75 border-2 border-dashed border-sky-400 flex items-center justify-center pointer-events-none">
          <div className="px-6 py-4 rounded bg-[var(--tz-panel)] border border-[var(--tz-accent)] text-center shadow-2xl">
            <div className="text-sm font-semibold text-[var(--tz-text)]">
              Отпустите файл для импорта в TikZarium Studio
            </div>
            <div className="text-xs text-[var(--tz-muted)] mt-1">
              Поддерживаются: <code className="font-mono">.tex</code> (исходник),{' '}
              <code className="font-mono">.csv / .dat</code> (график PGFPlots + n1),{' '}
              <code className="font-mono">.png / .jpg</code> (подложка под сетку)
            </div>
          </div>
        </div>
      )}

      {/* CLEAN 3-ZONE TOP BAR (egui::TopBottomPanel::top("menu_bar")) */}
      <header className="flex items-center justify-between gap-8 px-4 py-1.5 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] text-xs shrink-0">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('studio');
          }}
          className="text-sm font-bold tracking-tight text-[var(--tz-text)] whitespace-nowrap shrink-0"
        >
          TikZarium Studio
        </a>

        {/* Zone 2: Concise Single-Line Navigation Links */}
        <nav
          aria-label="Основная навигация студии"
          className="hidden md:flex items-center gap-5 text-xs font-medium text-[var(--tz-muted)]"
        >
          <button
            type="button"
            data-testid={activeTab !== 'studio' ? 'back-to-studio-btn' : 'nav-studio-btn'}
            onClick={() => setActiveTab('studio')}
            className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4 ${
              activeTab === 'studio' ? 'text-[var(--tz-text)] font-semibold' : 'hover:text-[var(--tz-text)]'
            }`}
          >
            {activeTab !== 'studio' && <ArrowLeft className="w-3 h-3 text-[var(--tz-link)]" />}
            <span>Рабочая студия</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('libraries')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4 ${
              activeTab === 'libraries' ? 'text-[var(--tz-text)] font-semibold' : 'hover:text-[var(--tz-text)]'
            }`}
          >
            Пакеты и библиотеки
          </button>

          <button
            type="button"
            data-testid="env-status-btn"
            onClick={() => {
              setActiveTab('connections');
              runConnectionsCheck(connProfile);
            }}
            title="Проверить локальный компилятор XeLaTeX и окружение пакетов (tikzarium doctor)"
            className={`whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4 ${
              activeTab === 'connections' ? 'text-[var(--tz-text)] font-semibold' : 'hover:text-[var(--tz-text)]'
            }`}
          >
            {connLoading
              ? 'Проверка TeX…'
              : connReport
                ? connReport.doctor.exitCode === 0
                  ? 'Окружение XeLaTeX'
                  : 'Окружение TeX'
                : 'Окружение TeX'}
          </button>

          <button
            type="button"
            data-testid="open-agent-api-github-btn"
            onClick={() =>
              handleOpenManualAnchor(
                caretManualAnchorId ?? activeManualAnchorId,
                'agent-api-github'
              )
            }
            title="JSONL Control API v2 (49 операций GUI↔API) и синхронизация с i-shutov/tikzarium"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[var(--tz-text)] hover:underline underline-offset-4"
          >
            API &amp; GitHub
          </button>

          <button
            type="button"
            data-testid="nav-tauri-v2-btn"
            onClick={() => setActiveTab('tauri-v2')}
            title="Десктопная редакция Tauri v2 + Rust в отдельной ветке feat/tauri-v2-studio (9 IPC-команд #[tauri::command])"
            className={`whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4 ${
              activeTab === 'tauri-v2'
                ? 'text-[var(--tz-link)] font-semibold'
                : 'hover:text-[var(--tz-text)]'
            }`}
          >
            Tauri v2
          </button>
        </nav>

        {/* Zone 3: Single Primary Menu & Theme Control */}
        <div className="flex items-center gap-2 shrink-0">
          <div ref={helpEnvMenuRef} className="relative">
            <button
              type="button"
              data-testid="help-and-env-menu-btn"
              aria-expanded={helpEnvMenuOpen}
              aria-haspopup="menu"
              onClick={() => setHelpEnvMenuOpen((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border font-medium whitespace-nowrap shrink-0 transition-colors ${
                helpEnvMenuOpen
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                  : 'bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border-[var(--tz-outline)]'
              }`}
            >
              <span>Меню и тема</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {helpEnvMenuOpen && (
              <div
                role="menu"
                aria-label="Настройки, окружение TeX и справка"
                data-testid="help-and-env-menu-popover"
                className="absolute right-0 top-full mt-1 w-68 z-50 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] shadow-2xl py-1.5 text-xs"
              >
                <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-[var(--tz-muted)]">Тема интерфейса:</span>
                  <select
                    aria-label="Тема оформления интерфейса TikZarium (не меняет цвета PDF)"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as UiThemeId)}
                    className="px-2 py-0.5 rounded bg-[var(--tz-button)] text-[var(--tz-text)] border border-[var(--tz-outline)] text-xs"
                  >
                    {UI_THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.codeLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="my-1 border-t border-[var(--tz-outline)]" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveTab('studio');
                    setHelpEnvMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--tz-hover)] ${
                    activeTab === 'studio' ? 'text-[var(--tz-link)] font-semibold' : 'text-[var(--tz-text)]'
                  }`}
                >
                  <span>Рабочая студия</span>
                  {activeTab === 'studio' && <span className="font-mono text-[10px]">активна</span>}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveTab('connections');
                    runConnectionsCheck(connProfile);
                    setHelpEnvMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--tz-hover)] ${
                    activeTab === 'connections' ? 'text-[var(--tz-link)] font-semibold' : 'text-[var(--tz-text)]'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <PlugZap className="w-3.5 h-3.5 text-[var(--tz-muted)]" />
                    <span>Диагностика окружения TeX</span>
                  </span>
                  <span className="font-mono text-[10px] text-[var(--tz-muted)]">
                    {connReport ? (connReport.doctor.exitCode === 0 ? 'ОК' : 'проверка') : ''}
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveTab('libraries');
                    setHelpEnvMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--tz-hover)] ${
                    activeTab === 'libraries' ? 'text-[var(--tz-link)] font-semibold' : 'text-[var(--tz-text)]'
                  }`}
                >
                  <span>Справочник пакетов и библиотек</span>
                </button>

                <div className="my-1 border-t border-[var(--tz-outline)]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveTab('ux-audit');
                    setHelpEnvMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--tz-hover)] ${
                    activeTab === 'ux-audit' ? 'text-[var(--tz-link)] font-semibold' : 'text-[var(--tz-text)]'
                  }`}
                >
                  <span>Реестр всех требований, FE и UX</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveTab('egui-native');
                    setHelpEnvMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--tz-hover)] ${
                    activeTab === 'egui-native' ? 'text-[var(--tz-link)] font-semibold' : 'text-[var(--tz-muted)]'
                  }`}
                >
                  <span>Спецификация egui 0.33.3</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveTab('tauri-v2');
                    setHelpEnvMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--tz-hover)] ${
                    activeTab === 'tauri-v2' ? 'text-[var(--tz-link)] font-semibold' : 'text-[var(--tz-text)]'
                  }`}
                >
                  <span>Ветка Tauri v2 + Rust</span>
                  <span className="font-mono text-[10px] text-[var(--tz-link)]">feat/tauri-v2</span>
                </button>
                <div className="my-1 border-t border-[var(--tz-outline)]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setHelpEnvMenuOpen(false);
                    handleOpenManualAnchor(caretManualAnchorId ?? activeManualAnchorId, 'reader');
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--tz-hover)] text-[var(--tz-text)]"
                >
                  <span>Оригинальный PDF-мануал (прямые точки)</span>
                  <span className="font-mono text-[10px] text-[var(--tz-muted)]">Shift+F1</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setHelpEnvMenuOpen(false);
                    handleOpenManualAnchor(caretManualAnchorId ?? activeManualAnchorId, 'agent-api-github');
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--tz-hover)] text-[var(--tz-text)]"
                >
                  <span>Control API v2 &amp; GitHub i-shutov/tikzarium</span>
                  <span className="font-mono text-[10px] text-[var(--tz-link)]">JSONL</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* WORKSPACE TOOLBAR & SEPARATED 3-STATE TRIAD (Single-row ergonomic layout for 1280-1440px) */}
      <div
        className={`flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 px-3 py-1.5 bg-[var(--tz-window)] border-b border-[var(--tz-outline)] text-xs shrink-0 ${
          highlightedZone === 'toolbar' || highlightedZone === 'status-triad'
            ? 'ring-2 ring-inset ring-sky-500'
            : ''
        }`}
      >
        {/* Left: Document & History Group + Authoring Hubs Group */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              setInitialTemplateId('diagram');
              setNewTemplateModalOpen(true);
            }}
            title="Создать новый документ из шаблона: Диаграмма, График, Схема оптики… (Alt+N)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-medium whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-3.5 h-3.5 text-[var(--tz-link)]" />
            <span>Новый…</span>
          </button>

          <select
            aria-label="Выбор образца или созданного файла .tex"
            value={specimenId}
            onChange={(e) => handleSelectSpecimen(e.target.value)}
            className="max-w-[180px] xl:max-w-[225px] truncate px-2 py-1 rounded bg-[var(--tz-button)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-medium shrink"
          >
            {allDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.titleRu}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void handleOpenOrPathDialogClick()}
            title={
              isTauriRuntime()
                ? 'Открыть локальный .tex с диска ОС (Tauri v2 dialog + notify watcher)'
                : 'Выбрать рабочую папку и имя файла'
            }
            aria-label="Рабочий путь файла"
            className="inline-flex items-center gap-1 p-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap shrink-0"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>

          <div className="inline-flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex === 0}
              aria-label="Отменить правку (Undo)"
              title="Отменить (Ctrl+Z)"
              className="p-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] disabled:opacity-40 text-[var(--tz-text)] border border-[var(--tz-outline)]"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              aria-label="Повторить правку (Redo)"
              title="Повторить (Ctrl+Y)"
              className="p-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] disabled:opacity-40 text-[var(--tz-text)] border border-[var(--tz-outline)]"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setHistoryModalOpen(true)}
              aria-label="История ревизий и построчный Diff"
              title="История ревизий и построчный Diff изменений"
              className="p-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] shrink-0"
            >
              <History className="w-3.5 h-3.5 text-[var(--tz-link)]" />
            </button>
          </div>

          <span aria-hidden="true" className="hidden lg:inline-block h-4 w-px bg-[var(--tz-outline)] mx-0.5 shrink-0" />

          {/* E02: Unified Searchable Engineering & TikZ Extension Packages Hub Button */}
          <button
            type="button"
            data-testid="open-workshops-hub-btn"
            onClick={() => {
              setWorkshopsHubExtensionId(undefined);
              setWorkshopsHubTab('extensions');
              setWorkshopsHubOpen(true);
            }}
            title="Мастерские и пакеты расширений TikZ: pgfplots, circuitikz, chemfig, tikz-cd, forest, quantikz, tikz-timing, Булевы 2D и МНК (Ctrl+Shift+T)"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--tz-accent)]/15 hover:bg-[var(--tz-accent)]/25 text-[var(--tz-link)] border border-[var(--tz-accent)]/50 font-semibold whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Мастерские</span>
          </button>

          {/* Direct Original PDF Manual Reader Button */}
          <button
            type="button"
            data-testid="open-pdf-manual-btn"
            onClick={() =>
              handleOpenManualAnchor(caretManualAnchorId ?? activeManualAnchorId, 'reader')
            }
            title="Оригинальный PDF-мануал PGF/TikZ и 12 пакетов расширений с переходом на прямую точку под курсором (Shift+F1)"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-medium whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--tz-link)]" />
            <span>PDF-мануал</span>
          </button>

          {/* E08: Up to 4 User-Pinned ★ Favorite Workshop Quick-Slots */}
          <div
            data-testid="pinned-workshops-bar"
            className="hidden xl:inline-flex items-center gap-0.5 shrink-0"
          >
            {pinnedWorkshopIds.slice(0, 4).map((pinId, pinIdx) => {
              const meta = WORKSHOP_CATALOG_ITEMS.find((item) => item.id === pinId);
              if (!meta) return null;
              return (
                <button
                  key={pinId}
                  type="button"
                  data-testid={`pinned-workshop-${pinId}`}
                  onClick={() => handleLaunchWorkshopTarget(pinId)}
                  title={`Избранная мастерская ★: ${meta.titleRu}`}
                  className={`${
                    pinIdx >= 1 ? 'hidden 2xl:inline-flex' : 'inline-flex'
                  } items-center gap-1 px-1.5 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] text-[11px] whitespace-nowrap shrink-0`}
                >
                  <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 shrink-0" />
                  <span>{meta.shortPinLabelRu}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setCmdPaletteOpen(true)}
            aria-label="Открыть палитру команд и горячих клавиш (Ctrl+K)"
            title="Палитра команд и горячих клавиш (Ctrl+K)"
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-[var(--tz-inset)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap shrink-0"
          >
            <Command className="w-3.5 h-3.5 text-[var(--tz-link)]" />
            <kbd className="hidden 2xl:inline text-[10px] font-mono text-[var(--tz-muted)]">Ctrl+K</kbd>
          </button>
        </div>

        {/* Center: Unboxed 3-Axis Status Triad */}
        <div
          aria-label="Триада состояний документа, сборки и PDF"
          className="flex items-center gap-1.5 font-mono tabular-nums text-[11px] text-[var(--tz-muted)] whitespace-nowrap shrink-0"
        >
          <span>
            Код:{' '}
            <strong className={isDirtyDocument ? 'text-amber-500' : 'text-emerald-500'}>
              {isDirtyDocument ? `Изм.#${sourceRevision}` : `Чист#${sourceRevision}`}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Сборка:{' '}
            <strong
              className={
                buildStatus === 'running'
                  ? 'text-sky-400'
                  : buildStatus === 'failed'
                    ? 'text-rose-500'
                    : buildStatus === 'cancelled'
                      ? 'text-amber-500'
                      : 'text-[var(--tz-text)]'
              }
            >
              {buildStatus === 'running'
                ? 'Идёт…'
                : buildStatus === 'failed'
                  ? `Сбой(${diagnostics.length})`
                  : buildStatus === 'cancelled'
                    ? 'Отмена'
                    : 'ОК'}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            PDF:{' '}
            <strong
              className={
                pdfStatus === 'current'
                  ? 'text-emerald-500'
                  : pdfStatus === 'stale'
                    ? 'text-amber-500'
                    : 'text-[var(--tz-muted)]'
              }
            >
              {pdfStatus === 'current'
                ? `Актуален#${builtRevision}`
                : pdfStatus === 'stale'
                  ? `Устарел#${builtRevision ?? 0}`
                  : 'Нет'}
            </strong>
          </span>
        </div>

        {/* Right: Build / Live-AutoBuild, Publication Export Master + Layout & Theme */}
        <div className="flex items-center gap-1 shrink-0">
          {buildStatus === 'running' ? (
            <button
              type="button"
              onClick={handleCancelBuild}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 font-medium whitespace-nowrap shrink-0"
            >
              <StopIcon className="w-3 h-3" />
              <span>Стоп</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAndBuildClick}
              aria-label="Сохранить и собрать PDF"
              title="Сохранить .tex и запустить сборку PDF (Ctrl+Enter)"
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--tz-accent)] text-white hover:opacity-95 font-medium whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>
                Собрать<span className="hidden 2xl:inline"> PDF</span>
              </span>
            </button>
          )}

          {/* Debounced Live Auto-Build Toggle */}
          <button
            type="button"
            onClick={() => setLiveAutoBuild((v) => !v)}
            aria-pressed={liveAutoBuild}
            title="Автоматическая пересборка PDF через 900 мс после остановки правок"
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded border whitespace-nowrap shrink-0 ${
              liveAutoBuild
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] border-[var(--tz-outline)] hover:text-[var(--tz-text)]'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Авто</span>
          </button>

          {/* Publication Export Master */}
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            title="Мастер экспорта: чистый .tex без n1 для Overleaf, tikzpicture, SVG, PNG 300/600 DPI и обёртка \begin{figure}"
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Экспорт</span>
          </button>

          {activeTab === 'studio' && (
            <div
              className="hidden lg:inline-flex items-center p-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
              role="group"
              aria-label="Режим компоновки панелей"
            >
              <button
                type="button"
                onClick={() => setLayoutFocus('tri-pane')}
                aria-label="Раскладка: три панели"
                className={`p-1 rounded-sm ${
                  layoutFocus === 'tri-pane' ? 'bg-[var(--tz-active)] text-[var(--tz-text)]' : 'text-[var(--tz-muted)]'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutFocus('focus-canvas')}
                aria-label="Раскладка: фокус на холсте"
                className={`p-1 rounded-sm ${
                  layoutFocus === 'focus-canvas'
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                    : 'text-[var(--tz-muted)]'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutFocus('focus-code')}
                aria-label="Раскладка: фокус на коде"
                className={`p-1 rounded-sm ${
                  layoutFocus === 'focus-code' ? 'bg-[var(--tz-active)] text-[var(--tz-text)]' : 'text-[var(--tz-muted)]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setInspectorCollapsed((v) => !v)}
                aria-label={inspectorCollapsed ? 'Показать панель Инспектора' : 'Скрыть панель Инспектора'}
                className={`p-1 rounded-sm ${
                  inspectorCollapsed ? 'bg-[var(--tz-active)] text-[var(--tz-link)]' : 'text-[var(--tz-muted)]'
                }`}
              >
                {inspectorCollapsed ? (
                  <PanelRightOpen className="w-3.5 h-3.5" />
                ) : (
                  <PanelRightClose className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OS File Watcher External Conflict Banner */}
      {externalDiskChange && (
        <div
          role="alert"
          data-testid="external-disk-banner"
          className="px-4 py-1.5 bg-amber-500/15 border-b border-amber-500/40 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0"
        >
          <div className="flex items-center gap-2 text-amber-300">
            <HardDrive className="w-3.5 h-3.5 shrink-0" />
            <span>
              Файл <code className="font-mono">{externalDiskChange.filename}</code> изменён на диске внешним редактором ({externalDiskChange.externalEditor})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setHistoryModalOpen(true)}
              className="px-2.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap"
            >
              Сравнить Diff
            </button>
            <button
              type="button"
              onClick={() => {
                pushSourceChange(
                  externalDiskChange.diskSource,
                  `Перезагружено с диска (${externalDiskChange.externalEditor})`
                );
                clearServerExternalDiskChange(externalDiskChange.filename);
                setExternalDiskChange(null);
                setToastBanner(`Принята внешняя версия файла ${filename} с диска.`);
              }}
              className="px-2.5 py-0.5 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap"
            >
              Перезагрузить с диска
            </button>
            <button
              type="button"
              onClick={() => {
                clearServerExternalDiskChange(externalDiskChange.filename);
                setExternalDiskChange(null);
              }}
              className="px-2 py-0.5 text-[var(--tz-muted)] hover:text-[var(--tz-text)] whitespace-nowrap"
            >
              Оставить буфер
            </button>
          </div>
        </div>
      )}

      {/* Transient Feedback Strip */}
      {toastBanner && (
        <div
          role="status"
          className="px-4 py-1.5 bg-[var(--tz-inset)] border-b border-[var(--tz-outline)] text-xs flex items-center justify-between gap-3 shrink-0"
        >
          <span className="text-[var(--tz-text)]">{toastBanner}</span>
          <button
            type="button"
            onClick={() => setToastBanner(null)}
            className="text-[var(--tz-muted)] hover:text-[var(--tz-text)] text-[11px]"
          >
            Скрыть
          </button>
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <main className="flex-1 lg:min-h-0 flex flex-col lg:flex-row lg:overflow-hidden">
        {activeTab === 'studio' && (() => {
          const clamped = clampSplitterColumns(panelCols.canvas, panelCols.code, inspectorCollapsed);
          const canvasWidthClass =
            layoutFocus === 'focus-canvas'
              ? inspectorCollapsed
                ? 'lg:w-full'
                : `${LG_FLEX_WIDTH_24[16]} lg:shrink-0`
              : `${LG_FLEX_WIDTH_24[clamped.canvas] ?? 'lg:w-[41.6667%]'} lg:shrink-0`;

          const codeWidthClass =
            layoutFocus === 'focus-code'
              ? inspectorCollapsed
                ? 'lg:w-full'
                : `${LG_FLEX_WIDTH_24[18]} lg:shrink-0`
              : inspectorCollapsed
                ? 'lg:flex-1 lg:min-w-0'
                : `${LG_FLEX_WIDTH_24[clamped.code] ?? 'lg:w-[33.3333%]'} lg:shrink-0`;

          return (
            <div
              ref={studioRowRef}
              className="flex-1 lg:min-h-0 flex flex-col lg:flex-row lg:overflow-hidden"
            >
              {layoutFocus !== 'focus-code' && (
                <div
                  className={`min-h-[420px] lg:min-h-0 lg:h-full lg:overflow-hidden border-b lg:border-b-0 border-[var(--tz-outline)] ${canvasWidthClass}`}
                >
                  <CanvasStage
                    activeTool={activeTool}
                    onSelectTool={setActiveTool}
                    canvasMode={canvasMode}
                    onChangeCanvasMode={setCanvasMode}
                    ownedPrimitives={ownedPrimitives}
                    selectedPrimitiveId={selectedPrimitiveId}
                    selectedPrimitiveIds={selectedPrimitiveIds}
                    onSelectPrimitive={handleSelectPrimitiveOnCanvas}
                    onSelectMultiplePrimitives={handleSelectMultiplePrimitives}
                    hoveredPrimitiveId={hoveredPrimitiveId}
                    onHoverPrimitive={setHoveredPrimitiveId}
                    onCreatePrimitiveFromGesture={handleCreatePrimitiveFromGesture}
                    onApplyPrimitivePatch={handleApplyPrimitivePatch}
                    onMovePrimitivesCm={handleMovePrimitivesCm}
                    onAlignSelected={handleAlignSelected}
                    onDeleteSelectedPrimitives={handleDeleteSelectedPrimitives}
                    onDuplicatePrimitive={handleDuplicatePrimitive}
                    onDeletePrimitive={handleDeletePrimitive}
                    onCreateCalloutFromGesture={handleCreateCalloutFromGesture}
                    onToggleCalloutOnPrimitive={handleToggleCalloutOnPrimitive}
                    onRotatePrimitives={handleRotatePrimitives}
                    onMirrorPrimitives={handleMirrorPrimitives}
                    onDetachPrimitive={handleDetachPrimitive}
                    onQuickInsertStampAt={(stampId, xCm, yCm) =>
                      handleInsertScientificStamp(stampId, xCm, yCm, 1.0)
                    }
                    onOpenCadModal={(tab) => {
                      setCadModalTab(tab);
                      setCadModalOpen(true);
                    }}
                    onCreatePolygonFromGesture={handleCreatePolygonFromGesture}
                    digitizerPointsCm={digitizerPointsCm}
                    onPickDigitizerPoint={(pt) =>
                      setDigitizerPointsCm((prev) => [...prev, pt])
                    }
                    hiddenLayers={hiddenLayers}
                    lockedLayers={lockedLayers}
                    onToggleHideLayer={handleToggleHideLayer}
                    onToggleLockLayer={handleToggleLockLayer}
                    activeBeamerSlide={activeBeamerSlide}
                    onChangeActiveBeamerSlide={setActiveBeamerSlide}
                    journalGaugeId={journalGaugeId}
                    onChangeJournalGaugeId={setJournalGaugeId}
                    colorProofMode={colorProofMode}
                    onChangeColorProofMode={setColorProofMode}
                    onSyncTexJump={handleSyncTexJump}
                    referenceImageUrl={referenceImageUrl}
                    onClearReferenceImage={() => setReferenceImageUrl(null)}
                    sourceRevision={sourceRevision}
                    pdfState={{
                      status: pdfStatus,
                      builtRevision,
                      builtAt,
                      lastGoodPrimitives,
                      hasCustomNodesNote: customNodesNote,
                    }}
                    onTriggerBuild={handleSaveAndBuildClick}
                    highlightedZone={highlightedZone === 'canvas' || highlightedZone === 'tools'}
                    copiedStylePassport={copiedStylePassport}
                    onEyedropperClickPrimitive={handleEyedropperClickPrimitive}
                    onOpenOutlinerTable={() => {
                      setNotationsModalTab('outliner-table');
                      setNotationsModalOpen(true);
                    }}
                    onInsertPolyVertexAtEdge={handleInsertPolyVertexAtEdge}
                    onDeletePolyVertexAtIndex={handleDeletePolyVertexAtIndex}
                    onTogglePolyClosed={handleTogglePolyClosed}
                    onCreateThreePointArc={handleCreateThreePointArc}
                    onGroupSelected={handleGroupSelected}
                    onUngroupSelected={handleUngroupSelected}
                    visualDiffReport={visualDiffReport}
                    onRevertSinglePrimitiveFromDiff={handleRevertSinglePrimitiveFromDiff}
                    figureProfileId={effectiveFigureProfileId}
                    isBeamerActive={isBeamerActive}
                    onOpenProfileWorkshop={() => {
                      const spec = ATOMIC_FIGURE_PROFILES.find(
                        (p) => p.id === effectiveFigureProfileId
                      );
                      if (spec) handleLaunchWorkshopTarget(spec.quickWorkshopTargetId);
                    }}
                    packageObjects={packageObjects}
                    selectedPackageObjectId={selectedPackageObjectId}
                    onSelectPackageObject={handleSelectPackageObject}
                    onCreatePackageObjectFromGesture={handleCreatePackageObjectFromGesture}
                    onMovePackageObjectCm={handleMovePackageObjectCm}
                    onDeletePackageObject={handleDeletePackageObject}
                    pdfUnderlay={{
                      enabled: pdfUnderlayEnabled,
                      loading: pdfUnderlayLoading,
                      opacity: pdfUnderlayOpacity,
                      response: pdfUnderlayResponse,
                    }}
                    onTogglePdfUnderlay={() => setPdfUnderlayEnabled((v) => !v)}
                    onChangePdfUnderlayOpacity={setPdfUnderlayOpacity}
                    onDownloadRenderedPdf={handleDownloadRenderedPdf}
                    onStageBoundsChange={setStageBoundsCm}
                    compositeLayers={compositeLayers}
                    onChangeCompositeLayers={(patch) =>
                      setCompositeLayers((prev) => ({ ...prev, ...patch }))
                    }
                    onOpenLayersObjectsDock={() => {
                      setInspectorCollapsed(false);
                      setInspectorTabOverride('layers-objects');
                    }}
                  />
                </div>
              )}

              {/* Draggable Splitter #1 (Canvas <-> Code) */}
              {layoutFocus === 'tri-pane' && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Разделитель панелей Холст и Код (двойной клик — сброс 10:8:6)"
                  data-testid="splitter-canvas-code"
                  title="Потяните для изменения ширины панелей · Двойной клик — сброс 10:8:6"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    splitterDragRef.current = {
                      which: 'canvas-code',
                      startX: e.clientX,
                      startCols: clamped,
                    };
                  }}
                  onDoubleClick={() => setPanelCols({ canvas: 10, code: 8, inspector: 6 })}
                  className="hidden lg:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-[var(--tz-window)] hover:bg-[var(--tz-accent)]/35 border-x border-[var(--tz-outline)] transition-colors select-none group"
                >
                  <span className="w-0.5 h-8 rounded-full bg-[var(--tz-muted)]/45 group-hover:bg-[var(--tz-accent)]" />
                </div>
              )}

              {layoutFocus !== 'focus-canvas' && (
                <div
                  className={`min-h-[380px] lg:min-h-0 lg:h-full lg:overflow-hidden border-b lg:border-b-0 border-[var(--tz-outline)] ${codeWidthClass}`}
                >
                  <TexSourceEditor
                    filename={filename}
                    source={source}
                    onChangeSource={pushSourceChange}
                    activeLine={activeLine}
                    onChangeActiveLine={setActiveLine}
                    diagnostics={diagnostics}
                    ownedPrimitives={ownedPrimitives}
                    hoveredPrimitiveId={hoveredPrimitiveId}
                    onHoverPrimitive={setHoveredPrimitiveId}
                    onAdoptRawLine={handleAdoptRawLine}
                    onAdoptAllRawLines={handleAdoptAllRawLines}
                    fontSizePt={fontSizePt}
                    onChangeFontSizePt={setFontSizePt}
                    softWrap={softWrap}
                    onToggleSoftWrap={() => setSoftWrap((v) => !v)}
                    searchBarOpen={searchBarOpen}
                    onToggleSearchBar={setSearchBarOpen}
                    highlightedZone={
                      highlightedZone === 'editor'
                        ? 'editor'
                        : highlightedZone === 'search'
                          ? 'search'
                          : null
                    }
                    indentSpaces={indentSpaces}
                    onOpenFormatterModal={() => {
                      setFormatterModalTab('format-refactor');
                      setFormatterModalOpen(true);
                    }}
                    figureProfileId={effectiveFigureProfileId}
                    onSelectFigureProfile={handleSelectFigureProfile}
                    onOpenManualAnchor={(anchorId) => handleOpenManualAnchor(anchorId, 'reader')}
                    onCaretAnchorChange={setCaretManualAnchorId}
                  />
                </div>
              )}

              {/* Draggable Splitter #2 (Code <-> Inspector) */}
              {layoutFocus === 'tri-pane' && !inspectorCollapsed && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Разделитель панелей Код и Инспектор (двойной клик — сброс 10:8:6)"
                  data-testid="splitter-code-inspector"
                  title="Потяните для изменения ширины Инспектора · Двойной клик — сброс 10:8:6"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    splitterDragRef.current = {
                      which: 'code-inspector',
                      startX: e.clientX,
                      startCols: clamped,
                    };
                  }}
                  onDoubleClick={() => setPanelCols({ canvas: 10, code: 8, inspector: 6 })}
                  className="hidden lg:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-[var(--tz-window)] hover:bg-[var(--tz-accent)]/35 border-x border-[var(--tz-outline)] transition-colors select-none group"
                >
                  <span className="w-0.5 h-8 rounded-full bg-[var(--tz-muted)]/45 group-hover:bg-[var(--tz-accent)]" />
                </div>
              )}

              {!inspectorCollapsed && (
                <div className="min-h-0 h-full overflow-hidden lg:flex-1 lg:min-w-0">
                  <InspectorAndHelpPane
                    ownedPrimitives={ownedPrimitives}
                    selectedPrimitive={selectedPrimitive}
                    selectedPrimitives={selectedPrimitivesList}
                    activeTool={activeTool}
                    arrowsMetaLoaded={arrowsMetaLoaded}
                    onSelectPrimitive={(id) => handleSelectPrimitiveOnCanvas(id, false)}
                    onApplyPrimitivePatch={(id, vals) => handleApplyPrimitivePatch(id, vals)}
                    onInsertNewFromInspector={handleInsertNewFromInspector}
                    onDuplicateSelected={() => {
                      if (selectedPrimitiveId !== null) handleDuplicatePrimitive(selectedPrimitiveId);
                    }}
                    onDeleteSelected={() => {
                      if (selectedPrimitiveId !== null) handleDeletePrimitive(selectedPrimitiveId);
                    }}
                    onAlignSelected={handleAlignSelected}
                    onDeleteSelectedPrimitives={handleDeleteSelectedPrimitives}
                    onOpenSaveSnippetModal={() => setSnippetsModalOpen(true)}
                    onReorderPrimitive={handleReorderPrimitive}
                    onDetachPrimitive={handleDetachPrimitive}
                    onRotatePrimitives={handleRotatePrimitives}
                    onMirrorPrimitives={handleMirrorPrimitives}
                    onScalePrimitives={handleScalePrimitives}
                    onToggleCallout={handleToggleCalloutOnPrimitive}
                    onOpenForeachModal={() => {
                      setCadModalTab('foreach');
                      setCadModalOpen(true);
                    }}
                    onConstructGeometry={handleConstructGeometry}
                    diagnostics={diagnostics}
                    onJumpToLine={(ln) => {
                      if (layoutFocus === 'focus-canvas') setLayoutFocus('tri-pane');
                      setActiveLine(ln);
                      setSearchBarOpen(true);
                    }}
                    onApplyQuickFix={handleApplyQuickFix}
                    onQuickConnectLibrary={(libName) => {
                      const plan = proposeLibraryConnect(source, libName);
                      if (plan.ok) {
                        pushSourceChange(plan.nextSource, `Подключена библиотека ${libName}`);
                        setToastBanner(
                          `В преамбулу добавлено \\usetikzlibrary{${libName}}. Нажмите «Сохранить и собрать PDF».`
                        );
                      }
                    }}
                    highlightedZone={
                      highlightedZone === 'inspector'
                        ? 'inspector'
                        : highlightedZone === 'help'
                          ? 'help'
                          : null
                    }
                    copiedStylePassport={copiedStylePassport}
                    onSampleStyleFromPrimitive={handleSampleStyleFromPrimitive}
                    onApplyCopiedStyleToIds={handleApplyCopiedStyleToIds}
                    onQuickFilletSelected={() => handleConstructFilletOrChamfer(0.45, 'fillet')}
                    onQuickFillBetweenSelected={() =>
                      handleInsertFillBetween(0.55, { fillColor: 'blue!8' })
                    }
                    preambleStyles={preambleStyles}
                    selectionGeometryMetrics={selectionGeometryMetrics}
                    onInsertCentroidMarker={handleInsertCentroidMarker}
                    onGroupSelected={handleGroupSelected}
                    onUngroupSelected={handleUngroupSelected}
                    onOpenWorkshopsHub={(tab) => {
                      setWorkshopsHubTab(tab ?? 'extensions');
                      setWorkshopsHubOpen(true);
                    }}
                    onOpenLayersModal={() => {
                      setAdvModalTab('layers-beamer');
                      setAdvModalOpen(true);
                    }}
                    onOpenSnippetsModal={() => setSnippetsModalOpen(true)}
                    isBeamerActive={isBeamerActive}
                    connectedLibraries={connectedLibraries}
                    onOpenManualAnchor={(anchorId) => handleOpenManualAnchor(anchorId, 'reader')}
                    source={source}
                    onOpenExtensionWorkshop={(extId) => {
                      setWorkshopsHubExtensionId(extId);
                      setWorkshopsHubTab('extensions');
                      setWorkshopsHubOpen(true);
                    }}
                    packageObjects={packageObjects}
                    selectedPackageObject={selectedPackageObject}
                    onSelectPackageObject={handleSelectPackageObject}
                    onPatchPackageObject={handlePatchPackageObject}
                    onDeletePackageObject={handleDeletePackageObject}
                    declaredDataFiles={activeSpecimenMeta.dataDependencies}
                    activeTabOverride={inspectorTabOverride}
                    onConsumeTabOverride={() => setInspectorTabOverride(null)}
                    compositeLayers={compositeLayers}
                    onChangeCompositeLayers={(patch) =>
                      setCompositeLayers((prev) => ({ ...prev, ...patch }))
                    }
                    pdfUnderlay={{
                      enabled: pdfUnderlayEnabled,
                      loading: pdfUnderlayLoading,
                      opacity: pdfUnderlayOpacity,
                      renderMs: pdfUnderlayResponse?.renderMs,
                      engineLabelRu: pdfUnderlayResponse?.engineLabelRu,
                      hasPdf: Boolean(pdfUnderlayResponse?.pdfBase64),
                    }}
                    onTogglePdfUnderlay={() => setPdfUnderlayEnabled((v) => !v)}
                    onChangePdfUnderlayOpacity={setPdfUnderlayOpacity}
                    onDownloadRenderedPdf={handleDownloadRenderedPdf}
                    referenceImageUrl={referenceImageUrl}
                    onUploadReferenceImageDataUrl={(dataUrl) => setReferenceImageUrl(dataUrl)}
                    onLoadDemoReferenceScan={() => setReferenceImageUrl(DEMO_PLOT_SCAN_DATA_URI)}
                    onClearReferenceImage={() => setReferenceImageUrl(null)}
                    hiddenLayers={hiddenLayers}
                    lockedLayers={lockedLayers}
                    onToggleHideLayer={handleToggleHideLayer}
                    onToggleLockLayer={handleToggleLockLayer}
                    onOpenOutlinerTable={() => {
                      setNotationsModalTab('outliner-table');
                      setNotationsModalOpen(true);
                    }}
                    hoveredPrimitiveId={hoveredPrimitiveId}
                    onHoverPrimitive={setHoveredPrimitiveId}
                    onDuplicatePrimitiveById={handleDuplicatePrimitive}
                    onDeletePrimitiveById={handleDeletePrimitive}
                  />
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'connections' && (
          <ConnectionsAuditView
            report={connReport}
            loading={connLoading}
            error={connError}
            profile={connProfile}
            onChangeProfile={setConnProfile}
            onRefresh={() => runConnectionsCheck(connProfile)}
            activeFilename={filename}
            activeSource={source}
            dataDependencies={activeSpecimenMeta.dataDependencies}
            onNavigateTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === 'libraries' && (
          <LibrariesManagerView
            source={source}
            toolchainReady={Boolean(toolchainReady)}
            onApplySourcePatch={(nextSrc, summary) => {
              pushSourceChange(nextSrc, summary);
            }}
          />
        )}

        {activeTab === 'ux-audit' && (
          <UxAuditMatrixView onJumpToSolution={handleJumpToUxSolution} />
        )}

        {activeTab === 'egui-native' && (
          <EguiNativeBlueprintView
            onJumpToEditorDemo={() => {
              setActiveTab('studio');
              if (layoutFocus === 'focus-canvas') setLayoutFocus('tri-pane');
              setHighlightedZone('editor');
              setToastBanner(
                'Наведите курсор на LaTeX-команду в редакторе или нажмите Ctrl+Space для автодополнения.'
              );
              window.setTimeout(() => setHighlightedZone(null), 2600);
            }}
          />
        )}

        {activeTab === 'tauri-v2' && (
          <Suspense fallback={null}>
            <TauriV2BranchWorkbenchView onBackToStudio={() => setActiveTab('studio')} />
          </Suspense>
        )}
      </main>

      <NewDocumentTemplateModal
        open={newTemplateModalOpen}
        initialTemplateId={initialTemplateId}
        isDirtyCurrent={isDirtyDocument}
        currentFilename={filename}
        onClose={() => setNewTemplateModalOpen(false)}
        onConfirmCreate={handleCreateFromTemplate}
      />

      <RevisionHistoryDiffModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        history={history}
        historyIndex={historyIndex}
        onRestoreIndex={(idx) => {
          setHistoryIndex(idx);
          setToastBanner(`Переключено на ревизию #${history[idx]?.revision ?? 1}`);
        }}
        externalDiskChange={externalDiskChange}
        onAcceptExternalDiskChange={() => {
          if (!externalDiskChange) return;
          pushSourceChange(
            externalDiskChange.diskSource,
            `Перезагружено с диска (${externalDiskChange.externalEditor})`
          );
          setExternalDiskChange(null);
          setToastBanner(`Принята внешняя версия файла ${filename} с диска.`);
        }}
      />

      <PublicationExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        filename={filename}
        source={source}
        ownedPrimitives={ownedPrimitives}
        pdfStatus={pdfStatus}
        onNotify={(msg) => setToastBanner(msg)}
      />

      <WorkspaceSnippetsAndOsModal
        open={snippetsModalOpen}
        onClose={() => setSnippetsModalOpen(false)}
        selectedPrimitives={
          selectedPrimitivesList.length > 0
            ? selectedPrimitivesList
            : selectedPrimitive
              ? [selectedPrimitive]
              : []
        }
        customSnippets={customSnippets}
        onSaveSelectionAsSnippet={handleSaveSelectionAsSnippet}
        onDeleteCustomSnippet={(id) =>
          setCustomSnippets((prev) => prev.filter((s) => s.id !== id))
        }
        onInsertSnippet={handleInsertSnippet}
        recentFiles={recentFiles}
        onImportCsvText={handleImportCsvText}
        onSimulateExternalDiskWrite={handleSimulateExternalDiskWrite}
      />

      {cadModalOpen && (
        <Suspense fallback={null}>
          <ScientificCadModal
            open={cadModalOpen}
            initialTab={cadModalTab}
            onClose={() => setCadModalOpen(false)}
            source={source}
            ownedPrimitives={ownedPrimitives}
            selectedPrimitiveIds={
              selectedPrimitiveIds.length > 0
                ? selectedPrimitiveIds
                : selectedPrimitiveId !== null
                  ? [selectedPrimitiveId]
                  : []
            }
            journalGaugeId={journalGaugeId}
            onChangeJournalGaugeId={setJournalGaugeId}
            colorProofMode={colorProofMode}
            onChangeColorProofMode={setColorProofMode}
            onInsertStamp={handleInsertScientificStamp}
            onInsertAngleArc={handleInsertAngleArc}
            onApplyForeachArray={handleApplyForeachArray}
            onApplyPgfplotsAxis={handleApplyPgfplotsAxis}
            onApplyOkabeItoColor={handleApplyOkabeItoColor}
            onPasteClipboardTable={handlePasteClipboardTable}
            onCopyRenderedCanvasToClipboard={handleCopyRenderedCanvasToClipboard}
          />
        </Suspense>
      )}

      {advModalOpen && (
        <Suspense fallback={null}>
          <AdvancedCadAndLayersModal
            open={advModalOpen}
            initialTab={advModalTab}
            onClose={() => setAdvModalOpen(false)}
            source={source}
            ownedPrimitives={ownedPrimitives}
            selectedPrimitiveIds={
              selectedPrimitiveIds.length > 0
                ? selectedPrimitiveIds
                : selectedPrimitiveId !== null
                  ? [selectedPrimitiveId]
                  : []
            }
            onInsertPolygonPreset={handleInsertPolygonPreset}
            onActivatePolygonTool={() => {
              setActiveTab('studio');
              setCanvasMode('sketch');
              setActiveTool('polygon');
              setAdvModalOpen(false);
              setToastBanner(
                'Режим контура: кликайте вершины на холсте и нажмите «Замкнуть (-- cycle)».'
              );
            }}
            onConstructGeometry={handleConstructGeometry}
            onApplyHatchToSelection={handleApplyHatchToSelection}
            onApplyDecorationToSelection={handleApplyDecorationToSelection}
            onUpsertMacro={handleUpsertMacro}
            onInsertQuantityNode={handleInsertQuantityNode}
            digitizerCalibration={digitizerCalibration}
            onChangeDigitizerCalibration={setDigitizerCalibration}
            digitizerPointsCm={digitizerPointsCm}
            onClearDigitizerPoints={() => setDigitizerPointsCm([])}
            onAddDemoDigitizerPoints={() =>
              setDigitizerPointsCm([
                { x: 1.05, y: 0.92 },
                { x: 1.85, y: 1.48 },
                { x: 2.75, y: 2.86 },
                { x: 3.55, y: 2.18 },
                { x: 4.55, y: 1.15 },
              ])
            }
            onLoadDemoScanUnderlay={(uri) => {
              setReferenceImageUrl(uri || DEMO_PLOT_SCAN_DATA_URI);
              setToastBanner('Демо-скан спектра загружен как подложка под сетку холста.');
            }}
            onActivateDigitizerTool={() => {
              setActiveTab('studio');
              setCanvasMode('sketch');
              setActiveTool('digitize');
              setAdvModalOpen(false);
              setToastBanner('Режим оцифровки: кликайте точки экспериментальной кривой на холсте.');
            }}
            onCommitDigitizedCurve={handleCommitDigitizedCurve}
            onInsertAnalyticalPlot={handleInsertAnalyticalPlot}
            onInsertVectorField={handleInsertVectorField}
            hiddenLayers={hiddenLayers}
            lockedLayers={lockedLayers}
            onToggleHideLayer={handleToggleHideLayer}
            onToggleLockLayer={handleToggleLockLayer}
            onAssignLayerToSelection={handleAssignLayerToSelection}
            activeBeamerSlide={activeBeamerSlide}
            onChangeActiveBeamerSlide={setActiveBeamerSlide}
            onAssignBeamerSpecToSelection={handleAssignBeamerSpecToSelection}
            onNotify={(msg) => setToastBanner(msg)}
          />
        </Suspense>
      )}

      {notationsModalOpen && (
        <Suspense fallback={null}>
          <ScientificNotationsAndOutlinerModal
            open={notationsModalOpen}
            initialTab={notationsModalTab}
            onClose={() => setNotationsModalOpen(false)}
            source={source}
            ownedPrimitives={ownedPrimitives}
            selectedPrimitiveIds={
              selectedPrimitiveIds.length > 0
                ? selectedPrimitiveIds
                : selectedPrimitiveId !== null
                  ? [selectedPrimitiveId]
                  : []
            }
            journalWidthCm={
              JOURNAL_COLUMN_GAUGES.find((g) => g.id === journalGaugeId)?.widthCm || 8.8
            }
            hiddenLayers={hiddenLayers}
            lockedLayers={lockedLayers}
            copiedStylePassport={copiedStylePassport}
            onSampleStyleFromPrimitive={handleSampleStyleFromPrimitive}
            onApplyCopiedStyleToIds={handleApplyCopiedStyleToIds}
            onInsertNotationPreset={handleInsertNotationPreset}
            onInsert3dScene={handleInsert3dScene}
            onConstructFilletOrChamfer={handleConstructFilletOrChamfer}
            onInsertFillBetween={handleInsertFillBetween}
            onInsertSpyMagnifier={handleInsertSpyMagnifier}
            onInsertPositionalShelf={handleInsertPositionalShelf}
            onEditSpreadsheetCell={handleEditSpreadsheetCell}
            onSelectPrimitiveFromTable={(id) => {
              setSelectedPrimitiveId(id);
              setSelectedPrimitiveIds([id]);
            }}
            onJumpToLineFromTable={(ln) => {
              setActiveTab('studio');
              if (layoutFocus === 'focus-canvas') setLayoutFocus('tri-pane');
              setActiveLine(ln);
              setSearchBarOpen(true);
            }}
            onDeletePrimitiveFromTable={handleDeletePrimitive}
            onApplyVisualLintFix={handleApplyVisualLintFix}
            onExportTikzprojFile={handleExportTikzprojFile}
            onImportTikzprojJson={handleImportTikzprojJson}
            onNotify={(msg) => setToastBanner(msg)}
          />
        </Suspense>
      )}

      {formatterModalOpen && (
        <Suspense fallback={null}>
          <FormatterRefactorAndCadModal
            open={formatterModalOpen}
            initialTab={formatterModalTab}
            onClose={() => setFormatterModalOpen(false)}
            filename={filename}
            source={source}
            ownedPrimitives={ownedPrimitives}
            selectedPrimitiveIds={
              selectedPrimitiveIds.length > 0
                ? selectedPrimitiveIds
                : selectedPrimitiveId !== null
                  ? [selectedPrimitiveId]
                  : []
            }
            dataDependencies={activeSpecimenMeta.dataDependencies}
            formatOnSave={formatOnSave}
            onChangeFormatOnSave={setFormatOnSave}
            indentSpaces={indentSpaces}
            onChangeIndentSpaces={setIndentSpaces}
            onRunAutoFormat={handleRunAutoFormat}
            onConvertUnits={handleConvertUnits}
            onExtractStyleToTikzset={handleExtractStyleToTikzset}
            onCleanPreamble={handleCleanPreamble}
            onInsertOffsetContour={handleInsertOffsetContour}
            onInsertSpline={handleInsertSpline}
            onTrimOrExtendSegment={handleTrimOrExtendSegment}
            onInsertGostSupportComb={handleInsertGostSupportComb}
            onImportSvgMarkup={handleImportSvgMarkup}
            onInsertBooktabsTable={handleInsertBooktabsTable}
            onNotify={(msg) => setToastBanner(msg)}
          />
        </Suspense>
      )}

      {projectModalOpen && (
        <Suspense fallback={null}>
          <ArticleProjectModal
            open={projectModalOpen}
            initialTab={projectModalTab}
            onClose={() => setProjectModalOpen(false)}
            allDocuments={allDocuments}
            activeDocId={specimenId}
            onSelectDocument={handleSelectSpecimen}
            sharedStyleTikz={sharedStyleTikz}
            onChangeSharedStyleTikz={setSharedStyleTikz}
            onInjectSharedStyleCurrent={handleInjectSharedStyleCurrent}
            onInjectSharedStyleAll={handleInjectSharedStyleAll}
            onCreateCompositeSubfigureDoc={handleCreateCompositeSubfigureDoc}
            onNotify={(msg) => setToastBanner(msg)}
          />
        </Suspense>
      )}

      <StudioWorkshopsHubModal
        isOpen={workshopsHubOpen}
        initialTab={workshopsHubTab}
        initialExtensionId={workshopsHubExtensionId}
        onClose={() => setWorkshopsHubOpen(false)}
        source={source}
        selectedPrimitiveIds={
          selectedPrimitiveIds.length > 0
            ? selectedPrimitiveIds
            : selectedPrimitiveId !== null
              ? [selectedPrimitiveId]
              : []
        }
        revisions={history}
        pinnedIds={pinnedWorkshopIds}
        onTogglePinWorkshop={handleTogglePinWorkshop}
        onLaunchLegacyWorkshop={handleLaunchWorkshopTarget}
        onApplyNewSource={(nextSrc, summaryRu, selectIds) => {
          pushSourceChange(nextSrc, summaryRu);
          if (selectIds && selectIds.length > 0) {
            setSelectedPrimitiveIds(selectIds);
            setSelectedPrimitiveId(selectIds[0]);
          }
          setToastBanner(summaryRu);
        }}
        figureProfileId={effectiveFigureProfileId}
        onOpenManualAnchor={(anchorId) => handleOpenManualAnchor(anchorId, 'reader')}
      />

      <PdfManualAnchorModal
        isOpen={manualModalOpen}
        initialTab={manualModalTab}
        activeAnchorId={activeManualAnchorId}
        currentSource={source}
        onSelectAnchor={setActiveManualAnchorId}
        onInsertManualExample={handleInsertManualExample}
        onApplyAgentSnapshotToGui={handleApplyAgentSnapshotToGui}
        onOpenTauriBranchView={() => {
          setManualModalOpen(false);
          setActiveTab('tauri-v2');
        }}
        onClose={() => setManualModalOpen(false)}
      />

      <SaveAndBuildModal
        open={saveModalOpen}
        defaultFilename={filename}
        onClose={() => setSaveModalOpen(false)}
        onConfirmSaveAndBuild={() => {
          // A preview path field is not a disk write; choose the real path in the OS dialog.
          setSaveModalOpen(false);
          void handleSaveAndBuildClick();
        }}
      />

      <CommandPaletteModal
        open={cmdPaletteOpen}
        actions={commandPaletteActions}
        onClose={() => setCmdPaletteOpen(false)}
      />

      <DirtyDocumentGuardModal
        open={Boolean(pendingSpecimenMeta)}
        currentFilename={filename}
        targetTitleRu={pendingSpecimenMeta?.titleRu ?? ''}
        onCancel={() => setPendingSpecimenId(null)}
        onDiscardAndSwitch={() => {
          const next = pendingSpecimenId;
          setPendingSpecimenId(null);
          if (next) loadSpecimenNow(next);
        }}
        onSaveAndSwitch={async () => {
          if (!isTauriRuntime()) {
            setToastBanner('Browser preview не подтверждает запись на диск; переключение без сохранения отменено.');
            return;
          }
          if (saveInFlightRef.current) return;
          const next = pendingSpecimenId;
          const epoch = documentEpochRef.current;
          saveInFlightRef.current = true;
          try {
            const outcome = await saveThenContinue(source,
              () => tauriSaveTexDocument(source, nativeFilePath, filename),
              () => epoch === documentEpochRef.current && liveSourceRef.current.source === source &&
                liveSourceRef.current.revision === sourceRevision,
              (saved) => { setNativeFilePath(saved.path); setSavedRevision(sourceRevision); },
              async () => {
                setPendingSpecimenId(null);
                if (next) loadSpecimenNow(next);
                setToastBanner(`Файл ${filename} записан перед переключением документа.`);
              });
            if (outcome !== 'continued' && epoch === documentEpochRef.current)
              setToastBanner('Переключение остановлено: сохранение отменено или буфер уже изменился.');
          } catch (error) {
            if (epoch === documentEpochRef.current) setToastBanner(`Запись отклонена: ${String(error)}`);
          } finally { saveInFlightRef.current = false; }
        }}
      />
    </div>
  );
}
