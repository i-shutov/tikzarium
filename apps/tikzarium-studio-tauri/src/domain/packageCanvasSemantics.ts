/**
 * Package-Semantic Direct Canvas Drawing & Idiomatic TikZ/Package Object Engine
 * (MOD-06, MOD-07, MOD-08, MOD-09, MOD-12, MOD-15 + Package-Driven Canvas Mechanics).
 *
 * Enables two-way visual authoring directly in the canvas window using the actual
 * concepts, objects, and syntax of connected LaTeX/TikZ packages WITHOUT requiring
 * `% tikzarium:n1:` hex comments:
 * - Core TikZ (`tikz`, `arrows.meta`, `calc`): clean `\draw`, `\node`, `\filldraw`
 * - `pgfplots` (`ST-SCI`): positioned `\begin{axis}...\end{axis}` & `\addplot` curves
 * - `circuitikz` (`ST-SCI` / `ST-ENG`): two-terminal bipoles `to[R]`, `to[C]`, `to[L]`, `to[V]`, `to[Do]`, `node[ground]`
 * - `automata` (`ST-UML` / `ST-SCI`): state nodes `\node[state]` & curved transitions `to[bend left]`
 * - `decorations.pathmorphing` & `optics` (`ST-SCI`): mechanical springs `coil`, waves `snake`, thin lenses
 * - `patterns` (`ST-ENG`): ГОСТ/structural pinned supports
 * - `chemfig` (`ST-CHEMBIO`): organic rings & skeletal molecules `\chemfig{...}`
 */

import { OWNERSHIP_MARKER, inspectPreambleConnections, proposeLibraryConnect } from './tikzEngine';
import type { OwnedPrimitive } from './tikzEngine';
import { togglePackageInPreamble } from './atomicFigureProfile';
import { applyCheckedLineRangePatch, detectDocumentLineEnding } from './sourcePatchEngine';

export type RoadmapStageId =
  | 'ST-SCI'
  | 'ST-UML'
  | 'ST-BPMN'
  | 'ST-ENG'
  | 'ST-CHEMBIO'
  | 'ST-ANIM'
  | 'ST-OTHER'
  | 'ST-DATA';

export const ROADMAP_STAGE_META: Record<
  RoadmapStageId,
  { order: number; code: RoadmapStageId; shortRu: string; titleRu: string }
> = {
  'ST-SCI': {
    order: 1,
    code: 'ST-SCI',
    shortRu: '1. Наука (ST-SCI)',
    titleRu: 'Приоритет №1: Научная графика, физика, математика и PGFPlots',
  },
  'ST-UML': {
    order: 2,
    code: 'ST-UML',
    shortRu: '2. Автоматы и UML',
    titleRu: 'Этап 2: Конечные автоматы, графы состояний и диаграммы классов',
  },
  'ST-BPMN': {
    order: 3,
    code: 'ST-BPMN',
    shortRu: '3. Процессы и сети',
    titleRu: 'Этап 3: Блок-схемы ГОСТ 19.701, сети Петри и конвейеры',
  },
  'ST-ENG': {
    order: 4,
    code: 'ST-ENG',
    shortRu: '4. Инженерия (ST-ENG)',
    titleRu: 'Этап 4: Электрические цепи CircuiTikZ, ТАУ, балки и опоры ГОСТ',
  },
  'ST-CHEMBIO': {
    order: 5,
    code: 'ST-CHEMBIO',
    shortRu: '5. Химия и био',
    titleRu: 'Этап 5: Структурные формулы ChemFig и уравнения mhchem',
  },
  'ST-ANIM': {
    order: 6,
    code: 'ST-ANIM',
    shortRu: '6. Кадры Beamer',
    titleRu: 'Этап 6: Пошаговые оверлеи презентаций Beamer <1->',
  },
  'ST-OTHER': {
    order: 7,
    code: 'ST-OTHER',
    shortRu: '7. Прочие схемы',
    titleRu: 'Этап 7: Деревья Forest, диаграммы Ганта и прочие нотации',
  },
  'ST-DATA': {
    order: 8,
    code: 'ST-DATA',
    shortRu: '8. Таблицы (ST-DATA, в конце)',
    titleRu: 'Завершающий этап 8: Интерактивные табличные визарды CSV/TSV',
  },
};

export type PackageToolId =
  | 'pkg:clean-line'
  | 'pkg:clean-arrow'
  | 'pkg:clean-rect'
  | 'pkg:clean-circle'
  | 'pkg:clean-node'
  | 'pkg:pgfplots-axis'
  | 'pkg:pgfplots-series'
  | 'pkg:circuit-R'
  | 'pkg:circuit-C'
  | 'pkg:circuit-L'
  | 'pkg:circuit-V'
  | 'pkg:circuit-Do'
  | 'pkg:circuit-ground'
  | 'pkg:automata-state'
  | 'pkg:automata-edge'
  | 'pkg:physics-spring'
  | 'pkg:physics-wave'
  | 'pkg:optics-lens'
  | 'pkg:mech-support'
  | 'pkg:chem-ring';

export interface PackageCanvasToolSpec {
  id: PackageToolId;
  familyId: 'tikz-clean' | 'pgfplots' | 'circuitikz' | 'automata' | 'physics-optics' | 'mechanics' | 'chemfig';
  familyLabelRu: string;
  shortLabelRu: string;
  titleRu: string;
  gestureKind: 'click' | 'drag-segment' | 'drag-box';
  roadmapStage: RoadmapStageId;
  requiredPackages: string[];
  requiredLibraries: string[];
  conceptSummaryRu: string;
  sampleSyntax: string;
}

