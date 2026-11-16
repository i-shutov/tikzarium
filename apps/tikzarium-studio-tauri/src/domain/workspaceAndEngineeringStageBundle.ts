import {
  ALLOWED_STROKE_COLORS,
  OWNERSHIP_MARKER,
  applyOwnedPrimitivePatch,
  generateOwnedLine,
  insertOwnedPrimitiveIntoSource,
  parseDimensionToCm,
  parseOwnedPrimitives,
  parsePolyPointsList,
  proposeLibraryConnect,
  serializePolyPointsList,
  snapCoordinateCm,
} from './tikzEngine';
import type { OwnedPrimitive } from './tikzEngine';
import type { ToolId } from './catalog';

// ============================================================================
// STAGE 1 (E01–E08): Two-Pane Preamble/Body Splitter & Workspace Ergonomics
// ============================================================================

export interface SplitTexDocumentResult {
  hasPreamble: boolean;
  lineEnding: '\r\n' | '\n';
  preambleText: string;
  bodyText: string;
  preambleLineCount: number;
  bodyLineCount: number;
  bodyStartLine: number; // 1-based physical line where body starts
  bodyStartCharOffset: number; // exact UTF-16 code unit offset in source
  splitBoundaryToken: string;
}

/**
 * E01: Byte-faithful splitter separating a .tex file into:
 *  - Window 1 (Top): Document Preamble (\documentclass, \usepackage, \usetikzlibrary, \definecolor, \tikzset, macros)
 *  - Window 2 (Bottom): Figure Body (\begin{document} / \begin{tikzpicture} ... \end{document})
 * Guarantees: joinPreambleAndBodyToSource(res.preambleText, res.bodyText, res.lineEnding) === source
 * whenever res.hasPreamble === true.
 */
export function splitTexDocumentIntoPreambleAndBody(source: string): SplitTexDocumentResult {
  const lineEnding: '\r\n' | '\n' = source.includes('\r\n') ? '\r\n' : '\n';
  const rawLines = source.split(/\r?\n/);

  let splitLineIdx = rawLines.findIndex((l) => l.includes('\\begin{document}'));
  let boundaryToken = '\\begin{document}';

  if (splitLineIdx <= 0) {
    const tikzIdx = rawLines.findIndex((l) => l.includes('\\begin{tikzpicture}'));
    if (tikzIdx > 0) {
      splitLineIdx = tikzIdx;
      boundaryToken = '\\begin{tikzpicture}';
    }
  }

  if (splitLineIdx <= 0) {
    return {
      hasPreamble: false,
      lineEnding,
      preambleText: '',
      bodyText: source,
      preambleLineCount: 0,
      bodyLineCount: rawLines.length,
      bodyStartLine: 1,
      bodyStartCharOffset: 0,
      splitBoundaryToken: '',
    };
  }

  // Compute exact character offset of line `splitLineIdx` in original `source`
  let charOffset = 0;
  let currentLine = 0;
  while (currentLine < splitLineIdx && charOffset < source.length) {
    const nl = source.indexOf('\n', charOffset);
    if (nl === -1) break;
    charOffset = nl + 1;
    currentLine++;
  }

  // Strip the single line terminator right before `charOffset` for `preambleText`
  let preambleEndOffset = charOffset;
  if (preambleEndOffset >= 2 && source.slice(preambleEndOffset - 2, preambleEndOffset) === '\r\n') {
    preambleEndOffset -= 2;
  } else if (preambleEndOffset >= 1 && source[preambleEndOffset - 1] === '\n') {
    preambleEndOffset -= 1;
  }

  const preambleText = source.slice(0, preambleEndOffset);
  const bodyText = source.slice(charOffset);

  return {
    hasPreamble: true,
    lineEnding,
    preambleText,
    bodyText,
    preambleLineCount: splitLineIdx,
    bodyLineCount: Math.max(1, rawLines.length - splitLineIdx),
    bodyStartLine: splitLineIdx + 1,
    bodyStartCharOffset: charOffset,
    splitBoundaryToken: boundaryToken,
  };
}

export function joinPreambleAndBodyToSource(
  preambleText: string,
  bodyText: string,
  lineEnding: '\r\n' | '\n'
): string {
  const normPreamble = preambleText.replace(/\r?\n/g, lineEnding);
  const normBody = bodyText.replace(/\r?\n/g, lineEnding);
  return `${normPreamble}${lineEnding}${normBody}`;
}

export type PreambleSplitterPresetId = 'collapsed' | 'compact' | 'balanced' | 'expanded';

export interface WorkspaceRoleProfile {
  id: 'balanced' | 'cad' | 'code-preamble' | 'compact-13';
  labelRu: string;
  shortLabelRu: string;
  cols: { canvas: number; code: number; inspector: number };
  inspectorCollapsed: boolean;
  preamblePreset: PreambleSplitterPresetId;
}

export const WORKSPACE_ROLE_PROFILES: WorkspaceRoleProfile[] = [
  {
    id: 'balanced',
    labelRu: 'Инженер 50/50 (Холст + Преамбула/Код + Инспектор)',
    shortLabelRu: 'Инженер 50/50',
    cols: { canvas: 10, code: 8, inspector: 6 },
    inspectorCollapsed: false,
    preamblePreset: 'compact',
  },
  {
    id: 'cad',
    labelRu: 'Фокус: Чертёж САПР (широкий холст + свёрнутая преамбула)',
    shortLabelRu: 'Чертёж САПР',
    cols: { canvas: 13, code: 6, inspector: 5 },
    inspectorCollapsed: false,
    preamblePreset: 'collapsed',
  },
  {
    id: 'code-preamble',
    labelRu: 'Код + Преамбула (настройка пакетов \\tikzset и макросов)',
    shortLabelRu: 'Код + Преамбула',
    cols: { canvas: 8, code: 11, inspector: 5 },
    inspectorCollapsed: false,
    preamblePreset: 'balanced',
  },
  {
    id: 'compact-13',
    labelRu: 'Компактный экран 13″ (Холст + Код без боковой панели)',
    shortLabelRu: 'Ноутбук 13″',
    cols: { canvas: 12, code: 12, inspector: 0 },
    inspectorCollapsed: true,
    preamblePreset: 'compact',
  },
];

export type WorkshopCategoryId =
  | 'all'
  | 'geometry-cad'
  | 'domain-engineering'
  | 'plots-stats'
  | 'code-refactor'
  | 'project-audit';

export type WorkshopTargetId =
  | 'hub-extensions'
  | 'hub-geometry'
  | 'hub-engineering'
  | 'hub-stats'
  | 'hub-preamble-diff'
  | 'legacy-cad-stamps'
  | 'legacy-cad-foreach'
  | 'legacy-cad-pgfplots'
  | 'legacy-adv-gost'
  | 'legacy-adv-plots'
  | 'legacy-adv-layers'
  | 'legacy-notations'
  | 'legacy-3d-fillet'
  | 'legacy-outliner'
  | 'legacy-audit-session'
  | 'legacy-formatter'
  | 'legacy-spline-offset'
  | 'legacy-svg-booktabs'
  | 'legacy-project'
  | 'legacy-snippets';

export interface WorkshopCatalogItem {
  id: WorkshopTargetId;
  category: Exclude<WorkshopCategoryId, 'all'>;
  titleRu: string;
  shortPinLabelRu: string;
  subtitleRu: string;
  keywords: string;
  stageBadgeRu: string;
}

export const WORKSHOP_CATALOG_ITEMS: WorkshopCatalogItem[] = [
  {
    id: 'hub-extensions',
    category: 'domain-engineering',
    titleRu: 'Пакеты расширений TikZ (12 студий): pgfplots, circuitikz, chemfig, tikz-cd, forest, quantikz, timing…',
    shortPinLabelRu: 'Пакеты TikZ',
    subtitleRu: 'Полный конструктор предметных пакетов расширений с автоподключением преамбулы и синхронным эскизом холста',
    keywords: 'extensions packages pgfplots circuitikz tikz-cd chemfig mhchem forest pgfgantt quantikz feynman tkz-euclide tikz-timing tikz-3dplot tikz-optics stanli automata petri пакеты расширений',
    stageBadgeRu: 'Приоритет №1',
  },
  {
    id: 'hub-geometry',
    category: 'geometry-cad',
    titleRu: 'Булевы операции 2D (∪ \\ ∩ ⊕), дуги 3-точки, эллипсы и касательные',
    shortPinLabelRu: 'Булевы 2D',
    subtitleRu: 'Объединение и вычитание контуров на холсте, общие касательные к окружностям, калибровка по 2 точкам',
    keywords: 'boolean union diff intersection arc ellipse tangent булевы дуга эллипс касательная калибровка',
    stageBadgeRu: 'Этап 2–3',
  },
  {
    id: 'hub-engineering',
    category: 'domain-engineering',
    titleRu: 'Цепи ГОСТ/ANSI, Оптика (ход лучей), Балки Q/M и Блок-схемы ГОСТ 19.701',
    shortPinLabelRu: 'Схемы/Эпюры',
    subtitleRu: 'Принципиальные электросхемы, тонкие линзы, эпюры сопромата и диаграммы Ганта в живых n1',
    keywords: 'circuit resistor optics lens beam shear moment flowchart gantt цепи оптика линза балка эпюра ганта',
    stageBadgeRu: 'Этап 4',
  },
  {
    id: 'hub-stats',
    category: 'plots-stats',
    titleRu: 'Регрессия МНК (Linear / Poly / Exp + R²) и статистика BoxPlot / Гистограмма',
    shortPinLabelRu: 'МНК / BoxPlot',
    subtitleRu: 'Аппроксимация эксперимента с коридором ±σ, доверительными планками, квартилями и выбросами',
    keywords: 'regression ols fit r2 boxplot histogram error bars регрессия мнк аппроксимация гистограмма квартили',
    stageBadgeRu: 'Этап 4',
  },
  {
    id: 'hub-preamble-diff',
    category: 'code-refactor',
    titleRu: 'Параметризатор чисел → \\pgfmathsetmacro и Поэлементный Diff отката n1',
    shortPinLabelRu: 'Макро / Diff',
    subtitleRu: 'Вынос повторяющихся размеров в окно Преамбулы и выборочный возврат отдельных фигур из истории',
    keywords: 'magic numbers macro diff selective revert preamble параметризация макросы откат ревизия преамбула',
    stageBadgeRu: 'Этап 3',
  },
  {
    id: 'legacy-spline-offset',
    category: 'geometry-cad',
    titleRu: 'Эквидистанта ±Δd, гладкий сплайн Catmull–Rom C¹, Trim/Extend и гребёнка ГОСТ',
    shortPinLabelRu: 'Сплайн/Offset',
    subtitleRu: 'Параллельный отступ контура, интерполяционный сплайн, подрезка лучей и штриховка опоры',
    keywords: 'offset spline catmull trim extend comb эквидистанта сплайн подрезка гребенка',
    stageBadgeRu: 'P74–P77',
  },
  {
    id: 'legacy-3d-fillet',
    category: 'geometry-cad',
    titleRu: '3D-аксонометрия ГОСТ 2.317, скругления R / фаски, лупа spy и полки выносок',
    shortPinLabelRu: '3D / Фаски',
    subtitleRu: 'Проекция 3D-сцен в n1, сопряжения углов, заливка между кривыми и позиционные выноски',
    keywords: '3d isometric dimetric fillet chamfer spy leader аксонометрия фаска скругление лупа выноска',
    stageBadgeRu: 'P54–P59',
  },
  {
    id: 'legacy-adv-gost',
    category: 'geometry-cad',
    titleRu: 'Многоугольники (-- cycle), пересечения ∩/⊥, штриховки ГОСТ 2.306 и единицы СИ',
    shortPinLabelRu: 'Штриховки ГОСТ',
    subtitleRu: 'Конструктор призм, перпендикуляры, декорации brace/snake и физические величины siunitx',
    keywords: 'polygon cycle intersection hatch siunitx полигон пересечение штриховка си',
    stageBadgeRu: 'P36–P42',
  },
  {
    id: 'legacy-notations',
    category: 'domain-engineering',
    titleRu: 'Квантовые цепи, диаграммы Фейнмана, уровни Яблонского и контуры ТАУ',
    shortPinLabelRu: 'Кванты/ТАУ',
    subtitleRu: 'Специализированные научные нотации физики, химии, автоматов и теории управления',
    keywords: 'quantum feynman jablonski chemistry control automata кванты фейнман химия тау автоматы',
    stageBadgeRu: 'P51–P55',
  },
  {
    id: 'legacy-cad-stamps',
    category: 'domain-engineering',
    titleRu: 'Научные штампы, угловые дуги ∠α и параметрические массивы \\foreach',
    shortPinLabelRu: 'Штампы/Цикл',
    subtitleRu: 'Быстрая вставка типовых узлов, обозначений углов и линейных/круговых решёток',
    keywords: 'stamps angle foreach array штампы угол массив цикл',
    stageBadgeRu: 'P23–P25',
  },
  {
    id: 'legacy-adv-plots',
    category: 'plots-stats',
    titleRu: 'Оцифровщик сканов графиков, аналитические кривые F(x) и векторные поля',
    shortPinLabelRu: 'Оцифровка/F(x)',
    subtitleRu: 'Калибровка растрового скана по осям, Гаусс/Лоренц/затухание и фазовые портреты',
    keywords: 'digitizer scan analytical plot vector field quiver оцифровка скан функция векторное поле',
    stageBadgeRu: 'P43–P45',
  },
  {
    id: 'legacy-cad-pgfplots',
    category: 'plots-stats',
    titleRu: 'Инспектор осей PGFPlots, вставка таблиц из Excel/TSV и палитра Okabe–Ito',
    shortPinLabelRu: 'Оси PGFPlots',
    subtitleRu: 'Настройка xlabel/ylabel/grid/legend и дальтоник-безопасная научная палитра',
    keywords: 'pgfplots axis tsv excel clipboard okabe ito оси таблица палитра',
    stageBadgeRu: 'P27–P35',
  },
  {
    id: 'legacy-formatter',
    category: 'code-refactor',
    titleRu: 'AST-автоформатер .tex, конвертер cm↔mm↔pt, вынос \\tikzset и чистка преамбулы',
    shortPinLabelRu: 'Рефактор .tex',
    subtitleRu: 'Выравнивание отступов без потери n1, перевод единиц и удаление неиспользуемых библиотек',
    keywords: 'formatter units cm mm pt tikzset dry preamble форматер единицы преамбула рефакторинг',
    stageBadgeRu: 'P66–P69',
  },
  {
    id: 'legacy-svg-booktabs',
    category: 'code-refactor',
    titleRu: 'Импорт внешнего SVG в n1, таблицы booktabs+siunitx и автономный архив filecontents*',
    shortPinLabelRu: 'SVG / Booktabs',
    subtitleRu: 'Конвертация векторных SVG в примитивы холста и академические таблицы \\toprule',
    keywords: 'svg import booktabs siunitx filecontents bundle импорт таблица архив',
    stageBadgeRu: 'P78–P80',
  },
  {
    id: 'legacy-outliner',
    category: 'project-audit',
    titleRu: 'Табличный реестр всех примитивов n1 (Spreadsheet Outliner) и паспорт стиля',
    shortPinLabelRu: 'Таблица n1',
    subtitleRu: 'Пакетное редактирование координат, слоёв и цветов в таблице egui::TableBuilder',
    keywords: 'outliner table spreadsheet style passport таблица реестр пипетка',
    stageBadgeRu: 'P61–P62',
  },
  {
    id: 'legacy-audit-session',
    category: 'project-audit',
    titleRu: 'Геометрический пре-принт линтер (омоглифы, коллизии BBox) и пакет .tikzproj',
    shortPinLabelRu: 'Пре-принт',
    subtitleRu: 'Проверка выхода за колонку журнала, кириллицы в формулах и сохранение полной сессии',
    keywords: 'linter audit homoglyph bbox tikzproj session аудит омоглифы коллизии сессия',
    stageBadgeRu: 'P64–P65',
  },
  {
    id: 'legacy-project',
    category: 'project-audit',
    titleRu: 'Проект статьи: единый shared_style.tikz, субфигуры (а)(б)(в) и профилировщик',
    shortPinLabelRu: 'Субфигуры',
    subtitleRu: 'Сборка многопанельных рисунков рукописи и синхронизация общих стилей',
    keywords: 'project shared style subfigure profiler статья субфигуры стиль',
    stageBadgeRu: 'P31–P33',
  },
  {
    id: 'legacy-snippets',
    category: 'project-audit',
    titleRu: 'Полка пользовательских заготовок (Snippets), импорт CSV и мониторинг диска',
    shortPinLabelRu: 'Заготовки',
    subtitleRu: 'Сохранение выделенных узлов в библиотеку автора и быстрая вставка на холст',
    keywords: 'snippets csv watcher recent заготовки сниппеты диск',
    stageBadgeRu: 'P18–P20',
  },
];

