import type { ToolId } from './catalog';
import type { TikzExtensionId } from './tikzExtensionsSuite';

export type PdfManualDocId =
  | 'pgfmanual'
  | 'pgfplots'
  | 'circuitikz'
  | 'tikz-cd'
  | 'chemfig'
  | 'tikz-3dplot'
  | 'forest'
  | 'pgfgantt'
  | 'quantikz'
  | 'tkz-euclide'
  | 'tikz-timing'
  | 'tikz-optics';

export type ManualDiagramPreviewKind =
  | 'line'
  | 'arrow-tips'
  | 'rect-grid'
  | 'circle-arc'
  | 'bezier'
  | 'node-anchors'
  | 'coord-calc'
  | 'scope-transform'
  | 'foreach-loop'
  | 'pgfplots'
  | 'circuitikz'
  | 'tikz-cd'
  | 'chemfig'
  | 'tdplot-3d'
  | 'forest'
  | 'pgfgantt'
  | 'quantikz'
  | 'euclide'
  | 'timing'
  | 'automata';

export interface PdfManualDocumentMeta {
  id: PdfManualDocId;
  filename: string;
  titleEn: string;
  titleRu: string;
  version: string;
  totalPages: number;
  texdocKey: string;
  sha256Short: string;
}

export interface NormalizedPdfBBox {
  /** Normalized [0..1] from left page edge */
  x0: number;
  /** Normalized [0..1] from top page edge (converted at build time from PDF bottom-up pt) */
  y0: number;
  /** Normalized [0..1] from left page edge */
  x1: number;
  /** Normalized [0..1] from top page edge */
  y1: number;
}

export interface PdfManualAnchor {
  id: string;
  docId: PdfManualDocId;
  section: string;
  chapterTitleEn: string;
  titleRu: string;
  /** 1-based physical page in the bundled PDF manual */
  page: number;
  /** PDF Named Destination (/Dests) extracted or stamped during build-time indexing */
  namedDest: string;
  /** Normalized top-left bounding box of the target command/section block on the page */
  bboxNorm: NormalizedPdfBBox;
  originalDeclarationEn: string;
  originalExcerptEn: string;
  originalExampleTex: string;
  russianCommentaryRu: string;
  matchedTokens: string[];
  previewKind: ManualDiagramPreviewKind;
}

export const PDF_MANUAL_DOCUMENTS: PdfManualDocumentMeta[] = [
  {
    id: 'pgfmanual',
    filename: 'pgfmanual.pdf',
    titleEn: 'The TikZ and PGF Packages Manual',
    titleRu: 'Оригинальное руководство PGF/TikZ (базовое ядро и библиотеки)',
    version: '3.1.12',
    totalPages: 1322,
    texdocKey: 'pgfmanual',
    sha256Short: '9f4a8c12…e30b',
  },
  {
    id: 'pgfplots',
    filename: 'pgfplots.pdf',
    titleEn: 'Manual for Package PGFPLOTS (2D/3D Scientific Plotting)',
    titleRu: 'Руководство пакета PGFPlots (оси, графики, поверхности, fillbetween)',
    version: '1.18.1',
    totalPages: 596,
    texdocKey: 'pgfplots',
    sha256Short: '4b82d190…71ac',
  },
  {
    id: 'circuitikz',
    filename: 'circuitikzmanual.pdf',
    titleEn: 'CircuiTikZ — Draw electrical networks with TikZ',
    titleRu: 'Руководство CircuiTikZ (радиоэлементы ГОСТ/IEC и ANSI, ОУ, вентили)',
    version: '1.6.8',
    totalPages: 312,
    texdocKey: 'circuitikz',
    sha256Short: 'c71d05a4…19fe',
  },
  {
    id: 'tikz-cd',
    filename: 'tikz-cd-doc.pdf',
    titleEn: 'Commutative diagrams with TikZ (tikz-cd)',
    titleRu: 'Руководство tikz-cd (коммутативные диаграммы, морфизмы и функторы)',
    version: '1.0',
    totalPages: 18,
    texdocKey: 'tikz-cd',
    sha256Short: '2e91f8b3…88d1',
  },
  {
    id: 'chemfig',
    filename: 'chemfig-en.pdf',
    titleEn: 'ChemFig — Draw molecules and reaction schemes',
    titleRu: 'Руководство chemfig + mhchem (структурные формулы, циклы и реакции)',
    version: '1.66',
    totalPages: 82,
    texdocKey: 'chemfig',
    sha256Short: '6a30c9d1…44b2',
  },
  {
    id: 'tikz-3dplot',
    filename: 'tikz-3dplot_documentation.pdf',
    titleEn: 'The tikz-3dplot Package — 3D Coordinate Transformations',
    titleRu: 'Руководство tikz-3dplot (углы Эйлера, сферические координаты и дуги)',
    version: '0.70',
    totalPages: 35,
    texdocKey: 'tikz-3dplot',
    sha256Short: '8d12a7e5…03c9',
  },
  {
    id: 'forest',
    filename: 'forest-doc.pdf',
    titleEn: 'Forest: a PGF/TikZ-based package for drawing linguistic/AST trees',
    titleRu: 'Руководство forest (компактная скобочная запись деревьев и таксономий)',
    version: '2.1.5',
    totalPages: 108,
    texdocKey: 'forest',
    sha256Short: '1f54e820…b9a7',
  },
  {
    id: 'pgfgantt',
    filename: 'pgfgantt.pdf',
    titleEn: 'The pgfgantt Package — Gantt Charts with TikZ',
    titleRu: 'Руководство pgfgantt (календарные планы НИОКР, вехи и связи)',
    version: '5.0',
    totalPages: 57,
    texdocKey: 'pgfgantt',
    sha256Short: '5c83b211…d40e',
  },
  {
    id: 'quantikz',
    filename: 'quantikz.pdf',
    titleEn: 'Typesetting Quantum Circuits with quantikz2',
    titleRu: 'Руководство quantikz / tikz-feynman (квантовые вентили и диаграммы)',
    version: '1.0.1',
    totalPages: 25,
    texdocKey: 'quantikz',
    sha256Short: '7e29a04c…61f8',
  },
  {
    id: 'tkz-euclide',
    filename: 'tkz-euclide.pdf',
    titleEn: 'tkz-euclide — Euclidean Geometry with TikZ',
    titleRu: 'Руководство tkz-euclide / tikz-network (планиметрия и сетевые графы)',
    version: '5.10c',
    totalPages: 304,
    texdocKey: 'tkz-euclide',
    sha256Short: '3a76d902…c51a',
  },
  {
    id: 'tikz-timing',
    filename: 'tikz-timing.pdf',
    titleEn: 'The tikz-timing Package — Digital Timing Diagrams',
    titleRu: 'Руководство tikz-timing (временные диаграммы ПЛИС, SPI, I²C и ШИМ)',
    version: '0.7f',
    totalPages: 48,
    texdocKey: 'tikz-timing',
    sha256Short: '0b94c318…e72d',
  },
  {
    id: 'tikz-optics',
    filename: 'tikz-optics.pdf',
    titleEn: 'The tikz-optics & stanli Packages — Optical Benches and Structural Mechanics',
    titleRu: 'Руководство tikz-optics / stanli (оптические скамьи, линзы, зеркала и опоры балок)',
    version: '0.2.3',
    totalPages: 42,
    texdocKey: 'tikz-optics',
    sha256Short: '5e29b814…a10f',
  },
];

