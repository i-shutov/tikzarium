import React, { useMemo, useState } from 'react';
import {
  X,
  WandSparkles,
  Spline,
  FileCode2,
  Scissors,
  Layers,
  Table2,
  PackageCheck,
  Upload,
  Copy,
  Check,
  Download,
} from 'lucide-react';
import type { OwnedPrimitive } from '../domain/tikzEngine';
import {
  DEMO_OPTICS_BENCH_SVG,
  buildBooktabsTableLatex,
  buildSelfContainedTexBundle,
  detectRepeatedTikzStyles,
  extractAnchorPointsFromPrimitives,
  organizePreambleAndDetectUnusedLibraries,
} from '../domain/formatterRefactorAndCadBundle';
import type { AutoFormatOptions, TikzLengthUnit } from '../domain/formatterRefactorAndCadBundle';

export type FormatterModalTabId = 'format-refactor' | 'cad-spline-offset' | 'svg-booktabs-bundle';

interface FormatterRefactorAndCadModalProps {
  open: boolean;
  initialTab: FormatterModalTabId;
  onClose: () => void;
  filename: string;
  source: string;
  ownedPrimitives: OwnedPrimitive[];
  selectedPrimitiveIds: number[];
  dataDependencies: string[];
  formatOnSave: boolean;
  onChangeFormatOnSave: (enabled: boolean) => void;
  indentSpaces: 2 | 4;
  onChangeIndentSpaces: (spaces: 2 | 4) => void;
  onRunAutoFormat: (opts: AutoFormatOptions) => void;
  onConvertUnits: (
    unit: TikzLengthUnit,
    decimals: number,
    scope: 'all' | 'selected'
  ) => void;
  onExtractStyleToTikzset: (styleName: string, tikzOptionsBody: string) => void;
  onCleanPreamble: (removeUnusedLibraries: boolean) => void;
  onInsertOffsetContour: (primitiveId: number, offsetCm: number) => void;
  onInsertSpline: (
    pointsCm: Array<{ x: number; y: number }>,
    opts: { closed: boolean; tension: number; arrowTipOnLast: boolean }
  ) => void;
  onTrimOrExtendSegment: (
    targetSegId: number,
    boundarySegId: number,
    mode: 'trim' | 'extend'
  ) => void;
  onInsertGostSupportComb: (
    segmentId: number,
    opts: { stepCm: number; toothLenCm: number; angleDeg: number; flipSide: boolean }
  ) => void;
  onImportSvgMarkup: (svgMarkup: string, targetWidthCm: number) => void;
  onInsertBooktabsTable: (latexBlock: string, useSiunitx: boolean) => void;
  onNotify: (msg: string) => void;
}

const DEFAULT_SAMPLE_CSV = [
  'Режим лазера,Длина волны нм,Мощность мВт,Добротность Q',
  'Основная мода TEM00,532.0,124.5,98.4',
  'Вторая гармоника SHG,1064.0,210.0,94.1',
  'УФ-накачка импульсная,355.0,68.2,91.7',
].join('\n');

function parseManualPointsInput(raw: string): Array<{ x: number; y: number }> {
  const chunks = raw
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const pts: Array<{ x: number; y: number }> = [];
  for (const ch of chunks) {
    const parts = ch.split(/[,\s]+/).map(Number);
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      pts.push({ x: parts[0], y: parts[1] });
    }
  }
  return pts;
}