const PINNED_STORAGE_KEY = 'tikzarium_pinned_workshops_v1';
export const DEFAULT_PINNED_WORKSHOPS: WorkshopTargetId[] = [
  'hub-engineering',
  'hub-geometry',
];

export function loadPinnedWorkshopIds(): WorkshopTargetId[] {
  try {
    const raw = window.localStorage.getItem(PINNED_STORAGE_KEY);
    if (!raw) return DEFAULT_PINNED_WORKSHOPS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_PINNED_WORKSHOPS;
    const valid = parsed.filter((id): id is WorkshopTargetId =>
      WORKSHOP_CATALOG_ITEMS.some((item) => item.id === id)
    );
    return valid.slice(0, 4);
  } catch {
    return DEFAULT_PINNED_WORKSHOPS;
  }
}

export function savePinnedWorkshopIds(ids: WorkshopTargetId[]): void {
  try {
    window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(ids.slice(0, 4)));
  } catch {
    // Ignore storage quota errors in sandboxed iframes
  }
}

// ============================================================================
// STAGE 2 (F01–F06): Interactive n1 Core, Arcs/Ellipses, Reroute, Groups & Grids
// ============================================================================

export interface PolyEdgeMidpointHandle {
  edgeIndex: number;
  xCm: number;
  yCm: number;
}

/** F01: Midpoint handles along every segment of a poly_points primitive for 1-click vertex insertion */
export function getPolyEdgeMidpoints(prim: OwnedPrimitive): PolyEdgeMidpointHandle[] {
  if ((prim.tool !== 'line' && prim.tool !== 'arrow') || !prim.values.poly_points) {
    return [];
  }
  const pts = parsePolyPointsList(prim.values.poly_points);
  if (pts.length < 2) return [];
  const isClosed = prim.values.poly_closed === 'cycle';
  const count = isClosed ? pts.length : pts.length - 1;
  const out: PolyEdgeMidpointHandle[] = [];
  for (let i = 0; i < count; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    out.push({
      edgeIndex: i,
      xCm: +((a.xCm + b.xCm) / 2).toFixed(2),
      yCm: +((a.yCm + b.yCm) / 2).toFixed(2),
    });
  }
  return out;
}

export function insertPolyVertexAtEdgeInSource(
  source: string,
  primitiveId: number,
  edgeIndex: number,
  customPointCm?: { x: number; y: number }
): { ok: boolean; nextSource: string; vertexCount: number; summaryRu: string } {
  const prim = parseOwnedPrimitives(source).find((p) => p.id === primitiveId);
  if (!prim || !prim.values.poly_points) {
    return { ok: false, nextSource: source, vertexCount: 0, summaryRu: 'Контур poly_points не найден.' };
  }
  const pts = parsePolyPointsList(prim.values.poly_points);
  if (pts.length < 2) {
    return { ok: false, nextSource: source, vertexCount: pts.length, summaryRu: 'Недостаточно вершин.' };
  }
  const clampedEdge = Math.max(0, Math.min(pts.length - 1, edgeIndex));
  const a = pts[clampedEdge];
  const b = pts[(clampedEdge + 1) % pts.length];
  const inserted = customPointCm
    ? { xCm: +customPointCm.x.toFixed(2), yCm: +customPointCm.y.toFixed(2) }
    : { xCm: +((a.xCm + b.xCm) / 2).toFixed(2), yCm: +((a.yCm + b.yCm) / 2).toFixed(2) };

  const nextPts = [...pts.slice(0, clampedEdge + 1), inserted, ...pts.slice(clampedEdge + 1)];
  const nextValues: Record<string, string> = {
    ...prim.values,
    poly_points: serializePolyPointsList(nextPts),
    start_x: `${nextPts[0].xCm.toFixed(2)}cm`,
    start_y: `${nextPts[0].yCm.toFixed(2)}cm`,
    end_x: `${nextPts[1].xCm.toFixed(2)}cm`,
    end_y: `${nextPts[1].yCm.toFixed(2)}cm`,
  };
  const nextSource = applyOwnedPrimitivePatch(source, primitiveId, nextValues);
  return {
    ok: true,
    nextSource,
    vertexCount: nextPts.length,
    summaryRu: `Добавлена вершина #${clampedEdge + 2} на ребро контура #${primitiveId} (всего ${nextPts.length} · F01).`,
  };
}

export function deletePolyVertexAtIndexInSource(
  source: string,
  primitiveId: number,
  vertexIndex: number
): { ok: boolean; nextSource: string; vertexCount: number; summaryRu: string } {
  const prim = parseOwnedPrimitives(source).find((p) => p.id === primitiveId);
  if (!prim || !prim.values.poly_points) {
    return { ok: false, nextSource: source, vertexCount: 0, summaryRu: 'Контур poly_points не найден.' };
  }
  const pts = parsePolyPointsList(prim.values.poly_points);
  const minAllowed = prim.values.poly_closed === 'cycle' ? 3 : 2;
  if (pts.length <= minAllowed) {
    return {
      ok: false,
      nextSource: source,
      vertexCount: pts.length,
      summaryRu: `Нельзя удалить вершину: минимум ${minAllowed} точек для контура.`,
    };
  }
  if (vertexIndex < 0 || vertexIndex >= pts.length) {
    return { ok: false, nextSource: source, vertexCount: pts.length, summaryRu: 'Индекс вершины вне диапазона.' };
  }
  const nextPts = pts.filter((_, idx) => idx !== vertexIndex);
  const nextValues: Record<string, string> = {
    ...prim.values,
    poly_points: serializePolyPointsList(nextPts),
    start_x: `${nextPts[0].xCm.toFixed(2)}cm`,
    start_y: `${nextPts[0].yCm.toFixed(2)}cm`,
    end_x: `${nextPts[1].xCm.toFixed(2)}cm`,
    end_y: `${nextPts[1].yCm.toFixed(2)}cm`,
  };
  const nextSource = applyOwnedPrimitivePatch(source, primitiveId, nextValues);
  return {
    ok: true,
    nextSource,
    vertexCount: nextPts.length,
    summaryRu: `Удалена вершина #${vertexIndex + 1} контура #${primitiveId} (осталось ${nextPts.length} · F01).`,
  };
}

export function togglePolyClosedInSource(
  source: string,
  primitiveId: number
): { ok: boolean; nextSource: string; isClosed: boolean; summaryRu: string } {
  const prim = parseOwnedPrimitives(source).find((p) => p.id === primitiveId);
  if (!prim || !prim.values.poly_points) {
    return { ok: false, nextSource: source, isClosed: false, summaryRu: 'Выберите многозвенный контур.' };
  }
  const pts = parsePolyPointsList(prim.values.poly_points);
  const nextClosed = prim.values.poly_closed !== 'cycle';
  if (nextClosed && pts.length < 3) {
    return {
      ok: false,
      nextSource: source,
      isClosed: false,
      summaryRu: 'Для замыкания (-- cycle) требуется минимум 3 вершины.',
    };
  }
  const nextValues: Record<string, string> = { ...prim.values };
  if (nextClosed) {
    nextValues.poly_closed = 'cycle';
  } else {
    delete nextValues.poly_closed;
    delete nextValues.fill_color;
    delete nextValues.hatch_pattern;
  }
  const nextSource = applyOwnedPrimitivePatch(source, primitiveId, nextValues);
  return {
    ok: true,
    nextSource,
    isClosed: nextClosed,
    summaryRu: nextClosed
      ? `Контур #${primitiveId} замкнут в полигон (-- cycle · F01).`
      : `Контур #${primitiveId} разомкнут в ломаную (F01).`,
  };
}

/** F02: Analytic 3-Point Circular Arc & Parametric Ellipse into live n1 */
export interface ThreePointArcGeometry {
  isCollinear: boolean;
  centerCm: { x: number; y: number };
  radiusCm: number;
  startAngleRad: number;
  sweepAngleRad: number;
  sampledPoints: { xCm: number; yCm: number }[];
}

export function computeThreePointArcGeometry(
  p1: { x: number; y: number },
  pMid: { x: number; y: number },
  p2: { x: number; y: number },
  sampleCount = 20
): ThreePointArcGeometry {
  const ax = p1.x;
  const ay = p1.y;
  const bx = pMid.x;
  const by = pMid.y;
  const cx = p2.x;
  const cy = p2.y;

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-4) {
    const pts = Array.from({ length: 3 }, (_, idx) => {
      const t = idx / 2;
      return {
        xCm: +(ax + (cx - ax) * t).toFixed(2),
        yCm: +(ay + (cy - ay) * t).toFixed(2),
      };
    });
    return {
      isCollinear: true,
      centerCm: { x: +((ax + cx) / 2).toFixed(2), y: +((ay + cy) / 2).toFixed(2) },
      radiusCm: 0,
      startAngleRad: 0,
      sweepAngleRad: 0,
      sampledPoints: pts,
    };
  }

  const aSq = ax * ax + ay * ay;
  const bSq = bx * bx + by * by;
  const cSq = cx * cx + cy * cy;

  const ux = (aSq * (by - cy) + bSq * (cy - ay) + cSq * (ay - by)) / d;
  const uy = (aSq * (cx - bx) + bSq * (ax - cx) + cSq * (bx - ax)) / d;
  const r = Math.hypot(ax - ux, ay - uy);

  const normTwoPi = (ang: number) => {
    let v = ang % (2 * Math.PI);
    if (v < 0) v += 2 * Math.PI;
    return v;
  };

  const th1 = normTwoPi(Math.atan2(ay - uy, ax - ux));
  const thM = normTwoPi(Math.atan2(by - uy, bx - ux));
  const th2 = normTwoPi(Math.atan2(cy - uy, cx - ux));

  const ccwDeltaMid = normTwoPi(thM - th1);
  const ccwDeltaEnd = normTwoPi(th2 - th1);
  // If pMid lies on CCW arc from th1 to th2, sweep is +ccwDeltaEnd; otherwise -(2π - ccwDeltaEnd)
  const sweep = ccwDeltaMid <= ccwDeltaEnd ? ccwDeltaEnd : -(2 * Math.PI - ccwDeltaEnd);

  const steps = Math.max(6, sampleCount);
  const sampledPoints: { xCm: number; yCm: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const ang = th1 + (sweep * i) / steps;
    sampledPoints.push({
      xCm: +(ux + r * Math.cos(ang)).toFixed(2),
      yCm: +(uy + r * Math.sin(ang)).toFixed(2),
    });
  }

  return {
    isCollinear: false,
    centerCm: { x: +ux.toFixed(2), y: +uy.toFixed(2) },
    radiusCm: +r.toFixed(2),
    startAngleRad: th1,
    sweepAngleRad: sweep,
    sampledPoints,
  };
}

export function insertThreePointArcIntoSource(
  source: string,
  p1: { x: number; y: number },
  pMid: { x: number; y: number },
  p2: { x: number; y: number },
  options?: { strokeColor?: string; strokeWidth?: string }
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  const geom = computeThreePointArcGeometry(p1, pMid, p2, 18);
  const fmt = (n: number) => `${n.toFixed(2)}cm`;
  const styleExtras: Record<string, string> = {};
  if (options?.strokeColor && (ALLOWED_STROKE_COLORS as readonly string[]).includes(options.strokeColor)) {
    styleExtras.stroke_color = options.strokeColor;
  }
  if (options?.strokeWidth) {
    styleExtras.stroke_width = options.strokeWidth;
  }

  if (geom.isCollinear || geom.radiusCm > 45) {
    const res = insertOwnedPrimitiveIntoSource(source, 'line', {
      start_x: fmt(p1.x),
      start_y: fmt(p1.y),
      end_x: fmt(p2.x),
      end_y: fmt(p2.y),
      ...styleExtras,
    });
    return {
      nextSource: res.nextSource,
      insertedIds: [res.newId],
      summaryRu: `Точки коллинеарны — построен отрезок #${res.newId} (F02).`,
    };
  }

  // Exact cubic Bezier circular arc approximation (1 segment if |sweep| <= 120°, 2 segments if larger)
  const segmentsCount = Math.abs(geom.sweepAngleRad) <= (2 * Math.PI) / 3 ? 1 : 2;
  const subSweep = geom.sweepAngleRad / segmentsCount;
  const k = (4 / 3) * Math.tan(subSweep / 4);
  const cx = geom.centerCm.x;
  const cy = geom.centerCm.y;
  const r = geom.radiusCm;

  let curSource = source;
  const insertedIds: number[] = [];
  const groupTag = segmentsCount > 1 ? `arc_${Date.now() % 10000}` : '';

  for (let s = 0; s < segmentsCount; s++) {
    const a0 = geom.startAngleRad + s * subSweep;
    const a1 = a0 + subSweep;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const c1x = x0 - k * r * Math.sin(a0);
    const c1y = y0 + k * r * Math.cos(a0);
    const c2x = x1 + k * r * Math.sin(a1);
    const c2y = y1 - k * r * Math.cos(a1);

    const vals: Record<string, string> = {
      start_x: fmt(x0),
      start_y: fmt(y0),
      control1_x: fmt(c1x),
      control1_y: fmt(c1y),
      control2_x: fmt(c2x),
      control2_y: fmt(c2y),
      end_x: fmt(x1),
      end_y: fmt(y1),
      ...styleExtras,
    };
    if (groupTag) vals.group_id = groupTag;
    const res = insertOwnedPrimitiveIntoSource(curSource, 'cubic', vals);
    curSource = res.nextSource;
    insertedIds.push(res.newId);
  }

  const degSweep = Math.round((Math.abs(geom.sweepAngleRad) * 180) / Math.PI);
  return {
    nextSource: curSource,
    insertedIds,
    summaryRu: `Построена дуга по 3 точкам (R = ${geom.radiusCm.toFixed(2)} см, ∠${degSweep}°) → n1 #${insertedIds.join(', #')} (F02).`,
  };
}