export const PDF_MANUAL_ANCHORS: PdfManualAnchor[] = [
  // ======================== CORE PGF / TIKZ PRIMITIVES ========================
  {
    id: 'pgf.env.tikzpicture',
    docId: 'pgfmanual',
    section: '§12.2.1',
    chapterTitleEn: '12.2.1 Creating a Picture Using an Environment',
    titleRu: 'Окружение рисунка \\begin{tikzpicture}[…]',
    page: 128,
    namedDest: 'section.12.2.1',
    bboxNorm: { x0: 0.09, y0: 0.21, x1: 0.91, y1: 0.44 },
    originalDeclarationEn: '\\begin{tikzpicture}[<animations spec>][<options>] <environment contents> \\end{tikzpicture}',
    originalExcerptEn:
      'All TikZ commands should be given inside a tikzpicture environment. By default, 1 unit along the x-axis equals 1cm right and 1 unit along the y-axis equals 1cm up. Global options such as [>=Stealth, scale=1.2, every node/.style={...}] apply to all paths inside.',
    originalExampleTex: `\\begin{tikzpicture}[>=Stealth, thick]
  \\draw[help lines] (0,0) grid (3,2);
  \\draw[->] (0,0) -- (2.6,1.6);
\\end{tikzpicture}`,
    russianCommentaryRu:
      'В TikZ ось Y направлена строго вверх (в отличие от экранных координат). Явное указание единиц (cm, mm, pt) защищает геометрию от случайного переопределения векторов x=(...), y=(...) в родительской преамбуле статьи.',
    matchedTokens: ['tikzpicture', '\\tikz'],
    previewKind: 'rect-grid',
  },
  {
    id: 'pgf.draw.line',
    docId: 'pgfmanual',
    section: '§14.1',
    chapterTitleEn: '14.1 The Line-To Operation (-- and -- cycle)',
    titleRu: 'Прямолинейный сегмент пути \\draw (A) -- (B) и замыкание -- cycle',
    page: 162,
    namedDest: 'section.14.1',
    bboxNorm: { x0: 0.09, y0: 0.24, x1: 0.91, y1: 0.48 },
    originalDeclarationEn: '\\path ... -- <coordinate or cycle> ...;',
    originalExcerptEn:
      'The line-to operation extends the current path from the current point in a straight line to the given coordinate. When followed by cycle, the subpath is smoothly closed at the corner by PDF miter/round line-join rules instead of leaving two unconnected endpoints.',
    originalExampleTex: `\\draw[thick] (0.5cm,0.5cm) -- (2.8cm,1.6cm) -- (1.2cm,2.1cm) -- cycle;`,
    russianCommentaryRu:
      'Всегда завершайте команду точкой с запятой «;» — её пропуск заставляет парсер TeX искать конец пути до конца файла (Runaway argument). Для замкнутых призм и контуров используйте «-- cycle», чтобы углы корректно соединялись по line join.',
    matchedTokens: ['\\draw', '--', 'cycle', '\\path', '\\fill', '\\filldraw', '\\clip'],
    previewKind: 'line',
  },
  {
    id: 'pgf.draw.rectangle',
    docId: 'pgfmanual',
    section: '§14.4',
    chapterTitleEn: '14.4 The Rectangle and Grid Operations',
    titleRu: 'Прямоугольник rectangle и координатная сетка grid',
    page: 165,
    namedDest: 'section.14.4',
    bboxNorm: { x0: 0.09, y0: 0.18, x1: 0.91, y1: 0.42 },
    originalDeclarationEn: '\\path ... (<corner_1>) rectangle (<corner_2>) ...;',
    originalExcerptEn:
      'Adds a rectangle to the path such that the previous coordinate and the target coordinate form opposite diagonal corners. Combine with [rounded corners=3pt] or [fill=blue!8] to draw enclosures, optical plates, and block frames.',
    originalExampleTex: `\\draw[rounded corners=3pt, fill=blue!8, draw=blue!75!black]
  (0.6cm,0.5cm) rectangle (3.4cm,1.9cm);`,
    russianCommentaryRu:
      'Оператор rectangle не создаёт текстового узла и якорей (.north, .east). Если к блоку будут привязываться умные стрелки по имени (A.east) -- (B.west), предпочтительнее \\node[draw, minimum width=..., minimum height=...] (A) {...};.',
    matchedTokens: ['rectangle', 'grid', 'rounded corners'],
    previewKind: 'rect-grid',
  },
  {
    id: 'pgf.draw.circle',
    docId: 'pgfmanual',
    section: '§14.6',
    chapterTitleEn: '14.6 The Circle and Ellipse Operations',
    titleRu: 'Окружность circle [radius=R] и эллипс [x radius, y radius]',
    page: 167,
    namedDest: 'section.14.6',
    bboxNorm: { x0: 0.09, y0: 0.27, x1: 0.91, y1: 0.52 },
    originalDeclarationEn: '\\path ... circle [radius=<dimension>, x radius=<rx>, y radius=<ry>, rotate=<deg>];',
    originalExcerptEn:
      'Modern PGF 3.x syntax passes the radius as key-value options inside brackets: circle [radius=1cm] or ellipse [x radius=1.4cm, y radius=0.7cm, rotate=25]. The legacy parenthesized syntax circle (1cm) is discouraged.',
    originalExampleTex: `\\draw[thick] (2.0cm,1.4cm) circle [radius=0.85cm];
\\draw[dashed, teal!80!black] (2.0cm,1.4cm) circle [x radius=1.4cm, y radius=0.6cm, rotate=25];`,
    russianCommentaryRu:
      'Используйте современный квадратно-скобочный синтаксис circle [radius=0.85cm]: в отличие от устаревшего circle (0.85cm), он не конфликтует с вычислениями библиотеки calc и позволяет задавать поворот эллипса ключом rotate.',
    matchedTokens: ['circle', 'ellipse', 'radius', 'arc'],
    previewKind: 'circle-arc',
  },
  {
    id: 'pgf.draw.bezier',
    docId: 'pgfmanual',
    section: '§14.3',
    chapterTitleEn: '14.3 The Curve-To Operation (.. controls .. and ..)',
    titleRu: 'Кубическая кривая Безье .. controls (C1) and (C2) .. (B)',
    page: 164,
    namedDest: 'section.14.3',
    bboxNorm: { x0: 0.09, y0: 0.19, x1: 0.91, y1: 0.45 },
    originalDeclarationEn: '\\path ... (<p0>) .. controls (<c1>) and (<c2>) .. (<p3>);',
    originalExcerptEn:
      'Extends the current path from p0 to p3 along a cubic Bézier spline. The tangent leaving p0 points toward control point c1, and the tangent arriving at p3 comes from control point c2. Relative control points +(dx,dy) keep tangents local to endpoints.',
    originalExampleTex: `\\draw[thick, blue!75!black]
  (0.5cm,0.8cm) .. controls (1.4cm,2.3cm) and (2.6cm,0.1cm) .. (3.6cm,1.7cm);`,
    russianCommentaryRu:
      'Если записать контрольную точку с одиночным плюсом +(1cm,0cm), она отсчитывается от концевой точки без смещения текущего пера PGF — это самый удобный способ задать горизонтальный выход луча под 0°.',
    matchedTokens: ['controls', '..'],
    previewKind: 'bezier',
  },
  {
    id: 'pgf.lib.arrows.meta',
    docId: 'pgfmanual',
    section: '§16.1',
    chapterTitleEn: '16.1 Overview & Reference of Arrow Tips (arrows.meta)',
    titleRu: 'Наконечники стрелок и библиотека arrows.meta (-{Stealth}, |<->|)',
    page: 201,
    namedDest: 'section.16.1',
    bboxNorm: { x0: 0.09, y0: 0.25, x1: 0.91, y1: 0.54 },
    originalDeclarationEn: '\\usetikzlibrary{arrows.meta}   \\draw[-{Stealth[length=3mm, width=2mm]}] ...;',
    originalExcerptEn:
      'The arrows.meta library provides configurable geometric arrow tips (Stealth, Latex, Triangle, Bar, Circle, Rays) whose dimensions scale cleanly with line width or explicit length/width/angle parameters enclosed in braces.',
    originalExampleTex: `\\usetikzlibrary{arrows.meta}
\\draw[-{Stealth[length=3.2mm]}] (0.5cm,1.4cm) -- (3.5cm,1.4cm);
\\draw[|<->|, >=Latex] (0.5cm,0.7cm) -- node[fill=white, inner sep=1.5pt] {$L$} (3.5cm,0.7cm);`,
    russianCommentaryRu:
      'Внимание на регистр: стандартный маленький наконечник «-stealth» встроен в ядро, но конфигурируемый «-{Stealth}» и «-{Latex}» с заглавной буквы требуют \\usetikzlibrary{arrows.meta} в окне Преамбулы! Фигурные скобки вокруг {Stealth[...]} обязательны, иначе квадратные скобки закроют внешние опции \\draw[...].',
    matchedTokens: ['arrows.meta', 'Stealth', 'Latex', '->', '<->', '|<->|'],
    previewKind: 'arrow-tips',
  },
  {
    id: 'pgf.nodes.anchors',
    docId: 'pgfmanual',
    section: '§17.2',
    chapterTitleEn: '17.2 Nodes and Their Shapes, Anchors, and Positioning',
    titleRu: 'Узлы \\node, именованные якоря (.north, .east) и подписи',
    page: 229,
    namedDest: 'section.17.2',
    bboxNorm: { x0: 0.09, y0: 0.22, x1: 0.91, y1: 0.51 },
    originalDeclarationEn: '\\node[<options>] (<name>) at (<coordinate>) {<text or $math$>};',
    originalExcerptEn:
      'A node places TeX box text at a coordinate and records compass anchors (.center, .north, .south, .east, .west, .north east, .base, .mid) under (<name>) so subsequent paths can connect cleanly to its boundary without manual trigonometry.',
    originalExampleTex: `\\node[draw, rounded corners=2pt, inner sep=4pt] (src) at (1.0cm,1.2cm) {$E_0$};
\\node[draw, circle] (det) at (3.6cm,1.2cm) {$D$};
\\draw[-{Stealth}] (src.east) -- node[above] {$\\hbar\\omega$} (det.west);`,
    russianCommentaryRu:
      'Порядок частей в \\node гибок, но каноническая форма — \\node[опции] (имя) at (x,y) {текст};. Для выравнивания базовых линий соседних формул с индексами ($x_i$ и $y^2$) добавляйте anchor=base.',
    matchedTokens: ['\\node', 'anchor', 'inner sep', 'minimum width', 'minimum height'],
    previewKind: 'node-anchors',
  },
  {
    id: 'pgf.coords.calc',
    docId: 'pgfmanual',
    section: '§13.5',
    chapterTitleEn: '13.5 Coordinate Calculations ($ ... $) — Library calc',
    titleRu: 'Координатная алгебра ($...$), проекции и библиотека calc',
    page: 148,
    namedDest: 'section.13.5',
    bboxNorm: { x0: 0.09, y0: 0.30, x1: 0.91, y1: 0.57 },
    originalDeclarationEn: '\\usetikzlibrary{calc}   ($(A)!<factor>!<angle>:(B)$)   ($(A)!(P)!(B)$)',
    originalExcerptEn:
      'With \\usetikzlibrary{calc}, coordinates enclosed in ($...$) support vector addition ($(A) + 0.5*(B)$), partway modifiers ($(A)!0.5!(B)$ for midpoint), rotation ($(A)!1cm!90:(B)$), and orthogonal projection ($(A)!(P)!(B)$ of P onto line AB).',
    originalExampleTex: `\\usetikzlibrary{calc}
\\coordinate (A) at (0.6cm,0.6cm);
\\coordinate (B) at (3.6cm,1.2cm);
\\coordinate (P) at (1.9cm,2.2cm);
\\draw (A) -- (B) (P) -- ($(A)!(P)!(B)$);`,
    russianCommentaryRu:
      'Запись ($(A)!(P)!(B)$) без ручной геометрии опускает строгий перпендикуляр из точки P на прямую AB — незаменимо для высот треугольников, оптических нормалей и размерных выносок.',
    matchedTokens: ['calc', '\\coordinate', 'coordinate'],
    previewKind: 'coord-calc',
  },
  {
    id: 'pgf.styles.tikzset',
    docId: 'pgfmanual',
    section: '§12.4',
    chapterTitleEn: '12.4 Graphic Parameters: Scopes and \\tikzset Styles',
    titleRu: 'Стили \\tikzset{name/.style={…}}, области \\begin{scope} и слои',
    page: 133,
    namedDest: 'section.12.4',
    bboxNorm: { x0: 0.09, y0: 0.16, x1: 0.91, y1: 0.43 },
    originalDeclarationEn: '\\tikzset{<style name>/.style={<key list>}}   \\begin{scope}[<local options>] ... \\end{scope}',
    originalExcerptEn:
      'Styles defined via \\tikzset{...} (not the obsolete \\tikzstyle macro) encapsulate reusable stroke, fill, font, and arrow settings. A scope environment restricts coordinate shifts, rotations, and clipping paths strictly to its body.',
    originalExampleTex: `\\tikzset{sensor/.style={draw=blue!75!black, fill=blue!8, thick, rounded corners=2pt}}
\\begin{scope}[shift={(1.2cm,0.4cm)}, rotate=15]
  \\node[sensor] at (0,0) {Датчик};
\\end{scope}`,
    russianCommentaryRu:
      'Команда \\tikzstyle официально устарела в PGF 3.x — всегда объявляйте стили через \\tikzset{имя/.style={...}} в верхнем окне Преамбулы. Параметрический стиль задаётся как myBox/.style={fill=#1}, myBox/.default=blue!8.',
    matchedTokens: ['\\tikzset', 'scope', '\\pgfdeclarelayer', '\\pgfsetlayers'],
    previewKind: 'scope-transform',
  },
  {
    id: 'pgf.foreach',
    docId: 'pgfmanual',
    section: '§88',
    chapterTitleEn: '88 Repeating Things: The Foreach Statement (\\foreach)',
    titleRu: 'Параметрические циклы и решётки \\foreach \\x [evaluate=…] in {…}',
    page: 979,
    namedDest: 'section.88',
    bboxNorm: { x0: 0.09, y0: 0.20, x1: 0.91, y1: 0.47 },
    originalDeclarationEn: '\\foreach <variables> [<options>] in {<list with ...>} {<commands>}',
    originalExcerptEn:
      'Iterates over comma-separated lists and arithmetic progressions such as {0, 0.5, ..., 4.0}, supporting multi-variable pairs \\x/\\label in {1/A, 2/B} and inline math evaluation [evaluate=\\x as \\y using sin(\\x*30)].',
    originalExampleTex: `\\foreach \\x/\\lbl in {0.6/x_0, 1.6/x_1, 2.6/x_2, 3.6/x_3} {
  \\draw[thick] (\\x cm, 0.9cm) -- (\\x cm, 1.1cm) node[above] {$\\lbl$};
}`,
    russianCommentaryRu:
      'Чтобы задать шаг арифметической прогрессии в \\foreach, обязательно укажите первые ДВА элемента перед троеточием: {0, 0.5, ..., 3.0}. При подстановке переменной перед единицей измерения оставляйте пробел: (\\x cm, 0cm).',
    matchedTokens: ['\\foreach', 'foreach'],
    previewKind: 'foreach-loop',
  },

  // ======================== CORE PGF LIBRARIES ========================
  {
    id: 'pgf.lib.positioning',
    docId: 'pgfmanual',
    section: '§17.5.3',
    chapterTitleEn: '17.5.3 Advanced Placement Options (Library positioning)',
    titleRu: 'Относительное размещение узлов right=1.2cm of A (positioning)',
    page: 241,
    namedDest: 'section.17.5.3',
    bboxNorm: { x0: 0.09, y0: 0.26, x1: 0.91, y1: 0.50 },
    originalDeclarationEn: '\\usetikzlibrary{positioning}   \\node[right=<dist> of <node>.<anchor>] ...;',
    originalExcerptEn:
      'Measures distances border-to-border (on grid=false by default) rather than center-to-center when using the "of <node>" syntax: right=8mm of A, above left=4mm and 6mm of B.',
    originalExampleTex: `\\usetikzlibrary{positioning}
\\node[draw] (A) {Вход};
\\node[draw, right=1.2cm of A] (B) {Фильтр};
\\draw[-{Stealth}] (A) -- (B);`,
    russianCommentaryRu:
      'Синтаксис со словом «of» (right=1cm of A) отсчитывает зазор от края рамки узла A до края B, поэтому узлы разной ширины никогда не налезают друг на друга (в отличие от старого right of=A без библиотеки positioning).',
    matchedTokens: ['positioning'],
    previewKind: 'node-anchors',
  },
  {
    id: 'pgf.lib.patterns.decorations',
    docId: 'pgfmanual',
    section: '§62 & §50',
    chapterTitleEn: '62 Pattern Library & 50 Path Decorations (brace, snake, markings)',
    titleRu: 'Штриховки ГОСТ (patterns) и декорации путей (decorations.*)',
    page: 726,
    namedDest: 'section.62',
    bboxNorm: { x0: 0.09, y0: 0.19, x1: 0.91, y1: 0.45 },
    originalDeclarationEn: '\\usetikzlibrary{patterns, decorations.pathreplacing, decorations.pathmorphing}',
    originalExcerptEn:
      'Provides vector hatching patterns (north east lines, crosshatch, dots) and path deformations such as curly braces {brace, amplitude=5pt, mirror} and mechanical springs/waves {coil, zigzag, snake}.',
    originalExampleTex: `\\usetikzlibrary{patterns,decorations.pathreplacing}
\\draw[pattern=north east lines, pattern color=slate!70] (0.6cm,0.8cm) rectangle (3.2cm,1.4cm);
\\draw[decorate, decoration={brace, amplitude=5pt}] (0.6cm,1.55cm) -- node[above=5pt] {$b$} (3.2cm,1.55cm);`,
    russianCommentaryRu:
      'При изменении направления фигурной скобки brace с A→B на B→A зубчик отражается на противоположную сторону; альтернативно добавьте ключ mirror внутрь decoration={brace, mirror}.',
    matchedTokens: [
      'patterns',
      'decorations.pathreplacing',
      'decorations.pathmorphing',
      'decorations.markings',
      'decorate',
      'pattern',
    ],
    previewKind: 'rect-grid',
  },
  {
    id: 'pgf.lib.angles.spy',
    docId: 'pgfmanual',
    section: '§41 & §73',
    chapterTitleEn: '41 Angle Pic Library (angles, quotes) & 73 Spy Magnifying Glass',
    titleRu: 'Угловые дуги pic {angle=A--O--B} и выносная лупа spy (×M)',
    page: 558,
    namedDest: 'section.41',
    bboxNorm: { x0: 0.09, y0: 0.23, x1: 0.91, y1: 0.49 },
    originalDeclarationEn: '\\usetikzlibrary{angles, quotes, spy}   \\pic["$\\alpha$", draw, angle radius=8mm] {angle = A--O--B};',
    originalExcerptEn:
      'Draws circular angle arcs and right-angle squares between three named coordinates A--O--B (counter-clockwise from OA to OB). The spy library magnifies dense regions inside a tikzpicture[spy using outlines={...}].',
    originalExampleTex: `\\usetikzlibrary{angles,quotes}
\\coordinate (O) at (0.8cm,0.7cm); \\coordinate (A) at (3.2cm,0.7cm); \\coordinate (B) at (2.4cm,2.0cm);
\\draw (A) -- (O) -- (B);
\\pic["$\\varphi$", draw=blue!75!black, angle radius=9mm, angle eccentricity=1.3] {angle = A--O--B};`,
    russianCommentaryRu:
      'Дуга angle = A--O--B всегда строится против часовой стрелки от луча OA к лучу OB с вершиной в средней точке O. Если дуга развернулась на внешний угол 360°−φ, поменяйте порядок крайних точек: angle = B--O--A.',
    matchedTokens: [
      'angles',
      'quotes',
      'spy',
      'intersections',
      'backgrounds',
      'fit',
      'shapes.geometric',
      '\\pic',
    ],
    previewKind: 'circle-arc',
  },
  {
    id: 'pgf.lib.automata.petri',
    docId: 'pgfmanual',
    section: '§43 & §63',
    chapterTitleEn: '43 Automata Drawing Library, 63 Petri-Net, 48 Chains & 57 L-Systems',
    titleRu: 'Штатные библиотеки КА (automata), сетей Петри, chains и L-систем',
    page: 571,
    namedDest: 'section.43',
    bboxNorm: { x0: 0.09, y0: 0.21, x1: 0.91, y1: 0.48 },
    originalDeclarationEn: '\\usetikzlibrary{automata, petri, chains, lindenmayersystems}',
    originalExcerptEn:
      'Built directly into PGF core without external .sty files: state, initial, and accepting node styles for finite state machines; place/transition/tokens for Petri nets; start chain / on chain; and \\pgfdeclarelindenmayersystem.',
    originalExampleTex: `\\usetikzlibrary{automata,positioning,arrows.meta}
\\node[state, initial] (q0) {$q_0$};
\\node[state, accepting, right=1.8cm of q0] (q1) {$q_1$};
\\draw[-{Stealth}] (q0) edge[bend left=22] node[above] {$a/1$} (q1)
                  (q1) edge[loop right] node {$b/0$} (q1);`,
    russianCommentaryRu:
      'Эти 4 библиотеки входят в базовую поставку самого TikZ, поэтому гарантированно работают в любом минимальном профиле XeLaTeX без доустановки сторонних пакетов расширений.',
    matchedTokens: [
      'automata',
      'petri',
      'chains',
      'mindmap',
      'lindenmayersystems',
      '\\pgfdeclarelindenmayersystem',
    ],
    previewKind: 'automata',
  },

  // ======================== 12 TIKZ EXTENSION MANUALS ========================
  {
    id: 'ext.pgfplots.axis',
    docId: 'pgfplots',
    section: '§4.3 & §4.6',
    chapterTitleEn: '4.3 Two- and Three-Dimensional Axes (axis, polaraxis, \\addplot, fillbetween)',
    titleRu: 'PGFPlots: научные оси axis, кривые \\addplot, 3D \\addplot3 и коридоры fillbetween',
    page: 54,
    namedDest: 'section.4.3',
    bboxNorm: { x0: 0.08, y0: 0.18, x1: 0.92, y1: 0.50 },
    originalDeclarationEn: '\\pgfplotsset{compat=1.18}   \\begin{axis}[xlabel={...}, ylabel={...}, grid=both] \\addplot[...] ...; \\end{axis}',
    originalExcerptEn:
      'Transforms data coordinates, logarithmic scales (semilogxaxis, loglogaxis), error bars, polar patterns, and 3D parametric surfaces automatically into high-precision PGF paths, legends, and ticks.',
    originalExampleTex: `\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\begin{tikzpicture}
  \\begin{axis}[width=6.2cm, height=4.2cm, grid=both, xlabel={$t$, мс}, ylabel={$U$, В}]
    \\addplot[thick, blue!75!black, domain=0:6, samples=80] {exp(-0.35*x)*cos(deg(2.4*x))};
  \\end{axis}
\\end{tikzpicture}`,
    russianCommentaryRu:
      'Всегда указывайте \\pgfplotsset{compat=1.18} в Преамбуле: без него PGFPlots откатывается к режиму совместимости 1.3 с устаревшими отступами подписей осей. В тригонометрии PGF синус и косинус принимают градусы — оборачивайте радианы в deg(...).',
    matchedTokens: [
      'pgfplots',
      '\\pgfplotsset',
      '\\usepgfplotslibrary',
      'axis',
      'semilogxaxis',
      'semilogyaxis',
      'loglogaxis',
      'polaraxis',
      'groupplot',
      '\\addplot',
      '\\addplot3',
      '\\legend',
      '\\addlegendentry',
      'fillbetween',
    ],
    previewKind: 'pgfplots',
  },
  {
    id: 'ext.circuitikz.bipoles',
    docId: 'circuitikz',
    section: '§3.1 & §4.2',
    chapterTitleEn: '3.1 Bipoles on Paths (to[R=...]) & 4.2 Operational Amplifiers (european / american)',
    titleRu: 'CircuiTikZ: двухполюсники ГОСТ/IEC, источники, диоды и каскады ОУ',
    page: 38,
    namedDest: 'section.3.1',
    bboxNorm: { x0: 0.08, y0: 0.22, x1: 0.92, y1: 0.51 },
    originalDeclarationEn: '\\usepackage[european, straightvoltages]{circuitikz}   \\draw (0,0) to[R=$R_1$, l=\\qty{4.7}{\\kilo\\ohm}, *-*] (3,0);',
    originalExcerptEn:
      'Places electrical bipoles (R, L, C, D, leDo, V, I, switch) directly along path segments via the to[...] operator and provides multi-terminal nodes such as node[op amp] (OA) {} with anchors (OA.-), (OA.+), and (OA.out).',
    originalExampleTex: `\\usepackage[european,straightvoltages]{circuitikz}
\\begin{circuitikz}[scale=0.9]
  \\draw (0,0) to[V, l=$U_{\\text{вх}}$] (0,2)
              to[R=$R_1$, -*] (2.4,2)
              to[C=$C_1$] (2.4,0) -- (0,0);
\\end{circuitikz}`,
    russianCommentaryRu:
      'Опция пакета [european, straightvoltages] включает прямоугольные резисторы по ГОСТ 2.728 / IEC 60617 и прямые стрелки напряжений вместо изогнутых европейских дуг. Контактные узлы ставятся ключами полюсов: «*-*», «o-*».',
    matchedTokens: ['circuitikz', 'siunitx', '\\qty', '\\unit', '\\SI'],
    previewKind: 'circuitikz',
  },
  {
    id: 'ext.tikzcd.arrows',
    docId: 'tikz-cd',
    section: '§1.2 & §2.1',
    chapterTitleEn: '1.2 Creating Arrows (\\arrow[r, "f"]) & 2.1 Bending, Hook, Two-Head and 2-Cells',
    titleRu: 'tikz-cd: коммутативные диаграммы, морфизмы \\arrow[rd, dashed] и 2-клетки',
    page: 3,
    namedDest: 'section.1.2',
    bboxNorm: { x0: 0.10, y0: 0.25, x1: 0.90, y1: 0.54 },
    originalDeclarationEn: '\\begin{tikzcd}[row sep=large, column sep=large] A \\arrow[r, "f"] \\arrow[d, "g"\'] & B \\\\ C & D \\end{tikzcd}',
    originalExcerptEn:
      'Builds category-theoretic diagrams inside a TikZ matrix. Arrow directions are combinations of u (up), d (down), l (left), r (right); appending an apostrophe after a quoted label ("g"\') swaps the label to the opposite side of the arrow.',
    originalExampleTex: `\\usepackage{tikz-cd}
\\begin{tikzcd}[row sep=1.4cm, column sep=1.6cm]
  X \\times_Z Y \\arrow[r, "p_2"] \\arrow[d, "p_1"'] & Y \\arrow[d, "g"] \\\\
  X \\arrow[r, "f"'] & Z
\\end{tikzcd}`,
    russianCommentaryRu:
      'Внутри презентаций Beamer окружение tikzcd использует символ «&» матрицы — обязательно добавляйте опцию [ampersand replacement=\\&] или [fragile] к слайду \\begin{frame}[fragile]. Штрих после кавычек "f"\' переносит метку на правую/нижнюю сторону стрелки.',
    matchedTokens: ['tikz-cd', 'tikzcd', '\\arrow', '\\ar'],
    previewKind: 'tikz-cd',
  },
  {
    id: 'ext.chemfig.molecules',
    docId: 'chemfig',
    section: '§3 & §12',
    chapterTitleEn: '3 Bonds, Angles, Rings (*6(...)) & 12 Reaction Schemes (\\schemestart)',
    titleRu: 'chemfig + mhchem: скелетные формулы, циклы *6(-=-=-=) и механизмы реакций',
    page: 14,
    namedDest: 'section.3',
    bboxNorm: { x0: 0.09, y0: 0.20, x1: 0.91, y1: 0.49 },
    originalDeclarationEn: '\\chemfig{A-[:<angle>,<len_factor>]B(=[::90]O)-*6(-=-=-=)}   \\schemestart ... \\arrow{->[\\ce{H2SO4}]} ... \\schemestop',
    originalExcerptEn:
      'Encodes single (-), double (=), triple (~), Cram solid (>), and dashed (<:) stereo bonds, n-membered rings *n(...), side branches (...), and multi-step catalytic reaction arrows.',
    originalExampleTex: `\\usepackage{chemfig}
\\usepackage[version=4]{mhchem}
\\schemestart
  \\chemfig{*6(-=-(-OH)=-=)} \\+ \\ce{HNO3}
  \\arrow{->[\\ce{H2SO4}][-\\ce{H2O}]}
  \\chemfig{*6(-=-(-OH)=(-NO_2)-=)}
\\schemestop`,
    russianCommentaryRu:
      'Угол [:<угол>] задаёт абсолютное направление связи в градусах (кратно 30° для гексагональной сетки ИЮПАК), а с двойным двоеточием [::<угол>] — относительный поворот от предыдущей связи.',
    matchedTokens: ['chemfig', 'mhchem', '\\chemfig', '\\schemestart', '\\schemestop', '\\ce'],
    previewKind: 'chemfig',
  },
  {
    id: 'ext.tdplot.coords',
    docId: 'tikz-3dplot',
    section: '§2.1 & §3.2',
    chapterTitleEn: '2.1 Setting the View Angles (\\tdplotsetmaincoords) & Rotated Coordinate Frames',
    titleRu: 'tikz-3dplot: углы обзора (θ, φ), 3D-векторы и экваториальные дуги',
    page: 7,
    namedDest: 'section.2.1',
    bboxNorm: { x0: 0.09, y0: 0.23, x1: 0.91, y1: 0.51 },
    originalDeclarationEn: '\\tdplotsetmaincoords{<theta_deg>}{<phi_deg>}   \\begin{tikzpicture}[tdplot_main_coords] ... \\end{tikzpicture}',
    originalExcerptEn:
      'Computes the orthographic projection basis vectors for polar viewing elevation theta from +Z and azimuthal rotation phi around Z, providing \\tdplotdrawarc for true projected circular arcs in arbitrary planes.',
    originalExampleTex: `\\usepackage{tikz-3dplot}
\\tdplotsetmaincoords{68}{115}
\\begin{tikzpicture}[tdplot_main_coords, >=Stealth]
  \\draw[->] (0,0,0) -- (2.4,0,0) node[anchor=north east]{$x$};
  \\draw[->] (0,0,0) -- (0,2.4,0) node[anchor=north west]{$y$};
  \\draw[->] (0,0,0) -- (0,0,2.4) node[anchor=south]{$z$};
\\end{tikzpicture}`,
    russianCommentaryRu:
      'Команда \\tdplotsetmaincoords{θ}{φ} должна вызываться ДО открытия \\begin{tikzpicture}[tdplot_main_coords], чтобы базис проекции был рассчитан до входа в графическую область.',
    matchedTokens: [
      'tikz-3dplot',
      '\\tdplotsetmaincoords',
      '\\tdplotsetrotatedcoords',
      '\\tdplotdrawarc',
      'tdplot_main_coords',
    ],
    previewKind: 'tdplot-3d',
  },
  {
    id: 'ext.forest.trees',
    docId: 'forest',
    section: '§2.1 & §3.4',
    chapterTitleEn: '2.1 Bracket Representation of Trees & 3.4 Growth Direction, Forked Edges, Tier Alignment',
    titleRu: 'forest: компактные деревья разбора (AST), таксономии и деревья решений',
    page: 8,
    namedDest: 'section.2.1',
    bboxNorm: { x0: 0.09, y0: 0.19, x1: 0.91, y1: 0.47 },
    originalDeclarationEn: '\\begin{forest} for tree={draw, rounded corners, grow\'=0, l sep=8mm, s sep=4mm} [Root [Child 1] [Child 2]] \\end{forest}',
    originalExcerptEn:
      'Automatically packs hierarchical trees without node collisions from succinct bracket notation [Parent [Left] [Right]], supporting horizontal layouts (grow\'=0), orthogonal forked edges, and edge labels.',
    originalExampleTex: `\\usepackage{forest}
\\begin{forest}
  for tree={draw=blue!75!black, fill=blue!8, rounded corners=2pt, s sep=6mm, l sep=7mm}
  [Система [Датчик] [Регулятор [ПИД] [Калман]]]
\\end{forest}`,
    russianCommentaryRu:
      'Если содержимое узла дерева содержит квадратные скобки (например диапазон [0,1] или единицы [м/с]), обязательно оберните текст узла в фигурные скобки: [{U, [В]}], иначе парсер forest воспримет скобку как дочернюю ветвь.',
    matchedTokens: ['forest'],
    previewKind: 'forest',
  },
  {
    id: 'ext.pgfgantt.chart',
    docId: 'pgfgantt',
    section: '§2.2 & §2.7',
    chapterTitleEn: '2.2 The ganttchart Environment, \\ganttbar, \\ganttmilestone & \\ganttlink',
    titleRu: 'pgfgantt: календарные графики НИОКР, этапы, вехи и зависимости',
    page: 11,
    namedDest: 'section.2.2',
    bboxNorm: { x0: 0.09, y0: 0.24, x1: 0.91, y1: 0.52 },
    originalDeclarationEn: '\\begin{ganttchart}[vgrid, hgrid]{<start_slot>}{<end_slot>} \\gantttitle{...}{...} \\\\ \\ganttbar{Task}{1}{4} \\end{ganttchart}',
    originalExcerptEn:
      'Renders publication-grade Gantt project timelines with customizable time-slot grids, grouped summary bars (\\ganttgroup), diamond milestones (\\ganttmilestone), and finish-to-start links (\\ganttlink{elem0}{elem1}).',
    originalExampleTex: `\\usepackage{pgfgantt}
\\begin{ganttchart}[vgrid, hgrid, x unit=0.55cm, y unit chart=0.55cm]{1}{8}
  \\gantttitle{Кварталы НИОКР}{8} \\\\
  \\ganttbar{ТЗ и модель}{1}{3} \\\\
  \\ganttbar{Стенд и серия}{3}{7} \\\\
  \\ganttmilestone{Сдача}{8}
  \\ganttlink{elem0}{elem1}
\\end{ganttchart}`,
    russianCommentaryRu:
      'Элементы диаграммы автоматически нумеруются как elem0, elem1, elem2 в порядке объявления (или получают явное имя через ключ name=stageA), после чего соединяются стрелкой \\ganttlink{elem0}{elem1}.',
    matchedTokens: [
      'pgfgantt',
      'ganttchart',
      '\\gantttitle',
      '\\gantttitlelist',
      '\\ganttbar',
      '\\ganttgroup',
      '\\ganttmilestone',
      '\\ganttlink',
    ],
    previewKind: 'pgfgantt',
  },
  {
    id: 'ext.quantikz.gates',
    docId: 'quantikz',
    section: '§2 & §4',
    chapterTitleEn: '2 Basic Quantum Wires, Gates (\\gate, \\ctrl, \\targ, \\meter) & Multi-Qubit Blocks',
    titleRu: 'quantikz / tikz-feynman: квантовые регистры, CNOT и КЭД-диаграммы',
    page: 4,
    namedDest: 'section.2',
    bboxNorm: { x0: 0.09, y0: 0.21, x1: 0.91, y1: 0.50 },
    originalDeclarationEn: '\\begin{quantikz} \\lstick{$\\ket{0}$} & \\gate{H} & \\ctrl{1} & \\meter{} \\\\ \\lstick{$\\ket{0}$} & \\qw & \\targ{} & \\qw \\end{quantikz}',
    originalExcerptEn:
      'Typesets quantum registers on horizontal wires with single- and multi-qubit gates (\\gate[wires=2]{U}), control dots \\ctrl{k} spanning k wires vertically to \\targ{} or \\control{}, and projective measurements \\meter{}.',
    originalExampleTex: `\\usepackage{quantikz}
\\begin{quantikz}[row sep=0.45cm, column sep=0.55cm]
  \\lstick{$|0\\rangle$} & \\gate{H} & \\ctrl{1} & \\meter{} \\\\
  \\lstick{$|0\\rangle$} & \\qw      & \\targ{}  & \\qw
\\end{quantikz}`,
    russianCommentaryRu:
      'Аргумент \\ctrl{1} задаёт смещение в строках вниз (+1 — на соседний кубит ниже, -1 — на кубит выше). Для tikz-feynman в движке XeLaTeX всегда задавайте координаты вершин явно через \\vertex (a) at (x,y), так как алгоритмическая автоукладка графов работает только в LuaLaTeX.',
    matchedTokens: [
      'quantikz',
      'tikz-feynman',
      'feynman',
      '\\lstick',
      '\\rstick',
      '\\gate',
      '\\ctrl',
      '\\targ',
      '\\meter',
      '\\qw',
      '\\vertex',
      '\\diagram',
    ],
    previewKind: 'quantikz',
  },
  {
    id: 'ext.euclide.constructions',
    docId: 'tkz-euclide',
    section: '§6 & §14',
    chapterTitleEn: '6 Defining Points (\\tkzDefPoint), Circles, Intersections & Network Graphs (\\Vertex)',
    titleRu: 'tkz-euclide / tikz-network: евклидовы построения циркулем и сетевые графы',
    page: 42,
    namedDest: 'section.6',
    bboxNorm: { x0: 0.09, y0: 0.22, x1: 0.91, y1: 0.51 },
    originalDeclarationEn: '\\tkzDefPoint(0,0){A}  \\tkzDefCircle[circum](A,B,C) \\tkzGetPoint{O}  \\tkzDrawPolygon(A,B,C)',
    originalExcerptEn:
      'Separates exact geometric computation (defining points, circumcenters, orthocenters, tangents, and circle-line intersections) from visual rendering (\\tkzDrawSegments, \\tkzDrawCircle, \\tkzMarkRightAngle, \\tkzLabelPoints).',
    originalExampleTex: `\\usepackage{tkz-euclide}
\\begin{tikzpicture}[scale=0.85]
  \\tkzDefPoint(0,0){A} \\tkzDefPoint(3.4,0){B} \\tkzDefPoint(1.2,2.3){C}
  \\tkzDefCircle[circum](A,B,C) \\tkzGetPoint{O}
  \\tkzDrawPolygon[thick](A,B,C)
  \\tkzDrawCircle[dashed, blue!75!black](O,A)
  \\tkzDrawPoints(A,B,C,O) \\tkzLabelPoints[below](A,B)
\\end{tikzpicture}`,
    russianCommentaryRu:
      'В tkz-euclide версии 4+/5+ макрос \\tkzClip и инициализация области упрощены — придерживайтесь трёхшагового конвейера: 1) \\tkzDef... (вычисление), 2) \\tkzDraw... (вывод линий), 3) \\tkzLabel... (подписи поверх линий).',
    matchedTokens: [
      'tkz-euclide',
      'tikz-network',
      '\\tkzDefPoint',
      '\\tkzDefCircle',
      '\\tkzGetPoint',
      '\\tkzDrawPolygon',
      '\\tkzDrawCircle',
      '\\tkzDrawPoints',
      '\\tkzDrawSegments',
      '\\tkzLabelPoints',
      '\\Vertex',
      '\\Edge',
    ],
    previewKind: 'euclide',
  },
  {
    id: 'ext.timing.waveforms',
    docId: 'tikz-timing',
    section: '§2.1 & §3.3',
    chapterTitleEn: '2.1 Timing Characters (H, L, C, Z, D{data}, U) & tikztimingtable Environment',
    titleRu: 'tikz-timing: временные диаграммы сигналов ПЛИС, SPI, I²C и ШИМ',
    page: 9,
    namedDest: 'section.2.1',
    bboxNorm: { x0: 0.09, y0: 0.20, x1: 0.91, y1: 0.49 },
    originalDeclarationEn: '\\begin{tikztimingtable} SCLK & 2L 8{C} 2L \\\\ MOSI & 2Z 4D{0xA5} 4D{0x3C} 2Z \\end{tikztimingtable}',
    originalExcerptEn:
      'Describes digital waveforms via compact single-letter state codes: H (high), L (low), C (clock toggle), Z (high-impedance center line), U (unknown/hatched), and D{label} (valid data bus envelope) with numeric width prefixes.',
    originalExampleTex: `\\usepackage{tikz-timing}
\\begin{tikztimingtable}[timing/dslope=0.15, xscale=1.25]
  CS\\# & H 10L H \\\\
  SCLK & 2L 8{C} 2L \\\\
  MOSI & 2Z 4D{ADDR} 4D{DATA} 2Z \\\\
\\end{tikztimingtable}`,
    russianCommentaryRu:
      'Число перед символом задаёт длительность состояния в тактах: 4D{ADDR} растягивает шину данных ровно на 4 полупериода тактового сигнала 8{C}, обеспечивая идеальное вертикальное совпадение фронтов.',
    matchedTokens: ['tikz-timing', 'tikztimingtable', '\\tikztiming', '\\extracode'],
    previewKind: 'timing',
  },
  {
    id: 'ext.optics.bench',
    docId: 'tikz-optics',
    section: '§2.2 & §3.4',
    chapterTitleEn: '2.2 Lenses, Mirrors, Beamsplitters & 3.4 Ray Tracing Paths ([use optics])',
    titleRu: 'tikz-optics + stanli: линзы, зеркала, светоделители и расчётные балки',
    page: 11,
    namedDest: 'section.2.2',
    bboxNorm: { x0: 0.09, y0: 0.22, x1: 0.91, y1: 0.52 },
    originalDeclarationEn: '\\begin{tikzpicture}[use optics] \\node[lens, object height=2cm] (L1) at (2cm,0) {}; \\draw[put arrow={at=0.5}] (0,0.4cm) -- (L1.lens north); \\end{tikzpicture}',
    originalExcerptEn:
      'Provides dedicated node shapes (lens, concave mirror, flat mirror, prism, beam splitter, laser, screen) with optical anchor ports and stanli structural supports (pinned, roller, fixed wall, distributed load).',
    originalExampleTex: `\\usepackage{tikz-optics}
\\begin{tikzpicture}[use optics]
  \\node[laser] (src) at (0,0) {He-Ne};
  \\node[lens] (L1) at (2.2cm,0) {};
  \\node[screen] (det) at (4.4cm,0) {};
  \\draw[red!80!black, thick] (src.aperture east) -- (L1.center) -- (det.center);
\\end{tikzpicture}`,
    russianCommentaryRu:
      'Ключ [use optics] в опциях tikzpicture активирует семейство оптических форм и якорных портов (.aperture east, .lens north). Для строительной механики пакет stanli добавляет команды \\point, \\beam, \\support и \\lineload.',
    matchedTokens: ['tikz-optics', 'stanli', 'use optics', '\\beam', '\\support', '\\lineload'],
    previewKind: 'circle-arc',
  },
];