export const PACKAGE_CANVAS_TOOLS: PackageCanvasToolSpec[] = [
  {
    id: 'pkg:clean-line',
    familyId: 'tikz-clean',
    familyLabelRu: 'TikZ (чистый)',
    shortLabelRu: 'Отрезок',
    titleRu: 'Чистый отрезок TikZ без служебного комментария',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-SCI',
    requiredPackages: ['tikz'],
    requiredLibraries: [],
    conceptSummaryRu: 'Идиоматическая команда \\draw (x1,y1) -- (x2,y2); без % tikzarium:n1:',
    sampleSyntax: '\\draw[semithick] (1.00cm,1.00cm) -- (3.20cm,2.20cm);',
  },
  {
    id: 'pkg:clean-arrow',
    familyId: 'tikz-clean',
    familyLabelRu: 'TikZ (чистый)',
    shortLabelRu: 'Вектор',
    titleRu: 'Чистый вектор со стрелкой Stealth без мета-тегов',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-SCI',
    requiredPackages: ['tikz'],
    requiredLibraries: ['arrows.meta'],
    conceptSummaryRu: 'Вектор arrows.meta напрямую в чистом исходнике .tex',
    sampleSyntax: '\\draw[-{Stealth}, semithick] (1.00cm,1.00cm) -- (3.40cm,1.80cm);',
  },
  {
    id: 'pkg:clean-rect',
    familyId: 'tikz-clean',
    familyLabelRu: 'TikZ (чистый)',
    shortLabelRu: 'Блок',
    titleRu: 'Чистый прямоугольный контур rectangle',
    gestureKind: 'drag-box',
    roadmapStage: 'ST-SCI',
    requiredPackages: ['tikz'],
    requiredLibraries: [],
    conceptSummaryRu: 'Прямоугольная область TikZ \\draw (x1,y1) rectangle (x2,y2);',
    sampleSyntax: '\\draw[semithick, fill=cyan!10] (1.00cm,1.00cm) rectangle (3.00cm,2.20cm);',
  },
  {
    id: 'pkg:clean-circle',
    familyId: 'tikz-clean',
    familyLabelRu: 'TikZ (чистый)',
    shortLabelRu: 'Круг',
    titleRu: 'Чистая окружность circle[radius=...]',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-SCI',
    requiredPackages: ['tikz'],
    requiredLibraries: [],
    conceptSummaryRu: 'Окружность с центром и радиусом в физических сантиметрах',
    sampleSyntax: '\\draw[semithick] (2.50cm,2.00cm) circle[radius=0.80cm];',
  },
  {
    id: 'pkg:clean-node',
    familyId: 'tikz-clean',
    familyLabelRu: 'TikZ (чистый)',
    shortLabelRu: 'Формула',
    titleRu: 'Именованный математический узел \\node (id) at (x,y)',
    gestureKind: 'click',
    roadmapStage: 'ST-SCI',
    requiredPackages: ['tikz'],
    requiredLibraries: [],
    conceptSummaryRu: 'Узел с символическим именем для привязки стрелок и подписей',
    sampleSyntax: '\\node (P1) at (2.00cm,2.40cm) {$\\psi(x)$};',
  },
  {
    id: 'pkg:pgfplots-axis',
    familyId: 'pgfplots',
    familyLabelRu: 'PGFPlots',
    shortLabelRu: 'Оси axis',
    titleRu: 'Координатная плоскость \\begin{axis} пакета pgfplots',
    gestureKind: 'drag-box',
    roadmapStage: 'ST-SCI',
    requiredPackages: ['pgfplots'],
    requiredLibraries: [],
    conceptSummaryRu: 'Растяните прямоугольник на холсте — создастся окружение axis с сеткой и графиком',
    sampleSyntax: '\\begin{axis}[at={(0.8cm,0.6cm)}, anchor=south west, width=4.6cm, height=2.9cm] ... \\end{axis}',
  },
  {
    id: 'pkg:pgfplots-series',
    familyId: 'pgfplots',
    familyLabelRu: 'PGFPlots',
    shortLabelRu: '+Кривая',
    titleRu: 'Серия данных \\addplot внутри осей pgfplots',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-SCI',
    requiredPackages: ['pgfplots'],
    requiredLibraries: [],
    conceptSummaryRu: 'Проведите линию тренда — добавится \\addplot coordinates {...} в активный axis',
    sampleSyntax: '\\addplot[thick, red!75!black, mark=*] coordinates {(0,0.2) (2,1.4) (4,2.1)};',
  },
  {
    id: 'pkg:physics-spring',
    familyId: 'physics-optics',
    familyLabelRu: 'Физика/Оптика',
    shortLabelRu: 'Пружина',
    titleRu: 'Упругая пружина / катушка (decorations.pathmorphing: coil)',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-SCI',
    requiredPackages: ['tikz'],
    requiredLibraries: ['decorations.pathmorphing'],
    conceptSummaryRu: 'Механическая пружина жёсткости k между двумя точками подвеса',
    sampleSyntax: '\\draw[semithick, decorate, decoration={coil, aspect=0.45, segment length=5pt, amplitude=3.5pt}] (1cm,2cm) -- (3.5cm,2cm);',
  },
  {
    id: 'pkg:physics-wave',
    familyId: 'physics-optics',
    familyLabelRu: 'Физика/Оптика',
    shortLabelRu: 'Фотон/Волна',
    titleRu: 'Гармоническая волна / фотон (decorations.pathmorphing: snake)',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-SCI',
    requiredPackages: ['tikz'],
    requiredLibraries: ['decorations.pathmorphing', 'arrows.meta'],
    conceptSummaryRu: 'Волновой луч \\hbar\\omega со стрелкой направления распространения',
    sampleSyntax: '\\draw[-{Stealth}, semithick, teal!80!black, decorate, decoration={snake, segment length=7pt, amplitude=2.5pt}] (1cm,2cm) -- (3.6cm,2cm);',
  },
  {
    id: 'pkg:optics-lens',
    familyId: 'physics-optics',
    familyLabelRu: 'Физика/Оптика',
    shortLabelRu: 'Линза',
    titleRu: 'Тонкая собирающая линза ГОСТ/оптика',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-SCI',
    requiredPackages: ['tikz'],
    requiredLibraries: ['arrows.meta'],
    conceptSummaryRu: 'Проведите вертикальную ось линзы — создастся двусторонняя стрелка {Stealth}-{Stealth} с меткой $L$',
    sampleSyntax: '\\draw[{Stealth}-{Stealth}, very thick, blue!75!black] (3.00cm,0.70cm) -- (3.00cm,3.10cm) node[above] {$L_1$};',
  },
  {
    id: 'pkg:automata-state',
    familyId: 'automata',
    familyLabelRu: 'Автоматы',
    shortLabelRu: 'Сост. q',
    titleRu: 'Состояние конечного автомата \\node[state] (automata)',
    gestureKind: 'click',
    roadmapStage: 'ST-UML',
    requiredPackages: ['tikz'],
    requiredLibraries: ['automata', 'arrows.meta'],
    conceptSummaryRu: 'Кликните на холсте — разместится состояние ДКА/НКА q_k (initial / accepting)',
    sampleSyntax: '\\node[state, initial] (q0) at (1.50cm,2.00cm) {$q_0$};',
  },
  {
    id: 'pkg:automata-edge',
    familyId: 'automata',
    familyLabelRu: 'Автоматы',
    shortLabelRu: 'Переход',
    titleRu: 'Дуга перехода между состояниями автомата (bend left / loop)',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-UML',
    requiredPackages: ['tikz'],
    requiredLibraries: ['automata', 'arrows.meta'],
    conceptSummaryRu: 'Потяните от одного состояния q_i к другому q_j (или на себя для петли)',
    sampleSyntax: '\\draw[-{Stealth}, semithick] (q0) to[bend left=20] node[above] {$a$} (q1);',
  },
  {
    id: 'pkg:circuit-R',
    familyId: 'circuitikz',
    familyLabelRu: 'CircuiTikZ',
    shortLabelRu: 'Резистор R',
    titleRu: 'Двухполюсник резистор to[R, l=$R_1$] (circuitikz)',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-ENG',
    requiredPackages: ['circuitikz'],
    requiredLibraries: [],
    conceptSummaryRu: 'Проведите ветвь между узлами схемы — вставится резистор R пакета circuitikz',
    sampleSyntax: '\\draw (1.00cm,2.00cm) to[R, l=$R_1$, *-*] (3.40cm,2.00cm);',
  },
  {
    id: 'pkg:circuit-C',
    familyId: 'circuitikz',
    familyLabelRu: 'CircuiTikZ',
    shortLabelRu: 'Конденс. C',
    titleRu: 'Конденсатор to[C, l=$C_1$] (circuitikz)',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-ENG',
    requiredPackages: ['circuitikz'],
    requiredLibraries: [],
    conceptSummaryRu: 'Емкостной двухполюсник C между двумя точками цепи',
    sampleSyntax: '\\draw (1.00cm,2.00cm) to[C, l=$C_1$, *-*] (3.40cm,2.00cm);',
  },
  {
    id: 'pkg:circuit-L',
    familyId: 'circuitikz',
    familyLabelRu: 'CircuiTikZ',
    shortLabelRu: 'Индукт. L',
    titleRu: 'Катушка индуктивности to[L, l=$L_1$] (circuitikz)',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-ENG',
    requiredPackages: ['circuitikz'],
    requiredLibraries: [],
    conceptSummaryRu: 'Индуктивный двухполюсник L пакета circuitikz',
    sampleSyntax: '\\draw (1.00cm,2.00cm) to[L, l=$L_1$, *-*] (3.40cm,2.00cm);',
  },
  {
    id: 'pkg:circuit-V',
    familyId: 'circuitikz',
    familyLabelRu: 'CircuiTikZ',
    shortLabelRu: 'Источн. U',
    titleRu: 'Источник ЭДС / напряжения to[V, v=$U_0$] (circuitikz)',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-ENG',
    requiredPackages: ['circuitikz'],
    requiredLibraries: [],
    conceptSummaryRu: 'Идеальный источник напряжения пакета circuitikz',
    sampleSyntax: '\\draw (1.00cm,0.80cm) to[V, l=$U_0$] (1.00cm,2.80cm);',
  },
  {
    id: 'pkg:circuit-Do',
    familyId: 'circuitikz',
    familyLabelRu: 'CircuiTikZ',
    shortLabelRu: 'Диод VD',
    titleRu: 'Полупроводниковый диод to[Do, l=$VD_1$] (circuitikz)',
    gestureKind: 'drag-segment',
    roadmapStage: 'ST-ENG',
    requiredPackages: ['circuitikz'],
    requiredLibraries: [],
    conceptSummaryRu: 'Выпрямительный диод между двумя узлами цепи',
    sampleSyntax: '\\draw (1.20cm,2.00cm) to[Do, l=$VD_1$] (3.40cm,2.00cm);',
  },
  {
    id: 'pkg:circuit-ground',
    familyId: 'circuitikz',
    familyLabelRu: 'CircuiTikZ',
    shortLabelRu: 'Земля GND',
    titleRu: 'Узел заземления node[ground] (circuitikz)',
    gestureKind: 'click',
    roadmapStage: 'ST-ENG',
    requiredPackages: ['circuitikz'],
    requiredLibraries: [],
    conceptSummaryRu: 'Кликните по узлу цепи для подключения общего провода ground',
    sampleSyntax: '\\draw (2.20cm,0.90cm) node[ground] {};',
  },
  {
    id: 'pkg:mech-support',
    familyId: 'mechanics',
    familyLabelRu: 'Механика',
    shortLabelRu: 'Опора ГОСТ',
    titleRu: 'Шарнирно-неподвижная опора балки с штриховкой земли',
    gestureKind: 'click',
    roadmapStage: 'ST-ENG',
    requiredPackages: ['tikz'],
    requiredLibraries: ['patterns'],
    conceptSummaryRu: 'Треугольная шарнирная опора с гребёнкой штриховки ГОСТ',
    sampleSyntax: '\\draw[semithick, fill=slate!12] (2.00cm,1.40cm) -- (1.75cm,1.00cm) -- (2.25cm,1.00cm) -- cycle;',
  },
  {
    id: 'pkg:chem-ring',
    familyId: 'chemfig',
    familyLabelRu: 'ChemFig',
    shortLabelRu: 'Кольцо C6',
    titleRu: 'Ароматическое / скелетное кольцо \\chemfig{*6(-=-=-=)}',
    gestureKind: 'click',
    roadmapStage: 'ST-CHEMBIO',
    requiredPackages: ['chemfig'],
    requiredLibraries: [],
    conceptSummaryRu: 'Размещает структурную молекулу пакета chemfig в узле TikZ',
    sampleSyntax: '\\node at (3.00cm,2.00cm) {\\chemfig{*6(-=-=-=)}};',
  },
];

