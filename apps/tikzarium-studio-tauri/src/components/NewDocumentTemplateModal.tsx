import React, { useEffect, useMemo, useState } from 'react';
import {
  FilePlus2,
  X,
  AlertTriangle,
  GitBranch,
  LineChart,
  Aperture,
  Compass,
  FileCode2,
  Check,
} from 'lucide-react';
import {
  DOCUMENT_TEMPLATES,
  buildDocumentFromTemplate,
  validateTemplateFilename,
} from '../domain/documentTemplates';
import type { DocumentTemplateId, TemplateCreationOptions } from '../domain/documentTemplates';
import {
  OWNERSHIP_MARKER,
  parseDimensionToCm,
  parseOwnedPrimitives,
  utf8ByteLength,
} from '../domain/tikzEngine';

interface NewDocumentTemplateModalProps {
  open: boolean;
  initialTemplateId?: DocumentTemplateId;
  isDirtyCurrent: boolean;
  currentFilename: string;
  onClose: () => void;
  onConfirmCreate: (
    templateId: DocumentTemplateId,
    options: TemplateCreationOptions,
    saveCurrentFirst: boolean
  ) => void;
}

const TEMPLATE_ICONS: Record<DocumentTemplateId, React.ComponentType<{ className?: string }>> = {
  diagram: GitBranch,
  plot: LineChart,
  optics: Aperture,
  geometry: Compass,
  minimal: FileCode2,
};

function cmX(val: string | undefined): number {
  const cm = parseDimensionToCm(val) ?? 0;
  return 16 + cm * 52;
}

function cmY(val: string | undefined): number {
  const cm = parseDimensionToCm(val) ?? 0;
  return 196 - cm * 48;
}