export function insertParametricEllipseIntoSource(
  source: string,
  centerCm: { x: number; y: number },
  rxCm: number,
  ryCm: number,
  rotateDeg = 0,
  options?: { strokeColor?: string; fillColor?: string; hatchPattern?: string }
): { nextSource: string; newId: number; summaryRu: string } {
  const safeRx = Math.max(0.15, Math.abs(rxCm));
  const safeRy = Math.max(0.15, Math.abs(ryCm));
  const rotRad = (rotateDeg * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  const N = 24;
  const pts: { xCm: number; yCm: number }[] = [];

  for (let i = 0; i < N; i++) {
    const th = (2 * Math.PI * i) / N;
    const lx = safeRx * Math.cos(th);
    const ly = safeRy * Math.sin(th);
    const gx = centerCm.x + lx * cosR - ly * sinR;
    const gy = centerCm.y + lx * sinR + ly * cosR;
    pts.push({ xCm: +gx.toFixed(2), yCm: +gy.toFixed(2) });
  }

  const vals: Record<string, string> = {
    start_x: `${pts[0].xCm.toFixed(2)}cm`,
    start_y: `${pts[0].yCm.toFixed(2)}cm`,
    end_x: `${pts[1].xCm.toFixed(2)}cm`,
    end_y: `${pts[1].yCm.toFixed(2)}cm`,
    poly_points: serializePolyPointsList(pts),
    poly_closed: 'cycle',
  };
  if (options?.strokeColor) vals.stroke_color = options.strokeColor;
  if (options?.fillColor) vals.fill_color = options.fillColor;
  if (options?.hatchPattern) vals.hatch_pattern = options.hatchPattern;

  let curSource = source;
  if (options?.hatchPattern) {
    const lib = proposeLibraryConnect(curSource, 'patterns');
    if (lib.ok) curSource = lib.nextSource;
  }

  const res = insertOwnedPrimitiveIntoSource(curSource, 'line', vals);
  return {
    nextSource: res.nextSource,
    newId: res.newId,
    summaryRu: `Вставлен эллипс #${res.newId} (полуоси ${safeRx.toFixed(2)}×${safeRy.toFixed(2)} см, поворот ${rotateDeg}° · F02).`,
  };
}

/** F03: Topological rerouting — keeps fallback coordinates of bound arrows synced when nodes move */
export function rerouteBoundConnectorsInSource(source: string): {
  nextSource: string;
  reroutedCount: number;
} {
  const all = parseOwnedPrimitives(source);
  const nodeMap = new Map<string, { x: number; y: number }>();
  for (const p of all) {
    if (p.tool === 'node' && p.values.node_id) {
      const nx = parseDimensionToCm(p.values.x);
      const ny = parseDimensionToCm(p.values.y);
      if (nx !== null && ny !== null) {
        nodeMap.set(p.values.node_id, { x: nx, y: ny });
      }
    }
  }
  if (nodeMap.size === 0) return { nextSource: source, reroutedCount: 0 };

  let curSource = source;
  let reroutedCount = 0;

  for (const p of all) {
    if (p.tool !== 'line' && p.tool !== 'arrow') continue;
    const fromTarget = p.values.from_node ? nodeMap.get(p.values.from_node) : undefined;
    const toTarget = p.values.to_node ? nodeMap.get(p.values.to_node) : undefined;
    if (!fromTarget && !toTarget) continue;

    const latest = parseOwnedPrimitives(curSource).find((item) => item.id === p.id);
    if (!latest) continue;
    const nextVals = { ...latest.values };
    let changed = false;

    if (fromTarget) {
      const sx = `${fromTarget.x.toFixed(2)}cm`;
      const sy = `${fromTarget.y.toFixed(2)}cm`;
      if (nextVals.start_x !== sx || nextVals.start_y !== sy) {
        nextVals.start_x = sx;
        nextVals.start_y = sy;
        changed = true;
      }
    }
    if (toTarget) {
      const ex = `${toTarget.x.toFixed(2)}cm`;
      const ey = `${toTarget.y.toFixed(2)}cm`;
      if (nextVals.end_x !== ex || nextVals.end_y !== ey) {
        nextVals.end_x = ex;
        nextVals.end_y = ey;
        changed = true;
      }
    }

    if (changed) {
      curSource = applyOwnedPrimitivePatch(curSource, latest.id, nextVals);
      reroutedCount++;
    }
  }

  return { nextSource: curSource, reroutedCount };
}

/** F04: Local Primitive Grouping (Ctrl+G / Ctrl+Shift+G) via group_id */
export function groupPrimitivesInSource(
  source: string,
  targetIds: number[]
): { ok: boolean; nextSource: string; groupId: string; summaryRu: string } {
  if (targetIds.length < 2) {
    return {
      ok: false,
      nextSource: source,
      groupId: '',
      summaryRu: 'Выделите минимум 2 объекта для объединения в группу (Ctrl+G).',
    };
  }
  const all = parseOwnedPrimitives(source);
  let idx = 1;
  const usedGroups = new Set(all.map((p) => p.values.group_id).filter(Boolean));
  while (usedGroups.has(`grp${idx}`)) idx++;
  const groupId = `grp${idx}`;

  let curSource = source;
  let updated = 0;
  for (const id of targetIds) {
    const p = parseOwnedPrimitives(curSource).find((item) => item.id === id);
    if (!p) continue;
    curSource = applyOwnedPrimitivePatch(curSource, id, {
      ...p.values,
      group_id: groupId,
    });
    updated++;
  }

  return {
    ok: updated >= 2,
    nextSource: curSource,
    groupId,
    summaryRu: `Объекты (${updated} шт.) объединены в группу «${groupId}» (Ctrl+G · F04).`,
  };
}

export function ungroupPrimitivesInSource(
  source: string,
  targetIds: number[]
): { ok: boolean; nextSource: string; ungroupedCount: number; summaryRu: string } {
  const all = parseOwnedPrimitives(source);
  const groupIdsToDissolve = new Set<string>();
  for (const p of all) {
    if (targetIds.includes(p.id) && p.values.group_id) {
      groupIdsToDissolve.add(p.values.group_id);
    }
  }
  if (groupIdsToDissolve.size === 0) {
    return {
      ok: false,
      nextSource: source,
      ungroupedCount: 0,
      summaryRu: 'Среди выбранных объектов нет сгруппированных элементов.',
    };
  }

  let curSource = source;
  let count = 0;
  for (const p of all) {
    if (p.values.group_id && groupIdsToDissolve.has(p.values.group_id)) {
      const latest = parseOwnedPrimitives(curSource).find((item) => item.id === p.id);
      if (!latest) continue;
      const nextVals = { ...latest.values };
      delete nextVals.group_id;
      curSource = applyOwnedPrimitivePatch(curSource, p.id, nextVals);
      count++;
    }
  }
  return {
    ok: count > 0,
    nextSource: curSource,
    ungroupedCount: count,
    summaryRu: `Разгруппировано объектов: ${count} шт. (Ctrl+Shift+G · F04).`,
  };
}

export function expandSelectionWithGroups(
  allPrimitives: OwnedPrimitive[],
  seedIds: number[]
): number[] {
  const groupSet = new Set<string>();
  for (const p of allPrimitives) {
    if (seedIds.includes(p.id) && p.values.group_id) {
      groupSet.add(p.values.group_id);
    }
  }
  if (groupSet.size === 0) return seedIds;
  const out = new Set<number>(seedIds);
  for (const p of allPrimitives) {
    if (p.values.group_id && groupSet.has(p.values.group_id)) {
      out.add(p.id);
    }
  }
  return Array.from(out);
}

/** F05: Polar (r–θ) and Isometric (30°/60°) Canvas Grids & Snap */
export type CanvasGridMode = 'cartesian' | 'polar' | 'isometric';

export function snapPointByGridMode(
  rawCm: { x: number; y: number },
  gridMode: CanvasGridMode,
  stepCm: number,
  originCm: { x: number; y: number } = { x: 3.1, y: 1.9 }
): { x: number; y: number; polarRadiusCm?: number; polarAngleDeg?: number } {
  if (stepCm <= 0) {
    const r = Math.hypot(rawCm.x - originCm.x, rawCm.y - originCm.y);
    let deg = Math.round((Math.atan2(rawCm.y - originCm.y, rawCm.x - originCm.x) * 180) / Math.PI);
    if (deg < 0) deg += 360;
    return {
      x: +(Math.round(rawCm.x * 100) / 100).toFixed(2),
      y: +(Math.round(rawCm.y * 100) / 100).toFixed(2),
      polarRadiusCm: +r.toFixed(2),
      polarAngleDeg: deg,
    };
  }

  if (gridMode === 'cartesian') {
    return {
      x: +snapCoordinateCm(rawCm.x, stepCm).toFixed(2),
      y: +snapCoordinateCm(rawCm.y, stepCm).toFixed(2),
    };
  }

  if (gridMode === 'polar') {
    const dx = rawCm.x - originCm.x;
    const dy = rawCm.y - originCm.y;
    const rawR = Math.hypot(dx, dy);
    const snappedR = Math.round(rawR / stepCm) * stepCm;
    const rawAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const snappedAngleDeg = Math.round(rawAngleDeg / 15) * 15;
    const rad = (snappedAngleDeg * Math.PI) / 180;
    const x = +(originCm.x + snappedR * Math.cos(rad)).toFixed(2);
    const y = +(originCm.y + snappedR * Math.sin(rad)).toFixed(2);
    const normDeg = ((snappedAngleDeg % 360) + 360) % 360;
    return {
      x,
      y,
      polarRadiusCm: +snappedR.toFixed(2),
      polarAngleDeg: normDeg,
    };
  }

  // Isometric 30° lattice: e1 = (cos30, sin30), e2 = (-cos30, sin30)
  const cos30 = Math.sqrt(3) / 2;
  const sin30 = 0.5;
  const dx = rawCm.x - originCm.x;
  const dy = rawCm.y - originCm.y;
  // Invert [cos30, -cos30; sin30, sin30] * [u; v] = [dx; dy]
  const uRaw = dx / (2 * cos30) + dy / (2 * sin30);
  const vRaw = -dx / (2 * cos30) + dy / (2 * sin30);
  const uSnap = Math.round(uRaw / stepCm) * stepCm;
  const vSnap = Math.round(vRaw / stepCm) * stepCm;
  const x = +(originCm.x + (uSnap - vSnap) * cos30).toFixed(2);
  const y = +(originCm.y + (uSnap + vSnap) * sin30).toFixed(2);
  return { x, y };
}

/** F06: Engineering Contour Geometry Metrics (Length, Gauss Shoelace Area, Perimeter, Centroid, BBox) */
export interface ContourGeometryMetrics {
  count: number;
  hasClosedArea: boolean;
  totalLengthCm: number;
  perimeterCm: number;
  areaCm2: number;
  areaMm2: number;
  centroidCm: { x: number; y: number };
  bboxCm: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
}

function cubicBezierArcLengthCm(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): number {
  const steps = 24;
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x =
      mt * mt * mt * p0.x +
      3 * mt * mt * t * p1.x +
      3 * mt * t * t * p2.x +
      t * t * t * p3.x;
    const y =
      mt * mt * mt * p0.y +
      3 * mt * mt * t * p1.y +
      3 * mt * t * t * p2.y +
      t * t * t * p3.y;
    len += Math.hypot(x - prev.x, y - prev.y);
    prev = { x, y };
  }
  return len;
}

export function computeSelectionGeometryMetrics(
  primitives: OwnedPrimitive[]
): ContourGeometryMetrics | null {
  if (primitives.length === 0) return null;

  let totalLengthCm = 0;
  let perimeterCm = 0;
  let areaCm2 = 0;
  let hasClosedArea = false;
  let weightedCx = 0;
  let weightedCy = 0;
  let totalWeight = 0;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const pushBoundPt = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  for (const p of primitives) {
    const v = p.values;
    switch (p.tool) {
      case 'rectangle': {
        const x1 = parseDimensionToCm(v.start_x) ?? 0;
        const y1 = parseDimensionToCm(v.start_y) ?? 0;
        const x2 = parseDimensionToCm(v.end_x) ?? 1;
        const y2 = parseDimensionToCm(v.end_y) ?? 1;
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);
        const perim = 2 * (w + h);
        const area = w * h;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        totalLengthCm += perim;
        perimeterCm += perim;
        areaCm2 += area;
        hasClosedArea = true;
        const wt = Math.max(1e-4, area);
        weightedCx += cx * wt;
        weightedCy += cy * wt;
        totalWeight += wt;
        pushBoundPt(x1, y1);
        pushBoundPt(x2, y2);
        break;
      }
      case 'circle': {
        const cx = parseDimensionToCm(v.center_x) ?? 2;
        const cy = parseDimensionToCm(v.center_y) ?? 1.5;
        const r = Math.max(0.05, parseDimensionToCm(v.radius) ?? 0.5);
        const perim = 2 * Math.PI * r;
        const area = Math.PI * r * r;
        totalLengthCm += perim;
        perimeterCm += perim;
        areaCm2 += area;
        hasClosedArea = true;
        weightedCx += cx * area;
        weightedCy += cy * area;
        totalWeight += area;
        pushBoundPt(cx - r, cy - r);
        pushBoundPt(cx + r, cy + r);
        break;
      }
      case 'line':
      case 'arrow': {
        if (v.poly_points) {
          const pts = parsePolyPointsList(v.poly_points);
          if (pts.length >= 2) {
            const isClosed = v.poly_closed === 'cycle' && pts.length >= 3;
            let segSum = 0;
            for (let i = 0; i < pts.length; i++) {
              pushBoundPt(pts[i].xCm, pts[i].yCm);
              if (i < pts.length - 1 || isClosed) {
                const nxt = pts[(i + 1) % pts.length];
                segSum += Math.hypot(nxt.xCm - pts[i].xCm, nxt.yCm - pts[i].yCm);
              }
            }
            totalLengthCm += segSum;
            if (isClosed) {
              perimeterCm += segSum;
              hasClosedArea = true;
              // Gauss Shoelace formula + polygon centroid
              let twiceSigned = 0;
              let cxAcc = 0;
              let cyAcc = 0;
              for (let i = 0; i < pts.length; i++) {
                const cur = pts[i];
                const nxt = pts[(i + 1) % pts.length];
                const cross = cur.xCm * nxt.yCm - nxt.xCm * cur.yCm;
                twiceSigned += cross;
                cxAcc += (cur.xCm + nxt.xCm) * cross;
                cyAcc += (cur.yCm + nxt.yCm) * cross;
              }
              const polyArea = Math.abs(twiceSigned) / 2;
              areaCm2 += polyArea;
              if (Math.abs(twiceSigned) > 1e-5) {
                const pcx = cxAcc / (3 * twiceSigned);
                const pcy = cyAcc / (3 * twiceSigned);
                weightedCx += pcx * polyArea;
                weightedCy += pcy * polyArea;
                totalWeight += polyArea;
              } else {
                const avgX = pts.reduce((s, q) => s + q.xCm, 0) / pts.length;
                const avgY = pts.reduce((s, q) => s + q.yCm, 0) / pts.length;
                weightedCx += avgX;
                weightedCy += avgY;
                totalWeight += 1;
              }
            } else {
              const avgX = pts.reduce((s, q) => s + q.xCm, 0) / pts.length;
              const avgY = pts.reduce((s, q) => s + q.yCm, 0) / pts.length;
              weightedCx += avgX * Math.max(0.01, segSum);
              weightedCy += avgY * Math.max(0.01, segSum);
              totalWeight += Math.max(0.01, segSum);
            }
            break;
          }
        }
        const x1 = parseDimensionToCm(v.start_x) ?? 0;
        const y1 = parseDimensionToCm(v.start_y) ?? 0;
        const x2 = parseDimensionToCm(v.end_x) ?? 1;
        const y2 = parseDimensionToCm(v.end_y) ?? 1;
        const len = Math.hypot(x2 - x1, y2 - y1);
        totalLengthCm += len;
        const wt = Math.max(0.01, len);
        weightedCx += ((x1 + x2) / 2) * wt;
        weightedCy += ((y1 + y2) / 2) * wt;
        totalWeight += wt;
        pushBoundPt(x1, y1);
        pushBoundPt(x2, y2);
        break;
      }
      case 'cubic': {
        const p0 = { x: parseDimensionToCm(v.start_x) ?? 0, y: parseDimensionToCm(v.start_y) ?? 0 };
        const p1 = { x: parseDimensionToCm(v.control1_x) ?? 1, y: parseDimensionToCm(v.control1_y) ?? 1 };
        const p2 = { x: parseDimensionToCm(v.control2_x) ?? 2, y: parseDimensionToCm(v.control2_y) ?? 1 };
        const p3 = { x: parseDimensionToCm(v.end_x) ?? 3, y: parseDimensionToCm(v.end_y) ?? 0 };
        const len = cubicBezierArcLengthCm(p0, p1, p2, p3);
        totalLengthCm += len;
        const wt = Math.max(0.01, len);
        weightedCx += ((p0.x + p1.x + p2.x + p3.x) / 4) * wt;
        weightedCy += ((p0.y + p1.y + p2.y + p3.y) / 4) * wt;
        totalWeight += wt;
        [p0, p1, p2, p3].forEach((pt) => pushBoundPt(pt.x, pt.y));
        break;
      }
      case 'node': {
        const nx = parseDimensionToCm(v.x) ?? 2;
        const ny = parseDimensionToCm(v.y) ?? 2;
        weightedCx += nx * 0.1;
        weightedCy += ny * 0.1;
        totalWeight += 0.1;
        pushBoundPt(nx, ny);
        break;
      }
    }
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }

  const cx = totalWeight > 0 ? weightedCx / totalWeight : (minX + maxX) / 2;
  const cy = totalWeight > 0 ? weightedCy / totalWeight : (minY + maxY) / 2;

  return {
    count: primitives.length,
    hasClosedArea,
    totalLengthCm: +totalLengthCm.toFixed(3),
    perimeterCm: +perimeterCm.toFixed(3),
    areaCm2: +areaCm2.toFixed(3),
    areaMm2: +(areaCm2 * 100).toFixed(1),
    centroidCm: { x: +cx.toFixed(2), y: +cy.toFixed(2) },
    bboxCm: {
      minX: +minX.toFixed(2),
      minY: +minY.toFixed(2),
      maxX: +maxX.toFixed(2),
      maxY: +maxY.toFixed(2),
      width: +(maxX - minX).toFixed(2),
      height: +(maxY - minY).toFixed(2),
    },
  };
}

export function insertCentroidMarkerIntoSource(
  source: string,
  centroidCm: { x: number; y: number },
  labelLatex = 'C'
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  const fmt = (n: number) => `${n.toFixed(2)}cm`;
  const d = 0.14;
  const grp = `cent_${Date.now() % 10000}`;
  let cur = source;
  const ids: number[] = [];

  const hLine = insertOwnedPrimitiveIntoSource(cur, 'line', {
    start_x: fmt(centroidCm.x - d),
    start_y: fmt(centroidCm.y),
    end_x: fmt(centroidCm.x + d),
    end_y: fmt(centroidCm.y),
    stroke_color: 'red!75!black',
    stroke_width: 'thin',
    group_id: grp,
  });
  cur = hLine.nextSource;
  ids.push(hLine.newId);

  const vLine = insertOwnedPrimitiveIntoSource(cur, 'line', {
    start_x: fmt(centroidCm.x),
    start_y: fmt(centroidCm.y - d),
    end_x: fmt(centroidCm.x),
    end_y: fmt(centroidCm.y + d),
    stroke_color: 'red!75!black',
    stroke_width: 'thin',
    group_id: grp,
  });
  cur = vLine.nextSource;
  ids.push(vLine.newId);

  const nd = insertOwnedPrimitiveIntoSource(cur, 'node', {
    x: fmt(centroidCm.x + 0.16),
    y: fmt(centroidCm.y + 0.16),
    mode: 'math',
    content: labelLatex || 'C',
    stroke_color: 'red!75!black',
    group_id: grp,
  });
  cur = nd.nextSource;
  ids.push(nd.newId);

  return {
    nextSource: cur,
    insertedIds: ids,
    summaryRu: `Поставлен маркер центроида (${centroidCm.x.toFixed(2)}, ${centroidCm.y.toFixed(2)} см) → #${ids.join(', #')} (F06).`,
  };
}

