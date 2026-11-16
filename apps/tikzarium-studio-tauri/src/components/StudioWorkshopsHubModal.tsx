import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  Star,
  Shapes,
  Cpu,
  TrendingUp,
  GitCompareArrows,
  ExternalLink,
  Package,
  Check,
  Plus,
  BookOpen,
} from 'lucide-react';
import type { RevisionEntryInfo } from './PublicationAndHistoryModals';
import {
  WORKSHOP_CATALOG_ITEMS,
  calibratePrimitivesByTwoPointsInSource,
  computeBooleanContourInSource,
  computeSampleStatistics,
  computeVisualPrimitiveDiff,
  constructCircleTangentsInSource,
  detectRepeatedMagicNumbers,
  extractTikzsetStylesFromPreamble,
  insertElectricalCircuitElementIntoSource,
  insertGostFlowchartAutoLayoutIntoSource,
  insertLeastSquaresFitIntoSource,
  insertMechanicsBeamWithDiagramsIntoSource,
  insertOpticalBenchRayTraceIntoSource,
  insertParametricEllipseIntoSource,
  insertScientificGanttChartIntoSource,
  insertStatisticalPlotIntoSource,
  insertThreePointArcIntoSource,
  parameterizeMagicNumberIntoPreamble,
  revertSinglePrimitiveFromRevision,
  upsertQuickTikzsetStyleInPreamble,
} from '../domain/workspaceAndEngineeringStageBundle';
import type {
  BooleanOpKind,
  CircuitElementKind,
  RegressionModelKind,
  WorkshopCategoryId,
  WorkshopTargetId,
} from '../domain/workspaceAndEngineeringStageBundle';

import { ATOMIC_FIGURE_PROFILES, togglePackageInPreamble } from '../domain/atomicFigureProfile';
import type { AtomicFigureProfileId } from '../domain/atomicFigureProfile';
import { inspectPreambleConnections, parseDimensionToCm } from '../domain/tikzEngine';
import {
  EXTENSION_DOMAIN_GROUP_LABELS,
  TIKZ_EXTENSION_PACKAGES,
  buildTikzExtensionBundle,
  ensureExtensionPreambleRequirements,
  insertTikzExtensionIntoSource,
} from '../domain/tikzExtensionsSuite';
import type {
  CanvasPrimitiveSeed,
  ExtensionDomainGroup,
  ExtensionOutputMode,
  TikzExtensionId,
} from '../domain/tikzExtensionsSuite';
import {
  resolveManualAnchorForExtension,
  resolveManualDocumentMeta,
} from '../domain/pdfManualAnchors';
import { ROADMAP_STAGE_META } from '../domain/packageCanvasSemantics';
import type { RoadmapStageId } from '../domain/packageCanvasSemantics';

export type StudioHubTabId =
  | 'extensions'
  | 'catalog'
  | 'geometry'
  | 'engineering'
  | 'stats'
  | 'preamble-diff';

interface StudioWorkshopsHubModalProps {
  isOpen: boolean;
  initialTab?: StudioHubTabId;
  initialExtensionId?: TikzExtensionId;
  onClose: () => void;
  source: string;
  selectedPrimitiveIds: number[];
  revisions: RevisionEntryInfo[];
  pinnedIds: WorkshopTargetId[];
  onTogglePinWorkshop: (id: WorkshopTargetId) => void;
  onLaunchLegacyWorkshop: (id: WorkshopTargetId) => void;
  onApplyNewSource: (
    nextSource: string,
    summaryRu: string,
    selectIds?: number[]
  ) => void;
  figureProfileId?: AtomicFigureProfileId;
  onOpenManualAnchor?: (anchorId: string) => void;
}

const CATEGORY_LABELS: { id: WorkshopCategoryId; labelRu: string; stage: RoadmapStageId }[] = [
  { id: 'all', labelRu: 'Все мастерские', stage: 'ST-SCI' },
  { id: 'geometry-cad', labelRu: '1. Геометрия (ST-SCI)', stage: 'ST-SCI' },
  { id: 'domain-engineering', labelRu: '4. Инженерия (ST-ENG)', stage: 'ST-ENG' },
  { id: 'code-refactor', labelRu: 'Код и Преамбула', stage: 'ST-SCI' },
  { id: 'project-audit', labelRu: 'Аудит и Проект', stage: 'ST-SCI' },
  { id: 'plots-stats', labelRu: '8. Статистика (ST-DATA, в конце)', stage: 'ST-DATA' },
];

const EXT_STROKE_HEX: Record<string, string> = {
  black: '#e2e8f0',
  'blue!75!black': '#38bdf8',
  'red!75!black': '#fb7185',
  'teal!80!black': '#2dd4bf',
  'orange!85!black': '#fbbf24',
  'violet!80!black': '#a78bfa',
  'blue!8': '#38bdf8',
  'emerald!10': '#2dd4bf',
  'amber!14': '#fbbf24',
};

