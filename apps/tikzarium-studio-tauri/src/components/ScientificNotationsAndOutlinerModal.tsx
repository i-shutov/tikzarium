import React, { useMemo, useRef, useState } from 'react';
import {
  Atom,
  Box,
  Check,
  Copy,
  Download,
  Pipette,
  SearchCheck,
  Sparkles,
  Table2,
  Trash2,
  Upload,
  Wrench,
  X,
  ZoomIn,
} from 'lucide-react';
import { ALLOWED_FILL_COLORS, ALLOWED_HATCH_PATTERNS, ALLOWED_STROKE_COLORS } from '../domain/tikzEngine';
import type { OwnedPrimitive } from '../domain/tikzEngine';
import { CAD_LAYERS } from '../domain/advancedCadBundle';
import type { CadLayerId } from '../domain/advancedCadBundle';
import {
  AXONOMETRIC_BASIS_PRESETS,
  SCIENTIFIC_NOTATION_PRESETS,
  buildSpreadsheetRows,
  formatPositionalLegendCaptionRu,
  parseLatexToDisplayRuns,
  project3dPointTo2dCm,
  runVisualPreSubmissionAudit,
} from '../domain/scientificNotationsAndAuditBundle';
import type {
  EditableSpreadsheetField,
  NotationDomainGroup,
  PositionalLegendEntry,
  Scene3dPresetId,
  StylePassport,
  VisualLintFinding,
} from '../domain/scientificNotationsAndAuditBundle';

export type NotationsModalTabId =
  | 'notations'
  | 'proj3d-automata'
  | 'cad-fillet-spy'
  | 'outliner-table'
  | 'audit-session';

interface ScientificNotationsAndOutlinerModalProps {
  open: boolean;
  initialTab?: NotationsModalTabId;
  onClose: () => void;
  source: string;
  ownedPrimitives: OwnedPrimitive[];
  selectedPrimitiveIds: number[];
  journalWidthCm: number;
  hiddenLayers: CadLayerId[];
  lockedLayers: CadLayerId[];
  copiedStylePassport: StylePassport | null;
  onSampleStyleFromPrimitive: (primitiveId: number) => void;
  onApplyCopiedStyleToIds: (targetIds: number[]) => void;
  onInsertNotationPreset: (presetId: string, originCm: { x: number; y: number }) => void;
  onInsert3dScene: (
    sceneId: Scene3dPresetId,
    azimuthDeg: number,
    elevationDeg: number,
    originCm: { x: number; y: number },
    scaleCm: number
  ) => void;
  onConstructFilletOrChamfer: (radiusCm: number, mode: 'fillet' | 'chamfer') => void;
  onInsertFillBetween: (
    baselineYCm: number,
    options: { fillColor?: string; hatchPattern?: string }
  ) => void;
  onInsertSpyMagnifier: (
    lensCenterCm: { x: number; y: number },
    lensRadiusCm: number,
    insetCenterCm: { x: number; y: number },
    magnification: number
  ) => void;
  onInsertPositionalShelf: (
    posNumber: number,
    targetCm: { x: number; y: number },
    shelfCm: { x: number; y: number },
    labelRu: string
  ) => void;
  onEditSpreadsheetCell: (
    primitiveId: number,
    field: EditableSpreadsheetField,
    rawValue: string
  ) => void;
  onSelectPrimitiveFromTable: (primitiveId: number) => void;
  onJumpToLineFromTable: (lineNumber: number) => void;
  onDeletePrimitiveFromTable: (primitiveId: number) => void;
  onApplyVisualLintFix: (finding: VisualLintFinding) => void;
  onExportTikzprojFile: () => string;
  onImportTikzprojJson: (jsonText: string) => void;
  onNotify: (msg: string) => void;
}

export const ScientificNotationsAndOutlinerModal: React.FC<
  ScientificNotationsAndOutlinerModalProps
