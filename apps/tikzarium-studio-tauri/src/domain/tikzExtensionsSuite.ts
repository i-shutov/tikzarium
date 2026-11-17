import type { ToolId } from './catalog';
import {
  inspectPreambleConnections,
  insertOwnedPrimitiveIntoSource,
  proposeLibraryConnect,
} from './tikzEngine';

export type TikzExtensionId =
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
  | 'tikz-optics'
  | 'pgf-core-suites';

export type ExtensionDomainGroup =
  | 'all'
  | 'plots-3d'
  | 'engineering'
  | 'phys-chem'
  | 'math-cs';

export type ExtensionOutputMode = 'hybrid' | 'native-tex' | 'canvas-n1';

export interface ExtensionPreambleRequirement {
  pkg: string;
  options?: string;
  setupLines?: string[];
}

export interface CanvasPrimitiveSeed {
  tool: ToolId;
  values: Record<string, string>;
}

export interface TikzExtensionPresetSpec {
  id: string;
  titleRu: string;
  summaryRu: string;
}

export interface TikzExtensionParamField {
  key: string;
  labelRu: string;
  kind: 'text' | 'number' | 'select';
  defaultValue: string;
  options?: { value: string; labelRu: string }[];
  placeholder?: string;
}

export interface TikzExtensionPackageSpec {
  id: TikzExtensionId;
  packageName: string;
  companionPackages: string[];
  displayTitleRu: string;
  shortBadgeRu: string;
  domainGroup: Exclude<ExtensionDomainGroup, 'all'>;
  ctanUrl: string;
  xelatexStatus: 'native' | 'compat-note';
  xelatexNoteRu: string;
  summaryRu: string;
  defaultLibraries: string[];
  presets: TikzExtensionPresetSpec[];
  paramFields: TikzExtensionParamField[];
}

export interface ExtensionBuildOptions {
  extensionId: TikzExtensionId;
  presetId: string;
  outputMode: ExtensionOutputMode;
  originXCm?: number;
  originYCm?: number;
  params?: Record<string, string>;
}

export interface ExtensionGeneratedBundle {
  extensionSpec: TikzExtensionPackageSpec;
  presetSpec: TikzExtensionPresetSpec;
  preambleRequirements: ExtensionPreambleRequirement[];
  tikzLibraries: string[];
  preamblePreviewLines: string[];
  nativeTexLines: string[];
  canvasPrimitives: CanvasPrimitiveSeed[];
  engineWarningRu: string | null;
}

export const EXTENSION_DOMAIN_GROUP_LABELS: {
  id: ExtensionDomainGroup;
  labelRu: string;
}[] = [
  { id: 'all', labelRu: 'Все пакеты (12)' },
  { id: 'plots-3d', labelRu: 'Графики и 3D' },
  { id: 'engineering', labelRu: 'Электросхемы, ПЛИС и Гант' },
  { id: 'phys-chem', labelRu: 'Физика, Химия и Кванты' },
  { id: 'math-cs', labelRu: 'Математика, Деревья и Графы' },
];

