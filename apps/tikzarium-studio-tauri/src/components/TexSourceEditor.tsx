import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  WrapText,
  EyeOff,
  Eye,
  CornerDownLeft,
  ChevronDown,
  ChevronUp,
  Wand2,
  WandSparkles,
  ListTree,
  Braces,
  SlidersHorizontal,
  BookOpen,
} from 'lucide-react';
import {
  tokenizeTexLine,
  utf8ByteLength,
  measureMetadataShare,
  proposeLibraryConnect,
  OWNERSHIP_MARKER,
} from '../domain/tikzEngine';
import type { OwnedPrimitive, TexDiagnostic, TokenKind } from '../domain/tikzEngine';
import { resolveCaretTexHelp, resolveTexCommandHover } from '../domain/texHoverHelp';
import type { TexCommandHoverInfo } from '../domain/texHoverHelp';
import {
  detectAdoptableTikzLines,
  getTexAutocompleteSuggestions,
} from '../domain/ergonomicsBundle';
import type { AutocompleteSuggestion } from '../domain/ergonomicsBundle';
import {
  findNumericTokenAtColumn,
  scrubNumericLiteralInSource,
} from '../domain/advancedCadBundle';
import {
  alignAmpersandColumnsInSource,
  buildTexDocumentOutline,
  cleanPreambleAndUnusedLibraries,
  findMatchingDelimiterOrEnvAtOffset,
  formatTikzDocumentSource,
  moveLineInSource,
  replaceAllInTexPreservingN1,
  toggleLineCommentsInSource,
} from '../domain/formatterRefactorAndCadBundle';
import {
  joinPreambleAndBodyToSource,
  splitTexDocumentIntoPreambleAndBody,
  upsertQuickTikzsetStyleInPreamble,
} from '../domain/workspaceAndEngineeringStageBundle';
import type { PreambleSplitterPresetId } from '../domain/workspaceAndEngineeringStageBundle';
import {
  ATOMIC_FIGURE_PROFILES,
  AVAILABLE_PREAMBLE_PACKAGES,
  AVAILABLE_TIKZ_LIBRARIES,
  inspectFigurePackagePassport,
  togglePackageInPreamble,
  toggleTikzLibraryInPreamble,
} from '../domain/atomicFigureProfile';
import type { AtomicFigureProfileId } from '../domain/atomicFigureProfile';

interface TexSourceEditorProps {
  filename: string;
  source: string;
  onChangeSource: (nextSource: string, descriptionRu: string) => void;
  activeLine: number;
  onChangeActiveLine: (line: number) => void;
  diagnostics: TexDiagnostic[];
  ownedPrimitives: OwnedPrimitive[];
  hoveredPrimitiveId: number | null;
  onHoverPrimitive: (id: number | null) => void;
  onAdoptRawLine: (lineNumber: number) => void;
  onAdoptAllRawLines: () => void;
  fontSizePt: 12 | 14 | 16 | 18 | 20 | 24;
  onChangeFontSizePt: (pt: 12 | 14 | 16 | 18 | 20 | 24) => void;
  softWrap: boolean;
  onToggleSoftWrap: () => void;
  searchBarOpen: boolean;
  onToggleSearchBar: (open: boolean) => void;
  highlightedZone: 'editor' | 'search' | null;
  indentSpaces?: 2 | 4;
  onOpenFormatterModal?: () => void;
  preamblePreset?: PreambleSplitterPresetId;
  figureProfileId?: AtomicFigureProfileId;
  onSelectFigureProfile?: (profileId: AtomicFigureProfileId) => void;
  onOpenManualAnchor?: (anchorId: string) => void;
  onCaretAnchorChange?: (anchorId: string | null) => void;
}

const FONT_SIZE_CLASSES: Record<12 | 14 | 16 | 18 | 20 | 24, string> = {
  12: 'text-[12px] leading-[20px]',
  14: 'text-[13.5px] leading-[22px]',
  16: 'text-[15px] leading-[24px]',
  18: 'text-[17px] leading-[27px]',
  20: 'text-[19px] leading-[30px]',
  24: 'text-[22px] leading-[34px]',
};

const LINE_HEIGHT_PX: Record<12 | 14 | 16 | 18 | 20 | 24, number> = {
  12: 20,
  14: 22,
  16: 24,
  18: 27,
  20: 30,
  24: 34,
};


const TOKEN_COLOR_CLASSES: Record<TokenKind, string> = {
  plain: 'text-[var(--tz-text)]',
  command: 'text-[var(--tz-syn-cmd)] font-medium',
  environment: 'text-[var(--tz-syn-env)] font-medium',
  option: 'text-[var(--tz-syn-opt)]',
  number: 'text-[var(--tz-syn-num)]',
  delimiter: 'text-[var(--tz-muted)]',
  math: 'text-[var(--tz-syn-math)]',
  operator: 'text-[var(--tz-syn-cmd)]',
  comment: 'text-[var(--tz-syn-comment)] italic',
  metadata: 'text-[var(--tz-syn-meta)] opacity-60',
};