> = ({
  open,
  initialTab = 'notations',
  onClose,
  source,
  ownedPrimitives,
  selectedPrimitiveIds,
  journalWidthCm,
  hiddenLayers,
  lockedLayers,
  copiedStylePassport,
  onSampleStyleFromPrimitive,
  onApplyCopiedStyleToIds,
  onInsertNotationPreset,
  onInsert3dScene,
  onConstructFilletOrChamfer,
  onInsertFillBetween,
  onInsertSpyMagnifier,
  onInsertPositionalShelf,
  onEditSpreadsheetCell,
  onSelectPrimitiveFromTable,
  onJumpToLineFromTable,
  onDeletePrimitiveFromTable,
  onApplyVisualLintFix,
  onExportTikzprojFile,
  onImportTikzprojJson,
  onNotify,
}) => {
  const [tab, setTab] = useState<NotationsModalTabId>(initialTab);
  React.useEffect(() => {
    if (open) setTab(initialTab);
  }, [initialTab, open]);

  // Tab 1 state (P51-P53)
  const [domainFilter, setDomainFilter] = useState<'all' | NotationDomainGroup>('all');
  const [originXCm, setOriginXCm] = useState(0.95);
  const [originYCm, setOriginYCm] = useState(0.95);

  // Tab 2 state (P54-P55)
  const [azimuthDeg, setAzimuthDeg] = useState(45);
  const [elevationDeg, setElevationDeg] = useState(35);
  const [scale3d, setScale3d] = useState(1.1);
  const [scene3dId, setScene3dId] = useState<Scene3dPresetId>('axes-xyz-triad');

  // Tab 3 state (P56-P59)
  const [filletRadiusCm, setFilletRadiusCm] = useState(0.45);
  const [baselineYCm, setBaselineYCm] = useState(0.55);
  const [fillBetweenColor, setFillBetweenColor] = useState('blue!8');
  const [fillBetweenHatch, setFillBetweenHatch] = useState('');

  const [spyLensX, setSpyLensX] = useState(2.2);
  const [spyLensY, setSpyLensY] = useState(1.8);
  const [spyLensR, setSpyLensR] = useState(0.42);
  const [spyInsetX, setSpyInsetX] = useState(4.85);
  const [spyInsetY, setSpyInsetY] = useState(2.65);
  const [spyMag, setSpyMag] = useState(4);

  const [posNum, setPosNum] = useState(1);
  const [posTargetX, setPosTargetX] = useState(1.85);
  const [posTargetY, setPosTargetY] = useState(1.65);
  const [posShelfX, setPosShelfX] = useState(2.65);
  const [posShelfY, setPosShelfY] = useState(2.95);
  const [posTitleRu, setPosTitleRu] = useState('лазер накачки');
  const [legendEntries, setLegendEntries] = useState<PositionalLegendEntry[]>([
    { posNumber: 1, labelRu: 'источник когерентного излучения' },
    { posNumber: 2, labelRu: 'собирающая линза L₁' },
  ]);
  const [copiedLegend, setCopiedLegend] = useState(false);

  // Tab 4 state (P61-P62)
  const [tableFilterTool, setTableFilterTool] = useState<string>('all');
  const [tableFilterLayer, setTableFilterLayer] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState('');

  // Tab 5 state (P63-P65)
  const [mathSampleInput, setMathSampleInput] = useState(
    '\\lambda_{0} = 532 \\pm 0.5\\,\\text{нм}, \\quad |\\Psi^+\\rangle = \\frac{1}{\\sqrt{2}}(|01\\rangle + |10\\rangle)'
  );
  const [sessionJsonPreview, setSessionJsonPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const spreadsheetRows = useMemo(
    () => buildSpreadsheetRows(ownedPrimitives, hiddenLayers, lockedLayers),
    [hiddenLayers, lockedLayers, ownedPrimitives]
  );

  const filteredRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return spreadsheetRows.filter((r) => {
      if (tableFilterTool !== 'all' && r.tool !== tableFilterTool) return false;
      if (tableFilterLayer !== 'all' && r.layerId !== tableFilterLayer) return false;
      if (
        q &&
        !String(r.id).includes(q) &&
        !r.contentOrNote.toLowerCase().includes(q) &&
        !r.tool.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [spreadsheetRows, tableFilterLayer, tableFilterTool, tableSearch]);

  const visualFindings = useMemo(
    () => runVisualPreSubmissionAudit(source, ownedPrimitives, journalWidthCm),
    [journalWidthCm, ownedPrimitives, source]
  );

  const mathPreviewRuns = useMemo(
    () => parseLatexToDisplayRuns(mathSampleInput),
    [mathSampleInput]
  );

  // Live 3D gizmo projection for Tab 2
  const gizmo3d = useMemo(() => {
    const o = { x: 110, y: 82 };
    const proj = (x: number, y: number, z: number) => {
      const cm = project3dPointTo2dCm(x, y, z, azimuthDeg, elevationDeg, { x: 0, y: 0 }, 1.0);
      return { x: +(o.x + cm.x * 46).toFixed(1), y: +(o.y - cm.y * 46).toFixed(1) };
    };
    return {
      o,
      ex: proj(1.15, 0, 0),
      ey: proj(0, 1.15, 0),
      ez: proj(0, 0, 1.15),
      rv: proj(0.85, 0.85, 0.78),
      rxy: proj(0.85, 0.85, 0),
    };
  }, [azimuthDeg, elevationDeg]);

  if (!open) return null;

  const mainNotations = SCIENTIFIC_NOTATION_PRESETS.filter(
    (p) =>
      p.domainGroup !== 'automata-cd' &&
      (domainFilter === 'all' || p.domainGroup === domainFilter)
  );
  const automataNotations = SCIENTIFIC_NOTATION_PRESETS.filter(
    (p) => p.domainGroup === 'automata-cd'
  );
  const legendCaptionText = formatPositionalLegendCaptionRu(legendEntries);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Специализированные научные нотации, 3D-проектор, таблица объектов n1 и визуальный аудит"
      data-testid="notations-outliner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75"
    >
      <div className="w-full max-w-6xl max-h-[88vh] flex flex-col rounded-lg border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-text)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--tz-text)] truncate">
              Научные нотации, 3D-Аксонометрия, Таблица объектов и Пре-принт Аудит
            </h2>
            <p className="text-xs text-[var(--tz-muted)] truncate">
              Чистые примитивы PGF/TikZ без LuaTeX и нестандартных внешних пакетов
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно научных нотаций и таблицы"
            className="p-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border border-[var(--tz-outline)] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5 Single-Line Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Разделы научных нотаций и аудита"
          className="flex items-center gap-1 px-4 py-2 bg-[var(--tz-inset)] border-b border-[var(--tz-outline)] overflow-x-auto shrink-0 text-[11.5px]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'notations'}
            onClick={() => setTab('notations')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium whitespace-nowrap shrink-0 transition-colors ${
              tab === 'notations'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
            }`}
          >
            <Atom className="w-3.5 h-3.5 text-[var(--tz-link)]" />
            <span>1. Кванты, Химия и ТАУ</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'proj3d-automata'}
            onClick={() => setTab('proj3d-automata')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium whitespace-nowrap shrink-0 transition-colors ${
              tab === 'proj3d-automata'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-[var(--tz-link)]" />
            <span>2. 3D-Аксонометрия и Автоматы</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'cad-fillet-spy'}
            onClick={() => setTab('cad-fillet-spy')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium whitespace-nowrap shrink-0 transition-colors ${
              tab === 'cad-fillet-spy'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5 text-[var(--tz-link)]" />
            <span>3. Фаски, Заливка, Лупа</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'outliner-table'}
            onClick={() => setTab('outliner-table')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium whitespace-nowrap shrink-0 transition-colors ${
              tab === 'outliner-table'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
            }`}
          >
            <Table2 className="w-3.5 h-3.5 text-[var(--tz-link)]" />
            <span>4. Таблица объектов и Пипетка ({ownedPrimitives.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'audit-session'}
            onClick={() => setTab('audit-session')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium whitespace-nowrap shrink-0 transition-colors ${
              tab === 'audit-session'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
            }`}
          >
            <SearchCheck className="w-3.5 h-3.5 text-[var(--tz-link)]" />
            <span>5. Аудит печати ({visualFindings.length}) и сессия</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs">
          {/* TAB 1: Specialized Notations */}
          {tab === 'notations' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--tz-outline)]">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      ['all', 'Все дисциплины'],
                      ['quantum-feynman', 'Кванты и Фейнман'],
                      ['chem-jablonski', 'Уровни Яблонского и Органика'],
                      ['control-dsp', 'ТАУ и ЦОС'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDomainFilter(id)}
                      className={`px-2.5 py-1 rounded border whitespace-nowrap ${
                        domainFilter === id
                          ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)] font-medium'
                          : 'bg-[var(--tz-button)] text-[var(--tz-muted)] border-[var(--tz-outline)] hover:text-[var(--tz-text)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 font-mono tabular-nums">
                  <span className="font-sans text-[var(--tz-muted)]">Точка вставки (см):</span>
                  <label className="inline-flex items-center gap-1">
                    <span>X₀</span>
                    <input
                      type="number"
                      step="0.25"
                      value={originXCm}
                      onChange={(e) => setOriginXCm(Number(e.target.value) || 0)}
                      aria-label="Координата X0 вставки нотации"
                      className="w-16 px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-center"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <span>Y₀</span>
                    <input
                      type="number"
                      step="0.25"
                      value={originYCm}
                      onChange={(e) => setOriginYCm(Number(e.target.value) || 0)}
                      aria-label="Координата Y0 вставки нотации"
                      className="w-16 px-1.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-center"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mainNotations.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col justify-between gap-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="text-[11px] font-mono text-[var(--tz-muted)]">
                        {preset.codeTag} · {preset.primitives.length} объектов n1
                      </div>
                      <h3 className="text-xs font-semibold text-[var(--tz-text)]">
                        {preset.titleRu}
                      </h3>
                      <p className="text-[11px] text-[var(--tz-muted)] leading-relaxed">
                        {preset.subtitleRu}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--tz-outline)]">
                      <span className="text-[10.5px] font-mono text-[var(--tz-muted)] truncate">
                        {preset.requiredLibraries.length > 0
                          ? `\\usetikzlibrary{${preset.requiredLibraries.join(',')}}`
                          : 'Базовый PGF/TikZ без пакетов'}
                      </span>
                      <button
                        type="button"
                        data-testid={`insert-notation-${preset.id}`}
                        onClick={() =>
                          onInsertNotationPreset(preset.id, { x: originXCm, y: originYCm })
                        }
                        className="px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95 whitespace-nowrap shrink-0"
                      >
                        Вставить на холст
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: P54 3D Axonometric Projector & P55 Automata / Commutative Diagrams */}
          {tab === 'proj3d-automata' && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-4 border-b border-[var(--tz-outline)]">
                <div className="lg:col-span-7 flex flex-col gap-3">
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--tz-text)]">
                      01. 3D-Аксонометрия ГОСТ 2.317 и сферический базис (θ, φ) → 2D TikZ
                    </h3>
                    <p className="text-[11px] text-[var(--tz-muted)] mt-0.5">
                      Проецирует трёхмерные оси, волновые тройки (k, E, B), сферу Блоха и кристаллические ячейки в редактируемые 2D-примитивы TikZ.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {AXONOMETRIC_BASIS_PRESETS.map((bp) => (
                      <button
                        key={bp.id}
                        type="button"
                        onClick={() => {
                          setAzimuthDeg(bp.azimuthDeg);
                          setElevationDeg(bp.elevationDeg);
                        }}
                        className="px-2.5 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] text-[11px] whitespace-nowrap"
                      >
                        {bp.labelRu}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono tabular-nums">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">
                        Азимут φ: <strong className="text-[var(--tz-text)]">{azimuthDeg}°</strong>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={azimuthDeg}
                        onChange={(e) => setAzimuthDeg(Number(e.target.value))}
                        aria-label="Угол азимута 3D проекции"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">
                        Наклон θ: <strong className="text-[var(--tz-text)]">{elevationDeg}°</strong>
                      </span>
                      <input
                        type="range"
                        min={5}
                        max={85}
                        value={elevationDeg}
                        onChange={(e) => setElevationDeg(Number(e.target.value))}
                        aria-label="Угол наклона 3D проекции"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">
                        Масштаб: <strong className="text-[var(--tz-text)]">×{scale3d.toFixed(2)}</strong>
                      </span>
                      <input
                        type="range"
                        min={0.7}
                        max={1.6}
                        step={0.05}
                        value={scale3d}
                        onChange={(e) => setScale3d(Number(e.target.value))}
                        aria-label="Масштаб 3D сцены"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <select
                      aria-label="Выбор 3D сцены для проекции"
                      value={scene3dId}
                      onChange={(e) => setScene3dId(e.target.value as Scene3dPresetId)}
                      className="px-2.5 py-1.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-xs"
                    >
                      <option value="axes-xyz-triad">Оси (x, y, z) + радиус-вектор r(θ, φ)</option>
                      <option value="em-wave-keb">Электромагнитная волна E(y) ⊥ B(y)</option>
                      <option value="bloch-vector-psi">Квантовая сфера Блоха и вектор |ψ⟩</option>
                      <option value="crystal-unit-cell">Элементарная кубическая ячейка кристалла</option>
                    </select>

                    <button
                      type="button"
                      data-testid="insert-3d-scene-btn"
                      onClick={() =>
                        onInsert3dScene(
                          scene3dId,
                          azimuthDeg,
                          elevationDeg,
                          { x: 2.9, y: 1.55 },
                          scale3d
                        )
                      }
                      className="px-3.5 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95 whitespace-nowrap"
                    >
                      Спроецировать 3D в .tex
                    </button>
                  </div>
                </div>

                {/* Live Immediate-Mode SVG 3D Gizmo Preview */}
                <div className="lg:col-span-5 rounded border border-[var(--tz-outline)] bg-white p-3 flex flex-col items-center justify-center">
                  <svg viewBox="0 0 220 156" className="w-full max-w-[240px] h-[142px]">
                    <defs>
                      <marker id="gizmo-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                        <path d="M0,1 L8,4 L0,7 z" fill="#334155" />
                      </marker>
                    </defs>
                    <line x1={gizmo3d.o.x} y1={gizmo3d.o.y} x2={gizmo3d.ex.x} y2={gizmo3d.ex.y} stroke="#dc2626" strokeWidth="1.6" markerEnd="url(#gizmo-arr)" />
                    <line x1={gizmo3d.o.x} y1={gizmo3d.o.y} x2={gizmo3d.ey.x} y2={gizmo3d.ey.y} stroke="#059669" strokeWidth="1.6" markerEnd="url(#gizmo-arr)" />
                    <line x1={gizmo3d.o.x} y1={gizmo3d.o.y} x2={gizmo3d.ez.x} y2={gizmo3d.ez.y} stroke="#2563eb" strokeWidth="1.6" markerEnd="url(#gizmo-arr)" />
                    <line x1={gizmo3d.o.x} y1={gizmo3d.o.y} x2={gizmo3d.rxy.x} y2={gizmo3d.rxy.y} stroke="#94a3b8" strokeDasharray="3 2" strokeWidth="1.2" />
                    <line x1={gizmo3d.rxy.x} y1={gizmo3d.rxy.y} x2={gizmo3d.rv.x} y2={gizmo3d.rv.y} stroke="#94a3b8" strokeDasharray="3 2" strokeWidth="1.2" />
                    <line x1={gizmo3d.o.x} y1={gizmo3d.o.y} x2={gizmo3d.rv.x} y2={gizmo3d.rv.y} stroke="#0f172a" strokeWidth="2.1" markerEnd="url(#gizmo-arr)" />
                    <text x={gizmo3d.ex.x + 4} y={gizmo3d.ex.y + 4} fontSize="11" fontFamily="Georgia, serif" fontStyle="italic" fill="#dc2626">x</text>
                    <text x={gizmo3d.ey.x + 4} y={gizmo3d.ey.y + 4} fontSize="11" fontFamily="Georgia, serif" fontStyle="italic" fill="#059669">y</text>
                    <text x={gizmo3d.ez.x + 4} y={gizmo3d.ez.y - 3} fontSize="11" fontFamily="Georgia, serif" fontStyle="italic" fill="#2563eb">z</text>
                    <text x={gizmo3d.rv.x + 5} y={gizmo3d.rv.y - 4} fontSize="11.5" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fill="#0f172a">r(θ,φ)</text>
                  </svg>
                  <span className="text-[10.5px] font-mono text-slate-500 tabular-nums">
                    Аксонометрический базис · φ={azimuthDeg}° · θ={elevationDeg}°
                  </span>
                </div>
              </div>

              {/* Automata & Commutative Diagrams */}
              <div className="flex flex-col gap-2.5">
                <h3 className="text-xs font-semibold text-[var(--tz-text)]">
                  02. Конечные автоматы (ДКА / Мили) и коммутативные квадраты морфизмов
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {automataNotations.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="text-[11px] font-mono text-[var(--tz-muted)]">{preset.codeTag}</div>
                        <div className="text-xs font-semibold text-[var(--tz-text)] mt-0.5">{preset.titleRu}</div>
                        <p className="text-[11px] text-[var(--tz-muted)] mt-1">{preset.subtitleRu}</p>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => onInsertNotationPreset(preset.id, { x: 1.1, y: 1.0 })}
                          className="px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95 whitespace-nowrap"
                        >
                          Вставить диаграмму
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: P56 Fillet/Chamfer, P57 FillBetween, P58 Spy Magnifier, P59 Patent Leader Shelves */}
          {tab === 'cad-fillet-spy' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* P56 Fillet & Chamfer */}
              <div className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--tz-text)]">
                    01. Скругление угла (Fillet R) и фаска (Chamfer) двух отрезков
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)] mt-0.5">
                    Выделите 2 непараллельных отрезка на холсте (сейчас выбрано:{' '}
                    <strong className="font-mono tabular-nums">{selectedPrimitiveIds.length}</strong>). Солвер автоматически подрежет вершину и вставит касательную дугу или фаску.
                  </p>
                </div>
                <label className="flex items-center justify-between gap-2 font-mono tabular-nums">
                  <span className="font-sans text-[var(--tz-muted)]">Радиус / катет фаски R (см):</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="2.5"
                    value={filletRadiusCm}
                    onChange={(e) => setFilletRadiusCm(Math.max(0.1, Number(e.target.value) || 0.4))}
                    aria-label="Радиус скругления в сантиметрах"
                    className="w-20 px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                  />
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    data-testid="build-fillet-btn"
                    onClick={() => onConstructFilletOrChamfer(filletRadiusCm, 'fillet')}
                    className="flex-1 px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95 whitespace-nowrap"
                  >
                    Скруглить дугой R
                  </button>
                  <button
                    type="button"
                    onClick={() => onConstructFilletOrChamfer(filletRadiusCm, 'chamfer')}
                    className="flex-1 px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium whitespace-nowrap"
                  >
                    Срезать фаску
                  </button>
                </div>
              </div>

              {/* P57 FillBetween */}
              <div className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--tz-text)]">
                    02. Заливка между двумя кривыми / доверительный коридор ±σ
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)] mt-0.5">
                    Выделите 2 кривые (коридор между ними) или 1 кривую (интеграл до базовой линии y₀). Замкнутый полигон <code className="font-mono">-- cycle</code> помещается на фоновый слой <code className="font-mono">bg</code>.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] text-[var(--tz-muted)]">Уровень y₀ (см)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={baselineYCm}
                      onChange={(e) => setBaselineYCm(Number(e.target.value) || 0)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] text-[var(--tz-muted)]">Цвет области</span>
                    <select
                      value={fillBetweenColor}
                      onChange={(e) => setFillBetweenColor(e.target.value)}
                      className="px-1.5 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    >
                      {ALLOWED_FILL_COLORS.filter(Boolean).map((fc) => (
                        <option key={fc} value={fc}>
                          {fc}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] text-[var(--tz-muted)]">Штриховка ГОСТ</span>
                    <select
                      value={fillBetweenHatch}
                      onChange={(e) => setFillBetweenHatch(e.target.value)}
                      className="px-1.5 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    >
                      {ALLOWED_HATCH_PATTERNS.map((hp) => (
                        <option key={hp || 'none-hp'} value={hp}>
                          {hp || 'сплошная'}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  data-testid="build-fillbetween-btn"
                  onClick={() =>
                    onInsertFillBetween(baselineYCm, {
                      fillColor: fillBetweenColor,
                      hatchPattern: fillBetweenHatch || undefined,
                    })
                  }
                  className="px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95 whitespace-nowrap"
                >
                  Построить заливку области (-- cycle)
                </button>
              </div>

              {/* P58 Spy Magnifier */}
              <div className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--tz-text)]">
                    03. Выносной элемент-лупа «А (×M)» по ГОСТ 2.305 / spy
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)] mt-0.5">
                    Строит кольцо захвата мелкого узла, увеличенный круговой выносной вид с масштабированием попавших штрихов и пунктирную линию связи.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
                  <label className="flex flex-col gap-1">
                    <span className="font-sans text-[10.5px] text-[var(--tz-muted)]">Линза X, Y (см)</span>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        step="0.2"
                        value={spyLensX}
                        onChange={(e) => setSpyLensX(Number(e.target.value) || 0)}
                        aria-label="Центр линзы X"
                        className="w-1/2 px-1 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                      />
                      <input
                        type="number"
                        step="0.2"
                        value={spyLensY}
                        onChange={(e) => setSpyLensY(Number(e.target.value) || 0)}
                        aria-label="Центр линзы Y"
                        className="w-1/2 px-1 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-sans text-[10.5px] text-[var(--tz-muted)]">Выноска X, Y</span>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        step="0.2"
                        value={spyInsetX}
                        onChange={(e) => setSpyInsetX(Number(e.target.value) || 0)}
                        aria-label="Центр выносного вида X"
                        className="w-1/2 px-1 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                      />
                      <input
                        type="number"
                        step="0.2"
                        value={spyInsetY}
                        onChange={(e) => setSpyInsetY(Number(e.target.value) || 0)}
                        aria-label="Центр выносного вида Y"
                        className="w-1/2 px-1 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-sans text-[10.5px] text-[var(--tz-muted)]">Кратность ×M / R</span>
                    <div className="flex gap-1">
                      <select
                        value={spyMag}
                        onChange={(e) => setSpyMag(Number(e.target.value))}
                        aria-label="Кратность увеличения лупы"
                        className="w-1/2 px-1 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                      >
                        {[2, 3, 4, 5, 6].map((m) => (
                          <option key={m} value={m}>
                            ×{m}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.05"
                        value={spyLensR}
                        onChange={(e) => setSpyLensR(Math.max(0.2, Number(e.target.value) || 0.4))}
                        aria-label="Радиус захвата лупы"
                        className="w-1/2 px-1 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                      />
                    </div>
                  </label>
                </div>
                <button
                  type="button"
                  data-testid="insert-spy-magnifier-btn"
                  onClick={() =>
                    onInsertSpyMagnifier(
                      { x: spyLensX, y: spyLensY },
                      spyLensR,
                      { x: spyInsetX, y: spyInsetY },
                      spyMag
                    )
                  }
                  className="px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95 whitespace-nowrap"
                >
                  Добавить выносной вид-лупу А (×{spyMag})
                </button>
              </div>

              {/* P59 Patent & ГОСТ Positional Leader Shelves */}
              <div className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--tz-text)]">
                    04. Позиционные выноски-полки ГОСТ 2.316 и экспликация подписи
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)] mt-0.5">
                    Создаёт точку на детали, наклонную выноску с горизонтальной полкой номера и формирует готовую русскую экспликацию для <code className="font-mono">\caption</code>.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] text-[var(--tz-muted)]">Позиция №</span>
                    <input
                      type="number"
                      min={1}
                      value={posNum}
                      onChange={(e) => setPosNum(Math.max(1, Number(e.target.value) || 1))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                  <label className="col-span-2 flex flex-col gap-1">
                    <span className="text-[10.5px] text-[var(--tz-muted)]">Наименование узла в подрисуночной подписи</span>
                    <input
                      type="text"
                      value={posTitleRu}
                      onChange={(e) => setPosTitleRu(e.target.value)}
                      placeholder="например, фотоприёмник"
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono tabular-nums">
                  <div className="flex items-center gap-1">
                    <span className="font-sans text-[10.5px] text-[var(--tz-muted)]">Точка:</span>
                    <input
                      type="number"
                      step="0.2"
                      value={posTargetX}
                      onChange={(e) => setPosTargetX(Number(e.target.value) || 0)}
                      aria-label="Точка детали X"
                      className="w-16 px-1 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                    />
                    <input
                      type="number"
                      step="0.2"
                      value={posTargetY}
                      onChange={(e) => setPosTargetY(Number(e.target.value) || 0)}
                      aria-label="Точка детали Y"
                      className="w-16 px-1 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-sans text-[10.5px] text-[var(--tz-muted)]">Полка:</span>
                    <input
                      type="number"
                      step="0.2"
                      value={posShelfX}
                      onChange={(e) => setPosShelfX(Number(e.target.value) || 0)}
                      aria-label="Полка выноски X"
                      className="w-16 px-1 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                    />
                    <input
                      type="number"
                      step="0.2"
                      value={posShelfY}
                      onChange={(e) => setPosShelfY(Number(e.target.value) || 0)}
                      aria-label="Полка выноски Y"
                      className="w-16 px-1 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="insert-pos-shelf-btn"
                    onClick={() => {
                      onInsertPositionalShelf(
                        posNum,
                        { x: posTargetX, y: posTargetY },
                        { x: posShelfX, y: posShelfY },
                        posTitleRu
                      );
                      setLegendEntries((prev) => [
                        ...prev.filter((e) => e.posNumber !== posNum),
                        { posNumber: posNum, labelRu: posTitleRu || `элемент ${posNum}` },
                      ]);
                      setPosNum((n) => n + 1);
                      setPosShelfY((y) => +(Math.max(0.5, y - 0.45)).toFixed(2));
                    }}
                    className="flex-1 px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95 whitespace-nowrap"
                  >
                    Поставить полку №{posNum} на чертёж
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(legendCaptionText);
                      setCopiedLegend(true);
                      window.setTimeout(() => setCopiedLegend(false), 1800);
                      onNotify('Строка экспликации позиций скопирована для \\caption{...}.');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                  >
                    {copiedLegend ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>В буфер</span>
                  </button>
                </div>
                <div className="px-2.5 py-1.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[10.5px] text-[var(--tz-muted)] truncate">
                  {legendCaptionText || 'Экспликация пуста'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: P61-P62 Spreadsheet Object Outliner & Style Passport */}
          {tab === 'outliner-table' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--tz-outline)]">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="search"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Поиск по #id или подписи…"
                    aria-label="Поиск по таблице объектов n1"
                    className="w-48 px-2.5 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]"
                  />
                  <select
                    aria-label="Фильтр по типу примитива"
                    value={tableFilterTool}
                    onChange={(e) => setTableFilterTool(e.target.value)}
                    className="px-2 py-1 rounded bg-[var(--tz-button)] border border-[var(--tz-outline)]"
                  >
                    <option value="all">Все типы ({ownedPrimitives.length})</option>
                    <option value="line">line (отрезок/контур)</option>
                    <option value="arrow">arrow (стрелка)</option>
                    <option value="rectangle">rectangle (прямоугольник)</option>
                    <option value="circle">circle (окружность)</option>
                    <option value="cubic">cubic (кривая Безье)</option>
                    <option value="node">node (узел/формула)</option>
                  </select>
                  <select
                    aria-label="Фильтр по слою"
                    value={tableFilterLayer}
                    onChange={(e) => setTableFilterLayer(e.target.value)}
                    className="px-2 py-1 rounded bg-[var(--tz-button)] border border-[var(--tz-outline)]"
                  >
                    <option value="all">Все слои</option>
                    {CAD_LAYERS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.shortRu} ({l.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* P61 Style Passport Indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--tz-muted)] font-mono">
                    {copiedStylePassport
                      ? `Паспорт стиля от #${copiedStylePassport.sourcePrimitiveId} (${copiedStylePassport.stroke_color || 'black'} · ${copiedStylePassport.stroke_width || 'std'})`
                      : 'Пипетка: нажмите «Взять» у любой строки'}
                  </span>
                  {copiedStylePassport && selectedPrimitiveIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onApplyCopiedStyleToIds(selectedPrimitiveIds)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap"
                    >
                      <Pipette className="w-3.5 h-3.5" />
                      <span>К выделенным ({selectedPrimitiveIds.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {filteredRows.length === 0 ? (
                <div className="p-8 text-center text-[var(--tz-muted)]">
                  Нет объектов n1, удовлетворяющих фильтру таблицы.
                </div>
              ) : (
                <div className="overflow-x-auto rounded border border-[var(--tz-outline)]">
                  <table className="w-full text-left border-collapse font-mono tabular-nums text-[11px]">
                    <thead>
                      <tr className="bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] text-[var(--tz-muted)] font-sans">
                        <th className="px-2 py-1.5">#ID / Тип</th>
                        <th className="px-2 py-1.5">X₁ (см)</th>
                        <th className="px-2 py-1.5">Y₁ (см)</th>
                        <th className="px-2 py-1.5">X₂ / R</th>
                        <th className="px-2 py-1.5">Y₂ (см)</th>
                        <th className="px-2 py-1.5">Формула / Метка</th>
                        <th className="px-2 py-1.5">Слой</th>
                        <th className="px-2 py-1.5">Цвет</th>
                        <th className="px-2 py-1.5">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => {
                        const isSel = selectedPrimitiveIds.includes(row.id);
                        return (
                          <tr
                            key={row.id}
                            className={`border-b border-[var(--tz-outline)] ${
                              isSel ? 'bg-sky-500/10' : 'hover:bg-[var(--tz-hover)]/40'
                            }`}
                          >
                            <td className="px-2 py-1 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onSelectPrimitiveFromTable(row.id)}
                                className="font-semibold text-[var(--tz-link)] hover:underline"
                              >
                                #{row.id} {row.tool}
                              </button>
                              <span className="text-[10px] text-[var(--tz-muted)] ml-1">с.{row.lineNumber}</span>
                            </td>
                            <td className="px-1.5 py-1">
                              <input
                                type="text"
                                defaultValue={row.x1Cm}
                                key={`x1-${row.id}-${row.x1Cm}`}
                                aria-label={`X1 объекта #${row.id}`}
                                onBlur={(e) => {
                                  if (e.target.value !== row.x1Cm) {
                                    onEditSpreadsheetCell(row.id, 'x1Cm', e.target.value);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                }}
                                className="w-14 px-1 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                              />
                            </td>
                            <td className="px-1.5 py-1">
                              <input
                                type="text"
                                defaultValue={row.y1Cm}
                                key={`y1-${row.id}-${row.y1Cm}`}
                                aria-label={`Y1 объекта #${row.id}`}
                                onBlur={(e) => {
                                  if (e.target.value !== row.y1Cm) {
                                    onEditSpreadsheetCell(row.id, 'y1Cm', e.target.value);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                }}
                                className="w-14 px-1 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                              />
                            </td>
                            <td className="px-1.5 py-1">
                              {row.x2OrRadiusCm === '—' ? (
                                <span className="text-[var(--tz-muted)] px-2">—</span>
                              ) : (
                                <input
                                  type="text"
                                  defaultValue={row.x2OrRadiusCm}
                                  key={`x2-${row.id}-${row.x2OrRadiusCm}`}
                                  aria-label={`X2 или радиус объекта #${row.id}`}
                                  onBlur={(e) => {
                                    if (e.target.value !== row.x2OrRadiusCm) {
                                      onEditSpreadsheetCell(row.id, 'x2OrRadiusCm', e.target.value);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                  }}
                                  className="w-14 px-1 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                                />
                              )}
                            </td>
                            <td className="px-1.5 py-1">
                              {row.y2Cm === '—' ? (
                                <span className="text-[var(--tz-muted)] px-2">—</span>
                              ) : (
                                <input
                                  type="text"
                                  defaultValue={row.y2Cm}
                                  key={`y2-${row.id}-${row.y2Cm}`}
                                  aria-label={`Y2 объекта #${row.id}`}
                                  onBlur={(e) => {
                                    if (e.target.value !== row.y2Cm) {
                                      onEditSpreadsheetCell(row.id, 'y2Cm', e.target.value);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                  }}
                                  className="w-14 px-1 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-center"
                                />
                              )}
                            </td>
                            <td className="px-1.5 py-1">
                              <input
                                type="text"
                                defaultValue={row.contentOrNote}
                                key={`note-${row.id}-${row.contentOrNote}`}
                                disabled={row.tool !== 'node'}
                                aria-label={`Подпись объекта #${row.id}`}
                                onBlur={(e) => {
                                  if (e.target.value !== row.contentOrNote) {
                                    onEditSpreadsheetCell(row.id, 'contentOrNote', e.target.value);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                }}
                                className="w-36 px-1.5 py-0.5 rounded bg-[var(--tz-window)] disabled:opacity-55 border border-[var(--tz-outline)]"
                              />
                            </td>
                            <td className="px-1.5 py-1">
                              <select
                                value={row.layerId}
                                aria-label={`Слой объекта #${row.id}`}
                                onChange={(e) =>
                                  onEditSpreadsheetCell(row.id, 'layerId', e.target.value)
                                }
                                className="px-1 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-sans"
                              >
                                {CAD_LAYERS.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.shortRu}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-1.5 py-1">
                              <select
                                value={row.strokeColor}
                                aria-label={`Цвет штриха объекта #${row.id}`}
                                onChange={(e) =>
                                  onEditSpreadsheetCell(row.id, 'strokeColor', e.target.value)
                                }
                                className="px-1 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                              >
                                {ALLOWED_STROKE_COLORS.map((sc) => (
                                  <option key={sc || 'blk'} value={sc}>
                                    {sc || 'black'}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap font-sans">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onSampleStyleFromPrimitive(row.id)}
                                  title="Скопировать паспорт стиля этого объекта"
                                  className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)]"
                                >
                                  Взять
                                </button>
                                {copiedStylePassport && (
                                  <button
                                    type="button"
                                    onClick={() => onApplyCopiedStyleToIds([row.id])}
                                    title="Применить скопированный стиль к строке"
                                    className="px-1.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/40"
                                  >
                                    Стиль
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    onJumpToLineFromTable(row.lineNumber);
                                    onClose();
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)]"
                                >
                                  Код
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeletePrimitiveFromTable(row.id)}
                                  aria-label={`Удалить объект #${row.id}`}
                                  className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: P63 Live Math Shaper, P64 Visual Audit & P65 .tikzproj Session */}
          {tab === 'audit-session' && (
            <div className="flex flex-col gap-5">
              {/* P63 Live SVG Math Typography Preview */}
              <div className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-[var(--tz-text)]">
                    01. Живой рендерер математической типографики на SVG-холсте без LaTeX-компиляции
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-500 whitespace-nowrap">
                    Активен на всех узлах холста
                  </span>
                </div>
                <p className="text-[11px] text-[var(--tz-muted)]">
                  Индексы <code className="font-mono">{'_{...}'}</code>, степени <code className="font-mono">{'^{...}'}</code>, греческий алфавит, дираковские скобки <code className="font-mono">{'\\langle..\\rangle'}</code> и прямые единицы СИ <code className="font-mono">{'\\text{нм}'}</code> рендерятся через <code className="font-mono">&lt;tspan&gt;</code> прямо на интерактивном эскизе:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <input
                    type="text"
                    value={mathSampleInput}
                    onChange={(e) => setMathSampleInput(e.target.value)}
                    aria-label="Тестовая формула LaTeX для предпросмотра шейпера"
                    className="px-2.5 py-1.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono text-xs"
                  />
                  <div className="rounded border border-slate-200 bg-white px-3 py-2 flex items-center justify-center">
                    <svg viewBox="0 0 420 34" className="w-full h-8">
                      <text x="210" y="22" textAnchor="middle" fontSize="14.5" fontFamily="Georgia, serif" fontStyle="italic" fill="#0f172a">
                        {mathPreviewRuns.map((run, idx) => {
                          const prev = idx > 0 ? mathPreviewRuns[idx - 1].script : 'normal';
                          const dy =
                            run.script === prev
                              ? 0
                              : (run.script === 'sub' ? 4 : run.script === 'sup' ? -5 : 0) -
                                (prev === 'sub' ? 4 : prev === 'sup' ? -5 : 0);
                          return (
                            <tspan
                              key={idx}
                              dy={dy || undefined}
                              fontSize={run.script === 'normal' ? 14.5 : 10.2}
                              fontStyle={run.upright ? 'normal' : 'italic'}
                              fontWeight={run.bold ? '700' : undefined}
                              fontFamily={run.upright ? 'IBM Plex Sans, sans-serif' : 'Georgia, serif'}
                            >
                              {run.text}
                            </tspan>
                          );
                        })}
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* P64 Visual & Geometric Pre-Submission Audit */}
              <div className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--tz-text)]">
                      02. Геометрический и типографический пре-принт аудит без компилятора
                    </h3>
                    <p className="text-[11px] text-[var(--tz-muted)]">
                      Проверяет коллизии рамок подписей (BBox), риск обрыва сверхтонких штрихов в колонке {journalWidthCm} см и русские буквы-омоглифы (с/c, р/p, х/x, о/o) внутри <code className="font-mono">$...$</code>.
                    </p>
                  </div>
                  <span className="font-mono tabular-nums text-xs">
                    Замечаний: <strong>{visualFindings.length}</strong>
                  </span>
                </div>

                {visualFindings.length === 0 ? (
                  <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>
                      Нарушений не обнаружено: подписи не перекрываются, толщины линий безопасны для печати, омоглифов в формулах нет.
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {visualFindings.map((f) => (
                      <div
                        key={f.id}
                        className="p-3 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="font-medium text-amber-400">
                            [{f.code}] {f.titleRu}
                          </div>
                          <div className="text-[11px] text-[var(--tz-muted)]">{f.detailRu}</div>
                        </div>
                        {f.canAutoFix && (
                          <button
                            type="button"
                            onClick={() => onApplyVisualLintFix(f)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap shrink-0"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Исправить в 1 клик</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* P65 Portable .tikzproj Session Bundle */}
              <div className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--tz-text)]">
                    03. Портативный пакет рабочей сессии проекта .tikzproj (Linux ↔ Windows 10 · P65)
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)] mt-0.5">
                    Сохраняет и восстанавливает все документы статьи, авторские сниппеты, калибровку оцифровщика, видимость/блокировку слоёв и пропорции панелей в единый JSON-файл <code className="font-mono">.tikzproj</code> (поддерживается и перетаскивание файла в окно).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="export-tikzproj-btn"
                    onClick={() => {
                      const json = onExportTikzprojFile();
                      setSessionJsonPreview(json);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать сессию (.tikzproj)</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".tikzproj,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          setSessionJsonPreview(reader.result);
                          onImportTikzprojJson(reader.result);
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Загрузить файл .tikzproj…</span>
                  </button>

                  {sessionJsonPreview && (
                    <button
                      type="button"
                      onClick={() => onImportTikzprojJson(sessionJsonPreview)}
                      className="px-3 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-medium whitespace-nowrap"
                    >
                      Применить JSON из поля ниже
                    </button>
                  )}
                </div>

                {sessionJsonPreview && (
                  <textarea
                    rows={4}
                    value={sessionJsonPreview}
                    onChange={(e) => setSessionJsonPreview(e.target.value)}
                    aria-label="Содержимое файла сессии .tikzproj"
                    className="w-full p-2.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[11px]"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
