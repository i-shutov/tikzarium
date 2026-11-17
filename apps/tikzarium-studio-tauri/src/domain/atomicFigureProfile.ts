import type { ToolId } from './catalog';
import { EXTENSION_MANIFESTS, TIKZ_LIBRARIES } from './catalog';
import {
  inspectPreambleConnections,
  parseOwnedPrimitives,
  proposeLibraryConnect,
  proposeLibraryDisconnect,
} from './tikzEngine';
import type { WorkshopCategoryId, WorkshopTargetId } from './workspaceAndEngineeringStageBundle';

export type AtomicFigureProfileId =
  | 'core-geometry'
  | 'optics-mechanics'
  | 'plots-stats'
  | 'circuits-control'
  | 'flowchart-graphs'
  | 'beamer-slides';

export type ContextualRailToolId =
  | 'arc3'
  | 'polygon'
  | 'callout'
  | 'measure'
  | 'eyedropper';

export interface AtomicFigureProfileSpec {
  id: AtomicFigureProfileId;
  shortLabelRu: string;
  titleRu: string;
  summaryRu: string;
  recommendedPackages: string[];
  recommendedLibraries: string[];
  contextualRailTools: ContextualRailToolId[];
  primaryWorkshopCategory: WorkshopCategoryId;
  quickWorkshopTargetId: WorkshopTargetId;
  quickWorkshopLabelRu: string;
  enablesBeamerOverlays: boolean;
}

export const ATOMIC_FIGURE_PROFILES: AtomicFigureProfileSpec[] = [
  {
    id: 'core-geometry',
    shortLabelRu: 'Геометрия (core)',
    titleRu: 'Базовая геометрия и чертёж (TikZ core)',
    summaryRu:
      'Минимальный атомарный рисунок standalone: контуры, дуги, размерные выноски ГОСТ и штриховки без тяжёлых внешних пакетов.',
    recommendedPackages: ['tikz'],
    recommendedLibraries: ['arrows.meta', 'calc', 'patterns'],
    contextualRailTools: ['arc3', 'polygon', 'callout', 'measure'],
    primaryWorkshopCategory: 'geometry-cad',
    quickWorkshopTargetId: 'hub-geometry',
    quickWorkshopLabelRu: 'Булевы 2D / Дуги',
    enablesBeamerOverlays: false,
  },
  {
    id: 'optics-mechanics',
    shortLabelRu: 'Оптика и механика',
    titleRu: 'Геометрическая оптика, статика и сопромат',
    summaryRu:
      'Ход лучей в тонких линзах, эпюры балок Q/M, заделки ГОСТ, штриховки сечений и фигурные скобки.',
    recommendedPackages: ['tikz'],
    recommendedLibraries: [
      'arrows.meta',
      'calc',
      'patterns',
      'decorations.pathreplacing',
    ],
    contextualRailTools: ['arc3', 'polygon', 'callout', 'measure'],
    primaryWorkshopCategory: 'domain-engineering',
    quickWorkshopTargetId: 'hub-engineering',
    quickWorkshopLabelRu: 'Оптика / Балки',
    enablesBeamerOverlays: false,
  },
  {
    id: 'plots-stats',
    shortLabelRu: 'График PGFPlots',
    titleRu: 'Научный график и статистика (pgfplots + siunitx)',
    summaryRu:
      'Оси координат PGFPlots, регрессия МНК R², доверительные полосы, BoxPlot/гистограммы и прямые единицы СИ.',
    recommendedPackages: ['tikz', 'pgfplots', 'siunitx'],
    recommendedLibraries: ['arrows.meta', 'calc'],
    contextualRailTools: ['callout', 'measure', 'eyedropper'],
    primaryWorkshopCategory: 'plots-stats',
    quickWorkshopTargetId: 'hub-stats',
    quickWorkshopLabelRu: 'МНК / Графики',
    enablesBeamerOverlays: false,
  },
  {
    id: 'circuits-control',
    shortLabelRu: 'Цепи и ТАУ',
    titleRu: 'Электрические схемы ГОСТ/IEC и контуры ТАУ',
    summaryRu:
      'УГО резисторов, конденсаторов, ОУ, источников ЭДС, структурные схемы обратной связи и номиналы siunitx.',
    recommendedPackages: ['tikz', 'circuitikz', 'siunitx'],
    recommendedLibraries: ['arrows.meta', 'calc', 'positioning'],
    contextualRailTools: ['polygon', 'callout', 'eyedropper'],
    primaryWorkshopCategory: 'domain-engineering',
    quickWorkshopTargetId: 'hub-engineering',
    quickWorkshopLabelRu: 'Элементы цепей',
    enablesBeamerOverlays: false,
  },
  {
    id: 'flowchart-graphs',
    shortLabelRu: 'Схемы и графы',
    titleRu: 'Блок-схемы ГОСТ 19.701, графы и диаграммы',
    summaryRu:
      'Автоукладка алгоритмов, логические связыватели узлов positioning, геометрические блоки и коммутативные диаграммы.',
    recommendedPackages: ['tikz', 'tikz-cd'],
    recommendedLibraries: ['arrows.meta', 'positioning', 'shapes.geometric', 'calc'],
    contextualRailTools: ['polygon', 'eyedropper'],
    primaryWorkshopCategory: 'domain-engineering',
    quickWorkshopTargetId: 'hub-engineering',
    quickWorkshopLabelRu: 'Блок-схема ГОСТ',
    enablesBeamerOverlays: false,
  },
  {
    id: 'beamer-slides',
    shortLabelRu: 'Слайды Beamer',
    titleRu: 'Пошаговая схема для презентации Beamer <1->',
    summaryRu:
      'Активирует покадровые оверлеи <1->, <2-> в Инспекторе и плеере холста для демонстрации построения рисунка по шагам.',
    recommendedPackages: ['tikz'],
    recommendedLibraries: ['arrows.meta', 'calc', 'positioning'],
    contextualRailTools: ['arc3', 'polygon', 'callout', 'eyedropper'],
    primaryWorkshopCategory: 'all',
    quickWorkshopTargetId: 'legacy-adv-layers',
    quickWorkshopLabelRu: 'Слои и кадры <n->',
    enablesBeamerOverlays: true,
  },
];