export type RecognizedPackageObjectKind =
  | 'clean-line'
  | 'clean-arrow'
  | 'clean-rect'
  | 'clean-circle'
  | 'clean-node'
  | 'pgfplots-axis'
  | 'circuit-bipole'
  | 'circuit-ground'
  | 'automata-state'
  | 'automata-edge'
  | 'physics-spring'
  | 'physics-wave'
  | 'optics-lens'
  | 'mech-support'
  | 'chemfig-molecule';

export interface PgfplotsSeriesPreview {
  rawLine: string;
  color: string;
  pointsNorm: { u: number; v: number }[]; // normalized 0..1 inside axis box
  legend?: string;
}

export interface RecognizedPackageObject {
  objectId: string;
  kind: RecognizedPackageObjectKind;
  packageOwner: string;
  roadmapStage: RoadmapStageId;
  startLine: number; // 1-based inclusive
  endLine: number; // 1-based inclusive
  rawSnippet: string;
  // Geometric coordinates in TikZ cm
  x1Cm: number;
  y1Cm: number;
  x2Cm: number;
  y2Cm: number;
  radiusCm?: number;
  // Semantic package attributes
  nodeName?: string;
  labelLatex?: string;
  strokeColor?: string;
  fillColor?: string;
  circuitKind?: 'R' | 'C' | 'L' | 'V' | 'I' | 'Do' | 'lamp';
  stateInitial?: boolean;
  stateAccepting?: boolean;
  fromStateId?: string;
  toStateId?: string;
  bendDeg?: number;
  isSelfLoop?: boolean;
  axisEnv?: 'axis' | 'semilogxaxis' | 'loglogaxis';
  axisTitle?: string;
  axisXLabel?: string;
  axisYLabel?: string;
  axisGrid?: boolean;
  axisSeries?: PgfplotsSeriesPreview[];
  chemFormula?: string;
}

function fmtCm(val: number): string {
  return `${(Math.round(val * 100) / 100).toFixed(2)}cm`;
}

function parseScalarWithUnitToCm(raw: string, fallback = 0): number {
  const s = raw.trim();
  const m = /^([+-]?\d+(?:\.\d+)?)\s*(cm|mm|pt|in)?$/i.exec(s);
  if (!m) return fallback;
  const v = parseFloat(m[1]);
  const unit = (m[2] || 'cm').toLowerCase();
  if (unit === 'mm') return v / 10;
  if (unit === 'pt') return v * 0.0352778;
  if (unit === 'in') return v * 2.54;
  return v;
}

function parseCoordPairCm(insideParens: string): { x: number; y: number } | null {
  const parts = insideParens.split(',');
  if (parts.length !== 2) return null;
  const x = parseScalarWithUnitToCm(parts[0], NaN);
  const y = parseScalarWithUnitToCm(parts[1], NaN);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return { x, y };
}

function stripInlineTexComment(line: string): string {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '%') {
      let bs = 0;
      let k = i - 1;
      while (k >= 0 && line[k] === '\\') {
        bs++;
        k--;
      }
      if (bs % 2 === 0) return line.slice(0, i).trim();
    }
  }
  return line.trim();
}

function ensurePackagesAndLibsInPreamble(
  source: string,
  packages: string[],
  libraries: string[]
): { nextSource: string; autoConnected: string[] } {
  let cur = source;
  const autoConnected: string[] = [];
  const insp = inspectPreambleConnections(cur);

  for (const pkg of packages) {
    if (pkg === 'tikz') continue;
    const already = insp.packages.some((p) => p.name === pkg);
    if (!already) {
      const toggled = togglePackageInPreamble(cur, pkg, true);
      if (toggled.ok && toggled.nextSource !== cur) {
        cur = toggled.nextSource;
        autoConnected.push(`\\usepackage{${pkg}}`);
      }
    }
  }

  for (const lib of libraries) {
    const curInsp = inspectPreambleConnections(cur);
    const already = curInsp.tikzLibraries.some((l) => l.name === lib);
    if (!already) {
      const plan = proposeLibraryConnect(cur, lib);
      if (plan.ok && plan.nextSource !== cur) {
        cur = plan.nextSource;
        autoConnected.push(`\\usetikzlibrary{${lib}}`);
      }
    }
  }

  return { nextSource: cur, autoConnected };
}

function parseSampleSeriesForAxis(axisBlockLines: string[]): PgfplotsSeriesPreview[] {
  const out: PgfplotsSeriesPreview[] = [];
  const rawPtsAll: { x: number; y: number; seriesIdx: number }[] = [];
  const seriesRaw: { rawLine: string; color: string; pts: { x: number; y: number }[] }[] = [];

  for (const raw of axisBlockLines) {
    const clean = stripInlineTexComment(raw);
    if (!clean.startsWith('\\addplot')) continue;
    const optMatch = /^\\addplot\+?\s*\[([^\]]*)\]/.exec(clean);
    const opts = optMatch ? optMatch[1] : '';
    const color =
      opts.includes('red')
        ? '#b91c1c'
        : opts.includes('teal') || opts.includes('emerald')
          ? '#0f766e'
          : opts.includes('orange')
            ? '#c2410c'
            : opts.includes('violet')
              ? '#6d28d9'
              : '#1d4ed8';

    const coordsMatch = /coordinates\s*\{([^}]*)\}/.exec(clean);
    const pts: { x: number; y: number }[] = [];
    if (coordsMatch) {
      const pairRe = /\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)/g;
      let pm: RegExpExecArray | null;
      while ((pm = pairRe.exec(coordsMatch[1])) !== null) {
        pts.push({ x: parseFloat(pm[1]), y: parseFloat(pm[2]) });
      }
    } else {
      const exprMatch = /\{\s*([^}]+)\s*\}\s*;/.exec(clean);
      const domMatch = /domain\s*=\s*([+-]?\d+(?:\.\d+)?)\s*:\s*([+-]?\d+(?:\.\d+)?)/.exec(opts);
      const x0 = domMatch ? parseFloat(domMatch[1]) : 0;
      const x1 = domMatch ? parseFloat(domMatch[2]) : 4;
      const expr = exprMatch ? exprMatch[1] : 'x';
      for (let k = 0; k <= 16; k++) {
        const x = x0 + ((x1 - x0) * k) / 16;
        let y = 0.5 * x;
        if (expr.includes('sin')) {
          y = 0.55 * Math.sin(1.7 * x) + 0.35 * x;
        } else if (expr.includes('exp') || expr.includes('^2')) {
          y = expr.includes('-') ? Math.exp(-0.5 * x) : 0.18 * x * x;
        } else if (expr.includes('cos')) {
          y = 0.6 * Math.cos(1.6 * x) + 0.5;
        }
        pts.push({ x, y });
      }
    }

    if (pts.length >= 2) {
      const idx = seriesRaw.length;
      seriesRaw.push({ rawLine: clean, color, pts });
      for (const p of pts) rawPtsAll.push({ x: p.x, y: p.y, seriesIdx: idx });
    }
  }

  if (seriesRaw.length === 0) return out;
  const minX = Math.min(...rawPtsAll.map((p) => p.x));
  const maxX = Math.max(...rawPtsAll.map((p) => p.x));
  const minY = Math.min(...rawPtsAll.map((p) => p.y));
  const maxY = Math.max(...rawPtsAll.map((p) => p.y));
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);

  for (const s of seriesRaw) {
    out.push({
      rawLine: s.rawLine,
      color: s.color,
      pointsNorm: s.pts.map((p) => ({
        u: Math.max(0.04, Math.min(0.96, 0.06 + 0.88 * ((p.x - minX) / spanX))),
        v: Math.max(0.04, Math.min(0.96, 0.08 + 0.84 * ((p.y - minY) / spanY))),
      })),
    });
  }

  return out;
}

/**
 * Directly parses clean idiomatic TikZ & package constructs inside `\begin{tikzpicture}...\end{tikzpicture}`
 * WITHOUT requiring `% tikzarium:n1:` hex metadata comments (MOD-06 & MOD-07).
 */