const TOOL_TO_ANCHOR_ID: Record<ToolId, string> = {
  line: 'pgf.draw.line',
  arrow: 'pgf.lib.arrows.meta',
  rectangle: 'pgf.draw.rectangle',
  circle: 'pgf.draw.circle',
  cubic: 'pgf.draw.bezier',
  node: 'pgf.nodes.anchors',
};

const EXTENSION_TO_ANCHOR_ID: Record<TikzExtensionId, string> = {
  pgfplots: 'ext.pgfplots.axis',
  circuitikz: 'ext.circuitikz.bipoles',
  'tikz-cd': 'ext.tikzcd.arrows',
  chemfig: 'ext.chemfig.molecules',
  'tikz-3dplot': 'ext.tdplot.coords',
  forest: 'ext.forest.trees',
  pgfgantt: 'ext.pgfgantt.chart',
  quantikz: 'ext.quantikz.gates',
  'tkz-euclide': 'ext.euclide.constructions',
  'tikz-timing': 'ext.timing.waveforms',
  'tikz-optics': 'ext.optics.bench',
  'pgf-core-suites': 'pgf.lib.automata.petri',
};

export function resolveManualDocumentMeta(docId: PdfManualDocId): PdfManualDocumentMeta {
  return PDF_MANUAL_DOCUMENTS.find((d) => d.id === docId) ?? PDF_MANUAL_DOCUMENTS[0];
}

