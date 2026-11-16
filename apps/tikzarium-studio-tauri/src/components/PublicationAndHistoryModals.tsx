import React, { useMemo, useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  History,
  FileCode2,
  Image as ImageIcon,
  BookmarkPlus,
  Trash2,
  FileSpreadsheet,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import {
  computeStructuredLineDiff,
  stripAllOwnershipMetadata,
  extractTikzpictureBlock,
  BUILTIN_AUTHOR_SNIPPETS,
} from '../domain/ergonomicsBundle';
import type { UserSnippetItem } from '../domain/ergonomicsBundle';
import type { OwnedPrimitive } from '../domain/tikzEngine';
import { parseDimensionToCm, parsePolyPointsList } from '../domain/tikzEngine';
import {
  buildManuscriptFigureWrapper,
  buildSvgDecorationPath,
} from '../domain/advancedCadBundle';
import type { FigureWrapperFormatId } from '../domain/advancedCadBundle';

// ============================================================================
// 1. P13 + P18: Revision Timeline & Structured Diff Modal
// ============================================================================

export interface RevisionEntryInfo {
  source: string;
  revision: number;
  labelRu: string;
}

interface RevisionHistoryDiffModalProps {
  open: boolean;
  onClose: () => void;
  history: RevisionEntryInfo[];
  historyIndex: number;
  onRestoreIndex: (idx: number) => void;
  externalDiskChange: {
    filename: string;
    diskSource: string;
    updatedAt: string;
    externalEditor: string;
  } | null;
  onAcceptExternalDiskChange: () => void;
}

export const RevisionHistoryDiffModal: React.FC<RevisionHistoryDiffModalProps> = ({
  open,
  onClose,
  history,
  historyIndex,
  onRestoreIndex,
  externalDiskChange,
  onAcceptExternalDiskChange,
}) => {
  const [compareMode, setCompareMode] = useState<'prev' | 'initial' | 'disk'>('prev');

  const currentEntry = history[historyIndex] ?? history[0];
  const baselineSource = useMemo(() => {
    if (compareMode === 'disk' && externalDiskChange) {
      return currentEntry.source;
    }
    if (compareMode === 'initial') {
      return history[0]?.source ?? currentEntry.source;
    }
    const prevIdx = Math.max(0, historyIndex - 1);
    return history[prevIdx]?.source ?? currentEntry.source;
  }, [compareMode, currentEntry.source, externalDiskChange, history, historyIndex]);

  const targetSource =
    compareMode === 'disk' && externalDiskChange ? externalDiskChange.diskSource : currentEntry.source;

  const diff = useMemo(
    () => computeStructuredLineDiff(baselineSource, targetSource),
    [baselineSource, targetSource]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="История ревизий и построчный Diff"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-5xl max-h-[86vh] flex flex-col rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-text)] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)]">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--tz-link)]" />
              <span>История ревизий и предпросмотр изменений (Diff · P13 / P18)</span>
            </h2>
            <p className="text-xs text-[var(--tz-muted)]">
              Текущая ревизия #{currentEntry.revision} · +{diff.addedCount} / −{diff.removedCount} строк
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно истории и Diff"
            className="p-1 rounded hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Timeline */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[var(--tz-outline)] bg-[var(--tz-panel)] p-3 overflow-y-auto flex flex-col gap-2">
            <div className="text-xs font-semibold text-[var(--tz-text)]">
              Точки возврата буфера ({history.length})
            </div>
            <div className="flex flex-col gap-1">
              {history.map((item, idx) => {
                const isActive = idx === historyIndex;
                return (
                  <div
                    key={`${item.revision}-${idx}`}
                    className={`p-2 rounded border text-xs flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-[var(--tz-active)] border-[var(--tz-accent)] text-[var(--tz-text)]'
                        : 'bg-[var(--tz-window)] border-[var(--tz-outline)] text-[var(--tz-muted)]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-mono tabular-nums font-medium text-[var(--tz-text)] truncate">
                        Ревизия #{item.revision} {isActive ? '· активна' : ''}
                      </div>
                      <div className="text-[11px] truncate">{item.labelRu}</div>
                    </div>
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => onRestoreIndex(idx)}
                        className="px-2 py-0.5 text-[11px] font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap shrink-0"
                      >
                        Перейти
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Line-by-Line Diff */}
          <div className="lg:col-span-8 flex flex-col min-h-0 overflow-hidden bg-[var(--tz-inset)]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[var(--tz-outline)] bg-[var(--tz-window)] text-xs">
              <div className="inline-flex items-center p-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]">
                <button
                  type="button"
                  onClick={() => setCompareMode('prev')}
                  className={`px-2.5 py-1 rounded-sm whitespace-nowrap ${
                    compareMode === 'prev'
                      ? 'bg-[var(--tz-active)] text-[var(--tz-text)] font-medium'
                      : 'text-[var(--tz-muted)]'
                  }`}
                >
                  К предыдущему шагу
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('initial')}
                  className={`px-2.5 py-1 rounded-sm whitespace-nowrap ${
                    compareMode === 'initial'
                      ? 'bg-[var(--tz-active)] text-[var(--tz-text)] font-medium'
                      : 'text-[var(--tz-muted)]'
                  }`}
                >
                  К исходному открытию (#1)
                </button>
                {externalDiskChange && (
                  <button
                    type="button"
                    onClick={() => setCompareMode('disk')}
                    className={`px-2.5 py-1 rounded-sm whitespace-nowrap ${
                      compareMode === 'disk'
                        ? 'bg-[var(--tz-active)] text-amber-400 font-medium'
                        : 'text-amber-400'
                    }`}
                  >
                    Буфер ↔ Внешний диск (notify)
                  </button>
                )}
              </div>

              {externalDiskChange && compareMode === 'disk' && (
                <button
                  type="button"
                  onClick={() => {
                    onAcceptExternalDiskChange();
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded bg-[var(--tz-accent)] text-white font-medium whitespace-nowrap"
                >
                  Принять версию с диска
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-auto p-3 font-mono text-xs">
              {diff.addedCount === 0 && diff.removedCount === 0 ? (
                <p className="text-[var(--tz-muted)] py-6 text-center font-sans">
                  Различий между выбранными ревизиями нет (побайтное совпадение).
                </p>
              ) : (
                <div className="flex flex-col">
                  {diff.rows.map((row, idx) => {
                    const rowCls =
                      row.kind === 'added'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : row.kind === 'removed'
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'text-[var(--tz-muted)]';
                    const prefix = row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : ' ';
                    return (
                      <div key={idx} className={`flex items-baseline gap-2 px-2 py-0.5 whitespace-pre ${rowCls}`}>
                        <span className="w-8 shrink-0 text-right tabular-nums opacity-65">
                          {row.oldLineNum ?? ''}
                        </span>
                        <span className="w-8 shrink-0 text-right tabular-nums opacity-65">
                          {row.newLineNum ?? ''}
                        </span>
                        <span className="w-3 shrink-0 font-bold">{prefix}</span>
                        <span className="truncate max-w-[680px]">{row.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. P16: Publication Export Master Modal (Clean .tex / Overleaf / SVG / PNG DPI)
// ============================================================================

interface PublicationExportModalProps {
  open: boolean;
  onClose: () => void;
  filename: string;
  source: string;
  ownedPrimitives: OwnedPrimitive[];
  pdfStatus: 'absent' | 'current' | 'stale';
  onNotify: (msg: string) => void;
}

export function buildStandaloneVectorSvgMarkup(primitives: OwnedPrimitive[]): string {
  const w = 620;
  const h = 380;
  const cmX = (cm: number) => +(cm * 100).toFixed(1);
  const cmY = (cm: number) => +((3.8 - cm) * 100).toFixed(1);

  const elements = primitives.map((p) => {
    const v = p.values;
    const stroke =
      v.stroke_color === 'blue!75!black'
        ? '#1d4ed8'
        : v.stroke_color === 'red!75!black'
          ? '#b91c1c'
          : v.stroke_color === 'teal!80!black'
            ? '#0f766e'
            : v.stroke_color === 'orange!85!black'
              ? '#c2410c'
              : v.stroke_color === 'violet!80!black'
                ? '#6d28d9'
                : v.stroke_color === 'oiBlue'
                  ? '#0072B2'
                  : v.stroke_color === 'oiVermilion'
                    ? '#D55E00'
                    : v.stroke_color === 'oiBluishGreen'
                      ? '#009E73'
                      : v.stroke_color === 'oiOrange'
                        ? '#E69F00'
                        : v.stroke_color === 'oiPurple'
                          ? '#CC79A7'
                          : v.stroke_color === 'oiSkyBlue'
                            ? '#56B4E9'
                            : '#0f172a';
    const sw =
      v.stroke_width === 'thin'
        ? 1.2
        : v.stroke_width === 'semithick'
          ? 1.9
          : v.stroke_width === 'thick'
            ? 2.7
            : v.stroke_width === 'very thick'
              ? 3.8
              : 1.9;
    const dash =
      v.line_style === 'dashed'
        ? ' stroke-dasharray="7 4"'
        : v.line_style === 'dotted'
          ? ' stroke-dasharray="2 3"'
          : '';
    const fill =
      v.fill_color === 'cyan!10'
        ? 'rgba(6,182,212,0.16)'
        : v.fill_color === 'blue!8' || v.fill_color === 'oiBlue!12'
          ? 'rgba(0,114,178,0.14)'
          : v.fill_color === 'emerald!10' || v.fill_color === 'oiBluishGreen!12'
            ? 'rgba(0,158,115,0.15)'
            : v.fill_color === 'amber!14' || v.fill_color === 'oiOrange!14'
              ? 'rgba(230,159,0,0.18)'
              : v.fill_color === 'rose!10' || v.fill_color === 'oiVermilion!12'
                ? 'rgba(213,94,0,0.15)'
                : 'none';

    const hatchFill =
      v.hatch_pattern === 'north east lines'
        ? 'url(#pub-hatch-ne)'
        : v.hatch_pattern === 'north west lines'
          ? 'url(#pub-hatch-nw)'
          : v.hatch_pattern === 'crosshatch'
            ? 'url(#pub-hatch-cross)'
            : v.hatch_pattern === 'dots'
              ? 'url(#pub-hatch-dots)'
              : v.hatch_pattern === 'horizontal lines'
                ? 'url(#pub-hatch-horiz)'
                : fill;

    switch (p.tool) {
      case 'line':
      case 'arrow': {
        if (v.poly_points) {
          const pts = parsePolyPointsList(v.poly_points);
          if (pts.length >= 2) {
            const polyStr = pts.map((pt) => `${cmX(pt.xCm)},${cmY(pt.yCm)}`).join(' ');
            if (v.poly_closed === 'cycle') {
              return `  <polygon points="${polyStr}" fill="${hatchFill}" stroke="${stroke}" stroke-width="${sw}"${dash} />`;
            }
            return `  <polyline points="${polyStr}" fill="none" stroke="${stroke}" stroke-width="${sw}"${dash} />`;
          }
        }
        const x1 = cmX(parseDimensionToCm(v.start_x) ?? 0.5);
        const y1 = cmY(parseDimensionToCm(v.start_y) ?? 0.5);
        const x2 = cmX(parseDimensionToCm(v.end_x) ?? 2.5);
        const y2 = cmY(parseDimensionToCm(v.end_y) ?? 1.5);
        if (v.decoration_kind) {
          const d = buildSvgDecorationPath(x1, y1, x2, y2, v.decoration_kind);
          return `  <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" />`;
        }
        const marker = p.tool === 'arrow' ? ' marker-end="url(#pub-arrow)"' : '';
        if (v.routing === '|-') {
          return `  <polyline points="${x1},${y1} ${x1},${y2} ${x2},${y2}" fill="none" stroke="${stroke}" stroke-width="${sw}"${dash}${marker} />`;
        }
        if (v.routing === '-|') {
          return `  <polyline points="${x1},${y1} ${x2},${y1} ${x2},${y2}" fill="none" stroke="${stroke}" stroke-width="${sw}"${dash}${marker} />`;
        }
        return `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${dash}${marker} />`;
      }
      case 'rectangle': {
        const ax = cmX(parseDimensionToCm(v.start_x) ?? 0.8);
        const ay = cmY(parseDimensionToCm(v.start_y) ?? 0.6);
        const bx = cmX(parseDimensionToCm(v.end_x) ?? 3.0);
        const by = cmY(parseDimensionToCm(v.end_y) ?? 2.0);
        return `  <rect x="${Math.min(ax, bx)}" y="${Math.min(ay, by)}" width="${Math.abs(bx - ax)}" height="${Math.abs(by - ay)}" fill="${hatchFill}" stroke="${stroke}" stroke-width="${sw}"${dash} />`;
      }
      case 'circle': {
        const cx = cmX(parseDimensionToCm(v.center_x) ?? 2.0);
        const cy = cmY(parseDimensionToCm(v.center_y) ?? 1.5);
        const r = +((parseDimensionToCm(v.radius) ?? 0.6) * 100).toFixed(1);
        return `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${hatchFill}" stroke="${stroke}" stroke-width="${sw}"${dash} />`;
      }
      case 'cubic': {
        const sx = cmX(parseDimensionToCm(v.start_x) ?? 0.6);
        const sy = cmY(parseDimensionToCm(v.start_y) ?? 0.8);
        const c1x = cmX(parseDimensionToCm(v.control1_x) ?? 1.6);
        const c1y = cmY(parseDimensionToCm(v.control1_y) ?? 2.4);
        const c2x = cmX(parseDimensionToCm(v.control2_x) ?? 3.2);
        const c2y = cmY(parseDimensionToCm(v.control2_y) ?? 2.4);
        const ex = cmX(parseDimensionToCm(v.end_x) ?? 4.4);
        const ey = cmY(parseDimensionToCm(v.end_y) ?? 1.1);
        return `  <path d="M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}" fill="none" stroke="${stroke}" stroke-width="${sw}"${dash} />`;
      }
      case 'node': {
        const nx = cmX(parseDimensionToCm(v.x) ?? 2.4);
        const ny = cmY(parseDimensionToCm(v.y) ?? 2.0);
        const txt = (v.content ?? 'A')
          .replace(/\\text\{([^}]*)\}/g, '$1')
          .replace(/\\mathrm\{([^}]*)\}/g, '$1')
          .replace(/\\,/g, ' ')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;');
        return `  <text x="${nx}" y="${ny + 4}" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="${stroke}">${txt}</text>`;
      }
    }
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
    '  <defs>',
    '    <marker id="pub-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">',
    '      <path d="M 0 1.5 L 10 5 L 0 8.5 L 2.2 5 z" fill="#0f172a" />',
    '    </marker>',
    '    <pattern id="pub-hatch-ne" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#475569" stroke-width="1"/></pattern>',
    '    <pattern id="pub-hatch-nw" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2,6 l4,4 M0,0 l8,8 M6,-2 l4,4" stroke="#475569" stroke-width="1"/></pattern>',
    '    <pattern id="pub-hatch-cross" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0,8 l8,-8 M0,0 l8,8" stroke="#64748b" stroke-width="0.9"/></pattern>',
    '    <pattern id="pub-hatch-dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1" fill="#475569"/></pattern>',
    '    <pattern id="pub-hatch-horiz" width="8" height="6" patternUnits="userSpaceOnUse"><line x1="0" y1="3" x2="8" y2="3" stroke="#475569" stroke-width="1"/></pattern>',
    '  </defs>',
    `  <rect width="${w}" height="${h}" fill="#ffffff" />`,
    ...elements,
    '</svg>',
  ].join('\n');
}

