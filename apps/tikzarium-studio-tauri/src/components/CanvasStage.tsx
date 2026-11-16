import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MousePointer,
  BoxSelect,
  Ruler,
  Minus,
  MoveUpRight,
  Square,
  Circle as CircleIcon,
  Type,
  Spline,
  FileCheck2,
  AlertTriangle,
  Layers,
  Eye,
  Play,
  Copy,
  Trash2,
  Grid3x3,
  ZoomIn,
  Maximize,
  Check,
  X,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  MoveHorizontal,
  RotateCw,
  FlipHorizontal2,
  Repeat,
  Compass,
  Unlink,
  Crosshair,
  Pentagon,
  ScanLine,
  EyeOff,
  Pipette,
  SlidersHorizontal,
  GitCompareArrows,
  Link2,
  Download,
} from 'lucide-react';
import { PRIMITIVE_TOOLS } from '../domain/catalog';
import type { ToolId } from '../domain/catalog';
import {
  ALLOWED_NODE_ANCHORS,
  computeGestureDraftPreview,
  parseDimensionToCm,
  parsePolyPointsList,
  snapCoordinateCm,
  translateOwnedPrimitiveCm,
} from '../domain/tikzEngine';
import type { OwnedPrimitive } from '../domain/tikzEngine';
import {
  applyHandleDragToValues,
  computeSmartSnap,
  findPrimitivesInMarquee,
  getPrimitiveHandles,
  resolveSmartConnectorEndpoints,
} from '../domain/ergonomicsBundle';
import type { AlignmentMode, SnapGuide } from '../domain/ergonomicsBundle';
import {
  JOURNAL_COLUMN_GAUGES,
  computeOrthogonalConnectorPointsCm,
} from '../domain/scientificCadBundle';
import type { ColorProofMode, JournalGaugeId } from '../domain/scientificCadBundle';
import {
  buildSvgDecorationPath,
  isBeamerSpecVisibleOnSlide,
  resolveEffectiveLayer,
} from '../domain/advancedCadBundle';
import type { CadLayerId } from '../domain/advancedCadBundle';
import {
  RADIAL_PIE_SECTORS,
  buildAnnularSectorSvgPath,
  parseCornerRadiusPx,
  parseLatexToDisplayRuns,
} from '../domain/scientificNotationsAndAuditBundle';
import type { StylePassport } from '../domain/scientificNotationsAndAuditBundle';
import {
  computeThreePointArcGeometry,
  expandSelectionWithGroups,
  getPolyEdgeMidpoints,
  snapPointByGridMode,
} from '../domain/workspaceAndEngineeringStageBundle';
import type {
  CanvasGridMode,
  VisualPrimitiveDiffReport,
} from '../domain/workspaceAndEngineeringStageBundle';
import { ATOMIC_FIGURE_PROFILES } from '../domain/atomicFigureProfile';
import type {
  AtomicFigureProfileId,
  ContextualRailToolId,
} from '../domain/atomicFigureProfile';
import { PACKAGE_CANVAS_TOOLS } from '../domain/packageCanvasSemantics';
import type {
  PackageCanvasToolSpec,
  PackageToolId,
  RecognizedPackageObject,
} from '../domain/packageCanvasSemantics';
import type { PdfUnderlayRenderResponse } from '../domain/sourcePatchEngine';
import {
  PACKAGE_FAMILY_META,
  PACKAGE_TOOL_TECH_BADGE,
  PackageSchematicIcon,
} from './PackageSchematicIcon';
import type { CompositeCanvasLayersState } from './InspectorAndHelpPane';

export type ActiveCanvasTool =
  | ToolId
  | PackageToolId
  | 'select'
  | 'marquee'
  | 'measure'
  | 'callout'
  | 'polygon'
  | 'arc3'
  | 'digitize'
  | 'eyedropper';
export type CanvasMode = 'sketch' | 'pdf' | 'split' | 'onion';
export type GridSnapCm = 0.25 | 0.1 | 0;
export type StageBoundsPresetId = 'standard' | 'symmetric' | 'wide';

interface StageBoundsSpec {
  id: StageBoundsPresetId;
  labelRu: string;
  minXCm: number;
  maxXCm: number;
  minYCm: number;
  maxYCm: number;
}

const STAGE_BOUNDS_PRESETS: StageBoundsSpec[] = [
  { id: 'standard', labelRu: '0..6.2×3.8см', minXCm: 0, maxXCm: 6.2, minYCm: 0, maxYCm: 3.8 },
  { id: 'symmetric', labelRu: '±3.1×±1.9см (0,0)', minXCm: -3.1, maxXCm: 3.1, minYCm: -1.9, maxYCm: 1.9 },
  { id: 'wide', labelRu: '0..9.0×5.2см', minXCm: 0, maxXCm: 9.0, minYCm: 0, maxYCm: 5.2 },
];

interface CanvasStageProps {
  activeTool: ActiveCanvasTool;
  onSelectTool: (tool: ActiveCanvasTool) => void;
  canvasMode: CanvasMode;
  onChangeCanvasMode: (mode: CanvasMode) => void;
  ownedPrimitives: OwnedPrimitive[];
  selectedPrimitiveId: number | null;
  selectedPrimitiveIds: number[];
  onSelectPrimitive: (id: number | null, toggleMulti?: boolean) => void;
  onSelectMultiplePrimitives: (ids: number[]) => void;
  hoveredPrimitiveId: number | null;
  onHoverPrimitive: (id: number | null) => void;
  onCreatePrimitiveFromGesture: (
    tool: ToolId,
    startCm: { x: number; y: number },
    endCm: { x: number; y: number },
    constrainShift?: boolean,
    smartBind?: { fromNodeId?: string; toNodeId?: string }
  ) => void;
  onApplyPrimitivePatch: (primitiveId: number, nextValues: Record<string, string>, labelRu?: string) => void;
  onMovePrimitivesCm: (primitiveIds: number[], dxCm: number, dyCm: number) => void;
  onAlignSelected: (mode: AlignmentMode) => void;
  onDeleteSelectedPrimitives: () => void;
  onDuplicatePrimitive: (primitiveId: number) => void;
  onDeletePrimitive: (primitiveId: number) => void;
  onCreateCalloutFromGesture: (startCm: { x: number; y: number }, endCm: { x: number; y: number }) => void;
  onToggleCalloutOnPrimitive: (primitiveId: number) => void;
  onRotatePrimitives: (primitiveIds: number[], angleDeg: number) => void;
  onMirrorPrimitives: (primitiveIds: number[], axis: 'x' | 'y') => void;
  onDetachPrimitive: (primitiveId: number) => void;
  onQuickInsertStampAt: (stampId: string, xCm: number, yCm: number) => void;
  onOpenCadModal: (tab: 'stamps' | 'foreach' | 'pgfplots' | 'journal-palette') => void;
  onCreatePolygonFromGesture: (
    pointsCm: { xCm: number; yCm: number }[],
    closed: boolean
  ) => void;
  digitizerPointsCm: { x: number; y: number }[];
  onPickDigitizerPoint: (ptCm: { x: number; y: number }) => void;
  hiddenLayers: CadLayerId[];
  lockedLayers: CadLayerId[];
  onToggleHideLayer: (layerId: CadLayerId) => void;
  onToggleLockLayer: (layerId: CadLayerId) => void;
  activeBeamerSlide: number | null;
  onChangeActiveBeamerSlide: (slide: number | null) => void;
  journalGaugeId: JournalGaugeId;
  onChangeJournalGaugeId: (id: JournalGaugeId) => void;
  colorProofMode: ColorProofMode;
  onChangeColorProofMode: (mode: ColorProofMode) => void;
  onSyncTexJump: (clickCm: { x: number; y: number }) => void;
  referenceImageUrl: string | null;
  onClearReferenceImage: () => void;
  sourceRevision: number;
  pdfState: {
    status: 'absent' | 'current' | 'stale';
    builtRevision: number | null;
    builtAt: string | null;
    lastGoodPrimitives: OwnedPrimitive[];
    hasCustomNodesNote: string | null;
  };
  onTriggerBuild: () => void;
  highlightedZone: boolean;
  copiedStylePassport?: StylePassport | null;
  onEyedropperClickPrimitive?: (primitiveId: number, forceSample: boolean) => void;
  onOpenOutlinerTable?: () => void;
  onInsertPolyVertexAtEdge?: (primitiveId: number, edgeIndex: number) => void;
  onDeletePolyVertexAtIndex?: (primitiveId: number, vertexIndex: number) => void;
  onTogglePolyClosed?: (primitiveId: number) => void;
  onCreateThreePointArc?: (
    p1: { x: number; y: number },
    pMid: { x: number; y: number },
    p2: { x: number; y: number }
  ) => void;
  onGroupSelected?: () => void;
  onUngroupSelected?: () => void;
  visualDiffReport?: VisualPrimitiveDiffReport | null;
  onRevertSinglePrimitiveFromDiff?: (primitiveId: number) => void;
  figureProfileId?: AtomicFigureProfileId;
  isBeamerActive?: boolean;
  onOpenProfileWorkshop?: () => void;
  packageObjects?: RecognizedPackageObject[];
  selectedPackageObjectId?: string | null;
  onSelectPackageObject?: (objectId: string | null) => void;
  onCreatePackageObjectFromGesture?: (
    toolId: PackageToolId,
    startCm: { x: number; y: number },
    endCm: { x: number; y: number }
  ) => void;
  onMovePackageObjectCm?: (objectId: string, dxCm: number, dyCm: number) => void;
  onDeletePackageObject?: (objectId: string) => void;
  pdfUnderlay?: {
    enabled: boolean;
    loading: boolean;
    opacity: number;
    response: PdfUnderlayRenderResponse | null;
  };
  onTogglePdfUnderlay?: () => void;
  onChangePdfUnderlayOpacity?: (opacity: number) => void;
  onDownloadRenderedPdf?: () => void;
  onStageBoundsChange?: (bounds: {
    minXCm: number;
    maxXCm: number;
    minYCm: number;
    maxYCm: number;
  }) => void;
  compositeLayers?: CompositeCanvasLayersState;
  onChangeCompositeLayers?: (patch: Partial<CompositeCanvasLayersState>) => void;
  onOpenLayersObjectsDock?: () => void;
}

const TOOL_ICONS: Record<ToolId, React.ComponentType<{ className?: string }>> = {
  line: Minus,
  arrow: MoveUpRight,
  rectangle: Square,
  circle: CircleIcon,
  node: Type,
  cubic: Spline,
};

const PX_PER_CM = 100;

function resolveStrokeColorHex(rawColor: string | undefined, defaultColor: string): string {
  switch (rawColor) {
    case 'blue!75!black':
      return '#1d4ed8';
    case 'red!75!black':
      return '#b91c1c';
    case 'teal!80!black':
      return '#0f766e';
    case 'orange!85!black':
      return '#c2410c';
    case 'violet!80!black':
      return '#6d28d9';
    case 'oiBlue':
      return '#0072B2';
    case 'oiVermilion':
      return '#D55E00';
    case 'oiBluishGreen':
      return '#009E73';
    case 'oiOrange':
      return '#E69F00';
    case 'oiPurple':
      return '#CC79A7';
    case 'oiSkyBlue':
      return '#56B4E9';
    case 'black':
      return '#0f172a';
    default:
      return defaultColor;
  }
}

function resolveFillColorRgba(rawFill: string | undefined, isSelected: boolean): string {
  switch (rawFill) {
    case 'cyan!10':
      return 'rgba(6, 182, 212, 0.18)';
    case 'blue!8':
      return 'rgba(37, 99, 235, 0.14)';
    case 'emerald!10':
      return 'rgba(16, 185, 129, 0.16)';
    case 'amber!14':
      return 'rgba(245, 158, 11, 0.20)';
    case 'rose!10':
      return 'rgba(244, 63, 94, 0.16)';
    case 'slate!12':
      return 'rgba(100, 116, 139, 0.18)';
    case 'oiBlue!12':
      return 'rgba(0, 114, 178, 0.16)';
    case 'oiVermilion!12':
      return 'rgba(213, 94, 0, 0.16)';
    case 'oiBluishGreen!12':
      return 'rgba(0, 158, 115, 0.16)';
    case 'oiOrange!14':
      return 'rgba(230, 159, 0, 0.20)';
    case 'none':
      return 'none';
    default:
      return isSelected ? 'rgba(2, 132, 199, 0.08)' : 'rgba(148, 163, 184, 0.03)';
  }
}

function resolveStrokeWidthPx(rawWidth: string | undefined, base: number): number {
  switch (rawWidth) {
    case 'thin':
      return Math.max(1.1, base - 0.6);
    case 'semithick':
      return base;
    case 'thick':
      return base + 0.85;
    case 'very thick':
      return base + 1.8;
    default:
      return base;
  }
}