export const NewDocumentTemplateModal: React.FC<NewDocumentTemplateModalProps> = ({
  open,
  initialTemplateId = 'diagram',
  isDirtyCurrent,
  currentFilename,
  onClose,
  onConfirmCreate,
}) => {
  const [selectedId, setSelectedId] = useState<DocumentTemplateId>(initialTemplateId);
  const [filenameInput, setFilenameInput] = useState<string>('diagram_flow.tex');
  const [includeCyrillicFontspec, setIncludeCyrillicFontspec] = useState<boolean>(true);
  const [borderPt, setBorderPt] = useState<4 | 6 | 10>(6);
  const [lineEnding, setLineEnding] = useState<'LF' | 'CRLF'>('LF');

  useEffect(() => {
    if (open) {
      const target = DOCUMENT_TEMPLATES.find((t) => t.id === initialTemplateId) ?? DOCUMENT_TEMPLATES[0];
      setSelectedId(target.id);
      setFilenameInput(target.defaultFilename);
    }
  }, [open, initialTemplateId]);

  const activeSpec = useMemo(
    () => DOCUMENT_TEMPLATES.find((t) => t.id === selectedId) ?? DOCUMENT_TEMPLATES[0],
    [selectedId]
  );

  const filenameCheck = useMemo(() => validateTemplateFilename(filenameInput), [filenameInput]);

  const options: TemplateCreationOptions = useMemo(
    () => ({
      filename: filenameCheck.valid ? filenameCheck.normalized : filenameInput,
      includeCyrillicFontspec,
      borderPt,
      lineEnding,
    }),
    [borderPt, filenameCheck.normalized, filenameCheck.valid, filenameInput, includeCyrillicFontspec, lineEnding]
  );

  const previewDoc = useMemo(
    () => buildDocumentFromTemplate(selectedId, options, 1),
    [selectedId, options]
  );

  const previewPrimitives = useMemo(
    () => parseOwnedPrimitives(previewDoc.source),
    [previewDoc.source]
  );

  const compactSourcePreview = useMemo(() => {
    return previewDoc.source
      .split(/\r?\n/)
      .filter((line, idx, arr) => !(idx === arr.length - 1 && line === ''))
      .map((line) => {
        const markerIdx = line.indexOf(OWNERSHIP_MARKER);
        if (markerIdx === -1) return line;
        return `${line.slice(0, markerIdx)} % [n1]`;
      })
      .join('\n');
  }, [previewDoc.source]);

  if (!open) return null;

  const handleSelectTemplate = (id: DocumentTemplateId) => {
    const prevDefault = activeSpec.defaultFilename;
    const nextSpec = DOCUMENT_TEMPLATES.find((t) => t.id === id) ?? DOCUMENT_TEMPLATES[0];
    setSelectedId(id);
    if (!filenameInput.trim() || filenameInput === prevDefault) {
      setFilenameInput(nextSpec.defaultFilename);
    }
  };

  const triggerCreate = (saveCurrentFirst: boolean) => {
    if (!filenameCheck.valid) return;
    onConfirmCreate(
      selectedId,
      {
        ...options,
        filename: filenameCheck.normalized,
      },
      saveCurrentFirst
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-template-modal-title"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-text)] shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FilePlus2 className="w-4 h-4 text-[var(--tz-link)] shrink-0" />
            <div className="min-w-0">
              <h2 id="new-template-modal-title" className="text-sm font-semibold truncate">
                Создать новый документ по шаблону
              </h2>
              <p className="text-xs text-[var(--tz-muted)] truncate">
                Выберите готовую структуру («Диаграмма», «График», «Схема оптики»…), чтобы сразу работать с управляемыми объектами на холсте и в коде .tex
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно выбора шаблона"
            className="p-1 text-[var(--tz-muted)] hover:text-[var(--tz-text)] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main 2-Column Body */}
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Template Selector List */}
          <div
            role="listbox"
            aria-label="Шаблоны новых документов TikZ"
            className="md:col-span-5 border-b md:border-b-0 md:border-r border-[var(--tz-outline)] bg-[var(--tz-inset)] p-3 flex flex-col gap-1.5"
          >
            {DOCUMENT_TEMPLATES.map((tpl) => {
              const Icon = TEMPLATE_ICONS[tpl.id];
              const isSelected = tpl.id === selectedId;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectTemplate(tpl.id)}
                  className={`w-full text-left p-3 rounded border transition-colors flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-[var(--tz-active)] border-[var(--tz-accent)] text-[var(--tz-text)]'
                      : 'bg-[var(--tz-window)] border-[var(--tz-outline)] text-[var(--tz-text)] hover:bg-[var(--tz-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-[var(--tz-link)]' : 'text-[var(--tz-muted)]'
                        }`}
                      />
                      <span className="text-xs font-semibold truncate">{tpl.titleRu}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[var(--tz-link)] shrink-0" />}
                  </div>

                  {/* Clean Unboxed Metadata Line */}
                  <div className="text-[11px] text-[var(--tz-muted)] font-mono tabular-nums">
                    <span>{tpl.categoryRu}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{tpl.primitiveCount} прим. n1</span>
                  </div>

                  <p className="text-[11.5px] text-[var(--tz-muted)] leading-snug">{tpl.summaryRu}</p>
                </button>
              );
            })}
          </div>

          {/* Right Column: Live Schematic Preview + File & Preamble Options */}
          <div className="md:col-span-7 p-4 flex flex-col gap-3.5 bg-[var(--tz-window)]">
            {/* Live Vector Schematic Preview */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--tz-muted)] mb-1.5">
                <span className="font-medium text-[var(--tz-text)]">
                  Предпросмотр геометрии шаблона «{activeSpec.titleRu}»
                </span>
                <span className="font-mono tabular-nums">
                  Пакеты: {activeSpec.packages.join(', ')} · Библиотеки: {activeSpec.libraries.join(', ')}
                </span>
              </div>

              <div className="rounded border border-[var(--tz-outline)] bg-white p-2 flex items-center justify-center">
                <svg
                  viewBox="0 0 348 212"
                  className="w-full h-40 select-none"
                  aria-label={`Векторный предпросмотр шаблона ${activeSpec.titleRu}`}
                >
                  <defs>
                    <marker
                      id="tpl-preview-arrow"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="5.5"
                      markerHeight="5.5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0f172a" />
                    </marker>
                  </defs>

                  {/* Subtle millimeter/centimeter grid */}
                  {[1, 2, 3, 4, 5, 6].map((gx) => (
                    <line
                      key={`gx-${gx}`}
                      x1={16 + gx * 52}
                      y1={8}
                      x2={16 + gx * 52}
                      y2={200}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                  ))}
                  {[1, 2, 3].map((gy) => (
                    <line
                      key={`gy-${gy}`}
                      x1={16}
                      y1={196 - gy * 48}
                      x2={336}
                      y2={196 - gy * 48}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                  ))}

                  {previewPrimitives.map((prim) => {
                    const v = prim.values;
                    switch (prim.tool) {
                      case 'line':
                        return (
                          <line
                            key={prim.id}
                            x1={cmX(v.start_x)}
                            y1={cmY(v.start_y)}
                            x2={cmX(v.end_x)}
                            y2={cmY(v.end_y)}
                            stroke="#334155"
                            strokeWidth="1.5"
                            strokeDasharray={selectedId === 'plot' ? '4 3' : undefined}
                          />
                        );
                      case 'arrow':
                        return (
                          <line
                            key={prim.id}
                            x1={cmX(v.start_x)}
                            y1={cmY(v.start_y)}
                            x2={cmX(v.end_x)}
                            y2={cmY(v.end_y)}
                            stroke="#0f172a"
                            strokeWidth="1.6"
                            markerEnd="url(#tpl-preview-arrow)"
                          />
                        );
                      case 'rectangle': {
                        const x1 = cmX(v.start_x);
                        const y1 = cmY(v.start_y);
                        const x2 = cmX(v.end_x);
                        const y2 = cmY(v.end_y);
                        return (
                          <rect
                            key={prim.id}
                            x={Math.min(x1, x2)}
                            y={Math.min(y1, y2)}
                            width={Math.abs(x2 - x1)}
                            height={Math.abs(y2 - y1)}
                            fill="rgba(56, 189, 248, 0.10)"
                            stroke="#0284c7"
                            strokeWidth="1.5"
                            rx="2"
                          />
                        );
                      }
                      case 'circle': {
                        const rCm = parseDimensionToCm(v.radius) ?? 0.3;
                        return (
                          <circle
                            key={prim.id}
                            cx={cmX(v.center_x)}
                            cy={cmY(v.center_y)}
                            r={rCm * 50}
                            fill="rgba(14, 165, 233, 0.14)"
                            stroke="#0284c7"
                            strokeWidth="1.6"
                          />
                        );
                      }
                      case 'cubic':
                        return (
                          <path
                            key={prim.id}
                            d={`M ${cmX(v.start_x)} ${cmY(v.start_y)} C ${cmX(v.control1_x)} ${cmY(
                              v.control1_y
                            )}, ${cmX(v.control2_x)} ${cmY(v.control2_y)}, ${cmX(v.end_x)} ${cmY(
                              v.end_y
                            )}`}
                            fill="none"
                            stroke="#0369a1"
                            strokeWidth="1.8"
                          />
                        );
                      case 'node': {
                        const cleanLabel = (v.content ?? '')
                          .replace(/\\,\\text\{([^}]+)\}/g, ' $1')
                          .replace(/\\,\\mathrm\{([^}]+)\}/g, ' $1')
                          .replace(/\\/g, '');
                        return (
                          <text
                            key={prim.id}
                            x={cmX(v.x)}
                            y={cmY(v.y) + 4}
                            textAnchor="middle"
                            className="fill-slate-900 text-[11px] font-serif"
                          >
                            {cleanLabel}
                          </text>
                        );
                      }
                    }
                  })}
                </svg>
              </div>
            </div>

            {/* Filename & Preamble Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-6 flex flex-col gap-1">
                <label htmlFor="new-tpl-filename" className="text-[var(--tz-muted)] font-medium">
                  Имя нового файла .tex
                </label>
                <input
                  id="new-tpl-filename"
                  type="text"
                  value={filenameInput}
                  onChange={(e) => setFilenameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filenameCheck.valid && !isDirtyCurrent) {
                      e.preventDefault();
                      triggerCreate(false);
                    }
                  }}
                  placeholder={activeSpec.defaultFilename}
                  className="px-2.5 py-1.5 rounded bg-[var(--tz-inset)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono text-xs"
                />
                {!filenameCheck.valid && filenameCheck.reasonRu && (
                  <span className="text-[11px] text-rose-400">{filenameCheck.reasonRu}</span>
                )}
              </div>

              <div className="sm:col-span-3 flex flex-col gap-1">
                <label htmlFor="new-tpl-border" className="text-[var(--tz-muted)] font-medium">
                  Поле standalone
                </label>
                <select
                  id="new-tpl-border"
                  value={borderPt}
                  onChange={(e) => setBorderPt(Number(e.target.value) as 4 | 6 | 10)}
                  className="px-2 py-1.5 rounded bg-[var(--tz-button)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono text-xs"
                >
                  <option value={4}>border=4pt</option>
                  <option value={6}>border=6pt</option>
                  <option value={10}>border=10pt</option>
                </select>
              </div>

              <div className="sm:col-span-3 flex flex-col gap-1">
                <label htmlFor="new-tpl-eol" className="text-[var(--tz-muted)] font-medium">
                  Окончания строк
                </label>
                <select
                  id="new-tpl-eol"
                  value={lineEnding}
                  onChange={(e) => setLineEnding(e.target.value as 'LF' | 'CRLF')}
                  className="px-2 py-1.5 rounded bg-[var(--tz-button)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono text-xs"
                >
                  <option value="LF">LF (Linux / macOS)</option>
                  <option value="CRLF">CRLF (Windows 10)</option>
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-[var(--tz-text)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeCyrillicFontspec}
                onChange={(e) => setIncludeCyrillicFontspec(e.target.checked)}
                className="rounded border-[var(--tz-outline)]"
              />
              <span>
                Подключить кириллицу и Unicode-формулы (<code className="font-mono">fontspec</code> +{' '}
                <code className="font-mono">unicode-math</code> + <code className="font-mono">DejaVu Serif</code>)
              </span>
            </label>

            {/* Generated .tex Code Preview */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-[var(--tz-muted)] font-mono tabular-nums">
                <span>Генерируемый исходник ({filenameCheck.normalized || activeSpec.defaultFilename})</span>
                <span>
                  {previewDoc.source.split(/\r?\n/).length - 1} строк · {utf8ByteLength(previewDoc.source)} байт UTF-8
                </span>
              </div>
              <pre className="max-h-28 overflow-auto p-2.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[11px] text-[var(--tz-text)] leading-relaxed">
                {compactSourcePreview}
              </pre>
            </div>

            {/* Dirty Current Buffer Notice (honors dirty-open safety contract without extra popup!) */}
            {isDirtyCurrent && (
              <div className="p-2.5 rounded border border-amber-500/50 bg-amber-500/10 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[var(--tz-text)] leading-snug">
                  В текущем файле <code className="font-mono">{currentFilename}</code> есть несохранённые правки. Выберите ниже, сохранить ли их перед созданием нового документа.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3 bg-[var(--tz-panel)] border-t border-[var(--tz-outline)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-[var(--tz-muted)] font-mono">
            Горячая клавиша: Alt+N (в нативном ОС egui: Ctrl+N)
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)]"
            >
              Отмена
            </button>

            {isDirtyCurrent ? (
              <>
                <button
                  type="button"
                  disabled={!filenameCheck.valid}
                  onClick={() => triggerCreate(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-rose-500/15 text-rose-400 disabled:opacity-45 border border-[var(--tz-outline)]"
                >
                  Отбросить правки и создать
                </button>
                <button
                  type="button"
                  disabled={!filenameCheck.valid}
                  onClick={() => triggerCreate(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded bg-[var(--tz-accent)] text-white hover:opacity-95 disabled:opacity-45"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>Сохранить текущий и создать</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!filenameCheck.valid}
                onClick={() => triggerCreate(false)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded bg-[var(--tz-accent)] text-white hover:opacity-95 disabled:opacity-45"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>Создать документ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
