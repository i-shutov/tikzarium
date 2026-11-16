import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Check,
  X,
  ArrowUpRight,
  FolderOpen,
  ShieldAlert,
} from 'lucide-react';
import {
  TIKZ_LIBRARIES,
  EXTENSION_MANIFESTS,
  UX_AUDIT_FINDINGS,
} from '../domain/catalog';
import type { UxFindingItem } from '../domain/catalog';
import {
  getLibraryFiveStatuses,
  inspectPreambleConnections,
  proposeLibraryConnect,
  proposeLibraryDisconnect,
} from '../domain/tikzEngine';
import { togglePackageInPreamble } from '../domain/atomicFigureProfile';
import {
  IMPLEMENTATION_STATUS_LABELS,
  LEDGER_GROUP_LABELS,
  MODERNIZATION_TASKS_20,
  REQUIREMENTS_AND_FE_LEDGER,
  RUST_STATUS_LABELS,
  buildMarkdownLedgerDocumentRu,
  getRequirementsLedgerSummary,
} from '../domain/requirementsLedger';
import type { ImplementationStatus, LedgerGroupId } from '../domain/requirementsLedger';
import {
  ARCHITECTURAL_INSIGHTS,
  EXECUTION_WAVES,
  buildInsightsAndPlansMarkdownRu,
} from '../domain/insightsAndPlans';

interface LibrariesManagerViewProps {
  source: string;
  toolchainReady: boolean;
  onApplySourcePatch: (nextSource: string, summaryRu: string) => void;
}