const MiniCanvasBundlePreview: React.FC<{ seeds: CanvasPrimitiveSeed[] }> = ({ seeds }) => {
  const toSvgX = (cmRaw: string | undefined) => {
    const cm = parseDimensionToCm(cmRaw ?? '1cm') ?? 1;
    return 18 + cm * 42;
  };
  const toSvgY = (cmRaw: string | undefined) => {
    const cm = parseDimensionToCm(cmRaw ?? '1cm') ?? 1;
    return 162 - cm * 40;
  };

  return (
    <svg
      viewBox="0 0 260 176"
      className="w-full h-32 rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)]"
      role="img"
      aria-label="Предпросмотр синхронного эскиза пакета расширения"
    >
      <defs>
        <marker
          id="ext-preview-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
        </marker>
      </defs>
      {[36, 76, 116, 156, 196, 236].map((gx) => (
        <line
          key={`gx-${gx}`}
          x1={gx}
          y1={8}
          x2={gx}
          y2={168}
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="1"
        />
      ))}
      {[28, 68, 108, 148].map((gy) => (
        <line
          key={`gy-${gy}`}
          x1={8}
          y1={gy}
          x2={252}
          y2={gy}
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="1"
        />
      ))}

      {seeds.map((s, idx) => {
        const stroke = EXT_STROKE_HEX[s.values.stroke_color ?? 'black'] ?? '#e2e8f0';
        const dash = s.values.line_style === 'dashed' ? '4 3' : undefined;
        const sw =
          s.values.stroke_width === 'very thick'
            ? 2.4
            : s.values.stroke_width === 'thick'
              ? 1.8
              : 1.3;

        if (s.tool === 'line' || s.tool === 'arrow') {
          return (
            <line
              key={idx}
              x1={toSvgX(s.values.start_x)}
              y1={toSvgY(s.values.start_y)}
              x2={toSvgX(s.values.end_x)}
              y2={toSvgY(s.values.end_y)}
              stroke={stroke}
              strokeWidth={sw}
              strokeDasharray={dash}
              markerEnd={s.tool === 'arrow' ? 'url(#ext-preview-arrow)' : undefined}
            />
          );
        }
        if (s.tool === 'rectangle') {
          const x1 = toSvgX(s.values.start_x);
          const y1 = toSvgY(s.values.start_y);
          const x2 = toSvgX(s.values.end_x);
          const y2 = toSvgY(s.values.end_y);
          const fill = s.values.fill_color
            ? EXT_STROKE_HEX[s.values.fill_color] ?? 'none'
            : 'none';
          return (
            <rect
              key={idx}
              x={Math.min(x1, x2)}
              y={Math.min(y1, y2)}
              width={Math.max(2, Math.abs(x2 - x1))}
              height={Math.max(2, Math.abs(y2 - y1))}
              stroke={stroke}
              strokeWidth={sw}
              fill={fill}
              fillOpacity={s.values.opacity ? Number(s.values.opacity) : fill === 'none' ? 0 : 0.2}
              rx="2"
            />
          );
        }
        if (s.tool === 'circle') {
          const cx = toSvgX(s.values.center_x);
          const cy = toSvgY(s.values.center_y);
          const rCm = parseDimensionToCm(s.values.radius ?? '0.35cm') ?? 0.35;
          const fill = s.values.fill_color
            ? EXT_STROKE_HEX[s.values.fill_color] ?? 'none'
            : 'none';
          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={Math.max(3, rCm * 40)}
              stroke={stroke}
              strokeWidth={sw}
              strokeDasharray={dash}
              fill={fill}
              fillOpacity={fill === 'none' ? 0 : 0.4}
            />
          );
        }
        if (s.tool === 'cubic') {
          const d = `M ${toSvgX(s.values.start_x)} ${toSvgY(s.values.start_y)} C ${toSvgX(
            s.values.control1_x
          )} ${toSvgY(s.values.control1_y)}, ${toSvgX(s.values.control2_x)} ${toSvgY(
            s.values.control2_y
          )}, ${toSvgX(s.values.end_x)} ${toSvgY(s.values.end_y)}`;
          return <path key={idx} d={d} stroke={stroke} strokeWidth={sw} fill="none" />;
        }
        if (s.tool === 'node') {
          const rawTxt = (s.values.content ?? '').replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '');
          return (
            <text
              key={idx}
              x={toSvgX(s.values.x)}
              y={toSvgY(s.values.y) + 3}
              textAnchor="middle"
              fontSize="10"
              fill="#f8fafc"
              className="font-mono"
            >
              {rawTxt.slice(0, 12) || 'node'}
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
};

export const StudioWorkshopsHubModal: React.FC<StudioWorkshopsHubModalProps> = ({
  isOpen,
  initialTab = 'extensions',
  initialExtensionId,
  onClose,
  source,
  selectedPrimitiveIds,
  revisions,
  pinnedIds,
  onTogglePinWorkshop,
  onLaunchLegacyWorkshop,
  onApplyNewSource,
  figureProfileId = 'core-geometry',
  onOpenManualAnchor,
}) => {
  const [activeTab, setActiveTab] = useState<StudioHubTabId>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<WorkshopCategoryId | 'profile'>('profile');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // --- Tab 0 (#1 Priority): TikZ Extension Packages Suite ---
  const [extGroupFilter, setExtGroupFilter] = useState<ExtensionDomainGroup>('all');
  const [extSearch, setExtSearch] = useState('');
  const [selectedExtId, setSelectedExtId] = useState<TikzExtensionId>(
    initialExtensionId ?? 'circuitikz'
  );
  const [selectedPresetByExt, setSelectedPresetByExt] = useState<Record<string, string>>({});
  const [extParamsByExt, setExtParamsByExt] = useState<Record<string, Record<string, string>>>({});
  const [extOutputMode, setExtOutputMode] = useState<ExtensionOutputMode>('hybrid');
  const [extOrigin, setExtOrigin] = useState({ x: '1.00', y: '0.90' });

  const preambleInspection = useMemo(() => inspectPreambleConnections(source), [source]);
  const loadedPkgSet = useMemo(
    () => new Set(preambleInspection.packages.map((p) => p.name)),
    [preambleInspection.packages]
  );

  const filteredExtensions = useMemo(() => {
    const q = extSearch.trim().toLowerCase();
    return TIKZ_EXTENSION_PACKAGES.filter((pkg) => {
      if (extGroupFilter !== 'all' && pkg.domainGroup !== extGroupFilter) return false;
      if (!q) return true;
      return (
        pkg.packageName.toLowerCase().includes(q) ||
        pkg.displayTitleRu.toLowerCase().includes(q) ||
        pkg.summaryRu.toLowerCase().includes(q) ||
        pkg.companionPackages.some((c) => c.toLowerCase().includes(q)) ||
        pkg.presets.some((pr) => pr.titleRu.toLowerCase().includes(q))
      );
    });
  }, [extGroupFilter, extSearch]);

  const activeExtSpec = useMemo(
    () =>
      TIKZ_EXTENSION_PACKAGES.find((p) => p.id === selectedExtId) ??
      filteredExtensions[0] ??
      TIKZ_EXTENSION_PACKAGES[0],
    [filteredExtensions, selectedExtId]
  );

  const activePresetId =
    selectedPresetByExt[activeExtSpec.id] ?? activeExtSpec.presets[0].id;

  const activeExtParams = useMemo(() => {
    const defaults = Object.fromEntries(
      activeExtSpec.paramFields.map((f) => [f.key, f.defaultValue])
    );
    return { ...defaults, ...(extParamsByExt[activeExtSpec.id] ?? {}) };
  }, [activeExtSpec, extParamsByExt]);

  const liveExtensionBundle = useMemo(
    () =>
      buildTikzExtensionBundle({
        extensionId: activeExtSpec.id,
        presetId: activePresetId,
        outputMode: extOutputMode,
        originXCm: Number(extOrigin.x) || 1.0,
        originYCm: Number(extOrigin.y) || 0.9,
        params: activeExtParams,
      }),
    [activeExtParams, activeExtSpec.id, activePresetId, extOrigin.x, extOrigin.y, extOutputMode]
  );

  const activeProfileSpec = useMemo(
    () =>
      ATOMIC_FIGURE_PROFILES.find((p) => p.id === figureProfileId) ??
      ATOMIC_FIGURE_PROFILES[0],
    [figureProfileId]
  );

  // Sync tab, optional target extension, and support Escape key dismissal when modal is open
  React.useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    if (initialExtensionId) {
      setSelectedExtId(initialExtensionId);
      setExtGroupFilter('all');
      setExtSearch('');
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [initialExtensionId, initialTab, isOpen, onClose]);

  // --- Tab 2: 2D Booleans, Arcs/Ellipses, Tangents & 2-Point Calibration (F02, F09, F10) ---
  const [boolReplaceOriginals, setBoolReplaceOriginals] = useState(false);
  const [boolHatch, setBoolHatch] = useState<string>('');
  const [tangentKind, setTangentKind] = useState<'outer' | 'inner' | 'both'>('outer');
  const [arcPts, setArcPts] = useState({
    x1: '1.10',
    y1: '1.60',
    xm: '2.40',
    ym: '2.85',
    x2: '3.70',
    y2: '1.60',
  });
  const [ellipseCfg, setEllipseCfg] = useState({
    cx: '3.10',
    cy: '1.90',
    rx: '1.35',
    ry: '0.75',
    rot: '25',
  });
  const [calCfg, setCalCfg] = useState({
    x1: '1.00',
    y1: '1.00',
    x2: '3.00',
    y2: '1.00',
    targetCm: '4.00',
    selectedOnly: false,
  });

  // --- Tab 3: Circuits, Optics, Mechanics Beams & ГОСТ 19.701 / Gantt (F12–F15) ---
  const [circuitKind, setCircuitKind] = useState<CircuitElementKind>('resistor-gost');
  const [circuitLabel, setCircuitLabel] = useState('\\qty{4.7}{\\kilo\\ohm}');
  const [circuitOrigin, setCircuitOrigin] = useState({ x: '1.40', y: '2.10' });

  const [opticsCfg, setOpticsCfg] = useState({
    focalCm: '1.05',
    objDistCm: '1.85',
    objHeightCm: '0.75',
  });

  const [beamCfg, setBeamCfg] = useState<{
    supportKind: 'simply-supported' | 'cantilever';
    spanM: string;
    pointKn: string;
    distKnM: string;
  }>({
    supportKind: 'simply-supported',
    spanM: '4.0',
    pointKn: '12',
    distKnM: '3.5',
  });

  const [flowDsl, setFlowDsl] = useState(
    'Начало -> Ввод сетки -> Расчёт МКЭ -> Сходимость? -> Вывод полей'
  );
  const [flowDir, setFlowDir] = useState<'horizontal' | 'vertical'>('horizontal');
  const [ganttText, setGanttText] = useState(
    'Аналитика и модель;1;2\nЧисленный расчёт;2;4\nВерификация стенда;3;6\nРукопись статьи;5;7'
  );

  // --- Tab 4: OLS Least-Squares Fit & BoxPlot/Histogram (F16) ---
  const [olsData, setOlsData] = useState(
    '1.0  1.18\n2.0  2.05\n3.0  2.88\n4.0  3.92\n5.0  4.76\n6.0  5.71'
  );
  const [olsModel, setOlsModel] = useState<RegressionModelKind>('linear');
  const [sampleRaw, setSampleRaw] = useState(
    '12.4, 13.8, 14.2, 14.9, 15.1, 15.6, 16.0, 16.5, 17.2, 23.4'
  );

  // --- Tab 5: Preamble \tikzset, Magic Number Parameterizer & Selective Visual Diff (F07, F08, F11) ---
  const [styleName, setStyleName] = useState('sensorNode');
  const [styleDef, setStyleDef] = useState('thick,draw=blue!75!black,fill=blue!8,rounded corners=3pt');
  const [customMacroNames, setCustomMacroNames] = useState<Record<string, string>>({});
  const [compareRevIdx, setCompareRevIdx] = useState<number>(0);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return WORKSHOP_CATALOG_ITEMS.filter((item) => {
      if (!q && categoryFilter === 'profile') {
        if (activeProfileSpec.primaryWorkshopCategory === 'all') return true;
        return (
          item.category === activeProfileSpec.primaryWorkshopCategory ||
          item.category === 'code-refactor' ||
          pinnedIds.includes(item.id)
        );
      }
      if (categoryFilter !== 'all' && categoryFilter !== 'profile' && item.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.titleRu.toLowerCase().includes(q) ||
        item.subtitleRu.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q) ||
        item.shortPinLabelRu.toLowerCase().includes(q)
      );
    });
  }, [activeProfileSpec.primaryWorkshopCategory, categoryFilter, pinnedIds, searchQuery]);

  const preambleStyles = useMemo(
    () => extractTikzsetStylesFromPreamble(source),
    [source]
  );

  const magicCandidates = useMemo(
    () => detectRepeatedMagicNumbers(source, selectedPrimitiveIds),
    [selectedPrimitiveIds, source]
  );

  const statsPreview = useMemo(() => computeSampleStatistics(sampleRaw), [sampleRaw]);

  const pastRevisions = useMemo(
    () => revisions.slice(0, Math.max(0, revisions.length - 1)).reverse(),
    [revisions]
  );
  const selectedPastRevision = pastRevisions[compareRevIdx] ?? pastRevisions[0] ?? null;

  const visualDiff = useMemo(() => {
    if (!selectedPastRevision) return null;
    return computeVisualPrimitiveDiff(selectedPastRevision.source, source);
  }, [selectedPastRevision, source]);

  if (!isOpen) return null;

  const handleOpenCatalogItem = (id: WorkshopTargetId) => {
    if (id === 'hub-extensions') {
      setActiveTab('extensions');
      return;
    }
    if (id === 'hub-geometry') {
      setActiveTab('geometry');
      return;
    }
    if (id === 'hub-engineering') {
      setActiveTab('engineering');
      return;
    }
    if (id === 'hub-stats') {
      setActiveTab('stats');
      return;
    }
    if (id === 'hub-preamble-diff') {
      setActiveTab('preamble-diff');
      return;
    }
    onLaunchLegacyWorkshop(id);
  };

  const handleInsertActiveExtension = (closeAfter: boolean) => {
    const res = insertTikzExtensionIntoSource(source, {
      extensionId: activeExtSpec.id,
      presetId: activePresetId,
      outputMode: extOutputMode,
      originXCm: Number(extOrigin.x) || 1.0,
      originYCm: Number(extOrigin.y) || 0.9,
      params: activeExtParams,
    });
    setStatusBanner(res.summaryRu);
    if (res.ok) {
      onApplyNewSource(res.nextSource, res.summaryRu, res.insertedIds);
      if (closeAfter) {
        onClose();
      }
    }
  };

  const handleConnectOnlyExtensionPreamble = () => {
    if (activeExtSpec.packageName === 'tikz') {
      const preRes = ensureExtensionPreambleRequirements(
        source,
        [],
        liveExtensionBundle.tikzLibraries
      );
      const msg =
        preRes.addedEntries.length > 0
          ? `В преамбулу подключены библиотеки ядра PGF: [${preRes.addedEntries.join(', ')}].`
          : 'Все выбранные библиотеки ядра PGF уже подключены в преамбуле.';
      setStatusBanner(msg);
      if (preRes.addedEntries.length > 0) {
        onApplyNewSource(preRes.nextSource, msg);
      }
      return;
    }

    const isLoaded = loadedPkgSet.has(activeExtSpec.packageName);
    if (isLoaded) {
      const disc = togglePackageInPreamble(source, activeExtSpec.packageName, false);
      setStatusBanner(disc.summaryRu);
      if (disc.ok) {
        onApplyNewSource(disc.nextSource, disc.summaryRu);
      }
      return;
    }

    const preRes = ensureExtensionPreambleRequirements(
      source,
      liveExtensionBundle.preambleRequirements,
      liveExtensionBundle.tikzLibraries
    );
    const msg =
      preRes.addedEntries.length > 0
        ? `В преамбулу рисунка подключены: [${preRes.addedEntries.join(', ')}].`
        : `Пакет ${activeExtSpec.packageName} уже подключён в преамбуле.`;
    setStatusBanner(msg);
    if (preRes.addedEntries.length > 0) {
      onApplyNewSource(preRes.nextSource, msg);
    }
  };

  const runBoolean = (op: BooleanOpKind) => {
    const res = computeBooleanContourInSource(source, selectedPrimitiveIds, op, {
      replaceOriginals: boolReplaceOriginals,
      hatchPattern: boolHatch || undefined,
    });
    setStatusBanner(res.summaryRu);
    if (res.ok) {
      onApplyNewSource(res.nextSource, res.summaryRu, res.insertedIds);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Единый каталог инженерных мастерских TikZarium"
      data-testid="studio-workshops-hub-modal"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] text-[var(--tz-text)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Window Titlebar */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[var(--tz-window)] border-b border-[var(--tz-outline)]">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-4 h-4 text-[var(--tz-link)] shrink-0" />
            <h2 className="text-sm font-semibold truncate">
              Инженерные мастерские и пакеты расширений TikZ
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono tabular-nums text-[var(--tz-muted)]">
              Выбрано объектов: {selectedPrimitiveIds.length} · Закреплено ★: {pinnedIds.length}/4
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть окно мастерских"
              className="p-1 rounded hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6-Tab Segmented Navigation (#1: TikZ Extension Packages) */}
        <div className="flex flex-wrap items-center gap-1 px-4 py-2 bg-[var(--tz-inset)] border-b border-[var(--tz-outline)] text-xs">
          <button
            type="button"
            data-testid="hub-tab-extensions"
            onClick={() => setActiveTab('extensions')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-semibold ${
              activeTab === 'extensions'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-cyan-400" />
            <span>Пакеты расширений TikZ (12)</span>
          </button>

          <button
            type="button"
            data-testid="hub-tab-catalog"
            onClick={() => setActiveTab('catalog')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium ${
              activeTab === 'catalog'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Каталог ★</span>
          </button>

          <button
            type="button"
            data-testid="hub-tab-geometry"
            onClick={() => setActiveTab('geometry')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium ${
              activeTab === 'geometry'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
            }`}
          >
            <Shapes className="w-3.5 h-3.5 text-sky-400" />
            <span>Булевы 2D и Дуги</span>
          </button>

          <button
            type="button"
            data-testid="hub-tab-engineering"
            onClick={() => setActiveTab('engineering')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium ${
              activeTab === 'engineering'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Цепи, Оптика и Балки</span>
          </button>

          <button
            type="button"
            data-testid="hub-tab-stats"
            onClick={() => setActiveTab('stats')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium ${
              activeTab === 'stats'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>МНК и BoxPlot (ST-DATA)</span>
          </button>

          <button
            type="button"
            data-testid="hub-tab-preamble-diff"
            onClick={() => setActiveTab('preamble-diff')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium ${
              activeTab === 'preamble-diff'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
            }`}
          >
            <GitCompareArrows className="w-3.5 h-3.5 text-violet-400" />
            <span>Макросы и Diff</span>
          </button>
        </div>

        {statusBanner && (
          <div className="px-4 py-1.5 bg-[var(--tz-window)] border-b border-[var(--tz-outline)] text-xs font-mono text-[var(--tz-link)] flex items-center justify-between gap-2">
            <span>{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
            >
              Скрыть
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 text-xs space-y-4">
          {/* ============================================================== */}
          {/* TAB 0 (#1 PRIORITY): Full TikZ Extension Packages Suite        */}
          {/* ============================================================== */}
          {activeTab === 'extensions' && (
            <div className="space-y-3" data-testid="extensions-workshop-panel">
              {/* Top Domain Group Filter + Search */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  {EXTENSION_DOMAIN_GROUP_LABELS.map((grp) => (
                    <button
                      key={grp.id}
                      type="button"
                      data-testid={`ext-group-${grp.id}`}
                      onClick={() => setExtGroupFilter(grp.id)}
                      className={`px-2.5 py-1 rounded border text-[11px] transition-colors ${
                        extGroupFilter === grp.id
                          ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)] font-semibold'
                          : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
                      }`}
                    >
                      {grp.labelRu}
                    </button>
                  ))}
                </div>
                <div className="relative min-w-[230px] flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-[var(--tz-muted)] absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={extSearch}
                    onChange={(e) => setExtSearch(e.target.value)}
                    placeholder="Пакет: circuitikz, chemfig, forest, timing…"
                    aria-label="Поиск пакета расширения TikZ"
                    className="w-full pl-8 pr-2.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[var(--tz-text)] text-xs"
                  />
                </div>
              </div>

              {/* Split Workspace: Left Package Navigator + Right Parametric Studio */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* Left Column: 12 Extension Package Studios */}
                <div className="lg:col-span-4 flex flex-col gap-1.5 max-h-[62vh] overflow-y-auto pr-0.5">
                  {filteredExtensions.map((pkg) => {
                    const isSelected = pkg.id === activeExtSpec.id;
                    const isLoaded =
                      pkg.packageName === 'tikz' || loadedPkgSet.has(pkg.packageName);
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        data-testid={`ext-pkg-btn-${pkg.id}`}
                        onClick={() => setSelectedExtId(pkg.id)}
                        className={`text-left p-2.5 rounded border transition-colors ${
                          isSelected
                            ? 'bg-[var(--tz-active)] border-[var(--tz-accent)] text-[var(--tz-text)]'
                            : 'bg-[var(--tz-window)] border-[var(--tz-outline)] hover:border-[var(--tz-muted)] text-[var(--tz-text)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-semibold text-[12px] text-[var(--tz-link)]">
                            {pkg.shortBadgeRu}
                          </span>
                          <span
                            className={`text-[10.5px] font-mono ${
                              isLoaded ? 'text-emerald-400' : 'text-[var(--tz-muted)]'
                            }`}
                          >
                            {isLoaded ? '● в преамбуле' : `${pkg.presets.length} шабл.`}
                          </span>
                        </div>
                        <div className="text-[11.5px] font-medium leading-snug mt-0.5">
                          {pkg.displayTitleRu}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Column: Selected Extension Constructor */}
                <div className="lg:col-span-8 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-3 space-y-2.5">
                  {/* Package Passport & Direct Preamble Connect */}
                  <div className="flex items-start justify-between gap-3 pb-2 border-b border-[var(--tz-outline)]">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h3 className="text-[13px] font-semibold text-[var(--tz-text)] truncate">
                        {activeExtSpec.displayTitleRu}
                      </h3>
                      <p className="text-[11px] text-[var(--tz-muted)] leading-snug">
                        {activeExtSpec.summaryRu}
                      </p>
                      <div className="text-[10.5px] font-mono text-emerald-400">
                        XeLaTeX: {activeExtSpec.xelatexNoteRu}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {onOpenManualAnchor && (() => {
                        const extAnchor = resolveManualAnchorForExtension(activeExtSpec.id);
                        const extDoc = resolveManualDocumentMeta(extAnchor.docId);
                        return (
                          <button
                            type="button"
                            data-testid="ext-open-pdf-manual-anchor-btn"
                            onClick={() => onOpenManualAnchor(extAnchor.id)}
                            title={`Открыть прямую точку в оригинальном руководстве ${extDoc.filename} (${extAnchor.section}, стр. ${extAnchor.page})`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-sky-500/45 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-[11px] font-medium whitespace-nowrap"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>
                              PDF: {extDoc.filename} · стр. {extAnchor.page}
                            </span>
                          </button>
                        );
                      })()}

                      <button
                        type="button"
                        data-testid="ext-connect-preamble-only-btn"
                        onClick={handleConnectOnlyExtensionPreamble}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-medium shrink-0 ${
                          activeExtSpec.packageName !== 'tikz' &&
                          loadedPkgSet.has(activeExtSpec.packageName)
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-rose-500/15 hover:text-rose-300'
                            : 'border-[var(--tz-outline)] bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)]'
                        }`}
                      >
                        {activeExtSpec.packageName !== 'tikz' &&
                        loadedPkgSet.has(activeExtSpec.packageName) ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>В преамбуле</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>В преамбулу</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Preset Selector */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-[var(--tz-muted)]">
                      Конструкция пакета ({activeExtSpec.presets.length} варианта):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {activeExtSpec.presets.map((pr) => {
                        const active = pr.id === activePresetId;
                        return (
                          <button
                            key={pr.id}
                            type="button"
                            data-testid={`ext-preset-${pr.id}`}
                            onClick={() =>
                              setSelectedPresetByExt((prev) => ({
                                ...prev,
                                [activeExtSpec.id]: pr.id,
                              }))
                            }
                            className={`text-left p-2 rounded border transition-colors ${
                              active
                                ? 'bg-[var(--tz-active)] border-[var(--tz-accent)] text-[var(--tz-text)]'
                                : 'bg-[var(--tz-inset)] border-[var(--tz-outline)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                            }`}
                          >
                            <div className="font-semibold text-[11.5px] text-[var(--tz-text)]">
                              {pr.titleRu}
                            </div>
                            <div className="text-[10.5px] text-[var(--tz-muted)] leading-snug mt-0.5">
                              {pr.summaryRu}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Parameters + Placement Origin */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {activeExtSpec.paramFields.map((field) => (
                      <label key={field.key} className="flex flex-col gap-0.5 text-[11px]">
                        <span className="text-[var(--tz-muted)] truncate">{field.labelRu}</span>
                        {field.kind === 'select' && field.options ? (
                          <select
                            value={activeExtParams[field.key] ?? field.defaultValue}
                            onChange={(e) =>
                              setExtParamsByExt((prev) => ({
                                ...prev,
                                [activeExtSpec.id]: {
                                  ...(prev[activeExtSpec.id] ?? {}),
                                  [field.key]: e.target.value,
                                },
                              }))
                            }
                            className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[var(--tz-text)] text-xs"
                          >
                            {field.options.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.labelRu}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.kind === 'number' ? 'number' : 'text'}
                            value={activeExtParams[field.key] ?? field.defaultValue}
                            onChange={(e) =>
                              setExtParamsByExt((prev) => ({
                                ...prev,
                                [activeExtSpec.id]: {
                                  ...(prev[activeExtSpec.id] ?? {}),
                                  [field.key]: e.target.value,
                                },
                              }))
                            }
                            className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[var(--tz-text)] font-mono text-xs"
                          />
                        )}
                      </label>
                    ))}

                    <label className="flex flex-col gap-0.5 text-[11px]">
                      <span className="text-[var(--tz-muted)]">X₀ (см)</span>
                      <input
                        type="number"
                        step="0.2"
                        value={extOrigin.x}
                        onChange={(e) => setExtOrigin((o) => ({ ...o, x: e.target.value }))}
                        className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[var(--tz-text)] font-mono tabular-nums text-xs"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5 text-[11px]">
                      <span className="text-[var(--tz-muted)]">Y₀ (см)</span>
                      <input
                        type="number"
                        step="0.2"
                        value={extOrigin.y}
                        onChange={(e) => setExtOrigin((o) => ({ ...o, y: e.target.value }))}
                        className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[var(--tz-text)] font-mono tabular-nums text-xs"
                      />
                    </label>
                  </div>

                  {/* Live Side-by-Side Preview: Vector Canvas Sketch + Preamble/Body LaTeX */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                    <div className="md:col-span-5 space-y-1">
                      <div className="text-[11px] font-medium text-[var(--tz-muted)]">
                        Синхронный эскиз на холсте ({liveExtensionBundle.canvasPrimitives.length} прим.):
                      </div>
                      <MiniCanvasBundlePreview seeds={liveExtensionBundle.canvasPrimitives} />
                    </div>

                    <div className="md:col-span-7 space-y-1">
                      <div className="text-[11px] font-medium text-[var(--tz-muted)]">
                        Патч преамбулы и LaTeX-код пакета:
                      </div>
                      <pre className="h-32 overflow-auto p-2 rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] font-mono text-[11px] leading-relaxed text-[var(--tz-text)]">
                        {[
                          '% --- Окно 1: Преамбула рисунка ---',
                          ...liveExtensionBundle.preamblePreviewLines,
                          '',
                          '% --- Окно 2: Код внутри tikzpicture ---',
                          ...liveExtensionBundle.nativeTexLines,
                        ].join('\n')}
                      </pre>
                    </div>
                  </div>

                  {liveExtensionBundle.engineWarningRu && (
                    <div className="px-2.5 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200 text-[11px]">
                      {liveExtensionBundle.engineWarningRu}
                    </div>
                  )}

                  {/* Output Mode Switch + Primary Insert Action */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--tz-outline)]">
                    <div
                      className="inline-flex flex-wrap items-center gap-1"
                      role="group"
                      aria-label="Режим генерации кода пакета"
                    >
                      {(
                        [
                          { id: 'hybrid', label: 'Гибрид: пакет + холст' },
                          { id: 'native-tex', label: 'Чистый LaTeX пакета' },
                          { id: 'canvas-n1', label: 'Только примитивы холста' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          data-testid={`ext-mode-${m.id}`}
                          onClick={() => setExtOutputMode(m.id)}
                          className={`px-2 py-1 rounded border text-[11px] ${
                            extOutputMode === m.id
                              ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)] font-medium'
                              : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        data-testid="insert-tikz-extension-btn"
                        onClick={() => handleInsertActiveExtension(false)}
                        className="px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] text-[var(--tz-text)] font-medium text-xs"
                      >
                        + Вставить ещё
                      </button>
                      <button
                        type="button"
                        data-testid="insert-and-close-tikz-extension-btn"
                        onClick={() => handleInsertActiveExtension(true)}
                        className="px-3.5 py-1.5 rounded bg-[var(--tz-accent)] text-white hover:opacity-95 font-semibold text-xs"
                      >
                        Вставить в рисунок
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: Unified Catalog + Pinned Favorites                      */}
          {/* ============================================================== */}
          {activeTab === 'catalog' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-[var(--tz-muted)] absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск мастерской: цепи, булевы, балка, сплайн, оцифровка, booktabs, таблица n1…"
                    aria-label="Поиск инженерного модуля"
                    className="w-full pl-8 pr-3 py-1.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[var(--tz-text)] text-xs"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    data-testid="hub-filter-profile-btn"
                    onClick={() => setCategoryFilter('profile')}
                    className={`px-2 py-1 rounded border text-[11px] ${
                      categoryFilter === 'profile'
                        ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)] font-medium'
                        : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
                    }`}
                  >
                    По профилю «{activeProfileSpec.shortLabelRu}»
                  </button>
                  {CATEGORY_LABELS.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      data-testid={`hub-filter-${cat.id}`}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-2 py-1 rounded border text-[11px] ${
                        categoryFilter === cat.id
                          ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)] font-medium'
                          : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
                      }`}
                    >
                      {cat.labelRu}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-[var(--tz-muted)]">
                По умолчанию показаны генераторы под специализацию текущего атомарного рисунка (<strong>{activeProfileSpec.shortLabelRu}</strong>). Переключите «Все мастерские», чтобы увидеть полный каталог из {WORKSHOP_CATALOG_ITEMS.length} модулей, или закрепите ★ до 4 кнопок на панели.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredCatalog.map((item) => {
                  const isPinned = pinnedIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      data-testid={`workshop-card-${item.id}`}
                      className="flex flex-col justify-between gap-2 p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] hover:border-[var(--tz-accent)] transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-[12.5px] text-[var(--tz-text)] leading-snug">
                            {item.titleRu}
                          </span>
                          <span className="text-[10.5px] font-mono text-[var(--tz-muted)] shrink-0">
                            {(() => {
                              const catMeta = CATEGORY_LABELS.find((c) => c.id === item.category);
                              const stageId = catMeta?.stage ?? 'ST-SCI';
                              return ROADMAP_STAGE_META[stageId].shortRu;
                            })()}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-[var(--tz-muted)] leading-snug">
                          {item.subtitleRu}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--tz-outline)]/60">
                        <button
                          type="button"
                          onClick={() => onTogglePinWorkshop(item.id)}
                          aria-pressed={isPinned}
                          title="Закрепить или открепить кнопку быстрого вызова на верхней панели (до 4 слотов)"
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] ${
                            isPinned
                              ? 'border-amber-500/60 bg-amber-500/15 text-amber-300 font-medium'
                              : 'border-[var(--tz-outline)] bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                          }`}
                        >
                          <Star className="w-3 h-3" />
                          <span>{isPinned ? `★ На панели (${item.shortPinLabelRu})` : 'Закрепить ★'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenCatalogItem(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--tz-accent)] text-white hover:opacity-95 font-medium text-[11.5px]"
                        >
                          <span>Открыть</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: 2D Booleans, 3-Pt Arc / Ellipse, Tangents & Calibration */}
          {/* ============================================================== */}
          {activeTab === 'geometry' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* F10: 2D Boolean Operations */}
              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] space-y-2.5">
                <div className="font-semibold text-[12.5px]">
                  Булевы операции 2D над контурами n1
                </div>
                <p className="text-[11px] text-[var(--tz-muted)]">
                  Выделите на холсте 2 пересекающиеся замкнутые фигуры (прямоугольник, окружность или полигон <code className="font-mono">-- cycle</code>). Текущее выделение: <span className="font-mono tabular-nums font-semibold text-[var(--tz-text)]">{selectedPrimitiveIds.length} шт.</span>
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-[11px]">
                    <input
                      type="checkbox"
                      checked={boolReplaceOriginals}
                      onChange={(e) => setBoolReplaceOriginals(e.target.checked)}
                    />
                    <span>Удалить исходные 2 фигуры</span>
                  </label>
                  <select
                    value={boolHatch}
                    onChange={(e) => setBoolHatch(e.target.value)}
                    aria-label="Штриховка булева контура"
                    className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[11px]"
                  >
                    <option value="">Заливка cyan!10</option>
                    <option value="north east lines">Штриховка металл 45° (ГОСТ 2.306)</option>
                    <option value="crosshatch">Крестовая сетка (неметалл)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    data-testid="boolean-union-btn"
                    onClick={() => runBoolean('union')}
                    className="px-2.5 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95"
                  >
                    ∪ Объединение (A ∪ B)
                  </button>
                  <button
                    type="button"
                    data-testid="boolean-diff-btn"
                    onClick={() => runBoolean('difference')}
                    className="px-2.5 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium"
                  >
                    \ Вычитание (A \ B)
                  </button>
                  <button
                    type="button"
                    data-testid="boolean-intersect-btn"
                    onClick={() => runBoolean('intersection')}
                    className="px-2.5 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium"
                  >
                    ∩ Пересечение (A ∩ B)
                  </button>
                  <button
                    type="button"
                    data-testid="boolean-xor-btn"
                    onClick={() => runBoolean('xor')}
                    className="px-2.5 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium"
                  >
                    ⊕ Симм. разность (XOR)
                  </button>
                </div>

                <div className="pt-2 border-t border-[var(--tz-outline)] space-y-1.5">
                  <div className="font-medium text-[11.5px]">
                    Общие касательные к окружностям
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={tangentKind}
                      onChange={(e) => setTangentKind(e.target.value as 'outer' | 'inner' | 'both')}
                      className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[11px]"
                    >
                      <option value="outer">Внешние касательные (2 шт.)</option>
                      <option value="inner">Внутренние перекрёстные (2 шт.)</option>
                      <option value="both">Все общие касательные (4 шт.)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const res = constructCircleTangentsInSource(
                          source,
                          selectedPrimitiveIds,
                          tangentKind
                        );
                        setStatusBanner(res.summaryRu);
                        if (res.ok) onApplyNewSource(res.nextSource, res.summaryRu, res.insertedIds);
                      }}
                      className="px-2.5 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium"
                    >
                      Построить касательные
                    </button>
                  </div>
                </div>
              </div>

              {/* F02: Analytic 3-Point Arc & Rotated Ellipse */}
              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] space-y-2.5">
                <div className="font-semibold text-[12.5px]">
                  Дуга по 3 точкам и Повёрнутый эллипс
                </div>
                <div className="grid grid-cols-6 gap-1.5 font-mono tabular-nums text-[11px]">
                  <input
                    type="number"
                    step="0.1"
                    value={arcPts.x1}
                    onChange={(e) => setArcPts({ ...arcPts, x1: e.target.value })}
                    aria-label="Дуга X1"
                    className="px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={arcPts.y1}
                    onChange={(e) => setArcPts({ ...arcPts, y1: e.target.value })}
                    aria-label="Дуга Y1"
                    className="px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={arcPts.xm}
                    onChange={(e) => setArcPts({ ...arcPts, xm: e.target.value })}
                    aria-label="Дуга Xmid"
                    className="px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={arcPts.ym}
                    onChange={(e) => setArcPts({ ...arcPts, ym: e.target.value })}
                    aria-label="Дуга Ymid"
                    className="px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={arcPts.x2}
                    onChange={(e) => setArcPts({ ...arcPts, x2: e.target.value })}
                    aria-label="Дуга X2"
                    className="px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={arcPts.y2}
                    onChange={(e) => setArcPts({ ...arcPts, y2: e.target.value })}
                    aria-label="Дуга Y2"
                    className="px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  />
                </div>
                <button
                  type="button"
                  data-testid="insert-arc3-btn"
                  onClick={() => {
                    const res = insertThreePointArcIntoSource(
                      source,
                      { x: Number(arcPts.x1) || 1, y: Number(arcPts.y1) || 1.5 },
                      { x: Number(arcPts.xm) || 2.4, y: Number(arcPts.ym) || 2.8 },
                      { x: Number(arcPts.x2) || 3.7, y: Number(arcPts.y2) || 1.5 },
                      { strokeColor: 'blue!75!black', strokeWidth: 'thick' }
                    );
                    setStatusBanner(res.summaryRu);
                    onApplyNewSource(res.nextSource, res.summaryRu, res.insertedIds);
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium"
                >
                  + Вставить точную круговую дугу (P1 → Pmid → P2)
                </button>

                <div className="pt-2 border-t border-[var(--tz-outline)] space-y-1.5">
                  <div className="text-[11px] text-[var(--tz-muted)]">
                    Эллипс: центр (Xc, Yc), полуоси (Rx, Ry см) и угол поворота (°):
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 font-mono tabular-nums text-[11px]">
                    <input
                      type="number"
                      step="0.1"
                      value={ellipseCfg.cx}
                      onChange={(e) => setEllipseCfg({ ...ellipseCfg, cx: e.target.value })}
                      aria-label="Эллипс Xc"
                      className="px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={ellipseCfg.cy}
                      onChange={(e) => setEllipseCfg({ ...ellipseCfg, cy: e.target.value })}
                      aria-label="Эллипс Yc"
                      className="px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={ellipseCfg.rx}
                      onChange={(e) => setEllipseCfg({ ...ellipseCfg, rx: e.target.value })}
                      aria-label="Полуось Rx"
                      className="px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={ellipseCfg.ry}
                      onChange={(e) => setEllipseCfg({ ...ellipseCfg, ry: e.target.value })}
                      aria-label="Полуось Ry"
                      className="px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                    />
                    <input
                      type="number"
                      step="5"
                      value={ellipseCfg.rot}
                      onChange={(e) => setEllipseCfg({ ...ellipseCfg, rot: e.target.value })}
                      aria-label="Поворот эллипса"
                      className="px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                    />
                  </div>
                  <button
                    type="button"
                    data-testid="insert-ellipse-btn"
                    onClick={() => {
                      const res = insertParametricEllipseIntoSource(
                        source,
                        { x: Number(ellipseCfg.cx) || 3, y: Number(ellipseCfg.cy) || 2 },
                        Number(ellipseCfg.rx) || 1.3,
                        Number(ellipseCfg.ry) || 0.7,
                        Number(ellipseCfg.rot) || 0,
                        { strokeColor: 'teal!80!black', fillColor: 'emerald!10' }
                      );
                      setStatusBanner(res.summaryRu);
                      onApplyNewSource(res.nextSource, res.summaryRu, [res.newId]);
                    }}
                    className="w-full px-2.5 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95"
                  >
                    + Вставить параметрический эллипс (-- cycle)
                  </button>
                </div>
              </div>

              {/* F09: 2-Point Scale Calibration */}
              <div className="lg:col-span-2 p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] space-y-2">
                <div className="font-semibold text-[12.5px]">
                  Калибровка масштаба чертежа по 2 эталонным точкам
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center font-mono tabular-nums text-[11px]">
                  <input
                    type="number"
                    step="0.1"
                    value={calCfg.x1}
                    onChange={(e) => setCalCfg({ ...calCfg, x1: e.target.value })}
                    placeholder="P1.x"
                    aria-label="Эталон P1 X"
                    className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={calCfg.y1}
                    onChange={(e) => setCalCfg({ ...calCfg, y1: e.target.value })}
                    placeholder="P1.y"
                    aria-label="Эталон P1 Y"
                    className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={calCfg.x2}
                    onChange={(e) => setCalCfg({ ...calCfg, x2: e.target.value })}
                    placeholder="P2.x"
                    aria-label="Эталон P2 X"
                    className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={calCfg.y2}
                    onChange={(e) => setCalCfg({ ...calCfg, y2: e.target.value })}
                    placeholder="P2.y"
                    aria-label="Эталон P2 Y"
                    className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={calCfg.targetCm}
                    onChange={(e) => setCalCfg({ ...calCfg, targetCm: e.target.value })}
                    placeholder="Истина (см)"
                    aria-label="Целевое расстояние в см"
                    className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const res = calibratePrimitivesByTwoPointsInSource(
                        source,
                        { x: Number(calCfg.x1) || 0, y: Number(calCfg.y1) || 0 },
                        { x: Number(calCfg.x2) || 1, y: Number(calCfg.y2) || 0 },
                        Number(calCfg.targetCm) || 2,
                        calCfg.selectedOnly ? selectedPrimitiveIds : undefined
                      );
                      setStatusBanner(res.summaryRu);
                      if (res.ok) onApplyNewSource(res.nextSource, res.summaryRu);
                    }}
                    className="px-2.5 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-sans font-medium"
                  >
                    Откалибровать
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: Circuits, Optics, Mechanics Beams & ГОСТ 19.701 (F12-15)*/}
          {/* ============================================================== */}
          {activeTab === 'engineering' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* F12: Electrical Circuits */}
              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] space-y-2">
                <div className="font-semibold text-[12.5px]">
                  Электрические схемы ГОСТ ЕСКД / ANSI + siunitx
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={circuitKind}
                    onChange={(e) => setCircuitKind(e.target.value as CircuitElementKind)}
                    aria-label="Тип радиоэлемента"
                    className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  >
                    <option value="resistor-gost">Резистор ГОСТ ЕСКД (прямоуг.)</option>
                    <option value="resistor-ansi">Резистор ANSI/IEEE (зигзаг)</option>
                    <option value="capacitor">Конденсатор неполярный C</option>
                    <option value="inductor">Катушка индуктивности L</option>
                    <option value="diode">Полупроводниковый диод VD</option>
                    <option value="vsource">Источник ЭДС / тока E0</option>
                    <option value="opamp-stage">Операционный усилитель ОУ DA</option>
                  </select>
                  <input
                    type="text"
                    value={circuitLabel}
                    onChange={(e) => setCircuitLabel(e.target.value)}
                    placeholder="Номинал \qty{4.7}{\kilo\ohm}"
                    aria-label="Номинал элемента LaTeX"
                    className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.2"
                    value={circuitOrigin.x}
                    onChange={(e) => setCircuitOrigin({ ...circuitOrigin, x: e.target.value })}
                    aria-label="Позиция элемента X"
                    className="w-24 px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono tabular-nums"
                  />
                  <input
                    type="number"
                    step="0.2"
                    value={circuitOrigin.y}
                    onChange={(e) => setCircuitOrigin({ ...circuitOrigin, y: e.target.value })}
                    aria-label="Позиция элемента Y"
                    className="w-24 px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono tabular-nums"
                  />
                  <button
                    type="button"
                    data-testid="insert-circuit-element-btn"
                    onClick={() => {
                      const res = insertElectricalCircuitElementIntoSource(
                        source,
                        circuitKind,
                        { x: Number(circuitOrigin.x) || 1.4, y: Number(circuitOrigin.y) || 2.1 },
                        circuitLabel
                      );
                      setStatusBanner(res.summaryRu);
                      onApplyNewSource(res.nextSource, res.summaryRu, res.insertedIds);
                    }}
                    className="flex-1 px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95"
                  >
                    + Вставить узел цепи (группа n1)
                  </button>
                </div>
              </div>

              {/* F13: Geometric Optics Ray Tracer */}
              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] space-y-2">
                <div className="font-semibold text-[12.5px]">
                  Геометрическая оптика: тонкая линза и ход лучей
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-[11px]">
                  <label className="flex flex-col gap-0.5">
                    <span className="font-sans text-[var(--tz-muted)]">Фокус f (см, ±):</span>
                    <input
                      type="number"
                      step="0.15"
                      value={opticsCfg.focalCm}
                      onChange={(e) => setOpticsCfg({ ...opticsCfg, focalCm: e.target.value })}
                      className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="font-sans text-[var(--tz-muted)]">Предмет d (см):</span>
                    <input
                      type="number"
                      step="0.15"
                      value={opticsCfg.objDistCm}
                      onChange={(e) => setOpticsCfg({ ...opticsCfg, objDistCm: e.target.value })}
                      className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="font-sans text-[var(--tz-muted)]">Высота h (см):</span>
                    <input
                      type="number"
                      step="0.1"
                      value={opticsCfg.objHeightCm}
                      onChange={(e) => setOpticsCfg({ ...opticsCfg, objHeightCm: e.target.value })}
                      className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  data-testid="insert-optics-bench-btn"
                  onClick={() => {
                    const res = insertOpticalBenchRayTraceIntoSource(source, {
                      focalLengthCm: Number(opticsCfg.focalCm) || 1.0,
                      objectDistanceCm: Number(opticsCfg.objDistCm) || 1.8,
                      objectHeightCm: Number(opticsCfg.objHeightCm) || 0.75,
                    });
                    setStatusBanner(res.summaryRu);
                    onApplyNewSource(res.nextSource, res.summaryRu, res.insertedIds);
                  }}
                  className="w-full px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95"
                >
                  + Рассчитать 1/f = 1/d + 1/d&apos; и построить ход лучей
                </button>
              </div>

              {/* F14: Mechanics Beam + Q(x)/M(x) Diagrams */}
              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] space-y-2">
                <div className="font-semibold text-[12.5px]">
                  Сопромат: балка и автоматические эпюры Q(x), M(x)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <select
                    value={beamCfg.supportKind}
                    onChange={(e) =>
                      setBeamCfg({
                        ...beamCfg,
                        supportKind: e.target.value as 'simply-supported' | 'cantilever',
                      })
                    }
                    aria-label="Схема опирания балки"
                    className="col-span-2 sm:col-span-1 px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  >
                    <option value="simply-supported">Шарнирная балка</option>
                    <option value="cantilever">Жёсткая консоль</option>
                  </select>
                  <input
                    type="number"
                    step="0.5"
                    value={beamCfg.spanM}
                    onChange={(e) => setBeamCfg({ ...beamCfg, spanM: e.target.value })}
                    title="Пролёт L, м"
                    aria-label="Пролёт балки L"
                    className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono tabular-nums"
                  />
                  <input
                    type="number"
                    step="1"
                    value={beamCfg.pointKn}
                    onChange={(e) => setBeamCfg({ ...beamCfg, pointKn: e.target.value })}
                    title="Сила F, кН"
                    aria-label="Сосредоточенная сила F"
                    className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono tabular-nums"
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={beamCfg.distKnM}
                    onChange={(e) => setBeamCfg({ ...beamCfg, distKnM: e.target.value })}
                    title="Погонная нагрузка q, кН/м"
                    aria-label="Распределённая нагрузка q"
                    className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  data-testid="insert-beam-diagrams-btn"
                  onClick={() => {
                    const res = insertMechanicsBeamWithDiagramsIntoSource(source, {
                      supportKind: beamCfg.supportKind,
                      spanLengthKnM: Number(beamCfg.spanM) || 4,
                      pointLoadKn: Number(beamCfg.pointKn) || 10,
                      distributedLoadKnPerM: Number(beamCfg.distKnM) || 2,
                    });
                    setStatusBanner(res.summaryRu);
                    onApplyNewSource(res.nextSource, res.summaryRu, res.insertedIds);
                  }}
                  className="w-full px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium"
                >
                  + Построить расчётную схему балки и заштрихованные эпюры Q, M
                </button>
              </div>

              {/* F15: ГОСТ 19.701 Flowchart & Gantt */}
              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] space-y-2">
                <div className="font-semibold text-[12.5px]">
                  Авто-укладка блок-схем ГОСТ 19.701 и Диаграмма Ганта НИР
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={flowDsl}
                    onChange={(e) => setFlowDsl(e.target.value)}
                    aria-label="Цепочка шагов блок-схемы"
                    className="flex-1 px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[11px]"
                  />
                  <select
                    value={flowDir}
                    onChange={(e) => setFlowDir(e.target.value as 'horizontal' | 'vertical')}
                    className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[11px]"
                  >
                    <option value="horizontal">Гориз.</option>
                    <option value="vertical">Верт.</option>
                  </select>
                  <button
                    type="button"
                    data-testid="insert-flowchart-btn"
                    onClick={() => {
                      const res = insertGostFlowchartAutoLayoutIntoSource(source, flowDsl, flowDir);
                      setStatusBanner(res.summaryRu);
                      onApplyNewSource(res.nextSource, res.summaryRu, res.insertedIds);
                    }}
                    className="px-2.5 py-1 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap"
                  >
                    + Блок-схема
                  </button>
                </div>

                <div className="pt-1.5 border-t border-[var(--tz-outline)] flex items-start gap-2">
                  <textarea
                    rows={2}
                    value={ganttText}
                    onChange={(e) => setGanttText(e.target.value)}
                    aria-label="Этапы календарного плана НИР"
                    className="flex-1 px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    data-testid="insert-gantt-btn"
                    onClick={() => {
                      const res = insertScientificGanttChartIntoSource(source, ganttText);
                      setStatusBanner(res.summaryRu);
                      onApplyNewSource(res.nextSource, res.summaryRu, res.insertedIds);
                    }}
                    className="px-2.5 py-2 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium whitespace-nowrap"
                  >
                    + Гант НИР
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: OLS Least-Squares Regression & BoxPlot/Histogram (F16)  */}
          {/* ============================================================== */}
          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] space-y-2.5">
                <div className="font-semibold text-[12.5px]">
                  Аппроксимация МНК (OLS) + коридор ±σ и R²
                </div>
                <textarea
                  rows={5}
                  value={olsData}
                  onChange={(e) => setOlsData(e.target.value)}
                  aria-label="Экспериментальные точки X Y"
                  className="w-full px-2.5 py-1.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono tabular-nums text-xs"
                />
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={olsModel}
                    onChange={(e) => setOlsModel(e.target.value as RegressionModelKind)}
                    aria-label="Модель регрессии МНК"
                    className="px-2.5 py-1.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  >
                    <option value="linear">Линейная y = kx + b</option>
                    <option value="quadratic">Квадратичная y = ax² + bx + c</option>
                    <option value="exponential">Экспонента y = A·e^(kx)</option>
                  </select>
                  <button
                    type="button"
                    data-testid="insert-ols-fit-btn"
                    onClick={() => {
                      const res = insertLeastSquaresFitIntoSource(source, olsData, olsModel);
                      setStatusBanner(res.summaryRu);
                      onApplyNewSource(res.nextSource, res.summaryRu, res.insertedIds);
                    }}
                    className="px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95"
                  >
                    + Построить кривую МНК, точки ±σ и R²
                  </button>
                </div>
              </div>

              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] space-y-2.5">
                <div className="font-semibold text-[12.5px]">
                  Статистический BoxPlot (ящик с усами) и Гистограмма
                </div>
                <textarea
                  rows={3}
                  value={sampleRaw}
                  onChange={(e) => setSampleRaw(e.target.value)}
                  aria-label="Выборка измерений"
                  className="w-full px-2.5 py-1.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono tabular-nums text-xs"
                />
                <div className="px-2.5 py-1.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono tabular-nums text-[11px] text-[var(--tz-muted)]">
                  N = {statsPreview.n} · Med = {statsPreview.median} · Q1 = {statsPreview.q1} · Q3 = {statsPreview.q3} · IQR = {statsPreview.iqr} · Выбросов: {statsPreview.outliers.length}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="insert-boxplot-btn"
                    onClick={() => {
                      const res = insertStatisticalPlotIntoSource(source, sampleRaw, 'boxplot');
                      setStatusBanner(res.summaryRu);
                      onApplyNewSource(res.nextSource, res.summaryRu, res.insertedIds);
                    }}
                    className="px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95"
                  >
                    + BoxPlot (Q1–Med–Q3)
                  </button>
                  <button
                    type="button"
                    data-testid="insert-histogram-btn"
                    onClick={() => {
                      const res = insertStatisticalPlotIntoSource(source, sampleRaw, 'histogram');
                      setStatusBanner(res.summaryRu);
                      onApplyNewSource(res.nextSource, res.summaryRu, res.insertedIds);
                    }}
                    className="px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium"
                  >
                    + Гистограмма частот
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: Preamble \tikzset, Magic Numbers & Selective Diff       */}
          {/* ============================================================== */}
          {activeTab === 'preamble-diff' && (
            <div className="space-y-3">
              {/* F07: Quick Preamble \tikzset Creator */}
              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] space-y-2">
                <div className="font-semibold text-[12.5px]">
                  Пользовательские стили \tikzset в окне Преамбулы → Инспектор
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={styleName}
                    onChange={(e) => setStyleName(e.target.value)}
                    placeholder="Имя стиля (напр. sensorBox)"
                    aria-label="Имя стиля tikzset"
                    className="w-44 px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono"
                  />
                  <input
                    type="text"
                    value={styleDef}
                    onChange={(e) => setStyleDef(e.target.value)}
                    placeholder="Опции TikZ: thick,draw=blue!75!black,fill=blue!8"
                    aria-label="Определение стиля tikzset"
                    className="flex-1 min-w-[220px] px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono"
                  />
                  <button
                    type="button"
                    data-testid="upsert-preamble-style-btn"
                    onClick={() => {
                      const res = upsertQuickTikzsetStyleInPreamble(source, styleName, styleDef);
                      setStatusBanner(res.summaryRu);
                      onApplyNewSource(res.nextSource, res.summaryRu);
                    }}
                    className="px-3 py-1 rounded bg-[var(--tz-accent)] text-white font-medium"
                  >
                    + Записать в Преамбулу
                  </button>
                </div>
                {preambleStyles.length > 0 && (
                  <div className="text-[11px] font-mono text-[var(--tz-muted)]">
                    Активные стили в преамбуле: {preambleStyles.map((s) => `${s.name} (стр.${s.lineNumber})`).join(' · ')}
                  </div>
                )}
              </div>

              {/* F08: Magic Numbers -> Preamble \pgfmathsetmacro */}
              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] space-y-2">
                <div className="font-semibold text-[12.5px]">
                  Параметризатор «магических чисел» → \pgfmathsetmacro в Преамбуле
                </div>
                {magicCandidates.length === 0 ? (
                  <div className="text-[11px] text-[var(--tz-muted)]">
                    Повторяющихся одинаковых размерностей в n1 пока не обнаружено (добавьте 2+ фигуры с общими координатами или радиусами).
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--tz-outline)]/60 border border-[var(--tz-outline)] rounded bg-[var(--tz-inset)]">
                    {magicCandidates.slice(0, 6).map((cand) => {
                      const key = cand.valueCm.toFixed(2);
                      const mName = customMacroNames[key] ?? cand.suggestedMacroName;
                      return (
                        <div
                          key={key}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 font-mono tabular-nums text-[11px]"
                        >
                          <div>
                            <span className="text-[var(--tz-syn-num)] font-semibold">
                              {cand.valueCm.toFixed(2)} см
                            </span>
                            <span className="text-[var(--tz-muted)] font-sans ml-2">
                              ({cand.occurrencesCount} вхожд.:{' '}
                              {cand.occurrences
                                .slice(0, 3)
                                .map((o) => `#${o.primitiveId}.${o.paramKey}`)
                                .join(', ')}
                              )
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={mName}
                              onChange={(e) =>
                                setCustomMacroNames({ ...customMacroNames, [key]: e.target.value })
                              }
                              aria-label={`Имя макроса для ${key}`}
                              className="w-28 px-2 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const res = parameterizeMagicNumberIntoPreamble(source, cand, mName);
                                setStatusBanner(res.summaryRu);
                                onApplyNewSource(res.nextSource, res.summaryRu);
                              }}
                              className="px-2.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-sans"
                            >
                              Вынести \\{mName}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* F11: Selective Single-Primitive Visual Diff & Revert */}
              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[12.5px]">
                    Поэлементный Diff ревизий и Точечный возврат отдельных фигур n1
                  </span>
                  {pastRevisions.length > 0 && (
                    <select
                      value={compareRevIdx}
                      onChange={(e) => setCompareRevIdx(Number(e.target.value))}
                      aria-label="Сравнить с ревизией истории"
                      className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[11px]"
                    >
                      {pastRevisions.map((rev, idx) => (
                        <option key={rev.revision} value={idx}>
                          #{rev.revision} — {rev.labelRu.slice(0, 46)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {!selectedPastRevision || !visualDiff ? (
                  <div className="text-[11px] text-[var(--tz-muted)]">
                    История изменений пока содержит только начальное состояние. Внесите правку на холсте, чтобы сравнивать и точечно возвращать отдельные фигуры без полного Undo.
                  </div>
                ) : visualDiff.totalChanges === 0 ? (
                  <div className="text-[11px] text-[var(--tz-muted)]">
                    Примитивы n1 совпадают с выбранной ревизией #{selectedPastRevision.revision}.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--tz-outline)]/60 border border-[var(--tz-outline)] rounded bg-[var(--tz-inset)] font-mono tabular-nums text-[11px]">
                    {visualDiff.removed.map((rem) => (
                      <div key={`rem-${rem.id}`} className="flex items-center justify-between gap-2 px-3 py-1.5">
                        <span className="text-rose-400">
                          − Удалён #{rem.id} ({rem.tool})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const res = revertSinglePrimitiveFromRevision(
                              source,
                              selectedPastRevision.source,
                              rem.id
                            );
                            setStatusBanner(res.summaryRu);
                            if (res.ok) onApplyNewSource(res.nextSource, res.summaryRu, [rem.id]);
                          }}
                          className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-sans"
                        >
                          Восстановить #{rem.id}
                        </button>
                      </div>
                    ))}
                    {visualDiff.modified.map((mod) => (
                      <div
                        key={`mod-${mod.current.id}`}
                        className="flex items-center justify-between gap-2 px-3 py-1.5"
                      >
                        <span className="text-amber-400">
                          ~ Изменён #{mod.current.id} ({mod.current.tool})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const res = revertSinglePrimitiveFromRevision(
                              source,
                              selectedPastRevision.source,
                              mod.current.id
                            );
                            setStatusBanner(res.summaryRu);
                            if (res.ok)
                              onApplyNewSource(res.nextSource, res.summaryRu, [mod.current.id]);
                          }}
                          className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-sans"
                        >
                          Вернуть координаты #{mod.current.id}
                        </button>
                      </div>
                    ))}
                    {visualDiff.added.map((add) => (
                      <div key={`add-${add.id}`} className="flex items-center justify-between gap-2 px-3 py-1.5">
                        <span className="text-emerald-400">
                          + Добавлен #{add.id} ({add.tool})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const res = revertSinglePrimitiveFromRevision(
                              source,
                              selectedPastRevision.source,
                              add.id
                            );
                            setStatusBanner(res.summaryRu);
                            if (res.ok) onApplyNewSource(res.nextSource, res.summaryRu);
                          }}
                          className="px-2 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-sans"
                        >
                          Убрать #{add.id}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