export const TIKZ_EXTENSION_PACKAGES: TikzExtensionPackageSpec[] = [
  {
    id: 'pgfplots',
    packageName: 'pgfplots',
    companionPackages: ['siunitx'],
    displayTitleRu: 'PGFPlots 1.18 — Научные оси, коридоры и 3D',
    shortBadgeRu: 'pgfplots',
    domainGroup: 'plots-3d',
    ctanUrl: 'https://ctan.org/pkg/pgfplots',
    xelatexStatus: 'native',
    xelatexNoteRu: 'Полная поддержка в XeLaTeX (compat=1.18, fillbetween, groupplots, polar).',
    summaryRu:
      'Публикационные координатные оси, доверительные полосы fillbetween, матрицы графиков groupplots, полярные диаграммы и 3D-поверхности.',
    defaultLibraries: ['arrows.meta', 'calc'],
    presets: [
      {
        id: 'pgf-fillbetween',
        titleRu: 'Затухающий отклик + коридор fillbetween',
        summaryRu: 'Кривая сигнала с доверительной полосой \\addplot fill between и сеткой.',
      },
      {
        id: 'pgf-groupplots',
        titleRu: 'Матрица графиков groupplots (АЧХ + ФЧХ)',
        summaryRu: 'Две синхронизированные оси Боде в окружении groupplot [group size=1 by 2].',
      },
      {
        id: 'pgf-polar',
        titleRu: 'Полярная диаграмма направленности polaraxis',
        summaryRu: 'Апертурный лепесток антенны/лазера в полярных координатах 0…360°.',
      },
      {
        id: 'pgf-surf3d',
        titleRu: 'Поверхность отклика 3D \\addplot3[surf]',
        summaryRu: 'Трёхмерный гауссов пучок / потенциал в изометрической проекции view={35}{28}.',
      },
    ],
    paramFields: [
      {
        key: 'xLabel',
        labelRu: 'Подпись оси X',
        kind: 'text',
        defaultValue: '$t,\\,\\mathrm{ms}$',
      },
      {
        key: 'yLabel',
        labelRu: 'Подпись оси Y',
        kind: 'text',
        defaultValue: '$U,\\,\\mathrm{V}$',
      },
      {
        key: 'gridMode',
        labelRu: 'Сетка осей',
        kind: 'select',
        defaultValue: 'both',
        options: [
          { value: 'both', labelRu: 'Основная + мелкая (grid=both)' },
          { value: 'major', labelRu: 'Только основная (grid=major)' },
          { value: 'none', labelRu: 'Без сетки' },
        ],
      },
      {
        key: 'samples',
        labelRu: 'Число узлов samples',
        kind: 'number',
        defaultValue: '65',
      },
    ],
  },
  {
    id: 'circuitikz',
    packageName: 'circuitikz',
    companionPackages: ['siunitx'],
    displayTitleRu: 'CircuiTikZ — Радиосхемы ГОСТ/IEC и ANSI',
    shortBadgeRu: 'circuitikz',
    domainGroup: 'engineering',
    ctanUrl: 'https://ctan.org/pkg/circuitikz',
    xelatexStatus: 'native',
    xelatexNoteRu: 'Полная поддержка XeLaTeX; переключение УГО ГОСТ/IEC (european) и ANSI (american).',
    summaryRu:
      'Двухполюсники R/L/C, источники ЭДС и тока, операционные усилители, измерительные мосты и силовые ключи MOSFET с номиналами siunitx.',
    defaultLibraries: ['arrows.meta', 'calc', 'positioning'],
    presets: [
      {
        id: 'ctikz-opamp',
        titleRu: 'Инвертирующий усилитель на ОУ (op amp)',
        summaryRu: 'Каскад с резисторами входной цепи и обратной связи R_1, R_f и землёй.',
      },
      {
        id: 'ctikz-rlc',
        titleRu: 'Резонансный RLC-контур с источником ЭДС',
        summaryRu: 'Замкнутая цепь с источником напряжения, резистором, индуктивностью и ёмкостью.',
      },
      {
        id: 'ctikz-bridge',
        titleRu: 'Измерительный мост Уитстона',
        summaryRu: 'Четыре плеча сопротивлений в ромбовидной топологии с диагональю гальванометра.',
      },
      {
        id: 'ctikz-mosfet',
        titleRu: 'Ключевой каскад на n-МОП транзисторе (nmos)',
        summaryRu: 'Транзисторный ключ с нагрузочным резистором в стоке и затворным драйвером.',
      },
    ],
    paramFields: [
      {
        key: 'standard',
        labelRu: 'Стандарт УГО',
        kind: 'select',
        defaultValue: 'european',
        options: [
          { value: 'european', labelRu: 'ГОСТ / IEC (european, straightvoltages)' },
          { value: 'american', labelRu: 'ANSI / IEEE (american)' },
        ],
      },
      {
        key: 'rNom',
        labelRu: 'Номинал R (кОм)',
        kind: 'text',
        defaultValue: '4.7',
      },
      {
        key: 'cNom',
        labelRu: 'Номинал C (нФ)',
        kind: 'text',
        defaultValue: '100',
      },
      {
        key: 'vNom',
        labelRu: 'Питание / ЭДС (В)',
        kind: 'text',
        defaultValue: '5',
      },
    ],
  },
  {
    id: 'tikz-cd',
    packageName: 'tikz-cd',
    companionPackages: [],
    displayTitleRu: 'tikz-cd — Коммутативные диаграммы и морфизмы',
    shortBadgeRu: 'tikz-cd',
    domainGroup: 'math-cs',
    ctanUrl: 'https://ctan.org/pkg/tikz-cd',
    xelatexStatus: 'native',
    xelatexNoteRu: 'Штатная сборка XeLaTeX; матрица морфизмов \\arrow[r, "..."] внутри tikzcd.',
    summaryRu:
      'Алгебраические коммутативные квадраты, универсальные свойства расслоённых произведений (Pullback/Pushout), точные последовательности и функторы.',
    defaultLibraries: ['arrows.meta', 'calc'],
    presets: [
      {
        id: 'cd-square',
        titleRu: 'Коммутативный квадрат морфизмов',
        summaryRu: 'Классический квадрат объектов A, B, C, D с четырьмя стрелками.',
      },
      {
        id: 'cd-pullback',
        titleRu: 'Декартов квадрат (Pullback) с универсальной стрелкой',
        summaryRu: 'Внешний объект P с пунктирным единственным морфизмом \\exists! u.',
      },
      {
        id: 'cd-exact',
        titleRu: 'Короткая точная последовательность 0 → A → B → C → 0',
        summaryRu: 'Линейная цепочка гомоморфизмов с мономорфизмом hook и эпиморфизмом two heads.',
      },
      {
        id: 'cd-adjoint',
        titleRu: 'Сопряжённые функторы F ⊣ G и естественное преобразование',
        summaryRu: 'Две категории со встречными изогнутыми стрелками bend left и 2-клеткой.',
      },
    ],
    paramFields: [
      { key: 'objA', labelRu: 'Объект A (СЗ)', kind: 'text', defaultValue: 'A' },
      { key: 'objB', labelRu: 'Объект B (СВ)', kind: 'text', defaultValue: 'B' },
      { key: 'objC', labelRu: 'Объект C (ЮЗ)', kind: 'text', defaultValue: 'C' },
      { key: 'objD', labelRu: 'Объект D (ЮВ)', kind: 'text', defaultValue: 'D' },
      { key: 'morTop', labelRu: 'Верхний морфизм', kind: 'text', defaultValue: 'f' },
      { key: 'morBot', labelRu: 'Нижний морфизм', kind: 'text', defaultValue: 'g' },
    ],
  },
  {
    id: 'chemfig',
    packageName: 'chemfig',
    companionPackages: ['mhchem'],
    displayTitleRu: 'chemfig + mhchem — Структурная химия и реакции',
    shortBadgeRu: 'chemfig',
    domainGroup: 'phys-chem',
    ctanUrl: 'https://ctan.org/pkg/chemfig',
    xelatexStatus: 'native',
    xelatexNoteRu: 'Полная поддержка XeLaTeX; скелетные циклы *6(...), клинья Крама и схемы реакций.',
    summaryRu:
      'Органические и гетероциклические структурные формулы, кратные и стереохимические связи, каталитические стрелки \\schemestart … \\schemestop и брутто-формулы \\ce{...}.',
    defaultLibraries: ['arrows.meta', 'calc'],
    presets: [
      {
        id: 'chem-ring',
        titleRu: 'Замещённое бензольное кольцо *6(-=-(-R)=-=)',
        summaryRu: 'Шестичленный ароматический цикл с чередующимися двойными связями и заместителем.',
      },
      {
        id: 'chem-scheme',
        titleRu: 'Схема реакции этерификации / нитрования (\\schemestart)',
        summaryRu: 'Субстрат + реагент над/под стрелкой реакции \\arrow{->[кат.][-H_2O]} → продукт.',
      },
      {
        id: 'chem-peptide',
        titleRu: 'Карбонильная / пептидная цепь с двойной связью =O',
        summaryRu: 'Углеродный скелет с разветвлением (=[:90]O) и аминогруппой.',
      },
      {
        id: 'chem-hetero',
        titleRu: 'Гетероцикл пиридина *6(-N=(-R)-=-=)',
        summaryRu: 'Азотистое гетероциклическое кольцо для биохимических и фармсхем.',
      },
    ],
    paramFields: [
      {
        key: 'substituent',
        labelRu: 'Заместитель -R',
        kind: 'select',
        defaultValue: 'OH',
        options: [
          { value: 'OH', labelRu: '-OH (фенол / спирт)' },
          { value: 'COOH', labelRu: '-COOH (карбоксил)' },
          { value: 'NO_2', labelRu: '-NO₂ (нитрогруппа)' },
          { value: 'NH_2', labelRu: '-NH₂ (аминогруппа)' },
        ],
      },
      {
        key: 'catalyst',
        labelRu: 'Условия над стрелкой',
        kind: 'text',
        defaultValue: '\\ce{H2SO4}',
      },
      {
        key: 'byproduct',
        labelRu: 'Подпись под стрелкой',
        kind: 'text',
        defaultValue: '\\ce{-H2O}',
      },
    ],
  },
  {
    id: 'tikz-3dplot',
    packageName: 'tikz-3dplot',
    companionPackages: [],
    displayTitleRu: 'tikz-3dplot — Сферические 3D-оси, векторы и сфера Блоха',
    shortBadgeRu: 'tikz-3dplot',
    domainGroup: 'plots-3d',
    ctanUrl: 'https://ctan.org/pkg/tikz-3dplot',
    xelatexStatus: 'native',
    xelatexNoteRu: 'Чистый PGF-пакет, мгновенная компиляция в XeLaTeX через tdplot_main_coords.',
    summaryRu:
      'Ортографическая 3D-проекция с углами обзора (θ, φ), сферические векторы, проекции на плоскость xy, дуги углов \\tdplotdrawarc и углы Эйлера.',
    defaultLibraries: ['arrows.meta', 'calc'],
    presets: [
      {
        id: 'td-spherical',
        titleRu: 'Радиус-вектор r в сферических координатах (r, θ, φ)',
        summaryRu: 'Репер (x, y, z), вектор из начала координат, проекция на xy и дуги углов θ, φ.',
      },
      {
        id: 'td-euler',
        titleRu: 'Повёрнутый базис углов Эйлера (tdplot_rotated_coords)',
        summaryRu: 'Неподвижная и связанная системы координат твёрдого тела.',
      },
      {
        id: 'td-bloch',
        titleRu: 'Сфера Блоха квантового состояния |ψ⟩',
        summaryRu: 'Экваториальная окружность, полюса |0⟩, |1⟩ и вектор состояния на сфере.',
      },
    ],
    paramFields: [
      { key: 'thetaView', labelRu: 'Угол обзора θ (°)', kind: 'number', defaultValue: '68' },
      { key: 'phiView', labelRu: 'Азимут обзора φ (°)', kind: 'number', defaultValue: '115' },
      { key: 'vecLen', labelRu: 'Длина вектора r (см)', kind: 'number', defaultValue: '2.0' },
      { key: 'polarAngle', labelRu: 'Полярный угол вектора (°)', kind: 'number', defaultValue: '42' },
    ],
  },
  {
    id: 'forest',
    packageName: 'forest',
    companionPackages: [],
    displayTitleRu: 'forest — Иерархические деревья, таксономии и AST',
    shortBadgeRu: 'forest',
    domainGroup: 'math-cs',
    ctanUrl: 'https://ctan.org/pkg/forest',
    xelatexStatus: 'native',
    xelatexNoteRu: 'Автоматическая безошибочная укладка деревьев в XeLaTeX (без требования LuaLaTeX!).',
    summaryRu:
      'Компактная скобочная запись [Корень [Узел А] [Узел Б]], ортогональные рёбра forked edges, деревья синтаксического разбора и классификации.',
    defaultLibraries: ['arrows.meta', 'calc', 'shapes.geometric'],
    presets: [
      {
        id: 'forest-forked',
        titleRu: 'Структурная классификация с forked edges',
        summaryRu: 'Иерархия модулей с аккуратными прямоугольными разветвлениями.',
      },
      {
        id: 'forest-ast',
        titleRu: 'Абстрактное синтаксическое дерево выражения (AST)',
        summaryRu: 'Узлы операторов (+, ×) и терминальных операндов.',
      },
      {
        id: 'forest-decision',
        titleRu: 'Горизонтальное дерево решений (grow=east)',
        summaryRu: 'Разветвление сценариев слева направо с подписями вероятностей.',
      },
    ],
    paramFields: [
      { key: 'rootNode', labelRu: 'Корневой узел', kind: 'text', defaultValue: '$S_0$' },
      { key: 'leftChild', labelRu: 'Левая ветвь', kind: 'text', defaultValue: '$A_1$' },
      { key: 'rightChild', labelRu: 'Правая ветвь', kind: 'text', defaultValue: '$B_2$' },
      {
        key: 'edgeStyle',
        labelRu: 'Геометрия рёбер',
        kind: 'select',
        defaultValue: 'forked',
        options: [
          { value: 'forked', labelRu: 'Ортогональная (forked edges)' },
          { value: 'direct', labelRu: 'Прямые лучи' },
        ],
      },
    ],
  },
  {
    id: 'pgfgantt',
    packageName: 'pgfgantt',
    companionPackages: [],
    displayTitleRu: 'pgfgantt — Календарные планы НИОКР и диаграммы Ганта',
    shortBadgeRu: 'pgfgantt',
    domainGroup: 'engineering',
    ctanUrl: 'https://ctan.org/pkg/pgfgantt',
    xelatexStatus: 'native',
    xelatexNoteRu: 'Полная поддержка XeLaTeX: шкала времени, полосы этапов, вехи и связи \\ganttlink.',
    summaryRu:
      'Оформление календарных планов диссертаций, грантов и ОКР: групповые задачи \\ganttgroup, этапы \\ganttbar, контрольные точки \\ganttmilestone и стрелки зависимостей.',
    defaultLibraries: ['arrows.meta', 'calc', 'patterns'],
    presets: [
      {
        id: 'gantt-rd',
        titleRu: 'План-график 3 этапов НИОКР с контрольной вехой',
        summaryRu: 'Последовательно-параллельные работы 1…12 мес. со связями elem0→elem1→elem2.',
      },
      {
        id: 'gantt-verification',
        titleRu: 'Контур стендовых испытаний и сдачи КД',
        summaryRu: 'Групповой блок \\ganttgroup + две полосы испытаний + веха приёмки.',
      },
    ],
    paramFields: [
      { key: 'slots', labelRu: 'Горизонт шкалы (слотов)', kind: 'number', defaultValue: '12' },
      { key: 'bar1Label', labelRu: 'Этап 1', kind: 'text', defaultValue: 'Stage I' },
      { key: 'bar2Label', labelRu: 'Этап 2', kind: 'text', defaultValue: 'Stage II' },
      { key: 'milestoneLabel', labelRu: 'Веха', kind: 'text', defaultValue: 'Release' },
    ],
  },
  {
    id: 'quantikz',
    packageName: 'quantikz',
    companionPackages: [],
    displayTitleRu: 'quantikz / tikz-feynman — Квантовые вентили и Фейнман',
    shortBadgeRu: 'quantikz',
    domainGroup: 'phys-chem',
    ctanUrl: 'https://ctan.org/pkg/quantikz',
    xelatexStatus: 'compat-note',
    xelatexNoteRu:
      'quantikz на 100% штатен в XeLaTeX; tikz-feynman работает в XeLaTeX с ручными координатами вершин (автоукладка графов требует LuaLaTeX).',
    summaryRu:
      'Квантовые регистры |0⟩, вентили Адамара, фазовые вращения, управляемые CNOT (\\ctrl, \\targ), измерения \\meter{} и диаграммы рассеяния частиц.',
    defaultLibraries: ['arrows.meta', 'calc', 'decorations.pathmorphing'],
    presets: [
      {
        id: 'q-bell',
        titleRu: 'Схема запутанного состояния Белла |Φ⁺⟩ (quantikz)',
        summaryRu: 'Два кубита: вентиль Адамара H, управляемый CNOT и измерители.',
      },
      {
        id: 'q-teleport',
        titleRu: 'Трёхкубитный каскад с фазовым вентилем R_z(θ)',
        summaryRu: 'Регистр из 3 линий с двухкубитными связями и выходным измерением.',
      },
      {
        id: 'feynman-qed',
        titleRu: 'Аннигиляция e⁻e⁺ → γ* → μ⁻μ⁺ (tikz-feynman [compat=1.1.0])',
        summaryRu: 'Ручные координаты вершин \\vertex — компилируется в XeLaTeX без LuaTeX.',
      },
    ],
    paramFields: [
      { key: 'gateSymbol', labelRu: 'Однокубитный вентиль', kind: 'text', defaultValue: 'H' },
      { key: 'phaseLabel', labelRu: 'Угол фазы', kind: 'text', defaultValue: 'R_z(\\theta)' },
      { key: 'bosonSym', labelRu: 'Переносчик (Фейнман)', kind: 'text', defaultValue: '\\gamma^*' },
    ],
  },
  {
    id: 'tkz-euclide',
    packageName: 'tkz-euclide',
    companionPackages: [],
    displayTitleRu: 'tkz-euclide / tikz-network — Планиметрия и графы сетей',
    shortBadgeRu: 'tkz-euclide',
    domainGroup: 'math-cs',
    ctanUrl: 'https://ctan.org/pkg/tkz-euclide',
    xelatexStatus: 'native',
    xelatexNoteRu: 'Полная совместимость с XeLaTeX: точные циркульные построения и графы tikz-network.',
    summaryRu:
      'Классическая планиметрия Евклида (\\tkzDefPoint, описанная/вписанная окружности, маркировка прямых углов и равных отрезков) и взвешенные сетевые графы.',
    defaultLibraries: ['arrows.meta', 'calc', 'angles', 'quotes'],
    presets: [
      {
        id: 'euclid-circum',
        titleRu: 'Треугольник ABC с описанной окружностью (tkz-euclide)',
        summaryRu: 'Точный расчёт центра O описанной окружности, засечки и подписи вершин.',
      },
      {
        id: 'euclid-altitude',
        titleRu: 'Высота и прямой угол \\tkzMarkRightAngle',
        summaryRu: 'Ортогональная проекция вершины на основание с квадратиком прямого угла.',
      },
      {
        id: 'net-weighted',
        titleRu: 'Взвешенный ориентированный граф потоков (tikz-network)',
        summaryRu: 'Вершины \\Vertex и дуги \\Edge[label=..., Direct] для транспортных и нейросетей.',
      },
    ],
    paramFields: [
      { key: 'labelA', labelRu: 'Вершина 1', kind: 'text', defaultValue: 'A' },
      { key: 'labelB', labelRu: 'Вершина 2', kind: 'text', defaultValue: 'B' },
      { key: 'labelC', labelRu: 'Вершина 3', kind: 'text', defaultValue: 'C' },
      { key: 'edgeWeight', labelRu: 'Вес ребра (сеть)', kind: 'text', defaultValue: 'w_{12}' },
    ],
  },
  {
    id: 'tikz-timing',
    packageName: 'tikz-timing',
    companionPackages: [],
    displayTitleRu: 'tikz-timing — Цифровые временные диаграммы ПЛИС / SPI / I²C',
    shortBadgeRu: 'tikz-timing',
    domainGroup: 'engineering',
    ctanUrl: 'https://ctan.org/pkg/tikz-timing',
    xelatexStatus: 'native',
    xelatexNoteRu: 'Полная поддержка XeLaTeX: фронты H/L, шины данных D{...}, Z-состояние и такты C.',
    summaryRu:
      'Тактовые последовательности микроконтроллеров и ПЛИС, шины SPI/I²C/AXI, времена предустановки t_su / удержания t_h и пунктирные линии синхронизации.',
    defaultLibraries: ['arrows.meta', 'calc'],
    presets: [
      {
        id: 'timing-spi',
        titleRu: 'Кадр обмена по шине SPI (CS_n, SCLK, MOSI)',
        summaryRu: 'Выбор кристалла, тактовая пачка 8 импульсов и пакеты данных на шине.',
      },
      {
        id: 'timing-axi',
        titleRu: 'Конвейерное рукопожатие CLK / VALID / READY / DATA',
        summaryRu: 'Синхронная передача слова данных при одновременном VALID=1 и READY=1.',
      },
      {
        id: 'timing-pwm',
        titleRu: 'Комплементарный ШИМ с мёртвым временем (Dead-Time)',
        summaryRu: 'Верхний и нижний ключи полумоста с защитной паузой.',
      },
    ],
    paramFields: [
      { key: 'sigClk', labelRu: 'Имя такта', kind: 'text', defaultValue: 'SCLK' },
      { key: 'sigData', labelRu: 'Имя шины данных', kind: 'text', defaultValue: 'MOSI' },
      { key: 'hexWord1', labelRu: 'Слово данных 1', kind: 'text', defaultValue: '0xA5' },
      { key: 'hexWord2', labelRu: 'Слово данных 2', kind: 'text', defaultValue: '0x3C' },
    ],
  },
  {
    id: 'tikz-optics',
    packageName: 'tikz-optics',
    companionPackages: [],
    displayTitleRu: 'tikz-optics / stanli — Интерферометры и стержневые фермы',
    shortBadgeRu: 'tikz-optics',
    domainGroup: 'phys-chem',
    ctanUrl: 'https://ctan.org/pkg/tikz-optics',
    xelatexStatus: 'native',
    xelatexNoteRu: 'Совместимо с XeLaTeX: зеркала, светоделители, линзы, а также опоры и балки stanli.',
    summaryRu:
      'Лазерные оптические столы (зеркала, полупрозрачные пластины, фотодетекторы в tikz-optics) и расчётные схемы строительной механики (опоры, шарниры и нагрузки в stanli).',
    defaultLibraries: ['arrows.meta', 'calc', 'patterns'],
    presets: [
      {
        id: 'opt-michelson',
        titleRu: 'Интерферометр Майкельсона (tikz-optics)',
        summaryRu: 'Лазерный источник, светоделитель 50/50, два глухих зеркала и фотоприёмник.',
      },
      {
        id: 'stanli-beam',
        titleRu: 'Расчётная схема балки с опорами и нагрузкой (stanli)',
        summaryRu: 'Шарнирно-неподвижная и подвижная опоры \\support, ригель \\beam и \\lineload.',
      },
    ],
    paramFields: [
      { key: 'armLen', labelRu: 'База / пролёт (см)', kind: 'number', defaultValue: '2.4' },
      { key: 'loadText', labelRu: 'Подпись пучка / нагрузки', kind: 'text', defaultValue: 'q_0' },
    ],
  },
  {
    id: 'pgf-core-suites',
    packageName: 'tikz',
    companionPackages: [],
    displayTitleRu: 'Библиотеки ядра PGF — Автоматы, Сети Петри, Цепи и Фракталы',
    shortBadgeRu: 'PGF libs',
    domainGroup: 'math-cs',
    ctanUrl: 'https://tikz.dev/libraries',
    xelatexStatus: 'native',
    xelatexNoteRu: 'Встроены прямо в ядро PGF/TikZ 3.1.12 — не требуют внешних .sty пакетов!',
    summaryRu:
      'Штатные предметные библиотеки \\usetikzlibrary: конечные автоматы (automata), сети Петри (petri), цепочки блоков (chains), интеллект-карты (mindmap) и L-системы (lindenmayersystems).',
    defaultLibraries: ['arrows.meta', 'positioning', 'calc'],
    presets: [
      {
        id: 'core-automata',
        titleRu: 'Детерминированный конечный автомат ДКА (automata)',
        summaryRu: 'Состояния initial, state и accepting с петлями loop above и переходами.',
      },
      {
        id: 'core-petri',
        titleRu: 'Сеть Петри с фишками и переходами (petri)',
        summaryRu: 'Позиции place [tokens=...] и барьеры синхронизации transition.',
      },
      {
        id: 'core-chains',
        titleRu: 'Конвейер обработки данных start chain (chains)',
        summaryRu: 'Автоматическое связывание блоков join вдоль оси going right.',
      },
      {
        id: 'core-lsystem',
        titleRu: 'Фрактальная снежинка Коха (lindenmayersystems)',
        summaryRu: 'Декларативное правило переписывания F -> F-F++F-F на уровне PGF.',
      },
    ],
    paramFields: [
      { key: 's0', labelRu: 'Узел 1', kind: 'text', defaultValue: 'q_0' },
      { key: 's1', labelRu: 'Узел 2', kind: 'text', defaultValue: 'q_1' },
      { key: 's2', labelRu: 'Узел 3', kind: 'text', defaultValue: 'q_2' },
      { key: 'edgeSym', labelRu: 'Метка перехода', kind: 'text', defaultValue: 'a' },
    ],
  },
];