export const PublicationExportModal: React.FC<PublicationExportModalProps> = ({
  open,
  onClose,
  filename,
  source,
  ownedPrimitives,
  pdfStatus,
  onNotify,
}) => {
  const [copiedMode, setCopiedMode] = useState<string | null>(null);
  const [pngDpi, setPngDpi] = useState<300 | 600>(300);
  const [figFormatId, setFigFormatId] = useState<FigureWrapperFormatId>('gost-vak');
  const [figCaption, setFigCaption] = useState<string>(
    'Оптическая схема фокусировки пучка и обозначение основных узлов.'
  );
  const [figLabel, setFigLabel] = useState<string>(
    `fig:${filename.replace(/\.tex$/i, '').replace(/[^A-Za-z0-9_]/g, '_')}`
  );
  const [figResizebox, setFigResizebox] = useState<boolean>(true);

  const cleanTex = useMemo(() => stripAllOwnershipMetadata(source), [source]);
  const tikzBlockOnly = useMemo(() => extractTikzpictureBlock(source, true), [source]);
  const svgString = useMemo(() => buildStandaloneVectorSvgMarkup(ownedPrimitives), [ownedPrimitives]);
  const manuscriptWrapper = useMemo(
    () =>
      buildManuscriptFigureWrapper(source, {
        formatId: figFormatId,
        captionRu: figCaption,
        labelKey: figLabel,
        useResizebox: figResizebox,
      }),
    [figCaption, figFormatId, figLabel, figResizebox, source]
  );

  if (!open) return null;

  const baseName = filename.replace(/\.tex$/i, '');

  const triggerBlobDownload = (content: BlobPart, mime: string, targetName: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = targetName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (id: string, text: string, labelRu: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard fallback ignored in headless environment
    }
    setCopiedMode(id);
    onNotify(`Скопировано в буфер обмена: ${labelRu}`);
    window.setTimeout(() => setCopiedMode((prev) => (prev === id ? null : prev)), 2000);
  };

  const handleDownloadPngDpi = () => {
    const scale = pngDpi === 600 ? 4 : 2;
    const canvas = document.createElement('canvas');
    canvas.width = 620 * scale;
    canvas.height = 380 * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          triggerBlobDownload(pngBlob, 'image/png', `${baseName}_${pngDpi}dpi.png`);
          onNotify(`Растровый снимок ${baseName}_${pngDpi}dpi.png (${pngDpi} DPI) выгружен.`);
        }
      }, 'image/png');
    };
    img.src = url;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Мастер экспорта для научных статей и презентаций"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-3xl max-h-[86vh] flex flex-col rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-text)] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)]">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Download className="w-4 h-4 text-[var(--tz-link)]" />
              <span>Мастер экспорта для публикаций и Overleaf</span>
            </h2>
            <p className="text-xs text-[var(--tz-muted)]">
              Рабочий буфер сохраняет интерактивные маркеры, а экспорт формирует чистый публикационный код без служебных комментариев.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть мастер экспорта"
            className="p-1 rounded hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex flex-col gap-4">
          {/* Export Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--tz-text)] flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-[var(--tz-link)]" />
                  <span>1. Чистый .tex для статьи / Overleaf</span>
                </div>
                <p className="text-[11.5px] text-[var(--tz-muted)] mt-1">
                  Полный файл XeLaTeX со всеми вашими макросами, но без комментариев <code className="font-mono">% tikzarium:n1:…</code>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerBlobDownload(cleanTex, 'text/plain;charset=utf-8', `${baseName}_clean.tex`);
                    onNotify(`Чистый исходник ${baseName}_clean.tex сохранён без служебных метаданных.`);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-accent)] text-white hover:opacity-95 whitespace-nowrap"
                >
                  Скачать {baseName}_clean.tex
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('clean-tex', cleanTex, 'чистый .tex без метаданных')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                >
                  {copiedMode === 'clean-tex' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Копировать</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--tz-text)] flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5 text-[var(--tz-link)]" />
                  <span>2. Только окружение tikzpicture для \input</span>
                </div>
                <p className="text-[11.5px] text-[var(--tz-muted)] mt-1">
                  Готовый фрагмент <code className="font-mono">\begin&#123;tikzpicture&#125;…\end&#123;tikzpicture&#125;</code> для вставки внутрь <code className="font-mono">figure</code>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('tikz-only', tikzBlockOnly, 'блок tikzpicture')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                >
                  {copiedMode === 'tikz-only' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Скопировать tikzpicture</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--tz-text)] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[var(--tz-link)]" />
                  <span>3. Векторный SVG + Растровый PNG (300 / 600 DPI)</span>
                </div>
                <p className="text-[11.5px] text-[var(--tz-muted)] mt-1">
                  Для слайдов презентаций, препринтов и быстрой вставки в Word / LibreOffice.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerBlobDownload(svgString, 'image/svg+xml;charset=utf-8', `${baseName}.svg`);
                    onNotify(`Векторный файл ${baseName}.svg выгружен.`);
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                >
                  Скачать SVG
                </button>
                <select
                  aria-label="Разрешение растрового экспорта PNG"
                  value={pngDpi}
                  onChange={(e) => setPngDpi(Number(e.target.value) as 300 | 600)}
                  className="px-2 py-1.5 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                >
                  <option value={300}>300 DPI</option>
                  <option value={600}>600 DPI</option>
                </select>
                <button
                  type="button"
                  onClick={handleDownloadPngDpi}
                  className="px-2.5 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                >
                  Скачать PNG
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--tz-text)]">
                  4. Рабочий исходник с маркерами TikZarium (.tex)
                </div>
                <p className="text-[11.5px] text-[var(--tz-muted)] mt-1">
                  Сохраняет комментарии владения <code className="font-mono">% tikzarium:n1:</code> для повторного открытия и перетаскивания фигур мышью.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pdfStatus !== 'current'}
                  onClick={() => {
                    triggerBlobDownload(source, 'text/plain;charset=utf-8', filename);
                    onNotify(`Проверенный рабочий файл ${filename} выгружен.`);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] disabled:opacity-45 disabled:cursor-not-allowed border border-[var(--tz-outline)] whitespace-nowrap"
                >
                  {pdfStatus === 'current' ? `Скачать рабочий ${filename}` : 'Сначала соберите актуальный PDF'}
                </button>
              </div>
            </div>
          </div>

          {/* P48: Manuscript Figure Environment Wrapper Generator */}
          <div
            data-testid="manuscript-figure-wrapper-card"
            className="p-3.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-[var(--tz-text)]">
                  5. Обёртка \begin&#123;figure&#125; для статьи / диссертации (ГОСТ / IEEE / REVTeX)
                </div>
                <p className="text-[11px] text-[var(--tz-muted)]">
                  Генерирует готовый блок <code className="font-mono">figure</code> с <code className="font-mono">\caption</code>, <code className="font-mono">\label</code> и калибровкой ширины колонки.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy('fig-wrapper', manuscriptWrapper.figureCode, 'обёртка \\begin{figure}')
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-[var(--tz-accent)] text-white whitespace-nowrap"
                >
                  {copiedMode === 'fig-wrapper' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Копировать figure</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy('fig-ref', manuscriptWrapper.refSnippet, `ссылка ${manuscriptWrapper.refSnippet}`)
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] font-mono whitespace-nowrap"
                >
                  {copiedMode === 'fig-ref' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{manuscriptWrapper.refSnippet}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
              <select
                aria-label="Журнальный формат обёртки figure"
                value={figFormatId}
                onChange={(e) => setFigFormatId(e.target.value as FigureWrapperFormatId)}
                className="md:col-span-4 px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
              >
                <option value="gost-vak">ГОСТ Р 7.0.11 / Диссертация ВАК</option>
                <option value="ieee-1col">IEEEtran · 1 колонка (\columnwidth)</option>
                <option value="ieee-2col">IEEEtran · 2 колонки (figure*)</option>
                <option value="revtex">APS Physical Review (REVTeX 4-2)</option>
              </select>
              <input
                type="text"
                value={figLabel}
                onChange={(e) => setFigLabel(e.target.value)}
                aria-label="Ключ метки \label"
                className="md:col-span-3 px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
              />
              <input
                type="text"
                value={figCaption}
                onChange={(e) => setFigCaption(e.target.value)}
                aria-label="Подрисуночная подпись \caption"
                className="md:col-span-5 px-2 py-1 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-[11px] text-[var(--tz-muted)]">
              <input
                type="checkbox"
                checked={figResizebox}
                onChange={(e) => setFigResizebox(e.target.checked)}
              />
              <span>Автоматически вписывать ширину через \resizebox&#123;...&#125;&#123;!&#125;</span>
            </label>

            <pre className="p-2.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[11px] text-[var(--tz-text)] max-h-36 overflow-auto whitespace-pre">
              {manuscriptWrapper.figureCode}
            </pre>
          </div>

          {/* Live Preview of Clean Overleaf Code */}
          <div>
            <div className="text-xs font-medium text-[var(--tz-muted)] mb-1.5">
              Предпросмотр чистого публикационного кода (без служебных hex-хвостов):
            </div>
            <pre
              data-testid="clean-tex-export-preview"
              className="p-3 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs text-[var(--tz-text)] max-h-48 overflow-auto whitespace-pre"
            >
              {cleanTex}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. P18 + P19 + P20: Author Snippets Shelf, CSV->PGFPlots & OS Storage Modal
// ============================================================================

interface WorkspaceSnippetsAndOsModalProps {
  open: boolean;
  onClose: () => void;
  selectedPrimitives: OwnedPrimitive[];
  customSnippets: UserSnippetItem[];
  onSaveSelectionAsSnippet: (titleRu: string) => void;
  onDeleteCustomSnippet: (id: string) => void;
  onInsertSnippet: (snippet: UserSnippetItem) => void;
  recentFiles: { filename: string; titleRu: string; openedAt: string }[];
  onImportCsvText: (filename: string, csvText: string) => void;
  onSimulateExternalDiskWrite: () => void;
}

const SAMPLE_CSV_SPECTRUM = `# Экспериментальный профиль пропускания фильтра
wavelength_nm,transmittance
420,0.12
460,0.38
500,0.79
532,0.96
570,0.71
610,0.29
650,0.08`;

export const WorkspaceSnippetsAndOsModal: React.FC<WorkspaceSnippetsAndOsModalProps> = ({
  open,
  onClose,
  selectedPrimitives,
  customSnippets,
  onSaveSelectionAsSnippet,
  onDeleteCustomSnippet,
  onInsertSnippet,
  recentFiles,
  onImportCsvText,
  onSimulateExternalDiskWrite,
}) => {
  const [newSnippetTitle, setNewSnippetTitle] = useState('');
  const [csvName, setCsvName] = useState('filter_spectrum.csv');
  const [csvBody, setCsvBody] = useState(SAMPLE_CSV_SPECTRUM);

  if (!open) return null;

  const allSnippets = [...customSnippets, ...BUILTIN_AUTHOR_SNIPPETS];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Полка сниппетов автора, импорт данных CSV и интеграция ОС"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-4xl max-h-[86vh] flex flex-col rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-text)] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)]">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[var(--tz-link)]" />
              <span>Полка заготовок автора, импорт CSV и локальное хранилище</span>
            </h2>
            <p className="text-xs text-[var(--tz-muted)]">
              Сохранение личных групп примитивов между сеансами, генерация графиков из таблиц .csv и контроль внешних изменений файла.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно сниппетов и ОС"
            className="p-1 rounded hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: P20 Snippet Shelf & Recent Files */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2">
              <div className="text-xs font-semibold">
                Сохранить выделенные объекты в личную полку ({selectedPrimitives.length} выбр.)
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newSnippetTitle.trim() || selectedPrimitives.length === 0) return;
                  onSaveSelectionAsSnippet(newSnippetTitle);
                  setNewSnippetTitle('');
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={newSnippetTitle}
                  onChange={(e) => setNewSnippetTitle(e.target.value)}
                  placeholder="Напр.: Двойная линза / Каскад RC…"
                  aria-label="Название нового пользовательского сниппета"
                  className="flex-1 min-w-0 px-2.5 py-1 text-xs rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
                />
                <button
                  type="submit"
                  disabled={!newSnippetTitle.trim() || selectedPrimitives.length === 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-[var(--tz-accent)] text-white disabled:opacity-45 whitespace-nowrap shrink-0"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Сохранить</span>
                </button>
              </form>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold">Готовые и сохранённые заготовки ({allSnippets.length})</div>
              {allSnippets.map((snip) => {
                const isCustom = snip.id.startsWith('user-snip-');
                return (
                  <div
                    key={snip.id}
                    className="p-2.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{snip.titleRu}</div>
                      <div className="text-[11px] text-[var(--tz-muted)]">
                        {snip.categoryRu} · {snip.primitives.length} объектов
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onInsertSnippet(snip);
                          onClose();
                        }}
                        className="px-2.5 py-1 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
                      >
                        Вставить в .tex
                      </button>
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => onDeleteCustomSnippet(snip.id)}
                          aria-label={`Удалить заготовку ${snip.titleRu}`}
                          className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {recentFiles.length > 0 && (
              <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-1.5">
                <div className="text-xs font-semibold">Недавние файлы сеанса</div>
                <div className="flex flex-col gap-1 text-[11px] font-mono text-[var(--tz-muted)]">
                  {recentFiles.slice(0, 5).map((rf, i) => (
                    <div key={`${rf.filename}-${i}`} className="flex items-center justify-between gap-2">
                      <span className="text-[var(--tz-text)] truncate">{rf.filename}</span>
                      <span className="tabular-nums shrink-0">{rf.openedAt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: P19 CSV/Drag-Drop Importer + P18 OS File Watcher Trigger */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2">
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--tz-link)]" />
                <span>Импорт табличных данных .csv / .dat → график PGFPlots</span>
              </div>
              <p className="text-[11px] text-[var(--tz-muted)]">
                Вы также можете перетащить любой файл <code className="font-mono">.tex</code>, <code className="font-mono">.csv</code> или референс <code className="font-mono">.png</code> из проводника ОС прямо на окно студии.
              </p>
              <input
                type="text"
                value={csvName}
                onChange={(e) => setCsvName(e.target.value)}
                aria-label="Имя файла данных CSV"
                className="px-2.5 py-1 text-xs font-mono rounded bg-[var(--tz-window)] border border-[var(--tz-outline)]"
              />
              <textarea
                rows={5}
                value={csvBody}
                onChange={(e) => setCsvBody(e.target.value)}
                aria-label="Содержимое таблицы CSV для построения графика"
                className="p-2 text-xs font-mono rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] resize-none"
              />
              <button
                type="button"
                onClick={() => {
                  onImportCsvText(csvName, csvBody);
                  onClose();
                }}
                className="self-start px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-accent)] text-white hover:opacity-95 whitespace-nowrap"
              >
                Построить документ PGFPlots из CSV
              </button>
            </div>

            <div className="p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] flex flex-col gap-2">
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-[var(--tz-link)]" />
                <span>Мониторинг внешних правок на диске</span>
              </div>
              <p className="text-[11px] text-[var(--tz-muted)]">
                Проверьте, как студия реагирует, когда открытый файл параллельно сохранили во внешнем редакторе (VS Code / Neovim / TeXstudio).
              </p>
              <button
                type="button"
                onClick={() => {
                  onSimulateExternalDiskWrite();
                  onClose();
                }}
                className="self-start px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] whitespace-nowrap"
              >
                Смоделировать внешнюю запись файла на диск
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