export interface AvailablePreamblePackageSpec {
  name: string;
  titleRu: string;
  xelatexCompatible: boolean;
  packageOptions?: string;
  extraSetupLine?: string;
}

export const AVAILABLE_PREAMBLE_PACKAGES: AvailablePreamblePackageSpec[] = [
  {
    name: 'pgfplots',
    titleRu: 'PGFPlots 1.18 — научные оси, коридоры fillbetween и 3D',
    xelatexCompatible: true,
    extraSetupLine: '\\pgfplotsset{compat=1.18}',
  },
  {
    name: 'siunitx',
    titleRu: 'siunitx — строгие физические единицы СИ (\\qty, \\unit)',
    xelatexCompatible: true,
  },
  {
    name: 'circuitikz',
    titleRu: 'CircuiTikZ — радиоэлементы и электросхемы ГОСТ/IEC и ANSI',
    xelatexCompatible: true,
  },
  {
    name: 'tikz-cd',
    titleRu: 'tikz-cd — коммутативные диаграммы и морфизмы',
    xelatexCompatible: true,
  },
  {
    name: 'chemfig',
    titleRu: 'chemfig — структурные формулы, циклы и механизмы реакций',
    xelatexCompatible: true,
  },
  {
    name: 'mhchem',
    titleRu: 'mhchem — химические уравнения и ионы (\\ce{...})',
    xelatexCompatible: true,
    packageOptions: 'version=4',
  },
  {
    name: 'tikz-3dplot',
    titleRu: 'tikz-3dplot — сферические 3D-координаты, векторы и углы Эйлера',
    xelatexCompatible: true,
  },
  {
    name: 'forest',
    titleRu: 'forest — иерархические деревья, таксономии и AST',
    xelatexCompatible: true,
    packageOptions: 'edges',
  },
  {
    name: 'pgfgantt',
    titleRu: 'pgfgantt — календарные графики НИОКР и диаграммы Ганта',
    xelatexCompatible: true,
  },
  {
    name: 'quantikz',
    titleRu: 'quantikz — квантовые регистры, вентили CNOT и измерения',
    xelatexCompatible: true,
  },
  {
    name: 'tkz-euclide',
    titleRu: 'tkz-euclide — геометрические построения Евклида и окружности',
    xelatexCompatible: true,
  },
  {
    name: 'tikz-network',
    titleRu: 'tikz-network — взвешенные и многослойные сетевые графы',
    xelatexCompatible: true,
  },
  {
    name: 'tikz-timing',
    titleRu: 'tikz-timing — временные диаграммы ПЛИС, SPI, I²C и ШИМ',
    xelatexCompatible: true,
  },
  {
    name: 'tikz-optics',
    titleRu: 'tikz-optics — лазерные столы, зеркала и интерферометры',
    xelatexCompatible: true,
  },
  {
    name: 'stanli',
    titleRu: 'stanli — балки, фермы, опоры и нагрузки строительной механики',
    xelatexCompatible: true,
  },
  {
    name: 'tikz-feynman',
    titleRu: 'tikz-feynman — диаграммы Фейнмана (явные вершины в XeLaTeX)',
    xelatexCompatible: true,
    packageOptions: 'compat=1.1.0',
  },
  {
    name: 'booktabs',
    titleRu: 'booktabs — публикационные линейки таблиц (\\toprule)',
    xelatexCompatible: true,
  },
];