export function parseScenePackageObjects(source: string): RecognizedPackageObject[] {
  const lines = source.split(/\r?\n/);
  const results: RecognizedPackageObject[] = [];
  let inTikz = false;

  // First pass: collect known named node positions (both N1 and clean \node / \coordinate)
  const statePositions = new Map<string, { x: number; y: number }>();
  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    if (raw.includes('\\begin{tikzpicture}')) inTikz = true;
    if (!inTikz) continue;
    if (raw.includes('\\end{tikzpicture}')) {
      inTikz = false;
      continue;
    }
    const clean = stripInlineTexComment(raw);
    const nodePosMatch =
      /^\\(?:node|coordinate)\b(?:\s*\[[^\]]*\])?\s*\(\s*([a-zA-Z0-9_:-]+)\s*\)\s*at\s*\(([^)]+)\)/.exec(
        clean
      );
    if (nodePosMatch) {
      const pt = parseCoordPairCm(nodePosMatch[2]);
      if (pt) statePositions.set(nodePosMatch[1], pt);
    }
  }

  inTikz = false;
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    if (rawLine.includes('\\begin{tikzpicture}')) {
      inTikz = true;
      continue;
    }
    if (rawLine.includes('\\end{tikzpicture}')) {
      inTikz = false;
      continue;
    }
    if (!inTikz) continue;

    // Skip lines already owned by `% tikzarium:n1:` so they aren't rendered twice
    if (rawLine.includes(OWNERSHIP_MARKER.trim())) continue;

    const clean = stripInlineTexComment(rawLine);
    if (!clean) continue;

    // 1. Multi-line or single-line PGFPlots `\begin{axis|semilogxaxis|loglogaxis}` (MOD-07)
    const axisBegin = /^\\begin\{(axis|semilogxaxis|loglogaxis)\}/.exec(clean);
    if (axisBegin) {
      const envName = axisBegin[1] as 'axis' | 'semilogxaxis' | 'loglogaxis';
      let endIdx = i;
      while (endIdx < lines.length && !lines[endIdx].includes(`\\end{${envName}}`)) {
        endIdx++;
      }
      if (endIdx >= lines.length) endIdx = i;
      const blockLines = lines.slice(i, endIdx + 1);
      const blockJoined = blockLines.map(stripInlineTexComment).join(' ');

      const atMatch = /at\s*=\s*\{\s*\(([^)]+)\)\s*\}/.exec(blockJoined);
      const atPt = atMatch ? parseCoordPairCm(atMatch[1]) : { x: 0.7, y: 0.55 };
      const x1 = atPt ? atPt.x : 0.7;
      const y1 = atPt ? atPt.y : 0.55;
      const wMatch = /width\s*=\s*([+-]?\d+(?:\.\d+)?(?:cm|mm|pt|in)?)/.exec(blockJoined);
      const hMatch = /height\s*=\s*([+-]?\d+(?:\.\d+)?(?:cm|mm|pt|in)?)/.exec(blockJoined);
      // PGFPlots `width`/`height` include label padding; clamp sensibly to stage
      const wCm = Math.max(1.8, Math.min(8.2, wMatch ? parseScalarWithUnitToCm(wMatch[1], 4.6) : 4.6));
      const hCm = Math.max(1.4, Math.min(4.8, hMatch ? parseScalarWithUnitToCm(hMatch[1], 2.9) : 2.9));
      const xlabelMatch = /xlabel\s*=\s*\{([^}]*)\}/.exec(blockJoined);
      const ylabelMatch = /ylabel\s*=\s*\{([^}]*)\}/.exec(blockJoined);
      const titleMatch = /title\s*=\s*\{([^}]*)\}/.exec(blockJoined);
      const hasGrid = /grid\s*=\s*(?:both|major|minor)/.test(blockJoined);

      results.push({
        objectId: `pkg-L${lineNum}`,
        kind: 'pgfplots-axis',
        packageOwner: 'pgfplots',
        roadmapStage: 'ST-SCI',
        startLine: lineNum,
        endLine: endIdx + 1,
        rawSnippet: blockLines[0].trim(),
        x1Cm: x1,
        y1Cm: y1,
        x2Cm: +(x1 + wCm).toFixed(2),
        y2Cm: +(y1 + hCm).toFixed(2),
        axisEnv: envName,
        axisTitle: titleMatch?.[1]?.trim() ?? '',
        axisXLabel: xlabelMatch?.[1]?.trim() ?? '$x$',
        axisYLabel: ylabelMatch?.[1]?.trim() ?? '$y$',
        axisGrid: hasGrid,
        axisSeries: parseSampleSeriesForAxis(blockLines),
      });
      i = endIdx;
      continue;
    }

    // 2. CircuiTikZ Ground `\draw (x,y) node[ground] {};`
    const gndMatch = /^\\draw\s*\(([^)]+)\)\s*node\s*\[\s*ground[^\]]*\]/.exec(clean);
    if (gndMatch) {
      const pt = parseCoordPairCm(gndMatch[1]);
      if (pt) {
        results.push({
          objectId: `pkg-L${lineNum}`,
          kind: 'circuit-ground',
          packageOwner: 'circuitikz',
          roadmapStage: 'ST-ENG',
          startLine: lineNum,
          endLine: lineNum,
          rawSnippet: clean,
          x1Cm: pt.x,
          y1Cm: pt.y,
          x2Cm: pt.x,
          y2Cm: +(pt.y - 0.42).toFixed(2),
          labelLatex: 'GND',
        });
        continue;
      }
    }

    // 3. CircuiTikZ Bipole `\draw (x1,y1) to[R, l=$R_1$, ...] (x2,y2);`
    const bipoleMatch =
      /^\\draw(?:\s*\[[^\]]*\])?\s*\(([^)]+)\)\s*to\s*\[\s*(R|C|L|V|I|Do|D\*|lamp|american resistor|european resistor)([^\]]*)\]\s*\(([^)]+)\)\s*;/.exec(
        clean
      );
    if (bipoleMatch) {
      const p1 = parseCoordPairCm(bipoleMatch[1]) ?? statePositions.get(bipoleMatch[1].trim());
      const p2 = parseCoordPairCm(bipoleMatch[4]) ?? statePositions.get(bipoleMatch[4].trim());
      if (p1 && p2) {
        const rawType = bipoleMatch[2];
        const circuitKind: RecognizedPackageObject['circuitKind'] =
          rawType.startsWith('R') || rawType.includes('resistor')
            ? 'R'
            : rawType === 'C'
              ? 'C'
              : rawType === 'L'
                ? 'L'
                : rawType === 'V'
                  ? 'V'
                  : rawType === 'I'
                    ? 'I'
                    : rawType === 'lamp'
                      ? 'lamp'
                      : 'Do';
        const restOpts = bipoleMatch[3] || '';
        const lblMatch = /(?:l|v|i)\s*=\s*([^,\]]+)/.exec(restOpts);
        results.push({
          objectId: `pkg-L${lineNum}`,
          kind: 'circuit-bipole',
          packageOwner: 'circuitikz',
          roadmapStage: 'ST-ENG',
          startLine: lineNum,
          endLine: lineNum,
          rawSnippet: clean,
          x1Cm: p1.x,
          y1Cm: p1.y,
          x2Cm: p2.x,
          y2Cm: p2.y,
          circuitKind,
          labelLatex: lblMatch ? lblMatch[1].trim().replace(/^\{|\}$/g, '') : `$${circuitKind}$`,
        });
        continue;
      }
    }

    // 4. ChemFig Molecule `\node ... at (x,y) {\chemfig{...}};`
    const chemMatch =
      /^\\node(?:\s*\[[^\]]*\])?(?:\s*\([^)]+\))?\s*at\s*\(([^)]+)\)\s*\{\s*\\chemfig\{([^}]*)\}\s*\}\s*;/.exec(
        clean
      );
    if (chemMatch) {
      const pt = parseCoordPairCm(chemMatch[1]);
      if (pt) {
        results.push({
          objectId: `pkg-L${lineNum}`,
          kind: 'chemfig-molecule',
          packageOwner: 'chemfig',
          roadmapStage: 'ST-CHEMBIO',
          startLine: lineNum,
          endLine: lineNum,
          rawSnippet: clean,
          x1Cm: +(pt.x - 0.55).toFixed(2),
          y1Cm: +(pt.y - 0.55).toFixed(2),
          x2Cm: +(pt.x + 0.55).toFixed(2),
          y2Cm: +(pt.y + 0.55).toFixed(2),
          chemFormula: chemMatch[2].trim(),
          labelLatex: chemMatch[2].trim(),
        });
        continue;
      }
    }

    // 5. Automata State `\node[state, ...] (q0) at (x,y) {$q_0$};`
    const stateMatch =
      /^\\node\s*\[\s*([^\]]*\bstate\b[^\]]*)\]\s*(?:\(\s*([a-zA-Z0-9_:-]+)\s*\))?\s*at\s*\(([^)]+)\)\s*\{([^}]*)\}\s*;/.exec(
        clean
      );
    if (stateMatch) {
      const pt = parseCoordPairCm(stateMatch[3]);
      if (pt) {
        const opts = stateMatch[1];
        const stateId = stateMatch[2] || `q${lineNum}`;
        statePositions.set(stateId, pt);
        results.push({
          objectId: `pkg-L${lineNum}`,
          kind: 'automata-state',
          packageOwner: 'automata',
          roadmapStage: 'ST-UML',
          startLine: lineNum,
          endLine: lineNum,
          rawSnippet: clean,
          x1Cm: pt.x,
          y1Cm: pt.y,
          x2Cm: pt.x,
          y2Cm: pt.y,
          radiusCm: 0.42,
          nodeName: stateId,
          labelLatex: stateMatch[4].trim() || `$${stateId}$`,
          stateInitial: /\binitial\b/.test(opts),
          stateAccepting: /\baccepting\b/.test(opts),
        });
        continue;
      }
    }

    // 6. Automata / Graph Transition `\draw[...] (q0) to[bend left=20] node[...] {a} (q1);` or `edge[loop above]`
    const edgeMatch =
      /^\\(?:draw|path)(?:\s*\[[^\]]*\])?\s*\(\s*([a-zA-Z0-9_:-]+)\s*\)\s*(?:to|edge)\s*\[([^\]]*)\]\s*(?:node(?:\s*\[[^\]]*\])?\s*\{([^}]*)\}\s*)?\(\s*([a-zA-Z0-9_:-]*)\s*\)\s*;/.exec(
        clean
      );
    if (edgeMatch) {
      const fromId = edgeMatch[1];
      const toId = edgeMatch[4] || fromId;
      const p1 = statePositions.get(fromId);
      const p2 = statePositions.get(toId) ?? p1;
      if (p1 && p2) {
        const edgeOpts = edgeMatch[2];
        const isLoop = /\bloop\b/.test(edgeOpts) || fromId === toId;
        const bendM = /bend\s+(left|right)(?:\s*=\s*([+-]?\d+))?/.exec(edgeOpts);
        const bendMag = bendM ? (bendM[2] ? parseInt(bendM[2], 10) : 20) : 0;
        const bendDeg = bendM ? (bendM[1] === 'left' ? bendMag : -bendMag) : 0;
        results.push({
          objectId: `pkg-L${lineNum}`,
          kind: 'automata-edge',
          packageOwner: 'automata',
          roadmapStage: 'ST-UML',
          startLine: lineNum,
          endLine: lineNum,
          rawSnippet: clean,
          x1Cm: p1.x,
          y1Cm: p1.y,
          x2Cm: p2.x,
          y2Cm: p2.y,
          fromStateId: fromId,
          toStateId: toId,
          isSelfLoop: isLoop,
          bendDeg,
          labelLatex: edgeMatch[3]?.trim() ?? '',
        });
        continue;
      }
    }

    // 7. Physics Spring / Wave (`decoration={coil...}` or `decoration={snake...}`)
    const decoSegMatch =
      /^\\draw\s*\[([^\]]*decoration\s*=\s*\{\s*(coil|snake)[^\]]*)\]\s*\(([^)]+)\)\s*--\s*\(([^)]+)\)\s*;/.exec(
        clean
      );
    if (decoSegMatch) {
      const p1 = parseCoordPairCm(decoSegMatch[3]);
      const p2 = parseCoordPairCm(decoSegMatch[4]);
      if (p1 && p2) {
        const isCoil = decoSegMatch[2] === 'coil';
        results.push({
          objectId: `pkg-L${lineNum}`,
          kind: isCoil ? 'physics-spring' : 'physics-wave',
          packageOwner: 'decorations.pathmorphing',
          roadmapStage: 'ST-SCI',
          startLine: lineNum,
          endLine: lineNum,
          rawSnippet: clean,
          x1Cm: p1.x,
          y1Cm: p1.y,
          x2Cm: p2.x,
          y2Cm: p2.y,
          strokeColor: decoSegMatch[1].includes('teal') ? 'teal!80!black' : 'black',
        });
        continue;
      }
    }

    // 8. Thin Optical Lens `\draw[{Stealth}-{Stealth}, ...] (x1,y1) -- (x2,y2) node[above] {$L$};`
    const lensMatch =
      /^\\draw\s*\[\s*(?:\{?Stealth\}?-\{?Stealth\}?|<->)([^\]]*)\]\s*\(([^)]+)\)\s*--\s*\(([^)]+)\)(?:\s*node(?:\s*\[[^\]]*\])?\s*\{([^}]*)\})?\s*;/.exec(
        clean
      );
    if (lensMatch) {
      const p1 = parseCoordPairCm(lensMatch[2]);
      const p2 = parseCoordPairCm(lensMatch[3]);
      if (p1 && p2) {
        results.push({
          objectId: `pkg-L${lineNum}`,
          kind: 'optics-lens',
          packageOwner: 'arrows.meta',
          roadmapStage: 'ST-SCI',
          startLine: lineNum,
          endLine: lineNum,
          rawSnippet: clean,
          x1Cm: p1.x,
          y1Cm: p1.y,
          x2Cm: p2.x,
          y2Cm: p2.y,
          labelLatex: lensMatch[4]?.trim() || '$L$',
          strokeColor: 'blue!75!black',
        });
        continue;
      }
    }

    // 9. Clean TikZ Node `\node[...] (id) at (x,y) {text};`
    const cleanNodeMatch =
      /^\\node(?:\s*\[([^\]]*)\])?(?:\s*\(\s*([a-zA-Z0-9_:-]+)\s*\))?\s*at\s*\(([^)]+)\)\s*\{([^}]*)\}\s*;/.exec(
        clean
      );
    if (cleanNodeMatch) {
      const pt = parseCoordPairCm(cleanNodeMatch[3]);
      if (pt) {
        results.push({
          objectId: `pkg-L${lineNum}`,
          kind: 'clean-node',
          packageOwner: 'tikz',
          roadmapStage: 'ST-SCI',
          startLine: lineNum,
          endLine: lineNum,
          rawSnippet: clean,
          x1Cm: pt.x,
          y1Cm: pt.y,
          x2Cm: pt.x,
          y2Cm: pt.y,
          nodeName: cleanNodeMatch[2] || undefined,
          labelLatex: cleanNodeMatch[4].trim(),
        });
        continue;
      }
    }

    // 10. Clean TikZ Rectangle `\draw[...] (x1,y1) rectangle (x2,y2);`
    const rectMatch =
      /^\\(?:draw|filldraw|fill)(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)\s*rectangle\s*\(([^)]+)\)\s*;/.exec(
        clean
      );
    if (rectMatch) {
      const p1 = parseCoordPairCm(rectMatch[2]);
      const p2 = parseCoordPairCm(rectMatch[3]);
      if (p1 && p2) {
        const opts = rectMatch[1] || '';
        const fillM = /fill\s*=\s*([^,\]]+)/.exec(opts);
        results.push({
          objectId: `pkg-L${lineNum}`,
          kind: 'clean-rect',
          packageOwner: 'tikz',
          roadmapStage: 'ST-SCI',
          startLine: lineNum,
          endLine: lineNum,
          rawSnippet: clean,
          x1Cm: p1.x,
          y1Cm: p1.y,
          x2Cm: p2.x,
          y2Cm: p2.y,
          fillColor: fillM ? fillM[1].trim() : undefined,
        });
        continue;
      }
    }

    // 11. Clean TikZ Circle `\draw[...] (x,y) circle[radius=r];` or `circle (rcm);`
    const circleMatch =
      /^\\(?:draw|filldraw|fill)(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)\s*circle\s*(?:\[\s*radius\s*=\s*([^\]]+)\s*\]|\(\s*([^)]+)\s*\))\s*;/.exec(
        clean
      );
    if (circleMatch) {
      const center = parseCoordPairCm(circleMatch[2]);
      const rRaw = circleMatch[3] || circleMatch[4] || '0.5cm';
      const rCm = parseScalarWithUnitToCm(rRaw, 0.5);
      if (center && rCm > 0) {
        results.push({
          objectId: `pkg-L${lineNum}`,
          kind: 'clean-circle',
          packageOwner: 'tikz',
          roadmapStage: 'ST-SCI',
          startLine: lineNum,
          endLine: lineNum,
          rawSnippet: clean,
          x1Cm: center.x,
          y1Cm: center.y,
          x2Cm: +(center.x + rCm).toFixed(2),
          y2Cm: center.y,
          radiusCm: rCm,
        });
        continue;
      }
    }

    // 12. Clean Mechanical Support Triangle (`-- ... -- ... -- cycle` with 3 vertices & small span)
    const triMatch =
      /^\\(?:draw|filldraw)(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)\s*--\s*\(([^)]+)\)\s*--\s*\(([^)]+)\)\s*--\s*cycle\s*;/.exec(
        clean
      );
    if (triMatch && (triMatch[1] || '').includes('tz-support')) {
      const top = parseCoordPairCm(triMatch[2]);
      if (top) {
        results.push({
          objectId: `pkg-L${lineNum}`,
          kind: 'mech-support',
          packageOwner: 'patterns',
          roadmapStage: 'ST-ENG',
          startLine: lineNum,
          endLine: lineNum,
          rawSnippet: clean,
          x1Cm: top.x,
          y1Cm: top.y,
          x2Cm: top.x,
          y2Cm: +(top.y - 0.4).toFixed(2),
          labelLatex: 'Опора',
        });
        continue;
      }
    }

    // 13. Clean TikZ Line / Arrow `\draw[...] (x1,y1) -- (x2,y2);`
    const segMatch =
      /^\\draw(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)\s*--\s*\(([^)]+)\)\s*;/.exec(clean);
    if (segMatch) {
      const p1 = parseCoordPairCm(segMatch[2]);
      const p2 = parseCoordPairCm(segMatch[3]);
      if (p1 && p2) {
        const opts = segMatch[1] || '';
        const isArrow = /->|Stealth|Latex/.test(opts);
        results.push({
          objectId: `pkg-L${lineNum}`,
          kind: isArrow ? 'clean-arrow' : 'clean-line',
          packageOwner: isArrow && /Stealth|Latex/.test(opts) ? 'arrows.meta' : 'tikz',
          roadmapStage: 'ST-SCI',
          startLine: lineNum,
          endLine: lineNum,
          rawSnippet: clean,
          x1Cm: p1.x,
          y1Cm: p1.y,
          x2Cm: p2.x,
          y2Cm: p2.y,
        });
        continue;
      }
    }
  }

  return results;
}