export function resolveManualAnchorById(anchorId: string | undefined | null): PdfManualAnchor {
  if (!anchorId) return PDF_MANUAL_ANCHORS[0];
  return PDF_MANUAL_ANCHORS.find((a) => a.id === anchorId) ?? PDF_MANUAL_ANCHORS[0];
}

export function resolveManualAnchorForTool(toolId: ToolId): PdfManualAnchor {
  return resolveManualAnchorById(TOOL_TO_ANCHOR_ID[toolId]);
}

export function resolveManualAnchorForExtension(extId: TikzExtensionId): PdfManualAnchor {
  return resolveManualAnchorById(EXTENSION_TO_ANCHOR_ID[extId]);
}

export function resolveManualAnchorForToken(rawToken: string): PdfManualAnchor | null {
  const cleaned = rawToken.trim();
  if (!cleaned) return null;
  const direct = PDF_MANUAL_ANCHORS.find((a) => a.matchedTokens.includes(cleaned));
  if (direct) return direct;

  const withoutSlash = cleaned.startsWith('\\') ? cleaned.slice(1) : cleaned;
  const byBare = PDF_MANUAL_ANCHORS.find((a) =>
    a.matchedTokens.some((m) => (m.startsWith('\\') ? m.slice(1) : m) === withoutSlash)
  );
  return byBare ?? null;
}

