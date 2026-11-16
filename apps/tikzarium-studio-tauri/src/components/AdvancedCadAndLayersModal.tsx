import React, { useMemo, useState } from 'react';
import {
  X,
  Pentagon,
  Crosshair,
  Sliders,
  ScanLine,
  Activity,
  Layers,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Check,
  Copy,
  Presentation,
} from 'lucide-react';
import type { OwnedPrimitive } from '../domain/tikzEngine';
import {
  ANALYTICAL_FUNCTION_PRESETS,
  CAD_LAYERS,
  DEMO_PLOT_SCAN_DATA_URI,
  GOST_HATCH_SPECS,
  PATH_DECORATION_SPECS,
  PHYSICAL_UNIT_PRESETS,
  POLYGON_PRESETS,
  VECTOR_FIELD_PRESETS,
  buildScopedTikzPreview,
  extractPgfMathMacros,
  formatPhysicalQuantityLatex,
  mapCanvasPointsToPhysical,
  resolveEffectiveLayer,
  sampleAnalyticalFunctionToCanvas,
} from '../domain/advancedCadBundle';
import type {
  AnalyticalFormulaId,
  CadLayerId,
  DigitizerCalibration,
  VectorFieldPresetId,
} from '../domain/advancedCadBundle';

export type AdvancedModalTab =
  | 'geometry-gost'
  | 'macros-si'
  | 'digitizer'
  | 'plots-fields'
  | 'layers-beamer';

interface AdvancedCadAndLayersModalProps {
  open: boolean;
  initialTab: AdvancedModalTab;
  onClose: () => void;
  source: string;
  ownedPrimitives: OwnedPrimitive[];
  selectedPrimitiveIds: number[];
  // P36-P39
  onInsertPolygonPreset: (
    pointsCm: { xCm: number; yCm: number }[],
    closed: boolean,
    options?: { hatchPattern?: string; fillColor?: string; titleRu?: string }
  ) => void;
  onActivatePolygonTool: () => void;
  onConstructGeometry: () => void;
  onApplyHatchToSelection: (hatchId: string) => void;
  onApplyDecorationToSelection: (decorationId: string, labelLatex: string) => void;
  // P40-P42
  onUpsertMacro: (
    name: string,
    value: number,
    commentRu: string,
    linked?: { primitiveId: number; paramKey: string }
  ) => void;
  onInsertQuantityNode: (latexContent: string) => void;
  // P43
  digitizerCalibration: DigitizerCalibration;
  onChangeDigitizerCalibration: (cal: DigitizerCalibration) => void;
  digitizerPointsCm: { x: number; y: number }[];
  onClearDigitizerPoints: () => void;
  onAddDemoDigitizerPoints: () => void;
  onLoadDemoScanUnderlay: (dataUri: string) => void;
  onActivateDigitizerTool: () => void;
  onCommitDigitizedCurve: (mode: 'n1-polyline' | 'pgfplots-coordinates') => void;
  // P44-P45
  onInsertAnalyticalPlot: (
    formulaId: AnalyticalFormulaId,
    domainMin: number,
    domainMax: number,
    samplesCount: number,
    paramA: number
  ) => void;
  onInsertVectorField: (presetId: VectorFieldPresetId, cols: number, rows: number) => void;
  // P46-P47
  hiddenLayers: CadLayerId[];
  lockedLayers: CadLayerId[];
  onToggleHideLayer: (layerId: CadLayerId) => void;
  onToggleLockLayer: (layerId: CadLayerId) => void;
  onAssignLayerToSelection: (layerId: CadLayerId) => void;
  activeBeamerSlide: number | null;
  onChangeActiveBeamerSlide: (slide: number | null) => void;
  onAssignBeamerSpecToSelection: (spec: string) => void;
  onNotify: (msg: string) => void;
}