/**
 * Inserts a newly drawn package-semantic object into `\begin{tikzpicture}...\end{tikzpicture}`
 * using pure idiomatic package syntax (NO `% tikzarium:n1:` hex metadata!) and auto-connecting
 * required `\usepackage` / `\usetikzlibrary` declarations in the preamble.
 */
export function insertPackageCanvasObjectFromGesture(
  source: string,
  toolId: PackageToolId,
  startCm: { x: number; y: number },
  endCm: { x: number; y: number }
): {
  ok: boolean;
  nextSource: string;
  insertedLine: number;
  autoConnected: string[];
  summaryRu: string;
} {
  const spec = PACKAGE_CANVAS_TOOLS.find((t) => t.id === toolId);
  if (!spec) {
    return {
      ok: false,
      nextSource: source,
      insertedLine: 1,
      autoConnected: [],
      summaryRu: `Неизвестный инструмент пакета: ${toolId}`,
    };
  }

  const ensured = ensurePackagesAndLibsInPreamble(
    source,
    spec.requiredPackages,
    spec.requiredLibraries
  );
  const curSource = ensured.nextSource;
  const eol = detectDocumentLineEnding(curSource);
  const existingObjs = parseScenePackageObjects(curSource);

  // Guard minimum span on drag tools
  const dx = endCm.x - startCm.x;
  const dy = endCm.y - startCm.y;
  const dist = Math.hypot(dx, dy);
  const p2 =
    spec.gestureKind !== 'click' && dist < 0.25
      ? {
          x: +(startCm.x + (spec.gestureKind === 'drag-box' ? 2.8 : 1.8)).toFixed(2),
          y: +(startCm.y + (spec.gestureKind === 'drag-box' ? 1.8 : 0)).toFixed(2),
        }
      : endCm;

  // Special case: `pkg:pgfplots-series` appends `\addplot` into an existing `axis` if one exists!
  if (toolId === 'pkg:pgfplots-series') {
    const existingAxis = existingObjs.find((o) => o.kind === 'pgfplots-axis');
    if (existingAxis) {
      const lines = curSource.split(/\r?\n/);
      const yA = +(0.3 + Math.max(0, startCm.y - existingAxis.y1Cm) * 0.6).toFixed(2);
      const yB = +(0.3 + Math.max(0, p2.y - existingAxis.y1Cm) * 0.6).toFixed(2);
      const yMid = +((yA + yB) / 2 + 0.35).toFixed(2);
      const seriesCount = (existingAxis.axisSeries?.length ?? 0) + 1;
      const palette = ['red!75!black', 'teal!80!black', 'orange!85!black', 'violet!80!black'];
      const col = palette[(seriesCount - 1) % palette.length];
      const plotLine = `    \\addplot[smooth, thick, ${col}, mark=*] coordinates {(0,${yA}) (1.3,${yMid}) (2.7,${+(yMid * 0.85).toFixed(2)}) (4,${yB})};`;
      const endLineIdx = existingAxis.endLine - 1;
      const patched = applyCheckedLineRangePatch(
        curSource,
        endLineIdx + 1,
        endLineIdx + 1,
        [plotLine, lines[endLineIdx]],
        'Добавлена серия \\addplot в окружение axis'
      );
      return {
        ok: patched.ok,
        nextSource: patched.nextSource,
        insertedLine: existingAxis.endLine,
        autoConnected: ensured.autoConnected,
        summaryRu: `Добавлена серия \\addplot #${seriesCount} в окружение \\begin{axis}`,
      };
    }
  }

  let newLines: string[] = [];
  const x1s = fmtCm(startCm.x);
  const y1s = fmtCm(startCm.y);
  const x2s = fmtCm(p2.x);
  const y2s = fmtCm(p2.y);

  switch (toolId) {
    case 'pkg:clean-line':
      newLines = [`  \\draw[semithick] (${x1s},${y1s}) -- (${x2s},${y2s});`];
      break;
    case 'pkg:clean-arrow':
      newLines = [`  \\draw[-{Stealth}, semithick] (${x1s},${y1s}) -- (${x2s},${y2s});`];
      break;
    case 'pkg:clean-rect': {
      const minX = fmtCm(Math.min(startCm.x, p2.x));
      const minY = fmtCm(Math.min(startCm.y, p2.y));
      const maxX = fmtCm(Math.max(startCm.x, p2.x));
      const maxY = fmtCm(Math.max(startCm.y, p2.y));
      newLines = [`  \\draw[semithick, fill=cyan!10] (${minX},${minY}) rectangle (${maxX},${maxY});`];
      break;
    }
    case 'pkg:clean-circle': {
      const r = Math.max(0.25, Math.hypot(p2.x - startCm.x, p2.y - startCm.y));
      newLines = [`  \\draw[semithick] (${x1s},${y1s}) circle[radius=${fmtCm(r)}];`];
      break;
    }
    case 'pkg:clean-node': {
      const idx = existingObjs.filter((o) => o.kind === 'clean-node').length + 1;
      newLines = [`  \\node (N${idx}) at (${x1s},${y1s}) {$f_${idx}(x)$};`];
      break;
    }
    case 'pkg:pgfplots-axis':
    case 'pkg:pgfplots-series': {
      const minX = Math.min(startCm.x, p2.x);
      const minY = Math.min(startCm.y, p2.y);
      const w = Math.max(2.6, Math.abs(p2.x - startCm.x));
      const h = Math.max(1.9, Math.abs(p2.y - startCm.y));
      newLines = [
        `  \\begin{axis}[at={(${fmtCm(minX)},${fmtCm(minY)})}, anchor=south west, scale only axis, width=${fmtCm(w)}, height=${fmtCm(h)}, xlabel={$x$}, ylabel={$f(x)$}, grid=both]`,
        `    \\addplot[smooth, thick, blue!75!black, domain=0:4, samples=33] {0.55*sin(deg(1.7*x)) + 0.35*x};`,
        `  \\end{axis}`,
      ];
      break;
    }
    case 'pkg:circuit-R': {
      const n = existingObjs.filter((o) => o.circuitKind === 'R').length + 1;
      newLines = [`  \\draw (${x1s},${y1s}) to[R, l=$R_${n}$, *-*] (${x2s},${y2s});`];
      break;
    }
    case 'pkg:circuit-C': {
      const n = existingObjs.filter((o) => o.circuitKind === 'C').length + 1;
      newLines = [`  \\draw (${x1s},${y1s}) to[C, l=$C_${n}$, *-*] (${x2s},${y2s});`];
      break;
    }
    case 'pkg:circuit-L': {
      const n = existingObjs.filter((o) => o.circuitKind === 'L').length + 1;
      newLines = [`  \\draw (${x1s},${y1s}) to[L, l=$L_${n}$, *-*] (${x2s},${y2s});`];
      break;
    }
    case 'pkg:circuit-V': {
      const n = existingObjs.filter((o) => o.circuitKind === 'V').length + 1;
      newLines = [`  \\draw (${x1s},${y1s}) to[V, l=$U_${n}$] (${x2s},${y2s});`];
      break;
    }
    case 'pkg:circuit-Do': {
      const n = existingObjs.filter((o) => o.circuitKind === 'Do').length + 1;
      newLines = [`  \\draw (${x1s},${y1s}) to[Do, l=$VD_${n}$] (${x2s},${y2s});`];
      break;
    }
    case 'pkg:circuit-ground':
      newLines = [`  \\draw (${x1s},${y1s}) node[ground] {};`];
      break;
    case 'pkg:automata-state': {
      const states = existingObjs.filter((o) => o.kind === 'automata-state');
      const idx = states.length;
      const flags = idx === 0 ? 'state, initial' : 'state';
      newLines = [`  \\node[${flags}] (q${idx}) at (${x1s},${y1s}) {$q_${idx}$};`];
      break;
    }
    case 'pkg:automata-edge': {
      const states = existingObjs.filter((o) => o.kind === 'automata-state');
      const nearest = (pt: { x: number; y: number }) => {
        let best: RecognizedPackageObject | null = null;
        let bestD = 1.4;
        for (const st of states) {
          const d = Math.hypot(st.x1Cm - pt.x, st.y1Cm - pt.y);
          if (d < bestD) {
            bestD = d;
            best = st;
          }
        }
        return best;
      };
      const sFrom = nearest(startCm);
      const sTo = nearest(p2);
      if (sFrom && sTo && sFrom.nodeName && sTo.nodeName) {
        if (sFrom.nodeName === sTo.nodeName) {
          newLines = [
            `  \\draw[-{Stealth}, semithick] (${sFrom.nodeName}) to[loop above] node[above] {$a$} (${sTo.nodeName});`,
          ];
        } else {
          newLines = [
            `  \\draw[-{Stealth}, semithick] (${sFrom.nodeName}) to[bend left=20] node[above] {$a$} (${sTo.nodeName});`,
          ];
        }
      } else {
        // Auto-create two connected states if none near endpoints
        const baseIdx = states.length;
        const idA = sFrom?.nodeName ?? `q${baseIdx}`;
        const idB = sTo?.nodeName ?? `q${baseIdx + (sFrom ? 0 : 1)}`;
        if (!sFrom) {
          newLines.push(`  \\node[state${baseIdx === 0 ? ', initial' : ''}] (${idA}) at (${x1s},${y1s}) {$q_${baseIdx}$};`);
        }
        if (!sTo) {
          const idxB = baseIdx + (sFrom ? 0 : 1);
          newLines.push(`  \\node[state, accepting] (${idB}) at (${x2s},${y2s}) {$q_${idxB}$};`);
        }
        newLines.push(`  \\draw[-{Stealth}, semithick] (${idA}) to[bend left=20] node[above] {$a$} (${idB});`);
      }
      break;
    }
    case 'pkg:physics-spring':
      newLines = [
        `  \\draw[semithick, decorate, decoration={coil, aspect=0.45, segment length=5pt, amplitude=3.5pt}] (${x1s},${y1s}) -- (${x2s},${y2s});`,
      ];
      break;
    case 'pkg:physics-wave':
      newLines = [
        `  \\draw[-{Stealth}, semithick, teal!80!black, decorate, decoration={snake, segment length=7pt, amplitude=2.5pt}] (${x1s},${y1s}) -- (${x2s},${y2s});`,
      ];
      break;
    case 'pkg:optics-lens': {
      const xMid = fmtCm(startCm.x);
      const yLow = fmtCm(Math.min(startCm.y, p2.y));
      const yHigh = fmtCm(Math.max(startCm.y, p2.y));
      newLines = [
        `  \\draw[{Stealth}-{Stealth}, very thick, blue!75!black] (${xMid},${yLow}) -- (${xMid},${yHigh}) node[above] {$L$};`,
      ];
      break;
    }
    case 'pkg:mech-support': {
      const topX = startCm.x;
      const topY = startCm.y;
      newLines = [
        `  \\draw[semithick, fill=black!10, % tz-support`,
        `  ] (${fmtCm(topX)},${fmtCm(topY)}) -- (${fmtCm(topX - 0.28)},${fmtCm(topY - 0.42)}) -- (${fmtCm(topX + 0.28)},${fmtCm(topY - 0.42)}) -- cycle;`,
      ];
      // Keep single-line clean idiom for easy dragging
      newLines = [
        `  \\draw[semithick, pattern=north east lines] (${fmtCm(topX)},${fmtCm(topY)}) -- (${fmtCm(topX - 0.26)},${fmtCm(topY - 0.38)}) -- (${fmtCm(topX + 0.26)},${fmtCm(topY - 0.38)}) -- cycle; % tz-support`,
      ];
      break;
    }
    case 'pkg:chem-ring':
      newLines = [`  \\node at (${x1s},${y1s}) {\\chemfig{*6(-=-=-=)}};`];
      break;
  }

  const lines = curSource.split(/\r?\n/);
  let endTikzLine1 = lines.findIndex((l) => l.includes('\\end{tikzpicture}')) + 1;
  if (endTikzLine1 === 0) {
    // Wrap into tikzpicture if missing
    const fallback = `${curSource}${eol}\\begin{tikzpicture}${eol}${newLines.join(eol)}${eol}\\end{tikzpicture}${eol}`;
    return {
      ok: true,
      nextSource: fallback,
      insertedLine: lines.length + 2,
      autoConnected: ensured.autoConnected,
      summaryRu: `Добавлен объект «${spec.shortLabelRu}» (${spec.familyLabelRu})`,
    };
  }

  const patched = applyCheckedLineRangePatch(
    curSource,
    endTikzLine1,
    endTikzLine1,
    [...newLines, lines[endTikzLine1 - 1]],
    `Добавлен объект пакета ${spec.familyLabelRu}: ${spec.shortLabelRu}`
  );

  const autoNote =
    ensured.autoConnected.length > 0
      ? ` · подключено: ${ensured.autoConnected.join(', ')}`
      : '';

  return {
    ok: patched.ok,
    nextSource: patched.nextSource,
    insertedLine: endTikzLine1,
    autoConnected: ensured.autoConnected,
    summaryRu: `Добавлен объект «${spec.shortLabelRu}» (${spec.familyLabelRu})${autoNote}`,
  };
}