export const AVAILABLE_TIKZ_LIBRARIES: {
  name: string;
  titleRu: string;
  xelatexCompatible: boolean;
}[] = [
  { name: 'arrows.meta', titleRu: 'Наконечники стрелок Stealth / Bar / Latex', xelatexCompatible: true },
  { name: 'calc', titleRu: 'Координатные выражения ($...$) и проекции', xelatexCompatible: true },
  { name: 'patterns', titleRu: 'Штриховки сечений ГОСТ 2.306 (north east lines)', xelatexCompatible: true },
  { name: 'positioning', titleRu: 'Относительное размещение узлов right=of', xelatexCompatible: true },
  { name: 'angles', titleRu: 'Обозначение плоских углов pic {angle}', xelatexCompatible: true },
  { name: 'quotes', titleRu: 'Короткие подписи дуг и рёбер "..."', xelatexCompatible: true },
  { name: 'decorations.pathreplacing', titleRu: 'Фигурные скобки brace на отрезках', xelatexCompatible: true },
  { name: 'decorations.pathmorphing', titleRu: 'Волны snake, пружины coil и зигзаги', xelatexCompatible: true },
  { name: 'decorations.markings', titleRu: 'Стрелки и метки вдоль произвольной траектории', xelatexCompatible: true },
  { name: 'shapes.geometric', titleRu: 'Ромбы решений и блоки блок-схем ГОСТ', xelatexCompatible: true },
  { name: 'automata', titleRu: 'Конечные автоматы ДКА/НКА (state, accepting)', xelatexCompatible: true },
  { name: 'petri', titleRu: 'Сети Петри (place, transition, tokens)', xelatexCompatible: true },
  { name: 'chains', titleRu: 'Линейные и ветвящиеся конвейеры start chain', xelatexCompatible: true },
  { name: 'mindmap', titleRu: 'Интеллект-карты и радиальные классификации', xelatexCompatible: true },
  { name: 'lindenmayersystems', titleRu: 'Фракталы и L-системы (кривая Коха, Серпинского)', xelatexCompatible: true },
  { name: 'intersections', titleRu: 'Точки пересечения кривых name intersections', xelatexCompatible: true },
  { name: 'backgrounds', titleRu: 'Фоновые слои on background layer', xelatexCompatible: true },
  { name: 'fit', titleRu: 'Охватывающие контуры модулей fit=(a)(b)', xelatexCompatible: true },
  { name: 'spy', titleRu: 'Выносная лупа увеличения узла (×M)', xelatexCompatible: true },
  { name: 'shapes.misc', titleRu: 'Дополнительные формы rounded rectangle и cross out', xelatexCompatible: true },
  { name: 'shapes.callouts', titleRu: 'Выносные плашки с указателем callout', xelatexCompatible: true },
  { name: 'shapes.gates.logic.US', titleRu: 'Цифровые логические вентили AND/OR/NOT', xelatexCompatible: true },
  { name: 'circuits.ee.IEC', titleRu: 'Электротехнические обозначения МЭК PGF', xelatexCompatible: true },
  { name: 'graphs', titleRu: 'Декларативный синтаксис графов \\graph', xelatexCompatible: true },
  { name: 'matrix', titleRu: 'Матричные сетки узлов matrix of math nodes', xelatexCompatible: true },
  { name: 'optics', titleRu: 'Оптические элементы [use optics]', xelatexCompatible: true },
  { name: 'quantikz2', titleRu: 'Квантовые вентили и регистры quantikz2', xelatexCompatible: true },
  { name: 'graphdrawing', titleRu: 'Автоукладка графов (только LuaLaTeX!)', xelatexCompatible: false },
];