export const LibrariesManagerView: React.FC<LibrariesManagerViewProps> = ({
  source,
  toolchainReady,
  onApplySourcePatch,
}) => {
  const [previewLib, setPreviewLib] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const activePreview = previewLib
    ? (() => {
        const statuses = getLibraryFiveStatuses(previewLib, source, toolchainReady);
        return statuses.projectLoaded
          ? proposeLibraryDisconnect(source, previewLib)
          : proposeLibraryConnect(source, previewLib);
      })()
    : null;

  const handleToggleLibrary = (libName: string) => {
    const statuses = getLibraryFiveStatuses(libName, source, toolchainReady);
    const plan = statuses.projectLoaded
      ? proposeLibraryDisconnect(source, libName)
      : proposeLibraryConnect(source, libName);

    if (!plan.ok) {
      setFeedback({ tone: 'err', text: plan.reasonRu ?? 'Операция отклонена защитой преамбулы.' });
      setPreviewLib(libName);
      return;
    }

    onApplySourcePatch(
      plan.nextSource,
      plan.action === 'connect'
        ? `Подключена библиотека \\usetikzlibrary{${libName}}`
        : `Отключена библиотека ${libName} из преамбулы`
    );
    setFeedback({
      tone: 'ok',
      text:
        plan.action === 'connect'
          ? `Добавлена декларация \\usetikzlibrary{${libName}} перед \\begin{document}. Доступен откат Undo.`
          : `Декларация ${libName} аккуратно удалена из преамбулы без затрагивания соседних пакетов.`,
    });
    setPreviewLib(null);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--tz-inset)] p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="pb-4 border-b border-[var(--tz-outline)]">
          <h1 className="text-xl font-semibold text-[var(--tz-text)]">
            Подключения библиотек TikZ и пакетов расширений (5 независимых статусов)
          </h1>
          <p className="text-sm text-[var(--tz-muted)] mt-1 max-w-3xl">
            В архитектуре TikZarium установка файла в TeX, подключение в преамбуле проекта, совместимость с движком, наличие визуального адаптера и наличие справки F1 никогда не смешиваются в один индикатор.
          </p>
        </div>

        {feedback && (
          <div
            role="status"
            className={`px-4 py-2.5 rounded border text-xs flex items-center justify-between ${
              feedback.tone === 'ok'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-500'
            }`}
          >
            <span>{feedback.text}</span>
            <button type="button" onClick={() => setFeedback(null)} aria-label="Скрыть уведомление">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Diff Preview Drawer when user hovers/clicks Diff */}
        {activePreview && (
          <div className="p-4 rounded border border-[var(--tz-accent)] bg-[var(--tz-window)] text-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--tz-text)]">
                Предпросмотр патча преамбулы для <code className="font-mono">{activePreview.libraryName}</code>
              </span>
              <button
                type="button"
                onClick={() => setPreviewLib(null)}
                className="text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
              >
                Закрыть предпросмотр
              </button>
            </div>
            {activePreview.ok ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                <div className="p-2 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]">
                  <div className="text-[10px] text-[var(--tz-muted)] mb-1">Было:</div>
                  <div className="text-rose-400">{activePreview.beforeLine}</div>
                </div>
                <div className="p-2 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)]">
                  <div className="text-[10px] text-[var(--tz-muted)] mb-1">Станет:</div>
                  <div className="text-emerald-400">{activePreview.afterLine}</div>
                </div>
              </div>
            ) : (
              <p className="text-rose-500">{activePreview.reasonRu}</p>
            )}
          </div>
        )}

        {/* 6 N2 TikZ Libraries Table */}
        <section className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] overflow-hidden">
          <div className="px-4 py-3 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)]">
            <h2 className="text-sm font-semibold text-[var(--tz-text)]">
              Каталог библиотек PGF/TikZ (обратимые декларации <code className="font-mono">\usetikzlibrary</code>)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--tz-outline)] text-[var(--tz-muted)] bg-[var(--tz-panel)]">
                  <th className="py-2.5 px-3 font-medium">Библиотека</th>
                  <th className="py-2.5 px-3 font-medium">1. Пакет в TeX</th>
                  <th className="py-2.5 px-3 font-medium">2. Подключена в .tex</th>
                  <th className="py-2.5 px-3 font-medium">3. Движок</th>
                  <th className="py-2.5 px-3 font-medium">4. GUI-адаптер</th>
                  <th className="py-2.5 px-3 font-medium">5. Справка F1</th>
                  <th className="py-2.5 px-3 font-medium text-right">Действие в преамбуле</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--tz-outline)]">
                {TIKZ_LIBRARIES.map((lib) => {
                  const st = getLibraryFiveStatuses(lib.name, source, toolchainReady);
                  return (
                    <tr key={lib.id} className="hover:bg-[var(--tz-hover)]/40">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-semibold text-[var(--tz-text)]">{lib.name}</div>
                        <div className="text-[11px] text-[var(--tz-muted)]">{lib.titleRu}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {st.packageInstalled === 'CONFIRMED' ? (
                          <span className="text-emerald-500">Установлен</span>
                        ) : (
                          <span className="text-[var(--tz-muted)]">Не проверен</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {st.projectLoaded ? (
                          <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            <span>Подключена</span>
                          </span>
                        ) : (
                          <span className="text-[var(--tz-muted)]">Не подключена</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-500">XeLaTeX OK</td>
                      <td className="py-2.5 px-3 text-[11px] text-[var(--tz-muted)]">{lib.toolNoteRu}</td>
                      <td className="py-2.5 px-3 text-[11px] text-[var(--tz-text)]">§{lib.manualSection} RU</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewLib(previewLib === lib.name ? null : lib.name)}
                            className="px-2 py-1 text-[11px] rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] border border-[var(--tz-outline)]"
                          >
                            Патч
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleLibrary(lib.name)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                              st.projectLoaded
                                ? 'bg-[var(--tz-button)] hover:bg-rose-500/15 text-rose-400 border border-[var(--tz-outline)]'
                                : 'bg-[var(--tz-accent)] text-white hover:opacity-95'
                            }`}
                          >
                            {st.projectLoaded ? (
                              <>
                                <Trash2 className="w-3 h-3" />
                                <span>Отключить</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Подключить</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Extension Manifests */}
        <section className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] overflow-hidden">
          <div className="px-4 py-3 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)]">
            <h2 className="text-sm font-semibold text-[var(--tz-text)]">
              Манифесты пакетов расширений TikZ (<code className="font-mono">extensions/*.toml</code>)
            </h2>
          </div>
          <div className="divide-y divide-[var(--tz-outline)]">
            {EXTENSION_MANIFESTS.map((ext) => {
              const insp = inspectPreambleConnections(source);
              const pkgLoaded =
                ext.name === 'tikz' || insp.packages.some((p) => p.name === ext.name);
              const engineOk = ext.engine === 'xelatex';
              const canToggle = ext.name !== 'tikz' && engineOk;
              return (
                <div key={ext.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="min-w-[240px] flex-1">
                    <div className="font-semibold text-[var(--tz-text)]">
                      {ext.displayName} <span className="font-mono text-[var(--tz-muted)]">({ext.name})</span>
                    </div>
                    <div className="text-[var(--tz-muted)] mt-0.5">{ext.notesRu}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-[var(--tz-muted)] font-mono">
                    <span>{ext.categoryRu}</span>
                    <span aria-hidden="true">·</span>
                    <span className={engineOk ? 'text-emerald-500' : 'text-amber-500'}>
                      Движок: {ext.engine}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>В документе: {pkgLoaded ? 'Да' : 'Нет'}</span>
                    {canToggle && (
                      <button
                        type="button"
                        onClick={() => {
                          const res = togglePackageInPreamble(source, ext.name, !pkgLoaded);
                          setFeedback({ tone: res.ok ? 'ok' : 'err', text: res.summaryRu });
                          if (res.ok) {
                            onApplySourcePatch(res.nextSource, res.summaryRu);
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-sans font-medium transition-colors ${
                          pkgLoaded
                            ? 'bg-[var(--tz-button)] hover:bg-rose-500/15 text-rose-400 border border-[var(--tz-outline)]'
                            : 'bg-[var(--tz-accent)] text-white hover:opacity-95'
                        }`}
                      >
                        {pkgLoaded ? (
                          <>
                            <Trash2 className="w-3 h-3" />
                            <span>Отключить</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Подключить</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

interface UxAuditMatrixViewProps {
  onJumpToSolution: (item: UxFindingItem) => void;
}

export const UxAuditMatrixView: React.FC<UxAuditMatrixViewProps> = ({ onJumpToSolution }) => {
  const [subView, setSubView] = useState<'ledger' | 'insights' | 'modernization' | 'ux-audit'>('ledger');
  const [filterPriority, setFilterPriority] = useState<'ALL' | 'P1' | 'P2'>('ALL');
  const [ledgerStatus, setLedgerStatus] = useState<'all' | ImplementationStatus>('all');
  const [ledgerGroup, setLedgerGroup] = useState<'all' | LedgerGroupId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const summary = getRequirementsLedgerSummary();

  const visibleItems = UX_AUDIT_FINDINGS.filter(
    (f) => filterPriority === 'ALL' || f.priority === filterPriority
  );

  const qNorm = searchQuery.trim().toLowerCase();
  const filteredLedger = REQUIREMENTS_AND_FE_LEDGER.filter((row) => {
    if (ledgerStatus !== 'all' && row.studioStatus !== ledgerStatus) return false;
    if (ledgerGroup !== 'all' && row.group !== ledgerGroup) return false;
    if (
      qNorm &&
      !row.id.toLowerCase().includes(qNorm) &&
      !row.titleRu.toLowerCase().includes(qNorm) &&
      !row.noteRu.toLowerCase().includes(qNorm)
    ) {
      return false;
    }
    return true;
  });

  const handleDownloadLedgerMd = () => {
    const md = buildMarkdownLedgerDocumentRu();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'REQUIREMENTS_AND_FE_LEDGER_RU.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadInsightsMd = () => {
    const md = buildInsightsAndPlansMarkdownRu();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'INSIGHTS_AND_PLANS_RU.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--tz-inset)] p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[var(--tz-outline)]">
          <div>
            <h1 className="text-xl font-semibold text-[var(--tz-text)]">
              Единый реестр всех требований, этапов Roadmap и FE
            </h1>
            <p className="text-xs text-[var(--tz-muted)] mt-1 max-w-3xl tabular-nums">
              Всего в репозитории учтено <strong className="text-[var(--tz-text)]">{summary.total}</strong> поз. ·{' '}
              <span className="text-emerald-500 font-medium">
                Реализовано: {summary.byStudioStatus.implemented}
              </span>{' '}
              ·{' '}
              <span className="text-amber-500 font-medium">
                Частично (стенд): {summary.byStudioStatus.partial}
              </span>{' '}
              ·{' '}
              <span>Описание-предложение: {summary.byStudioStatus.proposal}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center p-0.5 rounded bg-[var(--tz-panel)] border border-[var(--tz-outline)]"
              role="tablist"
              aria-label="Раздел реестра требований"
            >
              <button
                type="button"
                role="tab"
                aria-selected={subView === 'ledger'}
                onClick={() => setSubView('ledger')}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap tabular-nums ${
                  subView === 'ledger'
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                    : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                }`}
              >
                Все требования и FE ({summary.total})
              </button>
              <button
                type="button"
                role="tab"
                data-testid="tab-insights-plans"
                aria-selected={subView === 'insights'}
                onClick={() => setSubView('insights')}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap tabular-nums ${
                  subView === 'insights'
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                    : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                }`}
              >
                Инсайты и План ({ARCHITECTURAL_INSIGHTS.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={subView === 'modernization'}
                onClick={() => setSubView('modernization')}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap tabular-nums ${
                  subView === 'modernization'
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                    : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                }`}
              >
                План модернизации (20)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={subView === 'ux-audit'}
                onClick={() => setSubView('ux-audit')}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap tabular-nums ${
                  subView === 'ux-audit'
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                    : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                }`}
              >
                UX-аудит (14)
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadLedgerMd}
              className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap"
            >
              Ведомость (.md)
            </button>
            <button
              type="button"
              onClick={handleDownloadInsightsMd}
              className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-outline)] whitespace-nowrap"
            >
              Инсайты (.md)
            </button>
          </div>
        </div>

        {subView === 'ledger' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по ID или тексту (SC-PLOT, AI88, P66, MOD-06…)"
                  aria-label="Поиск по реестру требований и FE"
                  className="w-64 sm:w-72 px-2.5 py-1.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[var(--tz-text)] placeholder:text-[var(--tz-muted)]"
                />

                <select
                  aria-label="Фильтр раздела реестра"
                  value={ledgerGroup}
                  onChange={(e) => setLedgerGroup(e.target.value as 'all' | LedgerGroupId)}
                  className="max-w-xs px-2.5 py-1.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[var(--tz-text)]"
                >
                  <option value="all">Все разделы ({summary.total})</option>
                  {summary.byGroup.map((g) => (
                    <option key={g.group} value={g.group}>
                      {g.labelRu} ({g.total})
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="inline-flex items-center p-0.5 rounded bg-[var(--tz-panel)] border border-[var(--tz-outline)] tabular-nums"
                role="group"
                aria-label="Фильтр статуса реализации"
              >
                {(
                  [
                    ['all', `Все (${summary.total})`],
                    ['implemented', `Реализовано (${summary.byStudioStatus.implemented})`],
                    ['partial', `Частично (${summary.byStudioStatus.partial})`],
                    ['proposal', `Предложение (${summary.byStudioStatus.proposal})`],
                  ] as const
                ).map(([st, label]) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setLedgerStatus(st)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors whitespace-nowrap ${
                      ledgerStatus === st
                        ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                        : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] overflow-hidden">
              <div className="px-4 py-2 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] flex items-center justify-between text-xs text-[var(--tz-muted)] tabular-nums">
                <span>Показано записей: {filteredLedger.length} из {summary.total}</span>
                <span className="font-mono">docs/REQUIREMENTS_AND_FE_LEDGER_RU.md</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--tz-outline)] bg-[var(--tz-panel)] text-[var(--tz-muted)]">
                      <th className="py-2 px-3 font-medium whitespace-nowrap">ID</th>
                      <th className="py-2 px-3 font-medium whitespace-nowrap">Статус в Studio</th>
                      <th className="py-2 px-3 font-medium whitespace-nowrap">Статус в Rust</th>
                      <th className="py-2 px-3 font-medium">Требование / Функциональный элемент (FE)</th>
                      <th className="py-2 px-3 font-medium">Примечание и трассировка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--tz-outline)]">
                    {filteredLedger.map((row) => {
                      const statusColor =
                        row.studioStatus === 'implemented'
                          ? 'text-emerald-500 font-semibold'
                          : row.studioStatus === 'partial'
                            ? 'text-amber-500 font-medium'
                            : 'text-[var(--tz-muted)]';
                      const rustColor =
                        row.rustStatus === 'rust-main'
                          ? 'text-emerald-500'
                          : row.rustStatus === 'rust-pr-190'
                            ? 'text-[var(--tz-link)]'
                            : 'text-[var(--tz-muted)]';
                      return (
                        <tr key={row.id} className="hover:bg-[var(--tz-hover)]/40 align-top">
                          <td className="py-2 px-3 font-mono font-semibold text-[var(--tz-text)] whitespace-nowrap tabular-nums">
                            {row.id}
                          </td>
                          <td className={`py-2 px-3 whitespace-nowrap ${statusColor}`}>
                            {IMPLEMENTATION_STATUS_LABELS[row.studioStatus]}
                          </td>
                          <td className={`py-2 px-3 whitespace-nowrap text-[11px] ${rustColor}`}>
                            {RUST_STATUS_LABELS[row.rustStatus]}
                          </td>
                          <td className="py-2 px-3 text-[var(--tz-text)]">
                            <div>{row.titleRu}</div>
                            <div className="text-[10px] text-[var(--tz-muted)] mt-0.5">
                              {LEDGER_GROUP_LABELS[row.group]}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-[var(--tz-muted)]">
                            {row.noteRu}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {subView === 'insights' && (
          <div className="flex flex-col gap-6 text-xs" data-testid="insights-and-plans-view">
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--tz-text)]">
                  Архитектурные инсайты продукта (docs/INSIGHTS_AND_PLANS_RU.md)
                </h2>
                <span className="font-mono text-[11px] text-[var(--tz-muted)]">
                  SCIENCE_FIRST_DATA_LAST · PDF-подложка 1:1
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ARCHITECTURAL_INSIGHTS.map((ins) => (
                  <article
                    key={ins.id}
                    className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] flex flex-col gap-2"
                  >
                    <div className="font-mono text-[11px] text-[var(--tz-link)] font-semibold">
                      {ins.id}
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--tz-text)]">{ins.titleRu}</h3>
                    <p className="text-[var(--tz-muted)] leading-relaxed">
                      <strong className="text-[var(--tz-text)]">Наблюдение:</strong>{' '}
                      {ins.problemObservedRu}
                    </p>
                    <p className="text-[var(--tz-text)] leading-relaxed">
                      <strong className="text-emerald-500">Архитектурный сдвиг:</strong>{' '}
                      {ins.architecturalShiftRu}
                    </p>
                    <p className="pt-2 border-t border-[var(--tz-outline)] text-[var(--tz-muted)]">
                      <strong className="text-[var(--tz-text)]">Эффект:</strong>{' '}
                      {ins.measurableImpactRu}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--tz-text)]">
                Поэтапный план исполнения (Execution Waves: Studio → Rust eframe/egui 0.33.3)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {EXECUTION_WAVES.map((w) => (
                  <article
                    key={w.waveId}
                    className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                      <span className="font-semibold text-[var(--tz-text)]">{w.waveId}</span>
                      <span
                        className={
                          w.statusRu === 'ВЫПОЛНЕНО В СТЕНДЕ'
                            ? 'text-emerald-500 font-semibold'
                            : w.statusRu === 'В АКТИВНОЙ РАЗРАБОТКЕ'
                              ? 'text-amber-500 font-medium'
                              : 'text-[var(--tz-muted)]'
                        }
                      >
                        {w.statusRu}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--tz-text)]">{w.titleRu}</h3>
                    <div className="text-[11px] text-[var(--tz-muted)]">{w.horizonRu}</div>
                    <ul className="space-y-1.5 pt-2 border-t border-[var(--tz-outline)] text-[var(--tz-muted)] list-disc pl-4">
                      {w.deliverablesRu.map((d, idx) => (
                        <li key={idx} className="leading-snug">
                          {d}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {subView === 'modernization' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODERNIZATION_TASKS_20.map((task) => {
              const ledgerRow = REQUIREMENTS_AND_FE_LEDGER.find((r) => r.id === task.id);
              const st = ledgerRow?.studioStatus ?? 'proposal';
              const stClass =
                st === 'implemented'
                  ? 'text-emerald-500 font-semibold'
                  : st === 'partial'
                    ? 'text-amber-500 font-medium'
                    : 'text-[var(--tz-muted)]';
              return (
                <article
                  key={task.id}
                  className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] flex flex-col justify-between gap-2.5 text-xs"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-[var(--tz-muted)] tabular-nums">
                      <span>
                        <strong className={task.priority === 'P0' ? 'text-amber-500' : 'text-[var(--tz-link)]'}>
                          {task.id} · {task.priority}
                        </strong>
                        <span aria-hidden="true"> · </span>
                        <span className={stClass}>{IMPLEMENTATION_STATUS_LABELS[st]}</span>
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--tz-muted)]">{task.trackRu}</div>
                    <h2 className="text-sm font-semibold text-[var(--tz-text)]">{task.titleRu}</h2>
                    <p className="text-[var(--tz-muted)] leading-relaxed">
                      <strong className="text-[var(--tz-text)]">Проблема:</strong> {task.problemRu}
                    </p>
                    <p className="text-[var(--tz-text)] leading-relaxed">
                      <strong className="text-emerald-500">Задача:</strong> {task.scopeAndActionRu}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--tz-outline)] font-mono text-[11px] text-[var(--tz-muted)]">
                    Связанные требования: {task.relatedIds.join(' · ')}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {subView === 'ux-audit' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--tz-muted)]">
                Прямая трассировка 14 находок <code className="font-mono">2026-11-10_CRITICAL_UX_AUDIT_RU.md</code> к рабочим контролам студии.
              </p>
              <div
                className="inline-flex items-center p-0.5 rounded bg-[var(--tz-panel)] border border-[var(--tz-outline)]"
                role="group"
                aria-label="Фильтр приоритета UX-находок"
              >
                {(['ALL', 'P1', 'P2'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilterPriority(p)}
                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap tabular-nums ${
                      filterPriority === p
                        ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                        : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                    }`}
                  >
                    {p === 'ALL' ? 'Все (14)' : p === 'P1' ? 'Блокеры P1 (9)' : 'Важные P2 (5)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleItems.map((item) => (
                <article
                  key={item.id}
                  className="p-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] flex flex-col justify-between gap-3"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-[var(--tz-muted)] font-mono">
                      <span>
                        <strong className={item.priority === 'P1' ? 'text-amber-500' : 'text-[var(--tz-link)]'}>
                          {item.id} · {item.priority}
                        </strong>{' '}
                        · {item.rustLocation}
                      </span>
                    </div>
                    <h2 className="text-sm font-semibold text-[var(--tz-text)]">{item.titleRu}</h2>
                    <p className="text-xs text-[var(--tz-muted)]">
                      <strong className="text-[var(--tz-text)]">Было в аудите:</strong> {item.auditProblemRu}
                    </p>
                    <p className="text-xs text-[var(--tz-text)]">
                      <strong className="text-emerald-500">Решение в проекте:</strong> {item.ergonomicSolutionRu}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--tz-outline)] flex justify-end">
                    <button
                      type="button"
                      onClick={() => onJumpToSolution(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-outline)]"
                    >
                      <span>{item.targetAction.buttonLabelRu}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface SaveAndBuildModalProps {
  open: boolean;
  defaultFilename: string;
  onClose: () => void;
  onConfirmSaveAndBuild: (directory: string, filename: string, overwriteConfirmed: boolean) => void;
}

const PRESET_FOLDERS = [
  { label: 'Папка проекта (./figures)', path: 'C:\\Users\\Researcher\\Documents\\TikZarium\\figures' },
  { label: 'Статья LaTeX (./manuscript/img)', path: 'C:\\Users\\Researcher\\Papers\\Optics2026\\img' },
  { label: 'Временный стенд (./scratch)', path: 'C:\\TikZarium-Portable\\workspace' },
];

const EXISTING_FILES = new Set(['quickstart.tex', 'existing_figure.tex']);

export const SaveAndBuildModal: React.FC<SaveAndBuildModalProps> = ({
  open,
  defaultFilename,
  onClose,
  onConfirmSaveAndBuild,
}) => {
  const [selectedFolder, setSelectedFolder] = useState(PRESET_FOLDERS[0].path);
  const [filename, setFilename] = useState(defaultFilename);
  const [manualMode, setManualMode] = useState(false);
  const [overwriteAck, setOverwriteAck] = useState(false);

  if (!open) return null;

  const trimmedName = filename.trim();
  const invalidExtension = !trimmedName.endsWith('.tex') && !trimmedName.endsWith('.tikz');
  const collides = EXISTING_FILES.has(trimmedName);
  const canProceed = trimmedName.length > 4 && !invalidExtension && (!collides || overwriteAck);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-build-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-lg rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-text)] shadow-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[var(--tz-link)]" />
            <h2 id="save-build-title" className="text-sm font-semibold">
              Сохранение исходника .tex и сборка PDF (UX-F05)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно сохранения"
            className="text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 text-xs">
          <div>
            <label className="block font-medium mb-1.5">1. Рабочая папка (без ручного набора пути)</label>
            <div className="flex flex-col gap-1.5">
              {PRESET_FOLDERS.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => {
                    setSelectedFolder(f.path);
                    setManualMode(false);
                  }}
                  className={`text-left px-3 py-2 rounded border transition-colors ${
                    selectedFolder === f.path && !manualMode
                      ? 'bg-[var(--tz-active)] border-[var(--tz-accent)] text-[var(--tz-text)]'
                      : 'bg-[var(--tz-inset)] border-[var(--tz-outline)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                  }`}
                >
                  <div className="font-medium text-[var(--tz-text)]">{f.label}</div>
                  <div className="font-mono text-[11px] opacity-80">{f.path}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="save-filename-input" className="block font-medium mb-1">
              2. Имя файла исходника (.tex / .tikz)
            </label>
            <input
              id="save-filename-input"
              type="text"
              value={filename}
              onChange={(e) => {
                setFilename(e.target.value);
                setOverwriteAck(false);
              }}
              className="w-full px-3 py-1.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs"
            />
            {invalidExtension && (
              <p className="text-rose-500 mt-1">
                Исходник обязан иметь расширение .tex или .tikz (защита от перезаписи целевого .pdf).
              </p>
            )}
          </div>

          {collides && (
            <div className="p-3 rounded border border-amber-500/50 bg-amber-500/10 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-medium text-amber-500">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Файл «{trimmedName}» уже существует в выбранной папке</span>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer text-[var(--tz-text)]">
                <input
                  type="checkbox"
                  checked={overwriteAck}
                  onChange={(e) => setOverwriteAck(e.target.checked)}
                />
                <span>Явно разрешить перезапись существующего файла .tex</span>
              </label>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setManualMode((v) => !v)}
              className="text-[11px] text-[var(--tz-link)] hover:underline"
            >
              {manualMode ? 'Скрыть ручной ввод пути' : 'Ручной ввод полного пути (резервный режим)…'}
            </button>
            {manualMode && (
              <input
                type="text"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                aria-label="Полный путь к каталогу"
                className="mt-1.5 w-full px-3 py-1.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-xs"
              />
            )}
          </div>
        </div>

        <div className="px-5 py-3 bg-[var(--tz-panel)] border-t border-[var(--tz-outline)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)]"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!canProceed}
            onClick={() => onConfirmSaveAndBuild(selectedFolder, trimmedName, overwriteAck)}
            className="px-4 py-1.5 text-xs font-medium rounded bg-[var(--tz-accent)] text-white hover:opacity-95 disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Сохранить и запустить сборку PDF
          </button>
        </div>
      </div>
    </div>
  );
};