/**
 * Translates any clean idiomatic TikZ / package object directly in `.tex` by `(dxCm, dyCm)`
 * without attaching `% tikzarium:n1:` comments!
 */
export function translatePackageObjectInSource(
  source: string,
  objectId: string,
  dxCm: number,
  dyCm: number
): { ok: boolean; nextSource: string; summaryRu: string } {
  const objs = parseScenePackageObjects(source);
  const obj = objs.find((o) => o.objectId === objectId);
  if (!obj) {
    return { ok: false, nextSource: source, summaryRu: 'Объект пакета не найден в исходнике.' };
  }

  const lines = source.split(/\r?\n/);

  if (obj.kind === 'pgfplots-axis') {
    const block = lines.slice(obj.startLine - 1, obj.endLine);
    const nx = fmtCm(obj.x1Cm + dxCm);
    const ny = fmtCm(obj.y1Cm + dyCm);
    let updatedAt = false;
    const nextBlock = block.map((ln, idx) => {
      if (idx === 0 || /at\s*=\s*\{/.test(ln)) {
        if (/at\s*=\s*\{\s*\([^)]+\)\s*\}/.test(ln)) {
          updatedAt = true;
          return ln.replace(/at\s*=\s*\{\s*\([^)]+\)\s*\}/, `at={(${nx},${ny})}`);
        }
      }
      return ln;
    });
    if (!updatedAt && nextBlock[0].includes('[')) {
      nextBlock[0] = nextBlock[0].replace('[', `[at={(${nx},${ny})}, anchor=south west, `);
    } else if (!updatedAt) {
      nextBlock[0] = nextBlock[0].replace(
        `\\begin{${obj.axisEnv ?? 'axis'}}`,
        `\\begin{${obj.axisEnv ?? 'axis'}}[at={(${nx},${ny})}, anchor=south west]`
      );
    }
    const res = applyCheckedLineRangePatch(
      source,
      obj.startLine,
      obj.endLine,
      nextBlock,
      'Перемещены оси pgfplots'
    );
    return { ok: res.ok, nextSource: res.nextSource, summaryRu: 'Перемещена координатная плоскость pgfplots' };
  }

  const origLine = lines[obj.startLine - 1];
  // Shift every literal `(x,y)` coordinate pair on the line while leaving symbolic `(q0)` untouched!
  const shiftedLine = origLine.replace(/\(([^()]+)\)/g, (full, inner: string) => {
    const pt = parseCoordPairCm(inner);
    if (!pt) return full;
    return `(${fmtCm(pt.x + dxCm)},${fmtCm(pt.y + dyCm)})`;
  });

  if (shiftedLine === origLine) {
    return {
      ok: false,
      nextSource: source,
      summaryRu: 'Координаты объекта заданы символически (переместите базовые узлы).',
    };
  }

  const res = applyCheckedLineRangePatch(
    source,
    obj.startLine,
    obj.startLine,
    [shiftedLine],
    `Сдвинут объект ${obj.packageOwner}`
  );
  return {
    ok: res.ok,
    nextSource: res.nextSource,
    summaryRu: `Перемещён объект пакета ${obj.packageOwner} (строка ${obj.startLine})`,
  };
}