// ============================================================================
// STAGE 3 (F07–F11): Preamble \tikzset Bridge, Magic Numbers, 2-Pt Calibration,
//                    2D Booleans & Selective Visual Diff Revert
// ============================================================================

export interface PreambleTikzStyleItem {
  name: string;
  definition: string;
  lineNumber: number;
}

/** F07: Parse custom \tikzset{styleName/.style={...}} styles declared in Preamble */
export function extractTikzsetStylesFromPreamble(source: string): PreambleTikzStyleItem[] {
  const split = splitTexDocumentIntoPreambleAndBody(source);
  const scanSlice = split.hasPreamble ? split.preambleText : source;
  const lines = scanSlice.split(/\r?\n/);
  const result: PreambleTikzStyleItem[] = [];
  const seen = new Set<string>();
  const styleRe = /([A-Za-z][A-Za-z0-9_-]{0,23})\s*\/\.style\s*=\s*\{([^{}]*)\}/g;

  lines.forEach((line, idx) => {
    if (line.trimStart().startsWith('%')) return;
    let m: RegExpExecArray | null;
    styleRe.lastIndex = 0;
    while ((m = styleRe.exec(line)) !== null) {
      const name = m[1];
      if (!seen.has(name)) {
        seen.add(name);
        result.push({
          name,
          definition: m[2].trim(),
          lineNumber: idx + 1,
        });
      }
    }
  });
  return result;
}

export function upsertQuickTikzsetStyleInPreamble(
  source: string,
  styleName: string,
  styleDefinition: string
): { ok: boolean; nextSource: string; cleanName: string; summaryRu: string } {
  const cleanName = styleName.replace(/[^A-Za-z0-9_-]/g, '').replace(/^[^A-Za-z]+/, '') || 'tzBlock';
  const cleanDef = styleDefinition.replace(/[\r\n%]/g, '').trim() || 'thick,draw=blue!75!black,fill=blue!8';
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const styleLine = `\\tikzset{${cleanName}/.style={${cleanDef}}}`;

  const lines = source.split(/\r?\n/);
  const existingIdx = lines.findIndex((l) =>
    new RegExp(`\\\\tikzset\\{\\s*${cleanName}\\s*\\/\\.style`).test(l)
  );

  if (existingIdx !== -1) {
    lines[existingIdx] = styleLine;
    return {
      ok: true,
      nextSource: lines.join(eol),
      cleanName,
      summaryRu: `Обновлён стиль преамбулы \\tikzset{${cleanName}/.style={${cleanDef}}} (F07).`,
    };
  }

  const beginDocIdx = lines.findIndex((l) => l.includes('\\begin{document}'));
  const insertAt = beginDocIdx !== -1 ? beginDocIdx : 0;
  lines.splice(insertAt, 0, styleLine);
  return {
    ok: true,
    nextSource: lines.join(eol),
    cleanName,
    summaryRu: `В окно Преамбулы добавлен стиль \\tikzset{${cleanName}/.style={...}} — доступен в Инспекторе (F07).`,
  };
}

/** F08: Detect repeated numeric literals in n1 primitives and parameterize into Preamble \pgfmathsetmacro */
export interface MagicNumberCandidate {
  valueCm: number;
  occurrencesCount: number;
  suggestedMacroName: string;
  occurrences: { primitiveId: number; paramKey: string; rawLiteral: string }[];
}

export function detectRepeatedMagicNumbers(
  source: string,
  targetIds?: number[]
): MagicNumberCandidate[] {
  const all = parseOwnedPrimitives(source);
  const subset =
    targetIds && targetIds.length > 0 ? all.filter((p) => targetIds.includes(p.id)) : all;

  const buckets = new Map<
    string,
    { valueCm: number; occurrences: { primitiveId: number; paramKey: string; rawLiteral: string }[] }
  >();

  const dimKeys = [
    'start_x',
    'start_y',
    'end_x',
    'end_y',
    'center_x',
    'center_y',
    'radius',
    'x',
    'y',
    'control1_x',
    'control1_y',
    'control2_x',
    'control2_y',
  ];

  for (const prim of subset) {
    for (const key of dimKeys) {
      const raw = prim.values[key];
      if (!raw) continue;
      const valCm = parseDimensionToCm(raw);
      if (valCm === null || Math.abs(valCm) < 0.05) continue;
      const rounded = +valCm.toFixed(2);
      const mapKey = rounded.toFixed(2);
      const entry = buckets.get(mapKey) ?? { valueCm: rounded, occurrences: [] };
      entry.occurrences.push({ primitiveId: prim.id, paramKey: key, rawLiteral: raw });
      buckets.set(mapKey, entry);
    }
  }

  const candidates: MagicNumberCandidate[] = [];
  let idx = 1;
  for (const entry of buckets.values()) {
    if (entry.occurrences.length < 2) continue;
    const firstKey = entry.occurrences[0].paramKey;
    const prefix = firstKey.includes('radius')
      ? 'Rad'
      : firstKey.endsWith('_x') || firstKey === 'x'
        ? 'PosX'
        : 'PosY';
    candidates.push({
      valueCm: entry.valueCm,
      occurrencesCount: entry.occurrences.length,
      suggestedMacroName: `${prefix}${idx++}`,
      occurrences: entry.occurrences,
    });
  }

  return candidates.sort((a, b) => b.occurrencesCount - a.occurrencesCount);
}

export function parameterizeMagicNumberIntoPreamble(
  source: string,
  candidate: MagicNumberCandidate,
  customMacroName?: string
): { ok: boolean; nextSource: string; macroName: string; summaryRu: string } {
  const macroName =
    (customMacroName ?? candidate.suggestedMacroName)
      .replace(/[^A-Za-z0-9]/g, '')
      .replace(/^[^A-Za-z]+/, '') || 'ParamA';
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const refsLabel = candidate.occurrences
    .slice(0, 4)
    .map((o) => `#${o.primitiveId}.${o.paramKey}`)
    .join(', ');
  const macroLine = `\\pgfmathsetmacro{\\${macroName}}{${candidate.valueCm.toFixed(2)}} % константа (${refsLabel})`;

  const lines = source.split(/\r?\n/);
  const existingIdx = lines.findIndex((l) =>
    new RegExp(`\\\\pgfmathsetmacro\\{\\\\${macroName}\\}`).test(l)
  );
  if (existingIdx !== -1) {
    lines[existingIdx] = macroLine;
  } else {
    const beginDocIdx = lines.findIndex((l) => l.includes('\\begin{document}'));
    const tikzIdx = lines.findIndex((l) => l.includes('\\begin{tikzpicture}'));
    const insertAt = beginDocIdx !== -1 ? beginDocIdx : tikzIdx !== -1 ? tikzIdx : 0;
    lines.splice(insertAt, 0, macroLine);
  }

  return {
    ok: true,
    nextSource: lines.join(eol),
    macroName,
    summaryRu: `Константа ${candidate.valueCm.toFixed(2)} см (${candidate.occurrencesCount} вхожд.) вынесена в Преамбулу как \\${macroName} (F08).`,
  };
}

/** F09: Two-Point Reference Scale Calibration */
export function calibratePrimitivesByTwoPointsInSource(
  source: string,
  p1Cm: { x: number; y: number },
  p2Cm: { x: number; y: number },
  targetDistanceCm: number,
  targetIds?: number[]
): { ok: boolean; nextSource: string; scaleFactor: number; updatedCount: number; summaryRu: string } {
  const measuredDist = Math.hypot(p2Cm.x - p1Cm.x, p2Cm.y - p1Cm.y);
  if (measuredDist < 1e-3 || targetDistanceCm <= 0.01) {
    return {
      ok: false,
      nextSource: source,
      scaleFactor: 1,
      updatedCount: 0,
      summaryRu: 'Укажите две несовпадающие эталонные точки и положительную целевую длину.',
    };
  }
  const k = targetDistanceCm / measuredDist;
  const all = parseOwnedPrimitives(source);
  const idsToScale =
    targetIds && targetIds.length > 0 ? new Set(targetIds) : new Set(all.map((p) => p.id));

  const scaleX = (x: number) => Math.max(-48, Math.min(48, +(p1Cm.x + (x - p1Cm.x) * k).toFixed(2)));
  const scaleY = (y: number) => Math.max(-48, Math.min(48, +(p1Cm.y + (y - p1Cm.y) * k).toFixed(2)));
  const fmt = (n: number) => `${n.toFixed(2)}cm`;

  let cur = source;
  let updatedCount = 0;

  for (const orig of all) {
    if (!idsToScale.has(orig.id)) continue;
    const p = parseOwnedPrimitives(cur).find((item) => item.id === orig.id);
    if (!p) continue;
    const v = { ...p.values };

    switch (p.tool) {
      case 'line':
      case 'arrow':
      case 'rectangle': {
        const sx = parseDimensionToCm(v.start_x) ?? 0;
        const sy = parseDimensionToCm(v.start_y) ?? 0;
        const ex = parseDimensionToCm(v.end_x) ?? 1;
        const ey = parseDimensionToCm(v.end_y) ?? 1;
        v.start_x = fmt(scaleX(sx));
        v.start_y = fmt(scaleY(sy));
        v.end_x = fmt(scaleX(ex));
        v.end_y = fmt(scaleY(ey));
        if (v.poly_points) {
          const pts = parsePolyPointsList(v.poly_points).map((pt) => ({
            xCm: scaleX(pt.xCm),
            yCm: scaleY(pt.yCm),
          }));
          if (pts.length >= 2) {
            v.poly_points = serializePolyPointsList(pts);
            v.start_x = fmt(pts[0].xCm);
            v.start_y = fmt(pts[0].yCm);
            v.end_x = fmt(pts[1].xCm);
            v.end_y = fmt(pts[1].yCm);
          }
        }
        break;
      }
      case 'circle': {
        const cx = parseDimensionToCm(v.center_x) ?? 2;
        const cy = parseDimensionToCm(v.center_y) ?? 1.5;
        const r = parseDimensionToCm(v.radius) ?? 0.5;
        v.center_x = fmt(scaleX(cx));
        v.center_y = fmt(scaleY(cy));
        v.radius = fmt(Math.max(0.08, +(r * k).toFixed(2)));
        break;
      }
      case 'cubic': {
        v.start_x = fmt(scaleX(parseDimensionToCm(v.start_x) ?? 0));
        v.start_y = fmt(scaleY(parseDimensionToCm(v.start_y) ?? 0));
        v.control1_x = fmt(scaleX(parseDimensionToCm(v.control1_x) ?? 1));
        v.control1_y = fmt(scaleY(parseDimensionToCm(v.control1_y) ?? 1));
        v.control2_x = fmt(scaleX(parseDimensionToCm(v.control2_x) ?? 2));
        v.control2_y = fmt(scaleY(parseDimensionToCm(v.control2_y) ?? 1));
        v.end_x = fmt(scaleX(parseDimensionToCm(v.end_x) ?? 3));
        v.end_y = fmt(scaleY(parseDimensionToCm(v.end_y) ?? 0));
        break;
      }
      case 'node': {
        v.x = fmt(scaleX(parseDimensionToCm(v.x) ?? 2));
        v.y = fmt(scaleY(parseDimensionToCm(v.y) ?? 2));
        break;
      }
    }

    cur = applyOwnedPrimitivePatch(cur, p.id, v);
    updatedCount++;
  }

  return {
    ok: updatedCount > 0,
    nextSource: cur,
    scaleFactor: +k.toFixed(4),
    updatedCount,
    summaryRu: `Калибровка по 2 точкам: ${measuredDist.toFixed(2)} см → ${targetDistanceCm.toFixed(2)} см (×${k.toFixed(3)}, обновлено ${updatedCount} объектов · F09).`,
  };
}

/** F10: 2D Boolean Operations (Union ∪, Difference \, Intersection ∩, XOR ⊕) & Common Tangents */
export type BooleanOpKind = 'union' | 'difference' | 'intersection' | 'xor';

interface Pt2 {
  x: number;
  y: number;
}

function ensureCcwRing(pts: Pt2[]): Pt2[] {
  if (pts.length < 3) return pts;
  let signed2 = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    signed2 += a.x * b.y - b.x * a.y;
  }
  return signed2 < 0 ? [...pts].reverse() : [...pts];
}

export function primitiveToClosedPolygonRing(prim: OwnedPrimitive, circleSteps = 32): Pt2[] | null {
  const v = prim.values;
  if (prim.tool === 'rectangle') {
    const x1 = parseDimensionToCm(v.start_x) ?? 0;
    const y1 = parseDimensionToCm(v.start_y) ?? 0;
    const x2 = parseDimensionToCm(v.end_x) ?? 1;
    const y2 = parseDimensionToCm(v.end_y) ?? 1;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    if (maxX - minX < 0.02 || maxY - minY < 0.02) return null;
    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
  }
  if (prim.tool === 'circle') {
    const cx = parseDimensionToCm(v.center_x) ?? 2;
    const cy = parseDimensionToCm(v.center_y) ?? 1.5;
    const r = Math.max(0.08, parseDimensionToCm(v.radius) ?? 0.5);
    const pts: Pt2[] = [];
    for (let i = 0; i < circleSteps; i++) {
      const th = (2 * Math.PI * i) / circleSteps;
      pts.push({ x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) });
    }
    return pts;
  }
  if ((prim.tool === 'line' || prim.tool === 'arrow') && v.poly_points) {
    const pts = parsePolyPointsList(v.poly_points).map((p) => ({ x: p.xCm, y: p.yCm }));
    if (pts.length >= 3) return ensureCcwRing(pts);
  }
  return null;
}

function pointInPolygon(pt: Pt2, ring: Pt2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].x;
    const yi = ring[i].y;
    const xj = ring[j].x;
    const yj = ring[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function segSegmentIntersectionParam(a1: Pt2, a2: Pt2, b1: Pt2, b2: Pt2): number | null {
  const rX = a2.x - a1.x;
  const rY = a2.y - a1.y;
  const sX = b2.x - b1.x;
  const sY = b2.y - b1.y;
  const denom = rX * sY - rY * sX;
  if (Math.abs(denom) < 1e-8) return null;
  const qpX = b1.x - a1.x;
  const qpY = b1.y - a1.y;
  const t = (qpX * sY - qpY * sX) / denom;
  const u = (qpX * rY - qpY * rX) / denom;
  if (t > 1e-5 && t < 1 - 1e-5 && u >= -1e-5 && u <= 1 + 1e-5) {
    return t;
  }
  return null;
}

interface DirectedEdge {
  from: Pt2;
  to: Pt2;
  used: boolean;
}

function subdivideAndFilterEdges(
  subjRing: Pt2[],
  clipRing: Pt2[],
  keepInsideClip: boolean,
  reverseKept: boolean
): DirectedEdge[] {
  const out: DirectedEdge[] = [];
  for (let i = 0; i < subjRing.length; i++) {
    const a1 = subjRing[i];
    const a2 = subjRing[(i + 1) % subjRing.length];
    const params: number[] = [0, 1];
    for (let j = 0; j < clipRing.length; j++) {
      const b1 = clipRing[j];
      const b2 = clipRing[(j + 1) % clipRing.length];
      const t = segSegmentIntersectionParam(a1, a2, b1, b2);
      if (t !== null) params.push(t);
    }
    params.sort((x, y) => x - y);
    // Deduplicate close parameters
    const uniq: number[] = [params[0]];
    for (let k = 1; k < params.length; k++) {
      if (params[k] - uniq[uniq.length - 1] > 1e-4) {
        uniq.push(params[k]);
      }
    }
    for (let k = 0; k < uniq.length - 1; k++) {
      const t0 = uniq[k];
      const t1 = uniq[k + 1];
      const pStart = { x: a1.x + (a2.x - a1.x) * t0, y: a1.y + (a2.y - a1.y) * t0 };
      const pEnd = { x: a1.x + (a2.x - a1.x) * t1, y: a1.y + (a2.y - a1.y) * t1 };
      if (Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y) < 1e-3) continue;
      const mid = { x: (pStart.x + pEnd.x) / 2, y: (pStart.y + pEnd.y) / 2 };
      const isIn = pointInPolygon(mid, clipRing);
      if (isIn === keepInsideClip) {
        out.push({
          from: reverseKept ? pEnd : pStart,
          to: reverseKept ? pStart : pEnd,
          used: false,
        });
      }
    }
  }
  return out;
}