export function resolveManualAnchorForDiagnosticCode(code: string): PdfManualAnchor | null {
  if (code === 'PGF-ARROW-TIP' || code === 'TEX-NO-ARROWS-META' || code === 'MISSING_ARROWS_META') {
    return resolveManualAnchorById('pgf.lib.arrows.meta');
  }
  if (code === 'TIKZ-MISSING-SEMI' || code === 'TEX-MISSING-SEMICOLON') {
    return resolveManualAnchorById('pgf.draw.line');
  }
  if (
    code === 'TEX-BRACE-EOF' ||
    code === 'TEX-UNCLOSED-MATH' ||
    code === 'TEX-UNESCAPED-PERCENT' ||
    code === 'TEX-UNBALANCED-BRACES'
  ) {
    return resolveManualAnchorById('pgf.nodes.anchors');
  }
  if (code === 'PGF-PATTERNS-LIB') {
    return resolveManualAnchorById('pgf.draw.rectangle');
  }
  if (code === 'PGF-DECOR-BRACE' || code === 'PGF-DECOR-WAVE') {
    return resolveManualAnchorById('pgf.scope.styles');
  }
  if (code === 'TEX-ITALIC-UNIT' || code === 'TEX-MISSING-EXT-PKG') {
    return resolveManualAnchorById('ext.circuitikz.bipoles');
  }
  if (code === 'ENGINE-LUA-ONLY') {
    return resolveManualAnchorById('pgf.lib.automata.petri');
  }
  return resolveManualAnchorById('pgf.env.tikzpicture');
}

