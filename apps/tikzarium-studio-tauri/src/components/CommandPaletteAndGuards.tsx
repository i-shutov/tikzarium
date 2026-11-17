import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Command, AlertTriangle, CornerDownLeft } from 'lucide-react';

export interface CommandPaletteAction {
  id: string;
  categoryRu: string;
  labelRu: string;
  shortcut?: string;
  keywords: string;
  run: () => void;
}

interface CommandPaletteModalProps {
  open: boolean;
  actions: CommandPaletteAction[];
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  open,
  actions,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.labelRu.toLowerCase().includes(q) ||
        a.categoryRu.toLowerCase().includes(q) ||
        a.keywords.toLowerCase().includes(q)
    );
  }, [actions, query]);

  if (!open) return null;

  const activeIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
      );
      return;
    }
    if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      filtered[activeIndex].run();
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cmd-palette-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-16 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-text)] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)]">
          <Search className="w-4 h-4 text-[var(--tz-link)] shrink-0" />
          <input
            ref={inputRef}
            id="cmd-palette-title"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Быстрая команда, инструмент, библиотека \usetikzlibrary или тема…"
            aria-label="Поиск быстрой команды TikZarium Studio"
            className="flex-1 bg-transparent text-sm text-[var(--tz-text)] placeholder:text-[var(--tz-muted)] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть палитру команд"
            className="text-[var(--tz-muted)] hover:text-[var(--tz-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-[var(--tz-outline)]/60">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-[var(--tz-muted)]">
              Команда по запросу «{query}» не найдена.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 text-xs transition-colors ${
                    isCurrent ? 'bg-[var(--tz-active)] text-[var(--tz-text)]' : 'hover:bg-[var(--tz-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-[var(--tz-muted)] shrink-0">
                      {item.categoryRu} ·
                    </span>
                    <span className="font-medium truncate">{item.labelRu}</span>
                  </div>
                  {item.shortcut && (
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[var(--tz-muted)] shrink-0">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-[var(--tz-panel)] border-t border-[var(--tz-outline)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--tz-muted)] font-mono">
          <span className="inline-flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>↑↓ выбор · Enter выполнить · Esc закрыть</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" />
            <span>Ctrl+Enter: Сборка PDF · V/L/A/R/C/N/B: Инструменты</span>
          </span>
        </div>
      </div>
    </div>
  );
};

interface DirtyDocumentGuardModalProps {
  open: boolean;
  currentFilename: string;
  targetTitleRu: string;
  onCancel: () => void;
  onDiscardAndSwitch: () => void;
  onSaveAndSwitch: () => void;
}

export const DirtyDocumentGuardModal: React.FC<DirtyDocumentGuardModalProps> = ({
  open,
  currentFilename,
  targetTitleRu,
  onCancel,
  onDiscardAndSwitch,
  onSaveAndSwitch,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dirty-guard-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-text)] shadow-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <h2 id="dirty-guard-title" className="text-sm font-semibold">
            Несохранённые изменения в {currentFilename}
          </h2>
        </div>

        <div className="p-5 text-xs text-[var(--tz-muted)] leading-relaxed flex flex-col gap-2">
          <p className="text-[var(--tz-text)]">
            В текущем буфере <code className="font-mono">{currentFilename}</code> есть несохранённые правки перед переходом к «{targetTitleRu}».
          </p>
          <p>
            По контракту безопасности данных TikZarium (проверка <code className="font-mono">dirty-open</code>) смена документа никогда не затирает исходник без явного решения автора.
          </p>
        </div>

        <div className="px-5 py-3 bg-[var(--tz-panel)] border-t border-[var(--tz-outline)] flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)]"
          >
            Остаться
          </button>
          <button
            type="button"
            onClick={onDiscardAndSwitch}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--tz-button)] hover:bg-rose-500/15 text-rose-400 border border-[var(--tz-outline)]"
          >
            Отбросить правки
          </button>
          <button
            type="button"
            onClick={onSaveAndSwitch}
            className="px-3.5 py-1.5 text-xs font-medium rounded bg-[var(--tz-accent)] text-white hover:opacity-95"
          >
            Сохранить и открыть
          </button>
        </div>
      </div>
    </div>
  );
};