function chainDirectedEdgesToLoops(edges: DirectedEdge[]): Pt2[][] {
  const loops: Pt2[][] = [];
  const eps = 0.025;

  for (let i = 0; i < edges.length; i++) {
    if (edges[i].used) continue;
    edges[i].used = true;
    const ring: Pt2[] = [edges[i].from];
    let curEnd = edges[i].to;
    let safety = 0;

    while (safety++ < edges.length + 4) {
      if (Math.hypot(curEnd.x - ring[0].x, curEnd.y - ring[0].y) <= eps && ring.length >= 3) {
        break;
      }
      let bestIdx = -1;
      let bestDist = eps;
      for (let j = 0; j < edges.length; j++) {
        if (edges[j].used) continue;
        const d = Math.hypot(edges[j].from.x - curEnd.x, edges[j].from.y - curEnd.y);
        if (d <= bestDist) {
          bestDist = d;
          bestIdx = j;
        }
      }
      if (bestIdx === -1) break;
      edges[bestIdx].used = true;
      ring.push(edges[bestIdx].from);
      curEnd = edges[bestIdx].to;
    }

    if (ring.length >= 3) {
      // Simplify nearly collinear / tiny duplicate vertices
      const cleaned: Pt2[] = [];
      for (const pt of ring) {
        const prev = cleaned[cleaned.length - 1];
        if (!prev || Math.hypot(pt.x - prev.x, pt.y - prev.y) >= 0.02) {
          cleaned.push({ x: +pt.x.toFixed(2), y: +pt.y.toFixed(2) });
        }
      }
      if (cleaned.length >= 3) {
        loops.push(cleaned);
      }
    }
  }
  return loops;
}

export function computeBooleanContourInSource(
  source: string,
  targetIds: number[],
  op: BooleanOpKind,
  options?: { replaceOriginals?: boolean; hatchPattern?: string; fillColor?: string }
): { ok: boolean; nextSource: string; insertedIds: number[]; summaryRu: string } {
  const all = parseOwnedPrimitives(source);
  const picked = targetIds
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is OwnedPrimitive => Boolean(p));

  if (picked.length < 2) {
    return {
      ok: false,
      nextSource: source,
      insertedIds: [],
      summaryRu: 'Выделите два замкнутых контура (прямоугольник, окружность или полигон -- cycle).',
    };
  }

  const ringA = primitiveToClosedPolygonRing(picked[0]);
  const ringB = primitiveToClosedPolygonRing(picked[1]);
  if (!ringA || !ringB) {
    return {
      ok: false,
      nextSource: source,
      insertedIds: [],
      summaryRu: 'Обе выбранные фигуры должны быть замкнутыми (rectangle, circle или line с cycle).',
    };
  }

  let loops: Pt2[][] = [];
  if (op === 'union') {
    const eA = subdivideAndFilterEdges(ringA, ringB, false, false);
    const eB = subdivideAndFilterEdges(ringB, ringA, false, false);
    loops = chainDirectedEdgesToLoops([...eA, ...eB]);
    if (loops.length === 0) loops = [ringA, ringB];
  } else if (op === 'intersection') {
    const eA = subdivideAndFilterEdges(ringA, ringB, true, false);
    const eB = subdivideAndFilterEdges(ringB, ringA, true, false);
    loops = chainDirectedEdgesToLoops([...eA, ...eB]);
  } else if (op === 'difference') {
    const eA = subdivideAndFilterEdges(ringA, ringB, false, false);
    const eB = subdivideAndFilterEdges(ringB, ringA, true, true);
    loops = chainDirectedEdgesToLoops([...eA, ...eB]);
  } else {
    // XOR = (A \ B) + (B \ A)
    const diffAB = chainDirectedEdgesToLoops([
      ...subdivideAndFilterEdges(ringA, ringB, false, false),
      ...subdivideAndFilterEdges(ringB, ringA, true, true),
    ]);
    const diffBA = chainDirectedEdgesToLoops([
      ...subdivideAndFilterEdges(ringB, ringA, false, false),
      ...subdivideAndFilterEdges(ringA, ringB, true, true),
    ]);
    loops = [...diffAB, ...diffBA];
  }

  if (loops.length === 0) {
    return {
      ok: false,
      nextSource: source,
      insertedIds: [],
      summaryRu: 'Результирующая область булевой операции пуста (фигуры не пересекаются).',
    };
  }

  let cur = source;
  if (options?.hatchPattern) {
    const lib = proposeLibraryConnect(cur, 'patterns');
    if (lib.ok) cur = lib.nextSource;
  }

  if (options?.replaceOriginals) {
    for (const oldP of [picked[0], picked[1]]) {
      const found = parseOwnedPrimitives(cur).find((x) => x.id === oldP.id);
      if (found) {
        let cutEnd = found.lineEndOffset;
        if (cur.slice(cutEnd, cutEnd + 2) === '\r\n') cutEnd += 2;
        else if (cur[cutEnd] === '\n') cutEnd += 1;
        cur = cur.slice(0, found.lineStartOffset) + cur.slice(cutEnd);
      }
    }
  }

  const insertedIds: number[] = [];
  for (const loop of loops) {
    const pts = loop.map((pt) => ({ xCm: +pt.x.toFixed(2), yCm: +pt.y.toFixed(2) }));
    const vals: Record<string, string> = {
      start_x: `${pts[0].xCm.toFixed(2)}cm`,
      start_y: `${pts[0].yCm.toFixed(2)}cm`,
      end_x: `${pts[1].xCm.toFixed(2)}cm`,
      end_y: `${pts[1].yCm.toFixed(2)}cm`,
      poly_points: serializePolyPointsList(pts),
      poly_closed: 'cycle',
      stroke_width: 'thick',
      stroke_color: 'blue!75!black',
    };
    if (options?.hatchPattern) {
      vals.hatch_pattern = options.hatchPattern;
    } else {
      vals.fill_color = options?.fillColor || 'cyan!10';
    }
    const res = insertOwnedPrimitiveIntoSource(cur, 'line', vals);
    cur = res.nextSource;
    insertedIds.push(res.newId);
  }

  const opNames: Record<BooleanOpKind, string> = {
    union: 'Объединение ∪',
    difference: 'Вычитание \\',
    intersection: 'Пересечение ∩',
    xor: 'Симм. разность ⊕',
  };

  return {
    ok: true,
    nextSource: cur,
    insertedIds,
    summaryRu: `${opNames[op]} (#${picked[0].id}, #${picked[1].id}) → построен замкнутый контур #${insertedIds.join(', #')} (F10).`,
  };
}

/** F10b: Analytic External & Internal Common Tangents to Circle(s) */
export function constructCircleTangentsInSource(
  source: string,
  targetIds: number[],
  tangentKind: 'outer' | 'inner' | 'both' = 'outer'
): { ok: boolean; nextSource: string; insertedIds: number[]; summaryRu: string } {
  const all = parseOwnedPrimitives(source);
  const circles = all.filter((p) => targetIds.includes(p.id) && p.tool === 'circle');
  const pointNodes = all.filter((p) => targetIds.includes(p.id) && p.tool === 'node');
  const fmt = (n: number) => `${n.toFixed(2)}cm`;

  // Case 1: Point (node) -> Circle tangents
  if (circles.length === 1 && pointNodes.length >= 1) {
    const c = circles[0];
    const pt = pointNodes[0];
    const cx = parseDimensionToCm(c.values.center_x) ?? 2;
    const cy = parseDimensionToCm(c.values.center_y) ?? 1.5;
    const r = Math.max(0.08, parseDimensionToCm(c.values.radius) ?? 0.5);
    const px = parseDimensionToCm(pt.values.x) ?? 0.5;
    const py = parseDimensionToCm(pt.values.y) ?? 0.5;
    const d = Math.hypot(px - cx, py - cy);
    if (d <= r + 1e-3) {
      return {
        ok: false,
        nextSource: source,
        insertedIds: [],
        summaryRu: 'Точка лежит внутри или на самой окружности — внешних касательных нет.',
      };
    }
    const baseAng = Math.atan2(py - cy, px - cx);
    const alpha = Math.acos(r / d);
    let cur = source;
    const ids: number[] = [];
    for (const sign of [1, -1]) {
      const th = baseAng + sign * alpha;
      const tx = cx + r * Math.cos(th);
      const ty = cy + r * Math.sin(th);
      const res = insertOwnedPrimitiveIntoSource(cur, 'line', {
        start_x: fmt(px),
        start_y: fmt(py),
        end_x: fmt(tx),
        end_y: fmt(ty),
        stroke_color: 'teal!80!black',
        stroke_width: 'semithick',
      });
      cur = res.nextSource;
      ids.push(res.newId);
    }
    return {
      ok: true,
      nextSource: cur,
      insertedIds: ids,
      summaryRu: `Построены 2 точные касательные из точки #${pt.id} к окружности #${c.id} → #${ids.join(', #')} (F10).`,
    };
  }

  // Case 2: Common tangents between 2 circles
  if (circles.length < 2) {
    return {
      ok: false,
      nextSource: source,
      insertedIds: [],
      summaryRu: 'Выделите две окружности (или узел-точку и окружность) для построения касательных.',
    };
  }

  const c1 = circles[0];
  const c2 = circles[1];
  const x1 = parseDimensionToCm(c1.values.center_x) ?? 1.5;
  const y1 = parseDimensionToCm(c1.values.center_y) ?? 1.8;
  const r1 = Math.max(0.08, parseDimensionToCm(c1.values.radius) ?? 0.6);
  const x2 = parseDimensionToCm(c2.values.center_x) ?? 4.2;
  const y2 = parseDimensionToCm(c2.values.center_y) ?? 1.8;
  const r2 = Math.max(0.08, parseDimensionToCm(c2.values.radius) ?? 0.4);

  const d = Math.hypot(x2 - x1, y2 - y1);
  if (d < 1e-3) {
    return {
      ok: false,
      nextSource: source,
      insertedIds: [],
      summaryRu: 'Центры окружностей совпадают — общих касательных не существует.',
    };
  }

  const phi = Math.atan2(y2 - y1, x2 - x1);
  let cur = source;
  const ids: number[] = [];

  if ((tangentKind === 'outer' || tangentKind === 'both') && d > Math.abs(r1 - r2) + 1e-3) {
    const alpha = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / d)));
    for (const sign of [1, -1]) {
      const th = phi + sign * alpha;
      const res = insertOwnedPrimitiveIntoSource(cur, 'line', {
        start_x: fmt(x1 + r1 * Math.cos(th)),
        start_y: fmt(y1 + r1 * Math.sin(th)),
        end_x: fmt(x2 + r2 * Math.cos(th)),
        end_y: fmt(y2 + r2 * Math.sin(th)),
        stroke_color: 'teal!80!black',
        stroke_width: 'semithick',
      });
      cur = res.nextSource;
      ids.push(res.newId);
    }
  }

  if ((tangentKind === 'inner' || tangentKind === 'both') && d > r1 + r2 + 1e-3) {
    const beta = Math.acos(Math.max(-1, Math.min(1, (r1 + r2) / d)));
    for (const sign of [1, -1]) {
      const th1 = phi + sign * beta;
      const th2 = th1 + Math.PI;
      const res = insertOwnedPrimitiveIntoSource(cur, 'line', {
        start_x: fmt(x1 + r1 * Math.cos(th1)),
        start_y: fmt(y1 + r1 * Math.sin(th1)),
        end_x: fmt(x2 + r2 * Math.cos(th2)),
        end_y: fmt(y2 + r2 * Math.sin(th2)),
        stroke_color: 'orange!85!black',
        line_style: 'dashed',
      });
      cur = res.nextSource;
      ids.push(res.newId);
    }
  }

  if (ids.length === 0) {
    return {
      ok: false,
      nextSource: source,
      insertedIds: [],
      summaryRu: 'Одна окружность вложена в другую или пересекается слишком близко для данного типа касательных.',
    };
  }

  return {
    ok: true,
    nextSource: cur,
    insertedIds: ids,
    summaryRu: `Построены точные общие касательные (${ids.length} шт.) между окружностями #${c1.id} и #${c2.id} (F10).`,
  };
}

/** F11: Visual Canvas Diff & Selective Single-Primitive Revert */
export interface VisualPrimitiveDiffReport {
  added: OwnedPrimitive[];
  removed: OwnedPrimitive[];
  modified: { before: OwnedPrimitive; current: OwnedPrimitive }[];
  totalChanges: number;
}

export function computeVisualPrimitiveDiff(
  beforeSource: string,
  currentSource: string
): VisualPrimitiveDiffReport {
  const oldList = parseOwnedPrimitives(beforeSource);
  const curList = parseOwnedPrimitives(currentSource);
  const oldMap = new Map<number, OwnedPrimitive>(oldList.map((p) => [p.id, p]));
  const curMap = new Map<number, OwnedPrimitive>(curList.map((p) => [p.id, p]));

  const added: OwnedPrimitive[] = [];
  const removed: OwnedPrimitive[] = [];
  const modified: { before: OwnedPrimitive; current: OwnedPrimitive }[] = [];

  for (const cur of curList) {
    const prev = oldMap.get(cur.id);
    if (!prev) {
      added.push(cur);
    } else if (
      prev.tool !== cur.tool ||
      JSON.stringify(prev.values) !== JSON.stringify(cur.values)
    ) {
      modified.push({ before: prev, current: cur });
    }
  }

  for (const prev of oldList) {
    if (!curMap.has(prev.id)) {
      removed.push(prev);
    }
  }

  return {
    added,
    removed,
    modified,
    totalChanges: added.length + removed.length + modified.length,
  };
}

export function revertSinglePrimitiveFromRevision(
  currentSource: string,
  beforeSource: string,
  primitiveId: number
): { ok: boolean; nextSource: string; summaryRu: string } {
  const oldPrim = parseOwnedPrimitives(beforeSource).find((p) => p.id === primitiveId);
  const curPrim = parseOwnedPrimitives(currentSource).find((p) => p.id === primitiveId);

  // Case A: Primitive was added in currentSource -> remove it
  if (!oldPrim && curPrim) {
    let cutEnd = curPrim.lineEndOffset;
    if (currentSource.slice(cutEnd, cutEnd + 2) === '\r\n') cutEnd += 2;
    else if (currentSource[cutEnd] === '\n') cutEnd += 1;
    const nextSource =
      currentSource.slice(0, curPrim.lineStartOffset) + currentSource.slice(cutEnd);
    return {
      ok: true,
      nextSource,
      summaryRu: `Откат F11: удалён добавленный объект #${primitiveId} без затрагивания остальной сцены.`,
    };
  }

  if (!oldPrim) {
    return {
      ok: false,
      nextSource: currentSource,
      summaryRu: `Объект #${primitiveId} не найден в выбранной ревизии.`,
    };
  }

  // Case B: Primitive was modified -> restore exact old values (preserving original ID!)
  if (curPrim) {
    const restoredLine = generateOwnedLine(oldPrim.id, oldPrim.tool, oldPrim.values, '  ');
    const nextSource =
      currentSource.slice(0, curPrim.lineStartOffset) +
      restoredLine +
      currentSource.slice(curPrim.lineEndOffset);
    return {
      ok: true,
      nextSource,
      summaryRu: `Точечный возврат F11: фигура #${primitiveId} возвращена к координатам ревизии.`,
    };
  }

  // Case C: Primitive was deleted -> re-insert its exact owned line with original ID before \end{tikzpicture}
  const eol = currentSource.includes('\r\n') ? '\r\n' : '\n';
  const restoredLine = generateOwnedLine(oldPrim.id, oldPrim.tool, oldPrim.values, '  ');
  const endTikzIdx = currentSource.lastIndexOf('\\end{tikzpicture}');
  if (endTikzIdx !== -1) {
    let lineStart = endTikzIdx;
    while (lineStart > 0 && currentSource[lineStart - 1] !== '\n') lineStart--;
    const nextSource =
      currentSource.slice(0, lineStart) + restoredLine + eol + currentSource.slice(lineStart);
    return {
      ok: true,
      nextSource,
      summaryRu: `Точечный возврат F11: удалённый объект #${primitiveId} восстановлен на холст.`,
    };
  }

  return {
    ok: true,
    nextSource: currentSource + (currentSource.endsWith('\n') ? '' : eol) + restoredLine + eol,
    summaryRu: `Точечный возврат F11: объект #${primitiveId} восстановлен.`,
  };
}

// ============================================================================
// STAGE 4 (F12–F16): Domain Engineering Generators on Live n1 & PGFPlots Stats
// ============================================================================

function ensureSiunitxInPreamble(source: string): string {
  if (source.includes('{siunitx}')) return source;
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  const beginDocIdx = lines.findIndex((l) => l.includes('\\begin{document}'));
  if (beginDocIdx > 0) {
    lines.splice(beginDocIdx, 0, '\\usepackage{siunitx}');
    return lines.join(eol);
  }
  return source;
}