function fmtCm(v: number): string {
  return `${v.toFixed(2)}cm`;
}

function numOr(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Generates both the idiomatic LaTeX package code + preamble requirements AND
 * synchronized interactive n1 canvas primitives for immediate CAD feedback.
 */
export function buildTikzExtensionBundle(opts: ExtensionBuildOptions): ExtensionGeneratedBundle {
  const spec =
    TIKZ_EXTENSION_PACKAGES.find((p) => p.id === opts.extensionId) ??
    TIKZ_EXTENSION_PACKAGES[0];
  const preset =
    spec.presets.find((pr) => pr.id === opts.presetId) ?? spec.presets[0];

  const ox = opts.originXCm ?? 1.0;
  const oy = opts.originYCm ?? 0.9;
  const p = {
    ...Object.fromEntries(spec.paramFields.map((f) => [f.key, f.defaultValue])),
    ...(opts.params ?? {}),
  };

  const preambleRequirements: ExtensionPreambleRequirement[] = [];
  const tikzLibraries = [...spec.defaultLibraries];
  const nativeTexLines: string[] = [];
  const canvasPrimitives: CanvasPrimitiveSeed[] = [];
  let engineWarningRu: string | null = null;

  switch (spec.id) {
    case 'pgfplots': {
      const subLibs: string[] = [];
      if (preset.id === 'pgf-fillbetween') subLibs.push('fillbetween');
      if (preset.id === 'pgf-groupplots') subLibs.push('groupplots');
      if (preset.id === 'pgf-polar') subLibs.push('polar');

      const setupLines = ['\\pgfplotsset{compat=1.18}'];
      if (subLibs.length > 0) {
        setupLines.push(`\\usepgfplotslibrary{${subLibs.join(',')}}`);
      }
      preambleRequirements.push(
        { pkg: 'pgfplots', setupLines },
        { pkg: 'siunitx' }
      );

      const gridOpt = p.gridMode === 'none' ? '' : `, grid=${p.gridMode || 'both'}`;
      const samples = Math.max(16, Math.min(200, Math.round(numOr(p.samples, 65))));

      if (preset.id === 'pgf-groupplots') {
        nativeTexLines.push(
          `  % Пакет pgfplots (groupplots): синхронизированные оси Боде`,
          `  \\begin{groupplot}[group style={group size=1 by 2, vertical sep=0.8cm}, width=6.2cm, height=3.1cm${gridOpt}]`,
          `    \\nextgroupplot[ylabel={$|H(\\omega)|,\\,\\mathrm{dB}$}]`,
          `    \\addplot[thick, blue, domain=0.1:10, samples=${samples}] {-10*ln(1+x^2)/ln(10)};`,
          `    \\nextgroupplot[xlabel={${p.xLabel}}, ylabel={$\\varphi,\\,^\\circ$}]`,
          `    \\addplot[thick, red!80!black, domain=0.1:10, samples=${samples}] {-atan(x)};`,
          `  \\end{groupplot}`
        );
      } else if (preset.id === 'pgf-polar') {
        nativeTexLines.push(
          `  % Пакет pgfplots (polar): диаграмма направленности`,
          `  \\begin{polaraxis}[width=5.6cm, height=5.6cm${gridOpt}, samples=${samples}]`,
          `    \\addplot[thick, blue, domain=0:360] {abs(cos(2*x))};`,
          `  \\end{polaraxis}`
        );
      } else if (preset.id === 'pgf-surf3d') {
        nativeTexLines.push(
          `  % Пакет pgfplots: 3D-поверхность отклика`,
          `  \\begin{axis}[width=6.4cm, height=4.8cm, view={35}{28}, xlabel={${p.xLabel}}, ylabel={${p.yLabel}}, zlabel={$I(x,y)$}${gridOpt}]`,
          `    \\addplot3[surf, domain=-2:2, samples=21] {exp(-x^2 - y^2)};`,
          `  \\end{axis}`
        );
      } else {
        nativeTexLines.push(
          `  % Пакет pgfplots (fillbetween): отклик с доверительным коридором`,
          `  \\begin{axis}[width=6.6cm, height=4.2cm, xlabel={${p.xLabel}}, ylabel={${p.yLabel}}${gridOpt}, samples=${samples}]`,
          `    \\addplot[name path=upper, draw=none, domain=0:5] {exp(-0.35*x)*cos(deg(2.2*x)) + 0.18};`,
          `    \\addplot[name path=lower, draw=none, domain=0:5] {exp(-0.35*x)*cos(deg(2.2*x)) - 0.18};`,
          `    \\addplot[blue!15] fill between[of=upper and lower];`,
          `    \\addplot[thick, blue!80!black, domain=0:5] {exp(-0.35*x)*cos(deg(2.2*x))};`,
          `  \\end{axis}`
        );
      }

      // Synchronized canvas schematic (axes + curve + envelope)
      canvasPrimitives.push(
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(ox),
            start_y: fmtCm(oy),
            end_x: fmtCm(ox + 4.4),
            end_y: fmtCm(oy),
            tip: 'Stealth',
            stroke_color: 'black',
          },
        },
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(ox),
            start_y: fmtCm(oy),
            end_x: fmtCm(ox),
            end_y: fmtCm(oy + 2.8),
            tip: 'Stealth',
            stroke_color: 'black',
          },
        },
        {
          tool: 'cubic',
          values: {
            start_x: fmtCm(ox + 0.2),
            start_y: fmtCm(oy + 2.1),
            control1_x: fmtCm(ox + 1.4),
            control1_y: fmtCm(oy + 2.9),
            control2_x: fmtCm(ox + 2.7),
            control2_y: fmtCm(oy + 0.4),
            end_x: fmtCm(ox + 4.1),
            end_y: fmtCm(oy + 1.45),
            stroke_color: 'blue!75!black',
            stroke_width: 'thick',
          },
        },
        {
          tool: 'node',
          values: {
            x: fmtCm(ox + 4.15),
            y: fmtCm(oy - 0.28),
            mode: 'math',
            content: 'x',
          },
        },
        {
          tool: 'node',
          values: {
            x: fmtCm(ox - 0.32),
            y: fmtCm(oy + 2.65),
            mode: 'math',
            content: 'f(x)',
          },
        }
      );
      break;
    }

    case 'circuitikz': {
      const stdOpts =
        p.standard === 'american' ? 'american' : 'european, straightvoltages';
      preambleRequirements.push(
        { pkg: 'circuitikz', options: stdOpts },
        { pkg: 'siunitx' }
      );

      const rVal = p.rNom || '4.7';
      const cVal = p.cNom || '100';
      const vVal = p.vNom || '5';

      if (preset.id === 'ctikz-opamp') {
        nativeTexLines.push(
          `  % Пакет circuitikz: инвертирующий усилитель на ОУ`,
          `  \\node[op amp] (OA) at (${(ox + 2.6).toFixed(2)}cm,${(oy + 1.4).toFixed(2)}cm) {};`,
          `  \\draw (${ox.toFixed(2)}cm,${(oy + 1.75).toFixed(2)}cm) to[R, l=$\\qty{${rVal}}{\\kilo\\ohm}$, o-*] (OA.-);`,
          `  \\draw (OA.-) -- ++(0,0.95cm) to[R, l=$R_f$] -| (OA.out);`,
          `  \\draw (OA.+) -- ++(0,-0.45cm) node[ground] {};`,
          `  \\draw (OA.out) to[short, *-o] ++(0.9cm,0) node[right] {$U_{\\mathrm{out}}$};`
        );
      } else if (preset.id === 'ctikz-bridge') {
        nativeTexLines.push(
          `  % Пакет circuitikz: измерительный мост Уитстона`,
          `  \\draw (${(ox + 2.0).toFixed(2)}cm,${(oy + 2.6).toFixed(2)}cm) to[R=$R_1$, *-*] (${(ox + 0.7).toFixed(2)}cm,${(oy + 1.3).toFixed(2)}cm) to[R=$R_3$, *-*] (${(ox + 2.0).toFixed(2)}cm,${oy.toFixed(2)}cm);`,
          `  \\draw (${(ox + 2.0).toFixed(2)}cm,${(oy + 2.6).toFixed(2)}cm) to[R=$R_2$, *-*] (${(ox + 3.3).toFixed(2)}cm,${(oy + 1.3).toFixed(2)}cm) to[R=$R_x$, *-*] (${(ox + 2.0).toFixed(2)}cm,${oy.toFixed(2)}cm);`,
          `  \\draw (${(ox + 0.7).toFixed(2)}cm,${(oy + 1.3).toFixed(2)}cm) to[rmeter, t=G] (${(ox + 3.3).toFixed(2)}cm,${(oy + 1.3).toFixed(2)}cm);`
        );
      } else if (preset.id === 'ctikz-mosfet') {
        nativeTexLines.push(
          `  % Пакет circuitikz: ключевой каскад на n-МОП транзисторе`,
          `  \\node[nmos] (M1) at (${(ox + 2.3).toFixed(2)}cm,${(oy + 1.2).toFixed(2)}cm) {$VT_1$};`,
          `  \\draw (${ox.toFixed(2)}cm,${(oy + 1.2).toFixed(2)}cm) to[R, l=$\\qty{10}{\\ohm}$, o-] (M1.G);`,
          `  \\draw (M1.D) to[R, l=$\\qty{${rVal}}{\\kilo\\ohm}$] ++(0,1.3cm) node[vcc] {$+\\qty{${vVal}}{\\volt}$};`,
          `  \\draw (M1.S) node[ground] {};`
        );
      } else {
        nativeTexLines.push(
          `  % Пакет circuitikz: последовательный контур RLC`,
          `  \\draw (${ox.toFixed(2)}cm,${oy.toFixed(2)}cm) to[V, v=$\\qty{${vVal}}{\\volt}$] (${ox.toFixed(2)}cm,${(oy + 2.2).toFixed(2)}cm) to[R, l=$\\qty{${rVal}}{\\kilo\\ohm}$] (${(ox + 2.2).toFixed(2)}cm,${(oy + 2.2).toFixed(2)}cm) to[L, l=$L_1$] (${(ox + 3.9).toFixed(2)}cm,${(oy + 2.2).toFixed(2)}cm) to[C, l=$\\qty{${cVal}}{\\nano\\farad}$] (${(ox + 3.9).toFixed(2)}cm,${oy.toFixed(2)}cm) -- (${ox.toFixed(2)}cm,${oy.toFixed(2)}cm);`
        );
      }

      // Canvas schematic preview (GOST resistor + leads + source/opamp outline)
      canvasPrimitives.push(
        {
          tool: 'line',
          values: {
            start_x: fmtCm(ox),
            start_y: fmtCm(oy + 1.5),
            end_x: fmtCm(ox + 0.9),
            end_y: fmtCm(oy + 1.5),
            stroke_width: 'thick',
          },
        },
        {
          tool: 'rectangle',
          values: {
            start_x: fmtCm(ox + 0.9),
            start_y: fmtCm(oy + 1.25),
            end_x: fmtCm(ox + 2.1),
            end_y: fmtCm(oy + 1.75),
            stroke_width: 'thick',
            stroke_color: 'blue!75!black',
          },
        },
        {
          tool: 'line',
          values: {
            start_x: fmtCm(ox + 2.1),
            start_y: fmtCm(oy + 1.5),
            end_x: fmtCm(ox + 3.4),
            end_y: fmtCm(oy + 1.5),
            stroke_width: 'thick',
          },
        },
        {
          tool: 'circle',
          values: {
            center_x: fmtCm(ox + 3.75),
            center_y: fmtCm(oy + 1.5),
            radius: '0.35cm',
            stroke_width: 'thick',
            stroke_color: 'teal!80!black',
          },
        },
        {
          tool: 'node',
          values: {
            x: fmtCm(ox + 1.5),
            y: fmtCm(oy + 2.08),
            mode: 'math',
            content: `R=\\qty{${rVal}}{\\kilo\\ohm}`,
          },
        }
      );
      break;
    }

    case 'tikz-cd': {
      preambleRequirements.push({ pkg: 'tikz-cd' });
      const A = p.objA || 'A';
      const B = p.objB || 'B';
      const C = p.objC || 'C';
      const D = p.objD || 'D';
      const f = p.morTop || 'f';
      const g = p.morBot || 'g';

      const cx = (ox + 2.1).toFixed(2);
      const cy = (oy + 1.3).toFixed(2);

      if (preset.id === 'cd-pullback') {
        nativeTexLines.push(
          `  % Пакет tikz-cd: универсальное свойство декартова квадрата (Pullback)`,
          `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
          `    \\begin{tikzcd}[row sep=large, column sep=large]`,
          `      P \\arrow[drr, bend left=20, "p_1"] \\arrow[ddr, bend right=20, "p_2"'] \\arrow[dr, dashed, "\\exists!\\,u"] & & \\\\`,
          `      & ${A} \\arrow[r, "${f}"] \\arrow[d, "\\pi_2"'] & ${B} \\arrow[d, "h"] \\\\`,
          `      & ${C} \\arrow[r, "${g}"'] & ${D}`,
          `    \\end{tikzcd}`,
          `  };`
        );
      } else if (preset.id === 'cd-exact') {
        nativeTexLines.push(
          `  % Пакет tikz-cd: короткая точная последовательность`,
          `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
          `    \\begin{tikzcd}[column sep=1.1cm]`,
          `      0 \\arrow[r] & ${A} \\arrow[r, hook, "${f}"] & ${B} \\arrow[r, two heads, "${g}"] & ${C} \\arrow[r] & 0`,
          `    \\end{tikzcd}`,
          `  };`
        );
      } else if (preset.id === 'cd-adjoint') {
        nativeTexLines.push(
          `  % Пакет tikz-cd: сопряжённые функторы`,
          `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
          `    \\begin{tikzcd}[column sep=2.2cm]`,
          `      \\mathcal{C} \\arrow[r, bend left=28, "${f}"] & \\mathcal{D} \\arrow[l, bend left=28, "${g}"]`,
          `    \\end{tikzcd}`,
          `  };`
        );
      } else {
        nativeTexLines.push(
          `  % Пакет tikz-cd: коммутативный квадрат`,
          `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
          `    \\begin{tikzcd}[row sep=1.4cm, column sep=1.6cm]`,
          `      ${A} \\arrow[r, "${f}"] \\arrow[d, "\\alpha"'] & ${B} \\arrow[d, "\\beta"] \\\\`,
          `      ${C} \\arrow[r, "${g}"'] & ${D}`,
          `    \\end{tikzcd}`,
          `  };`
        );
      }

      canvasPrimitives.push(
        { tool: 'node', values: { x: fmtCm(ox + 0.6), y: fmtCm(oy + 2.1), mode: 'math', content: A } },
        { tool: 'node', values: { x: fmtCm(ox + 3.2), y: fmtCm(oy + 2.1), mode: 'math', content: B } },
        { tool: 'node', values: { x: fmtCm(ox + 0.6), y: fmtCm(oy + 0.5), mode: 'math', content: C } },
        { tool: 'node', values: { x: fmtCm(ox + 3.2), y: fmtCm(oy + 0.5), mode: 'math', content: D } },
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(ox + 1.0),
            start_y: fmtCm(oy + 2.1),
            end_x: fmtCm(ox + 2.8),
            end_y: fmtCm(oy + 2.1),
            tip: 'Stealth',
            stroke_color: 'blue!75!black',
          },
        },
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(ox + 1.0),
            start_y: fmtCm(oy + 0.5),
            end_x: fmtCm(ox + 2.8),
            end_y: fmtCm(oy + 0.5),
            tip: 'Stealth',
            stroke_color: 'blue!75!black',
          },
        },
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(ox + 0.6),
            start_y: fmtCm(oy + 1.8),
            end_x: fmtCm(ox + 0.6),
            end_y: fmtCm(oy + 0.8),
            tip: 'Stealth',
          },
        },
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(ox + 3.2),
            start_y: fmtCm(oy + 1.8),
            end_x: fmtCm(ox + 3.2),
            end_y: fmtCm(oy + 0.8),
            tip: 'Stealth',
          },
        }
      );
      break;
    }

    case 'chemfig': {
      preambleRequirements.push(
        { pkg: 'chemfig' },
        { pkg: 'mhchem', options: 'version=4' }
      );
      const sub = p.substituent || 'OH';
      const cat = p.catalyst || '\\ce{H2SO4}';
      const byp = p.byproduct || '\\ce{-H2O}';
      const cx = (ox + 2.2).toFixed(2);
      const cy = (oy + 1.35).toFixed(2);

      if (preset.id === 'chem-scheme') {
        nativeTexLines.push(
          `  % Пакеты chemfig + mhchem: реакционная схема`,
          `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
          `    \\schemestart`,
          `      \\chemfig{*6(-=-(-H)=-=)} \\+ \\ce{HNO3}`,
          `      \\arrow{->[${cat}][${byp}]}`,
          `      \\chemfig{*6(-=-(-${sub})=-=)}`,
          `    \\schemestop`,
          `  };`
        );
      } else if (preset.id === 'chem-peptide') {
        nativeTexLines.push(
          `  % Пакет chemfig: пептидная / карбонильная цепь`,
          `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
          `    \\chemfig{H_2N-[:30](-[:90]R_1)-[:-30](=[:-90]O)-[:30]NH-[:-30](-[:-90]${sub})-[:30]COOH}`,
          `  };`
        );
      } else if (preset.id === 'chem-hetero') {
        nativeTexLines.push(
          `  % Пакет chemfig: замещённый гетероцикл пиридина`,
          `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
          `    \\chemfig{*6(-N=(-=-(-${sub})=-)=)}`,
          `  };`
        );
      } else {
        nativeTexLines.push(
          `  % Пакет chemfig: ароматическое кольцо с заместителем`,
          `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
          `    \\chemfig{*6(-=-(-${sub})=-=)}`,
          `  };`
        );
      }

      // Hexagon ring + substituent bond on canvas
      const rHex = 0.85;
      const rcX = ox + 1.35;
      const rcY = oy + 1.35;
      const hexPts = Array.from({ length: 6 }, (_, k) => {
        const a = (Math.PI / 3) * k;
        return {
          x: rcX + rHex * Math.cos(a),
          y: rcY + rHex * Math.sin(a),
        };
      });
      for (let k = 0; k < 6; k++) {
        const p1 = hexPts[k];
        const p2 = hexPts[(k + 1) % 6];
        canvasPrimitives.push({
          tool: 'line',
          values: {
            start_x: fmtCm(p1.x),
            start_y: fmtCm(p1.y),
            end_x: fmtCm(p2.x),
            end_y: fmtCm(p2.y),
            stroke_width: 'thick',
          },
        });
      }
      canvasPrimitives.push(
        {
          tool: 'circle',
          values: {
            center_x: fmtCm(rcX),
            center_y: fmtCm(rcY),
            radius: '0.46cm',
            line_style: 'dashed',
            stroke_color: 'teal!80!black',
          },
        },
        {
          tool: 'line',
          values: {
            start_x: fmtCm(rcX + rHex),
            start_y: fmtCm(rcY),
            end_x: fmtCm(rcX + rHex + 0.65),
            end_y: fmtCm(rcY),
            stroke_width: 'thick',
          },
        },
        {
          tool: 'node',
          values: {
            x: fmtCm(rcX + rHex + 1.05),
            y: fmtCm(rcY),
            mode: 'math',
            content: `\\mathrm{${sub}}`,
          },
        }
      );
      break;
    }

    case 'tikz-3dplot': {
      preambleRequirements.push({ pkg: 'tikz-3dplot' });
      const th = Math.round(numOr(p.thetaView, 68));
      const ph = Math.round(numOr(p.phiView, 115));
      const rLen = Math.max(0.8, numOr(p.vecLen, 2.0));
      const pol = Math.round(numOr(p.polarAngle, 42));

      if (preset.id === 'td-bloch') {
        nativeTexLines.push(
          `  % Пакет tikz-3dplot: сфера Блоха кубита`,
          `  \\tdplotsetmaincoords{${th}}{${ph}}`,
          `  \\begin{scope}[tdplot_main_coords, shift={(${(ox + 2.0).toFixed(2)}cm,${(oy + 1.4).toFixed(2)}cm)}]`,
          `    \\draw[dashed, gray] (0,0,0) circle [radius=${rLen.toFixed(2)}cm];`,
          `    \\draw[-{Stealth}] (0,0,0) -- (${(rLen * 1.25).toFixed(2)},0,0) node[below left] {$x$};`,
          `    \\draw[-{Stealth}] (0,0,0) -- (0,${(rLen * 1.25).toFixed(2)},0) node[right] {$y$};`,
          `    \\draw[-{Stealth}] (0,0,0) -- (0,0,${(rLen * 1.25).toFixed(2)}) node[above] {$|0\\rangle$};`,
          `    \\tdplotsetcoord{Psi}{${rLen.toFixed(2)}}{${pol}}{50}`,
          `    \\draw[very thick, red!80!black, -{Stealth}] (0,0,0) -- (Psi) node[above right] {$|\\psi\\rangle$};`,
          `    \\draw[dashed, teal] (0,0,0) -- (Psixy) -- (Psi);`,
          `  \\end{scope}`
        );
      } else if (preset.id === 'td-euler') {
        nativeTexLines.push(
          `  % Пакет tikz-3dplot: повёрнутый базис углов Эйлера`,
          `  \\tdplotsetmaincoords{${th}}{${ph}}`,
          `  \\begin{scope}[tdplot_main_coords, shift={(${(ox + 2.0).toFixed(2)}cm,${(oy + 1.4).toFixed(2)}cm)}]`,
          `    \\draw[-{Stealth}] (0,0,0) -- (2.2,0,0) node[anchor=north east] {$X$};`,
          `    \\draw[-{Stealth}] (0,0,0) -- (0,2.2,0) node[anchor=north west] {$Y$};`,
          `    \\draw[-{Stealth}] (0,0,0) -- (0,0,2.2) node[anchor=south] {$Z$};`,
          `    \\tdplotsetrotatedcoords{35}{${pol}}{20}`,
          `    \\begin{scope}[tdplot_rotated_coords, blue]`,
          `      \\draw[thick, -{Stealth}] (0,0,0) -- (1.8,0,0) node[right] {$x'$};`,
          `      \\draw[thick, -{Stealth}] (0,0,0) -- (0,1.8,0) node[above] {$y'$};`,
          `      \\draw[thick, -{Stealth}] (0,0,0) -- (0,0,1.8) node[above left] {$z'$};`,
          `    \\end{scope}`,
          `  \\end{scope}`
        );
      } else {
        nativeTexLines.push(
          `  % Пакет tikz-3dplot: радиус-вектор в сферических координатах`,
          `  \\tdplotsetmaincoords{${th}}{${ph}}`,
          `  \\begin{scope}[tdplot_main_coords, shift={(${(ox + 2.0).toFixed(2)}cm,${(oy + 1.2).toFixed(2)}cm)}]`,
          `    \\draw[-{Stealth}] (0,0,0) -- (2.3,0,0) node[anchor=north east] {$x$};`,
          `    \\draw[-{Stealth}] (0,0,0) -- (0,2.3,0) node[anchor=north west] {$y$};`,
          `    \\draw[-{Stealth}] (0,0,0) -- (0,0,2.3) node[anchor=south] {$z$};`,
          `    \\tdplotsetcoord{P}{${rLen.toFixed(2)}}{${pol}}{55}`,
          `    \\draw[very thick, red!80!black, -{Stealth}] (0,0,0) -- (P) node[above right] {$\\vec{r}$};`,
          `    \\draw[dashed, gray] (0,0,0) -- (Pxy) -- (P);`,
          `    \\tdplotdrawarc{(0,0,0)}{0.75}{0}{55}{anchor=north}{$\\varphi$}`,
          `  \\end{scope}`
        );
      }

      const cx = ox + 1.9;
      const cy = oy + 1.1;
      canvasPrimitives.push(
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(cx),
            start_y: fmtCm(cy),
            end_x: fmtCm(cx - 1.15),
            end_y: fmtCm(cy - 0.65),
            tip: 'Stealth',
          },
        },
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(cx),
            start_y: fmtCm(cy),
            end_x: fmtCm(cx + 1.85),
            end_y: fmtCm(cy - 0.25),
            tip: 'Stealth',
          },
        },
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(cx),
            start_y: fmtCm(cy),
            end_x: fmtCm(cx),
            end_y: fmtCm(cy + 1.95),
            tip: 'Stealth',
          },
        },
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(cx),
            start_y: fmtCm(cy),
            end_x: fmtCm(cx + 1.25),
            end_y: fmtCm(cy + 1.45),
            tip: 'Stealth',
            stroke_color: 'red!75!black',
            stroke_width: 'very thick',
          },
        },
        {
          tool: 'node',
          values: {
            x: fmtCm(cx + 1.5),
            y: fmtCm(cy + 1.65),
            mode: 'math',
            content: '\\vec{r}',
          },
        }
      );
      break;
    }

    case 'forest': {
      preambleRequirements.push({ pkg: 'forest', options: 'edges' });
      const root = p.rootNode || '$S_0$';
      const left = p.leftChild || '$A_1$';
      const right = p.rightChild || '$B_2$';
      const forked = p.edgeStyle !== 'direct' ? 'forked edges, ' : '';
      const growOpt = preset.id === 'forest-decision' ? 'grow=east, ' : '';
      const cx = (ox + 2.2).toFixed(2);
      const cy = (oy + 1.4).toFixed(2);

      nativeTexLines.push(
        `  % Пакет forest: автоматическое дерево на скобочном DSL`,
        `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
        `    \\begin{forest}`,
        `      for tree={${forked}${growOpt}draw, rounded corners=2pt, inner sep=4pt, s sep=7mm, l sep=8mm}`,
        `      [${root}`,
        `        [${left}`,
        `          [$x_1$]`,
        `          [$x_2$]`,
        `        ]`,
        `        [${right}`,
        `          [$y_1$]`,
        `          [$y_2$]`,
        `        ]`,
        `      ]`,
        `    \\end{forest}`,
        `  };`
      );

      canvasPrimitives.push(
        {
          tool: 'rectangle',
          values: {
            start_x: fmtCm(ox + 1.55),
            start_y: fmtCm(oy + 2.15),
            end_x: fmtCm(ox + 2.65),
            end_y: fmtCm(oy + 2.65),
            stroke_color: 'blue!75!black',
            stroke_width: 'thick',
          },
        },
        {
          tool: 'rectangle',
          values: {
            start_x: fmtCm(ox + 0.35),
            start_y: fmtCm(oy + 0.65),
            end_x: fmtCm(ox + 1.45),
            end_y: fmtCm(oy + 1.15),
            stroke_color: 'teal!80!black',
          },
        },
        {
          tool: 'rectangle',
          values: {
            start_x: fmtCm(ox + 2.75),
            start_y: fmtCm(oy + 0.65),
            end_x: fmtCm(ox + 3.85),
            end_y: fmtCm(oy + 1.15),
            stroke_color: 'teal!80!black',
          },
        },
        {
          tool: 'line',
          values: {
            start_x: fmtCm(ox + 2.1),
            start_y: fmtCm(oy + 2.15),
            end_x: fmtCm(ox + 0.9),
            end_y: fmtCm(oy + 1.15),
          },
        },
        {
          tool: 'line',
          values: {
            start_x: fmtCm(ox + 2.1),
            start_y: fmtCm(oy + 2.15),
            end_x: fmtCm(ox + 3.3),
            end_y: fmtCm(oy + 1.15),
          },
        }
      );
      break;
    }

    case 'pgfgantt': {
      preambleRequirements.push({ pkg: 'pgfgantt' });
      const slots = Math.max(6, Math.min(24, Math.round(numOr(p.slots, 12))));
      const b1 = p.bar1Label || 'Stage I';
      const b2 = p.bar2Label || 'Stage II';
      const ms = p.milestoneLabel || 'Release';
      const mid = Math.max(3, Math.floor(slots * 0.45));
      const endBar = Math.max(mid + 2, slots - 1);

      nativeTexLines.push(
        `  % Пакет pgfgantt: календарный план-график работ`,
        `  \\node[inner sep=0pt] at (${(ox + 2.5).toFixed(2)}cm,${(oy + 1.4).toFixed(2)}cm) {`,
        `    \\begin{ganttchart}[hgrid, vgrid, x unit=0.38cm, y unit chart=0.52cm]{1}{${slots}}`,
        `      \\gantttitle{1,...,${slots}}{1} \\\\`,
        `      \\ganttbar{${b1}}{1}{${mid}} \\\\`,
        `      \\ganttbar{${b2}}{${mid}}{${endBar}} \\\\`,
        `      \\ganttmilestone{${ms}}{${slots}}`,
        `      \\ganttlink{elem0}{elem1}`,
        `      \\ganttlink{elem1}{elem2}`,
        `    \\end{ganttchart}`,
        `  };`
      );

      canvasPrimitives.push(
        {
          tool: 'rectangle',
          values: {
            start_x: fmtCm(ox),
            start_y: fmtCm(oy + 0.2),
            end_x: fmtCm(ox + 4.4),
            end_y: fmtCm(oy + 2.45),
            stroke_color: 'violet!80!black',
          },
        },
        {
          tool: 'rectangle',
          values: {
            start_x: fmtCm(ox + 0.35),
            start_y: fmtCm(oy + 1.75),
            end_x: fmtCm(ox + 2.05),
            end_y: fmtCm(oy + 2.12),
            stroke_color: 'blue!75!black',
            fill_color: 'blue!8',
          },
        },
        {
          tool: 'rectangle',
          values: {
            start_x: fmtCm(ox + 1.85),
            start_y: fmtCm(oy + 1.1),
            end_x: fmtCm(ox + 3.65),
            end_y: fmtCm(oy + 1.47),
            stroke_color: 'teal!80!black',
            fill_color: 'emerald!10',
          },
        },
        {
          tool: 'circle',
          values: {
            center_x: fmtCm(ox + 4.0),
            center_y: fmtCm(oy + 0.62),
            radius: '0.16cm',
            stroke_color: 'orange!85!black',
            fill_color: 'amber!14',
          },
        }
      );
      break;
    }

    case 'quantikz': {
      const cx = (ox + 2.25).toFixed(2);
      const cy = (oy + 1.35).toFixed(2);
      const g1 = p.gateSymbol || 'H';
      const ph = p.phaseLabel || 'R_z(\\theta)';
      const bos = p.bosonSym || '\\gamma^*';

      if (preset.id === 'feynman-qed') {
        preambleRequirements.push({ pkg: 'tikz-feynman', options: 'compat=1.1.0' });
        if (!tikzLibraries.includes('decorations.pathmorphing')) {
          tikzLibraries.push('decorations.pathmorphing');
        }
        engineWarningRu =
          'Вставлен XeLaTeX-совместимый режим tikz-feynman с явными координатами вершин \\vertex. Автоматическая пружинная укладка графов требует LuaLaTeX.';
        nativeTexLines.push(
          `  % Пакет tikz-feynman (режим явных координат вершин для XeLaTeX)`,
          `  \\begin{feynman}`,
          `    \\vertex (i1) at (${ox.toFixed(2)}cm,${(oy + 2.3).toFixed(2)}cm) {$e^-$};`,
          `    \\vertex (i2) at (${ox.toFixed(2)}cm,${(oy + 0.4).toFixed(2)}cm) {$e^+$};`,
          `    \\vertex (v1) at (${(ox + 1.35).toFixed(2)}cm,${(oy + 1.35).toFixed(2)}cm);`,
          `    \\vertex (v2) at (${(ox + 2.95).toFixed(2)}cm,${(oy + 1.35).toFixed(2)}cm);`,
          `    \\vertex (f1) at (${(ox + 4.3).toFixed(2)}cm,${(oy + 2.3).toFixed(2)}cm) {$\\mu^-$};`,
          `    \\vertex (f2) at (${(ox + 4.3).toFixed(2)}cm,${(oy + 0.4).toFixed(2)}cm) {$\\mu^+$};`,
          `    \\diagram* {(i1) -- [fermion] (v1) -- [fermion] (i2), (v1) -- [boson, edge label=${bos}] (v2), (f2) -- [fermion] (v2) -- [fermion] (f1)};`,
          `  \\end{feynman}`
        );
      } else {
        preambleRequirements.push({ pkg: 'quantikz' });
        if (preset.id === 'q-teleport') {
          nativeTexLines.push(
            `  % Пакет quantikz: трёхкубитный квантовый каскад`,
            `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
            `    \\begin{quantikz}[row sep=0.45cm, column sep=0.55cm]`,
            `      \\lstick{$|\\psi\\rangle$} & \\ctrl{1} & \\gate{${g1}} & \\meter{} \\\\`,
            `      \\lstick{$|0\\rangle$} & \\targ{} & \\qw & \\meter{} \\\\`,
            `      \\lstick{$|0\\rangle$} & \\qw & \\gate{${ph}} & \\qw`,
            `    \\end{quantikz}`,
            `  };`
          );
        } else {
          nativeTexLines.push(
            `  % Пакет quantikz: схема приготовления пары Белла`,
            `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
            `    \\begin{quantikz}[row sep=0.5cm, column sep=0.6cm]`,
            `      \\lstick{$|0\\rangle$} & \\gate{${g1}} & \\ctrl{1} & \\meter{} \\\\`,
            `      \\lstick{$|0\\rangle$} & \\qw & \\targ{} & \\meter{}`,
            `    \\end{quantikz}`,
            `  };`
          );
        }
      }

      canvasPrimitives.push(
        {
          tool: 'line',
          values: {
            start_x: fmtCm(ox + 0.4),
            start_y: fmtCm(oy + 1.95),
            end_x: fmtCm(ox + 4.0),
            end_y: fmtCm(oy + 1.95),
          },
        },
        {
          tool: 'line',
          values: {
            start_x: fmtCm(ox + 0.4),
            start_y: fmtCm(oy + 0.85),
            end_x: fmtCm(ox + 4.0),
            end_y: fmtCm(oy + 0.85),
          },
        },
        {
          tool: 'rectangle',
          values: {
            start_x: fmtCm(ox + 1.0),
            start_y: fmtCm(oy + 1.65),
            end_x: fmtCm(ox + 1.65),
            end_y: fmtCm(oy + 2.25),
            stroke_color: 'blue!75!black',
            fill_color: 'blue!8',
          },
        },
        {
          tool: 'node',
          values: {
            x: fmtCm(ox + 1.32),
            y: fmtCm(oy + 1.95),
            mode: 'math',
            content: g1,
          },
        },
        {
          tool: 'line',
          values: {
            start_x: fmtCm(ox + 2.55),
            start_y: fmtCm(oy + 1.95),
            end_x: fmtCm(ox + 2.55),
            end_y: fmtCm(oy + 0.85),
            stroke_color: 'teal!80!black',
            stroke_width: 'thick',
          },
        },
        {
          tool: 'circle',
          values: {
            center_x: fmtCm(ox + 2.55),
            center_y: fmtCm(oy + 0.85),
            radius: '0.22cm',
            stroke_color: 'teal!80!black',
            stroke_width: 'thick',
          },
        }
      );
      break;
    }

    case 'tkz-euclide': {
      const A = p.labelA || 'A';
      const B = p.labelB || 'B';
      const C = p.labelC || 'C';
      const w = p.edgeWeight || 'w_{12}';

      if (preset.id === 'net-weighted') {
        preambleRequirements.push({ pkg: 'tikz-network' });
        nativeTexLines.push(
          `  % Пакет tikz-network: взвешенный ориентированный граф`,
          `  \\Vertex[x=${(ox + 0.6).toFixed(2)}, y=${(oy + 1.3).toFixed(2)}, math, label=${A}]{V1}`,
          `  \\Vertex[x=${(ox + 2.2).toFixed(2)}, y=${(oy + 2.4).toFixed(2)}, math, label=${B}]{V2}`,
          `  \\Vertex[x=${(ox + 3.7).toFixed(2)}, y=${(oy + 1.1).toFixed(2)}, math, label=${C}]{V3}`,
          `  \\Edge[Direct, Math, label=${w}](V1)(V2)`,
          `  \\Edge[Direct, Math, label=w_{23}](V2)(V3)`,
          `  \\Edge[Direct, Math, bend=-20, label=w_{13}](V1)(V3)`
        );
      } else {
        preambleRequirements.push({ pkg: 'tkz-euclide' });
        if (preset.id === 'euclid-altitude') {
          nativeTexLines.push(
            `  % Пакет tkz-euclide: высота треугольника и маркер прямого угла`,
            `  \\tkzDefPoint(${ox.toFixed(2)},${oy.toFixed(2)}){A}`,
            `  \\tkzDefPoint(${(ox + 3.6).toFixed(2)},${oy.toFixed(2)}){B}`,
            `  \\tkzDefPoint(${(ox + 1.35).toFixed(2)},${(oy + 2.3).toFixed(2)}){C}`,
            `  \\tkzDefPointBy[projection=onto A--B](C) \\tkzGetPoint{H}`,
            `  \\tkzDrawPolygon[thick](A,B,C)`,
            `  \\tkzDrawSegment[dashed, red!80!black](C,H)`,
            `  \\tkzMarkRightAngle[size=0.25](C,H,B)`,
            `  \\tkzDrawPoints(A,B,C,H)`,
            `  \\tkzLabelPoint[below left](A){$${A}$}`,
            `  \\tkzLabelPoint[below right](B){$${B}$}`,
            `  \\tkzLabelPoint[above](C){$${C}$}`
          );
        } else {
          nativeTexLines.push(
            `  % Пакет tkz-euclide: треугольник и описанная окружность`,
            `  \\tkzDefPoint(${(ox + 0.5).toFixed(2)},${(oy + 0.4).toFixed(2)}){A}`,
            `  \\tkzDefPoint(${(ox + 3.5).toFixed(2)},${(oy + 0.4).toFixed(2)}){B}`,
            `  \\tkzDefPoint(${(ox + 1.5).toFixed(2)},${(oy + 2.35).toFixed(2)}){C}`,
            `  \\tkzDefCircle[circum](A,B,C) \\tkzGetPoint{O}`,
            `  \\tkzDrawPolygon[thick, blue!80!black](A,B,C)`,
            `  \\tkzDrawCircle[teal](O,A)`,
            `  \\tkzDrawPoints(A,B,C,O)`,
            `  \\tkzLabelPoint[below left](A){$${A}$}`,
            `  \\tkzLabelPoint[below right](B){$${B}$}`,
            `  \\tkzLabelPoint[above](C){$${C}$}`
          );
        }
      }

      canvasPrimitives.push(
        {
          tool: 'line',
          values: {
            start_x: fmtCm(ox + 0.5),
            start_y: fmtCm(oy + 0.45),
            end_x: fmtCm(ox + 3.5),
            end_y: fmtCm(oy + 0.45),
            stroke_width: 'thick',
            stroke_color: 'blue!75!black',
          },
        },
        {
          tool: 'line',
          values: {
            start_x: fmtCm(ox + 3.5),
            start_y: fmtCm(oy + 0.45),
            end_x: fmtCm(ox + 1.55),
            end_y: fmtCm(oy + 2.35),
            stroke_width: 'thick',
            stroke_color: 'blue!75!black',
          },
        },
        {
          tool: 'line',
          values: {
            start_x: fmtCm(ox + 1.55),
            start_y: fmtCm(oy + 2.35),
            end_x: fmtCm(ox + 0.5),
            end_y: fmtCm(oy + 0.45),
            stroke_width: 'thick',
            stroke_color: 'blue!75!black',
          },
        },
        {
          tool: 'circle',
          values: {
            center_x: fmtCm(ox + 2.0),
            center_y: fmtCm(oy + 1.12),
            radius: '1.65cm',
            stroke_color: 'teal!80!black',
            line_style: 'dashed',
          },
        }
      );
      break;
    }

    case 'tikz-timing': {
      preambleRequirements.push({ pkg: 'tikz-timing' });
      const sClk = p.sigClk || 'SCLK';
      const sDat = p.sigData || 'MOSI';
      const w1 = p.hexWord1 || '0xA5';
      const w2 = p.hexWord2 || '0x3C';
      const cx = (ox + 2.3).toFixed(2);
      const cy = (oy + 1.35).toFixed(2);

      if (preset.id === 'timing-pwm') {
        nativeTexLines.push(
          `  % Пакет tikz-timing: комплементарный ШИМ с мёртвым временем`,
          `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
          `    \\begin{tikztimingtable}[timing/slope=0.08, xscale=1.35]`,
          `      PWM\\_H & L 4H 2L 4H 2L \\\\`,
          `      PWM\\_L & H 5L 1H 5L 1H \\\\`,
          `    \\end{tikztimingtable}`,
          `  };`
        );
      } else if (preset.id === 'timing-axi') {
        nativeTexLines.push(
          `  % Пакет tikz-timing: синхронное рукопожатие AXI-Stream`,
          `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
          `    \\begin{tikztimingtable}[timing/slope=0.12, xscale=1.3]`,
          `      ${sClk}  & 12{C} \\\\`,
          `      TVALID   & 2L 8H 2L \\\\`,
          `      TREADY   & 4L 6H 2L \\\\`,
          `      ${sDat}  & 4U 3D{${w1}} 3D{${w2}} 2U \\\\`,
          `    \\end{tikztimingtable}`,
          `  };`
        );
      } else {
        nativeTexLines.push(
          `  % Пакет tikz-timing: кадр передачи по шине SPI`,
          `  \\node[inner sep=0pt] at (${cx}cm,${cy}cm) {`,
          `    \\begin{tikztimingtable}[timing/slope=0.1, xscale=1.3]`,
          `      CS\\_n   & 1H 10L 1H \\\\`,
          `      ${sClk}  & 2L 8{C} 2L \\\\`,
          `      ${sDat}  & 2Z 4D{${w1}} 4D{${w2}} 2Z \\\\`,
          `    \\end{tikztimingtable}`,
          `  };`
        );
      }

      // Crisp digital waveform preview on canvas
      for (let k = 0; k < 4; k++) {
        const bx = ox + 0.8 + k * 0.85;
        canvasPrimitives.push(
          {
            tool: 'line',
            values: {
              start_x: fmtCm(bx),
              start_y: fmtCm(oy + 1.65),
              end_x: fmtCm(bx + 0.42),
              end_y: fmtCm(oy + 1.65),
              stroke_color: 'blue!75!black',
              stroke_width: 'thick',
            },
          },
          {
            tool: 'line',
            values: {
              start_x: fmtCm(bx + 0.42),
              start_y: fmtCm(oy + 1.65),
              end_x: fmtCm(bx + 0.42),
              end_y: fmtCm(oy + 2.15),
              stroke_color: 'blue!75!black',
              stroke_width: 'thick',
            },
          },
          {
            tool: 'line',
            values: {
              start_x: fmtCm(bx + 0.42),
              start_y: fmtCm(oy + 2.15),
              end_x: fmtCm(bx + 0.85),
              end_y: fmtCm(oy + 2.15),
              stroke_color: 'blue!75!black',
              stroke_width: 'thick',
            },
          }
        );
      }
      canvasPrimitives.push(
        {
          tool: 'rectangle',
          values: {
            start_x: fmtCm(ox + 0.8),
            start_y: fmtCm(oy + 0.65),
            end_x: fmtCm(ox + 2.5),
            end_y: fmtCm(oy + 1.15),
            stroke_color: 'teal!80!black',
          },
        },
        {
          tool: 'node',
          values: {
            x: fmtCm(ox + 1.65),
            y: fmtCm(oy + 0.9),
            mode: 'text',
            content: w1,
          },
        }
      );
      break;
    }

    case 'tikz-optics': {
      const span = Math.max(1.4, numOr(p.armLen, 2.4));
      const lbl = p.loadText || 'q_0';

      if (preset.id === 'stanli-beam') {
        preambleRequirements.push({ pkg: 'stanli' });
        nativeTexLines.push(
          `  % Пакет stanli: расчётная схема балки с опорами и погонной нагрузкой`,
          `  \\point{a}{${ox.toFixed(2)}}{${(oy + 1.1).toFixed(2)}};`,
          `  \\point{b}{${(ox + span + 1.2).toFixed(2)}}{${(oy + 1.1).toFixed(2)}};`,
          `  \\beam{2}{a}{b};`,
          `  \\support{1}{a};`,
          `  \\support{2}{b};`,
          `  \\lineload{1}{a}{b}[0.55][0.55];`,
          `  \\notation{1}{a}{$${lbl}$}[above right=4mm];`
        );
      } else {
        preambleRequirements.push({ pkg: 'tikz-optics' });
        const cx = ox + 2.0;
        const cy = oy + 1.3;
        nativeTexLines.push(
          `  % Пакет tikz-optics: интерферометр Майкельсона`,
          `  \\node[laser] (L) at (${ox.toFixed(2)}cm,${cy.toFixed(2)}cm) {Laser};`,
          `  \\node[mirror, rotate=45] (BS) at (${cx.toFixed(2)}cm,${cy.toFixed(2)}cm) {};`,
          `  \\node[mirror, rotate=-90] (M1) at (${cx.toFixed(2)}cm,${(cy + span * 0.65).toFixed(2)}cm) {};`,
          `  \\node[mirror] (M2) at (${(cx + span * 0.75).toFixed(2)}cm,${cy.toFixed(2)}cm) {};`,
          `  \\draw[red, thick, -{Stealth}] (L.aperture east) -- (BS.center);`,
          `  \\draw[red, thick, <->] (BS.center) -- (M1.center);`,
          `  \\draw[red, thick, <->] (BS.center) -- (M2.center);`,
          `  \\draw[red, thick, -{Stealth}] (BS.center) -- (${cx.toFixed(2)}cm,${(cy - 1.05).toFixed(2)}cm) node[below] {$I(\\Delta\\varphi)$};`
        );
      }

      canvasPrimitives.push(
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(ox),
            start_y: fmtCm(oy + 1.3),
            end_x: fmtCm(ox + 3.6),
            end_y: fmtCm(oy + 1.3),
            tip: 'Stealth',
            stroke_color: 'red!75!black',
            stroke_width: 'thick',
          },
        },
        {
          tool: 'line',
          values: {
            start_x: fmtCm(ox + 1.7),
            start_y: fmtCm(oy + 1.0),
            end_x: fmtCm(ox + 2.3),
            end_y: fmtCm(oy + 1.6),
            stroke_color: 'blue!75!black',
            stroke_width: 'very thick',
          },
        },
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(ox + 2.0),
            start_y: fmtCm(oy + 1.3),
            end_x: fmtCm(ox + 2.0),
            end_y: fmtCm(oy + 2.65),
            tip: 'Stealth',
            stroke_color: 'red!75!black',
            stroke_width: 'thick',
          },
        }
      );
      break;
    }

    case 'pgf-core-suites': {
      const s0 = p.s0 || 'q_0';
      const s1 = p.s1 || 'q_1';
      const s2 = p.s2 || 'q_2';
      const sym = p.edgeSym || 'a';

      if (preset.id === 'core-petri') {
        if (!tikzLibraries.includes('petri')) tikzLibraries.push('petri');
        nativeTexLines.push(
          `  % Библиотека ядра PGF petri: сеть Петри с фишками`,
          `  \\node[place, tokens=2, label=above:$P_1$] (p1) at (${(ox + 0.7).toFixed(2)}cm,${(oy + 1.4).toFixed(2)}cm) {};`,
          `  \\node[transition, label=above:$T_1$] (t1) at (${(ox + 2.1).toFixed(2)}cm,${(oy + 1.4).toFixed(2)}cm) {} edge[pre] (p1);`,
          `  \\node[place, tokens=1, label=above:$P_2$] (p2) at (${(ox + 3.5).toFixed(2)}cm,${(oy + 1.4).toFixed(2)}cm) {} edge[pre] (t1);`
        );
      } else if (preset.id === 'core-chains') {
        if (!tikzLibraries.includes('chains')) tikzLibraries.push('chains');
        nativeTexLines.push(
          `  % Библиотека ядра PGF chains: конвейер узлов`,
          `  \\begin{scope}[start chain=going right, node distance=0.85cm, every on chain/.style={draw, rounded corners=2pt, minimum height=0.7cm, join=by -{Stealth}}]`,
          `    \\node[on chain] at (${(ox + 0.6).toFixed(2)}cm,${(oy + 1.4).toFixed(2)}cm) {$${s0}$};`,
          `    \\node[on chain] {$${s1}$};`,
          `    \\node[on chain] {$${s2}$};`,
          `  \\end{scope}`
        );
      } else if (preset.id === 'core-lsystem') {
        if (!tikzLibraries.includes('lindenmayersystems')) {
          tikzLibraries.push('lindenmayersystems');
        }
        nativeTexLines.push(
          `  % Библиотека ядра PGF lindenmayersystems: фрактальная кривая Коха`,
          `  \\draw[blue!80!black, l-system={rule set={F -> F-F++F-F}, axiom=F, order=3, step=3.5pt, angle=60}] (${ox.toFixed(2)}cm,${(oy + 1.1).toFixed(2)}cm) lindenmayer system;`
        );
      } else {
        if (!tikzLibraries.includes('automata')) tikzLibraries.push('automata');
        nativeTexLines.push(
          `  % Библиотека ядра PGF automata: конечный автомат ДКА`,
          `  \\node[state, initial] (q0) at (${(ox + 0.7).toFixed(2)}cm,${(oy + 1.35).toFixed(2)}cm) {$${s0}$};`,
          `  \\node[state] (q1) at (${(ox + 2.25).toFixed(2)}cm,${(oy + 1.35).toFixed(2)}cm) {$${s1}$};`,
          `  \\node[state, accepting] (q2) at (${(ox + 3.8).toFixed(2)}cm,${(oy + 1.35).toFixed(2)}cm) {$${s2}$};`,
          `  \\path[-{Stealth}] (q0) edge[bend left=20] node[above] {$${sym}$} (q1) (q1) edge[loop above] node {$1$} () (q1) edge node[above] {$0$} (q2);`
        );
      }

      canvasPrimitives.push(
        {
          tool: 'circle',
          values: {
            center_x: fmtCm(ox + 0.75),
            center_y: fmtCm(oy + 1.35),
            radius: '0.38cm',
            stroke_color: 'blue!75!black',
            stroke_width: 'thick',
          },
        },
        {
          tool: 'circle',
          values: {
            center_x: fmtCm(ox + 2.25),
            center_y: fmtCm(oy + 1.35),
            radius: '0.38cm',
            stroke_color: 'blue!75!black',
            stroke_width: 'thick',
          },
        },
        {
          tool: 'circle',
          values: {
            center_x: fmtCm(ox + 3.75),
            center_y: fmtCm(oy + 1.35),
            radius: '0.38cm',
            stroke_color: 'teal!80!black',
            stroke_width: 'very thick',
          },
        },
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(ox + 1.15),
            start_y: fmtCm(oy + 1.35),
            end_x: fmtCm(ox + 1.85),
            end_y: fmtCm(oy + 1.35),
            tip: 'Stealth',
          },
        },
        {
          tool: 'arrow',
          values: {
            start_x: fmtCm(ox + 2.65),
            start_y: fmtCm(oy + 1.35),
            end_x: fmtCm(ox + 3.35),
            end_y: fmtCm(oy + 1.35),
            tip: 'Stealth',
          },
        }
      );
      break;
    }
  }

  const preamblePreviewLines: string[] = [];
  for (const req of preambleRequirements) {
    if (req.pkg !== 'tikz') {
      preamblePreviewLines.push(
        req.options ? `\\usepackage[${req.options}]{${req.pkg}}` : `\\usepackage{${req.pkg}}`
      );
    }
    for (const setup of req.setupLines ?? []) {
      preamblePreviewLines.push(setup);
    }
  }
  if (tikzLibraries.length > 0) {
    preamblePreviewLines.push(`\\usetikzlibrary{${tikzLibraries.join(',')}}`);
  }

  return {
    extensionSpec: spec,
    presetSpec: preset,
    preambleRequirements,
    tikzLibraries,
    preamblePreviewLines,
    nativeTexLines,
    canvasPrimitives,
    engineWarningRu,
  };
}

/**
 * Ensures preamble packages (with optional [...] options & setup lines like \pgfplotsset / \usepgfplotslibrary)
 * and \usetikzlibrary{...} are present in the atomic `.tex` document without duplicating existing lines.
 */
export function ensureExtensionPreambleRequirements(
  source: string,
  requirements: ExtensionPreambleRequirement[],
  tikzLibraries: string[]
): { nextSource: string; addedEntries: string[] } {
  let cur = source;
  const addedEntries: string[] = [];
  const initInsp = inspectPreambleConnections(cur);
  if (!initInsp.hasBeginDocument) {
    return { nextSource: cur, addedEntries };
  }
  const eol = initInsp.lineEnding;

  for (const req of requirements) {
    if (req.pkg === 'tikz') continue;
    const insp = inspectPreambleConnections(cur);
    const alreadyHasPkg = insp.packages.some((p) => p.name === req.pkg);
    const linesToInject: string[] = [];

    if (!alreadyHasPkg) {
      const pkgLine = req.options
        ? `\\usepackage[${req.options}]{${req.pkg}}`
        : `\\usepackage{${req.pkg}}`;
      linesToInject.push(pkgLine);
      addedEntries.push(req.pkg);
    }

    const preSlice = cur.slice(0, insp.beginDocumentOffset);
    for (const setup of req.setupLines ?? []) {
      const keyPrefix = setup.startsWith('\\pgfplotsset') ? '\\pgfplotsset' : setup;
      if (!preSlice.includes(keyPrefix)) {
        linesToInject.push(setup);
      }
    }

    if (linesToInject.length > 0) {
      cur =
        cur.slice(0, insp.beginDocumentOffset) +
        linesToInject.join(eol) +
        eol +
        cur.slice(insp.beginDocumentOffset);
    }
  }

  for (const lib of tikzLibraries) {
    const insp = inspectPreambleConnections(cur);
    if (!insp.tikzLibraries.some((l) => l.name === lib)) {
      const connected = proposeLibraryConnect(cur, lib);
      if (connected.ok) {
        cur = connected.nextSource;
        addedEntries.push(lib);
      }
    }
  }

  return { nextSource: cur, addedEntries };
}

/**
 * Inserts a configured TikZ extension block into the atomic `.tex` document in one of 3 modes:
 * - 'hybrid': Preamble packages + idiomatic LaTeX block + interactive n1 canvas primitives
 * - 'native-tex': Preamble packages + pure LaTeX block only (zero % tikzarium:n1: lines)
 * - 'canvas-n1': Interactive n1 primitives only (zero external .sty package dependencies)
 */
export function insertTikzExtensionIntoSource(
  source: string,
  opts: ExtensionBuildOptions
): {
  ok: boolean;
  nextSource: string;
  insertedIds: number[];
  addedPreambleItems: string[];
  summaryRu: string;
} {
  if (!source.includes('\\end{tikzpicture}')) {
    return {
      ok: false,
      nextSource: source,
      insertedIds: [],
      addedPreambleItems: [],
      summaryRu: 'В буфере не найдено закрывающее окружение \\end{tikzpicture}.',
    };
  }

  const bundle = buildTikzExtensionBundle(opts);
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  let cur = source;
  let addedPreambleItems: string[] = [];

  if (opts.outputMode === 'hybrid' || opts.outputMode === 'native-tex') {
    const preRes = ensureExtensionPreambleRequirements(
      cur,
      bundle.preambleRequirements,
      bundle.tikzLibraries
    );
    cur = preRes.nextSource;
    addedPreambleItems = preRes.addedEntries;

    // Inject native extension LaTeX block immediately before \end{tikzpicture}
    const rawLines = cur.split(/\r?\n/);
    let closeIdx = -1;
    for (let i = rawLines.length - 1; i >= 0; i--) {
      if (rawLines[i].includes('\\end{tikzpicture}')) {
        closeIdx = i;
        break;
      }
    }
    if (closeIdx !== -1) {
      rawLines.splice(closeIdx, 0, ...bundle.nativeTexLines);
      cur = rawLines.join(eol);
    }
  } else {
    // Even in canvas-n1 mode, connect arrows.meta if arrow tips are emitted
    const insp = inspectPreambleConnections(cur);
    if (
      insp.hasBeginDocument &&
      bundle.canvasPrimitives.some((c) => c.tool === 'arrow') &&
      !insp.tikzLibraries.some((l) => l.name === 'arrows.meta')
    ) {
      const plan = proposeLibraryConnect(cur, 'arrows.meta');
      if (plan.ok) {
        cur = plan.nextSource;
        addedPreambleItems.push('arrows.meta');
      }
    }
  }

  const insertedIds: number[] = [];
  if (opts.outputMode === 'hybrid' || opts.outputMode === 'canvas-n1') {
    for (const seed of bundle.canvasPrimitives) {
      const ins = insertOwnedPrimitiveIntoSource(cur, seed.tool, seed.values);
      cur = ins.nextSource;
      insertedIds.push(ins.newId);
    }
  }

  const modeLabel =
    opts.outputMode === 'hybrid'
      ? 'код пакета + эскиз холста'
      : opts.outputMode === 'native-tex'
        ? 'чистый LaTeX пакета'
        : 'примитивы холста';
  const preSuffix =
    addedPreambleItems.length > 0
      ? ` · в преамбулу подключено: [${addedPreambleItems.join(', ')}]`
      : '';

  return {
    ok: true,
    nextSource: cur,
    insertedIds,
    addedPreambleItems,
    summaryRu: `Пакет «${bundle.extensionSpec.shortBadgeRu}» (${bundle.presetSpec.titleRu}): вставлен (${modeLabel})${preSuffix}.`,
  };
}

const EXTENSION_BODY_SIGNATURES: Record<TikzExtensionId, RegExp> = {
  pgfplots: /\\begin\{(axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis|groupplot)\}|\\addplot3?\b/,
  circuitikz: /\\begin\{circuitikz\}|\bto\[[RCLD]|op amp\b/,
  'tikz-cd': /\\begin\{tikzcd\}|\\ar\[/,
  chemfig: /\\chemfig\s*\{|\\schemestart\b|\\ce\{/,
  'tikz-3dplot': /\\tdplotsetmaincoords\b|tdplot_main_coords\b/,
  forest: /\\begin\{forest\}/,
  pgfgantt: /\\begin\{ganttchart\}|\\ganttbar\b/,
  quantikz: /\\begin\{quantikz\}|\\qw\b|\\ctrl\{/,
  'tkz-euclide': /\\tkzDefPoint\b|\\tkzDrawPolygon\b|\\tkzMarkRightAngle\b/,
  'tikz-timing': /\\begin\{tikztimingtable\}|\\texttiming\b/,
  'tikz-optics': /\buse optics\b|\\usetikzlibrary\{[^}]*\boptics\b/,
  'pgf-core-suites': /\\usetikzlibrary\{[^}]*\b(automata|mindmap|trees|er|petri|spy)\b/,
};

/**
 * Detects which of the 12 TikZ extension packages are currently loaded in the preamble
 * or actively used inside the figure body (including pure native-tex figures with 0 n1 primitives).
 */
export function detectActiveExtensionsInSource(source: string): TikzExtensionPackageSpec[] {
  const insp = inspectPreambleConnections(source);
  const loadedPkgs = new Set(insp.packages.map((p) => p.name));
  const loadedLibs = new Set(insp.tikzLibraries.map((l) => l.name));

  return TIKZ_EXTENSION_PACKAGES.filter((spec) => {
    if (spec.id === 'tikz-optics') {
      return loadedLibs.has('optics') || EXTENSION_BODY_SIGNATURES['tikz-optics'].test(source);
    }
    if (spec.id === 'pgf-core-suites') {
      return (
        ['automata', 'mindmap', 'spy', 'er', 'petri'].some((lib) => loadedLibs.has(lib)) ||
        EXTENSION_BODY_SIGNATURES['pgf-core-suites'].test(source)
      );
    }
    if (loadedPkgs.has(spec.packageName)) {
      return true;
    }
    return EXTENSION_BODY_SIGNATURES[spec.id].test(source);
  });
}

