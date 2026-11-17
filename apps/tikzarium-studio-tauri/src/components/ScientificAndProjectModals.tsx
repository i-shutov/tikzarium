import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Compass,
  Repeat,
  LineChart,
  BookCheck,
  FolderKanban,
  LayoutGrid,
  Gauge,
  ClipboardPaste,
  Copy,
  Check,
  Download,
  Plus,
} from 'lucide-react';
import type { SpecimenDocument } from '../domain/catalog';
import type { OwnedPrimitive } from '../domain/tikzEngine';
import {
  JOURNAL_COLUMN_GAUGES,
  OKABE_ITO_PALETTE,
  SCIENTIFIC_STAMPS,
  SHARED_STYLE_DEFAULT_TIKZ,
  auditJournalReadability,
  composeSubfigureMatrixTex,
  generateForeachArrayInSource,
  inspectPgfplotsAxis,
  runBatchProjectAuditAndExport,
} from '../domain/scientificCadBundle';
import type {
  ColorProofMode,
  ForeachArrayConfig,
  JournalGaugeId,
  PgfplotsAxisConfig,
  SubfigureMatrixOptions,
} from '../domain/scientificCadBundle';

export type ScientificModalTab = 'stamps' | 'foreach' | 'pgfplots' | 'journal-palette';
export type ProjectModalTab = 'workspace' | 'subfigures' | 'batch-profiler';

const OKABE_ITO_BG_CLASSES: Record<string, string> = {
  oiBlue: 'bg-[#0072B2]',
  oiVermilion: 'bg-[#D55E00]',
  oiBluishGreen: 'bg-[#009E73]',
  oiOrange: 'bg-[#E69F00]',
  oiPurple: 'bg-[#CC79A7]',
  oiSkyBlue: 'bg-[#56B4E9]',
};

interface ScientificCadModalProps {
  open: boolean;
  initialTab?: ScientificModalTab;
  onClose: () => void;
  source: string;
  ownedPrimitives: OwnedPrimitive[];
  selectedPrimitiveIds: number[];
  journalGaugeId: JournalGaugeId;
  onChangeJournalGaugeId: (id: JournalGaugeId) => void;
  colorProofMode: ColorProofMode;
  onChangeColorProofMode: (mode: ColorProofMode) => void;
  onInsertStamp: (stampId: string, xCm: number, yCm: number, scale: number, labelLatex: string) => void;
  onInsertAngleArc: (
    vertexCm: { x: number; y: number },
    ray1Deg: number,
    ray2Deg: number,
    radiusCm: number,
    labelLatex: string
  ) => void;
  onApplyForeachArray: (cfg: ForeachArrayConfig) => void;
  onApplyPgfplotsAxis: (cfg: PgfplotsAxisConfig) => void;
  onApplyOkabeItoColor: (colorId: string, recommendedDash: string) => void;
  onPasteClipboardTable: (tsvText: string, mode: 'n1-points' | 'pgfplots-addplot') => void;
  onCopyRenderedCanvasToClipboard: () => void;
}