export type CircuitElementKind =
  | 'resistor-gost'
  | 'resistor-ansi'
  | 'capacitor'
  | 'inductor'
  | 'diode'
  | 'vsource'
  | 'opamp-stage';

/** F12: Pure-TikZ Electrical Circuit Builder (ГОСТ ЕСКД & ANSI) on grouped live n1 primitives */
export function insertElectricalCircuitElementIntoSource(
  source: string,
  kind: CircuitElementKind,
  originCm: { x: number; y: number } = { x: 1.4, y: 2.0 },
  labelLatex = '\\qty{4.7}{\\kilo\\ohm}'
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  let cur = labelLatex.includes('\\qty') ? ensureSiunitxInPreamble(source) : source;
  const arrowsPlan = proposeLibraryConnect(cur, 'arrows.meta');
  if (arrowsPlan.ok) cur = arrowsPlan.nextSource;
  if (kind === 'inductor' || kind === 'resistor-ansi') {
    const decPlan = proposeLibraryConnect(cur, 'decorations.pathmorphing');
    if (decPlan.ok) cur = decPlan.nextSource;
  }

  const fmt = (n: number) => `${n.toFixed(2)}cm`;
  const x0 = originCm.x;
  const y0 = originCm.y;
  const grp = `ckt_${Date.now() % 10000}`;
  const ids: number[] = [];

  const pushPrim = (tool: ToolId, values: Record<string, string>) => {
    const res = insertOwnedPrimitiveIntoSource(cur, tool, { ...values, group_id: grp });
    cur = res.nextSource;
    ids.push(res.newId);
  };

  if (kind === 'resistor-gost') {
    pushPrim('line', { start_x: fmt(x0), start_y: fmt(y0), end_x: fmt(x0 + 0.55), end_y: fmt(y0), stroke_width: 'semithick' });
    pushPrim('rectangle', {
      start_x: fmt(x0 + 0.55),
      start_y: fmt(y0 - 0.18),
      end_x: fmt(x0 + 1.55),
      end_y: fmt(y0 + 0.18),
      stroke_width: 'thick',
      fill_color: 'none',
    });
    pushPrim('line', { start_x: fmt(x0 + 1.55), start_y: fmt(y0), end_x: fmt(x0 + 2.1), end_y: fmt(y0), stroke_width: 'semithick' });
    pushPrim('node', { x: fmt(x0 + 1.05), y: fmt(y0 + 0.38), mode: 'math', content: labelLatex || 'R_1' });
  } else if (kind === 'resistor-ansi') {
    pushPrim('line', { start_x: fmt(x0), start_y: fmt(y0), end_x: fmt(x0 + 0.5), end_y: fmt(y0), stroke_width: 'semithick' });
    pushPrim('line', {
      start_x: fmt(x0 + 0.5),
      start_y: fmt(y0),
      end_x: fmt(x0 + 1.6),
      end_y: fmt(y0),
      stroke_width: 'thick',
      decoration_kind: 'zigzag',
    });
    pushPrim('line', { start_x: fmt(x0 + 1.6), start_y: fmt(y0), end_x: fmt(x0 + 2.1), end_y: fmt(y0), stroke_width: 'semithick' });
    pushPrim('node', { x: fmt(x0 + 1.05), y: fmt(y0 + 0.36), mode: 'math', content: labelLatex || 'R_1' });
  } else if (kind === 'capacitor') {
    pushPrim('line', { start_x: fmt(x0), start_y: fmt(y0), end_x: fmt(x0 + 0.92), end_y: fmt(y0), stroke_width: 'semithick' });
    pushPrim('line', { start_x: fmt(x0 + 0.92), start_y: fmt(y0 - 0.32), end_x: fmt(x0 + 0.92), end_y: fmt(y0 + 0.32), stroke_width: 'very thick' });
    pushPrim('line', { start_x: fmt(x0 + 1.16), start_y: fmt(y0 - 0.32), end_x: fmt(x0 + 1.16), end_y: fmt(y0 + 0.32), stroke_width: 'very thick' });
    pushPrim('line', { start_x: fmt(x0 + 1.16), start_y: fmt(y0), end_x: fmt(x0 + 2.1), end_y: fmt(y0), stroke_width: 'semithick' });
    pushPrim('node', { x: fmt(x0 + 1.04), y: fmt(y0 + 0.5), mode: 'math', content: labelLatex || 'C_1' });
  } else if (kind === 'inductor') {
    pushPrim('line', { start_x: fmt(x0), start_y: fmt(y0), end_x: fmt(x0 + 0.45), end_y: fmt(y0), stroke_width: 'semithick' });
    pushPrim('line', {
      start_x: fmt(x0 + 0.45),
      start_y: fmt(y0),
      end_x: fmt(x0 + 1.65),
      end_y: fmt(y0),
      stroke_width: 'thick',
      decoration_kind: 'coil',
    });
    pushPrim('line', { start_x: fmt(x0 + 1.65), start_y: fmt(y0), end_x: fmt(x0 + 2.1), end_y: fmt(y0), stroke_width: 'semithick' });
    pushPrim('node', { x: fmt(x0 + 1.05), y: fmt(y0 + 0.38), mode: 'math', content: labelLatex || 'L_1' });
  } else if (kind === 'diode') {
    pushPrim('line', { start_x: fmt(x0), start_y: fmt(y0), end_x: fmt(x0 + 0.75), end_y: fmt(y0), stroke_width: 'semithick' });
    const triPts = [
      { xCm: +(x0 + 0.75).toFixed(2), yCm: +(y0 - 0.26).toFixed(2) },
      { xCm: +(x0 + 0.75).toFixed(2), yCm: +(y0 + 0.26).toFixed(2) },
      { xCm: +(x0 + 1.3).toFixed(2), yCm: +y0.toFixed(2) },
    ];
    pushPrim('line', {
      start_x: fmt(triPts[0].xCm),
      start_y: fmt(triPts[0].yCm),
      end_x: fmt(triPts[1].xCm),
      end_y: fmt(triPts[1].yCm),
      poly_points: serializePolyPointsList(triPts),
      poly_closed: 'cycle',
      stroke_width: 'thick',
      fill_color: 'slate!12',
    });
    pushPrim('line', { start_x: fmt(x0 + 1.3), start_y: fmt(y0 - 0.28), end_x: fmt(x0 + 1.3), end_y: fmt(y0 + 0.28), stroke_width: 'thick' });
    pushPrim('line', { start_x: fmt(x0 + 1.3), start_y: fmt(y0), end_x: fmt(x0 + 2.05), end_y: fmt(y0), stroke_width: 'semithick' });
    pushPrim('node', { x: fmt(x0 + 1.05), y: fmt(y0 + 0.44), mode: 'math', content: labelLatex || 'VD_1' });
  } else if (kind === 'vsource') {
    pushPrim('line', { start_x: fmt(x0), start_y: fmt(y0), end_x: fmt(x0 + 0.65), end_y: fmt(y0), stroke_width: 'semithick' });
    pushPrim('circle', { center_x: fmt(x0 + 1.05), center_y: fmt(y0), radius: '0.40cm', stroke_width: 'thick' });
    pushPrim('arrow', {
      start_x: fmt(x0 + 0.82),
      start_y: fmt(y0),
      end_x: fmt(x0 + 1.28),
      end_y: fmt(y0),
      tip: 'Stealth',
      stroke_color: 'blue!75!black',
    });
    pushPrim('line', { start_x: fmt(x0 + 1.45), start_y: fmt(y0), end_x: fmt(x0 + 2.1), end_y: fmt(y0), stroke_width: 'semithick' });
    pushPrim('node', { x: fmt(x0 + 1.05), y: fmt(y0 + 0.58), mode: 'math', content: labelLatex || 'E_0' });
  } else {
    // Op-Amp stage with ground & input/output leads
    const opPts = [
      { xCm: +(x0 + 0.6).toFixed(2), yCm: +(y0 - 0.6).toFixed(2) },
      { xCm: +(x0 + 0.6).toFixed(2), yCm: +(y0 + 0.6).toFixed(2) },
      { xCm: +(x0 + 1.85).toFixed(2), yCm: +y0.toFixed(2) },
    ];
    pushPrim('line', {
      start_x: fmt(opPts[0].xCm),
      start_y: fmt(opPts[0].yCm),
      end_x: fmt(opPts[1].xCm),
      end_y: fmt(opPts[1].yCm),
      poly_points: serializePolyPointsList(opPts),
      poly_closed: 'cycle',
      stroke_width: 'thick',
      fill_color: 'blue!8',
    });
    pushPrim('line', { start_x: fmt(x0), start_y: fmt(y0 + 0.28), end_x: fmt(x0 + 0.6), end_y: fmt(y0 + 0.28), stroke_width: 'semithick' });
    pushPrim('line', { start_x: fmt(x0), start_y: fmt(y0 - 0.28), end_x: fmt(x0 + 0.6), end_y: fmt(y0 - 0.28), stroke_width: 'semithick' });
    pushPrim('line', { start_x: fmt(x0 + 1.85), start_y: fmt(y0), end_x: fmt(x0 + 2.45), end_y: fmt(y0), stroke_width: 'semithick' });
    pushPrim('node', { x: fmt(x0 + 0.82), y: fmt(y0 + 0.26), mode: 'math', content: '-' });
    pushPrim('node', { x: fmt(x0 + 0.82), y: fmt(y0 - 0.26), mode: 'math', content: '+' });
    pushPrim('node', { x: fmt(x0 + 1.25), y: fmt(y0 + 0.72), mode: 'math', content: labelLatex || 'DA_1' });
  }

  return {
    nextSource: cur,
    insertedIds: ids,
    summaryRu: `Добавлен элемент электрической цепи (${kind}, группа ${grp}, ${ids.length} n1 · F12).`,
  };
}

/** F13: Geometric Optics Bench & Paraxial Thin-Lens Ray Tracer */
export interface OpticalBenchConfig {
  focalLengthCm: number; // >0 converging, <0 diverging
  objectDistanceCm: number; // >0 distance left of lens
  objectHeightCm: number;
  lensXCm?: number;
  axisYCm?: number;
}

export function insertOpticalBenchRayTraceIntoSource(
  source: string,
  config: OpticalBenchConfig
): {
  nextSource: string;
  insertedIds: number[];
  imageDistanceCm: number | null;
  magnification: number | null;
  isVirtual: boolean;
  summaryRu: string;
} {
  let cur = source;
  const arrowsPlan = proposeLibraryConnect(cur, 'arrows.meta');
  if (arrowsPlan.ok) cur = arrowsPlan.nextSource;

  const lx = config.lensXCm ?? 3.1;
  const ay = config.axisYCm ?? 1.85;
  const f = Math.abs(config.focalLengthCm) < 0.2 ? 1.0 : config.focalLengthCm;
  const d = Math.max(0.35, config.objectDistanceCm);
  const h0 = Math.max(0.25, Math.min(1.4, config.objectHeightCm));
  const fmt = (n: number) => `${n.toFixed(2)}cm`;
  const grp = `opt_${Date.now() % 10000}`;
  const ids: number[] = [];

  const push = (tool: ToolId, values: Record<string, string>) => {
    const res = insertOwnedPrimitiveIntoSource(cur, tool, { ...values, group_id: grp });
    cur = res.nextSource;
    ids.push(res.newId);
  };

  // 1. Optical axis
  push('line', {
    start_x: fmt(0.35),
    start_y: fmt(ay),
    end_x: fmt(5.95),
    end_y: fmt(ay),
    line_style: 'dashed',
    stroke_color: 'black',
    stroke_width: 'thin',
  });

  // 2. Thin lens vertical line + focal ticks F
  const lensHalfH = Math.min(1.55, h0 + 0.55);
  push('arrow', {
    start_x: fmt(lx),
    start_y: fmt(ay - lensHalfH),
    end_x: fmt(lx),
    end_y: fmt(ay + lensHalfH),
    tip: 'Stealth',
    stroke_width: 'thick',
    stroke_color: 'blue!75!black',
  });
  const absF = Math.abs(f);
  push('node', { x: fmt(lx - absF), y: fmt(ay - 0.22), mode: 'math', content: 'F', stroke_color: 'blue!75!black' });
  push('node', { x: fmt(lx + absF), y: fmt(ay - 0.22), mode: 'math', content: "F'", stroke_color: 'blue!75!black' });

  // 3. Object arrow AB
  const objX = Math.max(0.45, lx - d);
  const effD = lx - objX;
  push('arrow', {
    start_x: fmt(objX),
    start_y: fmt(ay),
    end_x: fmt(objX),
    end_y: fmt(ay + h0),
    tip: 'Stealth',
    stroke_width: 'very thick',
    stroke_color: 'teal!80!black',
  });

  // Thin-lens equation: 1/f = 1/effD + 1/dPrime => dPrime = (f * effD) / (effD - f)
  const denom = effD - f;
  if (Math.abs(denom) < 0.04) {
    // Collimated beam (object at focus)
    push('arrow', {
      start_x: fmt(objX),
      start_y: fmt(ay + h0),
      end_x: fmt(lx),
      end_y: fmt(ay + h0),
      tip: 'Stealth',
      stroke_color: 'orange!85!black',
    });
    push('arrow', {
      start_x: fmt(lx),
      start_y: fmt(ay + h0),
      end_x: fmt(5.85),
      end_y: fmt(ay + h0 * (1 - (5.85 - lx) / f)),
      tip: 'Stealth',
      stroke_color: 'orange!85!black',
    });
    return {
      nextSource: cur,
      insertedIds: ids,
      imageDistanceCm: null,
      magnification: null,
      isVirtual: false,
      summaryRu: `Предмет в фокусе линзы (d = f = ${f.toFixed(2)} см) — построен параллельный пучок (${ids.length} n1 · F13).`,
    };
  }

  const dPrime = (f * effD) / denom;
  const mag = -dPrime / effD;
  const imgX = Math.max(0.3, Math.min(5.9, lx + dPrime));
  const imgY = Math.max(0.2, Math.min(3.6, ay + h0 * mag));
  const isVirtual = dPrime < 0;

  // Ray 1: Parallel to optical axis -> refracted towards image / F'
  push('line', {
    start_x: fmt(objX),
    start_y: fmt(ay + h0),
    end_x: fmt(lx),
    end_y: fmt(ay + h0),
    stroke_color: 'red!75!black',
    stroke_width: 'semithick',
  });

  if (!isVirtual) {
    push('arrow', {
      start_x: fmt(lx),
      start_y: fmt(ay + h0),
      end_x: fmt(imgX),
      end_y: fmt(imgY),
      tip: 'Stealth',
      stroke_color: 'red!75!black',
      stroke_width: 'semithick',
    });
    // Ray 2: Through optical center (lx, ay)
    push('arrow', {
      start_x: fmt(objX),
      start_y: fmt(ay + h0),
      end_x: fmt(imgX),
      end_y: fmt(imgY),
      tip: 'Stealth',
      stroke_color: 'orange!85!black',
      stroke_width: 'semithick',
    });
    // Real image arrow
    push('arrow', {
      start_x: fmt(imgX),
      start_y: fmt(ay),
      end_x: fmt(imgX),
      end_y: fmt(imgY),
      tip: 'Stealth',
      stroke_width: 'very thick',
      stroke_color: 'violet!80!black',
    });
  } else {
    // Outgoing diverging real ray to right + dashed backward trace to virtual image
    const outX = Math.min(5.9, lx + 1.8);
    const slope = (ay + h0 - imgY) / Math.max(0.1, lx - imgX);
    const outY = Math.max(0.2, Math.min(3.6, ay + h0 + slope * (outX - lx)));
    push('arrow', {
      start_x: fmt(lx),
      start_y: fmt(ay + h0),
      end_x: fmt(outX),
      end_y: fmt(outY),
      tip: 'Stealth',
      stroke_color: 'red!75!black',
    });
    push('line', {
      start_x: fmt(lx),
      start_y: fmt(ay + h0),
      end_x: fmt(imgX),
      end_y: fmt(imgY),
      line_style: 'dashed',
      stroke_color: 'red!75!black',
    });
    push('line', {
      start_x: fmt(objX),
      start_y: fmt(ay + h0),
      end_x: fmt(imgX),
      end_y: fmt(imgY),
      line_style: 'dashed',
      stroke_color: 'orange!85!black',
    });
    push('arrow', {
      start_x: fmt(imgX),
      start_y: fmt(ay),
      end_x: fmt(imgX),
      end_y: fmt(imgY),
      tip: 'Stealth',
      line_style: 'dashed',
      stroke_width: 'thick',
      stroke_color: 'violet!80!black',
    });
  }

  return {
    nextSource: cur,
    insertedIds: ids,
    imageDistanceCm: +dPrime.toFixed(2),
    magnification: +mag.toFixed(2),
    isVirtual,
    summaryRu: `Трассировка тонкой линзы (f=${f.toFixed(2)} см, d'=${dPrime.toFixed(2)} см, Γ=${mag.toFixed(2)}×, ${isVirtual ? 'мнимое' : 'действительное'}) → ${ids.length} n1 (F13).`,
  };
}