export interface PassportPackageEntry {
  name: string;
  lineNumber: number;
  isCoreLocked: boolean;
  usedInBody: boolean;
  xelatexCompatible: boolean;
  statusNoteRu: string;
}

export interface PassportLibraryEntry {
  name: string;
  lineNumber: number;
  usedInBody: boolean;
  dependentPrimitiveCount: number;
  xelatexCompatible: boolean;
  titleRu: string;
}

export interface FigurePackagePassport {
  docClass: string;
  inferredProfileId: AtomicFigureProfileId;
  isBeamerActive: boolean;
  packages: PassportPackageEntry[];
  libraries: PassportLibraryEntry[];
  unusedLibraries: string[];
  missingRequiredLibraries: { name: string; reasonRu: string }[];
}

function getDocumentBodySlice(source: string): string {
  const beginDocIdx = source.indexOf('\\begin{document}');
  if (beginDocIdx !== -1) {
    return source.slice(beginDocIdx);
  }
  const beginTikzIdx = source.indexOf('\\begin{tikzpicture}');
  return beginTikzIdx !== -1 ? source.slice(beginTikzIdx) : source;
}

function parseDocClass(source: string): string {
  const m = /\\documentclass(?:\[[^\]]*\])?\{([^}]+)\}/.exec(source);
  return m ? m[1].trim() : 'standalone';
}