export const AdvancedCadAndLayersModal: React.FC<AdvancedCadAndLayersModalProps> = ({
  open,
  initialTab,
  onClose,
  source,
  ownedPrimitives,
  selectedPrimitiveIds,
  onInsertPolygonPreset,
  onActivatePolygonTool,
  onConstructGeometry,
  onApplyHatchToSelection,
  onApplyDecorationToSelection,
  onUpsertMacro,
  onInsertQuantityNode,
  digitizerCalibration,
  onChangeDigitizerCalibration,
  digitizerPointsCm,
  onClearDigitizerPoints,
  onAddDemoDigitizerPoints,
  onLoadDemoScanUnderlay,
  onActivateDigitizerTool,
  onCommitDigitizedCurve,
  onInsertAnalyticalPlot,
  onInsertVectorField,
  hiddenLayers,
  lockedLayers,
  onToggleHideLayer,
  onToggleLockLayer,
  onAssignLayerToSelection,
  activeBeamerSlide,
  onChangeActiveBeamerSlide,
  onAssignBeamerSpecToSelection,
  onNotify,
}) => {
  const [tab, setTab] = useState<AdvancedModalTab>(initialTab);
  const [copiedScope, setCopiedScope] = useState(false);

  // Sync initialTab when re-opened on a specific section
  React.useEffect(() => {
    if (open) setTab(initialTab);
  }, [initialTab, open]);

  // P39 state
  const [decorKind, setDecorKind] = useState<string>('brace');
  const [decorLabel, setDecorLabel] = useState<string>('L_0 = 2.4\\,\\text{см}');

  // P40 state
  const macros = useMemo(() => extractPgfMathMacros(source), [source]);
  const [macroName, setMacroName] = useState<string>('focalLen');
  const [macroVal, setMacroVal] = useState<number>(1.2);
  const [macroComment, setMacroComment] = useState<string>('Параметр оптического контура');
  const [linkedPrimId, setLinkedPrimId] = useState<number>(
    selectedPrimitiveIds[0] ?? ownedPrimitives[0]?.id ?? 0
  );
  const [linkedParamKey, setLinkedParamKey] = useState<string>('radius');

  // P42 state
  const [siSymbol, setSiSymbol] = useState<string>('\\lambda');
  const [siValue, setSiValue] = useState<string>('532');
  const [siUncertainty, setSiUncertainty] = useState<string>('0.5');
  const [siUnitId, setSiUnitId] = useState<string>('nm');
  const [siNotation, setSiNotation] = useState<'gost-text' | 'siunitx'>('gost-text');

  // P44 & P45 state
  const [formulaId, setFormulaId] = useState<AnalyticalFormulaId>('sinc-diffraction');
  const [domainMin, setDomainMin] = useState<number>(-3.5);
  const [domainMax, setDomainMax] = useState<number>(3.5);
  const [samplesCount, setSamplesCount] = useState<number>(36);
  const [paramA, setParamA] = useState<number>(3.0);
  const [fieldPresetId, setFieldPresetId] = useState<VectorFieldPresetId>('dipole-e');
  const [fieldCols, setFieldCols] = useState<number>(5);
  const [fieldRows, setFieldRows] = useState<number>(4);

  const sampledPreview = useMemo(
    () => sampleAnalyticalFunctionToCanvas(formulaId, domainMin, domainMax, samplesCount, paramA),
    [domainMax, domainMin, formulaId, paramA, samplesCount]
  );

  const mappedDigitizerPoints = useMemo(
    () => mapCanvasPointsToPhysical(digitizerPointsCm, digitizerCalibration),
    [digitizerCalibration, digitizerPointsCm]
  );

  const scopedPreview = useMemo(() => buildScopedTikzPreview(source), [source]);

  const siFormattedPreview = useMemo(
    () =>
      formatPhysicalQuantityLatex({
        symbolLatex: siSymbol,
        valueStr: siValue,
        uncertaintyStr: siUncertainty,
        unitPresetId: siUnitId,
        notation: siNotation,
      }),
    [siNotation, siSymbol, siUncertainty, siUnitId, siValue]
  );

  if (!open) return null;

  const selectedPrimForMacro = ownedPrimitives.find((p) => p.id === linkedPrimId) ?? ownedPrimitives[0];
  const numericParamKeys = selectedPrimForMacro
    ? Object.keys(selectedPrimForMacro.values).filter((k) =>
        ['x', 'y', 'start_x', 'start_y', 'end_x', 'end_y', 'center_x', 'center_y', 'radius'].includes(k)
      )
    : ['radius', 'x', 'y'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Инженерный контур, ГОСТ, Макросы, Оцифровка и Слои"
      data-testid="advanced-cad-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-5xl max-h-[88vh] flex flex-col rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-text)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] shrink-0">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Pentagon className="w-4 h-4 text-[var(--tz-link)]" />
              <span>Инженерная геометрия, ГОСТ-штриховки, Макросы, Оцифровка и Слои</span>
            </h2>
            <p className="text-xs text-[var(--tz-muted)]">
              Все операции синхронизируют исходный код <code className="font-mono">.tex</code> без скрытых бинарных форматов.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть инженерное окно"
            className="p-1 rounded hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Разделы инженерного пакета"
          className="flex flex-wrap lg:flex-nowrap items-center gap-1 px-4 py-2 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] text-[11px] shrink-0 overflow-x-auto"
        >
          {[
            { id: 'geometry-gost', label: '1. Полигоны, ∟ и ГОСТ', icon: Pentagon },
            { id: 'macros-si', label: '2. Макросы PGF и СИ', icon: Sliders },
            { id: 'digitizer', label: '3. Оцифровка сканов', icon: ScanLine },
            { id: 'plots-fields', label: '4. Функции F(x) и Поля', icon: Activity },
            { id: 'layers-beamer', label: '5. Слои Scope и Beamer', icon: Layers },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id as AdvancedModalTab)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                    : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border border-[var(--tz-outline)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[var(--tz-link)]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
          {/* TAB 1: P36-P39 */}
          {tab === 'geometry-gost' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* P36 Polygons */}
              <div className="lg:col-span-6 p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[var(--tz-text)]">
                      P36 · Замкнутые полигоны (-- cycle) и ломаные контуры
                    </h3>
                    <p className="text-[11px] text-[var(--tz-muted)]">
                      Призмы, наклонные клинья, апертуры и многозвенные профили с ручками вершин.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onActivatePolygonTool();
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap shrink-0"
                  >
                    Рисовать по точкам (P)
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  {POLYGON_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-2 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[var(--tz-text)] truncate">
                          {preset.titleRu}
                        </div>
                        <div className="text-[11px] text-[var(--tz-muted)] font-mono">
                          {preset.domainRu} · {preset.pointsCm.length} вершин ·{' '}
                          {preset.closed ? '-- cycle' : 'разомкн.'}
                        </div>
                      </div>
                      <button
                        type="button"
                        data-testid={`insert-poly-${preset.id}`}
                        onClick={() => {
                          onInsertPolygonPreset(preset.pointsCm, preset.closed, {
                            hatchPattern: preset.defaultHatch,
                            fillColor: preset.defaultFill,
                            titleRu: preset.titleRu,
                          });
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3 h-3 text-[var(--tz-link)]" />
                        <span>Вставить</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* P37 + P38 + P39 */}
              <div className="lg:col-span-6 flex flex-col gap-3">
                {/* P37 Smart Intersection / Perpendicular */}
                <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2">
                  <h3 className="font-semibold text-[var(--tz-text)] flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-[var(--tz-link)]" />
                    <span>P37 · Точное пересечение (intersections) и перпендикуляр ∟ (calc)</span>
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Выделите 2 объекта на холсте (Shift+клик): две линии, луч+линзу или узел+прямую — студия вычислит точные координаты точки пересечения или основания перпендикуляра со знаком прямого угла 90°.
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="font-mono text-[11px] text-[var(--tz-muted)]">
                      Выделено объектов: {selectedPrimitiveIds.length} шт.
                    </span>
                    <button
                      type="button"
                      data-testid="modal-construct-geometry-btn"
                      onClick={() => {
                        onConstructGeometry();
                        if (selectedPrimitiveIds.length >= 2) onClose();
                      }}
                      className="px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap"
                    >
                      Построить пересечение / перпендикуляр ∟
                    </button>
                  </div>
                </div>

                {/* P38 ГОСТ Hatchings */}
                <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2">
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P38 · Векторные штриховки сечений ГОСТ 2.306 (\usetikzlibrary&#123;patterns&#125;)
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {GOST_HATCH_SPECS.map((h) => (
                      <button
                        key={h.id || 'none'}
                        type="button"
                        onClick={() => onApplyHatchToSelection(h.id)}
                        className="p-2 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] hover:bg-[var(--tz-hover)] text-left flex flex-col gap-0.5"
                      >
                        <span className="font-medium text-[var(--tz-text)] truncate">{h.labelRu}</span>
                        <span className="text-[10.5px] text-[var(--tz-muted)] truncate">{h.gostMaterialRu}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* P39 Path Decorations */}
                <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2">
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P39 · Декорации путей: фигурные скобки brace и фотонные волны snake
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      aria-label="Тип декорации пути TikZ"
                      value={decorKind}
                      onChange={(e) => setDecorKind(e.target.value)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    >
                      {PATH_DECORATION_SPECS.map((d) => (
                        <option key={d.id || 'plain'} value={d.id}>
                          {d.labelRu}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={decorLabel}
                      onChange={(e) => setDecorLabel(e.target.value)}
                      placeholder="Подпись скобки (LaTeX)"
                      aria-label="Подпись над фигурной скобкой"
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onApplyDecorationToSelection(decorKind, decorLabel)}
                    className="self-end px-3 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium whitespace-nowrap"
                  >
                    Применить декорацию к выделенной линии
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: P40-P42 */}
          {tab === 'macros-si' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* P40 Live Macros */}
              <div className="lg:col-span-6 p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P40 · Параметрические переменные \pgfmathsetmacro с живым ползунком
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Свяжите макропеременную документа с размером примитива <code className="font-mono">n1</code> и меняйте геометрию ползунком в реальном времени.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Имя макроса (\имя)</span>
                    <input
                      type="text"
                      value={macroName}
                      onChange={(e) => setMacroName(e.target.value)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Комментарий в .tex</span>
                    <input
                      type="text"
                      value={macroComment}
                      onChange={(e) => setMacroComment(e.target.value)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Связать с объектом n1</span>
                    <select
                      value={linkedPrimId}
                      onChange={(e) => setLinkedPrimId(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    >
                      <option value={0}>Только макрос (без привязки)</option>
                      {ownedPrimitives.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.id} ({p.tool}, стр.{p.lineNumber})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Параметр объекта</span>
                    <select
                      value={linkedParamKey}
                      onChange={(e) => setLinkedParamKey(e.target.value)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    >
                      {numericParamKeys.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="p-2.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between font-mono tabular-nums">
                    <span>\{macroName || 'paramA'}</span>
                    <strong className="text-[var(--tz-link)]">{macroVal.toFixed(2)} см</strong>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={5.2}
                    step={0.05}
                    aria-label="Живой ползунок макропеременной PGF"
                    value={macroVal}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMacroVal(v);
                      onUpsertMacro(
                        macroName,
                        v,
                        macroComment,
                        linkedPrimId > 0
                          ? { primitiveId: linkedPrimId, paramKey: linkedParamKey }
                          : undefined
                      );
                    }}
                  />
                  <div className="text-[10.5px] text-[var(--tz-muted)]">
                    Движение ползунка мгновенно обновляет <code className="font-mono">\pgfmathsetmacro</code> и фигуру на холсте.
                  </div>
                </div>

                {macros.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-[var(--tz-muted)]">
                      Обнаруженные переменные документа ({macros.length}):
                    </span>
                    {macros.map((m) => (
                      <div
                        key={m.name}
                        className="px-2.5 py-1.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] flex items-center justify-between font-mono text-[11px]"
                      >
                        <span>
                          \{m.name} = <strong>{m.value}</strong> (стр. {m.lineNumber})
                        </span>
                        <span className="text-[var(--tz-muted)] font-sans truncate max-w-[180px]">
                          {m.commentRu}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-2.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[11px] text-[var(--tz-muted)]">
                  <strong className="text-[var(--tz-text)]">P41 · Скруббер чисел прямо в коде .tex:</strong>{' '}
                  поставьте курсор на любое число с размерностью в редакторе (например, <code className="font-mono">0.85cm</code>) и крутите <kbd className="font-mono">Alt + Колесо</kbd> или нажимайте <kbd className="font-mono">−</kbd> / <kbd className="font-mono">+</kbd> в шапке редактора (аналог <code className="font-mono">egui::DragValue</code>).
                </div>
              </div>

              {/* P42 Physical Units Constructor */}
              <div className="lg:col-span-6 p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P42 · Конструктор физических величин и прямых единиц СИ (ГОСТ 8.417 / siunitx)
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Исключает типографский брак курсивных единиц внутри <code className="font-mono">$...$</code> и формирует неразрывный тонкий пробел <code className="font-mono">\,</code>.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Символ величины</span>
                    <input
                      type="text"
                      value={siSymbol}
                      onChange={(e) => setSiSymbol(e.target.value)}
                      placeholder="\lambda"
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Значение</span>
                    <input
                      type="text"
                      value={siValue}
                      onChange={(e) => setSiValue(e.target.value)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Погрешность (±)</span>
                    <input
                      type="text"
                      value={siUncertainty}
                      onChange={(e) => setSiUncertainty(e.target.value)}
                      placeholder="пусто или 0.5"
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Единица измерения</span>
                    <select
                      value={siUnitId}
                      onChange={(e) => setSiUnitId(e.target.value)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    >
                      {PHYSICAL_UNIT_PRESETS.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.unitRu} — {u.domainRu}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Стандарт записи</span>
                    <select
                      value={siNotation}
                      onChange={(e) => setSiNotation(e.target.value as 'gost-text' | 'siunitx')}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    >
                      <option value="gost-text">ГОСТ 8.417 (\,\text&#123;нм&#125;)</option>
                      <option value="siunitx">siunitx (\qty&#123;...&#125;&#123;\nano\meter&#125;)</option>
                    </select>
                  </label>
                </div>

                <div className="p-3 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs text-[var(--tz-syn-cmd)]">
                  ${siFormattedPreview}$
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    data-testid="insert-si-node-btn"
                    onClick={() => {
                      onInsertQuantityNode(siFormattedPreview);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap"
                  >
                    Добавить подпись на холст (n1 узел)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: P43 Plot Digitizer */}
          {tab === 'digitizer' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <h3 className="font-semibold text-[var(--tz-text)]">
                  P43 · Оцифровщик эталонных графиков и осциллограмм по 2 реперам
                </h3>
                <p className="text-[11px] text-[var(--tz-muted)]">
                  Подложите скан из статьи или осциллографа, задайте 2 опорные точки осей <code className="font-mono">Ref1 / Ref2</code> и прокликайте экспериментальную кривую прямо на холсте.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onLoadDemoScanUnderlay(DEMO_PLOT_SCAN_DATA_URI);
                      onNotify('Эталонный скан спектра T(λ) помещён под сетку холста.');
                    }}
                    className="px-2.5 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium whitespace-nowrap"
                  >
                    1. Подложить демо-скан спектра T(λ)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onActivateDigitizerTool();
                      onClose();
                    }}
                    className="px-2.5 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap"
                  >
                    2. Кликать точки на холсте
                  </button>
                  <button
                    type="button"
                    onClick={onAddDemoDigitizerPoints}
                    className="px-2.5 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                  >
                    Демо-точки пика (5 шт.)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--tz-outline)] font-mono text-[11px]">
                  <div className="p-2 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] flex flex-col gap-1.5">
                    <span className="text-rose-400 font-semibold">Репер 1 (левый низ)</span>
                    <div className="grid grid-cols-2 gap-1">
                      <label className="flex flex-col">
                        <span className="text-[10px] text-[var(--tz-muted)]">Холст X (см)</span>
                        <input
                          type="number"
                          step={0.1}
                          value={digitizerCalibration.ref1CanvasCm.x}
                          onChange={(e) =>
                            onChangeDigitizerCalibration({
                              ...digitizerCalibration,
                              ref1CanvasCm: {
                                ...digitizerCalibration.ref1CanvasCm,
                                x: Number(e.target.value),
                              },
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-[10px] text-[var(--tz-muted)]">Холст Y (см)</span>
                        <input
                          type="number"
                          step={0.1}
                          value={digitizerCalibration.ref1CanvasCm.y}
                          onChange={(e) =>
                            onChangeDigitizerCalibration({
                              ...digitizerCalibration,
                              ref1CanvasCm: {
                                ...digitizerCalibration.ref1CanvasCm,
                                y: Number(e.target.value),
                              },
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-[10px] text-[var(--tz-muted)]">Физ. X₁</span>
                        <input
                          type="number"
                          value={digitizerCalibration.ref1Phys.x}
                          onChange={(e) =>
                            onChangeDigitizerCalibration({
                              ...digitizerCalibration,
                              ref1Phys: {
                                ...digitizerCalibration.ref1Phys,
                                x: Number(e.target.value),
                              },
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-[10px] text-[var(--tz-muted)]">Физ. Y₁</span>
                        <input
                          type="number"
                          step={0.1}
                          value={digitizerCalibration.ref1Phys.y}
                          onChange={(e) =>
                            onChangeDigitizerCalibration({
                              ...digitizerCalibration,
                              ref1Phys: {
                                ...digitizerCalibration.ref1Phys,
                                y: Number(e.target.value),
                              },
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] flex flex-col gap-1.5">
                    <span className="text-sky-400 font-semibold">Репер 2 (правый верх)</span>
                    <div className="grid grid-cols-2 gap-1">
                      <label className="flex flex-col">
                        <span className="text-[10px] text-[var(--tz-muted)]">Холст X (см)</span>
                        <input
                          type="number"
                          step={0.1}
                          value={digitizerCalibration.ref2CanvasCm.x}
                          onChange={(e) =>
                            onChangeDigitizerCalibration({
                              ...digitizerCalibration,
                              ref2CanvasCm: {
                                ...digitizerCalibration.ref2CanvasCm,
                                x: Number(e.target.value),
                              },
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-[10px] text-[var(--tz-muted)]">Холст Y (см)</span>
                        <input
                          type="number"
                          step={0.1}
                          value={digitizerCalibration.ref2CanvasCm.y}
                          onChange={(e) =>
                            onChangeDigitizerCalibration({
                              ...digitizerCalibration,
                              ref2CanvasCm: {
                                ...digitizerCalibration.ref2CanvasCm,
                                y: Number(e.target.value),
                              },
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-[10px] text-[var(--tz-muted)]">Физ. X₂</span>
                        <input
                          type="number"
                          value={digitizerCalibration.ref2Phys.x}
                          onChange={(e) =>
                            onChangeDigitizerCalibration({
                              ...digitizerCalibration,
                              ref2Phys: {
                                ...digitizerCalibration.ref2Phys,
                                x: Number(e.target.value),
                              },
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-[10px] text-[var(--tz-muted)]">Физ. Y₂</span>
                        <input
                          type="number"
                          step={0.1}
                          value={digitizerCalibration.ref2Phys.y}
                          onChange={(e) =>
                            onChangeDigitizerCalibration({
                              ...digitizerCalibration,
                              ref2Phys: {
                                ...digitizerCalibration.ref2Phys,
                                y: Number(e.target.value),
                              },
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      Снятые точки кривой ({mappedDigitizerPoints.length})
                    </span>
                    {mappedDigitizerPoints.length > 0 && (
                      <button
                        type="button"
                        onClick={onClearDigitizerPoints}
                        className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:underline"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Очистить точки</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] p-2 font-mono text-[11px]">
                    {mappedDigitizerPoints.length === 0 ? (
                      <p className="text-[var(--tz-muted)] font-sans py-4 text-center">
                        Точки ещё не отмечены. Нажмите «Демо-точки пика» или «Кликать точки на холсте».
                      </p>
                    ) : (
                      mappedDigitizerPoints.map((pt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-0.5 border-b border-[var(--tz-outline)]/40 last:border-b-0 tabular-nums"
                        >
                          <span>
                            #{idx + 1}: холст ({pt.xCm.toFixed(2)}, {pt.yCm.toFixed(2)} см)
                          </span>
                          <span className="text-[var(--tz-link)]">
                            → физ. ({pt.xPhys}, {pt.yPhys})
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={mappedDigitizerPoints.length < 2}
                    onClick={() => {
                      onCommitDigitizedCurve('n1-polyline');
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] disabled:opacity-45 border border-[var(--tz-outline)] font-medium whitespace-nowrap"
                  >
                    Вставить как кривую n1
                  </button>
                  <button
                    type="button"
                    disabled={mappedDigitizerPoints.length < 2}
                    onClick={() => {
                      onCommitDigitizedCurve('pgfplots-coordinates');
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white disabled:opacity-45 font-medium whitespace-nowrap"
                  >
                    Вставить кривую + таблицу PGFPlots
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: P44-P45 Analytical Functions & Vector Fields */}
          {tab === 'plots-fields' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* P44 */}
              <div className="lg:col-span-6 p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P44 · Аналитический плоттер функций F(x) с защитой Dimension too large
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Предпросмотр кривой до запуска XeLaTeX с контролем расходимости PGF (±575 см).
                  </p>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[var(--tz-muted)]">Физический профиль функции</span>
                  <select
                    value={formulaId}
                    onChange={(e) => {
                      const nextId = e.target.value as AnalyticalFormulaId;
                      setFormulaId(nextId);
                      const found = ANALYTICAL_FUNCTION_PRESETS.find((p) => p.id === nextId);
                      if (found) {
                        setDomainMin(found.defaultDomain[0]);
                        setDomainMax(found.defaultDomain[1]);
                        setParamA(found.defaultParamA);
                      }
                    }}
                    className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                  >
                    {ANALYTICAL_FUNCTION_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titleRu}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-3 gap-2 font-mono">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-sans text-[var(--tz-muted)]">x_min</span>
                    <input
                      type="number"
                      step={0.5}
                      value={domainMin}
                      onChange={(e) => setDomainMin(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-sans text-[var(--tz-muted)]">x_max</span>
                    <input
                      type="number"
                      step={0.5}
                      value={domainMax}
                      onChange={(e) => setDomainMax(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-sans text-[var(--tz-muted)]">Узлов samples</span>
                    <input
                      type="number"
                      min={10}
                      max={60}
                      value={samplesCount}
                      onChange={(e) => setSamplesCount(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--tz-muted)]">
                      {ANALYTICAL_FUNCTION_PRESETS.find((p) => p.id === formulaId)?.paramALabelRu}
                    </span>
                    <span className="font-mono tabular-nums">{paramA.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={5.0}
                    step={0.05}
                    value={paramA}
                    onChange={(e) => setParamA(Number(e.target.value))}
                  />
                </label>

                {!sampledPreview.ok ? (
                  <div className="p-2.5 rounded border border-rose-500/50 bg-rose-500/10 text-rose-400 text-[11px]">
                    {sampledPreview.reasonRu}
                  </div>
                ) : (
                  <div className="p-2 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[10.5px] text-emerald-400 truncate">
                    ОК · PGF в пределах листа ({sampledPreview.canvasPoints.length} точек контура)
                  </div>
                )}

                <button
                  type="button"
                  data-testid="insert-analytical-plot-btn"
                  disabled={!sampledPreview.ok}
                  onClick={() => {
                    onInsertAnalyticalPlot(formulaId, domainMin, domainMax, samplesCount, paramA);
                    onClose();
                  }}
                  className="self-end px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white disabled:opacity-45 font-medium whitespace-nowrap"
                >
                  Построить кривую F(x) на холсте
                </button>
              </div>

              {/* P45 */}
              <div className="lg:col-span-6 p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--tz-text)]">
                      P45 · Генератор векторных полей и фазовых портретов (quiver E, B, v)
                    </h3>
                    <p className="text-[11px] text-[var(--tz-muted)]">
                      Строит нормированную сетку стрелок <code className="font-mono">-Stealth</code> в палитре Okabe–Ito для иллюстраций электродинамики и гидродинамики.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {VECTOR_FIELD_PRESETS.map((vf) => (
                      <button
                        key={vf.id}
                        type="button"
                        onClick={() => setFieldPresetId(vf.id)}
                        className={`p-2.5 rounded border text-left flex items-center justify-between gap-2 ${
                          fieldPresetId === vf.id
                            ? 'bg-[var(--tz-active)] border-[var(--tz-accent)] text-[var(--tz-text)]'
                            : 'bg-[var(--tz-window)] border-[var(--tz-outline)] text-[var(--tz-muted)]'
                        }`}
                      >
                        <span className="font-medium text-[var(--tz-text)]">{vf.titleRu}</span>
                        <span className="font-mono text-[11px]">{vf.formulaRu}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10.5px] font-sans text-[var(--tz-muted)]">Столбцов сетки</span>
                      <input
                        type="number"
                        min={2}
                        max={7}
                        value={fieldCols}
                        onChange={(e) => setFieldCols(Number(e.target.value))}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10.5px] font-sans text-[var(--tz-muted)]">Строк сетки</span>
                      <input
                        type="number"
                        min={2}
                        max={6}
                        value={fieldRows}
                        onChange={(e) => setFieldRows(Number(e.target.value))}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="insert-vector-field-btn"
                  onClick={() => {
                    onInsertVectorField(fieldPresetId, fieldCols, fieldRows);
                    onClose();
                  }}
                  className="self-end px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap"
                >
                  Сгенерировать векторное поле ({fieldCols}×{fieldRows})
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: P46-P47 Layers & Beamer */}
          {tab === 'layers-beamer' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* P46 Scope Layers */}
              <div className="lg:col-span-6 p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P46 · Диспетчер слоёв \begin&#123;scope&#125; с блокировкой Lock и скрытием Hide
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Заблокируйте слой «Фон», чтобы при выделении рамкой не сдвинуть оси и сетку.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {CAD_LAYERS.map((layer) => {
                    const count = ownedPrimitives.filter(
                      (p) => resolveEffectiveLayer(p) === layer.id
                    ).length;
                    const isHidden = hiddenLayers.includes(layer.id);
                    const isLocked = lockedLayers.includes(layer.id);
                    return (
                      <div
                        key={layer.id}
                        className="p-2.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-[var(--tz-text)]">
                            {layer.titleRu} · <span className="font-mono">{count} шт.</span>
                          </div>
                          <div className="text-[11px] text-[var(--tz-muted)]">{layer.scopeCommentRu}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onAssignLayerToSelection(layer.id)}
                            title="Перенести выделенные объекты в этот слой"
                            className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] text-[11px] whitespace-nowrap"
                          >
                            Назначить
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleLockLayer(layer.id)}
                            aria-label={`Блокировка слоя ${layer.shortRu}`}
                            className={`p-1.5 rounded border ${
                              isLocked
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] border-[var(--tz-outline)]'
                            }`}
                          >
                            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleHideLayer(layer.id)}
                            aria-label={`Видимость слоя ${layer.shortRu}`}
                            className={`p-1.5 rounded border ${
                              isHidden
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] border-[var(--tz-outline)]'
                            }`}
                          >
                            {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">
                      Структурированный экспорт по окружениям \begin&#123;scope&#125;:
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(scopedPreview);
                        } catch {
                          // ignore in headless
                        }
                        setCopiedScope(true);
                        onNotify('Код tikzpicture с разбивкой по слоям \\begin{scope} скопирован.');
                        window.setTimeout(() => setCopiedScope(false), 1800);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--tz-button)] border border-[var(--tz-outline)] text-[11px]"
                    >
                      {copiedScope ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>Копировать scope-код</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[10.5px] max-h-32 overflow-auto whitespace-pre">
                    {scopedPreview}
                  </pre>
                </div>
              </div>

              {/* P47 Beamer Stepper */}
              <div className="lg:col-span-6 p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--tz-text)] flex items-center gap-1.5">
                    <Presentation className="w-4 h-4 text-[var(--tz-link)]" />
                    <span>P47 · Пошаговое раскрытие схемы для докладов Beamer (\onslide&lt;n-&gt;)</span>
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Назначьте выделенным элементам шаг появления (например: шаг 1 — линза, шаг 2 — падающий луч, шаг 3 — фокус) и проверьте слайды прямо на холсте.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-[var(--tz-muted)]">
                    Назначить оверлей Beamer выделенным объектам ({selectedPrimitiveIds.length} шт.):
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono">
                    {[
                      { spec: '', label: 'Всегда' },
                      { spec: '1-', label: '<1-> с 1-го' },
                      { spec: '2-', label: '<2-> со 2-го' },
                      { spec: '3-', label: '<3-> с 3-го' },
                      { spec: '4-', label: '<4-> с 4-го' },
                      { spec: '1-2', label: '<1-2> только 1–2' },
                      { spec: '2-3', label: '<2-3> только 2–3' },
                    ].map((b) => (
                      <button
                        key={b.spec || 'all'}
                        type="button"
                        onClick={() => onAssignBeamerSpecToSelection(b.spec)}
                        className="px-2.5 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] flex flex-col gap-2">
                  <span className="text-[11px] font-medium text-[var(--tz-text)]">
                    Предпросмотр активного кадра презентации на холсте:
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    {[null, 1, 2, 3, 4].map((s) => {
                      const active = activeBeamerSlide === s;
                      return (
                        <button
                          key={s === null ? 'all' : s}
                          type="button"
                          onClick={() => onChangeActiveBeamerSlide(s)}
                          className={`px-3 py-1 rounded border font-medium ${
                            active
                              ? 'bg-[var(--tz-accent)] text-white border-[var(--tz-accent)]'
                              : 'bg-[var(--tz-button)] text-[var(--tz-text)] border-[var(--tz-outline)]'
                          }`}
                        >
                          {s === null ? 'Все кадры' : `Слайд ${s}`}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    На холсте также доступна компактная полоса быстрого переключения слайдов <code className="font-mono">Beamer: Все · 1 · 2 · 3 · 4</code>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