/** F14: Structural Mechanics Beam + Automatic Aligned Shear Q(x) & Bending Moment M(x) Diagrams */
export interface MechanicsBeamConfig {
  supportKind: 'simply-supported' | 'cantilever';
  spanLengthKnM: number; // physical span L in meters (mapped across 3.8 cm on canvas)
  pointLoadKn: number; // concentrated downward load F at mid-span (or free end)
  distributedLoadKnPerM: number; // uniform downward q across span
}

export function insertMechanicsBeamWithDiagramsIntoSource(
  source: string,
  config: MechanicsBeamConfig
): {
  nextSource: string;
  insertedIds: number[];
  maxShearKn: number;
  maxMomentKnM: number;
  summaryRu: string;
} {
  let cur = source;
  const arr = proposeLibraryConnect(cur, 'arrows.meta');
  if (arr.ok) cur = arr.nextSource;
  const pat = proposeLibraryConnect(cur, 'patterns');
  if (pat.ok) cur = pat.nextSource;

  const L = Math.max(1, config.spanLengthKnM);
  const F = Math.max(0, config.pointLoadKn);
  const q = Math.max(0, config.distributedLoadKnPerM);

  const xLeft = 1.25;
  const widthCm = 3.8;
  const xRight = xLeft + widthCm;
  const yBeam = 3.15;
  const yShear = 2.05;
  const yMoment = 0.9;
  const fmt = (n: number) => `${n.toFixed(2)}cm`;
  const grp = `beam_${Date.now() % 10000}`;
  const ids: number[] = [];

  const push = (tool: ToolId, values: Record<string, string>) => {
    const res = insertOwnedPrimitiveIntoSource(cur, tool, { ...values, group_id: grp });
    cur = res.nextSource;
    ids.push(res.newId);
  };

  // 1. Beam bar + vertical alignment guidelines
  push('line', {
    start_x: fmt(xLeft),
    start_y: fmt(yMoment - 0.45),
    end_x: fmt(xLeft),
    end_y: fmt(yBeam),
    line_style: 'dotted',
    stroke_color: 'black',
    stroke_width: 'thin',
  });
  push('line', {
    start_x: fmt(xRight),
    start_y: fmt(yMoment - 0.45),
    end_x: fmt(xRight),
    end_y: fmt(yBeam),
    line_style: 'dotted',
    stroke_color: 'black',
    stroke_width: 'thin',
  });
  push('line', {
    start_x: fmt(xLeft),
    start_y: fmt(yBeam),
    end_x: fmt(xRight),
    end_y: fmt(yBeam),
    stroke_width: 'very thick',
    stroke_color: 'black',
  });

  // Supports
  if (config.supportKind === 'simply-supported') {
    const pinA = [
      { xCm: xLeft, yCm: yBeam },
      { xCm: +(xLeft - 0.16).toFixed(2), yCm: +(yBeam - 0.24).toFixed(2) },
      { xCm: +(xLeft + 0.16).toFixed(2), yCm: +(yBeam - 0.24).toFixed(2) },
    ];
    push('line', {
      start_x: fmt(pinA[0].xCm),
      start_y: fmt(pinA[0].yCm),
      end_x: fmt(pinA[1].xCm),
      end_y: fmt(pinA[1].yCm),
      poly_points: serializePolyPointsList(pinA),
      poly_closed: 'cycle',
      fill_color: 'slate!12',
    });
    push('circle', {
      center_x: fmt(xRight),
      center_y: fmt(yBeam - 0.13),
      radius: '0.12cm',
      fill_color: 'slate!12',
    });
  } else {
    // Cantilever fixed wall at xLeft
    push('line', {
      start_x: fmt(xLeft),
      start_y: fmt(yBeam - 0.36),
      end_x: fmt(xLeft),
      end_y: fmt(yBeam + 0.36),
      stroke_width: 'very thick',
    });
    for (let k = -2; k <= 2; k++) {
      const yy = yBeam + k * 0.14;
      push('line', {
        start_x: fmt(xLeft),
        start_y: fmt(yy),
        end_x: fmt(xLeft - 0.16),
        end_y: fmt(yy - 0.12),
        stroke_width: 'thin',
      });
    }
  }

  // Loads arrows
  if (q > 0) {
    for (let i = 0; i <= 4; i++) {
      const lx = xLeft + (widthCm * i) / 4;
      push('arrow', {
        start_x: fmt(lx),
        start_y: fmt(yBeam + 0.34),
        end_x: fmt(lx),
        end_y: fmt(yBeam + 0.03),
        tip: 'Stealth',
        stroke_color: 'blue!75!black',
      });
    }
    push('line', {
      start_x: fmt(xLeft),
      start_y: fmt(yBeam + 0.34),
      end_x: fmt(xRight),
      end_y: fmt(yBeam + 0.34),
      stroke_color: 'blue!75!black',
    });
  }
  if (F > 0) {
    const fx = config.supportKind === 'simply-supported' ? (xLeft + xRight) / 2 : xRight;
    push('arrow', {
      start_x: fmt(fx),
      start_y: fmt(yBeam + 0.56),
      end_x: fmt(fx),
      end_y: fmt(yBeam + 0.03),
      tip: 'Stealth',
      stroke_width: 'thick',
      stroke_color: 'red!75!black',
    });
    push('node', { x: fmt(fx + 0.25), y: fmt(yBeam + 0.48), mode: 'math', content: 'F', stroke_color: 'red!75!black' });
  }

  // Compute exact Q(x) and M(x) across 16 stations
  const N = 16;
  const xsPhys: number[] = [];
  const qVals: number[] = [];
  const mVals: number[] = [];

  for (let i = 0; i <= N; i++) {
    const xi = (L * i) / N;
    xsPhys.push(xi);
    if (config.supportKind === 'simply-supported') {
      const Ra = (q * L) / 2 + F / 2;
      const stepF = xi >= L / 2 ? F : 0;
      const Qi = Ra - q * xi - stepF;
      const Mi = Ra * xi - 0.5 * q * xi * xi - (xi > L / 2 ? F * (xi - L / 2) : 0);
      qVals.push(Qi);
      mVals.push(Mi);
    } else {
      // Cantilever fixed at x=0, free at x=L: Q(x) = q*(L-x) + F, M(x) = -0.5*q*(L-x)^2 - F*(L-x)
      const rem = L - xi;
      qVals.push(q * rem + F);
      mVals.push(-0.5 * q * rem * rem - F * rem);
    }
  }

  const maxAbsQ = Math.max(0.01, ...qVals.map((v) => Math.abs(v)));
  const maxAbsM = Math.max(0.01, ...mVals.map((v) => Math.abs(v)));
  const ampCm = 0.42;

  // Baseline + Hatched Polygon for Q(x)
  push('line', { start_x: fmt(xLeft), start_y: fmt(yShear), end_x: fmt(xRight), end_y: fmt(yShear), stroke_width: 'semithick' });
  const qPoly: { xCm: number; yCm: number }[] = [{ xCm: xLeft, yCm: yShear }];
  for (let i = 0; i <= N; i++) {
    const gx = +(xLeft + (widthCm * i) / N).toFixed(2);
    const gy = +(yShear + (qVals[i] / maxAbsQ) * ampCm).toFixed(2);
    qPoly.push({ xCm: gx, yCm: gy });
  }
  qPoly.push({ xCm: xRight, yCm: yShear });
  push('line', {
    start_x: fmt(qPoly[0].xCm),
    start_y: fmt(qPoly[0].yCm),
    end_x: fmt(qPoly[1].xCm),
    end_y: fmt(qPoly[1].yCm),
    poly_points: serializePolyPointsList(qPoly),
    poly_closed: 'cycle',
    stroke_color: 'teal!80!black',
    hatch_pattern: 'north east lines',
  });
  push('node', {
    x: fmt(xLeft - 0.48),
    y: fmt(yShear + 0.15),
    mode: 'math',
    content: `Q_{\\max}=${maxAbsQ.toFixed(1)}`,
    stroke_color: 'teal!80!black',
  });

  // Baseline + Hatched Polygon for M(x)
  push('line', { start_x: fmt(xLeft), start_y: fmt(yMoment), end_x: fmt(xRight), end_y: fmt(yMoment), stroke_width: 'semithick' });
  const mPoly: { xCm: number; yCm: number }[] = [{ xCm: xLeft, yCm: yMoment }];
  for (let i = 0; i <= N; i++) {
    const gx = +(xLeft + (widthCm * i) / N).toFixed(2);
    const gy = +(yMoment + (mVals[i] / maxAbsM) * ampCm).toFixed(2);
    mPoly.push({ xCm: gx, yCm: gy });
  }
  mPoly.push({ xCm: xRight, yCm: yMoment });
  push('line', {
    start_x: fmt(mPoly[0].xCm),
    start_y: fmt(mPoly[0].yCm),
    end_x: fmt(mPoly[1].xCm),
    end_y: fmt(mPoly[1].yCm),
    poly_points: serializePolyPointsList(mPoly),
    poly_closed: 'cycle',
    stroke_color: 'orange!85!black',
    hatch_pattern: 'north west lines',
  });
  push('node', {
    x: fmt(xLeft - 0.48),
    y: fmt(yMoment + 0.15),
    mode: 'math',
    content: `M_{\\max}=${maxAbsM.toFixed(1)}`,
    stroke_color: 'orange!85!black',
  });

  return {
    nextSource: cur,
    insertedIds: ids,
    maxShearKn: +maxAbsQ.toFixed(2),
    maxMomentKnM: +maxAbsM.toFixed(2),
    summaryRu: `Построена расчётная схема балки и эпюры Qmax=${maxAbsQ.toFixed(1)} кН, Mmax=${maxAbsM.toFixed(1)} кН·м (${ids.length} n1 · F14).`,
  };
}

/** F15: ГОСТ 19.701 Flowchart Auto-Layout & Scientific Gantt Chart */
export function insertGostFlowchartAutoLayoutIntoSource(
  source: string,
  stepsDsl: string,
  layoutDir: 'vertical' | 'horizontal' = 'horizontal'
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  let cur = source;
  const arr = proposeLibraryConnect(cur, 'arrows.meta');
  if (arr.ok) cur = arr.nextSource;

  const steps = stepsDsl
    .split(/->|→|\r?\n/)
    .map((s) => s.replace(/[%{}]/g, '').trim())
    .filter(Boolean)
    .slice(0, 6);

  if (steps.length < 2) {
    steps.push('Начало', 'Расчёт модели', 'Сходимость?', 'Конец');
  }

  const fmt = (n: number) => `${n.toFixed(2)}cm`;
  const grp = `flow_${Date.now() % 10000}`;
  const ids: number[] = [];
  const nodeRefs: { nodeId: string; cx: number; cy: number }[] = [];

  const push = (tool: ToolId, values: Record<string, string>) => {
    const res = insertOwnedPrimitiveIntoSource(cur, tool, { ...values, group_id: grp });
    cur = res.nextSource;
    ids.push(res.newId);
  };

  const bw = 0.92;
  const bh = 0.42;

  steps.forEach((label, idx) => {
    const cx =
      layoutDir === 'horizontal'
        ? 0.85 + (idx * 4.5) / Math.max(1, steps.length - 1)
        : 3.1;
    const cy =
      layoutDir === 'horizontal'
        ? 2.0
        : 3.3 - (idx * 2.7) / Math.max(1, steps.length - 1);

    const isTerminator = idx === 0 || idx === steps.length - 1;
    const isDecision = label.endsWith('?');
    const nodeId = `FStep${idx + 1}`;

    if (isDecision) {
      const diamond = [
        { xCm: +cx.toFixed(2), yCm: +(cy + bh * 0.8).toFixed(2) },
        { xCm: +(cx + bw * 0.62).toFixed(2), yCm: +cy.toFixed(2) },
        { xCm: +cx.toFixed(2), yCm: +(cy - bh * 0.8).toFixed(2) },
        { xCm: +(cx - bw * 0.62).toFixed(2), yCm: +cy.toFixed(2) },
      ];
      push('line', {
        start_x: fmt(diamond[0].xCm),
        start_y: fmt(diamond[0].yCm),
        end_x: fmt(diamond[1].xCm),
        end_y: fmt(diamond[1].yCm),
        poly_points: serializePolyPointsList(diamond),
        poly_closed: 'cycle',
        stroke_width: 'thick',
        stroke_color: 'orange!85!black',
        fill_color: 'amber!14',
      });
    } else {
      push('rectangle', {
        start_x: fmt(cx - bw / 2),
        start_y: fmt(cy - bh / 2),
        end_x: fmt(cx + bw / 2),
        end_y: fmt(cy + bh / 2),
        stroke_width: 'thick',
        stroke_color: isTerminator ? 'teal!80!black' : 'blue!75!black',
        fill_color: isTerminator ? 'emerald!10' : 'blue!8',
        ...(isTerminator ? { rounded_corners: '5pt' } : {}),
      });
    }

    push('node', {
      x: fmt(cx),
      y: fmt(cy),
      mode: 'text',
      content: label.slice(0, 18),
      node_id: nodeId,
    });
    nodeRefs.push({ nodeId, cx, cy });
  });

  for (let i = 0; i < nodeRefs.length - 1; i++) {
    const a = nodeRefs[i];
    const b = nodeRefs[i + 1];
    push('arrow', {
      start_x: fmt(a.cx),
      start_y: fmt(a.cy),
      end_x: fmt(b.cx),
      end_y: fmt(b.cy),
      tip: 'Stealth',
      from_node: a.nodeId,
      to_node: b.nodeId,
      stroke_width: 'semithick',
    });
  }

  return {
    nextSource: cur,
    insertedIds: ids,
    summaryRu: `Авто-укладка блок-схемы ГОСТ 19.701 (${steps.length} блоков, привязка from_node→to_node · F15).`,
  };
}

export function insertScientificGanttChartIntoSource(
  source: string,
  tasksRaw: string
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  const rows = tasksRaw
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((row) => {
      const parts = row.split(/[;,|]/).map((s) => s.trim());
      const title = (parts[0] || 'Этап НИР').replace(/[%{}]/g, '').slice(0, 20);
      const startQ = Math.max(1, Math.min(8, Number(parts[1]) || 1));
      const endQ = Math.max(startQ, Math.min(8, Number(parts[2]) || startQ + 1));
      return { title, startQ, endQ };
    })
    .slice(0, 5);

  if (rows.length === 0) {
    rows.push(
      { title: '1. Теория', startQ: 1, endQ: 2 },
      { title: '2. Стенд', startQ: 2, endQ: 4 },
      { title: '3. Статья', startQ: 4, endQ: 6 }
    );
  }

  const maxSlot = Math.max(4, ...rows.map((r) => r.endQ));
  const xStart = 2.05;
  const chartW = 3.75;
  const yTop = 3.25;
  const rowStep = Math.min(0.55, 2.35 / Math.max(1, rows.length));
  const fmt = (n: number) => `${n.toFixed(2)}cm`;
  const grp = `gantt_${Date.now() % 10000}`;
  let cur = source;
  const ids: number[] = [];

  const push = (tool: ToolId, values: Record<string, string>) => {
    const res = insertOwnedPrimitiveIntoSource(cur, tool, { ...values, group_id: grp });
    cur = res.nextSource;
    ids.push(res.newId);
  };

  // Outer frame & vertical slot dividers
  const yBottom = yTop - rows.length * rowStep - 0.15;
  push('rectangle', {
    start_x: fmt(xStart),
    start_y: fmt(yBottom),
    end_x: fmt(xStart + chartW),
    end_y: fmt(yTop),
    stroke_color: 'black',
  });

  for (let q = 1; q <= maxSlot; q++) {
    const qx = xStart + ((q - 0.5) * chartW) / maxSlot;
    push('node', {
      x: fmt(qx),
      y: fmt(yTop + 0.18),
      mode: 'text',
      content: `Кв.${q}`,
    });
  }

  const paletteFills = ['oiBlue!12', 'oiBluishGreen!12', 'oiOrange!14', 'cyan!10', 'amber!14'];
  const paletteStrokes = ['oiBlue', 'oiBluishGreen', 'oiOrange', 'blue!75!black', 'teal!80!black'];

  rows.forEach((task, i) => {
    const yc = yTop - (i + 0.6) * rowStep;
    const bx1 = xStart + ((task.startQ - 1) * chartW) / maxSlot + 0.04;
    const bx2 = xStart + (task.endQ * chartW) / maxSlot - 0.04;
    push('node', {
      x: fmt(xStart - 0.12),
      y: fmt(yc),
      mode: 'text',
      content: task.title,
      anchor: 'right',
    });
    push('rectangle', {
      start_x: fmt(bx1),
      start_y: fmt(yc - rowStep * 0.28),
      end_x: fmt(Math.max(bx1 + 0.15, bx2)),
      end_y: fmt(yc + rowStep * 0.28),
      stroke_color: paletteStrokes[i % paletteStrokes.length],
      fill_color: paletteFills[i % paletteFills.length],
      rounded_corners: '2pt',
    });
  });

  return {
    nextSource: cur,
    insertedIds: ids,
    summaryRu: `Построена научная диаграмма Ганта (${rows.length} этапов НИР · ${ids.length} n1 · F15).`,
  };
}