export const FormatterRefactorAndCadModal: React.FC<FormatterRefactorAndCadModalProps> = ({
  open,
  initialTab,
  onClose,
  filename,
  source,
  ownedPrimitives,
  selectedPrimitiveIds,
  dataDependencies,
  formatOnSave,
  onChangeFormatOnSave,
  indentSpaces,
  onChangeIndentSpaces,
  onRunAutoFormat,
  onConvertUnits,
  onExtractStyleToTikzset,
  onCleanPreamble,
  onInsertOffsetContour,
  onInsertSpline,
  onTrimOrExtendSegment,
  onInsertGostSupportComb,
  onImportSvgMarkup,
  onInsertBooktabsTable,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<FormatterModalTabId>(initialTab);

  // Sync initialTab when modal opens on a specific tab
  React.useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [initialTab, open]);

  // Tab 1 state (P66–P69)
  const [sortOptions, setSortOptions] = useState(true);
  const [normalizeOps, setNormalizeOps] = useState(true);
  const [alignComments, setAlignComments] = useState(true);
  const [targetUnit, setTargetUnit] = useState<TikzLengthUnit>('mm');
  const [unitDecimals, setUnitDecimals] = useState<number>(1);
  const [unitScope, setUnitScope] = useState<'all' | 'selected'>('all');
  const [customStyleNames, setCustomStyleNames] = useState<Record<string, string>>({});
  const [removeUnusedLibs, setRemoveUnusedLibs] = useState(true);

  // Tab 2 state (P74–P77)
  const segmentPrimitives = useMemo(
    () => ownedPrimitives.filter((p) => p.tool === 'line' || p.tool === 'arrow'),
    [ownedPrimitives]
  );
  const offsetCapablePrimitives = useMemo(
    () =>
      ownedPrimitives.filter(
        (p) =>
          p.tool === 'line' ||
          p.tool === 'arrow' ||
          p.tool === 'rectangle' ||
          p.tool === 'circle'
      ),
    [ownedPrimitives]
  );

  const defaultOffsetPrimId =
    selectedPrimitiveIds.find((id) => offsetCapablePrimitives.some((p) => p.id === id)) ??
    offsetCapablePrimitives[0]?.id ??
    0;
  const [offsetTargetId, setOffsetTargetId] = useState<number>(defaultOffsetPrimId);
  const [offsetDeltaCm, setOffsetDeltaCm] = useState<number>(0.3);

  const [splineCoordsText, setSplineCoordsText] = useState(
    '0.60, 0.80; 1.75, 2.15; 3.10, 1.25; 4.55, 2.45'
  );
  const [splineClosed, setSplineClosed] = useState(false);
  const [splineArrow, setSplineArrow] = useState(true);
  const [splineTension, setSplineTension] = useState<number>(1.0);

  const [trimTargetId, setTrimTargetId] = useState<number>(segmentPrimitives[0]?.id ?? 0);
  const [trimBoundaryId, setTrimBoundaryId] = useState<number>(segmentPrimitives[1]?.id ?? 0);

  const [combSegId, setCombSegId] = useState<number>(segmentPrimitives[0]?.id ?? 0);
  const [combStepCm, setCombStepCm] = useState<number>(0.25);
  const [combToothCm, setCombToothCm] = useState<number>(0.22);
  const [combAngleDeg, setCombAngleDeg] = useState<number>(45);
  const [combFlip, setCombFlip] = useState(false);

  // Keep target IDs valid when primitives change
  React.useEffect(() => {
    if (selectedPrimitiveIds.length > 0) {
      const firstOff = selectedPrimitiveIds.find((id) =>
        offsetCapablePrimitives.some((p) => p.id === id)
      );
      if (firstOff) setOffsetTargetId(firstOff);

      const selSegs = selectedPrimitiveIds.filter((id) =>
        segmentPrimitives.some((p) => p.id === id)
      );
      if (selSegs[0]) {
        setTrimTargetId(selSegs[0]);
        setCombSegId(selSegs[0]);
      }
      if (selSegs[1]) {
        setTrimBoundaryId(selSegs[1]);
      }
    } else {
      if (!offsetCapablePrimitives.some((p) => p.id === offsetTargetId)) {
        setOffsetTargetId(offsetCapablePrimitives[0]?.id ?? 0);
      }
      if (!segmentPrimitives.some((p) => p.id === trimTargetId)) {
        setTrimTargetId(segmentPrimitives[0]?.id ?? 0);
      }
      if (!segmentPrimitives.some((p) => p.id === trimBoundaryId)) {
        setTrimBoundaryId(segmentPrimitives[1]?.id ?? segmentPrimitives[0]?.id ?? 0);
      }
      if (!segmentPrimitives.some((p) => p.id === combSegId)) {
        setCombSegId(segmentPrimitives[0]?.id ?? 0);
      }
    }
  }, [
    combSegId,
    offsetCapablePrimitives,
    offsetTargetId,
    segmentPrimitives,
    selectedPrimitiveIds,
    trimBoundaryId,
    trimTargetId,
  ]);

  // Tab 3 state (P78–P80)
  const [svgMarkup, setSvgMarkup] = useState<string>(DEMO_OPTICS_BENCH_SVG);
  const [svgWidthCm, setSvgWidthCm] = useState<number>(8.8);

  const [csvTableInput, setCsvTableInput] = useState<string>(DEFAULT_SAMPLE_CSV);
  const [tableCaptionRu, setTableCaptionRu] = useState('Параметры лазерного резонатора');
  const [tableLabel, setTableLabel] = useState('tab:resonator');
  const [tableUseSiunitx, setTableUseSiunitx] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [bundleStripN1, setBundleStripN1] = useState(true);
  const [bundleFormat, setBundleFormat] = useState(true);
  const [bundleEmbedData, setBundleEmbedData] = useState(true);

  const repeatedStyles = useMemo(
    () => detectRepeatedTikzStyles(ownedPrimitives),
    [ownedPrimitives]
  );
  const preambleAudit = useMemo(
    () => organizePreambleAndDetectUnusedLibraries(source),
    [source]
  );

  const booktabsPreview = useMemo(
    () =>
      buildBooktabsTableLatex(csvTableInput, {
        captionRu: tableCaptionRu,
        label: tableLabel,
        useSiunitxSColumn: tableUseSiunitx,
        wrapInTableEnv: true,
      }),
    [csvTableInput, tableCaptionRu, tableLabel, tableUseSiunitx]
  );

  const bundlePreview = useMemo(() => {
    const embeddedFiles = bundleEmbedData
      ? (dataDependencies.length > 0 ? dataDependencies : ['spectrum_ref.csv']).map((dep) => ({
          filename: dep,
          content: 'wavelength_nm,intensity_rel\n480,0.18\n532,0.96\n633,0.44',
        }))
      : [];
    return buildSelfContainedTexBundle(source, {
      stripN1Metadata: bundleStripN1,
      formatCode: bundleFormat,
      indentSpaces,
      embeddedFiles,
    });
  }, [bundleEmbedData, bundleFormat, bundleStripN1, dataDependencies, indentSpaces, source]);

  if (!open) return null;

  const copyTextWithFeedback = async (key: string, text: string, noticeRu: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard fallback in restricted headless environments
    }
    setCopiedKey(key);
    onNotify(noticeRu);
    window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
  };

  const handleDownloadBundle = () => {
    const cleanBase = filename.replace(/\.tex$/i, '');
    const outName = bundleStripN1 ? `${cleanBase}_standalone_clean.tex` : `${cleanBase}_bundle.tex`;
    const blob = new Blob([bundlePreview.bundledSource], { type: 'text/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onNotify(`Сохранён автономный однофайловый архив ${outName}.`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Автоформатирование кода, рефакторинг .tex, САПР сплайнов и импорт SVG"
      data-testid="formatter-cad-bundle-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-6xl max-h-[90vh] flex flex-col rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-text)] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <WandSparkles className="w-4 h-4 text-[var(--tz-link)] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">
                Автоформатирование .tex, Рефакторинг стилей, Сплайны/Offset и SVG-архив
              </h2>
              <p className="text-[11px] text-[var(--tz-muted)] truncate">
                Безопасная нормализация кода без потери макросов, кириллицы, CRLF и интерактивных маркеров
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно автоформатирование и САПР"
            className="p-1.5 rounded hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Non-Clipping Desktop Tabs */}
        <div
          role="tablist"
          aria-label="Разделы форматирования и САПР"
          className="grid grid-cols-3 border-b border-[var(--tz-outline)] bg-[var(--tz-inset)] text-xs shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'format-refactor'}
            data-testid="tab-format-refactor"
            onClick={() => setActiveTab('format-refactor')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'format-refactor'
                ? 'border-[var(--tz-accent)] bg-[var(--tz-window)] text-[var(--tz-text)]'
                : 'border-transparent text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
            }`}
          >
            <WandSparkles className="w-3.5 h-3.5 shrink-0" />
            <span>1. Автоформат и Рефакторинг</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cad-spline-offset'}
            data-testid="tab-cad-spline-offset"
            onClick={() => setActiveTab('cad-spline-offset')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'cad-spline-offset'
                ? 'border-[var(--tz-accent)] bg-[var(--tz-window)] text-[var(--tz-text)]'
                : 'border-transparent text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
            }`}
          >
            <Spline className="w-3.5 h-3.5 shrink-0" />
            <span>2. Эквидистанта, Сплайн и Trim</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'svg-booktabs-bundle'}
            data-testid="tab-svg-booktabs-bundle"
            onClick={() => setActiveTab('svg-booktabs-bundle')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'svg-booktabs-bundle'
                ? 'border-[var(--tz-accent)] bg-[var(--tz-window)] text-[var(--tz-text)]'
                : 'border-transparent text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 shrink-0" />
            <span>3. Импорт SVG, booktabs и Архив</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-[var(--tz-window)]">
          {activeTab === 'format-refactor' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              {/* P66: AST-Safe Auto-Formatter */}
              <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[var(--tz-text)]">
                      P66 · AST-безопасное автоформатирование TikZ / LaTeX
                    </h3>
                    <p className="text-[11px] text-[var(--tz-muted)]">
                      Каскадные отступы окружений, канонический порядок опций [...] и выравнивание %
                    </p>
                  </div>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[10px] text-[var(--tz-muted)]">
                    Shift+Alt+F
                  </kbd>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Шаг отступа окружений</span>
                    <select
                      aria-label="Шаг отступа автоформатирования"
                      value={indentSpaces}
                      onChange={(e) => onChangeIndentSpaces(Number(e.target.value) as 2 | 4)}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    >
                      <option value={2}>2 пробела (стандарт TikZ)</option>
                      <option value={4}>4 пробела (широкий ГОСТ)</option>
                    </select>
                  </label>

                  <div className="flex flex-col justify-end">
                    <label className="inline-flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={formatOnSave}
                        onChange={(e) => onChangeFormatOnSave(e.target.checked)}
                        className="rounded border-[var(--tz-outline)]"
                      />
                      <span className="text-[11px] font-medium">
                        Форматировать при сохранении (Ctrl+S)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-[11px]">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sortOptions}
                      onChange={(e) => setSortOptions(e.target.checked)}
                    />
                    <span>Канонический порядок опций внутри [...] (толщина → штрих → draw → fill → стрелка)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={normalizeOps}
                      onChange={(e) => setNormalizeOps(e.target.checked)}
                    />
                    <span>Единообразные пробелы вокруг --, |-, .. controls .. и координат (x, y)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alignComments}
                      onChange={(e) => setAlignComments(e.target.checked)}
                    />
                    <span>Выравнивать строчные комментарии % по колонке (не затрагивая % tikzarium:n1:)</span>
                  </label>
                </div>

                <button
                  type="button"
                  data-testid="modal-run-autoformat-btn"
                  onClick={() =>
                    onRunAutoFormat({
                      indentSpaces,
                      sortBracketOptions: sortOptions,
                      normalizePathOperators: normalizeOps,
                      alignTrailingComments: alignComments,
                    })
                  }
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium hover:opacity-95"
                >
                  <WandSparkles className="w-3.5 h-3.5" />
                  <span>Форматировать исходный код .tex сейчас</span>
                </button>
              </div>

              {/* P67: Batch Unit Converter */}
              <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P67 · Пакетный конвертер единиц (cm ↔ mm ↔ pt) и округление
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Пересчитывает числа и синхронно обновляет hex-метаданные % tikzarium:n1: без смещения фигур
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Целевая единица</span>
                    <select
                      aria-label="Целевая единица длины"
                      value={targetUnit}
                      onChange={(e) => {
                        const u = e.target.value as TikzLengthUnit;
                        setTargetUnit(u);
                        setUnitDecimals(u === 'cm' ? 2 : 1);
                      }}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono"
                    >
                      <option value="cm">cm (сантиметры)</option>
                      <option value="mm">mm (миллиметры ГОСТ)</option>
                      <option value="pt">pt (пункты TeX)</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Знаков после точки</span>
                    <select
                      aria-label="Точность знаков после запятой"
                      value={unitDecimals}
                      onChange={(e) => setUnitDecimals(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    >
                      <option value={1}>1 знак (15.0mm)</option>
                      <option value={2}>2 знака (1.50cm)</option>
                      <option value={3}>3 знака (1.500cm)</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Область</span>
                    <select
                      aria-label="Область конвертации единиц"
                      value={unitScope}
                      onChange={(e) => setUnitScope(e.target.value as 'all' | 'selected')}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)]"
                    >
                      <option value="all">Весь документ ({ownedPrimitives.length} n1)</option>
                      <option value="selected" disabled={selectedPrimitiveIds.length === 0}>
                        Выделенные ({selectedPrimitiveIds.length})
                      </option>
                    </select>
                  </label>
                </div>

                <div className="p-2 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono tabular-nums text-[11px] text-[var(--tz-muted)]">
                  Эталон: 1.00cm = 10.0mm = 28.5pt · Примитивов n1 в буфере: {ownedPrimitives.length}
                </div>

                <button
                  type="button"
                  data-testid="modal-convert-units-btn"
                  onClick={() => onConvertUnits(targetUnit, unitDecimals, unitScope)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-medium"
                >
                  <span>Пересчитать координаты в {targetUnit}</span>
                </button>
              </div>

              {/* P68: DRY Style Extractor (\tikzset) */}
              <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P68 · Экстрактор повторяющихся стилей в \tikzset (DRY-рефакторинг)
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Находит одинаковые наборы [thick, draw=..., fill=...] у 2+ фигур и создаёт именованный стиль в преамбуле
                  </p>
                </div>

                {repeatedStyles.length === 0 ? (
                  <div className="p-3 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[11px] text-[var(--tz-muted)]">
                    В текущем чертеже нет повторяющихся многокомпонентных комбинаций опций (2+ примитивов с одинаковыми цветами/толщиной).
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
                    {repeatedStyles.map((cand) => {
                      const styleName = customStyleNames[cand.id] ?? cand.suggestedStyleName;
                      return (
                        <div
                          key={cand.id}
                          className="p-2 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] flex flex-col gap-1.5"
                        >
                          <div className="font-mono text-[11px] text-[var(--tz-syn-opt)] truncate">
                            {cand.summaryRu}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              aria-label="Имя стиля tikzset"
                              value={styleName}
                              onChange={(e) =>
                                setCustomStyleNames((prev) => ({
                                  ...prev,
                                  [cand.id]: e.target.value,
                                }))
                              }
                              className="w-32 px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono text-[11px]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                onExtractStyleToTikzset(styleName, cand.tikzOptionsBody)
                              }
                              className="px-2.5 py-1 rounded bg-[var(--tz-accent)] text-white text-[11px] font-medium whitespace-nowrap"
                            >
                              Вынести в \tikzset
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* P69: Preamble Organizer & Unused Library Cleaner */}
              <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P69 · Органайзер преамбулы и детектор неиспользуемых библиотек TikZ
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Склеивает разрозненные \usetikzlibrary в одну алфавитную строку и убирает лишние библиотеки
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] flex flex-col gap-1.5 text-[11px]">
                  <div className="font-mono tabular-nums">
                    Подключено библиотек: <strong>{preambleAudit.declaredLibraries.length}</strong> (строк \usetikzlibrary: {preambleAudit.fragmentedUsetikzlibraryLines})
                  </div>
                  {preambleAudit.unusedLibraries.length > 0 ? (
                    <div className="text-amber-400">
                      Не используются ({preambleAudit.unusedLibraries.length}):{' '}
                      <span className="font-mono">
                        {preambleAudit.unusedLibraries.map((u) => u.name).join(', ')}
                      </span>
                    </div>
                  ) : (
                    <div className="text-emerald-400">
                      Все объявленные библиотеки TikZ активно задействованы в документе.
                    </div>
                  )}
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={removeUnusedLibs}
                    onChange={(e) => setRemoveUnusedLibs(e.target.checked)}
                  />
                  <span>Удалить неиспользуемые библиотеки TikZ при нормализации преамбулы</span>
                </label>

                <button
                  type="button"
                  data-testid="modal-clean-preamble-btn"
                  onClick={() => onCleanPreamble(removeUnusedLibs)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-medium"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Упорядочить и очистить преамбулу</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'cad-spline-offset' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              {/* P74: Parallel Contour Offset */}
              <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P74 · Параллельный отступ контура (Offset ±Δd)
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Строит вторую параллельную стенку волновода, капилляра, кюветы или концентрического контура
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Базовый примитив n1</span>
                    <select
                      aria-label="Примитив для эквидистанты"
                      value={offsetTargetId}
                      onChange={(e) => setOffsetTargetId(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    >
                      {offsetCapablePrimitives.length === 0 && (
                        <option value={0}>Нет подходящих примитивов</option>
                      )}
                      {offsetCapablePrimitives.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.id} · {p.tool} (стр.{p.lineNumber})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Смещение Δd (см)</span>
                    <input
                      type="number"
                      step="0.05"
                      aria-label="Смещение эквидистанты в сантиметрах"
                      value={offsetDeltaCm}
                      onChange={(e) => setOffsetDeltaCm(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-1.5">
                  {[-0.3, -0.15, 0.15, 0.3, 0.5].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOffsetDeltaCm(preset)}
                      className="px-2 py-0.5 rounded bg-[var(--tz-inset)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-mono tabular-nums text-[11px]"
                    >
                      {preset > 0 ? `+${preset.toFixed(2)}` : preset.toFixed(2)} см
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  data-testid="modal-build-offset-btn"
                  disabled={!offsetTargetId}
                  onClick={() => onInsertOffsetContour(offsetTargetId, offsetDeltaCm)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[var(--tz-accent)] disabled:opacity-45 text-white font-medium"
                >
                  <span>Построить эквидистанту ±Δd</span>
                </button>
              </div>

              {/* P75: Smooth Interpolating Catmull–Rom Spline */}
              <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[var(--tz-text)]">
                      P75 · Гладкий интерполяционный сплайн (Catmull–Rom → Безье C¹)
                    </h3>
                    <p className="text-[11px] text-[var(--tz-muted)]">
                      Кривая строго проходит через заданные узлы с непрерывной касательной
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const selPrims = ownedPrimitives.filter((p) =>
                        selectedPrimitiveIds.includes(p.id)
                      );
                      const pts = extractAnchorPointsFromPrimitives(
                        selPrims.length >= 2 ? selPrims : ownedPrimitives.slice(0, 4)
                      );
                      if (pts.length >= 2) {
                        setSplineCoordsText(
                          pts.map((pt) => `${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}`).join('; ')
                        );
                        onNotify(`Считано ${pts.length} опорных точек из примитивов холста.`);
                      }
                    }}
                    className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] text-[11px] whitespace-nowrap shrink-0"
                  >
                    Из примитивов
                  </button>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[var(--tz-muted)]">
                    Узловые точки (x, y в см через точку с запятой)
                  </span>
                  <input
                    type="text"
                    aria-label="Узловые точки интерполяционного сплайна"
                    value={splineCoordsText}
                    onChange={(e) => setSplineCoordsText(e.target.value)}
                    className="px-2.5 py-1.5 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono tabular-nums text-xs"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={splineClosed}
                      onChange={(e) => setSplineClosed(e.target.checked)}
                    />
                    <span>Замкнутая петля</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={splineArrow}
                      disabled={splineClosed}
                      onChange={(e) => setSplineArrow(e.target.checked)}
                    />
                    <span>Стрелка Stealth на конце</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <span className="text-[var(--tz-muted)]">Натяжение:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.2"
                      max="1.5"
                      aria-label="Натяжение сплайна"
                      value={splineTension}
                      onChange={(e) => setSplineTension(Number(e.target.value))}
                      className="w-16 px-1.5 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  data-testid="modal-build-spline-btn"
                  onClick={() => {
                    const pts = parseManualPointsInput(splineCoordsText);
                    onInsertSpline(pts, {
                      closed: splineClosed,
                      tension: splineTension,
                      arrowTipOnLast: splineArrow,
                    });
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium"
                >
                  <Spline className="w-3.5 h-3.5" />
                  <span>Построить гладкий сплайн в n1</span>
                </button>
              </div>

              {/* P76: Ray Trim & Extend */}
              <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P76 · Подрезка луча (Trim) и дотягивание до границы (Extend)
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Находит точное пересечение с зеркалом/стенкой и подрезает хвост либо дотягивает вершину
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Изменяемый луч / отрезок</span>
                    <select
                      aria-label="Изменяемый луч для Trim или Extend"
                      value={trimTargetId}
                      onChange={(e) => setTrimTargetId(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    >
                      {segmentPrimitives.length === 0 && <option value={0}>Нет отрезков</option>}
                      {segmentPrimitives.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.id} · {p.tool} (стр.{p.lineNumber})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Секущая граница (зеркало)</span>
                    <select
                      aria-label="Секущая граница для Trim или Extend"
                      value={trimBoundaryId}
                      onChange={(e) => setTrimBoundaryId(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    >
                      {segmentPrimitives.length === 0 && <option value={0}>Нет отрезков</option>}
                      {segmentPrimitives.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.id} · {p.tool} (стр.{p.lineNumber})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!trimTargetId || !trimBoundaryId || trimTargetId === trimBoundaryId}
                    onClick={() => onTrimOrExtendSegment(trimTargetId, trimBoundaryId, 'trim')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] disabled:opacity-45 border border-[var(--tz-outline)] font-medium"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Подрезать (Trim)</span>
                  </button>
                  <button
                    type="button"
                    disabled={!trimTargetId || !trimBoundaryId || trimTargetId === trimBoundaryId}
                    onClick={() => onTrimOrExtendSegment(trimTargetId, trimBoundaryId, 'extend')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] disabled:opacity-45 border border-[var(--tz-outline)] font-medium"
                  >
                    <span>Дотянуть (Extend)</span>
                  </button>
                </div>
              </div>

              {/* P77: ГОСТ Mirror / Support Comb Hatching */}
              <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P77 · Гребёнка штриховки опоры, зеркала и заделки ГОСТ
                  </h3>
                  <p className="text-[11px] text-[var(--tz-muted)]">
                    Генерирует серию косых штрихов вдоль любого наклонного или вертикального отрезка
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <label className="col-span-2 flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Отрезок опоры / зеркала</span>
                    <select
                      aria-label="Отрезок для гребёнки ГОСТ"
                      value={combSegId}
                      onChange={(e) => setCombSegId(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    >
                      {segmentPrimitives.length === 0 && <option value={0}>Нет отрезков</option>}
                      {segmentPrimitives.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.id} · {p.tool} (стр.{p.lineNumber})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Шаг (см)</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.12"
                      aria-label="Шаг штрихов гребёнки в см"
                      value={combStepCm}
                      onChange={(e) => setCombStepCm(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--tz-muted)]">Угол (°)</span>
                    <select
                      aria-label="Угол наклона штрихов гребёнки"
                      value={combAngleDeg}
                      onChange={(e) => setCombAngleDeg(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    >
                      <option value={45}>45°</option>
                      <option value={60}>60°</option>
                      <option value={135}>135°</option>
                    </select>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={combFlip}
                      onChange={(e) => setCombFlip(e.target.checked)}
                    />
                    <span>По другую сторону поверхности</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <span className="text-[var(--tz-muted)]">Длина зубца:</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      aria-label="Длина штриха гребёнки"
                      value={combToothCm}
                      onChange={(e) => setCombToothCm(Number(e.target.value))}
                      className="w-16 px-1.5 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  data-testid="modal-build-gost-comb-btn"
                  disabled={!combSegId}
                  onClick={() =>
                    onInsertGostSupportComb(combSegId, {
                      stepCm: combStepCm,
                      toothLenCm: combToothCm,
                      angleDeg: combAngleDeg,
                      flipSide: combFlip,
                    })
                  }
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] disabled:opacity-45 border border-[var(--tz-outline)] font-medium"
                >
                  <span>Нанести гребёнку зеркала / заделки ГОСТ</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'svg-booktabs-bundle' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
              {/* P78: External SVG Importer */}
              <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P78 · Импорт векторного SVG в примитивы n1
                  </h3>
                  <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] cursor-pointer text-[11px] shrink-0">
                    <Upload className="w-3 h-3" />
                    <span>.svg файл</span>
                    <input
                      type="file"
                      accept=".svg,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') setSvgMarkup(reader.result);
                        };
                        reader.readAsText(f);
                      }}
                    />
                  </label>
                </div>

                <p className="text-[11px] text-[var(--tz-muted)]">
                  Конвертирует &lt;line&gt;, &lt;rect&gt;, &lt;circle&gt;, &lt;polygon&gt;, &lt;polyline&gt; и &lt;path&gt; с инверсией оси Y в сантиметры TikZ (также перетаскиванием .svg в окно).
                </p>

                <label className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[var(--tz-muted)]">Ширина в TikZ (см):</span>
                  <select
                    aria-label="Целевая ширина импорта SVG"
                    value={svgWidthCm}
                    onChange={(e) => setSvgWidthCm(Number(e.target.value))}
                    className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono tabular-nums"
                  >
                    <option value={6.0}>6.0 см (компактная)</option>
                    <option value={8.8}>8.8 см (1 колонка IEEE)</option>
                    <option value={12.0}>12.0 см (широкая ГОСТ)</option>
                  </select>
                </label>

                <textarea
                  aria-label="Исходная разметка SVG для импорта"
                  rows={6}
                  value={svgMarkup}
                  onChange={(e) => setSvgMarkup(e.target.value)}
                  className="w-full p-2 rounded bg-[var(--tz-inset)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono text-[11px] resize-y"
                />

                <button
                  type="button"
                  data-testid="modal-import-svg-btn"
                  onClick={() => onImportSvgMarkup(svgMarkup, svgWidthCm)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium"
                >
                  <span>Импортировать SVG на холст n1</span>
                </button>
              </div>

              {/* P79: Academic booktabs + siunitx Table Builder */}
              <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5">
                  <Table2 className="w-3.5 h-3.5 text-[var(--tz-link)] shrink-0" />
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    P79 · Конструктор таблиц booktabs + siunitx
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    aria-label="Подпись таблицы caption"
                    value={tableCaptionRu}
                    onChange={(e) => setTableCaptionRu(e.target.value)}
                    placeholder="Подпись таблицы"
                    className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] text-[11px]"
                  />
                  <input
                    type="text"
                    aria-label="Метка таблицы label"
                    value={tableLabel}
                    onChange={(e) => setTableLabel(e.target.value)}
                    placeholder="tab:data"
                    className="px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono text-[11px]"
                  />
                </div>

                <textarea
                  aria-label="CSV или TSV данные для таблицы booktabs"
                  rows={4}
                  value={csvTableInput}
                  onChange={(e) => setCsvTableInput(e.target.value)}
                  className="w-full p-2 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono text-[11px]"
                />

                <label className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tableUseSiunitx}
                    onChange={(e) => setTableUseSiunitx(e.target.checked)}
                  />
                  <span>Выравнивание чисел по точке (колонки S пакета siunitx)</span>
                </label>

                <pre className="p-2 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[10.5px] max-h-28 overflow-auto">
                  {booktabsPreview.latexBlock}
                </pre>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    data-testid="modal-insert-booktabs-btn"
                    onClick={() =>
                      onInsertBooktabsTable(booktabsPreview.latexBlock, tableUseSiunitx)
                    }
                    className="px-2.5 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium"
                  >
                    Вставить в .tex
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void copyTextWithFeedback(
                        'booktabs',
                        booktabsPreview.latexBlock,
                        'Таблица booktabs скопирована в буфер обмена.'
                      )
                    }
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)]"
                  >
                    {copiedKey === 'booktabs' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Копировать</span>
                  </button>
                </div>
              </div>

              {/* Self-Contained Single-File Archive Builder */}
              <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <h3 className="font-semibold text-[var(--tz-text)]">
                    Автономный однофайловый архив статьи
                  </h3>
                </div>

                <p className="text-[11px] text-[var(--tz-muted)]">
                  Упаковывает внешние таблицы CSV в \begin&#123;filecontents*&#125;, форматирует код и очищает служебные хвосты для отправки соавторам или в редакцию.
                </p>

                <div className="flex flex-col gap-1.5 text-[11px]">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bundleEmbedData}
                      onChange={(e) => setBundleEmbedData(e.target.checked)}
                    />
                    <span>Встроить зависимости CSV в \begin&#123;filecontents*&#125;</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bundleFormat}
                      onChange={(e) => setBundleFormat(e.target.checked)}
                    />
                    <span>Применить автоформатирование кода ({indentSpaces} пробела)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bundleStripN1}
                      onChange={(e) => setBundleStripN1(e.target.checked)}
                    />
                    <span>Срезать служебные метаданные (чистый LaTeX)</span>
                  </label>
                </div>

                <div className="p-2 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono tabular-nums text-[10.5px] text-[var(--tz-muted)]">
                  Встроено таблиц: {bundlePreview.embeddedCount} · Очищено маркеров: {bundlePreview.strippedOwnedCount} · Строк: {bundlePreview.bundledSource.split(/\r?\n/).length}
                </div>

                <pre className="p-2 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[10.5px] max-h-28 overflow-auto">
                  {bundlePreview.bundledSource.slice(0, 640)}
                </pre>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    data-testid="modal-download-bundle-btn"
                    onClick={handleDownloadBundle}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-[var(--tz-accent)] text-white font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать .tex</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void copyTextWithFeedback(
                        'bundle',
                        bundlePreview.bundledSource,
                        'Автономный однофайловый архив скопирован в буфер обмена.'
                      )
                    }
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)]"
                  >
                    {copiedKey === 'bundle' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>В буфер</span>
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