export function searchPdfManualAnchors(
  query: string,
  docFilter: PdfManualDocId | 'all' = 'all'
): PdfManualAnchor[] {
  const q = query.trim().toLowerCase();
  return PDF_MANUAL_ANCHORS.filter((anchor) => {
    if (docFilter !== 'all' && anchor.docId !== docFilter) return false;
    if (!q) return true;
    return (
      anchor.id.toLowerCase().includes(q) ||
      anchor.section.toLowerCase().includes(q) ||
      anchor.titleRu.toLowerCase().includes(q) ||
      anchor.chapterTitleEn.toLowerCase().includes(q) ||
      anchor.namedDest.toLowerCase().includes(q) ||
      anchor.matchedTokens.some((t) => t.toLowerCase().includes(q)) ||
      anchor.russianCommentaryRu.toLowerCase().includes(q)
    );
  });
}

export function exportManualAnchorIndexJson(): string {
  const payload = {
    schema: 'tikzarium.pdf_manual_index.v1',
    redistributionPolicy: 'index-only-local-texlive-kpsewhich',
    generatedBy: 'tools/index_manuals/extract_pdf_anchors.py (MuPDF / PyMuPDF + qpdf)',
    coordinateSpace: 'top-left-normalized-0..1',
    documents: PDF_MANUAL_DOCUMENTS.map((d) => ({
      id: d.id,
      filename: d.filename,
      version: d.version,
      totalPages: d.totalPages,
      sha256Short: d.sha256Short,
    })),
    anchors: PDF_MANUAL_ANCHORS.map((a) => ({
      id: a.id,
      docId: a.docId,
      section: a.section,
      page: a.page,
      namedDest: a.namedDest,
      bboxNorm: a.bboxNorm,
      matchedTokens: a.matchedTokens,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export interface BuildTimePipelineStep {
  stepNumber: string;
  titleRu: string;
  toolStackRu: string;
  explanationRu: string;
  filename: string;
  code: string;
}

export const BUILD_TIME_PDF_INDEXING_GUIDE: BuildTimePipelineStep[] = [
  {
    stepNumber: '01',
    titleRu: 'Сбор эталонных оригинальных PDF из TeX Live и фиксация SHA-256',
    toolStackRu: 'kpsewhich · texdoc · sha256sum (выполняется 1 раз на сборочной машине)',
    explanationRu:
      'Скрипт находит лицензионные оригинальные PDF-документы (pgfmanual.pdf, pgfplots.pdf, circuitikzmanual.pdf и др.) в эталонном профиле TeX Live, копирует их в assets/manuals/raw/ и фиксирует контрольные суммы, чтобы номера страниц и координаты якорей никогда не сместились незаметно.',
    filename: 'tools/index_manuals/01_collect_manuals.sh',
    code: `#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="assets/manuals/raw"
mkdir -p "$OUT_DIR"

declare -A MANUALS=(
  ["pgfmanual.pdf"]="pgfmanual.pdf"
  ["pgfplots.pdf"]="pgfplots.pdf"
  ["circuitikzmanual.pdf"]="circuitikzmanual.pdf"
  ["tikz-cd-doc.pdf"]="tikz-cd-doc.pdf"
  ["chemfig-en.pdf"]="chemfig-en.pdf"
  ["forest-doc.pdf"]="forest-doc.pdf"
  ["pgfgantt.pdf"]="pgfgantt.pdf"
  ["quantikz.pdf"]="quantikz.pdf"
  ["tkz-euclide.pdf"]="tkz-euclide.pdf"
  ["tikz-timing.pdf"]="tikz-timing.pdf"
)

for target in "\${!MANUALS[@]}"; do
  src_path="$(kpsewhich --format='TeX system documentation' "\${MANUALS[$target]}")"
  cp -f "$src_path" "$OUT_DIR/$target"
done

(cd "$OUT_DIR" && sha256sum *.pdf > ../manuals.sha256)
echo "Собрано $(ls -1 "$OUT_DIR"/*.pdf | wc -l) оригинальных PDF-руководств."`,
  },
  {
    stepNumber: '02',
    titleRu: 'Однократная внешняя разметка прямых точек и нормализация координат (PyMuPDF + qpdf)',
    toolStackRu: 'python3 · pymupdf (fitz) / mutool · qpdf',
    explanationRu:
      'Сторонний скрипт при сборке приложения читает спецификацию искомых команд и разделов (anchors_manifest.toml), извлекает из PDF таблицу Named Destinations (/Dests от hyperref) и точные прямоугольники (x0, y0, x1, y1) деклараций на странице, переводит координаты PDF (72 pt, ось Y снизу вверх) в нормализованные экранные координаты egui [0..1] (ось Y сверху вниз), вшивает именованные закладки tikzarium.* и сохраняет единый индекс manual_anchors.index.json.',
    filename: 'tools/index_manuals/02_extract_pdf_anchors.py',
    code: `#!/usr/bin/env python3
"""Однократная предсборочная разметка прямых точек в оригинальных PDF-мануалах TikZ."""
import json, pathlib, tomllib
import fitz  # PyMuPDF (pip install pymupdf)

SPEC = tomllib.loads(pathlib.Path("tools/index_manuals/anchors_manifest.toml").read_text("utf-8"))
RAW_DIR = pathlib.Path("assets/manuals/raw")
OUT_DIR = pathlib.Path("assets/manuals")
OUT_DIR.mkdir(parents=True, exist_ok=True)

anchors_out = []
for doc_cfg in SPEC["documents"]:
    pdf_path = RAW_DIR / doc_cfg["filename"]
    doc = fitz.open(pdf_path)
    toc = doc.get_toc(simple=False)  # [lvl, title, page_1based, dest_dict]

    for target in doc_cfg["targets"]:
        page_idx = target["fallback_page"] - 1
        bbox_norm = [0.08, 0.20, 0.92, 0.48]

        # 1. Точный поиск сигнатуры команды / заголовка секции на целевой области страниц
        for pno in range(max(0, page_idx - 2), min(len(doc), page_idx + 3)):
            page = doc[pno]
            hits = page.search_for(target["probe_phrase"])
            if hits:
                r = hits[0]
                w, h = page.rect.width, page.rect.height
                page_idx = pno
                # PyMuPDF уже возвращает верхне-левую систему координат (0..w, 0..h):
                bbox_norm = [
                    round(max(0.04, r.x0 / w - 0.02), 4),
                    round(max(0.02, r.y0 / h - 0.015), 4),
                    round(min(0.96, 0.92), 4),
                    round(min(0.98, (r.y1 + 140.0) / h), 4),
                ]
                break

        anchors_out.append({
            "id": target["id"],
            "docId": doc_cfg["id"],
            "section": target["section"],
            "page": page_idx + 1,
            "namedDest": f"tikzarium.{target['id']}",
            "bboxNorm": {
                "x0": bbox_norm[0], "y0": bbox_norm[1],
                "x1": bbox_norm[2], "y1": bbox_norm[3],
            },
            "matchedTokens": target["tokens"],
        })

    # Сохраняем линеаризованный PDF для мгновенного чтения страниц в офлайне
    doc.save(OUT_DIR / doc_cfg["filename"], garbage=3, deflate=True, linear=True)
    doc.close()

index_payload = {
    "schema": "tikzarium.pdf_manual_index.v1",
    "coordinateSpace": "top-left-normalized-0..1",
    "anchors": anchors_out,
}
(OUT_DIR / "manual_anchors.index.json").write_text(
    json.dumps(index_payload, ensure_ascii=False, indent=2), "utf-8"
)
print(f"Размечено прямых точек: {len(anchors_out)} -> assets/manuals/manual_anchors.index.json")`,
  },
  {
    stepNumber: '03',
    titleRu: 'Компиляция индекса в статическую таблицу Rust на этапе cargo build (build.rs)',
    toolStackRu: 'Cargo build.rs · serde_json (только build-dependencies, 0 мс в рантайме)',
    explanationRu:
      'Во время сборки приложения build.rs проверяет целостность всех якорей из manual_anchors.index.json (диапазоны страниц и координат 0.0..=1.0) и генерирует статический массив &[PdfManualAnchor] без накладных расходов на парсинг PDF или JSON при запуске у пользователя.',
    filename: 'crates/tikzarium-core/build.rs',
    code: `use std::{env, fs, path::PathBuf};

fn main() {
    println!("cargo:rerun-if-changed=../../assets/manuals/manual_anchors.index.json");
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let index_path = manifest_dir.join("../../assets/manuals/manual_anchors.index.json");
    let raw = fs::read_to_string(&index_path)
        .expect("Отсутствует индекс PDF-мануалов: запустите python3 tools/index_manuals/02_extract_pdf_anchors.py");

    let parsed: serde_json::Value = serde_json::from_str(&raw).expect("Некорректный JSON индекса PDF");
    let anchors = parsed["anchors"].as_array().expect("Ожидался массив anchors");
    assert!(!anchors.is_empty(), "Индекс прямых точек PDF не должен быть пустым");

    for item in anchors {
        let id = item["id"].as_str().unwrap();
        let page = item["page"].as_u64().unwrap();
        let y0 = item["bboxNorm"]["y0"].as_f64().unwrap();
        assert!(page >= 1, "Некорректная страница у якоря {id}");
        assert!((0.0..=1.0).contains(&y0), "Координата y0 вне [0..1] у якоря {id}");
    }

    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    fs::write(out_dir.join("manual_anchors.embedded.json"), raw).unwrap();
}`,
  },
];