function resolveDashArray(rawStyle: string | undefined): string | undefined {
  if (rawStyle === 'dashed') return '7 4';
  if (rawStyle === 'dotted') return '2.2 3.2';
  return undefined;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  activeTool,
  onSelectTool,
  canvasMode,
  onChangeCanvasMode,
  ownedPrimitives,
  selectedPrimitiveId,
  selectedPrimitiveIds,
  onSelectPrimitive,
  onSelectMultiplePrimitives,
  hoveredPrimitiveId,
  onHoverPrimitive,
  onCreatePrimitiveFromGesture,
  onApplyPrimitivePatch,
  onMovePrimitivesCm,
  onAlignSelected,
  onDeleteSelectedPrimitives,
  onDuplicatePrimitive,
  onDeletePrimitive,
  onCreateCalloutFromGesture,
  onToggleCalloutOnPrimitive,
  onRotatePrimitives,
  onMirrorPrimitives,
  onDetachPrimitive,
  onQuickInsertStampAt,
  onOpenCadModal,
  onCreatePolygonFromGesture,
  digitizerPointsCm,
  onPickDigitizerPoint,
  hiddenLayers,
  lockedLayers,
  activeBeamerSlide,
  onChangeActiveBeamerSlide,
  journalGaugeId,
  onChangeJournalGaugeId,
  colorProofMode,
  onChangeColorProofMode,
  onSyncTexJump,
  referenceImageUrl,
  sourceRevision,
  pdfState,
  onTriggerBuild,
  highlightedZone,
  copiedStylePassport,
  onEyedropperClickPrimitive,
  onInsertPolyVertexAtEdge,
  onDeletePolyVertexAtIndex,
  onTogglePolyClosed,
  onCreateThreePointArc,
  onGroupSelected,
  onUngroupSelected,
  visualDiffReport,
  onRevertSinglePrimitiveFromDiff,
  figureProfileId = 'core-geometry',
  isBeamerActive = false,
  onOpenProfileWorkshop,
  packageObjects = [],
  selectedPackageObjectId = null,
  onSelectPackageObject,
  onCreatePackageObjectFromGesture,
  onMovePackageObjectCm,
  onDeletePackageObject,
  pdfUnderlay,
  onTogglePdfUnderlay,
  onChangePdfUnderlayOpacity,
  onDownloadRenderedPdf,
  onStageBoundsChange,
  compositeLayers = {
    vectorVisible: true,
    vectorOpacity: 1,
    referenceVisible: true,
    referenceOpacity: 0.38,
    gridVisible: true,
    gridOpacity: 1,
  },
  onChangeCompositeLayers,
  onOpenLayersObjectsDock,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pdfSvgRef = useRef<SVGSVGElement | null>(null);
  const viewPopoverContainerRef = useRef<HTMLDivElement | null>(null);
  const [cursorCm, setCursorCm] = useState<{
    x: number;
    y: number;
    polarRadiusCm?: number;
    polarAngleDeg?: number;
  }>({ x: 0, y: 0 });
  const [gridSnap, setGridSnap] = useState<GridSnapCm>(0.1);
  const [gridMode, setGridMode] = useState<CanvasGridMode>('cartesian');
  const [smartSnapEnabled, setSmartSnapEnabled] = useState<boolean>(true);
  const [boundsPresetId, setBoundsPresetId] = useState<StageBoundsPresetId>('standard');
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [panOffsetSvg, setPanOffsetSvg] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [onionOpacity, setOnionOpacity] = useState<0.3 | 0.55 | 0.8>(0.55);
  const [isCanvasHovered, setIsCanvasHovered] = useState<boolean>(false);
  const [spaceHeld, setSpaceHeld] = useState<boolean>(false);
  const [shiftHeld, setShiftHeld] = useState<boolean>(false);
  const [viewPopoverOpen, setViewPopoverOpen] = useState<boolean>(false);
  const [showVisualDiffOverlay, setShowVisualDiffOverlay] = useState<boolean>(false);
  const [showAllRailTools, setShowAllRailTools] = useState<boolean>(false);
  const [pkgFamilyId, setPkgFamilyId] = useState<PackageCanvasToolSpec['familyId']>('pgfplots');
  const [pkgMoveDrag, setPkgMoveDrag] = useState<{
    objectId: string;
    originCm: { x: number; y: number };
    deltaCm: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (figureProfileId === 'plots-stats') setPkgFamilyId('pgfplots');
    else if (figureProfileId === 'circuits-control') setPkgFamilyId('circuitikz');
    else if (figureProfileId === 'optics-mechanics') setPkgFamilyId('physics-optics');
    else if (figureProfileId === 'flowchart-graphs') setPkgFamilyId('automata');
    else if (figureProfileId === 'core-geometry') setPkgFamilyId('tikz-clean');
  }, [figureProfileId]);

  useEffect(() => {
    if (!viewPopoverOpen) return;
    const handlePointerDownOutside = (ev: MouseEvent) => {
      if (
        viewPopoverContainerRef.current &&
        !viewPopoverContainerRef.current.contains(ev.target as Node)
      ) {
        setViewPopoverOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDownOutside);
    return () => window.removeEventListener('mousedown', handlePointerDownOutside);
  }, [viewPopoverOpen]);

  const activeProfileSpec = useMemo(
    () =>
      ATOMIC_FIGURE_PROFILES.find((p) => p.id === figureProfileId) ??
      ATOMIC_FIGURE_PROFILES[0],
    [figureProfileId]
  );

  const isContextualToolVisible = (toolId: ContextualRailToolId): boolean =>
    showAllRailTools ||
    activeTool === toolId ||
    activeProfileSpec.contextualRailTools.includes(toolId);

  // Gesture states: drawing, marquee, measure, pan, move, or handle-drag
  const [dragStart, setDragStart] = useState<{ x: number; y: number; startNodeId?: string } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number; endNodeId?: string } | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null);
  const [measureRay, setMeasureRay] = useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null);
  const [panDrag, setPanDrag] = useState<{
    startClientX: number;
    startClientY: number;
    origPan: { x: number; y: number };
  } | null>(null);
  const [moveDrag, setMoveDrag] = useState<{
    ids: number[];
    originCm: { x: number; y: number };
    deltaCm: { x: number; y: number };
  } | null>(null);
  const [handleDrag, setHandleDrag] = useState<{
    primitiveId: number;
    handleId: string;
    currentValues: Record<string, string>;
    snappedNodeId?: string;
  } | null>(null);
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);
  const [polyDraftPts, setPolyDraftPts] = useState<{ xCm: number; yCm: number }[]>([]);
  const [arc3DraftPts, setArc3DraftPts] = useState<{ x: number; y: number }[]>([]);

  // P34 + P60: Native egui Radial Pie-Menu + Context List inside SVG (zero inline styles)
  const [contextMenu, setContextMenu] = useState<{
    svgX: number;
    svgY: number;
    clickCm: { x: number; y: number };
    primitiveId: number | null;
    mode: 'pie' | 'list';
  } | null>(null);

  // P08: Inline quick node editor bar on double-click
  const [inlineNodeEdit, setInlineNodeEdit] = useState<{
    primitiveId: number;
    content: string;
    mode: 'math' | 'text';
    anchor: string;
    nodeId: string;
  } | null>(null);

  // Auto-expand sheet to wide (0..9.0cm) when 86mm IEEE column gauge is turned on
  useEffect(() => {
    if (journalGaugeId === 'ieee-1col' && boundsPresetId === 'standard') {
      setBoundsPresetId('wide');
      setPanOffsetSvg({ x: 0, y: 0 });
    }
  }, [boundsPresetId, journalGaugeId]);

  const activeJournalGauge = useMemo(
    () => JOURNAL_COLUMN_GAUGES.find((g) => g.id === journalGaugeId) ?? JOURNAL_COLUMN_GAUGES[0],
    [journalGaugeId]
  );

  const stageBounds = useMemo(
    () => STAGE_BOUNDS_PRESETS.find((b) => b.id === boundsPresetId) ?? STAGE_BOUNDS_PRESETS[0],
    [boundsPresetId]
  );

  useEffect(() => {
    onStageBoundsChange?.({
      minXCm: stageBounds.minXCm,
      maxXCm: stageBounds.maxXCm,
      minYCm: stageBounds.minYCm,
      maxYCm: stageBounds.maxYCm,
    });
  }, [onStageBoundsChange, stageBounds]);

  const baseW = (stageBounds.maxXCm - stageBounds.minXCm) * PX_PER_CM;
  const baseH = (stageBounds.maxYCm - stageBounds.minYCm) * PX_PER_CM;
  const zoomFactor = Math.max(0.5, Math.min(2.2, zoomPercent / 100));
  const vbW = +(baseW / zoomFactor).toFixed(1);
  const vbH = +(baseH / zoomFactor).toFixed(1);
  const vbX = +((baseW - vbW) / 2 + panOffsetSvg.x).toFixed(1);
  const vbY = +((baseH - vbH) / 2 + panOffsetSvg.y).toFixed(1);

  const cmToSvgX = (cm: number): number =>
    Math.round((cm - stageBounds.minXCm) * PX_PER_CM * 10) / 10;

  const cmToSvgY = (cm: number): number =>
    Math.round((stageBounds.maxYCm - cm) * PX_PER_CM * 10) / 10;

  // Global keyboard modifiers for Space+drag pan & Escape gesture cancel
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (ev.code === 'Space' && !inInput && isCanvasHovered) {
        ev.preventDefault();
        setSpaceHeld(true);
      }
      if (ev.key === 'Shift') setShiftHeld(true);
      if (ev.key === 'Escape') {
        setDragStart(null);
        setDragCurrent(null);
        setMarqueeBox(null);
        setMeasureRay(null);
        setMoveDrag(null);
        setHandleDrag(null);
        setActiveGuides([]);
        setInlineNodeEdit(null);
        setContextMenu(null);
        setPolyDraftPts([]);
        setArc3DraftPts([]);
        setPkgMoveDrag(null);
        setViewPopoverOpen(false);
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.code === 'Space') setSpaceHeld(false);
      if (ev.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isCanvasHovered]);

  const isPackageCanvasTool = (t: ActiveCanvasTool): t is PackageToolId =>
    typeof t === 'string' && t.startsWith('pkg:');

  const isDrawingPrimitiveTool = (t: ActiveCanvasTool): t is ToolId =>
    !isPackageCanvasTool(t) &&
    t !== 'select' &&
    t !== 'marquee' &&
    t !== 'measure' &&
    t !== 'callout' &&
    t !== 'polygon' &&
    t !== 'arc3' &&
    t !== 'digitize' &&
    t !== 'eyedropper';

  const draftPreview = useMemo(() => {
    if (activeTool === 'callout' && dragStart && dragCurrent) {
      return computeGestureDraftPreview('line', dragStart, dragCurrent, {
        constrainShift: shiftHeld,
        forCommit: false,
        stageWidthCm: stageBounds.maxXCm,
        stageHeightCm: stageBounds.maxYCm,
      });
    }
    if (!isDrawingPrimitiveTool(activeTool)) return null;
    if (dragStart && dragCurrent) {
      return computeGestureDraftPreview(activeTool, dragStart, dragCurrent, {
        constrainShift: shiftHeld,
        forCommit: false,
        stageWidthCm: stageBounds.maxXCm,
        stageHeightCm: stageBounds.maxYCm,
      });
    }
    if (activeTool === 'node' && isCanvasHovered && !spaceHeld) {
      return computeGestureDraftPreview('node', cursorCm, cursorCm, {
        constrainShift: false,
        forCommit: false,
        stageWidthCm: stageBounds.maxXCm,
        stageHeightCm: stageBounds.maxYCm,
      });
    }
    return null;
  }, [activeTool, cursorCm, dragCurrent, dragStart, isCanvasHovered, shiftHeld, spaceHeld, stageBounds]);

  const gridOriginCm = useMemo(
    () => ({
      x: +((stageBounds.minXCm + stageBounds.maxXCm) / 2).toFixed(2),
      y: +((stageBounds.minYCm + stageBounds.maxYCm) / 2).toFixed(2),
    }),
    [stageBounds]
  );

  const clientToCm = (
    clientX: number,
    clientY: number,
    applyGridSnap = true
  ): { x: number; y: number; polarRadiusCm?: number; polarAngleDeg?: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 1, y: 1 };
    const rect = svg.getBoundingClientRect();
    const normX = (clientX - rect.left) / Math.max(1, rect.width);
    const normY = (clientY - rect.top) / Math.max(1, rect.height);
    const svgX = vbX + normX * vbW;
    const svgY = vbY + normY * vbH;
    const rawX = stageBounds.minXCm + svgX / PX_PER_CM;
    const rawY = stageBounds.maxYCm - svgY / PX_PER_CM;
    const clampedX = Math.max(stageBounds.minXCm, Math.min(stageBounds.maxXCm, rawX));
    const clampedY = Math.max(stageBounds.minYCm, Math.min(stageBounds.maxYCm, rawY));
    const snapped = snapPointByGridMode(
      { x: clampedX, y: clampedY },
      gridMode,
      applyGridSnap ? gridSnap : 0,
      gridOriginCm
    );
    return {
      x: Math.max(stageBounds.minXCm, Math.min(stageBounds.maxXCm, snapped.x)),
      y: Math.max(stageBounds.minYCm, Math.min(stageBounds.maxYCm, snapped.y)),
      polarRadiusCm: snapped.polarRadiusCm,
      polarAngleDeg: snapped.polarAngleDeg,
    };
  };

  const resolvePointWithSmartSnap = (
    clientX: number,
    clientY: number,
    excludeIds: number[] = []
  ): { pt: { x: number; y: number }; guides: SnapGuide[]; snappedNodeId?: string } => {
    const gridPt = clientToCm(clientX, clientY, true);
    if (!smartSnapEnabled) {
      return { pt: gridPt, guides: [] };
    }
    const rawPt = clientToCm(clientX, clientY, false);
    const smart = computeSmartSnap(rawPt, ownedPrimitives, excludeIds, 0.13);
    return {
      pt: {
        x: smart.guides.some((g) => g.axis === 'x') ? smart.snappedCm.x : gridPt.x,
        y: smart.guides.some((g) => g.axis === 'y') ? smart.snappedCm.y : gridPt.y,
      },
      guides: smart.guides,
      snappedNodeId: smart.snappedNodeId,
    };
  };

  const handleWheelZoom = (e: React.WheelEvent<SVGSVGElement>) => {
    if (!e.ctrlKey && !e.metaKey && !e.altKey && Math.abs(e.deltaY) < 4) return;
    e.preventDefault();
    const step = e.deltaY < 0 ? 15 : -15;
    setZoomPercent((prev) => Math.max(50, Math.min(200, prev + step)));
  };

  const handleFitView = () => {
    setZoomPercent(100);
    setPanOffsetSvg({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Ignore right-click in pointerDown (handled by onContextMenu P34/P60)
    if (e.button === 2) return;
    if (contextMenu) {
      if (
        (e.target as Element | null)?.closest(
          '[data-testid="canvas-context-menu"], [data-testid="canvas-radial-pie-menu"]'
        )
      ) {
        return;
      }
      setContextMenu(null);
    }

    // P04: Middle button or Space+drag initiates smooth viewport pan
    if (e.button === 1 || spaceHeld) {
      e.preventDefault();
      setPanDrag({
        startClientX: e.clientX,
        startClientY: e.clientY,
        origPan: { ...panOffsetSvg },
      });
      return;
    }

    if (activeTool === 'eyedropper') {
      return;
    }

    if (activeTool === 'digitize') {
      const pt = clientToCm(e.clientX, e.clientY, false);
      onPickDigitizerPoint(pt);
      return;
    }

    if (activeTool === 'arc3') {
      const { pt, guides } = resolvePointWithSmartSnap(e.clientX, e.clientY);
      setActiveGuides(guides);
      if (arc3DraftPts.length < 2) {
        setArc3DraftPts((prev) => [...prev, { x: pt.x, y: pt.y }]);
      } else {
        onCreateThreePointArc?.(arc3DraftPts[0], arc3DraftPts[1], { x: pt.x, y: pt.y });
        setArc3DraftPts([]);
      }
      return;
    }

    if (activeTool === 'polygon') {
      const { pt, guides } = resolvePointWithSmartSnap(e.clientX, e.clientY);
      setActiveGuides(guides);
      if (polyDraftPts.length >= 3) {
        const first = polyDraftPts[0];
        if (Math.hypot(pt.x - first.xCm, pt.y - first.yCm) <= 0.24) {
          onCreatePolygonFromGesture(polyDraftPts, true);
          setPolyDraftPts([]);
          return;
        }
      }
      setPolyDraftPts((prev) => [...prev, { xCm: pt.x, yCm: pt.y }]);
      return;
    }

    if (activeTool === 'marquee') {
      const pt = clientToCm(e.clientX, e.clientY, false);
      setMarqueeBox({ a: pt, b: pt });
      return;
    }

    if (activeTool === 'measure') {
      const { pt, guides } = resolvePointWithSmartSnap(e.clientX, e.clientY);
      setActiveGuides(guides);
      setMeasureRay({ a: pt, b: pt });
      return;
    }

    if (activeTool === 'select') {
      if (e.target === svgRef.current || (e.target as Element).getAttribute('data-bg-surface') === 'true') {
        if (!e.shiftKey) {
          onSelectPrimitive(null);
          onSelectPackageObject?.(null);
        }
        // Dragging on empty canvas in select mode starts marquee lasso (P03)!
        const pt = clientToCm(e.clientX, e.clientY, false);
        setMarqueeBox({ a: pt, b: pt });
      }
      return;
    }

    setShiftHeld(e.shiftKey);
    const { pt, guides, snappedNodeId } = resolvePointWithSmartSnap(e.clientX, e.clientY);
    setActiveGuides(guides);
    setDragStart({ ...pt, startNodeId: snappedNodeId });
    setDragCurrent({ ...pt, endNodeId: snappedNodeId });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    setShiftHeld(e.shiftKey);

    if (panDrag && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const dxSvg = ((panDrag.startClientX - e.clientX) / Math.max(1, rect.width)) * vbW;
      const dySvg = ((panDrag.startClientY - e.clientY) / Math.max(1, rect.height)) * vbH;
      setPanOffsetSvg({
        x: Math.max(-baseW * 0.6, Math.min(baseW * 0.6, panDrag.origPan.x + dxSvg)),
        y: Math.max(-baseH * 0.6, Math.min(baseH * 0.6, panDrag.origPan.y + dySvg)),
      });
      return;
    }

    if (handleDrag) {
      const target = ownedPrimitives.find((p) => p.id === handleDrag.primitiveId);
      if (target) {
        const { pt, guides, snappedNodeId } = resolvePointWithSmartSnap(e.clientX, e.clientY, [target.id]);
        setCursorCm(pt);
        setActiveGuides(guides);
        const nextVals = applyHandleDragToValues(target, handleDrag.handleId, pt, 0);
        if ((target.tool === 'arrow' || target.tool === 'line') && snappedNodeId) {
          if (handleDrag.handleId === 'start') nextVals.from_node = snappedNodeId;
          if (handleDrag.handleId === 'end') nextVals.to_node = snappedNodeId;
        }
        setHandleDrag({
          ...handleDrag,
          currentValues: nextVals,
          snappedNodeId,
        });
      }
      return;
    }

    if (pkgMoveDrag) {
      const { pt, guides } = resolvePointWithSmartSnap(e.clientX, e.clientY);
      setCursorCm(pt);
      setActiveGuides(guides);
      const dx = snapCoordinateCm(pt.x - pkgMoveDrag.originCm.x, gridSnap);
      const dy = snapCoordinateCm(pt.y - pkgMoveDrag.originCm.y, gridSnap);
      setPkgMoveDrag((prev) => (prev ? { ...prev, deltaCm: { x: dx, y: dy } } : null));
      return;
    }

    if (moveDrag) {
      const { pt, guides } = resolvePointWithSmartSnap(e.clientX, e.clientY, moveDrag.ids);
      setCursorCm(pt);
      setActiveGuides(guides);
      const dx = snapCoordinateCm(pt.x - moveDrag.originCm.x, gridSnap);
      const dy = snapCoordinateCm(pt.y - moveDrag.originCm.y, gridSnap);
      setMoveDrag((prev) => (prev ? { ...prev, deltaCm: { x: dx, y: dy } } : null));
      return;
    }

    if (marqueeBox) {
      const pt = clientToCm(e.clientX, e.clientY, false);
      setCursorCm(pt);
      setMarqueeBox((prev) => (prev ? { ...prev, b: pt } : null));
      return;
    }

    if (measureRay) {
      const { pt, guides } = resolvePointWithSmartSnap(e.clientX, e.clientY);
      setCursorCm(pt);
      setActiveGuides(guides);
      setMeasureRay((prev) => (prev ? { ...prev, b: pt } : null));
      return;
    }

    if (dragStart) {
      const { pt, guides, snappedNodeId } = resolvePointWithSmartSnap(e.clientX, e.clientY);
      setCursorCm(pt);
      setActiveGuides(guides);
      setDragCurrent({ ...pt, endNodeId: snappedNodeId });
      return;
    }

    const pt = clientToCm(e.clientX, e.clientY, true);
    setCursorCm(pt);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setActiveGuides([]);

    if (panDrag) {
      setPanDrag(null);
      return;
    }

    if (handleDrag) {
      onApplyPrimitivePatch(
        handleDrag.primitiveId,
        handleDrag.currentValues,
        `Изменён узел/ручка «${handleDrag.handleId}» у #${handleDrag.primitiveId}`
      );
      setHandleDrag(null);
      return;
    }

    if (pkgMoveDrag) {
      if (Math.abs(pkgMoveDrag.deltaCm.x) >= 0.01 || Math.abs(pkgMoveDrag.deltaCm.y) >= 0.01) {
        onMovePackageObjectCm?.(
          pkgMoveDrag.objectId,
          pkgMoveDrag.deltaCm.x,
          pkgMoveDrag.deltaCm.y
        );
      }
      setPkgMoveDrag(null);
      return;
    }

    if (moveDrag) {
      if (Math.abs(moveDrag.deltaCm.x) >= 0.01 || Math.abs(moveDrag.deltaCm.y) >= 0.01) {
        onMovePrimitivesCm(moveDrag.ids, moveDrag.deltaCm.x, moveDrag.deltaCm.y);
      }
      setMoveDrag(null);
      return;
    }

    if (marqueeBox) {
      const dx = Math.abs(marqueeBox.b.x - marqueeBox.a.x);
      const dy = Math.abs(marqueeBox.b.y - marqueeBox.a.y);
      if (dx > 0.08 || dy > 0.08) {
        const selectablePool = ownedPrimitives.filter((p) => {
          const lid = resolveEffectiveLayer(p);
          return (
            !hiddenLayers.includes(lid) &&
            !lockedLayers.includes(lid) &&
            isBeamerSpecVisibleOnSlide(p.values.beamer_spec, activeBeamerSlide)
          );
        });
        const hitIds = findPrimitivesInMarquee(selectablePool, marqueeBox.a, marqueeBox.b);
        onSelectMultiplePrimitives(hitIds);
      }
      setMarqueeBox(null);
      return;
    }

    if (measureRay) {
      // Keep measurement visible until next click or Escape, or clear if tiny click
      if (Math.hypot(measureRay.b.x - measureRay.a.x, measureRay.b.y - measureRay.a.y) < 0.05) {
        setMeasureRay(null);
      }
      return;
    }

    if (dragStart && dragCurrent && activeTool === 'callout') {
      onCreateCalloutFromGesture(
        { x: dragStart.x, y: dragStart.y },
        { x: dragCurrent.x, y: dragCurrent.y }
      );
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    if (dragStart && dragCurrent && isPackageCanvasTool(activeTool)) {
      onCreatePackageObjectFromGesture?.(
        activeTool,
        { x: dragStart.x, y: dragStart.y },
        { x: dragCurrent.x, y: dragCurrent.y }
      );
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    if (dragStart && dragCurrent && isDrawingPrimitiveTool(activeTool)) {
      const smartBind =
        (activeTool === 'arrow' || activeTool === 'line') &&
        (dragStart.startNodeId || dragCurrent.endNodeId) &&
        dragStart.startNodeId !== dragCurrent.endNodeId
          ? { fromNodeId: dragStart.startNodeId, toNodeId: dragCurrent.endNodeId }
          : undefined;
      onCreatePrimitiveFromGesture(
        activeTool,
        { x: dragStart.x, y: dragStart.y },
        { x: dragCurrent.x, y: dragCurrent.y },
        e.shiftKey,
        smartBind
      );
    }
    setDragStart(null);
    setDragCurrent(null);
  };

  const handleCanvasContextMenu = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / Math.max(1, rect.width);
    const normY = (e.clientY - rect.top) / Math.max(1, rect.height);
    const rawSvgX = vbX + normX * vbW;
    const rawSvgY = vbY + normY * vbH;
    const clampedSvgX = Math.max(vbX + 4, Math.min(vbX + vbW - 252, rawSvgX));
    const clampedSvgY = Math.max(vbY + 4, Math.min(vbY + vbH - 268, rawSvgY));
    const clickCm = clientToCm(e.clientX, e.clientY, true);

    const primEl = (e.target as Element | null)?.closest('[data-primitive-id]');
    const hitId = primEl ? Number(primEl.getAttribute('data-primitive-id')) : null;
    const pieMode: 'pie' | 'list' = e.shiftKey ? 'list' : 'pie';
    const pieClampedX = Math.max(vbX + 86, Math.min(vbX + vbW - 86, rawSvgX));
    const pieClampedY = Math.max(vbY + 86, Math.min(vbY + vbH - 86, rawSvgY));
    const finalX = pieMode === 'pie' ? pieClampedX : clampedSvgX;
    const finalY = pieMode === 'pie' ? pieClampedY : clampedSvgY;

    if (hitId !== null && Number.isFinite(hitId)) {
      if (!selectedPrimitiveIds.includes(hitId)) {
        onSelectPrimitive(hitId, false);
      }
      setContextMenu({ svgX: finalX, svgY: finalY, clickCm, primitiveId: hitId, mode: pieMode });
    } else {
      setContextMenu({ svgX: finalX, svgY: finalY, clickCm, primitiveId: null, mode: pieMode });
    }
  };

  const handlePointerLeave = () => {
    setIsCanvasHovered(false);
    setActiveGuides([]);
    setPanDrag(null);
    if (handleDrag) {
      onApplyPrimitivePatch(
        handleDrag.primitiveId,
        handleDrag.currentValues,
        `Изменён узел/ручка «${handleDrag.handleId}» у #${handleDrag.primitiveId}`
      );
      setHandleDrag(null);
    }
    if (moveDrag) {
      if (Math.abs(moveDrag.deltaCm.x) >= 0.01 || Math.abs(moveDrag.deltaCm.y) >= 0.01) {
        onMovePrimitivesCm(moveDrag.ids, moveDrag.deltaCm.x, moveDrag.deltaCm.y);
      }
      setMoveDrag(null);
    }
    if (dragStart) {
      setDragStart(null);
      setDragCurrent(null);
    }
    if (marqueeBox) {
      setMarqueeBox(null);
    }
  };

  // Compute live primitive list incorporating active moveDrag or handleDrag for real-time smart connectors!
  const livePrimitives = useMemo(() => {
    return ownedPrimitives.map((item) => {
      if (handleDrag && handleDrag.primitiveId === item.id) {
        return { ...item, values: handleDrag.currentValues };
      }
      if (moveDrag && moveDrag.ids.includes(item.id)) {
        return {
          ...item,
          values: translateOwnedPrimitiveCm(item.tool, item.values, moveDrag.deltaCm.x, moveDrag.deltaCm.y),
        };
      }
      return item;
    });
  }, [handleDrag, moveDrag, ownedPrimitives]);

  const primarySelectedLive = useMemo(
    () =>
      selectedPrimitiveId !== null && selectedPrimitiveIds.length <= 1
        ? livePrimitives.find((p) => p.id === selectedPrimitiveId) ?? null
        : null,
    [livePrimitives, selectedPrimitiveId, selectedPrimitiveIds.length]
  );

  const renderPrimitiveSvg = (
    item: OwnedPrimitive,
    allList: OwnedPrimitive[],
    interactive: boolean,
    defaultInkColor: string
  ) => {
    const effectiveLayer = resolveEffectiveLayer(item);
    if (interactive && hiddenLayers.includes(effectiveLayer)) {
      return null;
    }
    const isLocked = interactive && lockedLayers.includes(effectiveLayer);
    const v = item.values;
    const visibleOnSlide =
      !interactive || isBeamerSpecVisibleOnSlide(v.beamer_spec, activeBeamerSlide);

    const isSelected =
      interactive &&
      !isLocked &&
      (selectedPrimitiveId === item.id || selectedPrimitiveIds.includes(item.id));
    const isHovered = interactive && !isLocked && hoveredPrimitiveId === item.id;
    const authoredStroke = resolveStrokeColorHex(v.stroke_color, defaultInkColor);
    const stroke = isSelected ? '#0284c7' : isHovered ? '#0ea5e9' : authoredStroke;
    const baseW = isSelected ? 2.6 : isHovered ? 2.3 : 1.9;
    const strokeWidth = resolveStrokeWidthPx(v.stroke_width, baseW);
    const dashArray = resolveDashArray(v.line_style);
    const baseFill = resolveFillColorRgba(v.fill_color, isSelected);
    const hatchPrefix = interactive ? 'sketch-hatch' : 'pdf-hatch';
    const fill =
      v.hatch_pattern === 'north east lines'
        ? `url(#${hatchPrefix}-ne)`
        : v.hatch_pattern === 'north west lines'
          ? `url(#${hatchPrefix}-nw)`
          : v.hatch_pattern === 'crosshatch'
            ? `url(#${hatchPrefix}-cross)`
            : v.hatch_pattern === 'dots'
              ? `url(#${hatchPrefix}-dots)`
              : v.hatch_pattern === 'horizontal lines'
                ? `url(#${hatchPrefix}-horiz)`
                : baseFill;

    const handleShapePointerDown = (ev: React.PointerEvent) => {
      if (!interactive || isLocked || !visibleOnSlide || spaceHeld) return;
      if (activeTool === 'eyedropper' || ev.altKey) {
        ev.stopPropagation();
        onEyedropperClickPrimitive?.(item.id, ev.altKey || !copiedStylePassport);
        return;
      }
      if (activeTool !== 'select') return;
      ev.stopPropagation();
      if (ev.shiftKey) {
        onSelectPrimitive(item.id, true);
        return;
      }
      const expandedSeed = expandSelectionWithGroups(ownedPrimitives, [item.id]);
      const groupIds = selectedPrimitiveIds.includes(item.id)
        ? expandSelectionWithGroups(ownedPrimitives, selectedPrimitiveIds)
        : expandedSeed;
      if (!selectedPrimitiveIds.includes(item.id)) {
        if (expandedSeed.length > 1) {
          onSelectMultiplePrimitives(expandedSeed);
        } else {
          onSelectPrimitive(item.id, false);
        }
      }
      const pt = clientToCm(ev.clientX, ev.clientY, true);
      setMoveDrag({ ids: groupIds, originCm: pt, deltaCm: { x: 0, y: 0 } });
    };

    const handleNodeDoubleClick = (ev: React.MouseEvent) => {
      if (!interactive || isLocked || item.tool !== 'node') return;
      ev.stopPropagation();
      setInlineNodeEdit({
        primitiveId: item.id,
        content: v.content ?? 'A',
        mode: v.mode === 'text' ? 'text' : 'math',
        anchor: v.anchor ?? '',
        nodeId: v.node_id ?? '',
      });
    };

    const shapeInteractionProps =
      interactive &&
      !isLocked &&
      visibleOnSlide &&
      (activeTool === 'select' || activeTool === 'eyedropper') &&
      !spaceHeld
        ? {
            'data-testid': `canvas-primitive-${item.id}`,
            'data-primitive-id': String(item.id),
            opacity: visibleOnSlide ? 1 : 0.16,
            onPointerDown: handleShapePointerDown,
            onDoubleClick: handleNodeDoubleClick,
            onMouseEnter: () => onHoverPrimitive(item.id),
            onMouseLeave: () => onHoverPrimitive(null),
            className:
              activeTool === 'eyedropper' ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
          }
        : interactive
          ? {
              'data-testid': `canvas-primitive-${item.id}`,
              'data-primitive-id': String(item.id),
              opacity: visibleOnSlide ? 1 : 0.16,
              className: 'pointer-events-none',
            }
          : {};

    switch (item.tool) {
      case 'line':
      case 'arrow': {
        // P36: Closed Polygons (-- cycle) & Multi-Vertex Polylines
        if (v.poly_points) {
          const polyPts = parsePolyPointsList(v.poly_points);
          if (polyPts.length >= 2) {
            const polySvgStr = polyPts
              .map((pt) => `${cmToSvgX(pt.xCm)},${cmToSvgY(pt.yCm)}`)
              .join(' ');
            const isClosed = v.poly_closed === 'cycle';
            return (
              <g key={item.id} {...shapeInteractionProps}>
                {isClosed ? (
                  <polygon
                    points={polySvgStr}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    strokeLinejoin="round"
                  />
                ) : (
                  <>
                    {interactive && (
                      <polyline
                        points={polySvgStr}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={14}
                      />
                    )}
                    <polyline
                      points={polySvgStr}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      strokeDasharray={dashArray}
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </g>
            );
          }
        }

        const resolved = resolveSmartConnectorEndpoints(item, allList);
        const routePtsCm = computeOrthogonalConnectorPointsCm(
          resolved.x1Cm,
          resolved.y1Cm,
          resolved.x2Cm,
          resolved.y2Cm,
          v.routing
        );
        const svgPts = routePtsCm.map((p) => ({ x: cmToSvgX(p.x), y: cmToSvgY(p.y) }));
        const x1 = svgPts[0].x;
        const y1 = svgPts[0].y;
        const x2 = svgPts[svgPts.length - 1].x;
        const y2 = svgPts[svgPts.length - 1].y;

        // P39: Path Decorations (brace / brace-mirror / snake / zigzag / coil)
        if (v.decoration_kind) {
          const decPath = buildSvgDecorationPath(x1, y1, x2, y2, v.decoration_kind);
          const dxD = x2 - x1;
          const dyD = y2 - y1;
          const lenD = Math.max(1, Math.hypot(dxD, dyD));
          const signD = v.decoration_kind === 'brace-mirror' ? -1 : 1;
          const nxD = (dyD / lenD) * signD;
          const nyD = (-dxD / lenD) * signD;
          const cleanDecLabel = (v.decoration_label ?? '')
            .replace(/\\text\{([^}]*)\}/g, '$1')
            .replace(/\\,/g, ' ');
          return (
            <g key={item.id} {...shapeInteractionProps}>
              {interactive && (
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={16} />
              )}
              <path
                d={decPath}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
              />
              {cleanDecLabel && (
                <text
                  x={(x1 + x2) / 2 + nxD * 22}
                  y={(y1 + y2) / 2 + nyD * 22 + 3}
                  textAnchor="middle"
                  fontSize={11}
                  fontStyle="italic"
                  fontFamily="Georgia, serif"
                  fill={stroke}
                >
                  {cleanDecLabel}
                </text>
              )}
            </g>
          );
        }

        const markerEnd =
          item.tool === 'arrow' || v.callout === 'dim'
            ? interactive
              ? 'url(#sketch-arrow)'
              : 'url(#pdf-arrow)'
            : undefined;
        const markerStart =
          v.callout === 'dim'
            ? interactive
              ? 'url(#sketch-arrow)'
              : 'url(#pdf-arrow)'
            : undefined;
        const polyStr = svgPts.map((p) => `${p.x},${p.y}`).join(' ');

        // P21: Dimension callout perpendicular ticks & label
        const dxSvg = x2 - x1;
        const dySvg = y2 - y1;
        const lenSvg = Math.max(1, Math.hypot(dxSvg, dySvg));
        const nx = (-dySvg / lenSvg) * 6.5;
        const ny = (dxSvg / lenSvg) * 6.5;
        const distCm = Math.hypot(resolved.x2Cm - resolved.x1Cm, resolved.y2Cm - resolved.y1Cm);
        const calloutCleanText = (v.callout_label || `${distCm.toFixed(2)} см`)
          .replace(/\\text\{([^}]*)\}/g, '$1')
          .replace(/\\,/g, ' ');

        return (
          <g key={item.id} {...shapeInteractionProps}>
            {interactive && (
              <polyline points={polyStr} fill="none" stroke="transparent" strokeWidth={14} />
            )}
            <polyline
              points={polyStr}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeLinejoin={v.rounded_corners ? 'round' : 'miter'}
              markerStart={markerStart}
              markerEnd={markerEnd}
            />
            {v.callout === 'dim' && (
              <g className="pointer-events-none">
                <line x1={x1 - nx} y1={y1 - ny} x2={x1 + nx} y2={y1 + ny} stroke={stroke} strokeWidth={1.4} />
                <line x1={x2 - nx} y1={y2 - ny} x2={x2 + nx} y2={y2 + ny} stroke={stroke} strokeWidth={1.4} />
                <text
                  x={(x1 + x2) / 2 + nx * 1.3}
                  y={(y1 + y2) / 2 + ny * 1.3 - 3}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontFamily="JetBrains Mono, monospace"
                  fill={stroke}
                >
                  {calloutCleanText}
                </text>
              </g>
            )}
            {interactive && resolved.isBound && (
              <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r={2.6} fill="#0ea5e9" />
            )}
          </g>
        );
      }
      case 'rectangle': {
        const ax = cmToSvgX(parseDimensionToCm(v.start_x) ?? 0.8);
        const ay = cmToSvgY(parseDimensionToCm(v.start_y) ?? 0.6);
        const bx = cmToSvgX(parseDimensionToCm(v.end_x) ?? 3.0);
        const by = cmToSvgY(parseDimensionToCm(v.end_y) ?? 2.0);
        const rx = Math.min(ax, bx);
        const ry = Math.min(ay, by);
        const rw = Math.max(2, Math.abs(bx - ax));
        const rh = Math.max(2, Math.abs(by - ay));
        const rot = v.rotate_deg ? -Number(v.rotate_deg) : 0;
        return (
          <g
            key={item.id}
            transform={rot ? `rotate(${rot} ${rx + rw / 2} ${ry + rh / 2})` : undefined}
            {...shapeInteractionProps}
          >
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              rx={parseCornerRadiusPx(v.rounded_corners, PX_PER_CM)}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
            />
          </g>
        );
      }
      case 'circle': {
        const cx = cmToSvgX(parseDimensionToCm(v.center_x) ?? 2.0);
        const cy = cmToSvgY(parseDimensionToCm(v.center_y) ?? 1.5);
        const r = Math.max(3, (parseDimensionToCm(v.radius) ?? 0.6) * PX_PER_CM);
        return (
          <g key={item.id} {...shapeInteractionProps}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
            />
          </g>
        );
      }
      case 'cubic': {
        const sx = cmToSvgX(parseDimensionToCm(v.start_x) ?? 0.6);
        const sy = cmToSvgY(parseDimensionToCm(v.start_y) ?? 0.8);
        const c1x = cmToSvgX(parseDimensionToCm(v.control1_x) ?? 1.6);
        const c1y = cmToSvgY(parseDimensionToCm(v.control1_y) ?? 2.4);
        const c2x = cmToSvgX(parseDimensionToCm(v.control2_x) ?? 3.2);
        const c2y = cmToSvgY(parseDimensionToCm(v.control2_y) ?? 2.4);
        const ex = cmToSvgX(parseDimensionToCm(v.end_x) ?? 4.4);
        const ey = cmToSvgY(parseDimensionToCm(v.end_y) ?? 1.1);
        const d = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
        return (
          <g key={item.id} {...shapeInteractionProps}>
            {interactive && <path d={d} fill="none" stroke="transparent" strokeWidth={14} />}
            <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dashArray} />
            {interactive && isSelected && (
              <>
                <line x1={sx} y1={sy} x2={c1x} y2={c1y} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.1} />
                <line x1={ex} y1={ey} x2={c2x} y2={c2y} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.1} />
              </>
            )}
          </g>
        );
      }
      case 'node': {
        const baseNx = cmToSvgX(parseDimensionToCm(v.x) ?? 2.4);
        const baseNy = cmToSvgY(parseDimensionToCm(v.y) ?? 2.0);
        const anchorOffsetY =
          v.anchor === 'above' || v.anchor === 'above left' || v.anchor === 'above right'
            ? -13
            : v.anchor === 'below' || v.anchor === 'below left' || v.anchor === 'below right'
              ? 13
              : 0;
        const anchorOffsetX =
          v.anchor === 'left' || v.anchor === 'above left' || v.anchor === 'below left'
            ? -22
            : v.anchor === 'right' || v.anchor === 'above right' || v.anchor === 'below right'
              ? 22
              : 0;
        const nx = baseNx + anchorOffsetX;
        const ny = baseNy + anchorOffsetY;

        // P63: Live SVG <tspan> math shaper (subscripts, superscripts, Greek & upright SI units)
        const mathRuns = parseLatexToDisplayRuns(v.content ?? 'A');
        const hasBoxFill = Boolean(v.fill_color && v.fill_color !== 'none');
        return (
          <g key={item.id} {...shapeInteractionProps}>
            {(isSelected || isHovered || hasBoxFill) && (
              <rect
                x={nx - 52}
                y={ny - 14}
                width={104}
                height={26}
                rx={4}
                fill={hasBoxFill ? fill : 'rgba(2, 132, 199, 0.09)'}
                stroke={isSelected ? '#0284c7' : isHovered ? '#0ea5e9' : authoredStroke}
                strokeWidth={hasBoxFill ? 1.2 : 1}
                strokeDasharray={hasBoxFill ? undefined : '3 2'}
              />
            )}
            <text
              x={nx}
              y={ny + 4}
              textAnchor="middle"
              fill={stroke}
              fontSize={13.5}
              fontStyle={v.mode === 'math' ? 'italic' : 'normal'}
              fontFamily={v.mode === 'math' ? 'Georgia, serif' : 'IBM Plex Sans, sans-serif'}
            >
              {mathRuns.map((run, rIdx) => {
                const prevScript = rIdx > 0 ? mathRuns[rIdx - 1].script : 'normal';
                const curOffset = run.script === 'sub' ? 3.8 : run.script === 'sup' ? -4.6 : 0;
                const prevOffset = prevScript === 'sub' ? 3.8 : prevScript === 'sup' ? -4.6 : 0;
                const dyVal = +(curOffset - prevOffset).toFixed(1);
                const isUpright = v.mode !== 'math' || Boolean(run.upright);
                return (
                  <tspan
                    key={rIdx}
                    dy={dyVal !== 0 ? dyVal : undefined}
                    fontSize={run.script === 'normal' ? 13.5 : 9.6}
                    fontStyle={isUpright ? 'normal' : 'italic'}
                    fontWeight={run.bold ? '700' : undefined}
                    fontFamily={isUpright ? 'IBM Plex Sans, sans-serif' : 'Georgia, serif'}
                  >
                    {run.text}
                  </tspan>
                );
              })}
            </text>
            {interactive && v.node_id && (
              <text
                x={nx + 44}
                y={ny - 8}
                fontSize={8.5}
                fontFamily="JetBrains Mono, monospace"
                fill="#0284c7"
              >
                ({v.node_id})
              </text>
            )}
          </g>
        );
      }
    }
  };

  // P01: Render interactive resize & Bezier control handles on primary selected primitive
  const renderInteractiveHandlesSvg = () => {
    if (!primarySelectedLive || activeTool !== 'select' || spaceHeld) return null;
    const primaryLayer = resolveEffectiveLayer(primarySelectedLive);
    if (hiddenLayers.includes(primaryLayer) || lockedLayers.includes(primaryLayer)) return null;
    if (!isBeamerSpecVisibleOnSlide(primarySelectedLive.values.beamer_spec, activeBeamerSlide)) {
      return null;
    }
    const handles = getPrimitiveHandles(primarySelectedLive);
    const polyMidpoints = getPolyEdgeMidpoints(primarySelectedLive);
    return (
      <g data-testid="canvas-handles-layer">
        {/* F01: Edge Midpoint "+" Handles for Direct Vertex Insertion on poly_points */}
        {polyMidpoints.map((mid) => {
          const mx = cmToSvgX(mid.xCm);
          const my = cmToSvgY(mid.yCm);
          return (
            <g
              key={`mid-${mid.edgeIndex}`}
              data-testid={`canvas-poly-midpoint-${mid.edgeIndex}`}
              onPointerDown={(ev) => {
                ev.stopPropagation();
                onInsertPolyVertexAtEdge?.(primarySelectedLive.id, mid.edgeIndex);
              }}
              className="cursor-pointer"
            >
              <title>Добавить вершину на ребро #{mid.edgeIndex + 1}</title>
              <circle cx={mx} cy={my} r={8.5} fill="transparent" />
              <circle cx={mx} cy={my} r={4.8} fill="#10b981" stroke="#ffffff" strokeWidth={1.3} />
              <path
                d={`M ${mx - 2.3} ${my} H ${mx + 2.3} M ${mx} ${my - 2.3} V ${my + 2.3}`}
                stroke="#ffffff"
                strokeWidth={1.2}
              />
            </g>
          );
        })}

        {handles.map((h) => {
          const hx = cmToSvgX(h.xCm);
          const hy = cmToSvgY(h.yCm);
          const isBezier = h.kind === 'bezier-control';
          const isRadius = h.kind === 'radius';
          const polyMatch = h.handleId.match(/^poly_(\d+)$/);
          return (
            <g
              key={h.handleId}
              data-testid={`canvas-handle-${h.handleId}`}
              onPointerDown={(ev) => {
                ev.stopPropagation();
                if (ev.altKey && polyMatch && onDeletePolyVertexAtIndex) {
                  onDeletePolyVertexAtIndex(primarySelectedLive.id, Number(polyMatch[1]));
                  return;
                }
                setHandleDrag({
                  primitiveId: primarySelectedLive.id,
                  handleId: h.handleId,
                  currentValues: { ...primarySelectedLive.values },
                });
              }}
              className="cursor-pointer"
            >
              {polyMatch && (
                <title>
                  Вершина #{Number(polyMatch[1]) + 1} (перетащите для сдвига, Alt+клик — удалить вершину · F01)
                </title>
              )}
              <circle cx={hx} cy={hy} r={10} fill="transparent" />
              {isBezier ? (
                <circle cx={hx} cy={hy} r={5} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.6} />
              ) : isRadius ? (
                <rect
                  x={hx - 4.5}
                  y={hy - 4.5}
                  width={9}
                  height={9}
                  rx={2}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              ) : (
                <rect
                  x={hx - 4.5}
                  y={hy - 4.5}
                  width={9}
                  height={9}
                  rx={1.5}
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              )}
            </g>
          );
        })}
      </g>
    );
  };

  // P02: Render Smart Snap Alignment Guides
  const renderSmartSnapGuidesSvg = () => {
    if (activeGuides.length === 0) return null;
    return (
      <g data-testid="canvas-snap-guides" className="pointer-events-none">
        {activeGuides.map((g, i) => {
          if (g.axis === 'x') {
            const x = cmToSvgX(g.coordCm);
            const y1 = cmToSvgY(g.fromCm);
            const y2 = cmToSvgY(g.toCm);
            return (
              <g key={`gx-${i}`}>
                <line x1={x} y1={y1} x2={x} y2={y2} stroke="#06b6d4" strokeWidth={1.2} strokeDasharray="4 2" />
                <text x={x + 4} y={Math.min(y1, y2) + 10} fontSize={9} fontFamily="JetBrains Mono, monospace" fill="#0891b2">
                  {g.labelRu}
                </text>
              </g>
            );
          }
          const y = cmToSvgY(g.coordCm);
          const x1 = cmToSvgX(g.fromCm);
          const x2 = cmToSvgX(g.toCm);
          return (
            <g key={`gy-${i}`}>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke="#06b6d4" strokeWidth={1.2} strokeDasharray="4 2" />
              <text x={Math.min(x1, x2) + 4} y={y - 4} fontSize={9} fontFamily="JetBrains Mono, monospace" fill="#0891b2">
                {g.labelRu}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderGhostDraftSvg = () => {
    if (!draftPreview) return null;
    const v = draftPreview.values;
    const ghostStroke = 'rgba(2, 132, 199, 0.62)';
    const ghostFill = 'rgba(2, 132, 199, 0.09)';
    const guideStroke = 'rgba(100, 116, 139, 0.42)';

    switch (draftPreview.tool) {
      case 'line':
      case 'arrow': {
        const x1 = cmToSvgX(parseDimensionToCm(v.start_x) ?? 0);
        const y1 = cmToSvgY(parseDimensionToCm(v.start_y) ?? 0);
        const x2 = cmToSvgX(parseDimensionToCm(v.end_x) ?? 1);
        const y2 = cmToSvgY(parseDimensionToCm(v.end_y) ?? 1);
        const mx = (x1 + x2) / 2;
        const my = Math.max(vbY + 16, (y1 + y2) / 2 - 10);
        return (
          <g data-testid="tikz-ghost-preview" className="pointer-events-none">
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={ghostStroke}
              strokeWidth={2}
              strokeDasharray="6 3"
              markerEnd={draftPreview.tool === 'arrow' ? 'url(#ghost-arrow)' : undefined}
            />
            <circle cx={x1} cy={y1} r={3.5} fill="#ffffff" stroke={ghostStroke} strokeWidth={1.5} />
            <circle cx={x2} cy={y2} r={3.5} fill="#ffffff" stroke={ghostStroke} strokeWidth={1.5} />
            <text
              x={mx}
              y={my}
              textAnchor="middle"
              fontSize={10.5}
              fontFamily="JetBrains Mono, monospace"
              fill="#0369a1"
            >
              {draftPreview.metricsLabelRu}
            </text>
          </g>
        );
      }

      case 'rectangle': {
        const ax = cmToSvgX(parseDimensionToCm(v.start_x) ?? 0);
        const ay = cmToSvgY(parseDimensionToCm(v.start_y) ?? 0);
        const bx = cmToSvgX(parseDimensionToCm(v.end_x) ?? 1);
        const by = cmToSvgY(parseDimensionToCm(v.end_y) ?? 1);
        const rx = Math.min(ax, bx);
        const ry = Math.min(ay, by);
        const rw = Math.max(2, Math.abs(bx - ax));
        const rh = Math.max(2, Math.abs(by - ay));
        return (
          <g data-testid="tikz-ghost-preview" className="pointer-events-none">
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              fill={ghostFill}
              stroke={ghostStroke}
              strokeWidth={1.9}
              strokeDasharray="6 3"
            />
            <line x1={ax} y1={ay} x2={bx} y2={by} stroke={guideStroke} strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={ax} cy={ay} r={3.5} fill="#ffffff" stroke={ghostStroke} strokeWidth={1.5} />
            <circle cx={bx} cy={by} r={3.5} fill="#ffffff" stroke={ghostStroke} strokeWidth={1.5} />
            <text
              x={rx + rw / 2}
              y={Math.max(vbY + 14, ry - 6)}
              textAnchor="middle"
              fontSize={10.5}
              fontFamily="JetBrains Mono, monospace"
              fill="#0369a1"
            >
              {draftPreview.metricsLabelRu}
            </text>
          </g>
        );
      }

      case 'circle': {
        const cx = cmToSvgX(parseDimensionToCm(v.center_x) ?? 1);
        const cy = cmToSvgY(parseDimensionToCm(v.center_y) ?? 1);
        const r = Math.max(4, (parseDimensionToCm(v.radius) ?? 0.25) * PX_PER_CM);
        const ex = cmToSvgX(draftPreview.effectiveEndCm.x);
        const ey = cmToSvgY(draftPreview.effectiveEndCm.y);
        return (
          <g data-testid="tikz-ghost-preview" className="pointer-events-none">
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={ghostFill}
              stroke={ghostStroke}
              strokeWidth={1.9}
              strokeDasharray="6 3"
            />
            <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={guideStroke} strokeWidth={1.2} strokeDasharray="3 3" />
            <circle cx={cx} cy={cy} r={3.5} fill={ghostStroke} />
            <circle cx={ex} cy={ey} r={3} fill="#ffffff" stroke={ghostStroke} strokeWidth={1.4} />
            <text
              x={cx}
              y={Math.max(vbY + 14, cy - r - 6)}
              textAnchor="middle"
              fontSize={10.5}
              fontFamily="JetBrains Mono, monospace"
              fill="#0369a1"
            >
              {draftPreview.metricsLabelRu}
            </text>
          </g>
        );
      }

      case 'cubic': {
        const sx = cmToSvgX(parseDimensionToCm(v.start_x) ?? 0);
        const sy = cmToSvgY(parseDimensionToCm(v.start_y) ?? 0);
        const c1x = cmToSvgX(parseDimensionToCm(v.control1_x) ?? 1);
        const c1y = cmToSvgY(parseDimensionToCm(v.control1_y) ?? 1);
        const c2x = cmToSvgX(parseDimensionToCm(v.control2_x) ?? 2);
        const c2y = cmToSvgY(parseDimensionToCm(v.control2_y) ?? 1);
        const ex = cmToSvgX(parseDimensionToCm(v.end_x) ?? 3);
        const ey = cmToSvgY(parseDimensionToCm(v.end_y) ?? 0);
        const d = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
        return (
          <g data-testid="tikz-ghost-preview" className="pointer-events-none">
            <line x1={sx} y1={sy} x2={c1x} y2={c1y} stroke="rgba(245, 158, 11, 0.50)" strokeDasharray="3 3" strokeWidth={1.1} />
            <line x1={ex} y1={ey} x2={c2x} y2={c2y} stroke="rgba(245, 158, 11, 0.50)" strokeDasharray="3 3" strokeWidth={1.1} />
            <path d={d} fill="none" stroke={ghostStroke} strokeWidth={2} strokeDasharray="6 3" />
            <circle cx={c1x} cy={c1y} r={3.5} fill="rgba(245, 158, 11, 0.65)" />
            <circle cx={c2x} cy={c2y} r={3.5} fill="rgba(245, 158, 11, 0.65)" />
            <circle cx={sx} cy={sy} r={3.5} fill="#ffffff" stroke={ghostStroke} strokeWidth={1.5} />
            <circle cx={ex} cy={ey} r={3.5} fill="#ffffff" stroke={ghostStroke} strokeWidth={1.5} />
            <text
              x={(sx + ex) / 2}
              y={Math.max(vbY + 14, Math.min(c1y, c2y) - 8)}
              textAnchor="middle"
              fontSize={10.5}
              fontFamily="JetBrains Mono, monospace"
              fill="#0369a1"
            >
              {draftPreview.metricsLabelRu}
            </text>
          </g>
        );
      }

      case 'node': {
        const nx = cmToSvgX(parseDimensionToCm(v.x) ?? 1);
        const ny = cmToSvgY(parseDimensionToCm(v.y) ?? 1);
        return (
          <g data-testid="tikz-ghost-preview" className="pointer-events-none">
            <rect
              x={nx - 42}
              y={ny - 14}
              width={84}
              height={26}
              rx={4}
              fill={ghostFill}
              stroke={ghostStroke}
              strokeWidth={1.4}
              strokeDasharray="4 3"
            />
            <text
              x={nx}
              y={ny + 4}
              textAnchor="middle"
              fill="rgba(15, 23, 42, 0.55)"
              fontSize={13}
              fontStyle="italic"
              fontFamily="Georgia, serif"
            >
              P_n
            </text>
            <text
              x={nx}
              y={Math.max(vbY + 14, ny - 19)}
              textAnchor="middle"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
              fill="#0369a1"
            >
              {draftPreview.metricsLabelRu}
            </text>
          </g>
        );
      }
    }
  };

  const renderPackageGhostDraftSvg = () => {
    if (!isPackageCanvasTool(activeTool)) return null;
    const spec = PACKAGE_CANVAS_TOOLS.find((t) => t.id === activeTool);
    if (!spec) return null;
    const a = dragStart ?? (isCanvasHovered && !spaceHeld ? cursorCm : null);
    if (!a) return null;
    const b = dragCurrent ?? cursorCm;
    const x1 = cmToSvgX(a.x);
    const y1 = cmToSvgY(a.y);
    const x2 = cmToSvgX(b.x);
    const y2 = cmToSvgY(b.y);
    if (!dragStart && spec.gestureKind !== 'click') return null;
    return (
      <g data-testid="package-ghost-preview" className="pointer-events-none">
        {spec.gestureKind === 'drag-box' ? (
          <rect
            x={Math.min(x1, x2)}
            y={Math.min(y1, y2)}
            width={Math.max(36, Math.abs(x2 - x1))}
            height={Math.max(28, Math.abs(y2 - y1))}
            fill="rgba(14, 165, 233, 0.10)"
            stroke="#0284c7"
            strokeWidth={1.8}
            strokeDasharray="6 3"
          />
        ) : spec.gestureKind === 'click' ? (
          <circle
            cx={x1}
            cy={y1}
            r={22}
            fill="rgba(14, 165, 233, 0.10)"
            stroke="#0284c7"
            strokeWidth={1.6}
            strokeDasharray="4 3"
          />
        ) : (
          <>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#0284c7"
              strokeWidth={2}
              strokeDasharray="6 3"
              markerEnd="url(#ghost-arrow)"
            />
            <circle cx={x1} cy={y1} r={3.5} fill="#ffffff" stroke="#0284c7" strokeWidth={1.5} />
            <circle cx={x2} cy={y2} r={3.5} fill="#ffffff" stroke="#0284c7" strokeWidth={1.5} />
          </>
        )}
        <text
          x={(x1 + x2) / 2}
          y={Math.max(vbY + 14, Math.min(y1, y2) - 8)}
          textAnchor="middle"
          fontSize={10}
          fontFamily="JetBrains Mono, monospace"
          fill="#0369a1"
        >
          {`${spec.familyLabelRu}: ${spec.shortLabelRu}`}
        </text>
      </g>
    );
  };

  const renderPackageObjectSvg = (rawObj: RecognizedPackageObject) => {
    const isMoving = pkgMoveDrag && pkgMoveDrag.objectId === rawObj.objectId;
    const dxCm = isMoving ? pkgMoveDrag.deltaCm.x : 0;
    const dyCm = isMoving ? pkgMoveDrag.deltaCm.y : 0;
    const obj: RecognizedPackageObject = isMoving
      ? {
          ...rawObj,
          x1Cm: rawObj.x1Cm + dxCm,
          y1Cm: rawObj.y1Cm + dyCm,
          x2Cm: rawObj.x2Cm + dxCm,
          y2Cm: rawObj.y2Cm + dyCm,
        }
      : rawObj;

    const isSelected = selectedPackageObjectId === obj.objectId;
    const underPdf = Boolean(pdfUnderlay?.enabled && pdfUnderlay?.response?.pngDataUrl);
    const stroke = isSelected ? '#0284c7' : underPdf ? 'rgba(2, 132, 199, 0.55)' : '#0f172a';
    const x1 = cmToSvgX(obj.x1Cm);
    const y1 = cmToSvgY(obj.y1Cm);
    const x2 = cmToSvgX(obj.x2Cm);
    const y2 = cmToSvgY(obj.y2Cm);

    const onPkgPointerDown = (ev: React.PointerEvent) => {
      if (spaceHeld || activeTool !== 'select') return;
      ev.stopPropagation();
      onSelectPrimitive(null, false);
      onSelectPackageObject?.(obj.objectId);
      const pt = clientToCm(ev.clientX, ev.clientY, true);
      setPkgMoveDrag({ objectId: obj.objectId, originCm: pt, deltaCm: { x: 0, y: 0 } });
    };

    const interactiveProps =
      activeTool === 'select' && !spaceHeld
        ? {
            'data-testid': `canvas-pkg-object-${obj.objectId}`,
            onPointerDown: onPkgPointerDown,
            className: 'cursor-grab active:cursor-grabbing',
          }
        : {
            'data-testid': `canvas-pkg-object-${obj.objectId}`,
            className: 'pointer-events-none',
          };

    if (obj.kind === 'pgfplots-axis') {
      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      const rw = Math.max(40, Math.abs(x2 - x1));
      const rh = Math.max(32, Math.abs(y2 - y1));
      return (
        <g key={obj.objectId} {...interactiveProps}>
          <rect
            x={rx}
            y={ry}
            width={rw}
            height={rh}
            fill={isSelected ? 'rgba(2, 132, 199, 0.06)' : 'rgba(255,255,255,0.01)'}
            stroke={stroke}
            strokeWidth={isSelected ? 2 : underPdf ? 1.1 : 1.6}
            strokeDasharray={underPdf && !isSelected ? '5 3' : undefined}
          />
          {!underPdf &&
            (obj.axisSeries ?? []).map((ser, sIdx) => {
              const pts = ser.pointsNorm
                .map((p) => `${(rx + p.u * rw).toFixed(1)},${(ry + (1 - p.v) * rh).toFixed(1)}`)
                .join(' ');
              return (
                <polyline
                  key={sIdx}
                  points={pts}
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth={1.8}
                />
              );
            })}
          <text
            x={rx + 5}
            y={ry + 12}
            fontSize={9.5}
            fontFamily="JetBrains Mono, monospace"
            fill="#0284c7"
          >
            {`pgfplots·${obj.axisEnv ?? 'axis'} (${obj.axisSeries?.length ?? 0} сер.)`}
          </text>
        </g>
      );
    }

    if (obj.kind === 'automata-state' || obj.kind === 'clean-circle') {
      const rPx = Math.max(16, (obj.radiusCm ?? 0.34) * PX_PER_CM);
      return (
        <g key={obj.objectId} {...interactiveProps}>
          <circle
            cx={x1}
            cy={y1}
            r={rPx}
            fill={isSelected ? 'rgba(2, 132, 199, 0.08)' : 'rgba(255,255,255,0.01)'}
            stroke={stroke}
            strokeWidth={isSelected ? 2.1 : underPdf ? 1.1 : 1.7}
            strokeDasharray={underPdf && !isSelected ? '4 2' : undefined}
          />
          {obj.stateAccepting && !underPdf && (
            <circle cx={x1} cy={y1} r={Math.max(10, rPx - 4)} fill="none" stroke={stroke} strokeWidth={1.1} />
          )}
          {!underPdf && obj.labelLatex && (
            <text x={x1} y={y1 + 4} textAnchor="middle" fontSize={11} fontFamily="Georgia, serif" fill="#0f172a">
              {obj.labelLatex.replace(/\$/g, '')}
            </text>
          )}
        </g>
      );
    }

    if (obj.kind === 'clean-rect') {
      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      return (
        <g key={obj.objectId} {...interactiveProps}>
          <rect
            x={rx}
            y={ry}
            width={Math.max(8, Math.abs(x2 - x1))}
            height={Math.max(8, Math.abs(y2 - y1))}
            fill={isSelected ? 'rgba(2, 132, 199, 0.08)' : 'rgba(255,255,255,0.01)'}
            stroke={stroke}
            strokeWidth={isSelected ? 2.1 : underPdf ? 1.1 : 1.7}
          />
        </g>
      );
    }

    if (obj.kind === 'chemfig-molecule' || obj.kind === 'clean-node' || obj.kind === 'circuit-ground' || obj.kind === 'mech-support') {
      return (
        <g key={obj.objectId} {...interactiveProps}>
          <rect
            x={x1 - 28}
            y={y1 - 20}
            width={56}
            height={40}
            rx={4}
            fill={isSelected ? 'rgba(2, 132, 199, 0.09)' : 'rgba(255,255,255,0.01)'}
            stroke={isSelected ? '#0284c7' : 'rgba(2, 132, 199, 0.42)'}
            strokeWidth={isSelected ? 1.9 : 1}
            strokeDasharray="4 2"
          />
          {!underPdf && (
            <text x={x1} y={y1 + 4} textAnchor="middle" fontSize={10.5} fontFamily="JetBrains Mono, monospace" fill="#0f172a">
              {obj.chemFormula ?? obj.labelLatex?.replace(/\$/g, '') ?? obj.kind}
            </text>
          )}
        </g>
      );
    }

    // Segment-like package objects (`circuit-bipole`, `automata-edge`, `physics-spring`, `physics-wave`, `optics-lens`, `clean-line`, `clean-arrow`)
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    return (
      <g key={obj.objectId} {...interactiveProps}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={16} />
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={stroke}
          strokeWidth={isSelected ? 2.2 : underPdf ? 1.1 : 1.8}
          strokeDasharray={underPdf && !isSelected ? '4 3' : undefined}
          markerEnd={obj.kind === 'clean-arrow' || obj.kind === 'automata-edge' ? 'url(#sketch-arrow)' : undefined}
        />
        {isSelected && (
          <>
            <circle cx={x1} cy={y1} r={4} fill="#ffffff" stroke="#0284c7" strokeWidth={1.6} />
            <circle cx={x2} cy={y2} r={4} fill="#ffffff" stroke="#0284c7" strokeWidth={1.6} />
          </>
        )}
        {(!underPdf || isSelected) && (obj.circuitKind || obj.labelLatex) && (
          <text
            x={mx}
            y={my - 8}
            textAnchor="middle"
            fontSize={10}
            fontFamily="JetBrains Mono, monospace"
            fill="#0284c7"
          >
            {`${obj.circuitKind ? `${obj.circuitKind}:` : ''}${(obj.labelLatex ?? '').replace(/\$/g, '')}`}
          </text>
        )}
      </g>
    );
  };

  // Integer centimeter ticks for dynamic stage bounds (P04 + P05)
  const xTickIntegers = useMemo(() => {
    const out: number[] = [];
    for (let cm = Math.ceil(stageBounds.minXCm); cm <= Math.floor(stageBounds.maxXCm); cm++) {
      out.push(cm);
    }
    return out;
  }, [stageBounds]);

  const yTickIntegers = useMemo(() => {
    const out: number[] = [];
    for (let cm = Math.ceil(stageBounds.minYCm); cm <= Math.floor(stageBounds.maxYCm); cm++) {
      out.push(cm);
    }
    return out;
  }, [stageBounds]);

  const showSketchPane = canvasMode === 'sketch' || canvasMode === 'split' || canvasMode === 'onion';
  const showPdfPane = canvasMode === 'pdf' || canvasMode === 'split';

  const commitInlineNodeEdit = () => {
    if (!inlineNodeEdit) return;
    const target = ownedPrimitives.find((p) => p.id === inlineNodeEdit.primitiveId);
    if (!target) {
      setInlineNodeEdit(null);
      return;
    }
    const nextVals: Record<string, string> = {
      ...target.values,
      content: inlineNodeEdit.content.trim() || 'A',
      mode: inlineNodeEdit.mode,
    };
    if (inlineNodeEdit.anchor) nextVals.anchor = inlineNodeEdit.anchor;
    else delete nextVals.anchor;
    if (inlineNodeEdit.nodeId.trim()) nextVals.node_id = inlineNodeEdit.nodeId.trim();
    else delete nextVals.node_id;
    onApplyPrimitivePatch(target.id, nextVals, `Обновлена формула узла #${target.id}`);
    setInlineNodeEdit(null);
  };

  const hasAnyBeamerSpecs = useMemo(
    () => ownedPrimitives.some((p) => Boolean(p.values.beamer_spec)),
    [ownedPrimitives]
  );

  const selectedHasGroup = useMemo(
    () =>
      ownedPrimitives.some(
        (p) =>
          (p.id === selectedPrimitiveId || selectedPrimitiveIds.includes(p.id)) &&
          Boolean(p.values.group_id)
      ),
    [ownedPrimitives, selectedPrimitiveId, selectedPrimitiveIds]
  );

  return (
    <section
      aria-label="Холст и базовые инструменты TikZ"
      className={`flex flex-col h-full min-h-0 bg-[var(--tz-window)] border-r border-[var(--tz-outline)] ${
        highlightedZone ? 'ring-2 ring-inset ring-sky-500' : ''
      }`}
    >
      {/* Row 1: Canvas Mode + Photoshop Tracing Paper Opacity Slider + Grid/View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-2 py-1 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] relative">
        <div className="flex flex-wrap items-center gap-1.5">
          <div
            className="inline-flex items-center p-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
            role="group"
            aria-label="Режим отображения рисунка"
          >
            <button
              type="button"
              onClick={() => onChangeCanvasMode('sketch')}
              title="Интерактивный чертёж с живой 1:1 PDF-калькой под сеткой"
              className={`px-1.5 py-0.5 text-[11px] font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                canvasMode === 'sketch'
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                  : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
              }`}
            >
              Чертёж
            </button>
            <button
              type="button"
              onClick={() => onChangeCanvasMode('pdf')}
              title="Полноэкранный просмотр скомпилированного PDF"
              className={`px-1.5 py-0.5 text-[11px] font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                canvasMode === 'pdf'
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                  : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
              }`}
            >
              PDF
            </button>
            <button
              type="button"
              onClick={() => onChangeCanvasMode('split')}
              title="Два окна рядом: интерактивный чертёж и PDF"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                canvasMode === 'split'
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                  : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
              }`}
            >
              <span>2 окна</span>
            </button>
          </div>

          {/* Photoshop-Style Continuous Tracing Paper (Калька) Opacity Slider */}
          {pdfUnderlay && (
            <div
              data-testid="pdf-underlay-controls"
              className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[10.5px]"
            >
              <button
                type="button"
                data-testid="toggle-pdf-underlay-btn"
                aria-pressed={pdfUnderlay.enabled}
                onClick={onTogglePdfUnderlay}
                title="Включить или скрыть кальку рендера PDF 1:1 под сеткой (как слой в Photoshop)"
                className={`inline-flex items-center gap-1 px-1 py-0.5 rounded transition-colors whitespace-nowrap ${
                  pdfUnderlay.enabled
                    ? 'text-emerald-400 font-semibold'
                    : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                }`}
              >
                {pdfUnderlay.enabled ? (
                  <Eye className="w-3 h-3 shrink-0" />
                ) : (
                  <EyeOff className="w-3 h-3 shrink-0" />
                )}
                <span>{pdfUnderlay.loading ? 'Калька…' : 'Калька'}</span>
              </button>

              {(() => {
                const isRefMode = Boolean(referenceImageUrl && !pdfUnderlay.enabled);
                const activeOpacity = isRefMode
                  ? compositeLayers.referenceOpacity
                  : pdfUnderlay.opacity;
                const pct = Math.round(activeOpacity * 100);
                return (
                  <>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      data-testid="canvas-tracing-opacity-slider"
                      aria-label="Прозрачность кальки на холсте (0–100%)"
                      title={
                        isRefMode
                          ? `Прозрачность кальки-скана: ${pct}%`
                          : `Прозрачность живой PDF-кальки: ${pct}%`
                      }
                      value={pct}
                      onChange={(e) => {
                        const next = Number(e.target.value) / 100;
                        if (isRefMode) {
                          onChangeCompositeLayers?.({
                            referenceOpacity: next,
                            referenceVisible: next > 0,
                          });
                        } else {
                          if (!pdfUnderlay.enabled && next > 0) {
                            onTogglePdfUnderlay?.();
                          }
                          onChangePdfUnderlayOpacity?.(next);
                        }
                      }}
                      className="w-20 h-1.5 accent-[var(--tz-accent)] cursor-pointer"
                    />
                    <span className="font-mono tabular-nums text-[10px] text-[var(--tz-text)] w-7 text-right">
                      {pct}%
                    </span>
                  </>
                );
              })()}

              {pdfUnderlay.response?.pdfBase64 && onDownloadRenderedPdf && (
                <button
                  type="button"
                  data-testid="download-rendered-pdf-btn"
                  onClick={onDownloadRenderedPdf}
                  title={`Скачать векторный .pdf (${pdfUnderlay.response.engineLabelRu}, ${pdfUnderlay.response.renderMs} мс)`}
                  className="p-0.5 rounded hover:bg-[var(--tz-hover)] text-[var(--tz-link)]"
                >
                  <Download className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Cartesian / Polar (r-theta) / Isometric (30°) Grid Selector */}
          <select
            aria-label="Тип координатной сетки холста"
            data-testid="canvas-grid-mode-select"
            value={gridMode}
            onChange={(e) => setGridMode(e.target.value as CanvasGridMode)}
            className="px-1 py-0.5 rounded bg-[var(--tz-button)] text-[var(--tz-text)] border border-[var(--tz-outline)] text-[10.5px] font-medium"
          >
            <option value="cartesian">Декарт</option>
            <option value="polar">r·θ</option>
            <option value="isometric">30°</option>
          </select>

          <button
            type="button"
            onClick={() => setSmartSnapEnabled((v) => !v)}
            aria-pressed={smartSnapEnabled}
            title="Умное прилипание к центрам, узлам и краям фигур"
            className={`p-1 rounded border transition-colors ${
              smartSnapEnabled
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] border-[var(--tz-outline)]'
            }`}
          >
            <Crosshair className="w-3 h-3" />
          </button>

          {visualDiffReport && visualDiffReport.totalChanges > 0 && (
            <button
              type="button"
              data-testid="toggle-visual-diff-overlay-btn"
              onClick={() => setShowVisualDiffOverlay((v) => !v)}
              aria-pressed={showVisualDiffOverlay}
              title="Показать призрачный слой изменённых или удалённых фигур предыдущей ревизии с точечным откатом"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10.5px] font-mono ${
                showVisualDiffOverlay
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
              }`}
            >
              <GitCompareArrows className="w-3 h-3" />
              <span>{visualDiffReport.totalChanges}</span>
            </button>
          )}
        </div>

        {/* Right side: Fit 100% + Compact "Вид ▾" Popover */}
        <div className="flex items-center gap-1 text-[11px]">
          {(zoomPercent !== 100 || panOffsetSvg.x !== 0 || panOffsetSvg.y !== 0) && (
            <button
              type="button"
              onClick={handleFitView}
              title="Вписать лист в окно и сбросить панораму"
              aria-label="Вписать лист в окно"
              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] text-[10.5px] font-mono whitespace-nowrap"
            >
              <Maximize className="w-2.5 h-2.5" />
              <span>100%</span>
            </button>
          )}

          <div ref={viewPopoverContainerRef} className="relative">
            <button
              type="button"
              data-testid="canvas-view-sheet-popover-btn"
              aria-expanded={viewPopoverOpen}
              onClick={() => setViewPopoverOpen((v) => !v)}
              title="Параметры листа, шага привязки, масштаба камеры, колонки журнала и цветопробы"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10.5px] font-medium whitespace-nowrap ${
                viewPopoverOpen || activeJournalGauge.id !== 'none' || colorProofMode !== 'normal'
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                  : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Вид ▾</span>
            </button>

            {viewPopoverOpen && (
              <div
                data-testid="canvas-view-sheet-popover"
                className="absolute right-0 top-full mt-1 w-72 z-40 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] shadow-xl p-2.5 text-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--tz-muted)]">Диапазон листа:</span>
                  <select
                    aria-label="Диапазон координат холста и квадранты"
                    value={boundsPresetId}
                    onChange={(e) => {
                      setBoundsPresetId(e.target.value as StageBoundsPresetId);
                      setPanOffsetSvg({ x: 0, y: 0 });
                    }}
                    className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono text-[11px]"
                  >
                    {STAGE_BOUNDS_PRESETS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.labelRu}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[var(--tz-muted)]">
                    <Grid3x3 className="w-3 h-3" />
                    <span>Шаг привязки:</span>
                  </span>
                  <select
                    aria-label="Шаг привязки к сетке холста"
                    value={String(gridSnap)}
                    onChange={(e) => setGridSnap(Number(e.target.value) as GridSnapCm)}
                    className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono text-[11px]"
                  >
                    <option value="0.25">0.25 см</option>
                    <option value="0.1">0.10 см</option>
                    <option value="0">Свободно</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[var(--tz-muted)]">
                    <ZoomIn className="w-3 h-3" />
                    <span>Масштаб камеры:</span>
                  </span>
                  <select
                    aria-label="Масштаб камеры холста"
                    value={String(zoomPercent)}
                    onChange={(e) => setZoomPercent(Number(e.target.value))}
                    className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono text-[11px]"
                  >
                    {[50, 75, 100, 125, 150, 200].map((z) => (
                      <option key={z} value={z}>
                        {z}%
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--tz-muted)]">Колонка журнала:</span>
                  <select
                    aria-label="Эталон полосы набора научного журнала"
                    value={journalGaugeId}
                    onChange={(e) => onChangeJournalGaugeId(e.target.value as JournalGaugeId)}
                    className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono text-[11px]"
                  >
                    {JOURNAL_COLUMN_GAUGES.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.shortLabelRu}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--tz-muted)]">Цветопроба:</span>
                  <select
                    aria-label="Цветопроба холста для печати"
                    value={colorProofMode}
                    onChange={(e) => onChangeColorProofMode(e.target.value as ColorProofMode)}
                    className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] text-[var(--tz-text)] border border-[var(--tz-outline)] text-[11px]"
                  >
                    <option value="normal">Цветная (норма)</option>
                    <option value="grayscale">Ч/Б печать</option>
                    <option value="deuteranopia">Дейтеранопия</option>
                  </select>
                </div>

                {canvasMode === 'onion' && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--tz-muted)]">Прозрачность PDF:</span>
                    <select
                      aria-label="Прозрачность слоя PDF в режиме Калька"
                      value={String(onionOpacity)}
                      onChange={(e) => setOnionOpacity(Number(e.target.value) as 0.3 | 0.55 | 0.8)}
                      className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono text-[11px]"
                    >
                      <option value="0.3">PDF 30%</option>
                      <option value="0.55">PDF 55%</option>
                      <option value="0.8">PDF 80%</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Schematic Icon Palette (IEC/GOST Circuits, ChemFig Rings, PGFPlots, Optics, Automata) */}
      <div
        data-testid="package-canvas-palette"
        className="flex flex-wrap items-center justify-between gap-1 px-2 py-1 bg-[var(--tz-window)] border-b border-[var(--tz-outline)] text-[11px]"
      >
        {/* Domain Family Icon Strip */}
        <div
          role="tablist"
          aria-label="Семейство инженерных пакетов"
          className="inline-flex items-center p-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] gap-0.5"
        >
          {(
            [
              'circuitikz',
              'chemfig',
              'pgfplots',
              'physics-optics',
              'mechanics',
              'automata',
              'tikz-clean',
            ] as const
          ).map((famId) => {
            const meta = PACKAGE_FAMILY_META[famId];
            const isFamActive = pkgFamilyId === famId;
            return (
              <button
                key={famId}
                type="button"
                role="tab"
                data-testid={`pkg-family-${famId}`}
                aria-selected={isFamActive}
                title={meta.tooltipRu}
                onClick={() => setPkgFamilyId(famId)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10.5px] font-medium transition-colors whitespace-nowrap ${
                  isFamActive
                    ? 'bg-[var(--tz-panel)] text-[var(--tz-link)] shadow-xs font-semibold'
                    : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                }`}
              >
                <PackageSchematicIcon familyId={famId} className="w-3.5 h-3.5 shrink-0" />
                <span className={isFamActive ? 'inline' : 'hidden 2xl:inline'}>{meta.shortRu}</span>
              </button>
            );
          })}
        </div>

        {/* Schematic Symbol Tool Buttons for Active Family */}
        <div className="flex flex-wrap items-center gap-1">
          {PACKAGE_CANVAS_TOOLS.filter((t) => t.familyId === pkgFamilyId).map((tool) => {
            const active = activeTool === tool.id;
            const techBadge = PACKAGE_TOOL_TECH_BADGE[tool.id];
            return (
              <button
                key={tool.id}
                type="button"
                data-testid={`pkg-tool-${tool.id}`}
                aria-pressed={active}
                aria-label={tool.titleRu}
                title={`${tool.titleRu} — ${tool.conceptSummaryRu}`}
                onClick={() => onSelectTool(active ? 'select' : tool.id)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10.5px] font-mono font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[var(--tz-accent)] text-white border-[var(--tz-accent)]'
                    : 'bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border-[var(--tz-outline)]'
                }`}
              >
                <PackageSchematicIcon toolId={tool.id} className="w-4 h-3.5 shrink-0" />
                <span>{techBadge}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* E03: Horizontal Split: 38px Left Vertical CAD Tool Rail + Main Stage Area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div
          role="toolbar"
          aria-orientation="vertical"
          aria-label="Вертикальная палитра инструментов САПР"
          data-testid="canvas-vertical-tool-rail"
          className="w-10 shrink-0 flex flex-col items-center gap-1 py-1.5 px-1 bg-[var(--tz-panel)] border-r border-[var(--tz-outline)] overflow-y-auto"
        >
          {[
            { id: 'select' as const, label: 'Выбор и ручки (V)', key: 'V', Icon: MousePointer },
            { id: 'marquee' as const, label: 'Рамка выделения (B)', key: 'B', Icon: BoxSelect },
          ].map((item) => {
            const active = activeTool === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTool(item.id)}
                aria-pressed={active}
                aria-label={item.label}
                title={item.label}
                className={`w-8 h-7 flex flex-col items-center justify-center rounded border transition-colors shrink-0 ${
                  active
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                    : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:bg-[var(--tz-hover)] hover:text-[var(--tz-text)] border-transparent'
                }`}
              >
                <item.Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}

          <div className="w-6 border-t border-[var(--tz-outline)] my-0.5" aria-hidden="true" />

          {PRIMITIVE_TOOLS.map((tool) => {
            const Icon = TOOL_ICONS[tool.id];
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onSelectTool(tool.id)}
                aria-pressed={isActive}
                aria-label={`Инструмент ${tool.titleRu} (${tool.hotkey})`}
                title={`${tool.titleRu} (${tool.hotkey})`}
                className={`w-8 h-7 flex items-center justify-center rounded border transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                    : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:bg-[var(--tz-hover)] hover:text-[var(--tz-text)] border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}

          <div className="w-6 border-t border-[var(--tz-outline)] my-0.5" aria-hidden="true" />

          {/* Contextual tools filtered by the active Atomic Figure Specialization Profile */}
          {isContextualToolVisible('arc3') && (
            <button
              type="button"
              data-testid="tool-arc3-btn"
              onClick={() => {
                setArc3DraftPts([]);
                onSelectTool('arc3');
              }}
              aria-pressed={activeTool === 'arc3'}
              aria-label="Дуга окружности по 3 точкам (горячая клавиша G)"
              title="Дуга окружности по 3 точкам P1 → Pmid → P2 (G)"
              className={`w-8 h-7 flex items-center justify-center rounded border transition-colors shrink-0 ${
                activeTool === 'arc3'
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                  : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:bg-[var(--tz-hover)] hover:text-[var(--tz-text)] border-transparent'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
          )}

          {isContextualToolVisible('polygon') && (
            <button
              type="button"
              onClick={() => {
                setPolyDraftPts([]);
                onSelectTool('polygon');
              }}
              aria-pressed={activeTool === 'polygon'}
              aria-label="Замкнутый полигон -- cycle или ломаная по точкам (горячая клавиша P)"
              title="Многоугольник (-- cycle) или ломаная по точкам (P)"
              className={`w-8 h-7 flex items-center justify-center rounded border transition-colors shrink-0 ${
                activeTool === 'polygon'
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                  : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:bg-[var(--tz-hover)] hover:text-[var(--tz-text)] border-transparent'
              }`}
            >
              <Pentagon className="w-3.5 h-3.5" />
            </button>
          )}

          {isContextualToolVisible('callout') && (
            <button
              type="button"
              onClick={() => onSelectTool('callout')}
              aria-pressed={activeTool === 'callout'}
              aria-label="Размерная выноска ГОСТ / ISO |<->| (горячая клавиша D)"
              title="Размерная выноска ГОСТ |<->| (D)"
              className={`w-8 h-7 flex items-center justify-center rounded border transition-colors shrink-0 ${
                activeTool === 'callout'
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                  : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:bg-[var(--tz-hover)] hover:text-[var(--tz-text)] border-transparent'
              }`}
            >
              <MoveHorizontal className="w-3.5 h-3.5" />
            </button>
          )}

          {isContextualToolVisible('measure') && (
            <button
              type="button"
              onClick={() => {
                setMeasureRay(null);
                onSelectTool('measure');
              }}
              aria-pressed={activeTool === 'measure'}
              aria-label="Линейка-измеритель расстояний и углов (горячая клавиша M)"
              title="Линейка-транспортир ΔX, ΔY, L, ∠° (M)"
              className={`w-8 h-7 flex items-center justify-center rounded border transition-colors shrink-0 ${
                activeTool === 'measure'
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                  : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:bg-[var(--tz-hover)] hover:text-[var(--tz-text)] border-transparent'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
            </button>
          )}

          {isContextualToolVisible('eyedropper') && (
            <button
              type="button"
              onClick={() => onSelectTool('eyedropper')}
              aria-pressed={activeTool === 'eyedropper'}
              aria-label="Пипетка стиля контура и заливки (горячая клавиша I)"
              title="Пипетка стиля контура и заливки (I)"
              className={`w-8 h-7 flex items-center justify-center rounded border transition-colors shrink-0 ${
                activeTool === 'eyedropper'
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                  : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:bg-[var(--tz-hover)] hover:text-[var(--tz-text)] border-transparent'
              }`}
            >
              <Pipette className="w-3.5 h-3.5" />
            </button>
          )}

          {activeTool === 'digitize' && (
            <button
              type="button"
              onClick={() => onSelectTool('select')}
              title={`Оцифровка (${digitizerPointsCm.length}) · Стоп`}
              className="w-8 h-7 flex items-center justify-center rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 shrink-0"
            >
              <ScanLine className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="w-6 border-t border-[var(--tz-outline)] my-0.5" aria-hidden="true" />

          {onOpenProfileWorkshop && (
            <button
              type="button"
              data-testid="rail-profile-workshop-btn"
              onClick={onOpenProfileWorkshop}
              aria-label={`Мастерская профиля: ${activeProfileSpec.quickWorkshopLabelRu}`}
              title={`Открыть генератор текущего профиля «${activeProfileSpec.shortLabelRu}»: ${activeProfileSpec.quickWorkshopLabelRu}`}
              className="w-8 h-7 flex items-center justify-center rounded border border-[var(--tz-accent)]/50 bg-[var(--tz-accent)]/15 hover:bg-[var(--tz-accent)]/25 text-[var(--tz-link)] text-[10px] font-mono font-bold shrink-0"
            >
              +М
            </button>
          )}

          <button
            type="button"
            data-testid="rail-toggle-all-tools-btn"
            onClick={() => setShowAllRailTools((v) => !v)}
            aria-pressed={showAllRailTools}
            aria-label={
              showAllRailTools
                ? 'Оставить только инструменты текущего профиля рисунка'
                : 'Показать все дополнительные инструменты палитры'
            }
            title={
              showAllRailTools
                ? `Скрыть неиспользуемые инструменты (оставить профиль «${activeProfileSpec.shortLabelRu}»)`
                : 'Показать все дополнительные инструменты (Дуга, Полигон, Выноска, Линейка, Пипетка)'
            }
            className={`w-8 h-5 flex items-center justify-center rounded text-[10px] font-mono shrink-0 ${
              showAllRailTools
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
            }`}
          >
            {showAllRailTools ? '−' : '⋯'}
          </button>
        </div>

        {/* Main Stage Body */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-2 p-2 overflow-y-auto bg-[var(--tz-inset)]">
          {showSketchPane && (
            <div className="flex-1 min-h-[250px] flex flex-col rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] overflow-hidden">
              {(Boolean(handleDrag || moveDrag || (dragStart && draftPreview)) ||
                activeTool !== 'select') && (
                <div className="flex items-center justify-between gap-2 px-3 py-1 text-xs border-b border-[var(--tz-outline)] bg-[var(--tz-panel)]">
                  <div className="flex items-center gap-1.5 text-[var(--tz-muted)] min-w-0 truncate">
                    <span className="font-medium text-[var(--tz-text)] shrink-0">Инструмент</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate text-[11px] font-mono tabular-nums">
                      {handleDrag
                        ? `Правка ручки «${handleDrag.handleId}» у #${handleDrag.primitiveId}${handleDrag.snappedNodeId ? ` → привязка (${handleDrag.snappedNodeId})` : ''}`
                        : activeTool === 'arc3'
                          ? `Дуга по 3 точкам: кликните точку ${arc3DraftPts.length + 1}/3 на холсте`
                          : dragStart && draftPreview
                            ? `Черновик: ${draftPreview.metricsLabelRu} · ${draftPreview.tikzCommand}`
                            : moveDrag
                              ? `Сдвиг (${moveDrag.ids.length} шт.): ΔX ${moveDrag.deltaCm.x >= 0 ? '+' : ''}${moveDrag.deltaCm.x.toFixed(2)}см, ΔY ${moveDrag.deltaCm.y >= 0 ? '+' : ''}${moveDrag.deltaCm.y.toFixed(2)}см`
                              : activeTool === 'measure'
                                ? 'Потяните линейку между двумя точками для замера ΔX, ΔY, L и угла ∠°'
                                : activeTool === 'marquee'
                                  ? 'Растяните рамку для группового выделения и выравнивания примитивов'
                                  : `Растяните курсором на листе: «${
                                      PACKAGE_CANVAS_TOOLS.find((t) => t.id === activeTool)?.titleRu ??
                                      PRIMITIVE_TOOLS.find((t) => t.id === activeTool)?.titleRu ??
                                      activeTool
                                    }»`}
                    </span>
                  </div>
                </div>
              )}

            {/* P08: Quick Inline Node Formula Editor on Double-Click */}
            {inlineNodeEdit && (
              <form
                data-testid="inline-node-editor"
                onSubmit={(e) => {
                  e.preventDefault();
                  commitInlineNodeEdit();
                }}
                className="px-3 py-1.5 bg-[var(--tz-inset)] border-b border-[var(--tz-accent)] flex flex-wrap items-center gap-1.5 text-xs"
              >
                <span className="font-mono text-[11px] text-[var(--tz-link)] font-semibold shrink-0">
                  Узел #{inlineNodeEdit.primitiveId}:
                </span>
                <select
                  aria-label="Режим текста узла"
                  value={inlineNodeEdit.mode}
                  onChange={(e) =>
                    setInlineNodeEdit({ ...inlineNodeEdit, mode: e.target.value as 'math' | 'text' })
                  }
                  className="px-1.5 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono text-[11px]"
                >
                  <option value="math">$math$</option>
                  <option value="text">text</option>
                </select>
                <input
                  type="text"
                  autoFocus
                  value={inlineNodeEdit.content}
                  onChange={(e) => setInlineNodeEdit({ ...inlineNodeEdit, content: e.target.value })}
                  aria-label="Формула или подпись узла"
                  className="flex-1 min-w-[130px] px-2 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono text-xs"
                />
                <input
                  type="text"
                  value={inlineNodeEdit.nodeId}
                  onChange={(e) => setInlineNodeEdit({ ...inlineNodeEdit, nodeId: e.target.value })}
                  placeholder="ID (напр. L1)"
                  aria-label="Символическое имя узла TikZ"
                  className="w-24 px-2 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono text-[11px]"
                />
                <select
                  aria-label="Якорь узла TikZ"
                  value={inlineNodeEdit.anchor}
                  onChange={(e) => setInlineNodeEdit({ ...inlineNodeEdit, anchor: e.target.value })}
                  className="px-1.5 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono text-[11px]"
                >
                  {ALLOWED_NODE_ANCHORS.map((anc) => (
                    <option key={anc || 'default'} value={anc}>
                      {anc || 'center'}
                    </option>
                  ))}
                </select>
                <div className="inline-flex items-center gap-0.5">
                  {['\\alpha', '\\lambda', '\\omega', '\\Delta', '\\frac{a}{b}', '\\text{}'].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() =>
                        setInlineNodeEdit((prev) =>
                          prev ? { ...prev, content: `${prev.content}${sym}` } : null
                        )
                      }
                      className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-mono text-[10.5px]"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  aria-label="Сохранить подпись узла"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--tz-accent)] text-white font-medium"
                >
                  <Check className="w-3 h-3" />
                  <span>ОК</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInlineNodeEdit(null)}
                  aria-label="Отменить быструю правку узла"
                  className="p-0.5 rounded hover:bg-[var(--tz-hover)] text-[var(--tz-muted)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* P36: Active Multi-Vertex Polygon / Polyline Commit Strip */}
            {activeTool === 'polygon' && polyDraftPts.length > 0 && (
              <div
                data-testid="polygon-draft-bar"
                className="px-3 py-1.5 bg-[var(--tz-inset)] border-b border-[var(--tz-accent)] flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span className="font-mono text-[11px] text-[var(--tz-text)]">
                  Контур: отмечено вершин <strong>{polyDraftPts.length}</strong> (кликните первую точку для замыкания)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={polyDraftPts.length < 3}
                    onClick={() => {
                      onCreatePolygonFromGesture(polyDraftPts, true);
                      setPolyDraftPts([]);
                    }}
                    className="px-2.5 py-0.5 rounded bg-[var(--tz-accent)] text-white disabled:opacity-45 font-medium whitespace-nowrap"
                  >
                    Замкнуть (-- cycle)
                  </button>
                  <button
                    type="button"
                    disabled={polyDraftPts.length < 2}
                    onClick={() => {
                      onCreatePolygonFromGesture(polyDraftPts, false);
                      setPolyDraftPts([]);
                    }}
                    className="px-2.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] disabled:opacity-45 border border-[var(--tz-outline)] whitespace-nowrap"
                  >
                    Оставить ломаную
                  </button>
                  <button
                    type="button"
                    onClick={() => setPolyDraftPts([])}
                    className="px-2 py-0.5 text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
                  >
                    Сброс
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 flex items-center justify-center p-2 bg-white text-slate-900 overflow-hidden">
              <svg
                ref={svgRef}
                data-testid="tikz-sketch-canvas"
                viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                onWheel={handleWheelZoom}
                onPointerEnter={() => setIsCanvasHovered(true)}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onContextMenu={handleCanvasContextMenu}
                className={`w-full h-full max-h-full select-none border border-slate-200 bg-white ${
                  colorProofMode === 'grayscale'
                    ? 'grayscale contrast-125'
                    : colorProofMode === 'deuteranopia'
                      ? 'hue-rotate-15 saturate-75'
                      : ''
                } ${
                  spaceHeld || panDrag
                    ? 'cursor-grabbing'
                    : activeTool === 'select'
                      ? 'cursor-default'
                      : 'cursor-crosshair'
                }`}
              >
                <defs>
                  <pattern id="cm-grid" width={PX_PER_CM} height={PX_PER_CM} patternUnits="userSpaceOnUse">
                    <path
                      d={`M ${PX_PER_CM} 0 L 0 0 0 ${PX_PER_CM}`}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                    <path
                      d={`M ${PX_PER_CM / 2} 0 L ${PX_PER_CM / 2} ${PX_PER_CM} M 0 ${PX_PER_CM / 2} L ${PX_PER_CM} ${PX_PER_CM / 2}`}
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="0.75"
                    />
                  </pattern>
                  <marker
                    id="sketch-arrow"
                    viewBox="0 0 10 10"
                    refX="8.5"
                    refY="5"
                    markerWidth="6.5"
                    markerHeight="6.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 10 5 L 0 8.5 L 2.2 5 z" fill="#0f172a" />
                  </marker>
                  <marker
                    id="onion-pdf-arrow"
                    viewBox="0 0 10 10"
                    refX="8.5"
                    refY="5"
                    markerWidth="6.5"
                    markerHeight="6.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 10 5 L 0 8.5 L 2.2 5 z" fill="#7c3aed" />
                  </marker>
                  <marker
                    id="ghost-arrow"
                    viewBox="0 0 10 10"
                    refX="8.5"
                    refY="5"
                    markerWidth="6.5"
                    markerHeight="6.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 10 5 L 0 8.5 L 2.2 5 z" fill="rgba(2, 132, 199, 0.62)" />
                  </marker>
                  {/* P38: ГОСТ 2.306 / TikZ patterns vector hatchings */}
                  <pattern id="sketch-hatch-ne" width="8" height="8" patternUnits="userSpaceOnUse">
                    <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#475569" strokeWidth="1" />
                  </pattern>
                  <pattern id="sketch-hatch-nw" width="8" height="8" patternUnits="userSpaceOnUse">
                    <path d="M-2,6 l4,4 M0,0 l8,8 M6,-2 l4,4" stroke="#475569" strokeWidth="1" />
                  </pattern>
                  <pattern id="sketch-hatch-cross" width="8" height="8" patternUnits="userSpaceOnUse">
                    <path d="M0,8 l8,-8 M0,0 l8,8" stroke="#64748b" strokeWidth="0.9" />
                  </pattern>
                  <pattern id="sketch-hatch-dots" width="6" height="6" patternUnits="userSpaceOnUse">
                    <circle cx="3" cy="3" r="1" fill="#475569" />
                  </pattern>
                  <pattern id="sketch-hatch-horiz" width="8" height="6" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="3" x2="8" y2="3" stroke="#475569" strokeWidth="1" />
                  </pattern>
                </defs>

                {/* White Sheet Hit Surface */}
                <rect
                  data-bg-surface="true"
                  x={-baseW}
                  y={-baseH}
                  width={baseW * 3}
                  height={baseH * 3}
                  fill="#ffffff"
                />

                {/* Z1: Coordinate Grid & Non-Duplicated Centimeter Rulers */}
                {compositeLayers.gridVisible && (
                  <g data-testid="canvas-grid-layer" opacity={compositeLayers.gridOpacity}>
                    {gridMode === 'cartesian' && (
                      <rect
                        data-bg-surface="true"
                        x={-baseW}
                        y={-baseH}
                        width={baseW * 3}
                        height={baseH * 3}
                        fill="url(#cm-grid)"
                      />
                    )}

                    {/* F05: Polar (r–θ) & Isometric (30°/60°) Coordinate Grids */}
                    {gridMode === 'polar' && (
                      <g data-testid="canvas-polar-grid" className="pointer-events-none">
                        {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map((rCm) => (
                          <circle
                            key={`pr-${rCm}`}
                            cx={cmToSvgX(gridOriginCm.x)}
                            cy={cmToSvgY(gridOriginCm.y)}
                            r={rCm * PX_PER_CM}
                            fill="none"
                            stroke={Number.isInteger(rCm) ? '#cbd5e1' : '#f1f5f9'}
                            strokeWidth={Number.isInteger(rCm) ? 1 : 0.75}
                          />
                        ))}
                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                          const rad = (deg * Math.PI) / 180;
                          const ox = cmToSvgX(gridOriginCm.x);
                          const oy = cmToSvgY(gridOriginCm.y);
                          return (
                            <line
                              key={`pa-${deg}`}
                              x1={ox}
                              y1={oy}
                              x2={ox + Math.cos(rad) * 480}
                              y2={oy - Math.sin(rad) * 480}
                              stroke={deg % 90 === 0 ? '#cbd5e1' : '#e2e8f0'}
                              strokeWidth={deg % 90 === 0 ? 1 : 0.7}
                            />
                          );
                        })}
                      </g>
                    )}

                    {gridMode === 'isometric' && (
                      <g data-testid="canvas-isometric-grid" className="pointer-events-none">
                        {Array.from({ length: 21 }, (_, idx) => idx - 10).map((k) => {
                          const yOff = k * 50;
                          const dx = 700;
                          const dy = dx * Math.tan(Math.PI / 6);
                          const cx = cmToSvgX(gridOriginCm.x);
                          const cy = cmToSvgY(gridOriginCm.y) + yOff;
                          return (
                            <g key={`iso-${k}`}>
                              <line x1={cx - dx} y1={cy + dy} x2={cx + dx} y2={cy - dy} stroke="#e2e8f0" strokeWidth={0.8} />
                              <line x1={cx - dx} y1={cy - dy} x2={cx + dx} y2={cy + dy} stroke="#e2e8f0" strokeWidth={0.8} />
                            </g>
                          );
                        })}
                      </g>
                    )}

                    {/* Zero-axes highlight when negative quadrants are active (P05) */}
                    {stageBounds.minXCm < 0 && (
                      <line
                        x1={cmToSvgX(0)}
                        y1={0}
                        x2={cmToSvgX(0)}
                        y2={baseH}
                        stroke="#94a3b8"
                        strokeWidth={1.3}
                        strokeDasharray="4 3"
                        className="pointer-events-none"
                      />
                    )}
                    {stageBounds.minYCm < 0 && (
                      <line
                        x1={0}
                        y1={cmToSvgY(0)}
                        x2={baseW}
                        y2={cmToSvgY(0)}
                        stroke="#94a3b8"
                        strokeWidth={1.3}
                        strokeDasharray="4 3"
                        className="pointer-events-none"
                      />
                    )}

                    {/* Centimeter Rulers: Single Origin "0" (Zero Duplication in Bottom-Left Corner!) */}
                    {xTickIntegers.map((cm, idx) => {
                      const isLast = idx === xTickIntegers.length - 1;
                      return (
                        <text
                          key={`x-${cm}`}
                          x={cmToSvgX(cm) + 4}
                          y={baseH - 5}
                          fontSize={9.5}
                          fontFamily="JetBrains Mono, monospace"
                          fill="#94a3b8"
                          className="pointer-events-none"
                        >
                          {isLast ? `${cm} см` : String(cm)}
                        </text>
                      );
                    })}
                    {yTickIntegers
                      .filter((cm) => {
                        if (cm === 0 && xTickIntegers.includes(0)) return false;
                        // Prevent any Y label from colliding with the bottom-left X ruler row
                        if (cmToSvgY(cm) > baseH - 18) return false;
                        return true;
                      })
                      .map((cm, idx, arr) => {
                        const isLast = idx === arr.length - 1;
                        return (
                          <text
                            key={`y-${cm}`}
                            x={4}
                            y={cmToSvgY(cm) - 4}
                            fontSize={9.5}
                            fontFamily="JetBrains Mono, monospace"
                            fill="#94a3b8"
                            className="pointer-events-none"
                          >
                            {isLast ? `${cm} см` : String(cm)}
                          </text>
                        );
                      })}
                  </g>
                )}

                {/* Stage Sheet Boundary */}
                <rect
                  data-bg-surface="true"
                  x={0}
                  y={0}
                  width={baseW}
                  height={baseH}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth={1.2}
                />

                {/* Z2: Reference Bitmap Scan / PNG Underlay with Continuous Opacity */}
                {referenceImageUrl && compositeLayers.referenceVisible && (
                  <image
                    data-testid="canvas-reference-scan-underlay"
                    href={referenceImageUrl}
                    x={0}
                    y={0}
                    width={baseW}
                    height={baseH}
                    preserveAspectRatio="xMidYMid meet"
                    opacity={compositeLayers.referenceOpacity}
                    className="pointer-events-none"
                  />
                )}

                {/* Z3: Live Server-Rendered PDF Underlay (1:1 Physical cm <-> PostScript pt Feedback Layer) */}
                {pdfUnderlay?.enabled && pdfUnderlay.response?.pngDataUrl && (
                  <image
                    data-testid="canvas-real-pdf-underlay"
                    href={pdfUnderlay.response.pngDataUrl}
                    x={0}
                    y={0}
                    width={baseW}
                    height={baseH}
                    preserveAspectRatio="none"
                    opacity={pdfUnderlay.opacity}
                    className="pointer-events-none"
                  />
                )}

                {/* P14: Onion-Skin Semi-Transparent Compiled PDF Overlay */}
                {canvasMode === 'onion' && pdfState.lastGoodPrimitives.length > 0 && (
                  <g data-testid="tikz-onion-layer" opacity={onionOpacity} className="pointer-events-none">
                    {pdfState.lastGoodPrimitives.map((item) =>
                      renderPrimitiveSvg(item, pdfState.lastGoodPrimitives, false, '#6d28d9')
                    )}
                    {pdfState.hasCustomNodesNote && (
                      <text
                        x={40}
                        y={baseH - 22}
                        fontSize={11}
                        fontFamily="Georgia, serif"
                        fill="#6d28d9"
                      >
                        {pdfState.hasCustomNodesNote}
                      </text>
                    )}
                  </g>
                )}

                {/* Faint origin ghost when moving objects */}
                {moveDrag &&
                  moveDrag.ids.map((id) => {
                    const orig = ownedPrimitives.find((p) => p.id === id);
                    if (!orig) return null;
                    return (
                      <g key={`ghost-orig-${id}`} opacity={0.28} className="pointer-events-none">
                        {renderPrimitiveSvg(orig, ownedPrimitives, false, '#64748b')}
                      </g>
                    );
                  })}

                {/* F11: Visual Revision Diff Ghost Overlay + 1-Click Selective Revert */}
                {showVisualDiffOverlay && visualDiffReport && (
                  <g data-testid="canvas-visual-diff-ghosts">
                    {[
                      ...visualDiffReport.removed.map((p) => ({ prim: p, kind: 'removed' as const })),
                      ...visualDiffReport.modified.map((m) => ({ prim: m.before, kind: 'modified' as const })),
                    ].map(({ prim, kind }) => (
                      <g
                        key={`diff-${kind}-${prim.id}`}
                        opacity={0.45}
                        className="cursor-pointer"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onRevertSinglePrimitiveFromDiff?.(prim.id);
                        }}
                      >
                        <title>
                          {kind === 'removed'
                            ? `Удалённый объект #${prim.id} — кликните для восстановления`
                            : `Прежние координаты #${prim.id} — кликните для возврата`}
                        </title>
                        {renderPrimitiveSvg(
                          prim,
                          ownedPrimitives,
                          false,
                          kind === 'removed' ? '#e11d48' : '#d97706'
                        )}
                      </g>
                    ))}
                  </g>
                )}

                {/* Z4: Interactive Vector Layer (Package Objects + Primitives + Handles) */}
                {compositeLayers.vectorVisible && (
                  <g data-testid="canvas-vector-layer" opacity={compositeLayers.vectorOpacity}>
                    {packageObjects.map((pkgObj) => renderPackageObjectSvg(pkgObj))}
                    {livePrimitives.map((item) =>
                      renderPrimitiveSvg(item, livePrimitives, true, '#0f172a')
                    )}
                    {renderInteractiveHandlesSvg()}
                  </g>
                )}

                {/* P02: Smart Snap Alignment Guides */}
                {renderSmartSnapGuidesSvg()}

                {/* Muted Live Ghost Shape Preview while drawing */}
                {renderGhostDraftSvg()}
                {renderPackageGhostDraftSvg()}

                {/* F02: Live 3-Point Circular Arc Ghost Preview */}
                {activeTool === 'arc3' && arc3DraftPts.length > 0 && (
                  <g data-testid="canvas-arc3-draft" className="pointer-events-none">
                    {arc3DraftPts.length === 1 ? (
                      <line
                        x1={cmToSvgX(arc3DraftPts[0].x)}
                        y1={cmToSvgY(arc3DraftPts[0].y)}
                        x2={cmToSvgX(cursorCm.x)}
                        y2={cmToSvgY(cursorCm.y)}
                        stroke="#0284c7"
                        strokeWidth={1.7}
                        strokeDasharray="5 3"
                      />
                    ) : (
                      (() => {
                        const geom = computeThreePointArcGeometry(
                          arc3DraftPts[0],
                          arc3DraftPts[1],
                          { x: cursorCm.x, y: cursorCm.y },
                          24
                        );
                        return (
                          <polyline
                            points={geom.sampledPoints
                              .map((p) => `${cmToSvgX(p.xCm)},${cmToSvgY(p.yCm)}`)
                              .join(' ')}
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth={2}
                            strokeDasharray="6 3"
                          />
                        );
                      })()
                    )}
                    {arc3DraftPts.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={cmToSvgX(pt.x)}
                        cy={cmToSvgY(pt.y)}
                        r={4.2}
                        fill="#ffffff"
                        stroke="#0284c7"
                        strokeWidth={1.6}
                      />
                    ))}
                  </g>
                )}

                {/* P36: Live Multi-Vertex Polygon Ghost Preview */}
                {activeTool === 'polygon' && polyDraftPts.length > 0 && (
                  <g data-testid="canvas-polygon-draft" className="pointer-events-none">
                    <polyline
                      points={[
                        ...polyDraftPts.map((p) => `${cmToSvgX(p.xCm)},${cmToSvgY(p.yCm)}`),
                        `${cmToSvgX(cursorCm.x)},${cmToSvgY(cursorCm.y)}`,
                      ].join(' ')}
                      fill="rgba(2, 132, 199, 0.08)"
                      stroke="rgba(2, 132, 199, 0.72)"
                      strokeWidth={1.9}
                      strokeDasharray="5 3"
                    />
                    {polyDraftPts.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={cmToSvgX(p.xCm)}
                        cy={cmToSvgY(p.yCm)}
                        r={idx === 0 ? 4.8 : 3.5}
                        fill={idx === 0 ? '#10b981' : '#ffffff'}
                        stroke="#0284c7"
                        strokeWidth={1.5}
                      />
                    ))}
                  </g>
                )}

                {/* P43: Plot Digitizer Picked Points Overlay */}
                {digitizerPointsCm.length > 0 && (
                  <g data-testid="canvas-digitizer-points" className="pointer-events-none">
                    {digitizerPointsCm.map((pt, idx) => {
                      const px = cmToSvgX(pt.x);
                      const py = cmToSvgY(pt.y);
                      return (
                        <g key={idx}>
                          <circle cx={px} cy={py} r={4} fill="rgba(16, 185, 129, 0.25)" stroke="#059669" strokeWidth={1.4} />
                          <text x={px + 6} y={py - 4} fontSize={9} fontFamily="JetBrains Mono, monospace" fill="#047857">
                            #{idx + 1}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* P03: Marquee Multi-Selection Lasso Box */}
                {marqueeBox && (
                  <rect
                    data-testid="canvas-marquee-box"
                    x={Math.min(cmToSvgX(marqueeBox.a.x), cmToSvgX(marqueeBox.b.x))}
                    y={Math.min(cmToSvgY(marqueeBox.a.y), cmToSvgY(marqueeBox.b.y))}
                    width={Math.abs(cmToSvgX(marqueeBox.b.x) - cmToSvgX(marqueeBox.a.x))}
                    height={Math.abs(cmToSvgY(marqueeBox.b.y) - cmToSvgY(marqueeBox.a.y))}
                    fill="rgba(14, 165, 233, 0.12)"
                    stroke="#0284c7"
                    strokeWidth={1.3}
                    strokeDasharray="4 2"
                    className="pointer-events-none"
                  />
                )}

                {/* P05: Temporary Ruler-Protractor Measurement Overlay */}
                {measureRay && (
                  <g data-testid="canvas-measure-overlay" className="pointer-events-none">
                    {(() => {
                      const x1 = cmToSvgX(measureRay.a.x);
                      const y1 = cmToSvgY(measureRay.a.y);
                      const x2 = cmToSvgX(measureRay.b.x);
                      const y2 = cmToSvgY(measureRay.b.y);
                      const dx = measureRay.b.x - measureRay.a.x;
                      const dy = measureRay.b.y - measureRay.a.y;
                      const dist = Math.hypot(dx, dy);
                      const deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
                      return (
                        <>
                          <line x1={x1} y1={y1} x2={x2} y2={y1} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
                          <line x1={x2} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
                          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e11d48" strokeWidth={2} strokeDasharray="5 3" />
                          <circle cx={x1} cy={y1} r={3.5} fill="#e11d48" />
                          <circle cx={x2} cy={y2} r={3.5} fill="#e11d48" />
                          <rect
                            x={(x1 + x2) / 2 - 96}
                            y={Math.max(vbY + 6, (y1 + y2) / 2 - 26)}
                            width={192}
                            height={20}
                            rx={3}
                            fill="rgba(15, 23, 42, 0.86)"
                          />
                          <text
                            x={(x1 + x2) / 2}
                            y={Math.max(vbY + 19, (y1 + y2) / 2 - 13)}
                            textAnchor="middle"
                            fontSize={10}
                            fontFamily="JetBrains Mono, monospace"
                            fill="#f8fafc"
                          >
                            {`L=${dist.toFixed(2)}см · Δ(${dx.toFixed(2)},${dy.toFixed(2)}) · ${deg}°`}
                          </text>
                        </>
                      );
                    })()}
                  </g>
                )}

                {/* P28: Scientific Journal Column Gauge Boundary Overlay */}
                {activeJournalGauge.id !== 'none' && (
                  <g data-testid="canvas-journal-gauge" className="pointer-events-none">
                    {(() => {
                      const gaugeX = Math.min(baseW - 4, cmToSvgX(activeJournalGauge.widthCm));
                      return (
                        <>
                          <line
                            x1={gaugeX}
                            y1={0}
                            x2={gaugeX}
                            y2={baseH}
                            stroke="#d97706"
                            strokeWidth={1.6}
                            strokeDasharray="6 3"
                          />
                          <rect x={Math.max(4, gaugeX - 166)} y={6} width={162} height={18} rx={3} fill="rgba(254, 243, 199, 0.94)" stroke="#d97706" strokeWidth={0.8} />
                          <text
                            x={Math.max(85, gaugeX - 85)}
                            y={18}
                            textAnchor="middle"
                            fontSize={9.5}
                            fontFamily="JetBrains Mono, monospace"
                            fill="#92400e"
                          >
                            {`Полоса ${activeJournalGauge.shortLabelRu} (${activeJournalGauge.widthCm}см)`}
                          </text>
                        </>
                      );
                    })()}
                  </g>
                )}

                {/* P60: 8-Sector Radial Pie-Menu in Pure SVG (egui::Area + Painter mirror, zero inline styles) */}
                {contextMenu && contextMenu.mode === 'pie' && (
                  <g data-testid="canvas-radial-pie-menu">
                    {RADIAL_PIE_SECTORS.map((sec) => {
                      const geom = buildAnnularSectorSvgPath(
                        contextMenu.svgX,
                        contextMenu.svgY,
                        25,
                        80,
                        sec.startDeg,
                        sec.endDeg
                      );
                      return (
                        <g
                          key={sec.id}
                          role="button"
                          aria-label={`Сектор меню ${sec.shortLabelRu} (${sec.hotkeyLabel})`}
                          data-testid={`pie-sector-${sec.id}`}
                          className="cursor-pointer group"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (sec.id === 'tool-select') {
                              onSelectTool('select');
                              setContextMenu(null);
                            } else if (sec.id === 'tool-line') {
                              onSelectTool('line');
                              setContextMenu(null);
                            } else if (sec.id === 'tool-arrow') {
                              onSelectTool('arrow');
                              setContextMenu(null);
                            } else if (sec.id === 'tool-polygon') {
                              setPolyDraftPts([]);
                              onSelectTool('polygon');
                              setContextMenu(null);
                            } else if (sec.id === 'tool-node') {
                              onSelectTool('node');
                              setContextMenu(null);
                            } else if (sec.id === 'act-eyedropper') {
                              if (contextMenu.primitiveId !== null) {
                                onEyedropperClickPrimitive?.(contextMenu.primitiveId, true);
                              }
                              onSelectTool('eyedropper');
                              setContextMenu(null);
                            } else if (sec.id === 'act-rotate45') {
                              if (contextMenu.primitiveId !== null) {
                                onRotatePrimitives([contextMenu.primitiveId], 45);
                              } else if (selectedPrimitiveIds.length > 0) {
                                onRotatePrimitives(selectedPrimitiveIds, 45);
                              }
                              setContextMenu(null);
                            } else if (sec.id === 'act-clone-or-list') {
                              const clampedX = Math.max(vbX + 4, Math.min(vbX + vbW - 252, contextMenu.svgX));
                              const clampedY = Math.max(vbY + 4, Math.min(vbY + vbH - 268, contextMenu.svgY));
                              setContextMenu({
                                ...contextMenu,
                                svgX: clampedX,
                                svgY: clampedY,
                                mode: 'list',
                              });
                            }
                          }}
                        >
                          <path
                            d={geom.pathD}
                            fill="rgba(15, 23, 42, 0.92)"
                            stroke="#38bdf8"
                            strokeWidth={1.1}
                            className="hover:fill-sky-800 transition-colors"
                          />
                          <text
                            x={geom.labelX}
                            y={geom.labelY + 3}
                            textAnchor="middle"
                            fontSize={9.5}
                            fontFamily="IBM Plex Sans, sans-serif"
                            fill="#f8fafc"
                            className="pointer-events-none font-medium"
                          >
                            {sec.shortLabelRu}
                          </text>
                        </g>
                      );
                    })}
                    <g
                      role="button"
                      aria-label="Закрыть радиальное меню"
                      className="cursor-pointer"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setContextMenu(null);
                      }}
                    >
                      <circle
                        cx={contextMenu.svgX}
                        cy={contextMenu.svgY}
                        r={23}
                        fill="#0284c7"
                        stroke="#e0f2fe"
                        strokeWidth={1.4}
                      />
                      <text
                        x={contextMenu.svgX}
                        y={contextMenu.svgY + 3.5}
                        textAnchor="middle"
                        fontSize={9.5}
                        fontFamily="JetBrains Mono, monospace"
                        fill="#ffffff"
                        className="pointer-events-none"
                      >
                        ✕
                      </text>
                    </g>
                  </g>
                )}

                {/* P34: Native Right-Click Context Menu List inside SVG foreignObject (zero inline styles) */}
                {contextMenu && contextMenu.mode === 'list' && (
                  <foreignObject
                    data-testid="canvas-context-menu"
                    x={contextMenu.svgX}
                    y={contextMenu.svgY}
                    width={248}
                    height={264}
                  >
                    <div className="w-[240px] rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] text-[var(--tz-text)] shadow-xl p-1.5 text-[11.5px] flex flex-col gap-0.5 font-sans">
                      {contextMenu.primitiveId !== null ? (
                        (() => {
                          const ctxPrim = ownedPrimitives.find(
                            (p) => p.id === contextMenu.primitiveId
                          );
                          const canTransformGeometry =
                            !ctxPrim ||
                            (ctxPrim.tool !== 'circle' && ctxPrim.tool !== 'node') ||
                            Boolean(ctxPrim.values.poly_points);
                          const canToggleCallout =
                            !ctxPrim || ctxPrim.tool === 'line' || ctxPrim.tool === 'arrow';
                          return (
                            <>
                              <div className="px-2 py-1 text-[10.5px] font-mono tabular-nums text-[var(--tz-muted)] border-b border-[var(--tz-outline)] flex items-center justify-between gap-2">
                                <span className="text-[var(--tz-text)] font-medium">Объект #{contextMenu.primitiveId}</span>
                                {ctxPrim && (
                                  <span>Стр. {ctxPrim.lineNumber}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  onDuplicatePrimitive(contextMenu.primitiveId!);
                                  setContextMenu(null);
                                }}
                                className="w-full px-2 py-1 rounded hover:bg-[var(--tz-hover)] flex items-center gap-1.5 text-left whitespace-nowrap"
                              >
                                <Copy className="w-3 h-3 text-[var(--tz-link)]" />
                                <span>Дублировать со сдвигом</span>
                              </button>
                              {canTransformGeometry && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onRotatePrimitives([contextMenu.primitiveId!], 45);
                                      setContextMenu(null);
                                    }}
                                    className="w-full px-2 py-1 rounded hover:bg-[var(--tz-hover)] flex items-center gap-1.5 text-left whitespace-nowrap"
                                  >
                                    <RotateCw className="w-3 h-3 text-[var(--tz-link)]" />
                                    <span>Повернуть +45°</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onMirrorPrimitives([contextMenu.primitiveId!], 'x');
                                      setContextMenu(null);
                                    }}
                                    className="w-full px-2 py-1 rounded hover:bg-[var(--tz-hover)] flex items-center gap-1.5 text-left whitespace-nowrap"
                                  >
                                    <FlipHorizontal2 className="w-3 h-3 text-[var(--tz-link)]" />
                                    <span>Отразить по оси X</span>
                                  </button>
                                </>
                              )}
                              {canToggleCallout && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onToggleCalloutOnPrimitive(contextMenu.primitiveId!);
                                    setContextMenu(null);
                                  }}
                                  className="w-full px-2 py-1 rounded hover:bg-[var(--tz-hover)] flex items-center gap-1.5 text-left whitespace-nowrap"
                                >
                                  <MoveHorizontal className="w-3 h-3 text-amber-500" />
                                  <span>Размерная выноска |&lt;-&gt;|</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenCadModal('foreach');
                                  setContextMenu(null);
                                }}
                                className="w-full px-2 py-1 rounded hover:bg-[var(--tz-hover)] flex items-center gap-1.5 text-left whitespace-nowrap"
                              >
                                <Repeat className="w-3 h-3 text-emerald-500" />
                                <span>Массив \foreach…</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onDetachPrimitive(contextMenu.primitiveId!);
                                  setContextMenu(null);
                                }}
                                className="w-full px-2 py-1 rounded hover:bg-[var(--tz-hover)] flex items-center gap-1.5 text-left whitespace-nowrap"
                              >
                                <Unlink className="w-3 h-3 text-[var(--tz-muted)]" />
                                <span>Чистый TikZ без маркера</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeletePrimitive(contextMenu.primitiveId!);
                                  setContextMenu(null);
                                }}
                                className="w-full px-2 py-1 rounded hover:bg-rose-500/15 text-rose-500 flex items-center gap-1.5 text-left whitespace-nowrap"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Удалить из .tex</span>
                              </button>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <div className="px-2 py-1 text-[10px] font-mono tabular-nums text-[var(--tz-muted)] border-b border-[var(--tz-outline)]">
                            Точка ({contextMenu.clickCm.x.toFixed(2)}, {contextMenu.clickCm.y.toFixed(2)} см)
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onQuickInsertStampAt(
                                'optics-convex-lens',
                                contextMenu.clickCm.x,
                                contextMenu.clickCm.y
                              );
                              setContextMenu(null);
                            }}
                            className="w-full px-2 py-1 rounded hover:bg-[var(--tz-hover)] flex items-center gap-1.5 text-left whitespace-nowrap"
                          >
                            <Compass className="w-3 h-3 text-[var(--tz-link)]" />
                            <span>Штамп: Собирающая линза</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onQuickInsertStampAt(
                                'circuit-resistor-iec',
                                contextMenu.clickCm.x,
                                contextMenu.clickCm.y
                              );
                              setContextMenu(null);
                            }}
                            className="w-full px-2 py-1 rounded hover:bg-[var(--tz-hover)] flex items-center gap-1.5 text-left whitespace-nowrap"
                          >
                            <Compass className="w-3 h-3 text-emerald-500" />
                            <span>Штамп: Резистор ГОСТ/IEC</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onCreateCalloutFromGesture(contextMenu.clickCm, {
                                x: +(contextMenu.clickCm.x + 1.8).toFixed(2),
                                y: contextMenu.clickCm.y,
                              });
                              setContextMenu(null);
                            }}
                            className="w-full px-2 py-1 rounded hover:bg-[var(--tz-hover)] flex items-center gap-1.5 text-left whitespace-nowrap"
                          >
                            <MoveHorizontal className="w-3 h-3 text-amber-500" />
                            <span>Размерная выноска здесь</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onOpenCadModal('stamps');
                              setContextMenu(null);
                            }}
                            className="w-full px-2 py-1 rounded hover:bg-[var(--tz-hover)] flex items-center gap-1.5 text-left whitespace-nowrap"
                          >
                            <Repeat className="w-3 h-3 text-[var(--tz-link)]" />
                            <span>Все штампы и \foreach…</span>
                          </button>
                        </>
                      )}
                    </div>
                  </foreignObject>
                )}
              </svg>
            </div>

            {/* Single Polyline/Polygon Cycle Toggle Strip */}
            {primarySelectedLive && primarySelectedLive.values.poly_points && (
              <div className="px-2.5 py-1 border-t border-[var(--tz-outline)] bg-[var(--tz-inset)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-[var(--tz-muted)]">
                  Контур #{primarySelectedLive.id}: кликните зелёный «+» на ребре для вставки вершины, Alt+клик по вершине — удалить
                </span>
                {onTogglePolyClosed && (
                  <button
                    type="button"
                    data-testid="toggle-poly-closed-btn"
                    onClick={() => onTogglePolyClosed(primarySelectedLive.id)}
                    className="px-2 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-mono text-[10.5px]"
                  >
                    {primarySelectedLive.values.poly_closed === 'cycle'
                      ? 'Разомкнуть контур'
                      : 'Замкнуть (-- cycle)'}
                  </button>
                )}
              </div>
            )}

            {/* Compact Multi-Selection Alignment & Group/Ungroup Bar */}
            {selectedPrimitiveIds.length >= 2 && (
              <div
                data-testid="multi-select-toolbar"
                className="px-2.5 py-1.5 border-t border-[var(--tz-accent)] bg-[var(--tz-inset)] flex flex-wrap items-center justify-between gap-1.5 text-[11px]"
              >
                <span className="font-medium text-[var(--tz-text)]">
                  Выбрано объектов: <strong className="font-mono tabular-nums">{selectedPrimitiveIds.length}</strong>
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {onGroupSelected && (
                    <button
                      type="button"
                      data-testid="group-selected-btn"
                      onClick={onGroupSelected}
                      title="Объединить выделенные объекты в единую группу (Ctrl+G)"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--tz-accent)] text-white whitespace-nowrap"
                    >
                      <Link2 className="w-3 h-3" />
                      <span>В группу</span>
                    </button>
                  )}
                  {selectedHasGroup && onUngroupSelected && (
                    <button
                      type="button"
                      data-testid="ungroup-selected-btn"
                      onClick={onUngroupSelected}
                      title="Разгруппировать выбранные объекты (Ctrl+Shift+G)"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                    >
                      <Unlink className="w-3 h-3" />
                      <span>Разгрупп.</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onAlignSelected('left')}
                    title="Выровнять по левому краю"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                  >
                    <AlignStartVertical className="w-3 h-3" />
                    <span>Влево</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAlignSelected('center-x')}
                    title="Выровнять центры по X"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                  >
                    <AlignCenterVertical className="w-3 h-3" />
                    <span>Центр X</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAlignSelected('right')}
                    title="Выровнять по правому краю"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                  >
                    <AlignEndVertical className="w-3 h-3" />
                    <span>Вправо</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAlignSelected('center-y')}
                    title="Выровнять центры по горизонтальной оси Y"
                    className="px-2 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                  >
                    Ось Y
                  </button>
                  {selectedPrimitiveIds.length >= 3 && (
                    <button
                      type="button"
                      onClick={() => onAlignSelected('distribute-x')}
                      title="Равномерный шаг между центрами по X"
                      className="px-2 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                    >
                      Шаг по X
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onDeleteSelectedPrimitives}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 whitespace-nowrap"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Удалить ({selectedPrimitiveIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Clean Single-Line CAD Telemetry Footer (Zero Layer/Tree Duplication) */}
            <div
              data-testid="canvas-layers-beamer-strip"
              className="px-2.5 py-1 border-t border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-wrap items-center justify-between gap-2 text-[10.5px] shrink-0"
            >
              <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums text-[var(--tz-muted)]">
                <span className="text-[var(--tz-text)] font-medium">
                  {gridMode === 'polar' && cursorCm.polarRadiusCm !== undefined
                    ? `r=${cursorCm.polarRadiusCm.toFixed(2)} см · ∠${cursorCm.polarAngleDeg ?? 0}°`
                    : `X ${cursorCm.x.toFixed(2)} · Y ${cursorCm.y.toFixed(2)} см`}
                </span>
                <span aria-hidden="true">·</span>
                <span>{stageBounds.labelRu}</span>
                <span aria-hidden="true">·</span>
                <span>{gridSnap > 0 ? `шаг ${gridSnap} см` : 'свободно'}</span>

                {(isBeamerActive ||
                  figureProfileId === 'beamer-slides' ||
                  hasAnyBeamerSpecs ||
                  activeBeamerSlide !== null) && (
                  <div
                    data-testid="canvas-beamer-stepper"
                    className="inline-flex items-center gap-0.5 ml-1"
                  >
                    <span className="font-sans">Beamer:</span>
                    {[null, 1, 2, 3, 4].map((s) => {
                      const active = activeBeamerSlide === s;
                      return (
                        <button
                          key={s === null ? 'all' : s}
                          type="button"
                          onClick={() => onChangeActiveBeamerSlide(s)}
                          aria-label={s === null ? 'Beamer: все кадры' : `Beamer: кадр ${s}`}
                          className={`px-1 py-0.5 rounded border text-[10px] ${
                            active
                              ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)] font-semibold'
                              : 'bg-[var(--tz-window)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
                          }`}
                        >
                          {s === null ? 'Все' : `<${s}>`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {onOpenLayersObjectsDock && (
                <button
                  type="button"
                  data-testid="open-layers-objects-dock-btn"
                  onClick={onOpenLayersObjectsDock}
                  title="Открыть единую панель слоёв, прозрачности кальки и дерева объектов справа"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] font-medium whitespace-nowrap"
                >
                  <Layers className="w-3 h-3 text-[var(--tz-link)]" />
                  <span>
                    Слои и объекты ({ownedPrimitives.length + packageObjects.length})
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {showPdfPane && (
          <div className="flex-1 min-h-[240px] flex flex-col rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs border-b border-[var(--tz-outline)] bg-[var(--tz-panel)]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--tz-text)]">Предпросмотр PDF (XeLaTeX)</span>
                <span aria-hidden="true">·</span>
                {pdfState.status === 'current' && (
                  <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Актуален · ревизия #{pdfState.builtRevision}</span>
                  </span>
                )}
                {pdfState.status === 'stale' && (
                  <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>
                      Устарел: показана ревизия #{pdfState.builtRevision}, в коде #{sourceRevision}
                    </span>
                  </span>
                )}
                {pdfState.status === 'absent' && (
                  <span className="text-[var(--tz-muted)]">PDF ещё не собран для этого документа</span>
                )}
              </div>

              {pdfState.status !== 'current' && (
                <button
                  type="button"
                  onClick={onTriggerBuild}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-[var(--tz-accent)] text-white hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
                >
                  <Play className="w-3 h-3" />
                  <span>Собрать актуальный PDF</span>
                </button>
              )}
            </div>

            {pdfState.status === 'absent' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
                <p className="text-sm font-medium text-[var(--tz-text)]">
                  Точный PDF ещё не сгенерирован
                </p>
                <p className="text-xs text-[var(--tz-muted)] max-w-md">
                  В TikZarium авторитетным остаётся обычный файл <code className="font-mono">.tex</code>. Нажмите «Сохранить и собрать PDF», чтобы проверить ошибки и получить точный лист документа.
                </p>
                <button
                  type="button"
                  onClick={onTriggerBuild}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded bg-[var(--tz-accent)] text-white hover:opacity-95 transition-opacity whitespace-nowrap"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Сохранить и собрать PDF</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-3 bg-slate-200/80 dark:bg-slate-900/60 relative">
                {pdfState.status === 'stale' && (
                  <div
                    role="status"
                    className="w-full mb-2 px-3 py-1.5 text-xs rounded border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 flex items-center justify-between gap-2"
                  >
                    <span>
                      Внимание (T6): ниже показан последний успешный PDF (ревизия #{pdfState.builtRevision}). Исходник уже на ревизии #{sourceRevision}.
                    </span>
                  </div>
                )}

                <div className="w-full max-w-[540px] bg-white text-slate-950 shadow-sm border border-slate-300 p-4">
                  <svg
                    ref={pdfSvgRef}
                    data-testid="tikz-pdf-preview"
                    viewBox={`0 0 ${baseW} ${baseH}`}
                    onClick={(e) => {
                      const svg = pdfSvgRef.current;
                      if (!svg) return;
                      const rect = svg.getBoundingClientRect();
                      const normX = (e.clientX - rect.left) / Math.max(1, rect.width);
                      const normY = (e.clientY - rect.top) / Math.max(1, rect.height);
                      const xCm = +(stageBounds.minXCm + (normX * baseW) / PX_PER_CM).toFixed(2);
                      const yCm = +(stageBounds.maxYCm - (normY * baseH) / PX_PER_CM).toFixed(2);
                      onSyncTexJump({ x: xCm, y: yCm });
                    }}
                    className={`w-full max-h-[280px] bg-white cursor-crosshair ${
                      colorProofMode === 'grayscale'
                        ? 'grayscale contrast-125'
                        : colorProofMode === 'deuteranopia'
                          ? 'hue-rotate-15 saturate-75'
                          : ''
                    }`}
                  >
                    <defs>
                      <marker
                        id="pdf-arrow"
                        viewBox="0 0 10 10"
                        refX="8.5"
                        refY="5"
                        markerWidth="6.5"
                        markerHeight="6.5"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1.5 L 10 5 L 0 8.5 L 2.2 5 z" fill="#000000" />
                      </marker>
                      <pattern id="pdf-hatch-ne" width="8" height="8" patternUnits="userSpaceOnUse">
                        <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#1e293b" strokeWidth="1" />
                      </pattern>
                      <pattern id="pdf-hatch-nw" width="8" height="8" patternUnits="userSpaceOnUse">
                        <path d="M-2,6 l4,4 M0,0 l8,8 M6,-2 l4,4" stroke="#1e293b" strokeWidth="1" />
                      </pattern>
                      <pattern id="pdf-hatch-cross" width="8" height="8" patternUnits="userSpaceOnUse">
                        <path d="M0,8 l8,-8 M0,0 l8,8" stroke="#334155" strokeWidth="0.9" />
                      </pattern>
                      <pattern id="pdf-hatch-dots" width="6" height="6" patternUnits="userSpaceOnUse">
                        <circle cx="3" cy="3" r="1" fill="#1e293b" />
                      </pattern>
                      <pattern id="pdf-hatch-horiz" width="8" height="6" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="3" x2="8" y2="3" stroke="#1e293b" strokeWidth="1" />
                      </pattern>
                    </defs>
                    {pdfUnderlay?.response?.pngDataUrl ? (
                      <image
                        data-testid="pdf-pane-real-raster"
                        href={pdfUnderlay.response.pngDataUrl}
                        x={0}
                        y={0}
                        width={baseW}
                        height={baseH}
                        preserveAspectRatio="none"
                      />
                    ) : (
                      <>
                        {pdfState.lastGoodPrimitives.map((item) =>
                          renderPrimitiveSvg(item, pdfState.lastGoodPrimitives, false, '#000000')
                        )}
                        {pdfState.hasCustomNodesNote && (
                          <text
                            x={40}
                            y={baseH - 20}
                            fontSize={11}
                            fontFamily="Georgia, serif"
                            fill="#1e293b"
                          >
                            {pdfState.hasCustomNodesNote}
                          </text>
                        )}
                      </>
                    )}
                  </svg>
                  <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Crosshair className="w-3 h-3 text-sky-600" />
                      <span>SyncTeX: кликните по фигуре или подписи в PDF для перехода к строке .tex</span>
                    </span>
                    <span>{pdfState.builtAt ?? ''}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </section>
  );
};