export const TexSourceEditor: React.FC<TexSourceEditorProps> = ({
  filename,
  source,
  onChangeSource,
  activeLine,
  onChangeActiveLine,
  diagnostics,
  ownedPrimitives,
  hoveredPrimitiveId,
  onHoverPrimitive,
  onAdoptRawLine,
  onAdoptAllRawLines,
  fontSizePt,
  onChangeFontSizePt,
  softWrap,
  onToggleSoftWrap,
  searchBarOpen,
  onToggleSearchBar,
  highlightedZone,
  indentSpaces = 2,
  onOpenFormatterModal,
  preamblePreset = 'compact',
  figureProfileId,
  onSelectFigureProfile,
  onOpenManualAnchor,
  onCaretAnchorChange,
}) => {
  // Preamble pane refs (Top window in E01 Two-Pane Splitter)
  const preambleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preambleBackdropRef = useRef<HTMLDivElement | null>(null);
  const preambleGutterRef = useRef<HTMLDivElement | null>(null);

  // Figure Body / Unified pane refs (Bottom window in E01 Two-Pane Splitter)
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyBackdropRef = useRef<HTMLDivElement | null>(null);
  const bodyGutterRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLSpanElement | null>(null);

  // Tabbed buffer mode: 'body' (default, 100% height figure code), 'preamble' (hidden in tab), 'full' (entire .tex)
  const [activeEditorTab, setActiveEditorTab] = useState<'body' | 'preamble' | 'full'>('body');
  const editorBufferMode: 'split' | 'single' = activeEditorTab === 'full' ? 'single' : 'split';
  const preambleCollapsed = activeEditorTab !== 'preamble';

  // Quick \tikzset inline creator in Preamble bar
  const [quickStyleOpen, setQuickStyleOpen] = useState(false);
  const [quickStyleName, setQuickStyleName] = useState('tzBlock');
  const [quickStyleDef, setQuickStyleDef] = useState('thick,draw=blue!75!black,fill=blue!8');

  // Compact overflow menu in Figure Code header ("Код ▾") with outside-click & Escape dismissal
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const onPointerDown = (ev: MouseEvent) => {
      if (
        moreMenuContainerRef.current &&
        !moreMenuContainerRef.current.contains(ev.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setMoreMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [moreMenuOpen]);

  const [compactMetaPreview, setCompactMetaPreview] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findCaseSensitive, setFindCaseSensitive] = useState(true);
  const [findUseRegex, setFindUseRegex] = useState(false);
  const [goToLineInput, setGoToLineInput] = useState('');
  const [navNotice, setNavNotice] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<TexCommandHoverInfo | null>(null);
  const [tooltipDock, setTooltipDock] = useState<'top' | 'bottom'>('bottom');
  const [caretCol, setCaretCol] = useState<number>(0);
  const [caretOffset, setCaretOffset] = useState<number>(0);
  const [virtualWindowStart, setVirtualWindowStart] = useState<number>(0);

  // Caret-aware autocomplete state (tracks global source offsets)
  const [acMenu, setAcMenu] = useState<{
    pane: 'preamble' | 'body';
    replaceStart: number;
    replaceEnd: number;
    items: AutocompleteSuggestion[];
    activeIndex: number;
  } | null>(null);

  const splitDoc = useMemo(() => splitTexDocumentIntoPreambleAndBody(source), [source]);
  const packagePassport = useMemo(() => inspectFigurePackagePassport(source), [source]);
  const effectiveProfileId = figureProfileId ?? packagePassport.inferredProfileId;
  const isTwoPaneActive = editorBufferMode === 'split' && splitDoc.hasPreamble;

  const lines = useMemo(() => source.split(/\r?\n/), [source]);
  const preambleLines = useMemo(
    () => (isTwoPaneActive ? splitDoc.preambleText.split(/\r?\n/) : []),
    [isTwoPaneActive, splitDoc.preambleText]
  );
  const bodyLines = useMemo(
    () => (isTwoPaneActive ? splitDoc.bodyText.split(/\r?\n/) : lines),
    [isTwoPaneActive, lines, splitDoc.bodyText]
  );
  const bodyBaseLineNumber = isTwoPaneActive ? splitDoc.bodyStartLine : 1;
  const bodyBaseCharOffset = isTwoPaneActive ? splitDoc.bodyStartCharOffset : 0;

  // MOD-10: Keep structured preview DOM capped at <= 180 rendered rows for 10k+ line buffers
  const VIRTUAL_WINDOW_SIZE = 180;
  const isBodyVirtualized = bodyLines.length > 240;
  const effectiveWindowStart = isBodyVirtualized
    ? Math.max(0, Math.min(bodyLines.length - VIRTUAL_WINDOW_SIZE, virtualWindowStart))
    : 0;
  const visibleBodySlice = useMemo(
    () =>
      isBodyVirtualized
        ? bodyLines.slice(effectiveWindowStart, effectiveWindowStart + VIRTUAL_WINDOW_SIZE)
        : bodyLines,
    [bodyLines, effectiveWindowStart, isBodyVirtualized]
  );

  useEffect(() => {
    if (!isBodyVirtualized) return;
    const localIdx = Math.max(0, activeLine - bodyBaseLineNumber);
    if (
      localIdx < effectiveWindowStart ||
      localIdx >= effectiveWindowStart + VIRTUAL_WINDOW_SIZE
    ) {
      setVirtualWindowStart(
        Math.max(
          0,
          Math.min(bodyLines.length - VIRTUAL_WINDOW_SIZE, localIdx - Math.floor(VIRTUAL_WINDOW_SIZE / 3))
        )
      );
    }
  }, [activeLine, bodyBaseLineNumber, bodyLines.length, effectiveWindowStart, isBodyVirtualized]);

  const lineEndingLabel = source.includes('\r\n') ? 'CRLF' : 'LF';
  const byteCount = useMemo(() => utf8ByteLength(source), [source]);
  const metaStats = useMemo(() => measureMetadataShare(source), [source]);
  const adoptableLines = useMemo(() => detectAdoptableTikzLines(source), [source]);
  const documentOutline = useMemo(
    () => buildTexDocumentOutline(source, diagnostics),
    [diagnostics, source]
  );
  const matchingPair = useMemo(
    () => findMatchingDelimiterOrEnvAtOffset(source, caretOffset),
    [caretOffset, source]
  );
  const caretHelp = useMemo(
    () => resolveCaretTexHelp(source, caretOffset),
    [caretOffset, source]
  );

  useEffect(() => {
    onCaretAnchorChange?.(caretHelp?.manualAnchorId ?? null);
  }, [caretHelp?.manualAnchorId, onCaretAnchorChange]);

  const ownedByLine = useMemo(() => {
    const map = new Map<number, OwnedPrimitive>();
    for (const p of ownedPrimitives) {
      map.set(p.lineNumber, p);
    }
    return map;
  }, [ownedPrimitives]);

  const adoptableByLine = useMemo(() => {
    const map = new Map<number, (typeof adoptableLines)[number]>();
    for (const a of adoptableLines) {
      map.set(a.lineNumber, a);
    }
    return map;
  }, [adoptableLines]);

  const activeLineAdoptable = adoptableByLine.get(activeLine) ?? null;
  const activeNumericToken = useMemo(
    () => findNumericTokenAtColumn(source, activeLine, caretCol),
    [activeLine, caretCol, source]
  );

  const handleScrubActiveNumber = (direction: 1 | -1, coarse = false) => {
    const res = scrubNumericLiteralInSource(source, activeLine, caretCol, direction, coarse);
    if (res.ok) {
      onChangeSource(res.nextSource, `Скруббер числа .tex: → ${res.nextToken} (стр. ${activeLine})`);
      setCaretCol(res.nextCol);
    }
  };

  const errorLines = useMemo(() => {
    const map = new Map<number, TexDiagnostic>();
    for (const d of diagnostics) {
      if (!map.has(d.lineNumber) || d.severity === 'error') {
        map.set(d.lineNumber, d);
      }
    }
    return map;
  }, [diagnostics]);

  const matchCount = useMemo(() => {
    if (!findQuery) return 0;
    let count = 0;
    let idx = 0;
    while (idx <= source.length - findQuery.length) {
      const found = source.indexOf(findQuery, idx);
      if (found === -1) break;
      count++;
      idx = found + Math.max(1, findQuery.length);
    }
    return count;
  }, [source, findQuery]);

  const syncPreambleScroll = () => {
    const ta = preambleTextareaRef.current;
    if (!ta) return;
    if (preambleBackdropRef.current) {
      preambleBackdropRef.current.scrollTop = ta.scrollTop;
      preambleBackdropRef.current.scrollLeft = ta.scrollLeft;
    }
    if (preambleGutterRef.current) {
      preambleGutterRef.current.scrollTop = ta.scrollTop;
    }
  };

  const syncBodyScroll = () => {
    const ta = bodyTextareaRef.current;
    if (!ta) return;
    if (hoverInfo) setHoverInfo(null);
    if (bodyBackdropRef.current) {
      bodyBackdropRef.current.scrollTop = ta.scrollTop;
      bodyBackdropRef.current.scrollLeft = ta.scrollLeft;
    }
    if (bodyGutterRef.current) {
      bodyGutterRef.current.scrollTop = ta.scrollTop;
    }
  };

  // Auto-switch between 'body' and 'preamble' tabs only when an explicit line jump targets preamble vs body
  useEffect(() => {
    if (activeEditorTab === 'full' || !splitDoc.hasPreamble) return;
    if (activeLine <= splitDoc.preambleLineCount && activeEditorTab !== 'preamble') {
      setActiveEditorTab('preamble');
    } else if (activeLine >= splitDoc.bodyStartLine && activeEditorTab === 'preamble') {
      setActiveEditorTab('body');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLine, splitDoc.bodyStartLine, splitDoc.hasPreamble, splitDoc.preambleLineCount]);

  const updateCaretFromPane = (pane: 'preamble' | 'body') => {
    const ta = pane === 'preamble' ? preambleTextareaRef.current : bodyTextareaRef.current;
    if (!ta) return;
    const localPos = ta.selectionStart ?? 0;
    const globalPos = (pane === 'body' ? bodyBaseCharOffset : 0) + localPos;
    setCaretOffset(globalPos);
    const before = source.slice(0, globalPos);
    const parts = before.split('\n');
    const lineNum = parts.length;
    const col = parts[parts.length - 1]?.replace(/\r$/, '').length ?? 0;
    setCaretCol(col);
    if (lineNum !== activeLine) {
      onChangeActiveLine(lineNum);
    }
  };

  const applyAutocompleteChoice = (choice: AutocompleteSuggestion) => {
    if (!acMenu) return;
    const next =
      source.slice(0, acMenu.replaceStart) + choice.insertText + source.slice(acMenu.replaceEnd);
    const nextGlobalCaret = acMenu.replaceStart + choice.insertText.length;
    const targetPane = acMenu.pane;
    setAcMenu(null);
    onChangeSource(next, `Автодополнение LaTeX: ${choice.trigger}`);
    requestAnimationFrame(() => {
      const ta =
        targetPane === 'preamble' ? preambleTextareaRef.current : bodyTextareaRef.current;
      if (ta) {
        const nextSplit = splitTexDocumentIntoPreambleAndBody(next);
        const baseOff =
          targetPane === 'body' && editorBufferMode === 'split' && nextSplit.hasPreamble
            ? nextSplit.bodyStartCharOffset
            : 0;
        const localCaret = Math.max(0, nextGlobalCaret - baseOff);
        ta.focus();
        ta.setSelectionRange(localCaret, localCaret);
        updateCaretFromPane(targetPane);
      }
    });
  };

  const refreshAutocompleteAtCaret = (
    fullText: string,
    globalCaretOffset: number,
    pane: 'preamble' | 'body',
    forceOpen = false
  ) => {
    const res = getTexAutocompleteSuggestions(fullText, globalCaretOffset, forceOpen);
    if (!res) {
      setAcMenu(null);
      return;
    }
    setAcMenu({
      pane,
      replaceStart: res.replaceStart,
      replaceEnd: res.replaceEnd,
      items: res.items,
      activeIndex: 0,
    });
  };

  const handlePreambleTextareaMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (e.buttons !== 0) {
      if (hoverInfo) setHoverInfo(null);
      return;
    }
    const ta = preambleTextareaRef.current;
    if (!ta) return;
    const rect = ta.getBoundingClientRect();
    const padLeft = 12;
    const padTop = 8;
    const relViewportX = e.clientX - rect.left;
    const relViewportY = e.clientY - rect.top;
    if (
      relViewportX < padLeft ||
      relViewportY < padTop ||
      relViewportX > ta.clientWidth ||
      relViewportY > ta.clientHeight
    ) {
      if (hoverInfo) setHoverInfo(null);
      return;
    }
    const measuredTen = rulerRef.current?.getBoundingClientRect().width ?? 0;
    const charWidth = measuredTen > 0 ? measuredTen / 10 : fontSizePt * 0.6;
    const lineHeight = LINE_HEIGHT_PX[fontSizePt];
    const localLine = Math.floor((relViewportY - padTop + ta.scrollTop) / lineHeight) + 1;
    const hitCol = Math.floor((relViewportX - padLeft + ta.scrollLeft) / charWidth);
    const resolved = resolveTexCommandHover(source, localLine, hitCol);
    setTooltipDock('bottom');
    setHoverInfo(resolved);
  };

  const handleBodyTextareaMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (e.buttons !== 0) {
      if (hoverInfo) setHoverInfo(null);
      return;
    }
    const ta = bodyTextareaRef.current;
    if (!ta) return;
    const rect = ta.getBoundingClientRect();
    const padLeft = 12;
    const padTop = 10;
    const relViewportX = e.clientX - rect.left;
    const relViewportY = e.clientY - rect.top;

    if (
      relViewportX < padLeft ||
      relViewportY < padTop ||
      relViewportX > ta.clientWidth ||
      relViewportY > ta.clientHeight
    ) {
      if (hoverInfo) setHoverInfo(null);
      onHoverPrimitive(null);
      return;
    }

    const measuredTen = rulerRef.current?.getBoundingClientRect().width ?? 0;
    const charWidth = measuredTen > 0 ? measuredTen / 10 : fontSizePt * 0.6;
    const lineHeight = LINE_HEIGHT_PX[fontSizePt];
    const contentX = relViewportX - padLeft + ta.scrollLeft;
    const contentY = relViewportY - padTop + ta.scrollTop;

    let localLine = 1;
    let hitCol = 0;

    if (!softWrap) {
      localLine = Math.floor(contentY / lineHeight) + 1;
      hitCol = Math.floor(contentX / charWidth);
    } else {
      const availWidth = Math.max(charWidth, ta.clientWidth - padLeft * 2);
      const colsPerVisualRow = Math.max(1, Math.floor(availWidth / charWidth));
      const targetVisualRow = Math.floor(contentY / lineHeight);
      let accRows = 0;
      let found = false;
      for (let i = 0; i < bodyLines.length; i++) {
        const len = bodyLines[i].length;
        const vRows = Math.max(1, Math.ceil(len / colsPerVisualRow));
        if (targetVisualRow < accRows + vRows) {
          const subRow = targetVisualRow - accRows;
          localLine = i + 1;
          hitCol = subRow * colsPerVisualRow + Math.floor((relViewportX - padLeft) / charWidth);
          found = true;
          break;
        }
        accRows += vRows;
      }
      if (!found) {
        if (hoverInfo) setHoverInfo(null);
        onHoverPrimitive(null);
        return;
      }
    }

    const physicalLine = bodyBaseLineNumber + localLine - 1;
    const ownedOnHitLine = ownedByLine.get(physicalLine);
    onHoverPrimitive(ownedOnHitLine ? ownedOnHitLine.id : null);

    const resolved = resolveTexCommandHover(source, physicalLine, hitCol);
    const nextDock: 'top' | 'bottom' = relViewportY < rect.height * 0.52 ? 'bottom' : 'top';
    setTooltipDock((prev) => (prev === nextDock ? prev : nextDock));
    setHoverInfo((prev) => {
      if (!resolved && !prev) return null;
      if (
        resolved &&
        prev &&
        resolved.lineNumber === prev.lineNumber &&
        resolved.tokenStart === prev.tokenStart &&
        resolved.tokenEnd === prev.tokenEnd &&
        resolved.hoveredToken === prev.hoveredToken
      ) {
        return prev;
      }
      return resolved;
    });
  };

  const focusGlobalOffset = (globalOff: number, targetLine: number, selectEndOff?: number) => {
    const clampedOff = Math.max(0, Math.min(source.length, globalOff));
    const clampedEnd =
      selectEndOff !== undefined ? Math.max(clampedOff, Math.min(source.length, selectEndOff)) : clampedOff;
    onChangeActiveLine(targetLine);
    setCaretOffset(clampedOff);
    if (compactMetaPreview) setCompactMetaPreview(false);

    const targetInPreamble = isTwoPaneActive && targetLine <= splitDoc.preambleLineCount;
    if (activeEditorTab !== 'full' && splitDoc.hasPreamble) {
      setActiveEditorTab(targetInPreamble ? 'preamble' : 'body');
    }

    requestAnimationFrame(() => {
      if (targetInPreamble) {
        const ta = preambleTextareaRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(clampedOff, Math.min(splitDoc.preambleText.length, clampedEnd));
          const approxRowPx = fontSizePt + 8;
          ta.scrollTop = Math.max(0, (targetLine - 3) * approxRowPx);
          syncPreambleScroll();
        }
      } else {
        const ta = bodyTextareaRef.current;
        if (ta) {
          const localStart = Math.max(0, clampedOff - bodyBaseCharOffset);
          const localEnd = Math.max(localStart, clampedEnd - bodyBaseCharOffset);
          const localRow = Math.max(1, targetLine - bodyBaseLineNumber + 1);
          ta.focus();
          ta.setSelectionRange(localStart, localEnd);
          const approxRowPx = fontSizePt + 8;
          ta.scrollTop = Math.max(0, (localRow - 4) * approxRowPx);
          syncBodyScroll();
        }
      }
    });
  };

  const jumpToOffset = (targetOffset: number, targetLine: number, noticeRu: string) => {
    focusGlobalOffset(targetOffset, targetLine);
    setNavNotice(noticeRu);
  };

  const jumpToPhysicalLine = (targetLine: number) => {
    const clamped = Math.max(1, Math.min(lines.length, targetLine));
    let charOffset = 0;
    let currentLine = 1;
    while (currentLine < clamped && charOffset < source.length) {
      const nl = source.indexOf('\n', charOffset);
      if (nl === -1) break;
      charOffset = nl + 1;
      currentLine++;
    }
    const lineEndNl = source.indexOf('\n', charOffset);
    const lineEnd =
      lineEndNl === -1
        ? source.length
        : source[lineEndNl - 1] === '\r'
          ? lineEndNl - 1
          : lineEndNl;
    focusGlobalOffset(charOffset, clamped, lineEnd);
    setNavNotice(`Переход к физической строке ${clamped}`);
  };

  const handleQuickFormatCode = () => {
    const res = formatTikzDocumentSource(source, { indentSpaces });
    if (res.changedLinesCount === 0 && res.nextSource === source) {
      setNavNotice(`Код уже отформатирован по стандарту TikZ (${res.lineEnding}, n1: ${res.preservedOwnedCount}).`);
      return;
    }
    onChangeSource(
      res.nextSource,
      `Автоформатирование кода .tex (${res.changedLinesCount} стр., n1: ${res.preservedOwnedCount} сохр. · P66)`
    );
    setNavNotice(
      `Отформатировано строк: ${res.changedLinesCount} · сохранено ${res.preservedOwnedCount} n1 (${res.lineEnding})`
    );
  };

  const handleToggleCommentsForSelection = () => {
    const inPreamble = isTwoPaneActive && activeLine <= splitDoc.preambleLineCount;
    const ta = inPreamble ? preambleTextareaRef.current : bodyTextareaRef.current;
    const baseOff = inPreamble ? 0 : bodyBaseCharOffset;
    let startLn = activeLine;
    let endLn = activeLine;
    if (ta) {
      const s = baseOff + (ta.selectionStart ?? 0);
      const e = baseOff + (ta.selectionEnd ?? ta.selectionStart ?? 0);
      startLn = source.slice(0, s).split('\n').length;
      endLn = source.slice(0, e).split('\n').length;
    }
    const next = toggleLineCommentsInSource(source, startLn, endLn);
    if (next !== source) {
      onChangeSource(next, `Переключение комментария % на стр. ${startLn}–${endLn} (P73)`);
    }
  };

  const handleAlignAmpersands = () => {
    const res = alignAmpersandColumnsInSource(source);
    if (res.alignedRowsCount === 0) {
      setNavNotice('В буфере не найдено многострочных таблиц с разделителем &.');
      return;
    }
    onChangeSource(res.nextSource, `Выравнивание колонок & (${res.alignedRowsCount} стр. · P73)`);
    setNavNotice(`Выровнены колонки & в ${res.alignedRowsCount} строках таблицы/матрицы.`);
  };

  const handleFindNext = () => {
    if (!findQuery) return;
    const startFrom = Math.min(source.length, caretOffset + 1);
    const hay = findCaseSensitive ? source : source.toLowerCase();
    const needle = findCaseSensitive ? findQuery : findQuery.toLowerCase();
    let foundIdx = hay.indexOf(needle, startFrom);
    if (foundIdx === -1) {
      foundIdx = hay.indexOf(needle, 0);
    }
    if (foundIdx === -1) {
      setNavNotice('Совпадений не найдено');
      return;
    }
    const foundLine = source.slice(0, foundIdx).split('\n').length;
    focusGlobalOffset(foundIdx, foundLine, foundIdx + findQuery.length);
    setNavNotice(`Найдено в строке ${foundLine} (всего ${matchCount})`);
  };

  const handleReplaceSingle = () => {
    if (!findQuery) return;
    const hay = findCaseSensitive ? source : source.toLowerCase();
    const needle = findCaseSensitive ? findQuery : findQuery.toLowerCase();
    const idx = hay.indexOf(needle);
    if (idx === -1) {
      setNavNotice('Нет совпадений для замены');
      return;
    }
    const lineStart = source.lastIndexOf('\n', idx) + 1;
    const lineEndNl = source.indexOf('\n', idx);
    const lineSlice = source.slice(lineStart, lineEndNl === -1 ? source.length : lineEndNl);
    const markerPos = lineSlice.indexOf(OWNERSHIP_MARKER);
    if (markerPos !== -1 && idx - lineStart >= markerPos) {
      setNavNotice('Пропущен служебный хвост % tikzarium:n1: — используйте «Все (n1)»');
      return;
    }
    const next = source.slice(0, idx) + replaceText + source.slice(idx + findQuery.length);
    const changedLine = source.slice(0, idx).split('\n').length;
    onChangeSource(next, `Замена «${findQuery}» → «${replaceText}» (стр. ${changedLine})`);
    onChangeActiveLine(changedLine);
    setNavNotice(`Заменено 1 вхождение в строке ${changedLine}`);
  };

  const handleReplaceAllSafe = () => {
    if (!findQuery) return;
    const res = replaceAllInTexPreservingN1(source, findQuery, replaceText, {
      caseSensitive: findCaseSensitive,
      useRegex: findUseRegex,
    });
    if (res.replacementsCount === 0) {
      setNavNotice('Совпадений вне защищённых маркеров % tikzarium:n1: не найдено');
      return;
    }
    onChangeSource(
      res.nextSource,
      `Пакетная замена «${findQuery}» → «${replaceText}» (${res.replacementsCount} шт., n1 сохранён · P70)`
    );
    setNavNotice(`Заменено вхождений: ${res.replacementsCount} (маркеры n1 сохранены без повреждений)`);
  };

  const handleSharedTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    pane: 'preamble' | 'body'
  ) => {
    if (hoverInfo) setHoverInfo(null);
    const mod = e.ctrlKey || e.metaKey;

    if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      handleQuickFormatCode();
      return;
    }
    if (!mod && !e.shiftKey && e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      setActiveEditorTab((prev) => (prev === 'preamble' ? 'body' : 'preamble'));
      return;
    }
    if (mod && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      onToggleSearchBar(true);
      return;
    }
    if (mod && e.key === '/') {
      e.preventDefault();
      handleToggleCommentsForSelection();
      return;
    }
    if (e.altKey && !mod && !e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const dir = e.key === 'ArrowUp' ? -1 : 1;
      const moved = moveLineInSource(source, activeLine, dir);
      if (moved.nextSource !== source) {
        onChangeSource(
          moved.nextSource,
          `Перемещение строки ${activeLine} → ${moved.nextLineNumber} (P73)`
        );
        jumpToPhysicalLine(moved.nextLineNumber);
      }
      return;
    }
    if (e.altKey && e.key === ']' && matchingPair) {
      e.preventDefault();
      jumpToOffset(
        matchingPair.jumpTargetOffset,
        matchingPair.jumpTargetLine,
        `Переход к парной конструкции ${matchingPair.closeLabel} (стр. ${matchingPair.jumpTargetLine})`
      );
      return;
    }
    if (mod && e.code === 'Space') {
      e.preventDefault();
      const localCaret = e.currentTarget.selectionStart ?? 0;
      const globalCaret = (pane === 'body' ? bodyBaseCharOffset : 0) + localCaret;
      refreshAutocompleteAtCaret(source, globalCaret, pane, true);
      return;
    }

    if (acMenu && acMenu.items.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAcMenu((prev) =>
          prev ? { ...prev, activeIndex: (prev.activeIndex + 1) % prev.items.length } : null
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAcMenu((prev) =>
          prev
            ? {
                ...prev,
                activeIndex: (prev.activeIndex - 1 + prev.items.length) % prev.items.length,
              }
            : null
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyAutocompleteChoice(acMenu.items[acMenu.activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setAcMenu(null);
      }
    }
  };

  const fontClass = FONT_SIZE_CLASSES[fontSizePt];

  const renderHighlightedSpans = (
    spans: ReturnType<typeof tokenizeTexLine>,
    ln: number,
    interactivePreview = false
  ) =>
    spans.map((sp, sIdx) => {
      const baseCls = TOKEN_COLOR_CLASSES[sp.kind];
      const previewEvents = interactivePreview
        ? {
            onMouseEnter: (ev: React.MouseEvent<HTMLSpanElement>) => {
              const resolved = resolveTexCommandHover(source, ln, sp.start);
              const parentRect = ev.currentTarget
                .closest('[data-editor-surface]')
                ?.getBoundingClientRect();
              if (parentRect) {
                setTooltipDock(
                  ev.clientY - parentRect.top < parentRect.height * 0.52 ? 'bottom' : 'top'
                );
              }
              setHoverInfo(resolved);
            },
          }
        : undefined;

      if (
        !hoverInfo ||
        hoverInfo.lineNumber !== ln ||
        hoverInfo.tokenEnd <= sp.start ||
        hoverInfo.tokenStart >= sp.end
      ) {
        return (
          <span key={sIdx} className={baseCls} {...previewEvents}>
            {sp.text}
          </span>
        );
      }

      const relStart = Math.max(0, hoverInfo.tokenStart - sp.start);
      const relEnd = Math.min(sp.text.length, hoverInfo.tokenEnd - sp.start);
      const before = sp.text.slice(0, relStart);
      const mid = sp.text.slice(relStart, relEnd);
      const after = sp.text.slice(relEnd);

      return (
        <span key={sIdx} className={baseCls} {...previewEvents}>
          {before}
          <span className="bg-sky-500/25 underline decoration-sky-400 decoration-2 underline-offset-2 rounded-xs">
            {mid}
          </span>
          {after}
        </span>
      );
    });

  const renderFloatingTooltip = () => {
    if (!hoverInfo || acMenu) return null;
    return (
      <div
        role="tooltip"
        data-testid="tex-command-tooltip"
        className={`absolute left-3 right-3 sm:left-auto sm:w-[376px] z-30 pointer-events-none rounded border bg-[var(--tz-panel)] shadow-lg p-3 text-xs ${
          hoverInfo.isError ? 'border-rose-500/80' : 'border-[var(--tz-accent)]'
        } ${tooltipDock === 'bottom' ? 'bottom-3' : 'top-3'}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--tz-muted)] mb-1">
          <div className="flex items-center gap-1.5">
            <span
              className={
                hoverInfo.isError ? 'text-rose-400 font-semibold' : 'text-[var(--tz-link)] font-medium'
              }
            >
              {hoverInfo.categoryRu}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Стр. {hoverInfo.lineNumber}</span>
            {hoverInfo.ownedId !== undefined && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-emerald-400">n1 #{hoverInfo.ownedId}</span>
              </>
            )}
          </div>
          {hoverInfo.manualRef &&
            (onOpenManualAnchor && hoverInfo.manualAnchorId ? (
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onOpenManualAnchor(hoverInfo.manualAnchorId!);
                }}
                className="pointer-events-auto inline-flex items-center gap-1 rounded-sm border border-[var(--tz-accent)]/50 bg-[var(--tz-inset)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--tz-link)] hover:underline"
              >
                <BookOpen className="w-2.5 h-2.5" />
                <span>{hoverInfo.manualRef}</span>
              </button>
            ) : (
              <span className="font-mono text-[10.5px] text-[var(--tz-muted)]">{hoverInfo.manualRef}</span>
            ))}
        </div>

        <div className="font-semibold text-[12.5px] text-[var(--tz-text)] mb-1">{hoverInfo.titleRu}</div>

        <div className="px-2 py-1 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] font-mono text-[11px] text-[var(--tz-syn-cmd)] overflow-x-auto whitespace-nowrap mb-1.5">
          {hoverInfo.signature}
        </div>

        <p className="text-[11.5px] text-[var(--tz-muted)] leading-snug mb-2">{hoverInfo.summaryRu}</p>

        {hoverInfo.arguments.length > 0 && (
          <div className="border-t border-[var(--tz-outline)] pt-1.5 mb-1.5 flex flex-col gap-1">
            <div className="text-[10.5px] font-medium text-[var(--tz-muted)]">
              Справка по аргументам примитива:
            </div>
            {hoverInfo.arguments.map((arg) => (
              <div
                key={arg.name}
                className="grid grid-cols-12 gap-x-2 gap-y-0.5 py-0.5 border-b border-[var(--tz-outline)]/50 last:border-b-0 text-[11px]"
              >
                <div className="col-span-5 font-mono text-[var(--tz-text)] truncate">{arg.name}</div>
                <div className="col-span-7 text-right font-mono tabular-nums truncate">
                  {arg.currentValue ? (
                    <span className="text-[var(--tz-syn-num)]">{arg.currentValue}</span>
                  ) : (
                    <span className="text-[var(--tz-muted)]">{arg.typeRu}</span>
                  )}
                </div>
                <div className="col-span-12 text-[10.5px] text-[var(--tz-muted)] leading-tight">
                  <span className="font-mono">{arg.typeRu}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{arg.constraintRu}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          className={`text-[10.5px] pt-1 border-t border-[var(--tz-outline)] ${
            hoverInfo.isError ? 'text-rose-400 font-medium' : 'text-[var(--tz-muted)]'
          }`}
        >
          {hoverInfo.dependencyNoteRu}
        </div>
      </div>
    );
  };

  const renderAutocompletePopup = () => {
    if (!acMenu || acMenu.items.length === 0) return null;
    return (
      <div
        role="listbox"
        aria-label="Автодополнение команд LaTeX и TikZ"
        data-testid="tex-autocomplete-popup"
        className="absolute left-3 right-3 sm:right-auto sm:w-[390px] bottom-3 z-40 rounded border border-[var(--tz-accent)] bg-[var(--tz-panel)] shadow-xl overflow-hidden text-xs"
      >
        <div className="px-2.5 py-1 bg-[var(--tz-window)] border-b border-[var(--tz-outline)] flex items-center justify-between text-[10.5px] text-[var(--tz-muted)]">
          <span>Автодополнение LaTeX / TikZ</span>
          <span className="font-mono">↑↓ · Enter / Tab · Esc</span>
        </div>
        <div className="max-h-48 overflow-y-auto divide-y divide-[var(--tz-outline)]/40">
          {acMenu.items.map((item, idx) => {
            const isSel = idx === acMenu.activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isSel}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  applyAutocompleteChoice(item);
                }}
                className={`w-full px-2.5 py-1.5 text-left flex flex-col gap-0.5 ${
                  isSel
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)]'
                    : 'hover:bg-[var(--tz-hover)] text-[var(--tz-muted)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-medium text-[var(--tz-syn-cmd)] truncate">
                    {item.trigger}
                  </span>
                  <span className="text-[10px] text-[var(--tz-muted)] shrink-0">{item.categoryRu}</span>
                </div>
                <div className="text-[11px] truncate">{item.detailRu}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section
      aria-label="Редактируемый исходный код TeX/TikZ (Преамбула и Код рисунка)"
      className={`flex flex-col h-full min-h-0 bg-[var(--tz-window)] border-r border-[var(--tz-outline)] ${
        highlightedZone === 'editor' ? 'ring-2 ring-inset ring-sky-500' : ''
      }`}
    >
      {/* ===================================================================== */}
      {/* UNIFIED TOP EDITOR TAB BAR: Чертёж | Шапка LaTeX | Весь .tex          */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-2 py-1 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] shrink-0">
        <div
          role="tablist"
          aria-label="Вкладки исходного кода LaTeX"
          className="inline-flex items-center p-0.5 rounded bg-[var(--tz-inset)] border border-[var(--tz-outline)] text-[11px]"
        >
          <button
            type="button"
            role="tab"
            data-testid="editor-tab-body"
            aria-selected={activeEditorTab === 'body' || !splitDoc.hasPreamble}
            onClick={() => {
              setActiveEditorTab('body');
              if (activeLine <= splitDoc.preambleLineCount) {
                onChangeActiveLine(splitDoc.bodyStartLine);
              }
            }}
            className={`px-2 py-0.5 rounded-sm font-medium whitespace-nowrap transition-colors ${
              activeEditorTab === 'body' || !splitDoc.hasPreamble
                ? 'bg-[var(--tz-active)] text-[var(--tz-text)] font-semibold'
                : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
            }`}
          >
            Чертёж
          </button>

          {splitDoc.hasPreamble && (
            <button
              type="button"
              role="tab"
              data-testid="editor-tab-preamble"
              aria-selected={activeEditorTab === 'preamble'}
              onClick={() => setActiveEditorTab('preamble')}
              title="Шапка документа LaTeX (\documentclass, \usepackage, \usetikzlibrary и паспорт пакетов)"
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-medium whitespace-nowrap transition-colors ${
                activeEditorTab === 'preamble'
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)] font-semibold'
                  : packagePassport.missingRequiredLibraries.length > 0
                    ? 'text-amber-500 hover:text-amber-400'
                    : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
              }`}
            >
              <span>Шапка</span>
              <span className="font-mono tabular-nums text-[10px] opacity-80">
                ({packagePassport.packages.length + packagePassport.libraries.length})
              </span>
            </button>
          )}

          {splitDoc.hasPreamble && (
            <button
              type="button"
              role="tab"
              data-testid="editor-tab-full"
              aria-selected={activeEditorTab === 'full'}
              onClick={() => setActiveEditorTab('full')}
              title="Показать полный файл .tex целиком от \documentclass до \end{document}"
              className={`px-2 py-0.5 rounded-sm font-medium whitespace-nowrap transition-colors ${
                activeEditorTab === 'full'
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)] font-semibold'
                  : 'text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
              }`}
            >
              Весь .tex
            </button>
          )}
        </div>

        <span className="text-[10.5px] font-mono tabular-nums text-[var(--tz-muted)] whitespace-nowrap">
          Стр. {activeLine}/{lines.length}
        </span>
      </div>

      {/* ===================================================================== */}
      {/* TAB 2 (HIDDEN BY DEFAULT): LaTeX Document Preamble & Package Passport */}
      {/* ===================================================================== */}
      {isTwoPaneActive && activeEditorTab === 'preamble' && (
        <div
          data-testid="tex-preamble-pane"
          className="flex-1 min-h-0 flex flex-col bg-[var(--tz-window)]"
        >
          <div
            data-testid="preamble-header-bar"
            className="flex flex-wrap items-center justify-between gap-1.5 px-2 py-1 bg-[var(--tz-panel)] border-b border-[var(--tz-outline)] text-[10.5px] shrink-0"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[var(--tz-muted)] font-mono tabular-nums shrink-0">
                Стр. 1–{splitDoc.preambleLineCount}
              </span>

              {onSelectFigureProfile && (
                <select
                  data-testid="preamble-figure-profile-select"
                  aria-label="Специализация атомарного рисунка и набор пакетов"
                  title="Профиль атомарного рисунка: адаптирует паспорт пакетов и палитру"
                  value={effectiveProfileId}
                  onChange={(e) => onSelectFigureProfile(e.target.value as AtomicFigureProfileId)}
                  className="max-w-[140px] truncate px-1.5 py-0.5 rounded bg-[var(--tz-inset)] text-[var(--tz-link)] border border-[var(--tz-accent)]/40 text-[10.5px] font-medium shrink"
                >
                  {ATOMIC_FIGURE_PROFILES.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.shortLabelRu}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <select
                data-testid="preamble-add-pkg-or-lib-select"
                aria-label="Подключить пакет LaTeX или библиотеку TikZ в паспорт рисунка"
                value=""
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw) return;
                  if (raw.startsWith('pkg:')) {
                    const pkg = raw.slice(4);
                    const res = togglePackageInPreamble(source, pkg, true);
                    setNavNotice(res.summaryRu);
                    if (res.ok) onChangeSource(res.nextSource, res.summaryRu);
                  } else if (raw.startsWith('lib:')) {
                    const lib = raw.slice(4);
                    const res = toggleTikzLibraryInPreamble(source, lib, true);
                    setNavNotice(res.summaryRu);
                    if (res.ok) onChangeSource(res.nextSource, res.summaryRu);
                  }
                }}
                className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] text-[var(--tz-text)] border border-[var(--tz-outline)] text-[10.5px] shrink-0"
              >
                <option value="">+Пакет / библ.</option>
                <optgroup label="Пакеты LaTeX (\usepackage)">
                  {AVAILABLE_PREAMBLE_PACKAGES.map((pkg) => {
                    const loaded = packagePassport.packages.some((p) => p.name === pkg.name);
                    return (
                      <option key={pkg.name} value={`pkg:${pkg.name}`} disabled={loaded}>
                        {loaded ? `✓ ${pkg.name}` : `+ ${pkg.name} — ${pkg.titleRu}`}
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="Библиотеки TikZ (\usetikzlibrary)">
                  {AVAILABLE_TIKZ_LIBRARIES.map((lib) => {
                    const loaded = packagePassport.libraries.some((l) => l.name === lib.name);
                    return (
                      <option key={lib.name} value={`lib:${lib.name}`} disabled={loaded}>
                        {loaded
                          ? `✓ ${lib.name}`
                          : !lib.xelatexCompatible
                            ? `⚠ ${lib.name} (LuaLaTeX)`
                            : `+ ${lib.name}`}
                      </option>
                    );
                  })}
                </optgroup>
              </select>

              <button
                type="button"
                data-testid="preamble-quick-tikzset-btn"
                onClick={() => setQuickStyleOpen((v) => !v)}
                title="Объявить пользовательский стиль \tikzset{name/.style={...}} в Преамбуле"
                className={`inline-flex items-center px-1.5 py-0.5 rounded border font-mono text-[10px] whitespace-nowrap ${
                  quickStyleOpen
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                    : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
                }`}
              >
                <span>+\tikzset</span>
              </button>

              <button
                type="button"
                data-testid="preamble-clean-unused-btn"
                onClick={() => {
                  const cleaned = cleanPreambleAndUnusedLibraries(source, {
                    removeUnusedLibraries: true,
                  });
                  if (cleaned.nextSource !== source) {
                    onChangeSource(
                      cleaned.nextSource,
                      `Оптимизация преамбулы: удалено ${cleaned.removedLibraries.length} неиспользуемых библиотек`
                    );
                    setNavNotice(
                      cleaned.removedLibraries.length > 0
                        ? `Удалены неиспользуемые библиотеки: ${cleaned.removedLibraries.join(', ')}`
                        : 'Строки \\usetikzlibrary объединены и отсортированы.'
                    );
                  } else {
                    setNavNotice('Преамбула уже минимальна — лишних библиотек нет.');
                  }
                }}
                title="Объединить \usetikzlibrary и убрать неиспользуемые данным рисунком библиотеки"
                className={`px-1.5 py-0.5 rounded border text-[10px] whitespace-nowrap ${
                  packagePassport.unusedLibraries.length > 0
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 hover:bg-amber-500/20 font-medium'
                    : 'bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
                }`}
              >
                {packagePassport.unusedLibraries.length > 0
                  ? `Чистка (${packagePassport.unusedLibraries.length})`
                  : 'Чистка'}
              </button>
            </div>
          </div>

          {/* Interactive Atomic Figure Package & Library Passport Bar */}
          <div
            data-testid="preamble-package-passport"
            className="flex flex-wrap items-center gap-1 px-2.5 py-1.5 bg-[var(--tz-window)] border-b border-[var(--tz-outline)] text-[10.5px] font-mono shrink-0"
          >
            <span className="text-[var(--tz-muted)] shrink-0">
              {packagePassport.docClass} ·
            </span>

            {packagePassport.packages.map((pkg) =>
              pkg.isCoreLocked ? (
                <span
                  key={`pkg-${pkg.name}`}
                  title={pkg.statusNoteRu}
                  className="text-[var(--tz-muted)]"
                >
                  {pkg.name}
                </span>
              ) : (
                <button
                  key={`pkg-${pkg.name}`}
                  type="button"
                  data-testid={`passport-pkg-${pkg.name}`}
                  onClick={() => {
                    const res = togglePackageInPreamble(source, pkg.name, false);
                    setNavNotice(res.summaryRu);
                    if (res.ok) onChangeSource(res.nextSource, res.summaryRu);
                  }}
                  title={`${pkg.statusNoteRu} · Нажмите, чтобы отключить пакет \\usepackage{${pkg.name}}`}
                  className="px-1.5 py-0.2 rounded bg-[var(--tz-button)] hover:bg-rose-500/15 text-[var(--tz-link)] hover:text-rose-400 border border-[var(--tz-outline)] transition-colors"
                >
                  {pkg.name} ×
                </button>
              )
            )}

            {packagePassport.libraries.length > 0 && (
              <span className="text-[var(--tz-muted)]" aria-hidden="true">
                /
              </span>
            )}

            {packagePassport.libraries.map((lib) => (
              <button
                key={`lib-${lib.name}`}
                type="button"
                data-testid={`passport-lib-${lib.name}`}
                onClick={() => {
                  const res = toggleTikzLibraryInPreamble(source, lib.name, false);
                  setNavNotice(res.summaryRu);
                  if (res.ok) onChangeSource(res.nextSource, res.summaryRu);
                }}
                title={`${lib.titleRu}${
                  lib.dependentPrimitiveCount > 0
                    ? ` · Используется объектами n1: ${lib.dependentPrimitiveCount} шт.`
                    : !lib.usedInBody
                      ? ' · Не используется в коде рисунка (кликните для удаления)'
                      : ' · Кликните для отключения'
                }`}
                className={`px-1.5 py-0.2 rounded border transition-colors ${
                  !lib.xelatexCompatible
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                    : !lib.usedInBody
                      ? 'bg-[var(--tz-inset)] text-[var(--tz-muted)] hover:text-rose-400 border-dashed border-[var(--tz-outline)]'
                      : 'bg-[var(--tz-button)] text-[var(--tz-text)] hover:border-rose-500/50 border-[var(--tz-outline)]'
                }`}
              >
                {lib.name}
                {lib.dependentPrimitiveCount > 0 ? `(${lib.dependentPrimitiveCount})` : ' ×'}
              </button>
            ))}

            {packagePassport.missingRequiredLibraries.map((miss) => (
              <button
                key={`miss-${miss.name}`}
                type="button"
                data-testid={`passport-connect-missing-${miss.name}`}
                onClick={() => {
                  const plan = proposeLibraryConnect(source, miss.name);
                  if (plan.ok) {
                    onChangeSource(plan.nextSource, `Подключена требуемая библиотека ${miss.name}`);
                    setNavNotice(`Доподключена библиотека ${miss.name}`);
                  }
                }}
                title={miss.reasonRu}
                className="px-1.5 py-0.2 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/50 font-medium"
              >
                +{miss.name}
              </button>
            ))}
          </div>

          {quickStyleOpen && (
            <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 bg-[var(--tz-inset)] border-b border-[var(--tz-outline)] text-[11px] shrink-0">
              <input
                type="text"
                value={quickStyleName}
                onChange={(e) => setQuickStyleName(e.target.value)}
                placeholder="Имя стиля"
                aria-label="Имя стиля в преамбуле"
                className="w-28 px-1.5 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
              />
              <input
                type="text"
                value={quickStyleDef}
                onChange={(e) => setQuickStyleDef(e.target.value)}
                placeholder="thick,draw=blue!75!black,fill=blue!8"
                aria-label="Опции стиля в преамбуле"
                className="flex-1 min-w-[160px] px-1.5 py-0.5 rounded bg-[var(--tz-window)] border border-[var(--tz-outline)] font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  const res = upsertQuickTikzsetStyleInPreamble(
                    source,
                    quickStyleName,
                    quickStyleDef
                  );
                  onChangeSource(res.nextSource, res.summaryRu);
                  setNavNotice(res.summaryRu);
                  setQuickStyleOpen(false);
                }}
                className="px-2 py-0.5 rounded bg-[var(--tz-accent)] text-white font-medium"
              >
                Добавить
              </button>
            </div>
          )}

          {/* Full-Height Editable Preamble Buffer */}
          <div className="flex-1 min-h-0 flex relative overflow-hidden bg-[var(--tz-inset)]">
            <div
              ref={preambleGutterRef}
              aria-hidden="true"
              className={`w-11 shrink-0 overflow-hidden select-none py-2 px-1.5 text-right font-mono tabular-nums border-r border-[var(--tz-outline)] bg-[var(--tz-panel)] ${fontClass}`}
            >
              {preambleLines.map((_, idx) => {
                const ln = idx + 1;
                const diag = errorLines.get(ln);
                const isCurrent = ln === activeLine;
                return (
                  <div
                    key={ln}
                    onClick={() => jumpToPhysicalLine(ln)}
                    className={`cursor-pointer pr-1 ${
                      diag?.severity === 'error'
                        ? 'text-rose-500 font-bold'
                        : diag?.severity === 'warning'
                          ? 'text-amber-500 font-semibold'
                          : isCurrent
                            ? 'text-[var(--tz-link)] font-semibold'
                            : 'text-[var(--tz-muted)]'
                    }`}
                  >
                    {diag ? '!' : ''}
                    {ln}
                  </div>
                );
              })}
            </div>

            <div className="flex-1 min-w-0 relative overflow-hidden">
              <div
                ref={preambleBackdropRef}
                aria-hidden="true"
                className={`absolute inset-0 overflow-hidden py-2 px-3 font-mono pointer-events-none ${fontClass} ${
                  softWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                }`}
              >
                {preambleLines.map((line, idx) => {
                  const ln = idx + 1;
                  const spans = tokenizeTexLine(line);
                  const diag = errorLines.get(ln);
                  return (
                    <div
                      key={ln}
                      className={`min-h-[1em] ${ln === activeLine ? 'bg-[var(--tz-line-active)]' : ''} ${
                        diag?.severity === 'error'
                          ? 'bg-rose-500/10 underline decoration-wavy decoration-rose-500'
                          : ''
                      }`}
                    >
                      {spans.length === 0 ? '\u200b' : renderHighlightedSpans(spans, ln, false)}
                    </div>
                  );
                })}
              </div>

              <textarea
                ref={preambleTextareaRef}
                data-testid="tex-preamble-textarea"
                value={splitDoc.preambleText}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                aria-label={`Преамбула документа TeX (${filename}, стр. 1–${splitDoc.preambleLineCount})`}
                wrap={softWrap ? 'soft' : 'off'}
                onScroll={syncPreambleScroll}
                onClick={() => {
                  updateCaretFromPane('preamble');
                  setAcMenu(null);
                }}
                onKeyUp={() => updateCaretFromPane('preamble')}
                onKeyDown={(e) => handleSharedTextareaKeyDown(e, 'preamble')}
                onMouseMove={handlePreambleTextareaMouseMove}
                onMouseLeave={() => {
                  if (hoverInfo) setHoverInfo(null);
                }}
                onChange={(e) => {
                  const nextPreamble = e.target.value;
                  const localCaret = e.target.selectionStart ?? 0;
                  const fullNext = joinPreambleAndBodyToSource(
                    nextPreamble,
                    splitDoc.bodyText,
                    splitDoc.lineEnding
                  );
                  setCaretOffset(localCaret);
                  onChangeSource(fullNext, 'Правка преамбулы документа .tex');
                  refreshAutocompleteAtCaret(fullNext, localCaret, 'preamble', false);
                }}
                className={`relative z-10 w-full h-full overflow-auto py-2 px-3 font-mono bg-transparent text-transparent caret-[var(--tz-text)] resize-none focus:outline-none ${fontClass} ${
                  softWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1 (DEFAULT, 100% HEIGHT) & TAB 3: Figure Code / Full .tex Buffer  */}
      {/* ===================================================================== */}
      {activeEditorTab !== 'preamble' && (
      <div
        data-testid="tex-figure-body-pane"
        className="flex-1 min-h-0 flex flex-col bg-[var(--tz-window)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-1 px-2 py-1 bg-[var(--tz-window)] border-b border-[var(--tz-outline)] relative">
          <div className="flex items-center gap-1.5 min-w-0 text-[11px] text-[var(--tz-muted)] font-mono tabular-nums">
            <span className="truncate text-[var(--tz-text)]">
              {isTwoPaneActive ? '\\begin{tikzpicture}' : filename}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {activeNumericToken && (
              <div
                data-testid="tex-number-scrubber"
                title="Живой скруббер числа на текущей строке (Alt+Колесо в коде)"
                className="inline-flex items-center rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] font-mono tabular-nums text-[11px] shrink-0"
              >
                <button
                  type="button"
                  aria-label={`Уменьшить число ${activeNumericToken.rawToken}`}
                  onClick={(e) => handleScrubActiveNumber(-1, e.shiftKey)}
                  className="px-1.5 py-0.5 hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border-r border-[var(--tz-outline)]"
                >
                  −
                </button>
                <span className="px-1.5 py-0.5 text-[var(--tz-syn-num)]">
                  {activeNumericToken.rawToken}
                </span>
                <button
                  type="button"
                  aria-label={`Увеличить число ${activeNumericToken.rawToken}`}
                  onClick={(e) => handleScrubActiveNumber(1, e.shiftKey)}
                  className="px-1.5 py-0.5 hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border-l border-[var(--tz-outline)]"
                >
                  +
                </button>
              </div>
            )}

            {activeLineAdoptable ? (
              <button
                type="button"
                onClick={() => onAdoptRawLine(activeLineAdoptable.lineNumber)}
                title="Превратить ручную строку TikZ в интерактивный примитив холста n1"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30 whitespace-nowrap shrink-0"
              >
                <Wand2 className="w-3 h-3" />
                <span>+Взять стр.{activeLineAdoptable.lineNumber}</span>
              </button>
            ) : adoptableLines.length > 0 ? (
              <button
                type="button"
                onClick={onAdoptAllRawLines}
                title="Привязать все распознанные ручные команды TikZ к холсту n1"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium rounded bg-emerald-600/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/25 whitespace-nowrap shrink-0"
              >
                <Wand2 className="w-3 h-3" />
                <span>+Взять ({adoptableLines.length})</span>
              </button>
            ) : null}

            <button
              type="button"
              data-testid="editor-autoformat-btn"
              onClick={handleQuickFormatCode}
              title="AST-безопасное автоформатирование кода LaTeX/TikZ без потери % tikzarium:n1: (Shift+Alt+F)"
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap shrink-0"
            >
              <WandSparkles className="w-3 h-3 text-[var(--tz-link)]" />
              <span>Формат</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleSearchBar(!searchBarOpen)}
              aria-expanded={searchBarOpen}
              title="Поиск, пакетная замена без поломки n1 и переход к физической строке (Ctrl+H)"
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                searchBarOpen
                  ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                  : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
              }`}
            >
              <Search className="w-3 h-3" />
              <span>Поиск</span>
            </button>

            {metaStats.ownedCount > 0 && (
              <button
                type="button"
                data-testid="toggle-compact-meta-btn"
                onClick={() => setCompactMetaPreview((v) => !v)}
                aria-pressed={compactMetaPreview}
                title="Визуально свернуть длинные hex-хвосты % tikzarium:n1: в окне кода рисунка (клик по строке открывает правку)"
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                  compactMetaPreview
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                    : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
                }`}
              >
                {compactMetaPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{compactMetaPreview ? 'Hex скрыт' : 'Скрыть hex'}</span>
              </button>
            )}

            {/* Overflow "Код ▾" Menu housing secondary editor utilities */}
            <div ref={moreMenuContainerRef} className="relative">
              <button
                type="button"
                data-testid="editor-more-tools-btn"
                aria-expanded={moreMenuOpen}
                onClick={() => setMoreMenuOpen((v) => !v)}
                title="Дополнительные инструменты редактора: режим 2 окна/единый, структура, комментарии %, таблицы &, перенос, кегль"
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border whitespace-nowrap shrink-0 ${
                  moreMenuOpen || outlineOpen
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                    : 'bg-[var(--tz-button)] text-[var(--tz-muted)] hover:text-[var(--tz-text)] border-[var(--tz-outline)]'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Код ▾</span>
              </button>

              {moreMenuOpen && (
                <div
                  data-testid="editor-more-tools-popover"
                  className="absolute right-0 top-full mt-1 w-64 z-40 rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] shadow-xl p-2 text-xs space-y-1.5"
                >
                  {splitDoc.hasPreamble && (
                    <button
                      type="button"
                      data-testid="toggle-split-buffer-mode-btn"
                      onClick={() => {
                        setActiveEditorTab((m) => (m === 'full' ? 'body' : 'full'));
                        setMoreMenuOpen(false);
                      }}
                      className="w-full px-2 py-1 rounded text-left bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] flex items-center justify-between"
                    >
                      <span>Режим буфера:</span>
                      <span className="font-mono text-[11px] text-[var(--tz-link)]">
                        {activeEditorTab === 'full' ? 'Весь файл .tex' : 'Вкладки (Чертёж / Шапка)'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid="toggle-outline-btn"
                    onClick={() => {
                      setOutlineOpen((v) => !v);
                      setMoreMenuOpen(false);
                    }}
                    className="w-full px-2 py-1 rounded text-left hover:bg-[var(--tz-hover)] flex items-center justify-between"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <ListTree className="w-3.5 h-3.5 text-[var(--tz-link)]" />
                      <span>Структура .tex</span>
                    </span>
                    <span className="font-mono tabular-nums text-[var(--tz-muted)]">
                      {documentOutline.length}
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      data-testid="editor-toggle-comment-btn"
                      onClick={() => {
                        handleToggleCommentsForSelection();
                        setMoreMenuOpen(false);
                      }}
                      className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] text-[11px] font-mono"
                    >
                      % Коммент (Ctrl+/)
                    </button>
                    <button
                      type="button"
                      data-testid="editor-align-ampersand-btn"
                      onClick={() => {
                        handleAlignAmpersands();
                        setMoreMenuOpen(false);
                      }}
                      className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] border border-[var(--tz-outline)] text-[11px] font-mono"
                    >
                      &amp; Выровн. табл.
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--tz-outline)]">
                    <button
                      type="button"
                      onClick={onToggleSoftWrap}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] ${
                        softWrap
                          ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                          : 'bg-[var(--tz-button)] text-[var(--tz-muted)] border-[var(--tz-outline)]'
                      }`}
                    >
                      <WrapText className="w-3 h-3" />
                      <span>Перенос</span>
                    </button>

                    <select
                      aria-label="Размер шрифта кода (12–24 pt)"
                      value={fontSizePt}
                      onChange={(e) =>
                        onChangeFontSizePt(Number(e.target.value) as 12 | 14 | 16 | 18 | 20 | 24)
                      }
                      className="px-2 py-1 text-[11px] font-mono rounded bg-[var(--tz-button)] text-[var(--tz-text)] border border-[var(--tz-outline)]"
                    >
                      {[12, 14, 16, 18, 20, 24].map((pt) => (
                        <option key={pt} value={pt}>
                          Кегль {pt}pt
                        </option>
                      ))}
                    </select>
                  </div>

                  {onOpenFormatterModal && (
                    <button
                      type="button"
                      data-testid="open-formatter-modal-btn"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        onOpenFormatterModal();
                      }}
                      className="w-full px-2 py-1.5 rounded bg-[var(--tz-accent)] text-white text-center font-medium text-[11.5px]"
                    >
                      Рефакторинг, единицы и SVG…
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Document Outline Strip */}
        {outlineOpen && (
          <div
            data-testid="tex-outline-strip"
            aria-label="Структура документа LaTeX и TikZ"
            className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-[var(--tz-inset)] border-b border-[var(--tz-outline)] text-[11px]"
          >
            <span className="text-[var(--tz-muted)] font-medium mr-1">Разделы:</span>
            {documentOutline.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => jumpToPhysicalLine(item.lineNumber)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono tabular-nums transition-colors ${
                  item.hasError
                    ? 'border-rose-500/60 bg-rose-500/15 text-rose-300'
                    : activeLine === item.lineNumber
                      ? 'border-[var(--tz-accent)] bg-[var(--tz-active)] text-[var(--tz-text)]'
                      : 'border-[var(--tz-outline)] bg-[var(--tz-window)] text-[var(--tz-muted)] hover:text-[var(--tz-text)]'
                }`}
              >
                <span className="font-sans text-[10px] opacity-80">{item.badgeRu}:</span>
                <span>{item.label}</span>
                <span className="opacity-65">:{item.lineNumber}</span>
              </button>
            ))}
          </div>
        )}

        {/* Collapsible Find / Replace / Go to Physical Line Bar */}
        {searchBarOpen && (
          <div
            className={`grid grid-cols-1 xl:grid-cols-12 gap-2 px-3 py-2 bg-[var(--tz-inset)] border-b border-[var(--tz-outline)] text-xs ${
              highlightedZone === 'search' ? 'ring-2 ring-inset ring-sky-500' : ''
            }`}
          >
            <div className="xl:col-span-5 flex items-center gap-1">
              <input
                type="text"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder="Найти в .tex…"
                aria-label="Строка поиска в исходном коде"
                className="flex-1 min-w-0 px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono text-xs"
              />
              <button
                type="button"
                aria-pressed={findCaseSensitive}
                onClick={() => setFindCaseSensitive((v) => !v)}
                title="Учитывать регистр символов (Aa)"
                className={`px-1.5 py-1 rounded border font-mono text-[11px] shrink-0 ${
                  findCaseSensitive
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                    : 'bg-[var(--tz-button)] text-[var(--tz-muted)] border-[var(--tz-outline)]'
                }`}
              >
                Aa
              </button>
              <button
                type="button"
                aria-pressed={findUseRegex}
                onClick={() => setFindUseRegex((v) => !v)}
                title="Регулярное выражение RegExp (.*)"
                className={`px-1.5 py-1 rounded border font-mono text-[11px] shrink-0 ${
                  findUseRegex
                    ? 'bg-[var(--tz-active)] text-[var(--tz-text)] border-[var(--tz-accent)]'
                    : 'bg-[var(--tz-button)] text-[var(--tz-muted)] border-[var(--tz-outline)]'
                }`}
              >
                .*
              </button>
              <button
                type="button"
                onClick={handleFindNext}
                className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap shrink-0"
              >
                Найти ({matchCount})
              </button>
            </div>

            <div className="xl:col-span-4 flex items-center gap-1">
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Заменить на…"
                aria-label="Текст замены"
                className="flex-1 min-w-0 px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleReplaceSingle}
                disabled={!findQuery}
                className="px-2 py-1 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] disabled:opacity-45 text-[var(--tz-text)] border border-[var(--tz-outline)] whitespace-nowrap shrink-0"
              >
                Зам.1
              </button>
              <button
                type="button"
                data-testid="editor-replace-all-btn"
                onClick={handleReplaceAllSafe}
                disabled={!findQuery}
                title="Пакетная замена всех совпадений без повреждения % tikzarium:n1:"
                className="px-2 py-1 rounded bg-[var(--tz-accent)] text-white disabled:opacity-45 whitespace-nowrap shrink-0"
              >
                Все (n1)
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const num = parseInt(goToLineInput, 10);
                if (!Number.isNaN(num)) jumpToPhysicalLine(num);
              }}
              className="xl:col-span-3 flex items-center gap-1.5"
            >
              <input
                type="number"
                min={1}
                max={lines.length}
                value={goToLineInput}
                onChange={(e) => setGoToLineInput(e.target.value)}
                placeholder={`Строка 1–${lines.length}`}
                aria-label="Перейти к номеру физической строки"
                className="w-24 flex-1 min-w-0 px-2 py-1 rounded bg-[var(--tz-window)] text-[var(--tz-text)] border border-[var(--tz-outline)] font-mono tabular-nums text-xs"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--tz-accent)] text-white hover:opacity-95 whitespace-nowrap shrink-0"
              >
                <CornerDownLeft className="w-3 h-3" />
                <span>К строке</span>
              </button>
            </form>

            {navNotice && (
              <div className="xl:col-span-12 text-[11px] text-[var(--tz-muted)] font-mono">{navNotice}</div>
            )}
          </div>
        )}

        {/* Figure Code Surface (Compact Hex-Hidden View OR Live Editable Textarea) */}
        {compactMetaPreview ? (
          <div
            data-editor-surface="structured"
            onMouseLeave={() => {
              setHoverInfo(null);
              onHoverPrimitive(null);
            }}
            onClick={() => {
              setCompactMetaPreview(false);
              requestAnimationFrame(() => {
                bodyTextareaRef.current?.focus();
              });
            }}
            title="Кликните любую строку для прямого редактирования кода рисунка"
            className="flex-1 min-h-0 relative overflow-hidden flex bg-[var(--tz-inset)] cursor-text"
          >
            {/* Physical Line Gutter matching Textarea mode (windowed for large files) */}
            <div
              aria-hidden="true"
              className={`w-11 shrink-0 overflow-hidden select-none py-2.5 px-1.5 text-right font-mono tabular-nums border-r border-[var(--tz-outline)] bg-[var(--tz-panel)] ${fontClass}`}
            >
              {visibleBodySlice.map((_, i) => {
                const ln = bodyBaseLineNumber + effectiveWindowStart + i;
                const diag = errorLines.get(ln);
                const ownedOnLine = ownedByLine.get(ln);
                const adoptOnLine = adoptableByLine.get(ln);
                const isCurrent = ln === activeLine;
                const isCanvasHov = Boolean(ownedOnLine && ownedOnLine.id === hoveredPrimitiveId);
                return (
                  <div
                    key={ln}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (adoptOnLine) {
                        onAdoptRawLine(ln);
                      } else {
                        jumpToPhysicalLine(ln);
                      }
                    }}
                    className={`cursor-pointer pr-1 ${
                      diag?.severity === 'error'
                        ? 'text-rose-500 font-bold'
                        : diag?.severity === 'warning'
                          ? 'text-amber-500 font-semibold'
                          : isCanvasHov
                            ? 'text-sky-400 font-bold'
                            : adoptOnLine
                              ? 'text-emerald-400 font-medium'
                              : isCurrent
                                ? 'text-[var(--tz-link)] font-semibold'
                                : 'text-[var(--tz-muted)]'
                    }`}
                  >
                    {diag ? '!' : adoptOnLine ? '+' : ''}
                    {ln}
                  </div>
                );
              })}
            </div>

            {/* Clean Folded TikZ Lines */}
            <div className={`flex-1 min-w-0 overflow-auto py-2.5 px-3 font-mono ${fontClass}`}>
              {isBodyVirtualized && (
                <div
                  onClick={(ev) => ev.stopPropagation()}
                  className="mb-1.5 px-2 py-1 rounded bg-[var(--tz-panel)] border border-[var(--tz-outline)] flex items-center justify-between gap-2 text-[10.5px] font-sans text-[var(--tz-muted)] tabular-nums"
                >
                  <span>
                    Окно виртуализации (U-G3): стр. {bodyBaseLineNumber + effectiveWindowStart}–
                    {bodyBaseLineNumber + effectiveWindowStart + visibleBodySlice.length - 1} из{' '}
                    {lines.length}
                  </span>
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      disabled={effectiveWindowStart <= 0}
                      onClick={() =>
                        setVirtualWindowStart((s) => Math.max(0, s - 120))
                      }
                      className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] disabled:opacity-40 text-[var(--tz-text)] border border-[var(--tz-outline)]"
                    >
                      ↑ Пред. 120
                    </button>
                    <button
                      type="button"
                      disabled={effectiveWindowStart + VIRTUAL_WINDOW_SIZE >= bodyLines.length}
                      onClick={() =>
                        setVirtualWindowStart((s) =>
                          Math.min(bodyLines.length - VIRTUAL_WINDOW_SIZE, s + 120)
                        )
                      }
                      className="px-1.5 py-0.5 rounded bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] disabled:opacity-40 text-[var(--tz-text)] border border-[var(--tz-outline)]"
                    >
                      ↓ След. 120
                    </button>
                  </div>
                </div>
              )}
              {visibleBodySlice.map((line, i) => {
                const ln = bodyBaseLineNumber + effectiveWindowStart + i;
                const diag = errorLines.get(ln);
                const ownedOnLine = ownedByLine.get(ln);
                const adoptOnLine = adoptableByLine.get(ln);
                const isCanvasHoveredLine = Boolean(
                  ownedOnLine && ownedOnLine.id === hoveredPrimitiveId
                );
                const markerIdx = line.indexOf(OWNERSHIP_MARKER);
                const displayPart = markerIdx !== -1 ? line.slice(0, markerIdx).trimEnd() : line;
                const spans = tokenizeTexLine(displayPart);

                return (
                  <div
                    key={ln}
                    onMouseEnter={() => onHoverPrimitive(ownedOnLine ? ownedOnLine.id : null)}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      jumpToPhysicalLine(ln);
                    }}
                    className={`min-h-[1em] w-max min-w-full flex items-baseline gap-2 rounded-sm px-0.5 hover:bg-[var(--tz-hover)] ${
                      isCanvasHoveredLine
                        ? 'bg-sky-500/20'
                        : ln === activeLine
                          ? 'bg-[var(--tz-line-active)]'
                          : ''
                    } ${diag ? 'underline decoration-wavy decoration-rose-500' : ''}`}
                  >
                    <span className={softWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}>
                      {spans.length === 0 ? '\u200b' : renderHighlightedSpans(spans, ln, true)}
                      {markerIdx !== -1 && (
                        <span className="ml-2 text-[10.5px] text-[var(--tz-syn-meta)] opacity-65">
                          % [n1 #{ownedOnLine?.id ?? ''}]
                        </span>
                      )}
                    </span>
                    {adoptOnLine && (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onAdoptRawLine(ln);
                        }}
                        className="px-1.5 py-0 text-[10px] font-sans rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0"
                      >
                        +Привязать
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {renderFloatingTooltip()}
          </div>
        ) : (
          <div
            data-editor-surface="textarea"
            className="flex-1 min-h-0 flex relative overflow-hidden bg-[var(--tz-inset)]"
          >
            {/* Physical Line Gutter starting at bodyBaseLineNumber */}
            <div
              ref={bodyGutterRef}
              aria-hidden="true"
              className={`w-11 shrink-0 overflow-hidden select-none py-2.5 px-1.5 text-right font-mono tabular-nums border-r border-[var(--tz-outline)] bg-[var(--tz-panel)] ${fontClass}`}
            >
              {bodyLines.map((_, idx) => {
                const ln = bodyBaseLineNumber + idx;
                const diag = errorLines.get(ln);
                const ownedOnLine = ownedByLine.get(ln);
                const adoptOnLine = adoptableByLine.get(ln);
                const isCurrent = ln === activeLine;
                const isCanvasHov = Boolean(ownedOnLine && ownedOnLine.id === hoveredPrimitiveId);
                return (
                  <div
                    key={ln}
                    onClick={() => {
                      if (adoptOnLine) {
                        onAdoptRawLine(ln);
                      } else {
                        jumpToPhysicalLine(ln);
                      }
                    }}
                    title={
                      adoptOnLine ? `Нажмите, чтобы привязать строку ${ln} к холсту n1` : undefined
                    }
                    className={`cursor-pointer pr-1 ${
                      diag?.severity === 'error'
                        ? 'text-rose-500 font-bold'
                        : diag?.severity === 'warning'
                          ? 'text-amber-500 font-semibold'
                          : isCanvasHov
                            ? 'text-sky-400 font-bold'
                            : adoptOnLine
                              ? 'text-emerald-400 font-medium'
                              : isCurrent
                                ? 'text-[var(--tz-link)] font-semibold'
                                : 'text-[var(--tz-muted)]'
                    }`}
                  >
                    {diag ? '!' : adoptOnLine ? '+' : ''}
                    {ln}
                  </div>
                );
              })}
            </div>

            {/* Synchronized Syntax Backdrop + Editable Figure Body Textarea */}
            <div className="flex-1 min-w-0 relative overflow-hidden">
              <span
                ref={rulerRef}
                aria-hidden="true"
                className={`invisible absolute top-0 left-0 pointer-events-none select-none font-mono whitespace-pre ${fontClass}`}
              >
                0000000000
              </span>

              <div
                ref={bodyBackdropRef}
                aria-hidden="true"
                className={`absolute inset-0 overflow-hidden py-2.5 px-3 font-mono pointer-events-none ${fontClass} ${
                  softWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                }`}
              >
                {bodyLines.map((line, idx) => {
                  const ln = bodyBaseLineNumber + idx;
                  const spans = tokenizeTexLine(line);
                  const diag = errorLines.get(ln);
                  const ownedOnLine = ownedByLine.get(ln);
                  const isCanvasHov = Boolean(ownedOnLine && ownedOnLine.id === hoveredPrimitiveId);
                  return (
                    <div
                      key={ln}
                      className={`min-h-[1em] ${
                        isCanvasHov
                          ? 'bg-sky-500/20'
                          : ln === activeLine
                            ? 'bg-[var(--tz-line-active)]'
                            : ''
                      } ${
                        diag?.severity === 'error'
                          ? 'bg-rose-500/10 underline decoration-wavy decoration-rose-500'
                          : ''
                      }`}
                    >
                      {spans.length === 0 ? '\u200b' : renderHighlightedSpans(spans, ln, false)}
                    </div>
                  );
                })}
              </div>

              <textarea
                ref={bodyTextareaRef}
                data-testid="tex-body-textarea"
                value={isTwoPaneActive ? splitDoc.bodyText : source}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                aria-label={
                  isTwoPaneActive
                    ? `Код рисунка TeX/TikZ файла ${filename} (стр. ${splitDoc.bodyStartLine}–${lines.length})`
                    : `Исходный код TeX файла ${filename}`
                }
                wrap={softWrap ? 'soft' : 'off'}
                onScroll={syncBodyScroll}
                onWheel={(e) => {
                  if (e.altKey) {
                    e.preventDefault();
                    handleScrubActiveNumber(e.deltaY < 0 ? 1 : -1, e.shiftKey);
                  }
                }}
                onClick={() => {
                  updateCaretFromPane('body');
                  setAcMenu(null);
                  if (moreMenuOpen) setMoreMenuOpen(false);
                }}
                onKeyUp={() => updateCaretFromPane('body')}
                onKeyDown={(e) => handleSharedTextareaKeyDown(e, 'body')}
                onMouseMove={handleBodyTextareaMouseMove}
                onMouseLeave={() => {
                  if (hoverInfo) setHoverInfo(null);
                  onHoverPrimitive(null);
                }}
                onChange={(e) => {
                  const rawEdited = e.target.value;
                  const localCaret = e.target.selectionStart ?? 0;
                  if (isTwoPaneActive) {
                    const fullNext = joinPreambleAndBodyToSource(
                      splitDoc.preambleText,
                      rawEdited,
                      splitDoc.lineEnding
                    );
                    const globalCaret = splitDoc.bodyStartCharOffset + localCaret;
                    setCaretOffset(globalCaret);
                    onChangeSource(fullNext, 'Ручная правка кода рисунка .tex');
                    refreshAutocompleteAtCaret(fullNext, globalCaret, 'body', false);
                  } else {
                    const preserved =
                      lineEndingLabel === 'CRLF' && !rawEdited.includes('\r\n')
                        ? rawEdited.replace(/\n/g, '\r\n')
                        : rawEdited;
                    setCaretOffset(localCaret);
                    onChangeSource(preserved, 'Ручная правка исходного кода .tex');
                    refreshAutocompleteAtCaret(rawEdited, localCaret, 'body', false);
                  }
                }}
                className={`relative z-10 w-full h-full overflow-auto py-2.5 px-3 font-mono bg-transparent text-transparent caret-[var(--tz-text)] resize-none focus:outline-none ${fontClass} ${
                  softWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                }`}
              />

              {renderAutocompletePopup()}
              {renderFloatingTooltip()}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Live Caret Syntax & Direct PDF Manual Anchor Bar */}
      <div
        data-testid="caret-syntax-pdf-bar"
        className="flex items-center justify-between gap-2 px-2.5 py-1 text-[11px] bg-[var(--tz-inset)] border-t border-[var(--tz-outline)] shrink-0"
      >
        {caretHelp ? (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono font-semibold text-[var(--tz-syn-cmd)] shrink-0">
                {caretHelp.hoveredToken}
              </span>
              <span className="text-[var(--tz-muted)]" aria-hidden="true">·</span>
              <span className="truncate text-[var(--tz-text)]" title={caretHelp.summaryRu}>
                {caretHelp.titleRu}
              </span>
            </div>
            {onOpenManualAnchor && caretHelp.manualAnchorId && (
              <button
                type="button"
                data-testid="caret-open-pdf-anchor-btn"
                onClick={() => onOpenManualAnchor(caretHelp.manualAnchorId!)}
                title="Открыть точную страницу и выделенную область команды в оригинальном PDF-мануале (Shift+F1)"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-accent)]/45 font-mono tabular-nums text-[10px] whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-3 h-3" />
                <span>
                  PDF: {caretHelp.manualDocFile ?? 'manual'} · стр. {caretHelp.manualPage ?? 1} · Shift+F1
                </span>
              </button>
            )}
          </>
        ) : (
          <>
            <span className="text-[10.5px] text-[var(--tz-muted)] truncate">
              Поставьте курсор на команду TikZ или пакета расширения — появится сигнатура и прямая точка в PDF
            </span>
            {onOpenManualAnchor && (
              <button
                type="button"
                onClick={() => onOpenManualAnchor('pgf.env.tikzpicture')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[var(--tz-button)] hover:bg-[var(--tz-hover)] text-[var(--tz-link)] border border-[var(--tz-outline)] font-mono text-[10px] whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-3 h-3" />
                <span>PDF-мануал (Shift+F1)</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Compact Single-Row Author Status Bar (Zero Telemetry Noise) */}
      <div
        data-testid="editor-status-footer"
        className="flex items-center justify-between gap-2 px-2.5 py-1 text-[10.5px] font-mono tabular-nums text-[var(--tz-muted)] bg-[var(--tz-panel)] border-t border-[var(--tz-outline)] overflow-x-auto whitespace-nowrap shrink-0"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-[var(--tz-text)]">{filename}</span>
          <span aria-hidden="true">·</span>
          <span>{lines.length} стр.</span>
          <span aria-hidden="true">·</span>
          <span>{lineEndingLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{byteCount} Б</span>
          <span aria-hidden="true">·</span>
          <span>Объектов: {metaStats.ownedCount}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {matchingPair ? (
            <button
              type="button"
              data-testid="jump-matching-pair-btn"
              onClick={() =>
                jumpToOffset(
                  matchingPair.jumpTargetOffset,
                  matchingPair.jumpTargetLine,
                  `Переход к парной конструкции на стр. ${matchingPair.jumpTargetLine}`
                )
              }
              title="Перейти к парной скобке или окружению \begin…\end (Alt+])"
              className="inline-flex items-center gap-1 text-[var(--tz-link)] hover:underline"
            >
              <Braces className="w-3 h-3" />
              <span>
                {matchingPair.openLabel}…{matchingPair.closeLabel} ({matchingPair.openLine}↔
                {matchingPair.closeLine})
              </span>
            </button>
          ) : (
            <span>Shift+Alt+F</span>
          )}
        </div>
      </div>
    </section>
  );
};