export interface PackageObjectSemanticPatch {
  labelLatex?: string;
  circuitKind?: 'R' | 'C' | 'L' | 'V' | 'Do';
  stateInitial?: boolean;
  stateAccepting?: boolean;
  axisTitle?: string;
  axisXLabel?: string;
  axisYLabel?: string;
  axisEnv?: 'axis' | 'semilogxaxis' | 'loglogaxis';
  widthCm?: number;
  heightCm?: number;
  chemFormula?: string;
}

/**
 * Patches semantic package parameters (nominal label, bipole type R/C/L/V/Do, automata state flags,
 * pgfplots axis labels/scales, chemfig formula) cleanly in `.tex`.
 */
export function patchPackageObjectInSource(
  source: string,
  objectId: string,
  patch: PackageObjectSemanticPatch
): { ok: boolean; nextSource: string; summaryRu: string } {
  const objs = parseScenePackageObjects(source);
  const obj = objs.find((o) => o.objectId === objectId);
  if (!obj) {
    return { ok: false, nextSource: source, summaryRu: 'Объект не найден.' };
  }
  const lines = source.split(/\r?\n/);

  if (obj.kind === 'pgfplots-axis') {
    const block = [...lines.slice(obj.startLine - 1, obj.endLine)];
    const targetEnv = patch.axisEnv ?? obj.axisEnv ?? 'axis';
    if (patch.axisEnv && patch.axisEnv !== obj.axisEnv) {
      block[0] = block[0].replace(`\\begin{${obj.axisEnv}}`, `\\begin{${targetEnv}}`);
      block[block.length - 1] = block[block.length - 1].replace(
        `\\end{${obj.axisEnv}}`,
        `\\end{${targetEnv}}`
      );
    }
    const upsertAxisKey = (key: string, val: string) => {
      const keyRe = new RegExp(`${key}\\s*=\\s*\\{[^}]*\\}`);
      const idx = block.findIndex((l) => keyRe.test(l));
      if (idx !== -1) {
        block[idx] = block[idx].replace(keyRe, `${key}={${val}}`);
      } else if (block[0].includes('[')) {
        block[0] = block[0].replace('[', `[${key}={${val}}, `);
      }
    };
    if (patch.axisXLabel !== undefined) upsertAxisKey('xlabel', patch.axisXLabel);
    if (patch.axisYLabel !== undefined) upsertAxisKey('ylabel', patch.axisYLabel);
    if (patch.axisTitle !== undefined) {
      if (patch.axisTitle.trim()) upsertAxisKey('title', patch.axisTitle.trim());
    }
    if (patch.widthCm !== undefined && patch.widthCm >= 1.8) {
      block[0] = block[0].replace(
        /width\s*=\s*[+-]?\d+(?:\.\d+)?(?:cm|mm|pt|in)?/,
        `width=${fmtCm(patch.widthCm)}`
      );
    }
    if (patch.heightCm !== undefined && patch.heightCm >= 1.4) {
      block[0] = block[0].replace(
        /height\s*=\s*[+-]?\d+(?:\.\d+)?(?:cm|mm|pt|in)?/,
        `height=${fmtCm(patch.heightCm)}`
      );
    }
    const res = applyCheckedLineRangePatch(
      source,
      obj.startLine,
      obj.endLine,
      block,
      'Обновлены параметры осей pgfplots'
    );
    return { ok: res.ok, nextSource: res.nextSource, summaryRu: 'Обновлён паспорт осей pgfplots' };
  }

  let line = lines[obj.startLine - 1];

  if (obj.kind === 'circuit-bipole') {
    const nextKind = patch.circuitKind ?? obj.circuitKind ?? 'R';
    const nextLbl = patch.labelLatex ?? obj.labelLatex ?? `$${nextKind}$`;
    line = line.replace(
      /to\s*\[\s*(?:R|C|L|V|I|Do|D\*|lamp|american resistor|european resistor)[^\]]*\]/,
      `to[${nextKind}, l=${nextLbl}${nextKind === 'V' || nextKind === 'Do' ? '' : ', *-*'}]`
    );
  } else if (obj.kind === 'automata-state') {
    const init = patch.stateInitial ?? obj.stateInitial ?? false;
    const acc = patch.stateAccepting ?? obj.stateAccepting ?? false;
    const flags = ['state', ...(init ? ['initial'] : []), ...(acc ? ['accepting'] : [])].join(', ');
    line = line.replace(/\\node\s*\[[^\]]*\]/, `\\node[${flags}]`);
    if (patch.labelLatex !== undefined) {
      line = line.replace(/\{[^}]*\}\s*;/, `{${patch.labelLatex}};`);
    }
  } else if (obj.kind === 'chemfig-molecule' && patch.chemFormula !== undefined) {
    line = line.replace(/\\chemfig\{[^}]*\}/, `\\chemfig{${patch.chemFormula}}`);
  } else if (patch.labelLatex !== undefined) {
    line = line.replace(/\{[^}]*\}\s*;/, `{${patch.labelLatex}};`);
  }

  const res = applyCheckedLineRangePatch(
    source,
    obj.startLine,
    obj.startLine,
    [line],
    `Обновлён объект ${obj.packageOwner}`
  );
  return { ok: res.ok, nextSource: res.nextSource, summaryRu: `Обновлены свойства объекта ${obj.packageOwner}` };
}