export const ScientificCadModal: React.FC<ScientificCadModalProps> = ({
  open,
  initialTab = 'stamps',
  onClose,
  source,
  ownedPrimitives,
  selectedPrimitiveIds,
  journalGaugeId,
  onChangeJournalGaugeId,
  colorProofMode,
  onChangeColorProofMode,
  onInsertStamp,
  onInsertAngleArc,
  onApplyForeachArray,
  onApplyPgfplotsAxis,
  onApplyOkabeItoColor,
  onPasteClipboardTable,
  onCopyRenderedCanvasToClipboard,
}) => {
  const [tab, setTab] = useState<ScientificModalTab>(initialTab);

  // P25 Stamp state
  const [domainFilter, setDomainFilter] = useState<string>('Все');
  const [selectedStampId, setSelectedStampId] = useState<string>(SCIENTIFIC_STAMPS[0].id);
  const [stampX, setStampX] = useState<string>('3.10');
  const [stampY, setStampY] = useState<string>('1.90');
  const [stampScale, setStampScale] = useState<string>('1.0');
  const [stampLabel, setStampLabel] = useState<string>(SCIENTIFIC_STAMPS[0].defaultLabelLatex);

  // P21 Angle Arc state
  const [arcVx, setArcVx] = useState<string>('1.60');
  const [arcVy, setArcVy] = useState<string>('1.80');
  const [arcDeg1, setArcDeg1] = useState<string>('0');
  const [arcDeg2, setArcDeg2] = useState<string>('42');
  const [arcRadius, setArcRadius] = useState<string>('0.75');
  const [arcLabel, setArcLabel] = useState<string>('\\alpha');

  // P23 Foreach state
  const [foreachKind, setForeachKind] = useState<'linear' | 'circular'>('linear');
  const [foreachCount, setForeachCount] = useState<number>(5);
  const [foreachDx, setForeachDx] = useState<string>('0.65');
  const [foreachDy, setForeachDy] = useState<string>('0.00');
  const [foreachCx, setForeachCx] = useState<string>('3.00');
  const [foreachCy, setForeachCy] = useState<string>('1.90');
  const [foreachStepDeg, setForeachStepDeg] = useState<string>('45');
  const [replaceOrig, setReplaceOrig] = useState<boolean>(false);

  // P27 PGFPlots state
  const [axisCfg, setAxisCfg] = useState<PgfplotsAxisConfig>(() => inspectPgfplotsAxis(source));

  // P35 Clipboard TSV paste state
  const [tsvInput, setTsvInput] = useState<string>(
    '420\t0,18\n465\t0,49\n515\t0,94\n560\t0,71\n620\t0,31\n670\t0,11'
  );
  const [tsvMode, setTsvMode] = useState<'n1-points' | 'pgfplots-addplot'>('n1-points');

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setAxisCfg(inspectPgfplotsAxis(source));
    }
  }, [initialTab, open, source]);

  const filteredStamps = useMemo(
    () =>
      domainFilter === 'Все'
        ? SCIENTIFIC_STAMPS
        : SCIENTIFIC_STAMPS.filter((s) => s.domainRu === domainFilter),
    [domainFilter]
  );

  const foreachPreview = useMemo(() => {
    const cfg: ForeachArrayConfig = {
      kind: foreachKind,
      count: foreachCount,
      dxCm: Number(foreachDx) || 0,
      dyCm: Number(foreachDy) || 0,
      centerXCm: Number(foreachCx) || 3,
      centerYCm: Number(foreachCy) || 1.9,
      stepDeg: Number(foreachStepDeg) || 45,
      replaceOriginal: replaceOrig,
    };
    return generateForeachArrayInSource(source, selectedPrimitiveIds, cfg).foreachBlock;
  }, [
    foreachCount,
    foreachCx,
    foreachCy,
    foreachDx,
    foreachDy,
    foreachKind,
    foreachStepDeg,
    replaceOrig,
    selectedPrimitiveIds,
    source,
  ]);

  const readabilityReport = useMemo(
    () => auditJournalReadability(ownedPrimitives, source, journalGaugeId === 'none' ? 'ieee-1col' : journalGaugeId),
    [journalGaugeId, ownedPrimitives, source]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Инженерный САПР, штампы, PGFPlots и палитра публикации"
      className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-4xl max-h-[88vh] rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-text)] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--tz-text)]">
              Инженерный САПР TikZ · Штампы, массивы \foreach, оси PGFPlots и эталон печати
            </h2>
            <p className="text-[11px] text-[var(--tz-muted)]">
              Генерация чистого параметрического кода TeX без ручной рутины
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно САПР"
            className="p-1 rounded hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-2 bg-[var(--tz-inset)] border-b border-[var(--tz-outline)] flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setTab('stamps')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium whitespace-nowrap shrink-0 ${
              tab === 'stamps'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border border-[var(--tz-outline)]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Штампы и дуги углов</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('foreach')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium whitespace-nowrap shrink-0 ${
              tab === 'foreach'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border border-[var(--tz-outline)]'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Массив \foreach</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('pgfplots')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium whitespace-nowrap shrink-0 ${
              tab === 'pgfplots'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border border-[var(--tz-outline)]'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Инспектор осей PGFPlots</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('journal-palette')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium whitespace-nowrap shrink-0 ${
              tab === 'journal-palette'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border border-[var(--tz-outline)]'
            }`}
          >
            <BookCheck className="w-3.5 h-3.5" />
            <span>Полоса журнала, палитра и буфер ОС</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 text-xs">
          {tab === 'stamps' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-1">
                  {['Все', 'Оптика', 'Электрические цепи', 'Механика', 'Системы управления'].map((dom) => (
                    <button
                      key={dom}
                      type="button"
                      onClick={() => setDomainFilter(dom)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap shrink-0 ${
                        domainFilter === dom
                          ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                          : 'bg-[var(--tz-button)] text-[var(--tz-muted)] border border-[var(--tz-outline)]'
                      }`}
                    >
                      {dom}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {filteredStamps.map((st) => {
                    const active = st.id === selectedStampId;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSelectedStampId(st.id);
                          setStampLabel(st.defaultLabelLatex);
                        }}
                        className={`p-2.5 rounded border text-left flex flex-col gap-1 transition-colors ${
                          active
                            ? 'bg-[var(--tz-active)] border-[var(--tz-accent)]'
                            : 'bg-[var(--tz-panel)] border-[var(--tz-outline)] hover:bg-[var(--tz-hover)]'
                        }`}
                      >
                        <div className="text-[10.5px] text-[var(--tz-muted)]">{st.domainRu}</div>
                        <div className="font-semibold text-[var(--tz-text)]">{st.titleRu}</div>
                        <div className="text-[11px] text-[var(--tz-muted)] leading-snug">{st.summaryRu}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-5 flex flex-col gap-3">
                <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2.5">
                  <h3 className="font-semibold text-[var(--tz-text)]">Параметры вставки штампа</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">X (см)</span>
                      <input
                        type="text"
                        value={stampX}
                        onChange={(e) => setStampX(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">Y (см)</span>
                      <input
                        type="text"
                        value={stampY}
                        onChange={(e) => setStampY(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">Масштаб</span>
                      <input
                        type="text"
                        value={stampScale}
                        onChange={(e) => setStampScale(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Подпись формулой LaTeX</span>
                    <input
                      type="text"
                      value={stampLabel}
                      onChange={(e) => setStampLabel(e.target.value)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      onInsertStamp(
                        selectedStampId,
                        Number(stampX) || 3.0,
                        Number(stampY) || 1.9,
                        Number(stampScale) || 1.0,
                        stampLabel
                      );
                      onClose();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Вставить штамп на холст</span>
                  </button>
                </div>

                {/* P21 Angle Arc Generator */}
                <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2">
                  <h3 className="font-semibold text-[var(--tz-text)]">Угловая дуга с меткой ∠°</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10.5px] text-[var(--tz-muted)]">Вершина X</span>
                      <input
                        type="text"
                        value={arcVx}
                        onChange={(e) => setArcVx(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10.5px] text-[var(--tz-muted)]">Вершина Y</span>
                      <input
                        type="text"
                        value={arcVy}
                        onChange={(e) => setArcVy(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10.5px] text-[var(--tz-muted)]">Радиус (см)</span>
                      <input
                        type="text"
                        value={arcRadius}
                        onChange={(e) => setArcRadius(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10.5px] text-[var(--tz-muted)]">Луч 1 (°)</span>
                      <input
                        type="text"
                        value={arcDeg1}
                        onChange={(e) => setArcDeg1(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10.5px] text-[var(--tz-muted)]">Луч 2 (°)</span>
                      <input
                        type="text"
                        value={arcDeg2}
                        onChange={(e) => setArcDeg2(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10.5px] text-[var(--tz-muted)]">Символ</span>
                      <input
                        type="text"
                        value={arcLabel}
                        onChange={(e) => setArcLabel(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onInsertAngleArc(
                        { x: Number(arcVx) || 1.6, y: Number(arcVy) || 1.8 },
                        Number(arcDeg1) || 0,
                        Number(arcDeg2) || 42,
                        Number(arcRadius) || 0.75,
                        arcLabel || '\\alpha'
                      );
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium whitespace-nowrap"
                  >
                    Добавить угловую дугу arc + узел подписи
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'foreach' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 flex flex-col gap-3 p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--tz-text)]">
                    Выбрано базовых примитивов: {selectedPrimitiveIds.length}
                  </span>
                  <div className="inline-flex rounded border border-[var(--tz-outline)] p-0.5 bg-[var(--tz-inset)]">
                    <button
                      type="button"
                      onClick={() => setForeachKind('linear')}
                      className={`px-2.5 py-0.5 rounded-sm whitespace-nowrap ${
                        foreachKind === 'linear' ? 'bg-[var(--tz-active)] text-[var(--tz-text)]' : 'text-[var(--tz-muted)]'
                      }`}
                    >
                      Линейный шаг
                    </button>
                    <button
                      type="button"
                      onClick={() => setForeachKind('circular')}
                      className={`px-2.5 py-0.5 rounded-sm whitespace-nowrap ${
                        foreachKind === 'circular' ? 'bg-[var(--tz-active)] text-[var(--tz-text)]' : 'text-[var(--tz-muted)]'
                      }`}
                    >
                      Круговой по углу
                    </button>
                  </div>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[var(--tz-muted)]">Число повторений (2..36)</span>
                  <input
                    type="number"
                    min={2}
                    max={36}
                    value={foreachCount}
                    onChange={(e) => setForeachCount(Number(e.target.value) || 4)}
                    className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                  />
                </label>

                {foreachKind === 'linear' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">Шаг ΔX (см)</span>
                      <input
                        type="text"
                        value={foreachDx}
                        onChange={(e) => setForeachDx(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">Шаг ΔY (см)</span>
                      <input
                        type="text"
                        value={foreachDy}
                        onChange={(e) => setForeachDy(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">Центр X (см)</span>
                      <input
                        type="text"
                        value={foreachCx}
                        onChange={(e) => setForeachCx(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">Центр Y (см)</span>
                      <input
                        type="text"
                        value={foreachCy}
                        onChange={(e) => setForeachCy(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">Шаг угла (°)</span>
                      <input
                        type="text"
                        value={foreachStepDeg}
                        onChange={(e) => setForeachStepDeg(e.target.value)}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                      />
                    </label>
                  </div>
                )}

                <label className="inline-flex items-center gap-2 text-[11px] text-[var(--tz-text)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceOrig}
                    onChange={(e) => setReplaceOrig(e.target.checked)}
                  />
                  <span>Заменить выделенный примитив единым циклом \foreach</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    onApplyForeachArray({
                      kind: foreachKind,
                      count: foreachCount,
                      dxCm: Number(foreachDx) || 0,
                      dyCm: Number(foreachDy) || 0,
                      centerXCm: Number(foreachCx) || 3,
                      centerYCm: Number(foreachCy) || 1.9,
                      stepDeg: Number(foreachStepDeg) || 45,
                      replaceOriginal: replaceOrig,
                    });
                    onClose();
                  }}
                  className="px-3 py-2 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95 whitespace-nowrap"
                >
                  Сгенерировать цикл \foreach в .tex
                </button>
              </div>

              <div className="md:col-span-6 flex flex-col gap-2">
                <span className="font-semibold text-[var(--tz-text)]">Предпросмотр генерируемого блока PGF/TikZ</span>
                <pre className="flex-1 p-3 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {foreachPreview}
                </pre>
              </div>
            </div>
          )}

          {tab === 'pgfplots' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--tz-text)]">Подписи и диапазоны осей \begin&#123;axis&#125;</h3>
                  <span className="text-[11px] text-[var(--tz-muted)]">
                    {axisCfg.present ? 'Обнаружен в документе' : 'Будет создан новый блок'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Подпись оси X (xlabel)</span>
                    <input
                      type="text"
                      value={axisCfg.xlabel}
                      onChange={(e) => setAxisCfg({ ...axisCfg, xlabel: e.target.value })}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Подпись оси Y (ylabel)</span>
                    <input
                      type="text"
                      value={axisCfg.ylabel}
                      onChange={(e) => setAxisCfg({ ...axisCfg, ylabel: e.target.value })}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">xmin</span>
                    <input
                      type="text"
                      value={axisCfg.xmin}
                      onChange={(e) => setAxisCfg({ ...axisCfg, xmin: e.target.value })}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">xmax</span>
                    <input
                      type="text"
                      value={axisCfg.xmax}
                      onChange={(e) => setAxisCfg({ ...axisCfg, xmax: e.target.value })}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">ymin</span>
                    <input
                      type="text"
                      value={axisCfg.ymin}
                      onChange={(e) => setAxisCfg({ ...axisCfg, ymin: e.target.value })}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">ymax</span>
                    <input
                      type="text"
                      value={axisCfg.ymax}
                      onChange={(e) => setAxisCfg({ ...axisCfg, ymax: e.target.value })}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                </div>
              </div>

              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2.5">
                  <h3 className="font-semibold text-[var(--tz-text)]">Шкалы, сетка и планки погрешностей</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">Режим оси X (xmode)</span>
                      <select
                        value={axisCfg.xmode}
                        onChange={(e) => setAxisCfg({ ...axisCfg, xmode: e.target.value as 'normal' | 'log' })}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                      >
                        <option value="normal">normal (линейная)</option>
                        <option value="log">log (логарифмическая)</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">Режим оси Y (ymode)</span>
                      <select
                        value={axisCfg.ymode}
                        onChange={(e) => setAxisCfg({ ...axisCfg, ymode: e.target.value as 'normal' | 'log' })}
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                      >
                        <option value="normal">normal (линейная)</option>
                        <option value="log">log (логарифмическая)</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">Сетка (grid)</span>
                      <select
                        value={axisCfg.grid}
                        onChange={(e) =>
                          setAxisCfg({ ...axisCfg, grid: e.target.value as 'major' | 'both' | 'none' })
                        }
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                      >
                        <option value="major">major</option>
                        <option value="both">both (major + minor)</option>
                        <option value="none">none</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[var(--tz-muted)]">Легенда (legend pos)</span>
                      <select
                        value={axisCfg.legendPos}
                        onChange={(e) =>
                          setAxisCfg({
                            ...axisCfg,
                            legendPos: e.target.value as PgfplotsAxisConfig['legendPos'],
                          })
                        }
                        className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                      >
                        <option value="north east">north east</option>
                        <option value="north west">north west</option>
                        <option value="south east">south east</option>
                        <option value="outer north east">outer north east</option>
                      </select>
                    </label>
                  </div>

                  <label className="inline-flex items-center gap-2 text-[11px] cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={axisCfg.errorBarsY}
                      onChange={(e) => setAxisCfg({ ...axisCfg, errorBarsY: e.target.checked })}
                    />
                    <span>Добавить вертикальные планки погрешностей (error bars/.cd, y explicit)</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onApplyPgfplotsAxis(axisCfg);
                    onClose();
                  }}
                  className="px-3 py-2 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95 whitespace-nowrap"
                >
                  Применить конфигурацию \begin&#123;axis&#125; к .tex
                </button>
              </div>
            </div>
          )}

          {tab === 'journal-palette' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* P28 + P29 Left Column */}
              <div className="md:col-span-6 flex flex-col gap-3">
                <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-[var(--tz-text)]">Эталон полосы набора журнала</h3>
                    <select
                      aria-label="Эталон ширины колонки научного журнала"
                      value={journalGaugeId}
                      onChange={(e) => onChangeJournalGaugeId(e.target.value as JournalGaugeId)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono text-[11px]"
                    >
                      {JOURNAL_COLUMN_GAUGES.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.shortLabelRu}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-[11px] text-[var(--tz-muted)] font-mono tabular-nums">
                    Габарит: {readabilityReport.bboxWidthCm.toFixed(2)}×{readabilityReport.bboxHeightCm.toFixed(2)} см · Масштаб печати:{' '}
                    {(readabilityReport.printScaleFactor * 100).toFixed(0)}% · Шрифт: {readabilityReport.effectiveNodeFontPt} pt · Штрих:{' '}
                    {readabilityReport.effectiveMinStrokePt} pt
                  </div>

                  {readabilityReport.passesAll ? (
                    <div className="text-[11px] text-emerald-500 font-medium">
                      Проверка пройдена: кегль и толщина штрихов соответствуют норме «{readabilityReport.gauge.titleRu}».
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-1 text-[11px] text-amber-500">
                      {readabilityReport.warningsRu.map((w, idx) => (
                        <li key={idx}>▲ {w}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* P29 Okabe-Ito Palette & Color Proofing */}
                <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-[var(--tz-text)]">Научная палитра Okabe–Ito и цветопроба</h3>
                    <select
                      aria-label="Режим цветопробы холста"
                      value={colorProofMode}
                      onChange={(e) => onChangeColorProofMode(e.target.value as ColorProofMode)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-[11px]"
                    >
                      <option value="normal">Цвет (обычный)</option>
                      <option value="grayscale">Ч/Б печать (Grayscale)</option>
                      <option value="deuteranopia">Дейтеранопия</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {OKABE_ITO_PALETTE.map((sw) => (
                      <button
                        key={sw.id}
                        type="button"
                        onClick={() => onApplyOkabeItoColor(sw.id, sw.recommendedDash)}
                        className="p-1.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] hover:bg-[var(--tz-hover)] flex items-center gap-2 text-left"
                      >
                        <span
                          aria-hidden="true"
                          className={`w-4 h-4 rounded-sm shrink-0 border border-black/20 ${
                            OKABE_ITO_BG_CLASSES[sw.id] ?? 'bg-sky-600'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium truncate">{sw.labelRu}</div>
                          <div className="text-[10px] font-mono text-[var(--tz-muted)]">
                            #{sw.hexNoHash} · {sw.recommendedDash}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* P35 Right Column: System Clipboard TSV Paste & Render Copy */}
              <div className="md:col-span-6 p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-[var(--tz-text)]">Системный буфер обмена ОС</h3>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const txt = await navigator.clipboard.readText();
                          if (txt.trim()) setTsvInput(txt);
                        } catch {
                          // Ignore clipboard permission limitations in sandboxed iframe
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] text-[11px] whitespace-nowrap"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>Из буфера ОС</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Вставьте столбцы X / Y из Excel, Calc или Origin (поддерживаются десятичные запятые и табуляция):
                  </p>
                  <textarea
                    rows={5}
                    value={tsvInput}
                    onChange={(e) => setTsvInput(e.target.value)}
                    aria-label="Табличные данные TSV/CSV для построения кривой"
                    className="w-full p-2 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono text-[11px]"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Целевой формат вставки таблицы"
                      value={tsvMode}
                      onChange={(e) => setTsvMode(e.target.value as 'n1-points' | 'pgfplots-addplot')}
                      className="flex-1 px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-[11px]"
                    >
                      <option value="n1-points">Интерактивные точки и сегменты n1 на холсте</option>
                      <option value="pgfplots-addplot">Серия \addplot coordinates в PGFPlots</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        onPasteClipboardTable(tsvInput, tsvMode);
                        onClose();
                      }}
                      className="px-3 py-1 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap"
                    >
                      Построить
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--tz-outline)] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[var(--tz-muted)]">
                    Копирование рендера для вставки в Word / Slides:
                  </span>
                  <button
                    type="button"
                    onClick={onCopyRenderedCanvasToClipboard}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium whitespace-nowrap"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Копировать SVG/PNG (Ctrl+Shift+C)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ArticleProjectModalProps {
  open: boolean;
  initialTab?: ProjectModalTab;
  onClose: () => void;
  allDocuments: SpecimenDocument[];
  activeDocId: string;
  onSelectDocument: (docId: string) => void;
  sharedStyleTikz: string;
  onChangeSharedStyleTikz: (val: string) => void;
  onInjectSharedStyleCurrent: () => void;
  onInjectSharedStyleAll: () => void;
  onCreateCompositeSubfigureDoc: (doc: SpecimenDocument) => void;
  onNotify: (msg: string) => void;
}

export const ArticleProjectModal: React.FC<ArticleProjectModalProps> = ({
  open,
  initialTab = 'workspace',
  onClose,
  allDocuments,
  activeDocId,
  onSelectDocument,
  sharedStyleTikz,
  onChangeSharedStyleTikz,
  onInjectSharedStyleCurrent,
  onInjectSharedStyleAll,
  onCreateCompositeSubfigureDoc,
  onNotify,
}) => {
  const [tab, setTab] = useState<ProjectModalTab>(initialTab);
  const [layout, setLayout] = useState<'1x2' | '2x1' | '2x2'>('1x2');
  const [alphabet, setAlphabet] = useState<'ru' | 'en'>('ru');
  const [colGapCm, setColGapCm] = useState<string>('0.8');
  const [rowGapCm, setRowGapCm] = useState<string>('0.6');
  const [compositeName, setCompositeName] = useState<string>('fig_composite_ab.tex');
  const [slotIds, setSlotIds] = useState<string[]>([]);
  const [copiedBundle, setCopiedBundle] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setSlotIds([
        allDocuments[0]?.id ?? '',
        allDocuments[1]?.id ?? allDocuments[0]?.id ?? '',
        allDocuments[2]?.id ?? allDocuments[0]?.id ?? '',
        allDocuments[0]?.id ?? '',
      ]);
    }
  }, [allDocuments, initialTab, open]);

  const slotCount = layout === '2x2' ? 4 : 2;

  const selectedSlotDocs = useMemo(() => {
    return slotIds
      .slice(0, slotCount)
      .map((id) => allDocuments.find((d) => d.id === id) ?? allDocuments[0])
      .filter(Boolean);
  }, [allDocuments, slotCount, slotIds]);

  const compositePreviewDoc = useMemo(() => {
    const opts: SubfigureMatrixOptions = {
      layout,
      alphabet,
      colGapCm: Number(colGapCm) || 0.8,
      rowGapCm: Number(rowGapCm) || 0.6,
      filename: compositeName.trim() || 'fig_composite_ab.tex',
    };
    return composeSubfigureMatrixTex(selectedSlotDocs, opts);
  }, [alphabet, colGapCm, compositeName, layout, rowGapCm, selectedSlotDocs]);

  const batchAudit = useMemo(() => runBatchProjectAuditAndExport(allDocuments), [allDocuments]);

  if (!open) return null;

  const handleDownloadBundle = () => {
    const blob = new Blob([batchAudit.combinedCleanBundleTex], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tikzarium_overleaf_clean_bundle.tex';
    a.click();
    URL.revokeObjectURL(url);
    onNotify(`Скачан чистый пакет иллюстраций без маркеров n1 (${batchAudit.readyCount} файлов).`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Проект статьи: единый стиль, панели (а)(б)(в) и пакетный профайлер"
      className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-4xl max-h-[88vh] rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-text)] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--tz-text)]">
              Проект научной статьи · Общий паспорт стилей, панели (а)(б)(в) и пакетный профайлер XeLaTeX
            </h2>
            <p className="text-[11px] text-[var(--tz-muted)]">
              Управление серией иллюстраций одной публикации или диссертации
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно проекта статьи"
            className="p-1 rounded hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2 bg-[var(--tz-inset)] border-b border-[var(--tz-outline)] flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setTab('workspace')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium whitespace-nowrap shrink-0 ${
              tab === 'workspace'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border border-[var(--tz-outline)]'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Файлы статьи и shared_style.tikz</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('subfigures')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium whitespace-nowrap shrink-0 ${
              tab === 'subfigures'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border border-[var(--tz-outline)]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Компоновщик панелей (а) (б) (в)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('batch-profiler')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium whitespace-nowrap shrink-0 ${
              tab === 'batch-profiler'
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border border-[var(--tz-accent)]'
                : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border border-[var(--tz-outline)]'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Пакетная сборка и профайлер мс</span>
          </button>
        </div>

        <div className="p-4 flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 text-xs">
          {tab === 'workspace' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5 flex flex-col gap-2">
                <h3 className="font-semibold text-[var(--tz-text)]">
                  Иллюстрации проекта ({allDocuments.length})
                </h3>
                <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {allDocuments.map((doc) => {
                    const isCurrent = doc.id === activeDocId;
                    const hasShared = doc.source.includes('shared_style.tikz');
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          onSelectDocument(doc.id);
                          onClose();
                        }}
                        className={`p-2.5 rounded border text-left flex items-center justify-between gap-2 ${
                          isCurrent
                            ? 'bg-[var(--tz-active)] border-[var(--tz-accent)]'
                            : 'bg-[var(--tz-panel)] border-[var(--tz-outline)] hover:bg-[var(--tz-hover)]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{doc.titleRu}</div>
                          <div className="text-[11px] font-mono text-[var(--tz-muted)] truncate">
                            {doc.filename} · {doc.lineEnding}
                            {hasShared ? ' · стиль подключён' : ''}
                          </div>
                        </div>
                        <span className="text-[11px] text-[var(--tz-link)] shrink-0">Открыть</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-7 flex flex-col gap-2.5 p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)]">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--tz-text)]">Единый паспорт стилей shared_style.tikz</h3>
                  <button
                    type="button"
                    onClick={() => onChangeSharedStyleTikz(SHARED_STYLE_DEFAULT_TIKZ)}
                    className="text-[11px] text-[var(--tz-link)] hover:underline"
                  >
                    Сбросить эталон
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={sharedStyleTikz}
                  onChange={(e) => onChangeSharedStyleTikz(e.target.value)}
                  aria-label="Содержимое общего стилевого файла shared_style.tikz"
                  className="w-full p-2.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono text-[11px] leading-relaxed"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onInjectSharedStyleCurrent}
                    className="px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap"
                  >
                    Внедрить в текущий файл
                  </button>
                  <button
                    type="button"
                    onClick={onInjectSharedStyleAll}
                    className="px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium whitespace-nowrap"
                  >
                    Синхронизировать во все созданные файлы
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'subfigures' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5 p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2.5">
                <h3 className="font-semibold text-[var(--tz-text)]">Матрица подрисунков статьи</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Сетка панелей</span>
                    <select
                      value={layout}
                      onChange={(e) => setLayout(e.target.value as '1x2' | '2x1' | '2x2')}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                    >
                      <option value="1x2">1 × 2 (в ряд)</option>
                      <option value="2x1">2 × 1 (столбец)</option>
                      <option value="2x2">2 × 2 (четыре панели)</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Метки</span>
                    <select
                      value={alphabet}
                      onChange={(e) => setAlphabet(e.target.value as 'ru' | 'en')}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                    >
                      <option value="ru">(а) (б) (в) — ГОСТ</option>
                      <option value="en">(a) (b) (c) — IEEE/APS</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Отступ X (см)</span>
                    <input
                      type="text"
                      value={colGapCm}
                      onChange={(e) => setColGapCm(e.target.value)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Отступ Y (см)</span>
                    <input
                      type="text"
                      value={rowGapCm}
                      onChange={(e) => setRowGapCm(e.target.value)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  {Array.from({ length: slotCount }, (_, idx) => (
                    <label key={idx} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[var(--tz-muted)] shrink-0">
                        Панель #{idx + 1}:
                      </span>
                      <select
                        value={slotIds[idx] ?? allDocuments[0]?.id ?? ''}
                        onChange={(e) => {
                          const next = [...slotIds];
                          next[idx] = e.target.value;
                          setSlotIds(next);
                        }}
                        className="flex-1 min-w-0 px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] truncate"
                      >
                        {allDocuments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.filename}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[var(--tz-muted)]">Имя выходного файла</span>
                  <input
                    type="text"
                    value={compositeName}
                    onChange={(e) => setCompositeName(e.target.value)}
                    className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    onCreateCompositeSubfigureDoc(compositePreviewDoc);
                    onClose();
                  }}
                  className="px-3 py-2 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95 whitespace-nowrap"
                >
                  Создать составной .tex и открыть в студии
                </button>
              </div>

              <div className="md:col-span-7 flex flex-col gap-2">
                <span className="font-semibold text-[var(--tz-text)]">
                  Чистый код составной фигуры (маркеры % tikzarium:n1: удалены автоматически)
                </span>
                <pre className="flex-1 max-h-[320px] p-3 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[11px] overflow-auto leading-relaxed">
                  {compositePreviewDoc.source}
                </pre>
              </div>
            </div>
          )}

          {tab === 'batch-profiler' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)]">
                <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-xs">
                  <span>
                    Готово к печати: <strong className="text-emerald-500">{batchAudit.readyCount}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    С ошибками: <strong className="text-rose-500">{batchAudit.errorCount}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Оценка полной сборки XeLaTeX: <strong>{batchAudit.totalMs} мс</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(batchAudit.combinedCleanBundleTex);
                        setCopiedBundle(true);
                        window.setTimeout(() => setCopiedBundle(false), 1800);
                      } catch {
                        setCopiedBundle(true);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-medium whitespace-nowrap"
                  >
                    {copiedBundle ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedBundle ? 'Скопировано' : 'Копировать пакет Overleaf'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadBundle}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать чистый пакет .tex</span>
                  </button>
                </div>
              </div>

              <div className="rounded border border-[var(--tz-outline)] overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] text-[var(--tz-muted)]">
                      <th className="py-2 px-3 font-medium">Файл</th>
                      <th className="py-2 px-2 font-medium text-right">n1</th>
                      <th className="py-2 px-2 font-medium">Статус</th>
                      <th className="py-2 px-2 font-medium text-right">Преамбула</th>
                      <th className="py-2 px-2 font-medium text-right">fontspec</th>
                      <th className="py-2 px-2 font-medium text-right">PGF/TikZ</th>
                      <th className="py-2 px-2 font-medium text-right">Итого</th>
                      <th className="py-2 px-3 font-medium">Профиль оптимизации</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchAudit.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-[var(--tz-outline)] last:border-b-0 hover:bg-[var(--tz-hover)]"
                      >
                        <td className="py-2 px-3 font-mono">{item.filename}</td>
                        <td className="py-2 px-2 font-mono tabular-nums text-right">{item.ownedCount}</td>
                        <td className="py-2 px-2 font-mono">
                          {item.status === 'READY' ? (
                            <span className="text-emerald-500">● ОК</span>
                          ) : (
                            <span className="text-rose-500">✖ Сбой ({item.diagnosticsCount})</span>
                          )}
                        </td>
                        <td className="py-2 px-2 font-mono tabular-nums text-right">{item.preambleMs} мс</td>
                        <td className="py-2 px-2 font-mono tabular-nums text-right">{item.fontspecMs} мс</td>
                        <td className="py-2 px-2 font-mono tabular-nums text-right">{item.pgfRenderMs} мс</td>
                        <td className="py-2 px-2 font-mono tabular-nums text-right font-semibold">
                          {item.totalEstimateMs} мс
                        </td>
                        <td className="py-2 px-3 text-[11px] text-[var(--tz-muted)]">{item.optimizationHintRu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