/** F16: OLS Least-Squares Regression (Linear / Quadratic / Exponential + R² + ±σ Band) & BoxPlot/Histogram */
export type RegressionModelKind = 'linear' | 'quadratic' | 'exponential';

export interface RegressionFitResult {
  nextSource: string;
  insertedIds: number[];
  rSquared: number;
  rmseSigma: number;
  equationLatex: string;
  summaryRu: string;
}

function solve3x3(A: number[][], b: number[]): [number, number, number] {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    [M[col], M[piv]] = [M[piv], M[col]];
    const diag = M[col][col] || 1e-9;
    for (let j = col; j <= 3; j++) M[col][j] /= diag;
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let j = col; j <= 3; j++) M[r][j] -= factor * M[col][j];
    }
  }
  return [M[0][3], M[1][3], M[2][3]];
}

export function insertLeastSquaresFitIntoSource(
  source: string,
  rawDataText: string,
  modelKind: RegressionModelKind = 'linear'
): RegressionFitResult {
  const pts: { x: number; y: number }[] = [];
  rawDataText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .forEach((row) => {
      const cols = row.split(/[;,\t\s]+/).filter(Boolean);
      if (cols.length >= 2) {
        const x = Number(cols[0]);
        const y = Number(cols[1]);
        if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y });
      }
    });

  if (pts.length < 3) {
    pts.push(
      { x: 1, y: 1.15 },
      { x: 2, y: 1.95 },
      { x: 3, y: 2.82 },
      { x: 4, y: 3.74 },
      { x: 5, y: 4.55 }
    );
  }

  pts.sort((a, b) => a.x - b.x);
  const n = pts.length;
  let evalFit = (x: number) => x;
  let equationLatex = '';

  if (modelKind === 'linear') {
    const sx = pts.reduce((s, p) => s + p.x, 0);
    const sy = pts.reduce((s, p) => s + p.y, 0);
    const sxx = pts.reduce((s, p) => s + p.x * p.x, 0);
    const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
    const denom = n * sxx - sx * sx || 1e-9;
    const slope = (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    evalFit = (x) => slope * x + intercept;
    const sign = intercept >= 0 ? '+' : '-';
    equationLatex = `y=${slope.toFixed(2)}x${sign}${Math.abs(intercept).toFixed(2)}`;
  } else if (modelKind === 'quadratic') {
    let s1 = 0, s2 = 0, s3 = 0, s4 = 0, sy = 0, sxy = 0, sx2y = 0;
    for (const p of pts) {
      const x2 = p.x * p.x;
      s1 += p.x;
      s2 += x2;
      s3 += x2 * p.x;
      s4 += x2 * x2;
      sy += p.y;
      sxy += p.x * p.y;
      sx2y += x2 * p.y;
    }
    const [c0, c1, c2] = solve3x3(
      [
        [n, s1, s2],
        [s1, s2, s3],
        [s2, s3, s4],
      ],
      [sy, sxy, sx2y]
    );
    evalFit = (x) => c2 * x * x + c1 * x + c0;
    equationLatex = `y=${c2.toFixed(2)}x^2+${c1.toFixed(2)}x+${c0.toFixed(2)}`;
  } else {
    // Exponential y = A * exp(k * x) on shifted positive y
    const minY = Math.min(...pts.map((p) => p.y));
    const shift = minY <= 0.05 ? Math.abs(minY) + 0.2 : 0;
    const lnPts = pts.map((p) => ({ x: p.x, ly: Math.log(p.y + shift) }));
    const sx = lnPts.reduce((s, p) => s + p.x, 0);
    const sly = lnPts.reduce((s, p) => s + p.ly, 0);
    const sxx = lnPts.reduce((s, p) => s + p.x * p.x, 0);
    const sxly = lnPts.reduce((s, p) => s + p.x * p.ly, 0);
    const k = (n * sxly - sx * sly) / (n * sxx - sx * sx || 1e-9);
    const lnA = (sly - k * sx) / n;
    const A = Math.exp(lnA);
    evalFit = (x) => A * Math.exp(k * x) - shift;
    equationLatex = `y=${A.toFixed(2)}e^{${k.toFixed(2)}x}`;
  }

  const meanY = pts.reduce((s, p) => s + p.y, 0) / n;
  const ssTot = pts.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = pts.reduce((s, p) => s + (p.y - evalFit(p.x)) ** 2, 0);
  const rSquared = ssTot > 1e-9 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;
  const rmseSigma = Math.sqrt(ssRes / Math.max(1, n - 2));

  // Map data + fitted ±σ band onto TikZ canvas [0.95..5.45] x [0.75..3.15] cm
  const minX = pts[0].x;
  const maxX = Math.max(minX + 1e-3, pts[pts.length - 1].x);
  const allY = [
    ...pts.map((p) => p.y - rmseSigma),
    ...pts.map((p) => p.y + rmseSigma),
  ];
  const minY = Math.min(...allY);
  const maxY = Math.max(minY + 1e-3, ...allY);

  const mapX = (x: number) => +(0.95 + ((x - minX) / (maxX - minX)) * 4.45).toFixed(2);
  const mapY = (y: number) => +(0.75 + ((y - minY) / (maxY - minY)) * 2.35).toFixed(2);
  const fmt = (v: number) => `${v.toFixed(2)}cm`;

  let cur = source;
  const arr = proposeLibraryConnect(cur, 'arrows.meta');
  if (arr.ok) cur = arr.nextSource;
  const grp = `fit_${Date.now() % 10000}`;
  const ids: number[] = [];
  const push = (tool: ToolId, values: Record<string, string>) => {
    const res = insertOwnedPrimitiveIntoSource(cur, tool, { ...values, group_id: grp });
    cur = res.nextSource;
    ids.push(res.newId);
  };

  // Axes
  push('arrow', { start_x: '0.80cm', start_y: '0.65cm', end_x: '5.65cm', end_y: '0.65cm', tip: 'Stealth' });
  push('arrow', { start_x: '0.80cm', start_y: '0.65cm', end_x: '0.80cm', end_y: '3.35cm', tip: 'Stealth' });

  // Confidence band ±1.5σ polygon
  const bandStep = 14;
  const upperPts: { xCm: number; yCm: number }[] = [];
  const lowerPts: { xCm: number; yCm: number }[] = [];
  const fitPts: { xCm: number; yCm: number }[] = [];
  const bandHalf = Math.max(rmseSigma * 1.5, (maxY - minY) * 0.06);

  for (let i = 0; i <= bandStep; i++) {
    const xv = minX + ((maxX - minX) * i) / bandStep;
    const yv = evalFit(xv);
    const gx = mapX(xv);
    fitPts.push({ xCm: gx, yCm: mapY(yv) });
    upperPts.push({ xCm: gx, yCm: mapY(yv + bandHalf) });
    lowerPts.push({ xCm: gx, yCm: mapY(yv - bandHalf) });
  }

  const corridorRing = [...upperPts, ...lowerPts.reverse()];
  push('line', {
    start_x: fmt(corridorRing[0].xCm),
    start_y: fmt(corridorRing[0].yCm),
    end_x: fmt(corridorRing[1].xCm),
    end_y: fmt(corridorRing[1].yCm),
    poly_points: serializePolyPointsList(corridorRing),
    poly_closed: 'cycle',
    stroke_width: 'thin',
    stroke_color: 'oiBlue',
    fill_color: 'oiBlue!12',
  });

  // Fitted regression curve
  push('line', {
    start_x: fmt(fitPts[0].xCm),
    start_y: fmt(fitPts[0].yCm),
    end_x: fmt(fitPts[1].xCm),
    end_y: fmt(fitPts[1].yCm),
    poly_points: serializePolyPointsList(fitPts),
    stroke_width: 'thick',
    stroke_color: 'oiBlue',
  });

  // Scatter points + ±σ error bars
  for (const pt of pts.slice(0, 12)) {
    const cx = mapX(pt.x);
    const cy = mapY(pt.y);
    const errPx = Math.max(0.1, Math.abs(mapY(pt.y + bandHalf * 0.7) - cy));
    push('line', {
      start_x: fmt(cx),
      start_y: fmt(cy - errPx),
      end_x: fmt(cx),
      end_y: fmt(cy + errPx),
      stroke_color: 'oiVermilion',
      stroke_width: 'thin',
    });
    push('circle', {
      center_x: fmt(cx),
      center_y: fmt(cy),
      radius: '0.08cm',
      stroke_color: 'oiVermilion',
      fill_color: 'oiVermilion!12',
    });
  }

  // Equation + R^2 legend label
  const fullFormula = `${equationLatex},\\; R^2=${rSquared.toFixed(3)}`;
  push('node', {
    x: '3.25cm',
    y: '3.42cm',
    mode: 'math',
    content: fullFormula,
    fill_color: 'slate!12',
  });

  return {
    nextSource: cur,
    insertedIds: ids,
    rSquared: +rSquared.toFixed(4),
    rmseSigma: +rmseSigma.toFixed(4),
    equationLatex: fullFormula,
    summaryRu: `Аппроксимация МНК (${modelKind}, R²=${rSquared.toFixed(4)}, σ=${rmseSigma.toFixed(3)}) + коридор погрешности → ${ids.length} n1 (F16).`,
  };
}

/** F16b: Statistical BoxPlot (Median, Q1, Q3, IQR, Whiskers, Outliers) & Histogram */
export interface SampleStatisticsSummary {
  n: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  whiskerLow: number;
  whiskerHigh: number;
  outliers: number[];
}

function quantileSorted(sorted: number[], p: number): number {
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function computeSampleStatistics(rawText: string): SampleStatisticsSummary {
  const vals = rawText
    .split(/[\s,;|\t]+/)
    .map((s) => Number(s.trim()))
    .filter((v) => Number.isFinite(v));

  if (vals.length < 4) {
    vals.push(12.4, 14.1, 14.8, 15.2, 15.9, 16.4, 17.1, 22.8);
  }
  const sorted = [...vals].sort((a, b) => a - b);
  const q1 = quantileSorted(sorted, 0.25);
  const median = quantileSorted(sorted, 0.5);
  const q3 = quantileSorted(sorted, 0.75);
  const iqr = q3 - q1;
  const fenceLo = q1 - 1.5 * iqr;
  const fenceHi = q3 + 1.5 * iqr;
  const inliers = sorted.filter((v) => v >= fenceLo && v <= fenceHi);
  const whiskerLow = inliers[0] ?? sorted[0];
  const whiskerHigh = inliers[inliers.length - 1] ?? sorted[sorted.length - 1];
  const outliers = sorted.filter((v) => v < fenceLo || v > fenceHi);

  return {
    n: sorted.length,
    median: +median.toFixed(3),
    q1: +q1.toFixed(3),
    q3: +q3.toFixed(3),
    iqr: +iqr.toFixed(3),
    whiskerLow: +whiskerLow.toFixed(3),
    whiskerHigh: +whiskerHigh.toFixed(3),
    outliers,
  };
}

export function insertStatisticalPlotIntoSource(
  source: string,
  rawNumbers: string,
  plotKind: 'boxplot' | 'histogram'
): { nextSource: string; insertedIds: number[]; stats: SampleStatisticsSummary; summaryRu: string } {
  const stats = computeSampleStatistics(rawNumbers);
  const allNums = rawNumbers
    .split(/[\s,;|\t]+/)
    .map((s) => Number(s.trim()))
    .filter((v) => Number.isFinite(v));
  const sample = allNums.length >= 4 ? allNums : [12.4, 14.1, 14.8, 15.2, 15.9, 16.4, 17.1, 22.8];

  const minV = Math.min(...sample);
  const maxV = Math.max(minV + 1e-3, ...sample);
  const mapX = (v: number) => +(1.0 + ((v - minV) / (maxV - minV)) * 4.3).toFixed(2);
  const fmt = (n: number) => `${n.toFixed(2)}cm`;

  let cur = source;
  const arr = proposeLibraryConnect(cur, 'arrows.meta');
  if (arr.ok) cur = arr.nextSource;
  const grp = `stat_${Date.now() % 10000}`;
  const ids: number[] = [];
  const push = (tool: ToolId, values: Record<string, string>) => {
    const res = insertOwnedPrimitiveIntoSource(cur, tool, { ...values, group_id: grp });
    cur = res.nextSource;
    ids.push(res.newId);
  };

  if (plotKind === 'boxplot') {
    const yc = 1.95;
    const boxHalf = 0.42;
    push('arrow', { start_x: '0.80cm', start_y: '0.85cm', end_x: '5.60cm', end_y: '0.85cm', tip: 'Stealth' });
    // Whiskers
    const xWL = mapX(stats.whiskerLow);
    const xQ1 = mapX(stats.q1);
    const xMed = mapX(stats.median);
    const xQ3 = Math.max(xQ1 + 0.12, mapX(stats.q3));
    const xWH = Math.max(xQ3, mapX(stats.whiskerHigh));

    push('line', { start_x: fmt(xWL), start_y: fmt(yc), end_x: fmt(xQ1), end_y: fmt(yc), line_style: 'dashed', stroke_width: 'semithick' });
    push('line', { start_x: fmt(xQ3), start_y: fmt(yc), end_x: fmt(xWH), end_y: fmt(yc), line_style: 'dashed', stroke_width: 'semithick' });
    push('line', { start_x: fmt(xWL), start_y: fmt(yc - 0.22), end_x: fmt(xWL), end_y: fmt(yc + 0.22), stroke_width: 'thick' });
    push('line', { start_x: fmt(xWH), start_y: fmt(yc - 0.22), end_x: fmt(xWH), end_y: fmt(yc + 0.22), stroke_width: 'thick' });

    // IQR Box
    push('rectangle', {
      start_x: fmt(xQ1),
      start_y: fmt(yc - boxHalf),
      end_x: fmt(xQ3),
      end_y: fmt(yc + boxHalf),
      stroke_width: 'thick',
      stroke_color: 'oiBlue',
      fill_color: 'oiBlue!12',
    });
    // Median bar
    push('line', {
      start_x: fmt(xMed),
      start_y: fmt(yc - boxHalf),
      end_x: fmt(xMed),
      end_y: fmt(yc + boxHalf),
      stroke_width: 'very thick',
      stroke_color: 'oiVermilion',
    });
    // Outliers
    for (const outVal of stats.outliers.slice(0, 6)) {
      push('circle', {
        center_x: fmt(mapX(outVal)),
        center_y: fmt(yc),
        radius: '0.08cm',
        stroke_color: 'oiVermilion',
        fill_color: 'rose!10',
      });
    }
    push('node', {
      x: '3.20cm',
      y: '2.95cm',
      mode: 'math',
      content: `\\text{Med}=${stats.median},\\; Q_1=${stats.q1},\\; Q_3=${stats.q3}`,
    });
  } else {
    // Histogram with 5 bins
    const binCount = 5;
    const bins = new Array<number>(binCount).fill(0);
    for (const v of sample) {
      const bIdx = Math.min(binCount - 1, Math.max(0, Math.floor(((v - minV) / (maxV - minV + 1e-9)) * binCount)));
      bins[bIdx]++;
    }
    const maxBin = Math.max(1, ...bins);
    push('arrow', { start_x: '0.85cm', start_y: '0.75cm', end_x: '5.60cm', end_y: '0.75cm', tip: 'Stealth' });
    push('arrow', { start_x: '0.85cm', start_y: '0.75cm', end_x: '0.85cm', end_y: '3.25cm', tip: 'Stealth' });
    const totalW = 4.3;
    const bw = totalW / binCount;
    bins.forEach((cnt, idx) => {
      const h = Math.max(0.12, (cnt / maxBin) * 2.15);
      const bx1 = 1.0 + idx * bw;
      const bx2 = bx1 + bw - 0.04;
      push('rectangle', {
        start_x: fmt(bx1),
        start_y: '0.75cm',
        end_x: fmt(bx2),
        end_y: fmt(0.75 + h),
        stroke_color: 'oiBluishGreen',
        fill_color: 'oiBluishGreen!12',
      });
    });
    push('node', {
      x: '3.20cm',
      y: '3.35cm',
      mode: 'math',
      content: `N=${stats.n},\\; \\text{IQR}=${stats.iqr}`,
    });
  }

  return {
    nextSource: cur,
    insertedIds: ids,
    stats,
    summaryRu: `Построен статистический график (${plotKind === 'boxplot' ? 'BoxPlot ящик с усами' : 'Гистограмма частот'}, N=${stats.n}, Med=${stats.median} · F16).`,
  };
}