export function deletePackageObjectFromSource(
  source: string,
  objectId: string
): { ok: boolean; nextSource: string; summaryRu: string } {
  const objs = parseScenePackageObjects(source);
  const obj = objs.find((o) => o.objectId === objectId);
  if (!obj) {
    return { ok: false, nextSource: source, summaryRu: 'Объект не найден.' };
  }
  const res = applyCheckedLineRangePatch(
    source,
    obj.startLine,
    obj.endLine,
    [],
    `Удалён объект ${obj.packageOwner}`
  );
  return {
    ok: res.ok,
    nextSource: res.nextSource,
    summaryRu: `Удалён объект ${obj.packageOwner} (строки ${obj.startLine}..${obj.endLine})`,
  };
}

// ============================================================================
// MOD-15: Figure Structure Explorer (`scope`, `pgfonlayer`, `axis`, nodes, objects)
// ============================================================================

export interface FigureExplorerItem {
  id: string;
  kind: 'container' | 'package-object' | 'n1-primitive';
  titleRu: string;
  packageBadge: string;
  lineNumber: number;
  depth: number;
  n1PrimitiveId?: number;
  packageObjectId?: string;
}

export function buildFigureStructureTree(
  source: string,
  ownedPrimitives: OwnedPrimitive[],
  packageObjects: RecognizedPackageObject[]
): FigureExplorerItem[] {
  const items: FigureExplorerItem[] = [];
  const lines = source.split(/\r?\n/);
  const byLineN1 = new Map<number, OwnedPrimitive>();
  for (const p of ownedPrimitives) byLineN1.set(p.lineNumber, p);
  const byLinePkg = new Map<number, RecognizedPackageObject>();
  for (const po of packageObjects) byLinePkg.set(po.startLine, po);

  let depth = 0;
  for (let idx = 0; idx < lines.length; idx++) {
    const ln = idx + 1;
    const clean = stripInlineTexComment(lines[idx]);

    const beginScope = /^\\begin\{(tikzpicture|scope|pgfonlayer)\}(?:\{([^}]*)\})?(?:\[([^\]]*)\])?/.exec(
      clean
    );
    if (beginScope) {
      const env = beginScope[1];
      const arg = beginScope[2] || beginScope[3] || '';
      items.push({
        id: `env-${ln}`,
        kind: 'container',
        titleRu: arg ? `${env} [${arg.slice(0, 22)}]` : env,
        packageBadge: 'env',
        lineNumber: ln,
        depth,
      });
      depth++;
      continue;
    }

    if (/^\\end\{(tikzpicture|scope|pgfonlayer)\}/.test(clean)) {
      depth = Math.max(0, depth - 1);
      continue;
    }

    const pkgObj = byLinePkg.get(ln);
    if (pkgObj) {
      items.push({
        id: pkgObj.objectId,
        kind: 'package-object',
        titleRu:
          pkgObj.kind === 'pgfplots-axis'
            ? `Оси ${pkgObj.axisEnv} (${pkgObj.axisSeries?.length ?? 0} сер.)`
            : pkgObj.kind === 'circuit-bipole'
              ? `Цепь ${pkgObj.circuitKind}: ${pkgObj.labelLatex ?? ''}`
              : pkgObj.kind === 'automata-state'
                ? `Состояние ${pkgObj.nodeName}: ${pkgObj.labelLatex ?? ''}`
                : pkgObj.kind === 'automata-edge'
                  ? `Переход ${pkgObj.fromStateId}→${pkgObj.toStateId}`
                  : pkgObj.kind === 'chemfig-molecule'
                    ? `Молекула ${pkgObj.chemFormula ?? ''}`
                    : `${pkgObj.kind} ${pkgObj.labelLatex ?? ''}`.trim(),
        packageBadge: pkgObj.packageOwner,
        lineNumber: ln,
        depth,
        packageObjectId: pkgObj.objectId,
      });
      continue;
    }

    const n1 = byLineN1.get(ln);
    if (n1) {
      const nameHint = n1.values.node_id ? ` (${n1.values.node_id})` : '';
      items.push({
        id: `n1-${n1.id}`,
        kind: 'n1-primitive',
        titleRu: `#${n1.id} ${n1.tool}${nameHint}`,
        packageBadge: 'tikz·n1',
        lineNumber: ln,
        depth,
        n1PrimitiveId: n1.id,
      });
    }
  }

  return items;
}

// ============================================================================
// MOD-12: Local Data Dependencies `.dat/.csv/.tsv` & `.fls` Containment Audit
// ============================================================================

export interface DataDependencyAuditEntry {
  path: string;
  lineNumber: number;
  command: string;
  isRelativeSafe: boolean;
  isDeclaredInProject: boolean;
  violationRu?: string;
}

export function inspectDataFileDependencies(
  source: string,
  declaredFiles: string[] = []
): DataDependencyAuditEntry[] {
  const entries: DataDependencyAuditEntry[] = [];
  const lines = source.split(/\r?\n/);
  const declaredSet = new Set(declaredFiles.map((f) => f.trim()));

  for (let i = 0; i < lines.length; i++) {
    const clean = stripInlineTexComment(lines[i]);
    const tableRe = /(?:\\addplot[^;]*?\btable\b(?:\s*\[[^\]]*\])?\s*\{\s*([^}\s]+)\s*\}|\\pgfplotstableread(?:\[[^\]]*\])?\{([^}]+)\})/g;
    let m: RegExpExecArray | null;
    while ((m = tableRe.exec(clean)) !== null) {
      const rawPath = (m[1] || m[2] || '').trim();
      if (!rawPath || rawPath.includes('\\\\') || rawPath.includes(' ')) continue;
      const hasTraversal = rawPath.includes('..') || rawPath.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(rawPath);
      entries.push({
        path: rawPath,
        lineNumber: i + 1,
        command: m[0].slice(0, 42),
        isRelativeSafe: !hasTraversal,
        isDeclaredInProject: declaredSet.has(rawPath),
        violationRu: hasTraversal
          ? 'Нарушение SC-DATA-004: запрещены абсолютные пути и выход `..` за каталог фигуры.'
          : undefined,
      });
    }
  }

  return entries;
}