function countLibraryUsageInPrimitivesAndBody(
  libName: string,
  body: string,
  ownedPrimitives: ReturnType<typeof parseOwnedPrimitives>
): { usedInBody: boolean; dependentPrimitiveCount: number } {
  let primCount = 0;
  for (const p of ownedPrimitives) {
    const v = p.values;
    if (
      libName === 'arrows.meta' &&
      (p.tool === 'arrow' || v.callout === 'dim' || (v.tip && v.tip !== 'to'))
    ) {
      primCount++;
    } else if ((libName === 'patterns' || libName === 'patterns.meta') && Boolean(v.hatch_pattern)) {
      primCount++;
    } else if (
      libName === 'decorations.pathreplacing' &&
      (v.decoration_kind === 'brace' || v.decoration_kind === 'brace-mirror')
    ) {
      primCount++;
    } else if (
      libName === 'decorations.pathmorphing' &&
      (v.decoration_kind === 'snake' ||
        v.decoration_kind === 'zigzag' ||
        v.decoration_kind === 'coil')
    ) {
      primCount++;
    } else if (libName === 'positioning' && (Boolean(v.from_node) || Boolean(v.to_node))) {
      primCount++;
    }
  }

  let rawUsed = primCount > 0;
  if (!rawUsed) {
    switch (libName) {
      case 'arrows.meta':
        rawUsed = /Stealth|Latex|Bar\[|\|<->\||->/.test(body);
        break;
      case 'calc':
        rawUsed = /\(\s*\$/.test(body);
        break;
      case 'patterns':
      case 'patterns.meta':
        rawUsed = /\bpattern\s*=/.test(body);
        break;
      case 'positioning':
        rawUsed = /\b(?:right|left|above|below)\s*=.*?\bof\b/.test(body);
        break;
      case 'decorations.pathreplacing':
        rawUsed = /decoration\s*=\s*\{\s*brace/.test(body);
        break;
      case 'decorations.pathmorphing':
        rawUsed = /decoration\s*=\s*\{\s*(?:snake|zigzag|coil)/.test(body);
        break;
      case 'spy':
        rawUsed = /\bspy\b/.test(body);
        break;
      case 'angles':
        rawUsed = /\bangle\b/.test(body);
        break;
      case 'quotes':
        rawUsed = /pic\s*\[[^\]]*"/.test(body);
        break;
      case 'shapes.geometric':
        rawUsed = /\b(?:diamond|trapezium|ellipse|cylinder)\b/.test(body);
        break;
      case 'automata':
        rawUsed = /\b(?:state|accepting|initial)\b/.test(body);
        break;
      case 'petri':
        rawUsed = /\b(?:place|transition|tokens)\b/.test(body);
        break;
      case 'chains':
        rawUsed = /\bstart chain\b|\bon chain\b/.test(body);
        break;
      case 'lindenmayersystems':
        rawUsed = /\blindenmayer system\b|\bl-system\b/.test(body);
        break;
      case 'mindmap':
        rawUsed = /\bmindmap\b|\bconcept\b/.test(body);
        break;
      default:
        rawUsed = body.includes(libName);
        break;
    }
  }

  return { usedInBody: rawUsed, dependentPrimitiveCount: primCount };
}

function isPackageUsedInBody(pkgName: string, body: string): boolean {
  if (pkgName === 'tikz' || pkgName === 'fontspec' || pkgName === 'unicode-math') {
    return true;
  }
  if (pkgName === 'pgfplots') {
    return /\\begin\{(?:axis|polaraxis|groupplot|semilogxaxis|semilogyaxis|loglogaxis)\}|\\addplot/.test(body);
  }
  if (pkgName === 'siunitx') {
    return /\\(?:qty|unit|num|SI)\b/.test(body);
  }
  if (pkgName === 'circuitikz') {
    return /\\begin\{circuitikz\}|\bto\[(?:R|C|L|D|V|I|short|rmeter)|\bnode\[(?:op amp|nmos|pmos|ground|vcc)/.test(
      body
    );
  }
  if (pkgName === 'tikz-cd') {
    return /\\begin\{tikzcd\}|\\rar\b|\\dar\b/.test(body);
  }
  if (pkgName === 'chemfig') {
    return /\\chemfig\b|\\schemestart\b/.test(body);
  }
  if (pkgName === 'mhchem') {
    return /\\ce\{/.test(body);
  }
  if (pkgName === 'tikz-3dplot') {
    return /\\tdplotsetmaincoords\b|tdplot_main_coords/.test(body);
  }
  if (pkgName === 'forest') {
    return /\\begin\{forest\}/.test(body);
  }
  if (pkgName === 'pgfgantt') {
    return /\\begin\{ganttchart\}/.test(body);
  }
  if (pkgName === 'quantikz') {
    return /\\begin\{quantikz\}/.test(body);
  }
  if (pkgName === 'tikz-feynman') {
    return /\\begin\{feynman\}|\\feynmandiagram\b/.test(body);
  }
  if (pkgName === 'tkz-euclide') {
    return /\\tkzDefPoint\b|\\tkzDraw/.test(body);
  }
  if (pkgName === 'tikz-network') {
    return /\\Vertex\b|\\Edge\b/.test(body);
  }
  if (pkgName === 'tikz-timing') {
    return /\\begin\{tikztimingtable\}|\\timing\b/.test(body);
  }
  if (pkgName === 'tikz-optics') {
    return /\bnode\[(?:laser|mirror|lens)\b/.test(body);
  }
  if (pkgName === 'stanli') {
    return /\\(?:support|beam|lineload|point)\{/.test(body);
  }
  if (pkgName === 'booktabs') {
    return /\\(?:toprule|midrule|bottomrule)\b/.test(body);
  }
  return true;
}

/**
 * Automatically detects the atomic figure's specialization profile from its preamble and content.
 */
export function inferAtomicFigureProfile(source: string): AtomicFigureProfileId {
  const docClass = parseDocClass(source);
  const owned = parseOwnedPrimitives(source);
  if (
    docClass === 'beamer' ||
    owned.some((p) => Boolean(p.values.beamer_spec)) ||
    /\\onslide<|\\only</.test(source)
  ) {
    return 'beamer-slides';
  }

  const inspection = inspectPreambleConnections(source);
  const pkgs = new Set(inspection.packages.map((p) => p.name));
  const libs = new Set(inspection.tikzLibraries.map((l) => l.name));

  if (pkgs.has('circuitikz') || /\\begin\{circuitikz\}|\bopamp\b|\\qty\{[^}]+\}\{\\kilo\\ohm\}/.test(source)) {
    return 'circuits-control';
  }
  if (pkgs.has('pgfplots') || /\\begin\{axis\}|\\addplot/.test(source)) {
    return 'plots-stats';
  }
  if (pkgs.has('tikz-cd') || libs.has('shapes.geometric') || /\\begin\{tikzcd\}/.test(source)) {
    return 'flowchart-graphs';
  }
  if (
    libs.has('decorations.pathreplacing') ||
    libs.has('decorations.pathmorphing') ||
    /\\myOpticsNote|линз|фокус|эпюр|F_1/.test(source)
  ) {
    return 'optics-mechanics';
  }
  return 'core-geometry';
}

/**
 * Builds the full 5-status-aligned Package & Library Passport for the current atomic `.tex` figure.
 */
export function inspectFigurePackagePassport(source: string): FigurePackagePassport {
  const docClass = parseDocClass(source);
  const inspection = inspectPreambleConnections(source);
  const owned = parseOwnedPrimitives(source);
  const body = getDocumentBodySlice(source);

  const isBeamerActive =
    docClass === 'beamer' ||
    owned.some((p) => Boolean(p.values.beamer_spec)) ||
    /\\onslide<|\\only</.test(body);

  // Also scan \documentclass[tikz,...]{standalone} implicit tikz package
  const hasTikzOptionInClass = /\\documentclass\[[^\]]*\btikz\b[^\]]*\]/.test(source);
  const seenPackages = new Set<string>();
  const packages: PassportPackageEntry[] = [];

  if (hasTikzOptionInClass) {
    seenPackages.add('tikz');
    packages.push({
      name: 'tikz',
      lineNumber: 1,
      isCoreLocked: true,
      usedInBody: true,
      xelatexCompatible: true,
      statusNoteRu: 'Ядро PGF/TikZ 3.1.12 (опция класса standalone)',
    });
  }

  for (const pkg of inspection.packages) {
    if (seenPackages.has(pkg.name)) continue;
    seenPackages.add(pkg.name);
    const isCoreLocked =
      pkg.name === 'tikz' || pkg.name === 'fontspec' || pkg.name === 'unicode-math';
    const extSpec = EXTENSION_MANIFESTS.find((e) => e.name === pkg.name);
    packages.push({
      name: pkg.name,
      lineNumber: pkg.lineNumber,
      isCoreLocked,
      usedInBody: isPackageUsedInBody(pkg.name, body),
      xelatexCompatible: true,
      statusNoteRu: extSpec
        ? `${extSpec.displayName} · ${extSpec.stage}`
        : isCoreLocked
          ? 'Базовый пакет документа XeLaTeX'
          : 'Дополнительный пакет рисунка',
    });
  }

  const seenLibs = new Set<string>();
  const libraries: PassportLibraryEntry[] = [];
  const unusedLibraries: string[] = [];

  for (const lib of inspection.tikzLibraries) {
    if (seenLibs.has(lib.name)) continue;
    seenLibs.add(lib.name);
    const usage = countLibraryUsageInPrimitivesAndBody(lib.name, body, owned);
    const catLib = TIKZ_LIBRARIES.find((l) => l.name === lib.name);
    const availLib = AVAILABLE_TIKZ_LIBRARIES.find((l) => l.name === lib.name);
    const xelatexCompatible =
      lib.name !== 'graphdrawing' &&
      catLib?.engine !== 'lualatex' &&
      (availLib?.xelatexCompatible ?? true);

    libraries.push({
      name: lib.name,
      lineNumber: lib.lineNumber,
      usedInBody: usage.usedInBody,
      dependentPrimitiveCount: usage.dependentPrimitiveCount,
      xelatexCompatible,
      titleRu: catLib?.titleRu ?? availLib?.titleRu ?? `Библиотека TikZ ${lib.name}`,
    });

    if (!usage.usedInBody) {
      unusedLibraries.push(lib.name);
    }
  }

  const missingRequiredLibraries: { name: string; reasonRu: string }[] = [];
  if (
    !seenLibs.has('arrows.meta') &&
    (body.includes('Stealth') || body.includes('-{Latex}') || body.includes('Bar['))
  ) {
    missingRequiredLibraries.push({
      name: 'arrows.meta',
      reasonRu: 'В коде рисунка используются наконечники Stealth / Bar',
    });
  }
  if (!seenLibs.has('patterns') && !seenLibs.has('patterns.meta') && /\bpattern\s*=/.test(body)) {
    missingRequiredLibraries.push({
      name: 'patterns',
      reasonRu: 'В коде рисунка задана штриховка pattern=...',
    });
  }
  if (!seenLibs.has('decorations.pathreplacing') && /decoration\s*=\s*\{\s*brace/.test(body)) {
    missingRequiredLibraries.push({
      name: 'decorations.pathreplacing',
      reasonRu: 'В коде рисунка используется фигурная скобка brace',
    });
  }
  if (
    !seenLibs.has('decorations.pathmorphing') &&
    /decoration\s*=\s*\{\s*(?:snake|zigzag|coil)/.test(body)
  ) {
    missingRequiredLibraries.push({
      name: 'decorations.pathmorphing',
      reasonRu: 'В коде рисунка используется волна/пружина pathmorphing',
    });
  }

  return {
    docClass,
    inferredProfileId: inferAtomicFigureProfile(source),
    isBeamerActive,
    packages,
    libraries,
    unusedLibraries,
    missingRequiredLibraries,
  };
}

/**
 * Connects or disconnects a LaTeX `\usepackage{...}` in the atomic figure's preamble.
 */
export function togglePackageInPreamble(
  source: string,
  pkgName: string,
  connect: boolean
): { ok: boolean; nextSource: string; summaryRu: string } {
  const inspection = inspectPreambleConnections(source);
  if (!inspection.hasBeginDocument) {
    return {
      ok: false,
      nextSource: source,
      summaryRu: 'В буфере нет \\begin{document} — добавьте преамбулу для управления пакетами.',
    };
  }

  const eol = inspection.lineEnding;
  const alreadyLoaded = inspection.packages.some((p) => p.name === pkgName);

  if (connect) {
    if (alreadyLoaded) {
      return {
        ok: false,
        nextSource: source,
        summaryRu: `Пакет \\usepackage{${pkgName}} уже подключён в преамбуле рисунка.`,
      };
    }
    const spec = AVAILABLE_PREAMBLE_PACKAGES.find((p) => p.name === pkgName);
    const usepkgLine = spec?.packageOptions
      ? `\\usepackage[${spec.packageOptions}]{${pkgName}}`
      : `\\usepackage{${pkgName}}`;
    const linesToInsert = [usepkgLine];
    if (
      spec?.extraSetupLine &&
      !source.slice(0, inspection.beginDocumentOffset).includes('\\pgfplotsset')
    ) {
      linesToInsert.push(spec.extraSetupLine);
    }
    const block = linesToInsert.join(eol) + eol;
    const nextSource =
      source.slice(0, inspection.beginDocumentOffset) +
      block +
      source.slice(inspection.beginDocumentOffset);
    return {
      ok: true,
      nextSource,
      summaryRu: `В паспорт преамбулы добавлен пакет \\usepackage{${pkgName}}.`,
    };
  }

  // Disconnect package
  if (pkgName === 'tikz' || pkgName === 'fontspec' || pkgName === 'unicode-math') {
    return {
      ok: false,
      nextSource: source,
      summaryRu: `Базовый пакет ${pkgName} защищён профилем XeLaTeX.`,
    };
  }

  const pre = source.slice(0, inspection.beginDocumentOffset);
  const rest = source.slice(inspection.beginDocumentOffset);
  const rawLines = pre.split(/\r?\n/);
  const filtered = rawLines.filter((ln) => {
    const trimmed = ln.trim();
    if (
      new RegExp(`^\\\\usepackage(?:\\[[^\\]]*\\])?\\{\\s*${pkgName}\\s*\\}$`).test(trimmed)
    ) {
      return false;
    }
    if (pkgName === 'pgfplots' && /^\\pgfplotsset\{compat=[^}]+\}$/.test(trimmed)) {
      return false;
    }
    return true;
  });

  const nextPre = filtered.join(eol);
  if (nextPre === pre) {
    return {
      ok: false,
      nextSource: source,
      summaryRu: `Пакет ${pkgName} не найден в отдельных строках преамбулы.`,
    };
  }

  return {
    ok: true,
    nextSource: nextPre + rest,
    summaryRu: `Пакет \\usepackage{${pkgName}} отключён из преамбулы рисунка.`,
  };
}

/**
 * Connects or disconnects a `\usetikzlibrary{...}` with XeLaTeX compatibility and usage safety checks.
 */
export function toggleTikzLibraryInPreamble(
  source: string,
  libName: string,
  connect: boolean,
  forceDisconnectEvenIfUsed = false
): { ok: boolean; nextSource: string; summaryRu: string } {
  if (connect) {
    if (libName === 'graphdrawing') {
      return {
        ok: false,
        nextSource: source,
        summaryRu:
          'Библиотека graphdrawing требует движок LuaLaTeX и заблокирована в профиле XeLaTeX (ТЗ UX-F14).',
      };
    }
    const res = proposeLibraryConnect(source, libName);
    return {
      ok: res.ok,
      nextSource: res.nextSource,
      summaryRu: res.ok
        ? `В паспорт рисунка подключено \\usetikzlibrary{${libName}}.`
        : res.reasonRu ?? `Библиотека ${libName} уже подключена.`,
    };
  }

  const passport = inspectFigurePackagePassport(source);
  const entry = passport.libraries.find((l) => l.name === libName);
  if (entry && entry.dependentPrimitiveCount > 0 && !forceDisconnectEvenIfUsed) {
    return {
      ok: false,
      nextSource: source,
      summaryRu: `Библиотека ${libName} используется объектами на холсте (${entry.dependentPrimitiveCount} шт.) — отключение отменено, чтобы не сломать сборку.`,
    };
  }

  const res = proposeLibraryDisconnect(source, libName);
  return {
    ok: res.ok,
    nextSource: res.nextSource,
    summaryRu: res.ok
      ? `Библиотека ${libName} убрана из преамбулы рисунка.`
      : res.reasonRu ?? `Не удалось отключить ${libName}.`,
  };
}

/**
 * Adapts the current atomic figure's preamble to a chosen specialization profile without touching
 * user macros or figure body lines.
 */
export function applyAtomicFigureProfileToPreamble(
  source: string,
  profileId: AtomicFigureProfileId
): { ok: boolean; nextSource: string; summaryRu: string; addedItems: string[] } {
  const spec = ATOMIC_FIGURE_PROFILES.find((p) => p.id === profileId);
  if (!spec) {
    return { ok: false, nextSource: source, summaryRu: 'Неизвестный профиль рисунка.', addedItems: [] };
  }

  const inspection = inspectPreambleConnections(source);
  if (!inspection.hasBeginDocument) {
    return {
      ok: false,
      nextSource: source,
      summaryRu: 'Профиль применён к палитре (в фрагменте без \\begin{document} преамбула не менялась).',
      addedItems: [],
    };
  }

  let next = source;
  const addedItems: string[] = [];

  for (const pkg of spec.recommendedPackages) {
    if (pkg === 'tikz') continue;
    const cur = inspectPreambleConnections(next);
    if (!cur.packages.some((p) => p.name === pkg)) {
      const toggled = togglePackageInPreamble(next, pkg, true);
      if (toggled.ok) {
        next = toggled.nextSource;
        addedItems.push(pkg);
      }
    }
  }

  for (const lib of spec.recommendedLibraries) {
    const cur = inspectPreambleConnections(next);
    if (!cur.tikzLibraries.some((l) => l.name === lib)) {
      const plan = proposeLibraryConnect(next, lib);
      if (plan.ok) {
        next = plan.nextSource;
        addedItems.push(lib);
      }
    }
  }

  const summaryRu =
    addedItems.length > 0
      ? `Профиль «${spec.shortLabelRu}»: в преамбулу подключены [${addedItems.join(', ')}].`
      : `Профиль «${spec.shortLabelRu}» активирован (все базовые пакеты уже подключены).`;

  return { ok: true, nextSource: next, summaryRu, addedItems };
}

/**
 * Proactively ensures required N2 TikZ libraries are present in the atomic figure's preamble
 * when an author chooses a hatch, brace/wave decoration, or Stealth arrow tip in the Inspector.
 */
export function ensureRequiredLibsForInspectorPatch(
  source: string,
  tool: ToolId,
  nextValues: Record<string, string>
): { nextSource: string; autoConnectedLibs: string[] } {
  const inspection = inspectPreambleConnections(source);
  if (!inspection.hasBeginDocument) {
    return { nextSource: source, autoConnectedLibs: [] };
  }

  const needed: string[] = [];
  if (
    (tool === 'arrow' && (!nextValues.tip || nextValues.tip === 'Stealth')) ||
    nextValues.callout === 'dim'
  ) {
    needed.push('arrows.meta');
  }
  if (nextValues.hatch_pattern) {
    needed.push('patterns');
  }
  if (
    nextValues.decoration_kind === 'brace' ||
    nextValues.decoration_kind === 'brace-mirror'
  ) {
    needed.push('decorations.pathreplacing');
  }
  if (
    nextValues.decoration_kind === 'snake' ||
    nextValues.decoration_kind === 'zigzag' ||
    nextValues.decoration_kind === 'coil'
  ) {
    needed.push('decorations.pathmorphing');
  }

  let curSource = source;
  const autoConnectedLibs: string[] = [];
  for (const lib of needed) {
    const curInsp = inspectPreambleConnections(curSource);
    if (!curInsp.tikzLibraries.some((l) => l.name === lib)) {
      const plan = proposeLibraryConnect(curSource, lib);
      if (plan.ok) {
        curSource = plan.nextSource;
        autoConnectedLibs.push(lib);
      }
    }
  }

  return { nextSource: curSource, autoConnectedLibs };
}
