export type ImplementationStatus = 'implemented' | 'partial' | 'proposal';

export type RustUpstreamStatus = 'rust-main' | 'rust-pr-190' | 'rust-proposal';

export type LedgerGroupId =
  | 'core-acceptance'
  | 'roadmap-stages'
  | 'ux-audit'
  | 'sci142-reqs'
  | 'ai88-packages-libs'
  | 'ai88-cases'
  | 'studio-fe'
  | 'egui-blueprints'
  | 'modernization-20';

export type LedgerEntryKind = 'REQ' | 'ROADMAP' | 'FE' | 'BLUEPRINT' | 'REFACTOR';

export interface LedgerEntry {
  id: string;
  group: LedgerGroupId;
  kind: LedgerEntryKind;
  titleRu: string;
  studioStatus: ImplementationStatus;
  rustStatus: RustUpstreamStatus;
  noteRu: string;
}

export interface ModernizationTaskSpec {
  id: string;
  trackRu: string;
  priority: 'P0' | 'P1' | 'P2';
  studioStatus: ImplementationStatus;
  titleRu: string;
  problemRu: string;
  scopeAndActionRu: string;
  statusNoteRu: string;
  relatedIds: string[];
}

export const LEDGER_GROUP_LABELS: Record<LedgerGroupId, string> = {
  'core-acceptance': '1. Базовые контракты, гейты приёмки и платформы (CORE / U-G / T / W / R)',
  'roadmap-stages': '2. Продуктовый Roadmap SCIENCE_FIRST_DATA_LAST (ST-SCI … ST-DATA)',
  'ux-audit': '3. Критический UX-аудит (UX-F01 … UX-F14)',
  'sci142-reqs': '4. Нормативные требования корпуса Scientific-142 R4 (103 требования SC-*)',
  'ai88-packages-libs': '5. Каталог AI88: 35 специализированных пакетов и 23 библиотеки TikZ',
  'ai88-cases': '6. Ведомость AI88: все 88 предметных сценариев (#01 … #88)',
  'studio-fe': '7. Функциональные элементы (FE) TikZarium Studio (N1, P01–P80, E01–E08, F01–F16, EXT, PDF, API)',
  'egui-blueprints': '8. Эталонные чертежи переноса в нативный Rust / egui 0.33.3 (25 модулей)',
  'modernization-20': '9. Предложенный план модернизации и рефакторинга (MOD-01 … MOD-20)',
};

export const IMPLEMENTATION_STATUS_LABELS: Record<ImplementationStatus, string> = {
  implemented: 'РЕАЛИЗОВАНО',
  partial: 'ЧАСТИЧНО (СТЕНД / ПОДМНОЖЕСТВО)',
  proposal: 'ОПИСАНИЕ-ПРЕДЛОЖЕНИЕ',
};

export const RUST_STATUS_LABELS: Record<RustUpstreamStatus, string> = {
  'rust-main': 'Реализовано в Rust main',
  'rust-pr-190': 'Открыт PR #190 (CI 23/23)',
  'rust-proposal': 'Описание-предложение (не в Rust)',
};

export const MODERNIZATION_TASKS_20: ModernizationTaskSpec[] = [
  {
    id: 'MOD-01',
    trackRu: 'I. Декомпозиция монолитов и архитектура состояния',
    priority: 'P0',
    studioStatus: 'proposal',
    titleRu: 'Декомпозиция God-компонента App.tsx (4 412 строк, 48+ useState) на DocumentSessionStore',
    problemRu:
      'Корневой App.tsx концентрирует историю ревизий, выборку фигур, триаду статусов сборки/PDF, роутинг модальных окон и синхронизацию настроек в одном компоненте.',
    scopeAndActionRu:
      'Выделить детерминированный редьюсер транзакций документа (SourceTransactionStore) и изолированные хуки сессии/сборки/раскладки, синхронные со StudioControlEngine.',
    statusNoteRu: 'Запланировано на Волну 2 (выделение стора транзакций из App.tsx).',
    relatedIds: ['CORE-03', 'U-G1', 'API-V2'],
  },
  {
    id: 'MOD-02',
    trackRu: 'I. Декомпозиция монолитов и архитектура состояния',
    priority: 'P0',
    studioStatus: 'partial',
    titleRu: 'Консолидация 6 дублирующих модальных «комбайнов» и ленивое разделение чанков React.lazy',
    problemRu:
      'Рядом со StudioWorkshopsHubModal живут 5 вторичных модальных окон с пересечением маршрутов PGFPlots и статической загрузкой в начальный бандл.',
    scopeAndActionRu:
      'Вынести 5 вторичных модальных комбайнов в асинхронные чанки React.lazy + условный рендер и перенаправить пересекающийся маршрут PGFPlots напрямую в StudioWorkshopsHubModal.',
    statusNoteRu: 'Частично реализовано в Волне 1: внедрён React.lazy + Suspense для 5 вторичных модалок и консолидирован роутинг PGFPlots; полное слияние вкладок — Волна 2.',
    relatedIds: ['E02', 'E07', 'EXT-01', 'EXT-02'],
  },
  {
    id: 'MOD-03',
    trackRu: 'I. Декомпозиция монолитов и архитектура состояния',
    priority: 'P1',
    studioStatus: 'proposal',
    titleRu: 'Модульное разбиение CanvasStage, TexSourceEditor и InspectorAndHelpPane на подмодули',
    problemRu:
      'Три ключевые панели рабочей студии превышают 2 000–4 000 строк каждая, смешивая геометрию, ввод указателя, парсинг и отображение карточек.',
    scopeAndActionRu:
      'Разделить каждую панель на компактные подмодули (<450 строк): рендерер фигур, слой CAD-ручек/привязок и линеек для холста; сплиттер преамбулы и подсветка для редактора; свойства и F1 для инспектора.',
    statusNoteRu: 'Запланировано на Волну 2 после стабилизации палитры пакетов и PDF-подложки.',
    relatedIds: ['E01', 'E03', 'UX-F07', 'UX-F08'],
  },
  {
    id: 'MOD-04',
    trackRu: 'I. Декомпозиция монолитов и архитектура состояния',
    priority: 'P0',
    studioStatus: 'implemented',
    titleRu: 'Единый ревизионный контракт SourcePatch с проверкой дайджеста и обратимым патчем Undo',
    problemRu:
      'Часть генераторов модифицировала исходник без атомарного байтового/диапазонного патча с проверкой старого текста, дайджеста ревизии и сохранением CRLF/LF.',
    scopeAndActionRu:
      'Ввести единый модуль sourcePatchEngine.ts (applyCheckedSourcePatch, applyCheckedLineRangePatch, expectedDigest, inversePatch, byteDelta) в соответствии с SC-SRC-005…008.',
    statusNoteRu: 'Реализовано в src/domain/sourcePatchEngine.ts и используется всеми операциями packageCanvasSemantics.ts.',
    relatedIds: ['SC-SRC-005', 'SC-SRC-006', 'SC-SRC-008', 'CORE-03'],
  },
  {
    id: 'MOD-05',
    trackRu: 'II. Выравнивание с продуктовым Roadmap SCIENCE_FIRST_DATA_LAST',
    priority: 'P0',
    studioStatus: 'implemented',
    titleRu: 'Продуктовое гейтирование этапов ST-SCI → ST-UML → ST-BPMN → ST-ENG → ST-CHEMBIO → ST-ANIM → ST-OTHER → ST-DATA',
    problemRu:
      'В витрине «Мастерских» аналитические инструменты ST-DATA стояли без явной маркировки очереди рядом с базовой научной графикой ST-SCI.',
    scopeAndActionRu:
      'Ввести явную маркировку ROADMAP_STAGE_META во всех инструментах холста, Инспекторе и StudioWorkshopsHubModal с приоритетом 1. Наука (ST-SCI) и выносом 8. Статистика (ST-DATA) в конец очереди.',
    statusNoteRu: 'Реализовано в packageCanvasSemantics.ts, StudioWorkshopsHubModal.tsx и InspectorAndHelpPane.tsx.',
    relatedIds: ['ST-SCI', 'ST-DATA', 'P19', 'P35', 'F16'],
  },
  {
    id: 'MOD-06',
    trackRu: 'II. Выравнивание с продуктовым Roadmap SCIENCE_FIRST_DATA_LAST',
    priority: 'P0',
    studioStatus: 'implemented',
    titleRu: 'Прямое распознавание и рисование идиоматического TikZ/пакетов без комментариев % tikzarium:n1:<hex>',
    problemRu:
      'Интерактивные ручки холста ранее работали только для строк с hex-маркером % tikzarium:n1:, тогда как чистый авторский код TikZ оставался неинтерактивным до ручного усыновления.',
    scopeAndActionRu:
      'Реализовать прямой позиционный распознаватель и мутатор parseScenePackageObjects для чистых команд \\draw, \\node, rectangle, circle, цепей, автоматов, оптики и chemfig без записи % tikzarium:n1:.',
    statusNoteRu: 'Реализовано в src/domain/packageCanvasSemantics.ts, CanvasStage.tsx, InspectorAndHelpPane.tsx и JSONL API package_canvas.*.',
    relatedIds: ['SC-SRC-001', 'SC-SRC-002', 'SC-PATH-001', 'UX-F02', 'P12'],
  },
  {
    id: 'MOD-07',
    trackRu: 'II. Выравнивание с продуктовым Roadmap SCIENCE_FIRST_DATA_LAST',
    priority: 'P0',
    studioStatus: 'implemented',
    titleRu: 'Двусторонний адаптер PGFPlots SC3/AT4 для существующих окружений \\begin{axis} и серий \\addplot',
    problemRu:
      'Прежние модули генерировали шаблонный блок axis, но не читали и не патчили точечно произвольный существующий \\begin{axis} прямо с холста и из Инспектора.',
    scopeAndActionRu:
      'Реализовать распознавание и точечный SourcePatch ключей title, xlabel, ylabel, xmin/xmax/ymin/ymax, grid и серий \\addplot с отрисовкой на холсте и сохранением неизвестных pgfkeys.',
    statusNoteRu: 'Реализовано в packageCanvasSemantics.ts (инструменты pkg:pgfplots-axis / pkg:pgfplots-curve + карточка Инспектора).',
    relatedIds: ['SC-PLOT-001', 'SC-PLOT-003', 'SC-PLOT-010', 'P27', 'EXT-01'],
  },
  {
    id: 'MOD-08',
    trackRu: 'II. Выравнивание с продуктовым Roadmap SCIENCE_FIRST_DATA_LAST',
    priority: 'P1',
    studioStatus: 'implemented',
    titleRu: 'Полное покрытие всех 23 библиотек и 35 специализированных пакетов ведомости AI88 в едином каталоге',
    problemRu:
      'В TIKZ_LIBRARIES ранее было описано 10 из 23 нормативных библиотек AI88.',
    scopeAndActionRu:
      'Добавить все 23 библиотеки AI88 в TIKZ_LIBRARIES (angles, backgrounds, circuits.ee.IEC, decorations.*, graphs, intersections, matrix, mindmap, optics, quantikz2, quotes, shapes.callouts, shapes.gates.logic.US) с матрицей 5 статусов и преамбулой, сохранив поимённый учёт всех 35 пакетов AI88.',
    statusNoteRu: 'Реализовано в src/domain/catalog.ts (23 библиотеки) и requirementsLedger.ts (35 пакетов + 23 библиотеки).',
    relatedIds: ['SC-PKG-001', 'UX-F14', 'AI88-LIB-01', 'AI88-PKG-01'],
  },
  {
    id: 'MOD-09',
    trackRu: 'III. Реальный сборочный контур, зависимости и производительность (U-G3)',
    priority: 'P0',
    studioStatus: 'partial',
    titleRu: 'Серверный конвейер рендеринга реального PDF и живой PDF-подложки 144 DPI (XeLaTeX / Ghostscript 9.55)',
    problemRu:
      'Веб-стенд ранее опирался только на клиентскую SVG-проекцию листа без генерации настоящего бинарного документа PDF и растровой подложки.',
    scopeAndActionRu:
      'Добавить серверный маршрут POST /api/render/pdf-underlay с вызовом xelatex -no-shell-escape при наличии в ОС и честной компиляцией реального PDF + PNG 144 DPI через системный Ghostscript 9.55 при отсутствии TeX Live.',
    statusNoteRu: 'Частично реализовано: сервер генерирует реальный PDF и калиброванную PNG-подложку 1:1 через Ghostscript 9.55 (и автоматически переключается на внешний xelatex при наличии в PATH).',
    relatedIds: ['CORE-02', 'SC-BUILD-001', 'SC-BUILD-002', 'SC-BUILD-007'],
  },
  {
    id: 'MOD-10',
    trackRu: 'III. Реальный сборочный контур, зависимости и производительность (U-G3)',
    priority: 'P0',
    studioStatus: 'partial',
    titleRu: 'Оконная виртуализация строк редактора и вынос лексера/диагностики в Web Worker под бюджет U-G3',
    problemRu:
      'Полный рендер тысяч строк подсветки в DOM снижал отзывчивость на крупных файлах .tex.',
    scopeAndActionRu:
      'Внедрить оконную виртуализацию видимого диапазона строк (VIRTUAL_WINDOW_SIZE = 180 для буферов > 240 строк) в TexSourceEditor и подготовить вынос лексера в фоновый Worker.',
    statusNoteRu: 'Частично реализовано: оконная виртуализация строк без inline-стилей внедрена в TexSourceEditor.tsx; вынос токенизатора в Worker — Волна 2.',
    relatedIds: ['U-G3', 'SC-PERF-001', 'SC-PLOT-012', 'UX-F01'],
  },
  {
    id: 'MOD-11',
    trackRu: 'III. Реальный сборочный контур, зависимости и производительность (U-G3)',
    priority: 'P1',
    studioStatus: 'partial',
    titleRu: 'Аудитор внешних файловых зависимостей (.dat, .csv, \\input) с защитой контейнмента SC-DATA',
    problemRu:
      'Ссылки на внешние таблицы \\addplot table{...}, plot file{...} и \\input{...} в коде рисунка не сверялись автоматически с паспортом ресурсов и правилом запрета ../ (SC-DATA-004/007).',
    scopeAndActionRu:
      'Реализовать парсер inspectDataFileDependencies с проверкой обхода путей ../ и абсолютных путей, сверкой с паспортом образца и выводом в Инспекторе.',
    statusNoteRu: 'Частично реализовано: статический аудитор путей и карточка SC-DATA внедрены в packageCanvasSemantics.ts и InspectorAndHelpPane.tsx; чтение .fls на диске — в Rust core.',
    relatedIds: ['SC-DATA-001', 'SC-DATA-003', 'SC-DATA-007', 'SC-UI-007'],
  },
  {
    id: 'MOD-12',
    trackRu: 'III. Реальный сборочный контур, зависимости и производительность (U-G3)',
    priority: 'P2',
    studioStatus: 'proposal',
    titleRu: 'Версионированная additive-схема пользовательских настроек WorkspacePreferencesV2 с безопасным откатом',
    problemRu:
      'Настройки разбросаны между несколькими ключами localStorage, а часть параметров сбрасывается при перезагрузке.',
    scopeAndActionRu:
      'Объединить локальные предпочтения в версионированную схему с обратной совместимостью, проверкой границ значений и кнопкой полного сброса оболочки без изменения файлов .tex.',
    statusNoteRu: 'Описание-предложение для Волны 2.',
    relatedIds: ['P20', 'P49', 'E08', 'UX-F12'],
  },
  {
    id: 'MOD-13',
    trackRu: 'IV. Эргономика рабочего цикла, навигации и доступности (UX4 / U-G5)',
    priority: 'P1',
    studioStatus: 'implemented',
    titleRu: 'Компактная двухвкладочная структура Инспектора («Объект · Диагностика и F1») со сворачиваемыми секциями',
    problemRu:
      'На экране 1366×768 правая колонка ранее выстраивала в одну длинную ленту геометрию, стили, диагностику и справку F1.',
    scopeAndActionRu:
      'Разделить Инспектор на две быстрые вкладки («Объект» и «Диагностика · F1») со сворачиваемыми панелями, карточкой семантики пакета, единственной кнопкой «Применить» и сохранением черновика draft при чтении F1.',
    statusNoteRu: 'Реализовано в src/components/InspectorAndHelpPane.tsx.',
    relatedIds: ['UX-F07', 'UX-F08', 'T4', 'SC-UI-001'],
  },
  {
    id: 'MOD-14',
    trackRu: 'IV. Эргономика рабочего цикла, навигации и доступности (UX4 / U-G5)',
    priority: 'P1',
    studioStatus: 'partial',
    titleRu: 'Иерархическое «Дерево фигуры» (Figure Explorer) и навигатор коллекций SCI142 / AI88',
    problemRu:
      'Сложные чертежи со слоями scope / pgfonlayer, окружениями axis и объектами пакетов требовали ручного поиска строк в редакторе.',
    scopeAndActionRu:
      'Встроить в Инспектор иерархическое «Дерево фигуры» (buildFigureStructureTree: scope, pgfonlayer, axis, объекты пакетов, примитивы n1) с переходом в 1 клик и подготовить поисковый браузер 88/142 кейсов.',
    statusNoteRu: 'Частично реализовано: иерархическое Дерево фигуры работает в InspectorAndHelpPane.tsx; полнотекстовый браузер всех 142+88 внешних фикстур — Волна 2.',
    relatedIds: ['T8', 'SC-QA-001', 'AI88-CASE-01'],
  },
  {
    id: 'MOD-15',
    trackRu: 'IV. Эргономика рабочего цикла, навигации и доступности (UX4 / U-G5)',
    priority: 'P1',
    studioStatus: 'proposal',
    titleRu: 'Единая оболочка доступности диалогов <StudioModalShell> (Focus Trap, возврат фокуса, IME-композиция)',
    problemRu:
      'Модальные окна свёрстаны индивидуально без удержания цикла Tab внутри открытого диалога и без общей обёртки IME.',
    scopeAndActionRu:
      'Выделить общий компонент модального окна с Focus Trap, возвратом фокуса на триггер при закрытии по Esc и обработкой compositionstart/compositionend (гейт U-G5).',
    statusNoteRu: 'Описание-предложение для Волны 2.',
    relatedIds: ['U-G5', 'UX-F13', 'ERG-03'],
  },
  {
    id: 'MOD-16',
    trackRu: 'IV. Эргономика рабочего цикла, навигации и доступности (UX4 / U-G5)',
    priority: 'P2',
    studioStatus: 'proposal',
    titleRu: 'Переключатель эталонных рамок приёмки 1024×640, 1180×680, 1366×768 и 1920×1080 (125%–200% DPI)',
    problemRu:
      'При ручной проверке адаптивности требуется быстрый самоконтроль габаритов под нормативные разрешения U-G5.',
    scopeAndActionRu:
      'Ввести адаптивный overflow-контейнер для узких окон (<1200px) и добавить в стенд переключатель эталонных рамок вьюпорта.',
    statusNoteRu: 'Описание-предложение для Волны 2.',
    relatedIds: ['U-G5', 'UX-F12', 'SC-UI-001'],
  },
  {
    id: 'MOD-17',
    trackRu: 'V. Мультидвижковый контракт, мост к нативному Rust и трассируемость',
    priority: 'P1',
    studioStatus: 'implemented',
    titleRu: 'Унифицированный интерфейс профилей компиляции EngineAdapter (XeLaTeX / Ghostscript → Asymptote → Typst/CeTZ)',
    problemRu:
      'Вызовы проверки компилятора и рендера PDF ранее не были выделены в типизированный мультидвижковый адаптер.',
    scopeAndActionRu:
      'Выделить контракт EngineAdapter и createBrowserEngineAdapter в sourcePatchEngine.ts (detectCapabilities, renderPdfUnderlay, EngineProfileId) с сохранением приоритета XeLaTeX.',
    statusNoteRu: 'Реализовано в src/domain/sourcePatchEngine.ts и подключено в App.tsx.',
    relatedIds: ['ST-SCI', 'SCI-05', 'ME-L1-L4'],
  },
  {
    id: 'MOD-18',
    trackRu: 'V. Мультидвижковый контракт, мост к нативному Rust и трассируемость',
    priority: 'P2',
    studioStatus: 'proposal',
    titleRu: 'Преобразование текстовых карточек EguiNativeBlueprintView в проверяемые артефакты синхронизации с Rust',
    problemRu:
      '25 карточек Rust-кода в EguiNativeBlueprintView хранятся как строковые литералы внутри TSX-компонента.',
    scopeAndActionRu:
      'Вынести Rust-чертежи в структурированный каталог миграционных модулей с явной привязкой к целевым файлам крейтов и проверкой rustfmt.',
    statusNoteRu: 'Описание-предложение для Волны 3.',
    relatedIds: ['EGUI-BP-01', 'API-V2', 'GH-02'],
  },
  {
    id: 'MOD-19',
    trackRu: 'V. Мультидвижковый контракт, мост к нативному Rust и трассируемость',
    priority: 'P1',
    studioStatus: 'proposal',
    titleRu: 'Генеративное (Property-Based) тестирование целостности .tex и автоматические сценарии задач T0–T8',
    problemRu:
      'Модульные тесты проверяют детерминированные фикстуры, но ещё не генерируют тысячи случайных комбинаций \\verb|%|, verbatim и смешанных CRLF/LF.',
    scopeAndActionRu:
      'Добавить генеративный фаззинг инварианта побайтовой сохранности исходника (U-G1, SC-SRC-003/009) и сквозные сценарные тесты маршрутов T0–T8.',
    statusNoteRu: 'Описание-предложение для Волны 2/3.',
    relatedIds: ['U-G1', 'SC-SRC-003', 'SC-SRC-009', 'T0'],
  },
  {
    id: 'MOD-20',
    trackRu: 'V. Мультидвижковый контракт, мост к нативному Rust и трассируемость',
    priority: 'P1',
    studioStatus: 'implemented',
    titleRu: 'Автоматический CI-гейт трассируемости требований и планов (Requirements, FE & Insights Traceability Gate)',
    problemRu:
      'При развитии функциональности markdown-документы в репозитории могут расходиться с исходным кодом и тестами.',
    scopeAndActionRu:
      'Связать docs/REQUIREMENTS_AND_FE_LEDGER_RU.md и docs/INSIGHTS_AND_PLANS_RU.md автотестами побайтовой синхронизации и проверки уникальности всех ID.',
    statusNoteRu: 'Реализовано в requirementsLedger.test.ts и packageCanvasSemantics.test.ts.',
    relatedIds: ['SC-QA-012', 'CORE-08'],
  },
];

type RawTuple = [
  id: string,
  group: LedgerGroupId,
  kind: LedgerEntryKind,
  titleRu: string,
  studioStatus: ImplementationStatus,
  rustStatus: RustUpstreamStatus,
  noteRu: string,
];

const CORE_AND_GATES_ROWS: RawTuple[] = [
  ['CORE-01', 'core-acceptance', 'REQ', 'Авторитетный обычный UTF-8 .tex/.tikz без проприетарного формата документа', 'implemented', 'rust-main', 'Обычный текстовый буфер .tex в редакторе и экспорте'],
  ['CORE-02', 'core-acceptance', 'REQ', 'Точный PDF строится только внешним XeLaTeX без скрытой подмены компилятора и без -shell-escape', 'partial', 'rust-main', 'Сервер /api/render/pdf-underlay вызывает внешний xelatex -no-shell-escape при наличии в ОС, иначе строит калиброванный PDF через системный Ghostscript 9.55'],
  ['CORE-03', 'core-acceptance', 'REQ', 'Минимальный ревизионно-проверяемый патч исходника (SourcePatch) и обратимый Undo/Redo', 'implemented', 'rust-main', 'Контракт sourcePatchEngine.ts, защита устаревшей ревизии в Control API и стек Undo/Redo'],
  ['CORE-04', 'core-acceptance', 'REQ', 'Шесть базовых нативных генераторов каталога C (line, arrow, rectangle, circle, node, cubic)', 'implemented', 'rust-main', 'Полная реализация на холсте, в инспекторе и JSONL API'],
  ['CORE-05', 'core-acceptance', 'REQ', 'Пять независимых статусов библиотеки/пакета (установлен, подключён, движок, GUI-адаптер, справка F1)', 'implemented', 'rust-main', 'Таблица 23 библиотек в «Пакеты и библиотеки» и getLibraryFiveStatuses'],
  ['CORE-06', 'core-acceptance', 'REQ', 'Сохранение неизвестных макросов автора, комментариев, пробелов и переводов строк LF/CRLF', 'implemented', 'rust-main', 'Проверено модульными тестами целостности UTF-8 и CRLF'],
  ['CORE-07', 'core-acceptance', 'REQ', 'Отсутствие обязательного аккаунта, облака, телеметрии и скрытой доустановки пакетов TeX', 'implemented', 'rust-main', 'Локальная работа без телеметрии; GitHub OAuth строго опционален для PR'],
  ['CORE-08', 'core-acceptance', 'REQ', 'Запрет хранения и перераспределения чужих массивных PDF-руководств и бинарных шрифтов в Git', 'implemented', 'rust-pr-190', 'Хранится только компактный JSON-индекс прямых точек + локальный поиск kpsewhich'],
  ['U-G1', 'core-acceptance', 'REQ', 'Гейт U-G1 (Source Contract): побайтовая сохранность UTF-8/CRLF/макросов при смене темы, кегля и переноса', 'implemented', 'rust-main', 'Токенизатор и визуальные режимы не мутируют исходник'],
  ['U-G2', 'core-acceptance', 'REQ', 'Гейт U-G2 (Native Editor): подсветка в редактируемом буфере, номера строк, Поиск/Замена, Go to line, хоткеи', 'implemented', 'rust-proposal', 'Реализовано в TexSourceEditor стенда; перенос в нативный egui::TextEdit в очереди UX1'],
  ['U-G3', 'core-acceptance', 'REQ', 'Гейт U-G3 (Performance): 10 000 строк / 1 МБ p95 ≤ 50 мс, первый кадр ≤ 2 с; стресс 100k строк / 10 МБ', 'partial', 'rust-proposal', 'Оконная виртуализация строк внедрена в TexSourceEditor (MOD-10); вынос в Worker и физический стенд 100k строк впереди'],
  ['U-G4', 'core-acceptance', 'REQ', 'Гейт U-G4 (Workflow): полный маршрут Новый → 6 фигур → Инспектор/Undo → Сборка → Ошибка → Исправление → Экспорт', 'partial', 'rust-proposal', 'Маршрут работает в стенде (с симуляцией PDF) и требует физической приёмки с реальным XeLaTeX'],
  ['U-G5', 'core-acceptance', 'REQ', 'Гейт U-G5 (Accessibility & Scale): Tab/Shift+Tab, focus-visible, 96/120/192 DPI, 1180×680..1920×1080, IME', 'partial', 'rust-proposal', 'Контуры focus-visible и роли кнопок внедрены; физический мультимониторный DPI и IME не замерялись'],
  ['U-G6', 'core-acceptance', 'REQ', 'Гейт U-G6 (Distribution): финальный portable ZIP точного SHA, MANIFEST.sha256, проверка шрифтов MiKTeX и откат', 'proposal', 'rust-main', 'Сборка архива есть в CI Rust, но финальный физический релиз Win10 имеет статус NO-GO'],
  ['T0', 'core-acceptance', 'REQ', 'Пилотная задача T0 (5 человек): открыть пример, выбрать папку и получить первый PDF ≤ 120 с без ручного пути', 'proposal', 'rust-proposal', 'Целевая пользовательская метрика (NOT_MEASURED на 5 реальных участниках)'],
  ['T1', 'core-acceptance', 'REQ', 'Пилотная задача T1 (5 человек): найти и изменить цвет/число среди 6 команд с метаданными ≤ 60 с', 'proposal', 'rust-proposal', 'Целевая пользовательская метрика (NOT_MEASURED)'],
  ['T2', 'core-acceptance', 'REQ', 'Пилотная задача T2 (5 человек): найти текст, перейти к строке, заменить одно совпадение и выполнить Undo', 'proposal', 'rust-proposal', 'Инструменты реализованы в UI, но пилот на 5 людях не проводился (NOT_MEASURED)'],
  ['T3', 'core-acceptance', 'REQ', 'Пилотная задача T3 (5 человек): найти окружность и кривую Безье ≤ 10 с и нарисовать жест', 'proposal', 'rust-proposal', 'Инструменты вынесены в прямой рельс; пилотный замер на людях NOT_MEASURED'],
  ['T4', 'core-acceptance', 'REQ', 'Пилотная задача T4 (5 человек): изменить радиус/координату, нажать Применить, проверить сохранность draft при F1', 'proposal', 'rust-proposal', 'Механизм реализован; пилотный замер на 5 людях NOT_MEASURED'],
  ['T5', 'core-acceptance', 'REQ', 'Пилотная задача T5 (5 человек): исправить намеренную ошибку TeX по диагностике ≤ 30 с', 'proposal', 'rust-proposal', 'Клик к строке и Quick Fix реализованы; пилот на людях NOT_MEASURED'],
  ['T6', 'core-acceptance', 'REQ', 'Пилотная задача T6 (5 человек): безошибочно отличить актуальный PDF от устаревшего после правки/ошибки', 'proposal', 'rust-proposal', 'Триада статусов с ревизиями реализована; пилот на людях NOT_MEASURED'],
  ['T7', 'core-acceptance', 'REQ', 'Пилотная задача T7 (5 человек): отменить диалог сохранения и длительную сборку без зависания и потери кода', 'proposal', 'rust-proposal', 'Кнопка Стоп в стенде работает; реальный обрыв процесса XeLaTeX на людях NOT_MEASURED'],
  ['T8', 'core-acceptance', 'REQ', 'Пилотная задача T8 (5 человек): найти заданный пример в 88-case Figure Explorer без знания имени файла', 'proposal', 'rust-proposal', 'Описание-предложение: полноценный 88-case Explorer запланирован в MOD-14'],
  ['W0-W1', 'core-acceptance', 'REQ', 'Гейты Windows W0 / W1: нативная сборка PE Subsystem 2/3, манифесты SHA256 и базовый аудит на текущем main', 'proposal', 'rust-main', 'Выполнено в CI основного Rust-репозитория (W0/W1 PASS)'],
  ['W2a', 'core-acceptance', 'REQ', 'Гейт Windows W2a: реальный HWND на Windows Server при 125% DPI (1475×850 px) и проверка F1', 'proposal', 'rust-main', 'Подтверждено в upstream CI (W2a PASS)'],
  ['W2b', 'core-acceptance', 'REQ', 'Гейт Windows W2b: физические 6 жестов мыши, Save/Open, IME и связка GUI → MiKTeX XeLaTeX на стенде', 'proposal', 'rust-proposal', 'Статус в upstream: NOT_RUN (описание приёмочного испытания)'],
  ['W3-W4', 'core-acceptance', 'REQ', 'Гейты Windows W3 / W4: независимая приёмка на физической Windows 10 Pro и разрешение стабильного выпуска', 'proposal', 'rust-proposal', 'Статус в upstream: NOT_RUN / NO-GO'],
  ['R1-R3', 'core-acceptance', 'REQ', 'Гейты Linux R1–R3: безопасное закрытие, границы при 200% DPI и системные диалоги GTK/XDG Open/Save/Export', 'proposal', 'rust-main', 'Принято в upstream для кандидата 1.0.0-rc.1 на X11'],
  ['R4-R5', 'core-acceptance', 'REQ', 'Гейты Linux R4–R5: физическая приёмка на десктопе Ubuntu 24.04 x86_64 X11 и финальный релиз', 'proposal', 'rust-proposal', 'Статус в upstream: NOT_RUN'],
  ['ME-L1-L4', 'core-acceptance', 'REQ', 'Матрица уровней многодвижковой интеграции ME-L1 (просмотр) … ME-L4 (двусторонний проверенный subset)', 'partial', 'rust-proposal', 'Нормативная шкала зрелости из PRODUCT_SPEC §6'],
  ['SCI-L0-L4', 'core-acceptance', 'REQ', 'Уровни приёмки корпуса SCI142: L0 (реестр) → L1 (XeLaTeX PDF) → L2 (распознавание) → L3 (GUI edit+Undo) → L4 (инвариант)', 'proposal', 'rust-proposal', 'Нормативная шкала приёмки 142 научных фигур'],
  ['AI-S0-S4', 'core-acceptance', 'REQ', 'Уровни приёмки ведомости AI88: S0 (каталог) → S1 (сборка) → S2 (диагностика/зависимости) → S3 (GUI SourcePatch) → S4 (верификация)', 'proposal', 'rust-proposal', 'Нормативная шкала приёмки 88 предметных сценариев'],
];

const ROADMAP_ROWS: RawTuple[] = [
  ['ST-SCI', 'roadmap-stages', 'ROADMAP', 'Приоритет №1: Научная графика, математика, статическая 2D/3D-графика (TikZ, PGFPlots, Asymptote, Typst/CeTZ)', 'partial', 'rust-proposal', 'Текущий главный продуктовый фокус; ядро TikZ/расширений в стенде есть, полная приёмка SCI142/Asymptote/Typst впереди'],
  ['SCI-01', 'roadmap-stages', 'ROADMAP', 'Маршрут ST-SCI / шаг 1: актуализация управляющего API и базовых контрактов F1 / Undo / Source / Build на свежем main', 'implemented', 'rust-pr-190', 'Реализовано в StudioControlEngine и открыто в PR #190 (23/23 CI green)'],
  ['SCI-02', 'roadmap-stages', 'ROADMAP', 'Маршрут ST-SCI / шаг 2: дизайн-система (4 темы), компактный Инспектор с единственным Apply и научная рабочая область', 'implemented', 'rust-proposal', 'Реализовано в веб-стенде (4 темы Light/Paper/Dark/Midnight, триада статусов, сплиттеры)'],
  ['SCI-03', 'roadmap-stages', 'ROADMAP', 'Маршрут ST-SCI / шаг 3: производительность редактора G3 (10k/100k строк) и общий контракт сборки вокруг XeLaTeX', 'partial', 'rust-main', 'Контракт сборки есть в tikzarium-core; гейт G3 на 100k строк остаётся задачей MOD-10'],
  ['SCI-04', 'roadmap-stages', 'ROADMAP', 'Маршрут ST-SCI / шаг 4: общие контракты SC1–SC2 и единый адаптер PGFPlots SC3/AT4 + геометрия SC4–SC6', 'partial', 'rust-proposal', 'Генераторы есть, но двустороннее распознавание произвольного PGFPlots без маркеров n1 — задача MOD-06/MOD-07'],
  ['SCI-05', 'roadmap-stages', 'ROADMAP', 'Маршрут ST-SCI / шаг 5: вертикаль Asymptote, затем профиль Typst/CeTZ и ограниченный кандидат Penrose', 'proposal', 'rust-proposal', 'Описание-предложение в Roadmap: реализация новых движков ещё не начиналась'],
  ['SCI-QA', 'roadmap-stages', 'ROADMAP', 'Маршрут ST-SCI / QA: независимая приёмка корпусов SCI142 и научных AI88 на физической Windows 10 (100/125/200% DPI)', 'proposal', 'rust-proposal', 'Описание-предложение приёмочного этапа; физический прогон впереди'],
  ['ST-UML', 'roadmap-stages', 'ROADMAP', 'Приоритет №2: UML — структурные и поведенческие диаграммы (кандидаты TikZ-UML, PlantUML)', 'proposal', 'rust-proposal', 'Описание-предложение (QUEUED_BY_PRIORITY после ST-SCI)'],
  ['ST-BPMN', 'roadmap-stages', 'ROADMAP', 'Приоритет №3: BPMN — моделирование процессов с нативным .bpmn/XML (кандидат bpmn-js, до инженерии)', 'proposal', 'rust-proposal', 'Описание-предложение (QUEUED_BY_PRIORITY после ST-UML)'],
  ['ST-ENG', 'roadmap-stages', 'ROADMAP', 'Приоритет №4: Инженерные схемы (Circuitikz, WaveDrom, SchemDraw, WireViz, контроль соединений и единиц)', 'partial', 'rust-proposal', 'В стенде реализованы студии circuitikz/tikz-timing/stanli и F12–F15; WaveDrom/SchemDraw/WireViz — предложение'],
  ['ST-CHEMBIO', 'roadmap-stages', 'ROADMAP', 'Приоритет №5: Химия и биология (chemfig, mhchem, modiagram, RDKit, биологические схемы)', 'partial', 'rust-proposal', 'В стенде есть студия chemfig+mhchem (EXT-04, P52); RDKit/modiagram/биология — предложение'],
  ['ST-ANIM', 'roadmap-stages', 'ROADMAP', 'Приоритет №6: Научная анимация (Manim, временная шкала, ключевые кадры, экспорт MP4/GIF)', 'proposal', 'rust-proposal', 'Описание-предложение (QUEUED_BY_PRIORITY; статические оверлеи Beamer P47 уже есть, Manim — нет)'],
  ['ST-OTHER', 'roadmap-stages', 'ROADMAP', 'Приоритет №7: Прочие направления (Graphviz/D2/Mermaid, LikeC4, обмен SVG/Ipe/Excalidraw, полная Publication Studio)', 'partial', 'rust-proposal', 'В стенде есть базовый импорт SVG P78 и компоновщик субфигур P32; междвижковая Publication Studio и Graphviz/D2 — предложение'],
  ['ST-DATA', 'roadmap-stages', 'ROADMAP', 'Приоритет №8 (строго последним): Data Figure, маппинг столбцов, статистика и Vega-Lite/Matplotlib/Gnuplot/Plotly', 'partial', 'rust-proposal', 'В стенде есть ранние прототипы CSV/TSV (P19/P35) и МНК/BoxPlot (F16); Vega-Lite/Matplotlib/Plotly — предложение в конце очереди'],
];

const UX_AUDIT_ROWS: RawTuple[] = [
  ['UX-F01', 'ux-audit', 'REQ', 'P1 · Лексическая подсветка TeX/TikZ непосредственно в редактируемом буфере для всех 4 тем', 'implemented', 'rust-proposal', 'Побайтово-точная токенизация в TexSourceEditor без мутации байтов'],
  ['UX-F02', 'ux-audit', 'REQ', 'P1 · Укрощение служебных комментариев % tikzarium:n1: (приглушение, выключенный по умолчанию перенос, компактный вид)', 'implemented', 'rust-proposal', 'Реализовано в TexSourceEditor с индикатором доли метаданных'],
  ['UX-F03', 'ux-audit', 'REQ', 'P1 · Физические номера строк (gutter), подсветка активной/ошибочной строки, Поиск/Замена и Переход к строке', 'implemented', 'rust-proposal', 'Сквозная нумерация в обоих окнах редактора + панель поиска/перехода'],
  ['UX-F04', 'ux-audit', 'REQ', 'P1 · Явное разделение режимов «Интерактивный эскиз», «Точный PDF XeLaTeX» и «Сравнение»', 'implemented', 'rust-proposal', 'Переключатель в шапке CanvasStage + режим кальки Onion-Skin'],
  ['UX-F05', 'ux-audit', 'REQ', 'P1 · Удобный диалог сохранения с выбором рабочей папки, защитой расширения .tex и подтверждением перезаписи', 'implemented', 'rust-main', 'SaveAndBuildModal в стенде и build_save_dialog.rs в Rust'],
  ['UX-F06', 'ux-audit', 'REQ', 'P2 · Прямой доступ ко всем 6 базовым инструментам TikZ в 1 клик без перекрытия центра холста', 'implemented', 'rust-proposal', 'Закреплённый левый вертикальный рельс 38px + хоткеи L, A, R, C, N, K'],
  ['UX-F07', 'ux-audit', 'REQ', 'P1 · Компактный Инспектор с русскими подписями, единицами измерения и единственной кнопкой «Применить»', 'implemented', 'rust-proposal', 'Тактильные степперы −/+, автошаг и единственная кнопка подтверждения'],
  ['UX-F08', 'ux-audit', 'REQ', 'P2 · Контекстная русская справка F1 без дублирования карточек и с переходом в оригинальный мануал', 'implemented', 'rust-pr-190', 'Единая карточка F1 в Инспекторе + прямые точки PDF (Shift+F1) для ядра и 12 расширений'],
  ['UX-F09', 'ux-audit', 'REQ', 'P1 · Настоящее состояние disabled и явная русская причина недоступности действия', 'implemented', 'rust-proposal', 'Честная блокировка экспорта устаревшего/отсутствующего PDF с пояснением'],
  ['UX-F10', 'ux-audit', 'REQ', 'P2 · Единый русский интерфейс без англоязычных остатков и утечки системных Debug-строк Some(...)', 'implemented', 'rust-proposal', 'Согласованный русский словарь во всех панелях, меню и диагностике'],
  ['UX-F11', 'ux-audit', 'REQ', 'P1 · Раздельная триада состояний с номерами ревизий: Документ · Сборка · PDF (Актуален / Устарел / Отсутствует)', 'implemented', 'rust-proposal', 'Постоянно видна в правой части рабочей панели с tabular-nums ревизиями'],
  ['UX-F12', 'ux-audit', 'REQ', 'P2 · Регулятор кегля кода 12–24 pt, режимы фокуса раскладки и адаптация к компактным экранам', 'implemented', 'rust-proposal', 'Выбор 12–24 pt, перетаскиваемые сплиттеры и ролевые профили раскладки'],
  ['UX-F13', 'ux-audit', 'REQ', 'P2 · Семантические интерактивные контролы, клавиатурный обход Tab и видимое кольцо фокуса', 'implemented', 'rust-proposal', 'Нативные button/select/input, aria-label и глобальный контур :focus-visible во всех 4 темах'],
  ['UX-F14', 'ux-audit', 'REQ', 'P1 · Единый контракт редактора/инспектора и раздельное отображение 5 статусов библиотек до масштабирования', 'implemented', 'rust-main', 'Матрица 5 статусов в LibrariesManagerView и обратная связь преамбулы'],
];

const SCI142_ROWS: RawTuple[] = [
  ['SC-SCOPE-001', 'sci142-reqs', 'REQ', 'P0 · Один активный рисунок в редакторе (один файл, один холст, один PDF — не галерея окон)', 'implemented', 'rust-main', 'Архитектура одной активной сессии рисунка'],
  ['SC-SCOPE-002', 'sci142-reqs', 'REQ', 'P0 · Хранение обычного UTF-8 .tex / .tikz без обязательного собственного закрытого формата', 'implemented', 'rust-main', 'Чистый .tex при сохранении и экспорте'],
  ['SC-SCOPE-003', 'sci142-reqs', 'REQ', 'P0 · Редактируемый исходный текст постоянно доступен рядом с холстом', 'implemented', 'rust-main', 'Двухоконный редактор .tex рядом с холстом'],
  ['SC-SCOPE-004', 'sci142-reqs', 'REQ', 'P0 · Локальные .dat и подключаемые .tex учитываются как ресурсы одного активного рисунка', 'partial', 'rust-main', 'Отображаются в зависимостях образца; автосбор графа — MOD-11'],
  ['SC-SCOPE-005', 'sci142-reqs', 'REQ', 'P0 · Сводный Sarov main.tex не является мультиредактором — каждый SV-001…SV-042 открывается отдельно', 'implemented', 'rust-main', 'Реализовано в one_figure_session.rs в Rust'],
  ['SC-SCOPE-006', 'sci142-reqs', 'REQ', 'P0 · Отказ от Gnuplot и -shell-escape в поставке и плане адаптеров (построение средствами PGF Math)', 'implemented', 'rust-main', 'Плоттер F(x) P44 использует чистый PGF Math без Gnuplot'],
  ['SC-SRC-001', 'sci142-reqs', 'REQ', 'P0 · Распознаватель возвращает точный диапазон UTF-8 и ревизию для поддерживаемой конструкции', 'implemented', 'rust-main', 'Реализовано как для примитивов n1, так и для чистого TikZ/пакетов в parseScenePackageObjects + SourcePatch (MOD-04, MOD-06)'],
  ['SC-SRC-002', 'sci142-reqs', 'REQ', 'P0 · Различение литерала, вычисляемого выражения и неизвестной конструкции со статусом OPAQUE', 'partial', 'rust-main', 'Валидатор каталога и parseScenePackageObjects оставляют нераспознанные макросы неприкосновенными (OPAQUE)'],
  ['SC-SRC-003', 'sci142-reqs', 'REQ', 'P0 · Учёт вложенных скобок {}, [], экранированного \\% и комментариев при разборе параметров', 'implemented', 'rust-main', 'Реализовано в токенизаторе и поиске парных скобок P71'],
  ['SC-SRC-004', 'sci142-reqs', 'REQ', 'P0 · Запрет исполнения или раскрытия произвольных макросов автора (остаются OPAQUE)', 'implemented', 'rust-main', 'Макросы \\newcommand не раскрываются и не затираются'],
  ['SC-SRC-005', 'sci142-reqs', 'REQ', 'P0 · Идентификатор владения диапазоном и неизменность соседних команд при патче', 'implemented', 'rust-main', 'Гарантируется applyCheckedLineRangePatch и applyOwnedPrimitivePatch'],
  ['SC-SRC-006', 'sci142-reqs', 'REQ', 'P0 · Проверка старого текста и ожидаемой ревизии документа в SourcePatch (отказ при stale revision)', 'implemented', 'rust-main', 'Проверено в sourcePatchEngine.ts, StudioControlEngine и tikzarium-extensions'],
  ['SC-SRC-007', 'sci142-reqs', 'REQ', 'P0 · Аннулирование устаревших маркеров и повторное распознавание после ручной правки кода', 'implemented', 'rust-main', 'Реактивный пересчёт parseOwnedPrimitives и parseScenePackageObjects при любом изменении буфера'],
  ['SC-SRC-008', 'sci142-reqs', 'REQ', 'P0 · Одна операция Инспектора порождает ровно одну атомарную запись Undo с возвратом исходного SHA', 'implemented', 'rust-main', 'Стек транзакций истории документа + inversePatch'],
  ['SC-SRC-009', 'sci142-reqs', 'REQ', 'P0 · Побайтовая сохранность неизвестных команд, комментариев, пробелов и CRLF', 'implemented', 'rust-main', 'Подтверждено модульными тестами LF/CRLF'],
  ['SC-SRC-010', 'sci142-reqs', 'REQ', 'P0 · Атомарное сохранение файла исходника на диск с сохранением прежнего файла при сбое записи', 'proposal', 'rust-main', 'Реализовано в tikzarium-core на Rust; в браузерном стенде запись идёт в память/скачивание'],
  ['SC-SRC-011', 'sci142-reqs', 'REQ', 'P0 · Отклонение правки при перекрывающихся диапазонах владения без частичной мутации', 'implemented', 'rust-main', 'Проверяется в applyCheckedSourcePatch и applyCheckedLineRangePatch (MOD-04)'],
  ['SC-SRC-012', 'sci142-reqs', 'REQ', 'P1 · Явное объяснение причины OPAQUE в Инспекторе без подмены формулы числовой геометрией', 'implemented', 'rust-proposal', 'Честные пояснения в Инспекторе для немаркированного кода и пакетов расширений'],
  ['SC-UI-001', 'sci142-reqs', 'REQ', 'P0 · Рабочая область одновременно показывает холст, исходник, свойства и PDF при 1366×768 (100/125/200%)', 'implemented', 'rust-proposal', 'Трёхпанельная студия с живой PDF-подложкой прямо на холсте и компактным Инспектором'],
  ['SC-UI-002', 'sci142-reqs', 'REQ', 'P0 · Выбор элемента на холсте подсвечивает его команду в исходном коде', 'implemented', 'rust-proposal', 'Двусторонняя привязка к строке для примитивов n1 и объектов пакетов'],
  ['SC-UI-003', 'sci142-reqs', 'REQ', 'P0 · Инспектор и справка F1 питаются от единого каталога команд и параметров без противоречий', 'implemented', 'rust-main', 'Единый PRIMITIVE_TOOLS / PACKAGE_CANVAS_TOOLS / TIKZ_LIBRARIES / PDF_MANUAL_ANCHORS'],
  ['SC-UI-004', 'sci142-reqs', 'REQ', 'P0 · Визуальное отличие предварительного эскиза холста от точного PDF внешнего XeLaTeX', 'implemented', 'rust-proposal', 'Явные переключатели режимов + честная маркировка контура PDF-подложки (XeLaTeX vs GS·PDF)'],
  ['SC-UI-005', 'sci142-reqs', 'REQ', 'P0 · Отображение статуса PDF (актуален / устарел / ошибка) и защита от выдачи старого PDF за новый', 'implemented', 'rust-proposal', 'Триада статусов с блокировкой экспорта устаревшего результата'],
  ['SC-UI-006', 'sci142-reqs', 'REQ', 'P0 · Контекстная карточка F1 с синтаксисом, эффектом, ограничениями и ссылкой на руководство для каждого ключа', 'implemented', 'rust-pr-190', 'Карточка F1 + прямые точки PDF-мануалов'],
  ['SC-UI-007', 'sci142-reqs', 'REQ', 'P1 · Отображение внешних зависимостей рисунка (.dat, \\input) и ошибок поиска ресурсов', 'implemented', 'rust-main', 'Автоинспектор inspectDataFileDependencies в Инспекторе и диагностике окружения (MOD-11)'],
  ['SC-UI-008', 'sci142-reqs', 'REQ', 'P1 · Специализированный инспектор для угловой дуги и размерной линии (SV-005, SV-035)', 'partial', 'rust-proposal', 'Генераторы и ключи выносок P21 есть; прямое распознавание произвольного tikz-dimline — предложение'],
  ['SC-PATH-001', 'sci142-reqs', 'REQ', 'P0 · Поддержка draw, path, fill, clip и стилевых ключей без повреждения точек пути при смене толщины', 'partial', 'rust-proposal', 'Работает на примитивах n1 (P07); для произвольных путей без маркера — MOD-06'],
  ['SC-PATH-002', 'sci142-reqs', 'REQ', 'P0 · Поддержка отрезков, стрелок, прямоугольников, окружностей и кубических кривых Безье без регрессий', 'implemented', 'rust-main', 'Шесть базовых примитивов N1'],
  ['SC-PATH-003', 'sci142-reqs', 'REQ', 'P0 · Распознавание и сохранение arc, ellipse, -- cycle и замыкания пути при редактировании', 'partial', 'rust-proposal', 'Реализовано на контурах n1 (P36, F01, F02); для произвольного TeX — MOD-06'],
  ['SC-PATH-004', 'sci142-reqs', 'REQ', 'P0 · Сохранение относительных координат + и ++ без перезаписи абсолютными числами', 'partial', 'rust-proposal', 'Помощник P24 генерирует относительную запись, но холст n1 хранит абсолютные см; сохранение ++ при правке — предложение'],
  ['SC-PATH-005', 'sci142-reqs', 'REQ', 'P0 · Адаптер calc меняет только подтверждённый литерал, оставляя пересчёт ($...$) компилятору XeLaTeX', 'proposal', 'rust-proposal', 'Описание-предложение: сейчас выражения calc в коде сохраняются как неприкосновенный текст'],
  ['SC-PATH-006', 'sci142-reqs', 'REQ', 'P0 · Учёт вложенных областей \\begin{scope} и локальных shift/rotate/scale без выноса команды из scope', 'partial', 'rust-proposal', 'Слои scope P46 поддерживаются; полный учёт матриц локальных трансформаций scope — предложение'],
  ['SC-PATH-007', 'sci142-reqs', 'REQ', 'P0 · Сохранение исходного порядка наложения команд path, fill и draw', 'implemented', 'rust-main', 'Порядок строк сохраняется и управляется явно через Z-order P06'],
  ['SC-PATH-008', 'sci142-reqs', 'REQ', 'P1 · Поддержка узлов node с ключами anchor, text, font, inner sep и сохранением кириллицы/формул', 'implemented', 'rust-proposal', 'Ключи якорей узлов P08 и режимы text/math в Инспекторе'],
  ['SC-PATH-009', 'sci142-reqs', 'REQ', 'P1 · Точная настройка геометрии и размера наконечника из библиотеки arrows.meta', 'partial', 'rust-proposal', 'Выбор типа наконечника есть; параметризация length/width наконечника — предложение'],
  ['SC-PATH-010', 'sci142-reqs', 'REQ', 'P1 · Поддержка общих стилей \\tikzset без разворачивания определения в каждую команду', 'implemented', 'rust-proposal', 'Мост \\tikzset преамбулы F07 и DRY-экстрактор P68'],
  ['SC-PLOT-001', 'sci142-reqs', 'REQ', 'P0 · Распознавание окружения \\begin{axis} и связанных с ним серий \\addplot', 'implemented', 'rust-proposal', 'Двусторонний адаптер осей и серий в packageCanvasSemantics.ts + отрисовка на холсте и в PDF-подложке (MOD-07)'],
  ['SC-PLOT-002', 'sci142-reqs', 'REQ', 'P0 · Сохранение декларации \\pgfplotsset{compat=...} автора без самовольной перезаписи', 'implemented', 'rust-proposal', 'Существующий compat в преамбуле никогда не перезаписывается'],
  ['SC-PLOT-003', 'sci142-reqs', 'REQ', 'P0 · Минимальный SourcePatch отдельных ключей axis: xmin, xmax, ymin, ymax, width, height', 'implemented', 'rust-proposal', 'Точечный патч отдельных ключей axis в patchPackageObjectInSource (MOD-07)'],
  ['SC-PLOT-004', 'sci142-reqs', 'REQ', 'P0 · Редактирование ticks, ticklabels, xlabel, ylabel и расположения осей axis lines', 'implemented', 'rust-proposal', 'Правка xlabel, ylabel, title и grid существующего \\begin{axis} в Инспекторе (MOD-07)'],
  ['SC-PLOT-005', 'sci142-reqs', 'REQ', 'P0 · Распознавание \\addplot и \\addplot+ с формульной серией и подсветкой строки в исходнике', 'implemented', 'rust-proposal', 'Распознавание формульных серий \\addplot с рендером кривой и переходом к строке (MOD-07)'],
  ['SC-PLOT-006', 'sci142-reqs', 'REQ', 'P0 · Правка literal-параметров серии domain, samples, line width, color и mark с Undo', 'partial', 'rust-proposal', 'Добавление и правка формулы серии с Undo работает на холсте; индивидуальный редактор mark/samples — Волна 2'],
  ['SC-PLOT-007', 'sci142-reqs', 'REQ', 'P0 · Поддержка plot coordinates без перестановки и потери порядка точек', 'implemented', 'rust-proposal', 'Точки координатных серий не пересортировываются'],
  ['SC-PLOT-008', 'sci142-reqs', 'REQ', 'P0 · Распознавание нативного TikZ \\draw plot[domain=...] по функции PGF Math без Gnuplot', 'partial', 'rust-proposal', 'Генератор P44 строит чистый PGF Math; обратный парсер произвольного plot — предложение'],
  ['SC-PLOT-009', 'sci142-reqs', 'REQ', 'P0 · Сохранение математической формулы серии как исходного TeX без подмены приближёнными числами', 'implemented', 'rust-main', 'Формулы автора в исходнике никогда не заменяются численной аппроксимацией без запроса'],
  ['SC-PLOT-010', 'sci142-reqs', 'REQ', 'P0 · Неприкосновенность неизвестных опций plot и пользовательских pgfkeys', 'implemented', 'rust-proposal', 'patchPackageObjectInSource меняет только целевой ключ, сохраняя все пользовательские pgfkeys (MOD-07)'],
  ['SC-PLOT-011', 'sci142-reqs', 'REQ', 'P1 · Распознавание \\legend и name path серии без их повреждения при правке соседних свойств', 'implemented', 'rust-proposal', 'Соседние строки \\legend и name path внутри \\begin{axis} сохраняются побайтово (MOD-07)'],
  ['SC-PLOT-012', 'sci142-reqs', 'REQ', 'P1 · Ограничение затрат UI на сериях с тысячами точек без блокировки прокрутки', 'proposal', 'rust-proposal', 'Описание-предложение: требует выноса парсинга в Worker и даунсэмплинга превью (MOD-10)'],
  ['SC-GEO-001', 'sci142-reqs', 'REQ', 'P0 · Распознавание именованных путей name path=... с отображением имени в Инспекторе', 'proposal', 'rust-proposal', 'Описание-предложение для геометрического адаптера SC4'],
  ['SC-GEO-002', 'sci142-reqs', 'REQ', 'P0 · Поддержка name intersections и ссылок intersection-N с пересчётом в XeLaTeX', 'partial', 'rust-proposal', 'Мастер P37 вставляет синтаксис intersections; двусторонний трекинг ссылок — предложение'],
  ['SC-GEO-003', 'sci142-reqs', 'REQ', 'P0 · Запрет записи экранных пикселей вместо аналитического пересечения (непрозрачное = OPAQUE)', 'implemented', 'rust-main', 'Экранные пиксели никогда не записываются в .tex'],
  ['SC-GEO-004', 'sci142-reqs', 'REQ', 'P0 · Сохранение привязки fill between[of=A and B] к именам двух исходных серий', 'partial', 'rust-proposal', 'Поддержано в пресете EXT-01 pgfplots.fillbetween; двусторонний адаптер — MOD-07'],
  ['SC-GEO-005', 'sci142-reqs', 'REQ', 'P0 · Поддержка soft clip и параметров заливки между кривыми силами PGFPlots', 'proposal', 'rust-proposal', 'Описание-предложение для расширенного адаптера PGFPlots'],
  ['SC-GEO-006', 'sci142-reqs', 'REQ', 'P1 · Изменение штриховки patterns / patterns.meta отдельно от геометрии контура', 'implemented', 'rust-proposal', 'Свойство hatch_pattern в Инспекторе и мастерской P38 не меняет вершины контура'],
  ['SC-GEO-007', 'sci142-reqs', 'REQ', 'P1 · Учёт слоёв pgf layers и областей clip при построении предварительного слоя и hit-test', 'partial', 'rust-proposal', 'Слои bg/main/annotations с Lock/Hide (P46) работают; учёт произвольного \\clip — предложение'],
  ['SC-GEO-008', 'sci142-reqs', 'REQ', 'P1 · Адаптер pic {angle=A--B--C} сохраняет ссылки на три точки при изменении радиуса дуги', 'proposal', 'rust-proposal', 'Описание-предложение (сейчас P21 строит дугу угла явно, без двустороннего парсера \\pic{angle})'],
  ['SC-GEO-009', 'sci142-reqs', 'REQ', 'P1 · Адаптер пакета tikz-dimline сохраняет выносные линии и подпись измерения', 'proposal', 'rust-proposal', 'Описание-предложение (сейчас P21 использует нативные выноски |<->|, отдельный адаптер tikz-dimline в очереди)'],
  ['SC-GEO-010', 'sci142-reqs', 'REQ', 'P1 · Адаптер shapes.geometric и shapes.arrows сохраняет векторные типы узлов без растеризации', 'partial', 'rust-proposal', 'Подключение библиотеки и пресеты ГОСТ 19.701 есть; полный инспектор всех форм — предложение'],
  ['SC-MATH-001', 'sci142-reqs', 'REQ', 'P0 · Различение \\def, \\newcommand и \\pgfmathsetmacro как объявлений без замены вычисленным числом', 'implemented', 'rust-proposal', 'Менеджер макросов P40 и параметризатор F08 редактируют именно объявления преамбулы'],
  ['SC-MATH-002', 'sci142-reqs', 'REQ', 'P0 · Распознавание \\pgfmathdeclarefunction и числа параметров (например, gauss/3 в SV-042)', 'proposal', 'rust-proposal', 'Описание-предложение для математического адаптера SC6'],
  ['SC-MATH-003', 'sci142-reqs', 'REQ', 'P0 · Изменение известного literal-аргумента функции без разворачивания выражений PGF Math', 'proposal', 'rust-proposal', 'Описание-предложение для адаптера SC6'],
  ['SC-MATH-004', 'sci142-reqs', 'REQ', 'P1 · Распознавание простого диапазона \\foreach и правка границ цикла без записи развёрнутых копий', 'partial', 'rust-proposal', 'Генератор P23 создаёт компактный цикл \\foreach; обратный инспектор существующего \\foreach — предложение'],
  ['SC-MATH-005', 'sci142-reqs', 'REQ', 'P1 · Сохранение вложенных неподдерживаемых циклов \\foreach в исходнике без попытки их развернуть', 'implemented', 'rust-main', 'Неизвестные и вложенные циклы остаются в .tex нетронутыми'],
  ['SC-MATH-006', 'sci142-reqs', 'REQ', 'P0 · Автоматическая проверка формальных математических инвариантов сценария (например, нулевой интеграл AK-F3_3)', 'proposal', 'rust-proposal', 'Описание-предложение для верификатора уровня L4'],
  ['SC-MATH-007', 'sci142-reqs', 'REQ', 'P0 · Разделение статуса физического инварианта L4 от статуса компиляции L1 и правки L3', 'proposal', 'rust-proposal', 'Описание-предложение для матрицы QA корпуса SCI142'],
  ['SC-DATA-001', 'sci142-reqs', 'REQ', 'P0 · Построение локального графа входных ресурсов из \\input, plot file и файла .fls', 'partial', 'rust-main', 'Реализовано в tikzarium-core/dependencies.rs; в веб-стенде перенос запланирован в MOD-11'],
  ['SC-DATA-002', 'sci142-reqs', 'REQ', 'P0 · Разрешение пути ресурса относительно файла и корня проекта с понятной ошибкой при отсутствии', 'partial', 'rust-main', 'Реализовано в Rust core; расширение UI-диагностики в стенде — MOD-11'],
  ['SC-DATA-003', 'sci142-reqs', 'REQ', 'P0 · Автоматический перевод статуса PDF в «Устарел» при изменении внешнего файла данных .dat', 'partial', 'rust-main', 'Реализовано в Rust one_figure_session; в веб-стенде — MOD-11'],
  ['SC-DATA-004', 'sci142-reqs', 'REQ', 'P0 · Неизменность SHA-256 внешних файлов .dat при любых операциях редактирования на холсте', 'implemented', 'rust-main', 'Операции холста меняют только буфер .tex и никогда не перезаписывают внешние .dat'],
  ['SC-DATA-005', 'sci142-reqs', 'REQ', 'P1 · Указание точного дочернего файла источника ошибки TeX с переходом к нему из диагностики', 'proposal', 'rust-main', 'В Rust diagnostics.rs поддержано; многофайловый переход в UI — MOD-11'],
  ['SC-DATA-006', 'sci142-reqs', 'REQ', 'P1 · Присвоение статуса UNKNOWN непрозрачной условной загрузке файла без ложного подтверждения пути', 'proposal', 'rust-main', 'Реализовано в Rust dependencies.rs'],
  ['SC-DATA-007', 'sci142-reqs', 'REQ', 'P0 · Защита от выхода за пределы доверенного корня проекта через символические ссылки', 'implemented', 'rust-main', 'Проверка обхода путей ../ в Control API и защита симлинков в Rust core'],
  ['SC-PKG-001', 'sci142-reqs', 'REQ', 'P0 · Пять раздельных статусов пакета/библиотеки: установка, подключение, движок, GUI, справка', 'implemented', 'rust-main', 'Полностью реализовано в каталоге и матрице библиотек'],
  ['SC-PKG-002', 'sci142-reqs', 'REQ', 'P0 · Подключение пакета создаёт видимый обратимый SourcePatch преамбулы без скрытой установки из сети', 'implemented', 'rust-main', 'Предпросмотр диффа преамбулы и откат Undo'],
  ['SC-PKG-003', 'sci142-reqs', 'REQ', 'P0 · Версионированные сведения о синтаксисе и прямые ссылки на оригинальное руководство в F1', 'implemented', 'rust-pr-190', 'Индекс прямых точек PDF-мануалов с номерами страниц и секций'],
  ['SC-PKG-004', 'sci142-reqs', 'REQ', 'P0 · Раздельный учёт семейств PGFPlots и tikz-dimline (наличие .sty не означает GUI PASS)', 'partial', 'rust-proposal', 'PGFPlots выделен; отдельный манифест tikz-dimline запланирован в MOD-08'],
  ['SC-PKG-005', 'sci142-reqs', 'REQ', 'P1 · Расширение каталога не меняет семантику существующих 6 примитивов и не ломает тесты N1/N2', 'implemented', 'rust-pr-190', 'Все контракты N1/N2 и 23/23 джоба CI зелёные'],
  ['SC-PKG-006', 'sci142-reqs', 'REQ', 'P0 · Декларативные манифесты расширений без динамической подгрузки DLL/dylib и сетевого кода', 'implemented', 'rust-main', 'Только статические декларативные описания TOML/TS'],
  ['SC-BUILD-001', 'sci142-reqs', 'REQ', 'P0 · Вызов установленного пользователем XeLaTeX напрямую без командной оболочки shell', 'partial', 'rust-main', 'В Rust build.rs — прямой Command::new; в веб-стенде — задача MOD-09'],
  ['SC-BUILD-002', 'sci142-reqs', 'REQ', 'P0 · Отключение -shell-escape по умолчанию для всех сборок', 'implemented', 'rust-main', 'Строго соблюдается в Rust core и спецификациях стенда'],
  ['SC-BUILD-003', 'sci142-reqs', 'REQ', 'P0 · Запрет автоматической доустановки пакетов в MiKTeX и изменения глобальных настроек ОС', 'implemented', 'rust-main', 'Реализовано в windows_tex_security.rs в Rust'],
  ['SC-BUILD-004', 'sci142-reqs', 'REQ', 'P0 · Ограничение времени компиляции по таймауту и неблокирующая отмена сборки пользователем', 'implemented', 'rust-main', 'Кнопка «Стоп» в стенде и таймаут процесса в Rust core'],
  ['SC-BUILD-005', 'sci142-reqs', 'REQ', 'P0 · Независимая проверка выходного PDF, числа страниц, шрифтов и растра помимо кода возврата 0', 'partial', 'rust-main', 'Сервер /api/render/pdf-underlay верифицирует реальный выходной PDF и PNG 144 DPI (Ghostscript 9.55 / XeLaTeX); полный pdffonts — в Rust'],
  ['SC-BUILD-006', 'sci142-reqs', 'REQ', 'P0 · Сохранение последнего успешного PDF при сбое сборки строго с пометкой «Устарел»', 'implemented', 'rust-main', 'Хранится lastGoodPrimitives со статусом stale в триаде'],
  ['SC-BUILD-007', 'sci142-reqs', 'REQ', 'P1 · Проверка встраивания шрифтов и отсутствия пропущенных глифов (предупреждения nullfont)', 'proposal', 'rust-main', 'Реализовано в crates/tikzarium-core/src/font_audit.rs; интеграция в веб-стенд — MOD-09'],
  ['SC-BUILD-008', 'sci142-reqs', 'REQ', 'P0 · Честное предупреждение о доверенных документах при запуске с правами Administrator (без изменения UAC)', 'proposal', 'rust-main', 'Реализовано в нативном Windows-контуре Rust'],
  ['SC-BUILD-009', 'sci142-reqs', 'REQ', 'P0 · Сборка PDF не изменяет исходные .tex и локальные файлы зависимостей (неизменный SHA входов)', 'implemented', 'rust-main', 'Сборка работает в режиме только чтения для исходников'],
  ['SC-QA-001', 'sci142-reqs', 'REQ', 'P0 · Реестр корпуса из 142 уникальных идентификаторов (100 AK + 42 SR) с проверкой SHA-256', 'proposal', 'rust-main', 'Ведомость и фикстуры находятся в upstream roadmap/Tikzarium_Scientific_142_R4'],
  ['SC-QA-002', 'sci142-reqs', 'REQ', 'P0 · Валидация наличия ровно одного активного окружения tikzpicture в каждом тестовом исходнике', 'proposal', 'rust-main', 'Проверяется тестами scientific_142 в Rust'],
  ['SC-QA-003', 'sci142-reqs', 'REQ', 'P0 · Сценарий L1: фактическая компиляция всех 142 фигур внешним XeLaTeX в одностраничный PDF', 'proposal', 'rust-main', 'Выполняется в CI workflow scientific-142-corpus.yml'],
  ['SC-QA-004', 'sci142-reqs', 'REQ', 'P0 · Сценарий L2: распознавание поддерживаемых конструкций всех 142 фигур рабочим парсером', 'proposal', 'rust-proposal', 'Целевой этап приёмки ST-SCI (требует завершения адаптеров SC3–SC6)'],
  ['SC-QA-005', 'sci142-reqs', 'REQ', 'P0 · Сценарий L3: доказательство реального GUI-редактирования, SourcePatch, PDF и Undo по каждому рисунку', 'proposal', 'rust-proposal', 'Целевой этап приёмки ST-SCI (ещё не закрыт на всех 142 фигурах)'],
  ['SC-QA-006', 'sci142-reqs', 'REQ', 'P0 · Сценарий L4: проверка формальных физических/математических инвариантов там, где задано правило', 'proposal', 'rust-proposal', 'Описание-предложение приёмочного гейта L4'],
  ['SC-QA-007', 'sci142-reqs', 'REQ', 'P0 · Раздельное хранение хэша эталонного PDF и хэша новой сборки', 'proposal', 'rust-main', 'Контракт ведомостей C02/C03 в Rust'],
  ['SC-QA-008', 'sci142-reqs', 'REQ', 'P0 · Растровое сравнение на зафиксированном окружении отдельно от статуса компиляции', 'proposal', 'rust-proposal', 'Контракт визуальной сверки QA'],
  ['SC-QA-009', 'sci142-reqs', 'REQ', 'P0 · Обязательный отказ негативного теста при повреждении SHA эталонного fixture', 'proposal', 'rust-main', 'Реализовано в verify_smoke.py (C03) в Rust-репозитории'],
  ['SC-QA-010', 'sci142-reqs', 'REQ', 'P0 · Строгое разделение статусов Hosted CI, Windows Server и физической Windows 10 без переноса PASS', 'implemented', 'rust-main', 'Явно разведено в ConnectionsAuditView (профили Linux vs Win10 MiKTeX) и документации'],
  ['SC-QA-011', 'sci142-reqs', 'REQ', 'P1 · Хранение воспроизводимого комплекта доказательств (PDF, логи, SHA, параметры среды)', 'proposal', 'rust-main', 'Реализовано в контуре артефактов CI Rust'],
  ['SC-QA-012', 'sci142-reqs', 'REQ', 'P1 · Независимый учёт статусов L0…L4 по каждой возможности без автоповышения L3 из L1', 'implemented', 'rust-main', 'Отражено в структуре настоящего реестра требований'],
  ['SC-PERF-001', 'sci142-reqs', 'REQ', 'P1 · Неблокирующая работа распознавателя на больших сериях plot coordinates без фризов UI', 'proposal', 'rust-proposal', 'Запланировано в задаче MOD-10 (вынос в фоновый поток/воркер)'],
  ['SC-PERF-002', 'sci142-reqs', 'REQ', 'P1 · Ключевание кэша сборки хэшами исходника, ресурсов .dat, движка и версий пакетов', 'proposal', 'rust-proposal', 'Описание-предложение для кэша сборочного ядра'],
  ['SC-PERF-003', 'sci142-reqs', 'REQ', 'P1 · Ограничение максимального размера логов и выходных растров с отдельной диагностикой', 'partial', 'rust-main', 'В Rust QA_PREVIEW_IMAGE_LIMITS реализовано; лимит JSONL 1 МБ в Control API есть'],
  ['SC-PERF-004', 'sci142-reqs', 'REQ', 'P1 · Отмена длительной сборки пользователем с завершением дочернего процесса и сохранностью файлов', 'partial', 'rust-main', 'Реализовано в Rust build.rs и кнопке Стоп стенда'],
];

const AI88_PACKAGES_AND_LIBS_ROWS: RawTuple[] = [
  // 35 specialized packages of AI88
  ['AI88-PKG-01', 'ai88-packages-libs', 'REQ', 'Пакет tkz-euclide (планиметрия Евклида: вычисляемые точки, окружности, высоты)', 'implemented', 'rust-pr-190', 'Студия EXT-09 + прямая точка PDF tkz-euclide.pdf'],
  ['AI88-PKG-02', 'ai88-packages-libs', 'REQ', 'Пакет tkz-elements (объектная Lua-геометрия, кейс #65 — требует LuaLaTeX)', 'proposal', 'rust-proposal', 'Описание-предложение (движок LuaLaTeX вне текущего профиля XeLaTeX)'],
  ['AI88-PKG-03', 'ai88-packages-libs', 'REQ', 'Пакет tkz-tab (таблицы знаков и вариаций функции, кейс #64)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-04', 'ai88-packages-libs', 'REQ', 'Пакет tikz-cd (коммутативные диаграммы, точные последовательности, морфизмы)', 'implemented', 'rust-pr-190', 'Студия EXT-03 + прямая точка PDF tikz-cd-doc.pdf'],
  ['AI88-PKG-05', 'ai88-packages-libs', 'REQ', 'Пакет forest (компактные иерархические деревья и AST)', 'implemented', 'rust-pr-190', 'Студия EXT-06 + прямая точка PDF forest-doc.pdf'],
  ['AI88-PKG-06', 'ai88-packages-libs', 'REQ', 'Пакет tikz-network (взвешенные сетевые графы и многослойные сети)', 'implemented', 'rust-pr-190', 'Включён в студию EXT-09 (пресет взвешенного графа)'],
  ['AI88-PKG-07', 'ai88-packages-libs', 'REQ', 'Пакет tkz-graph (классические именованные графы Бержа, кейс #67)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-08', 'ai88-packages-libs', 'REQ', 'Пакет tikzphysics (физические блоки и поля, кейс #69)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-09', 'ai88-packages-libs', 'REQ', 'Пакет physketch (физические эскизы сил и механики, кейс #70)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-10', 'ai88-packages-libs', 'REQ', 'Пакет tikz-optics (оптические скамьи, линзы, зеркала, интерферометры)', 'implemented', 'rust-pr-190', 'Студия EXT-11 + прямая точка PDF tikz-optics.pdf'],
  ['AI88-PKG-11', 'ai88-packages-libs', 'REQ', 'Пакет simpleoptics (упрощённые линзовые системы, кейс #71)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-12', 'ai88-packages-libs', 'REQ', 'Пакет optikz (оптические линии задержки и лазерные схемы, кейс #72)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-13', 'ai88-packages-libs', 'REQ', 'Пакет pgf-spectra (эмиссионные и абсорбционные оптические спектры, кейс #73)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-14', 'ai88-packages-libs', 'REQ', 'Пакет pgf-interference (дифракционные и интерференционные картины Юнга, кейс #74)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-15', 'ai88-packages-libs', 'REQ', 'Пакет quantikz (квантовые регистры, вентили, измерения и SWAP)', 'implemented', 'rust-pr-190', 'Студия EXT-08 + нотации P51 + прямая точка PDF quantikz.pdf'],
  ['AI88-PKG-16', 'ai88-packages-libs', 'REQ', 'Пакет tikz-feynman (диаграммы Фейнмана с ручной раскладкой вершин под XeLaTeX, кейс #75)', 'implemented', 'rust-pr-190', 'Пресет в EXT-08 с честным предупреждением про автоукладку LuaTeX'],
  ['AI88-PKG-17', 'ai88-packages-libs', 'REQ', 'Пакет tikz-feynhand (ручные диаграммы Фейнмана без LuaTeX, кейс #76)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-18', 'ai88-packages-libs', 'REQ', 'Пакет blochsphere (квантовая сфера Блоха и векторы состояний, кейс #77)', 'partial', 'rust-proposal', 'В EXT-05 есть пресет сферы Блоха на tikz-3dplot; нативный адаптер blochsphere.sty — предложение'],
  ['AI88-PKG-19', 'ai88-packages-libs', 'REQ', 'Пакет circuitikz (принципиальные электрические схемы ГОСТ / IEC / ANSI)', 'implemented', 'rust-pr-190', 'Студия EXT-02 + прямая точка PDF circuitikzmanual.pdf'],
  ['AI88-PKG-20', 'ai88-packages-libs', 'REQ', 'Пакет tikz-timing (временные диаграммы цифровых шин SPI/I²C/AXI, кейс #78)', 'implemented', 'rust-pr-190', 'Студия EXT-10 + прямая точка PDF tikz-timing.pdf'],
  ['AI88-PKG-21', 'ai88-packages-libs', 'REQ', 'Пакет structmech (нагрузки и опоры строительной механики, кейс #79)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-22', 'ai88-packages-libs', 'REQ', 'Пакет stanli (стержневые системы и балки строительной механики, кейс #80)', 'implemented', 'rust-pr-190', 'Включён в студию EXT-11 (пресет балки stanli)'],
  ['AI88-PKG-23', 'ai88-packages-libs', 'REQ', 'Пакет kinematikz (кинематические цепи и шарнирные механизмы, кейс #81)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-24', 'ai88-packages-libs', 'REQ', 'Пакет tikz-dimline (связанные машиностроительные размерные линии, кейс #82)', 'proposal', 'rust-proposal', 'Описание-предложение (сейчас выноски P21 работают на нативных стрелках |<->|)'],
  ['AI88-PKG-25', 'ai88-packages-libs', 'REQ', 'Пакет chemfig (структурные формулы органической химии, циклы и схемы реакций)', 'implemented', 'rust-pr-190', 'Студия EXT-04 + прямая точка PDF chemfig-en.pdf'],
  ['AI88-PKG-26', 'ai88-packages-libs', 'REQ', 'Пакет mhchem (стехиометрические уравнения реакций и изотопы \\ce{...})', 'implemented', 'rust-pr-190', 'Включён в студию EXT-04 совместно с chemfig'],
  ['AI88-PKG-27', 'ai88-packages-libs', 'REQ', 'Пакет modiagram (диаграммы молекулярных орбиталей МО ЛКАО, кейс #85)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-28', 'ai88-packages-libs', 'REQ', 'Пакет chempid (трубопроводные и КИПиА схемы P&ID, кейс #83)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-29', 'ai88-packages-libs', 'REQ', 'Пакет chemplants (технологические аппараты химпроизводств, кейс #84)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],
  ['AI88-PKG-30', 'ai88-packages-libs', 'REQ', 'Пакет pgfplots (научные 2D/3D-оси, серии, коридоры погрешностей, groupplots)', 'implemented', 'rust-pr-190', 'Студия EXT-01 + P19 + P27 + прямые точки pgfplots.pdf (двусторонний парсер — MOD-07)'],
  ['AI88-PKG-31', 'ai88-packages-libs', 'REQ', 'Пакет pgfplotstable (таблицы с вычисляемыми столбцами из данных, кейс #60)', 'partial', 'rust-proposal', 'В P79 есть генератор booktabs+siunitx; нативный адаптер \\pgfplotstabletypeset — предложение'],
  ['AI88-PKG-32', 'ai88-packages-libs', 'REQ', 'Пакет tikz-3dplot (сферические 3D-координаты и углы Эйлера tdplot_main_coords)', 'implemented', 'rust-pr-190', 'Студия EXT-05 + 3D-проектор P54 + прямая точка tikz-3dplot_documentation.pdf'],
  ['AI88-PKG-33', 'ai88-packages-libs', 'REQ', 'Пакет lua-tikz3dtools (3D-поверхности с окклюзией в LuaLaTeX, кейс #86)', 'proposal', 'rust-proposal', 'Описание-предложение (требует движок LuaLaTeX)'],
  ['AI88-PKG-34', 'ai88-packages-libs', 'REQ', 'Пакет pgfgantt (календарные диаграммы Ганта, вехи и связи НИОКР, кейс #87)', 'implemented', 'rust-pr-190', 'Студия EXT-07 + прямая точка PDF pgfgantt.pdf'],
  ['AI88-PKG-35', 'ai88-packages-libs', 'REQ', 'Пакет pgf-pie (круговые и секторные диаграммы состава, кейс #88)', 'proposal', 'rust-proposal', 'Описание-предложение в ведомости AI88'],

  // 23 TikZ libraries of AI88
  ['AI88-LIB-01', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ angles (обозначение и подпись плоских углов)', 'implemented', 'rust-proposal', 'Включена в каталог TIKZ_LIBRARIES (5 статусов, преамбула, F1) и генератор углов P21 (MOD-08)'],
  ['AI88-LIB-02', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ arrows.meta (настраиваемые наконечники Stealth, Latex, Bar)', 'implemented', 'rust-main', 'Полная поддержка в N1/N2, палитре чистого TikZ, автофиксе P17 и матрице 5 статусов'],
  ['AI88-LIB-03', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ automata (конечные автоматы ДКА/НКА)', 'implemented', 'rust-pr-190', 'Инструменты холста pkg:automata-state / pkg:automata-edge, каталог TIKZ_LIBRARIES и студия EXT-12'],
  ['AI88-LIB-04', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ backgrounds (фоновые слои pgfonlayer)', 'implemented', 'rust-proposal', 'Включена в каталог TIKZ_LIBRARIES (5 статусов), Дерево фигуры и диспетчер слоёв P46 (MOD-08)'],
  ['AI88-LIB-05', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ calc (координатные выражения ($...$) и проекции)', 'implemented', 'rust-main', 'В каталоге N2, мастере перпендикуляров P37 и диагностике'],
  ['AI88-LIB-06', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ circuits.ee.IEC (штатные электротехнические УГО МЭК)', 'implemented', 'rust-proposal', 'Включена в каталог TIKZ_LIBRARIES с матрицей 5 статусов, преамбулой и справкой F1 (MOD-08)'],
  ['AI88-LIB-07', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ decorations.pathmorphing (волны snake, зигзаги пружин, катушки coil)', 'implemented', 'rust-proposal', 'Инструменты холста pkg:physics-spring / pkg:physics-wave, декорации P39 и каталог 5 статусов'],
  ['AI88-LIB-08', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ decorations.pathreplacing (фигурные скобки brace)', 'implemented', 'rust-proposal', 'В каталоге TIKZ_LIBRARIES, декорациях P39 и автофиксе диагностики P17'],
  ['AI88-LIB-09', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ fit (охватывающие контуры вокруг групп узлов)', 'implemented', 'rust-main', 'Включена в каталог N2 и матрицу 5 статусов'],
  ['AI88-LIB-10', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ graphdrawing (автоукладка графов — требует LuaLaTeX, кейс #68)', 'implemented', 'rust-main', 'Честно маркируется как несовместимая с профилем XeLaTeX в TIKZ_LIBRARIES и EXTENSION_MANIFESTS'],
  ['AI88-LIB-11', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ graphs (декларативный синтаксис графов \\graph)', 'implemented', 'rust-proposal', 'Включена в каталог TIKZ_LIBRARIES с матрицей 5 статусов, преамбулой и справкой F1 (MOD-08)'],
  ['AI88-LIB-12', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ intersections (именованные пересечения путей name intersections)', 'implemented', 'rust-proposal', 'Включена в каталог TIKZ_LIBRARIES и решатель пересечений P37'],
  ['AI88-LIB-13', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ matrix (матричная раскладка узлов matrix of math nodes)', 'implemented', 'rust-proposal', 'Включена в каталог TIKZ_LIBRARIES с матрицей 5 статусов и преамбулой (MOD-08)'],
  ['AI88-LIB-14', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ mindmap (иерархические интеллект-карты, кейс #24)', 'implemented', 'rust-proposal', 'Включена в каталог TIKZ_LIBRARIES с матрицей 5 статусов и преамбулой (MOD-08)'],
  ['AI88-LIB-15', 'ai88-packages-libs', 'REQ', 'Библиотека optics пакета tikz-optics ([use optics])', 'implemented', 'rust-pr-190', 'Включена в каталог TIKZ_LIBRARIES, инструмент холста pkg:optics-lens и студию EXT-11'],
  ['AI88-LIB-16', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ patterns (векторные штриховки сечений)', 'implemented', 'rust-proposal', 'Инструмент холста pkg:mechanics-support, штриховки ГОСТ P38 и каталог TIKZ_LIBRARIES'],
  ['AI88-LIB-17', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ petri (сети Петри: позиции place и переходы transition)', 'implemented', 'rust-pr-190', 'Включена в каталог TIKZ_LIBRARIES и студию EXT-12'],
  ['AI88-LIB-18', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ positioning (относительное размещение узлов right=of)', 'implemented', 'rust-main', 'Включена в каталог N2 и матрицу 5 статусов'],
  ['AI88-LIB-19', 'ai88-packages-libs', 'REQ', 'Библиотека quantikz2 (современное ядро пакета quantikz)', 'implemented', 'rust-pr-190', 'Включена в каталог TIKZ_LIBRARIES (MOD-08) и студию EXT-08'],
  ['AI88-LIB-20', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ quotes (короткие подписи дуг и углов в кавычках)', 'implemented', 'rust-proposal', 'Включена в каталог TIKZ_LIBRARIES (5 статусов) и угловые дуги P21 (MOD-08)'],
  ['AI88-LIB-21', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ shapes.callouts (выносные облака и плашки аннотаций, кейс #26)', 'implemented', 'rust-proposal', 'Включена в каталог TIKZ_LIBRARIES с матрицей 5 статусов и преамбулой (MOD-08)'],
  ['AI88-LIB-22', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ shapes.gates.logic.US (логические вентили И/ИЛИ/НЕ, кейс #40)', 'implemented', 'rust-proposal', 'Включена в каталог TIKZ_LIBRARIES с матрицей 5 статусов и преамбулой (MOD-08)'],
  ['AI88-LIB-23', 'ai88-packages-libs', 'REQ', 'Библиотека TikZ shapes.geometric (ромбы условий, трапеции, эллипсы)', 'implemented', 'rust-proposal', 'В каталоге TIKZ_LIBRARIES и генераторе блок-схем ГОСТ 19.701 (F15)'],
];

const AI88_RAW_CASES: [string, string, string, string, ImplementationStatus, string][] = [
  ['01', 'Геометрия', 'euclidean-circumcircle', 'tkz-euclide', 'partial', 'Есть пресет описанной окружности в студии EXT-09; полная верификация S4 не проводилась'],
  ['02', 'Механика', 'projectile-model', 'tikz + arrows.meta', 'partial', 'Строится примитивами N1 и аналитическим плоттером P44; отдельный fixture S4 в очереди'],
  ['03', 'Оптика', 'refraction-interface', 'tikz + angles,quotes', 'partial', 'Собирается примитивами N1 + дугой угла P21; предметный инвариант Снеллиуса S4 в очереди'],
  ['04', 'Квантовая физика', 'energy-transitions', 'tikz + calc', 'implemented', 'Реализован пресет диаграммы уровней Яблонского / переходов (P52)'],
  ['05', 'Электротехника', 'rc-circuit', 'circuitikz', 'implemented', 'Реализовано в студии EXT-02 и конструкторе цепей F12'],
  ['06', 'Химия', 'chemical-structure', 'chemfig', 'implemented', 'Реализовано в студии EXT-04 (chemfig)'],
  ['07', 'Графы и иерархии', 'tree-forest', 'forest', 'implemented', 'Реализовано в студии EXT-06 (forest)'],
  ['08', 'Пространство', 'three-dimensional-frame', 'tikz-3dplot', 'implemented', 'Реализовано в студии EXT-05 (tikz-3dplot) и проекторе P54'],
  ['09', 'Научные данные', 'scientific-plot', 'pgfplots', 'implemented', 'Реализовано в студии EXT-01 и инспекторе осей P27'],
  ['10', 'Квантовые вычисления', 'quantum-circuit', 'quantikz', 'implemented', 'Реализовано в студии EXT-08 и пресетах P51'],
  ['11', 'Геометрия', 'triangle-incircle', 'tkz-euclide', 'partial', 'Поддержан пакет tkz-euclide в EXT-09; отдельный пресет вписанной окружности — предложение'],
  ['12', 'Геометрия', 'triangle-altitudes', 'tkz-euclide', 'implemented', 'Пресет высот и ортоцентра треугольника в EXT-09'],
  ['13', 'Геометрия', 'line-circle-intersections', 'tikz + intersections', 'implemented', 'Решатель пересечений прямой и окружности P37'],
  ['14', 'Геометрия', 'projection-calc', 'tikz + calc,angles', 'implemented', 'Опускание перпендикуляра ∟ с прямым углом в P37'],
  ['15', 'Геометрия', 'affine-transform', 'tikz', 'implemented', 'Поворот, отражение и масштабирование групп фигур P22'],
  ['16', 'Геометрия', 'polar-rose', 'tikz', 'partial', 'Полярная сетка F05 и полярная ось в EXT-01; отдельный адаптер полярной розы — предложение'],
  ['17', 'Алгоритмы и структуры', 'flowchart', 'tikz + shapes.geometric', 'implemented', 'Автоукладка блок-схем ГОСТ 19.701 в F15'],
  ['18', 'Графы и иерархии', 'finite-automaton', 'tikz + automata', 'implemented', 'Пресеты ДКА/НКА в EXT-12 и нотациях P55'],
  ['19', 'Графы и иерархии', 'petri-net', 'tikz + petri', 'implemented', 'Пресет сети Петри с фишками в EXT-12'],
  ['20', 'Графы и иерархии', 'graph-cycle', 'tikz + graphs', 'proposal', 'Описание-предложение в ведомости AI88 (библиотека graphs)'],
  ['21', 'Математические структуры', 'commutative-square', 'tikz-cd', 'implemented', 'Пресет коммутативного квадрата и Pullback в EXT-03 и P55'],
  ['22', 'Математические структуры', 'exact-sequence', 'tikz-cd', 'implemented', 'Пресет короткой точной последовательности в EXT-03'],
  ['23', 'Графы и иерархии', 'syntax-tree', 'forest', 'implemented', 'Пресет синтаксического дерева разбора AST в EXT-06'],
  ['24', 'Алгоритмы и структуры', 'mind-map', 'tikz + mindmap', 'proposal', 'Описание-предложение в ведомости AI88 (библиотека mindmap)'],
  ['25', 'Алгоритмы и структуры', 'matrix-dataflow', 'tikz + matrix,fit', 'proposal', 'Описание-предложение в ведомости AI88 (связка matrix + fit)'],
  ['26', 'Типографика и оформление', 'layered-annotations', 'tikz + backgrounds,fit,shapes.callouts', 'partial', 'Слои P46 и полки выносок P59 есть; облака shapes.callouts — предложение'],
  ['27', 'Типографика и оформление', 'patterns-clipping', 'tikz + patterns', 'partial', 'Штриховки ГОСТ patterns P38 реализованы; произвольный \\clip — предложение'],
  ['28', 'Типографика и оформление', 'brace-dimensions', 'tikz + decorations.pathreplacing', 'implemented', 'Фигурные скобки brace P39 и размерные выноски P21'],
  ['29', 'Механика', 'spring-mass', 'tikz + decorations.pathmorphing', 'implemented', 'Штамп пружины P25 и декорации zigzag/coil P39'],
  ['30', 'Механика', 'pendulum', 'tikz', 'partial', 'Собирается из опоры ГОСТ P77, нити и груза N1; специализированный пресет маятника — предложение'],
  ['31', 'Механика', 'inclined-plane', 'tikz', 'partial', 'Клинья P36 + опора P77 + векторы сил; специализированный адаптер — предложение'],
  ['32', 'Оптика', 'thin-lens', 'tikz', 'implemented', 'Параксиальный трассировщик тонкой линзы F13 и образец лазера'],
  ['33', 'Оптика', 'optics-components', 'tikz-optics', 'implemented', 'Интерферометр и оптический стол в студии EXT-11'],
  ['34', 'Научные данные', 'diffraction-sinc', 'pgfplots', 'implemented', 'Аналитическая функция sinc(x) дифракции на щели в плоттере P44'],
  ['35', 'Научные данные', 'damped-oscillation', 'pgfplots', 'implemented', 'Затухающие колебания в плоттере P44 и студии EXT-01'],
  ['36', 'Оптика', 'wavefronts', 'tikz', 'partial', 'Дуги F02 и фотонные волны snake P39; специализированный генератор фронтов Гюйгенса — предложение'],
  ['37', 'Электротехника', 'rlc-series', 'circuitikz', 'implemented', 'Последовательный/параллельный RLC-контур в EXT-02 и F12'],
  ['38', 'Электротехника', 'opamp-feedback', 'circuitikz', 'implemented', 'Инвертирующий каскад на ОУ в студии EXT-02'],
  ['39', 'Электротехника', 'diode-rectifier', 'circuitikz', 'partial', 'Диод есть в конструкторе F12 и мостовой схеме EXT-02; отдельный пресет выпрямителя — предложение'],
  ['40', 'Электротехника', 'logic-gates', 'tikz + shapes.gates.logic.US', 'proposal', 'Описание-предложение в ведомости AI88 (логические вентили)'],
  ['41', 'Электротехника', 'iec-circuit', 'tikz + circuits.ee.IEC', 'proposal', 'Описание-предложение в ведомости AI88 (штатная библиотека circuits.ee.IEC)'],
  ['42', 'Инженерные схемы', 'feedback-control', 'tikz + positioning', 'implemented', 'Структурная схема замкнутого контура ТАУ W(s) с сумматором в P53'],
  ['43', 'Химия', 'benzene', 'chemfig', 'implemented', 'Ароматическое бензольное кольцо в EXT-04 и P52'],
  ['44', 'Химия', 'reaction-scheme', 'chemfig', 'implemented', 'Каталитическая схема реакции \\schemestart…\\schemestop в EXT-04'],
  ['45', 'Химия', 'balanced-reaction', 'tikz + mhchem', 'implemented', 'Уравнения реакций с \\ce{...} в студии EXT-04'],
  ['46', 'Квантовые вычисления', 'quantum-measurement', 'quantikz', 'implemented', 'Квантовое измерение \\meter{} в EXT-08 и P51'],
  ['47', 'Квантовые вычисления', 'quantum-swap', 'quantikz', 'partial', 'Ядро quantikz в EXT-08 поддержано; отдельный пресет вентиля \\swap — предложение'],
  ['48', 'Научные данные', 'error-bars', 'pgfplots', 'implemented', 'Серии с планками погрешностей error bars в EXT-01 и F16'],
  ['49', 'Научные данные', 'loglog-convergence', 'pgfplots', 'partial', 'Логарифмический режим осей поддержан в P27; отдельный пресет сходимости loglogaxis — предложение'],
  ['50', 'Научные данные', 'confidence-band', 'pgfplots', 'implemented', 'Коридор доверительного интервала ±σ в EXT-01 (fillbetween), P57 и F16'],
  ['51', 'Научные данные', 'grouped-bars', 'pgfplots', 'proposal', 'Описание-предложение в ведомости AI88 (сгруппированные столбчатые диаграммы ybar)'],
  ['52', 'Научные данные', 'histogram', 'pgfplots', 'implemented', 'Гистограмма частот выборки в мастерской статистики F16'],
  ['53', 'Научные данные', 'boxplot', 'pgfplots', 'implemented', 'Ящик с усами BoxPlot (медиана, IQR, выбросы) в мастерской F16'],
  ['54', 'Научные данные', 'heatmap', 'pgfplots', 'proposal', 'Описание-предложение в ведомости AI88 (тепловая карта matrix plot)'],
  ['55', 'Научные данные', 'surface-gaussian', 'pgfplots', 'implemented', '3D-поверхность \\addplot3[surf] в студии EXT-01'],
  ['56', 'Научные данные', 'parametric-helix', 'pgfplots', 'proposal', 'Описание-предложение в ведомости AI88 (3D параметрическая спираль)'],
  ['57', 'Научные данные', 'vector-field', 'pgfplots', 'implemented', 'Генератор векторных полей и фазовых портретов quiver P45'],
  ['58', 'Научные данные', 'discontinuous-function', 'pgfplots', 'proposal', 'Описание-предложение в ведомости AI88 (разрыв функции unbounded coords=jump)'],
  ['59', 'Научные данные', 'group-plots', 'pgfplots', 'implemented', 'Матрица субграфиков \\begin{groupplot}[2×2] в студии EXT-01'],
  ['60', 'Научные данные', 'table-derived-column', 'pgfplotstable + booktabs', 'partial', 'Таблицы booktabs+siunitx реализованы в P79; вычисляемые столбцы pgfplotstable — предложение'],
  ['61', 'Научные данные', 'bode-magnitude', 'pgfplots', 'proposal', 'Описание-предложение в ведомости AI88 (ЛАЧХ Боде)'],
  ['62', 'Пространство', 'cube-hidden-edges', 'tikz-3dplot', 'implemented', '3D-проекция куба с пунктирными невидимыми рёбрами в P54'],
  ['63', 'Пространство', 'spherical-coordinates', 'tikz-3dplot', 'implemented', 'Сферический радиус-вектор и дуги углов θ, φ в EXT-05 и P54'],
  ['64', 'Математические структуры', 'variation-table', 'tkz-tab', 'proposal', 'Описание-предложение в ведомости AI88 (таблица вариаций tkz-tab)'],
  ['65', 'Геометрия', 'lua-midpoint', 'tkz-euclide + tkz-elements', 'proposal', 'Описание-предложение (требует движок LuaLaTeX)'],
  ['66', 'Графы и иерархии', 'network-weighted', 'tikz-network', 'implemented', 'Взвешенный сетевой граф в студии EXT-09'],
  ['67', 'Графы и иерархии', 'tkz-graph-triangle', 'tkz-graph', 'proposal', 'Описание-предложение в ведомости AI88 (пакет tkz-graph)'],
  ['68', 'Графы и иерархии', 'lua-graph-layout', 'tikz + graphdrawing', 'proposal', 'Описание-предложение (требует LuaLaTeX; в профиле XeLaTeX честно блокируется)'],
  ['69', 'Механика', 'physics-native-block', 'tikzphysics', 'proposal', 'Описание-предложение в ведомости AI88 (пакет tikzphysics)'],
  ['70', 'Механика', 'physketch-force', 'physketch', 'proposal', 'Описание-предложение в ведомости AI88 (пакет physketch)'],
  ['71', 'Оптика', 'simpleoptics-lenses', 'simpleoptics', 'proposal', 'Описание-предложение в ведомости AI88 (пакет simpleoptics)'],
  ['72', 'Оптика', 'optikz-delay', 'optikz', 'proposal', 'Описание-предложение в ведомости AI88 (пакет optikz)'],
  ['73', 'Оптика', 'hydrogen-spectrum', 'pgf-spectra', 'proposal', 'Описание-предложение в ведомости AI88 (спектр водорода pgf-spectra)'],
  ['74', 'Оптика', 'double-slit-pattern', 'pgf-interference', 'proposal', 'Описание-предложение в ведомости AI88 (интерференция Юнга pgf-interference)'],
  ['75', 'Квантовая физика', 'feynman-scattering', 'tikz-feynman', 'implemented', 'КЭД вершина рассеяния с явными координатами под XeLaTeX в EXT-08 и P51'],
  ['76', 'Квантовая физика', 'feynhand-vertex', 'tikz-feynhand', 'proposal', 'Описание-предложение в ведомости AI88 (пакет tikz-feynhand)'],
  ['77', 'Квантовые вычисления', 'bloch-state', 'blochsphere', 'partial', 'Сфера Блоха реализована в EXT-05 через tikz-3dplot; адаптер пакета blochsphere — предложение'],
  ['78', 'Электротехника', 'timing-bus', 'tikz-timing', 'implemented', 'Временные диаграммы шин SPI / I²C / AXI в студии EXT-10'],
  ['79', 'Инженерные схемы', 'structmech-forces', 'structmech', 'proposal', 'Описание-предложение в ведомости AI88 (пакет structmech)'],
  ['80', 'Инженерные схемы', 'stanli-beam', 'stanli', 'implemented', 'Расчётная схема балки stanli в EXT-11 + эпюры Q/M в F14'],
  ['81', 'Инженерные схемы', 'kinematic-chain', 'kinematikz', 'proposal', 'Описание-предложение в ведомости AI88 (пакет kinematikz)'],
  ['82', 'Инженерные схемы', 'engineering-dimline', 'tikz-dimline', 'partial', 'Размерные выноски ГОСТ P21 есть; прямой адаптер пакета tikz-dimline — предложение'],
  ['83', 'Технологические процессы', 'pid-pump', 'chempid', 'proposal', 'Описание-предложение в ведомости AI88 (схемы КИПиА chempid)'],
  ['84', 'Технологические процессы', 'chemical-plant', 'chemplants', 'proposal', 'Описание-предложение в ведомости AI88 (пакет chemplants)'],
  ['85', 'Химия', 'hydrogen-orbitals', 'modiagram', 'proposal', 'Описание-предложение в ведомости AI88 (молекулярные орбитали modiagram)'],
  ['86', 'Пространство', 'lua-surface', 'lua-tikz3dtools', 'proposal', 'Описание-предложение (требует движок LuaLaTeX)'],
  ['87', 'Планирование и коммуникация', 'gantt-project', 'pgfgantt', 'implemented', 'Диаграмма Ганта НИОКР в студии EXT-07 и мастерской F15'],
  ['88', 'Планирование и коммуникация', 'pie-composition', 'pgf-pie', 'proposal', 'Описание-предложение в ведомости AI88 (круговые диаграммы pgf-pie)'],
];

const AI88_CASES_ROWS: RawTuple[] = AI88_RAW_CASES.map(
  ([num, domain, stem, pkgs, stStatus, note]) => [
    `AI88-CASE-${num}`,
    'ai88-cases',
    'REQ',
    `Кейс AI88 #${num} (${domain}): ${stem} [${pkgs}]`,
    stStatus,
    'rust-proposal',
    note,
  ]
);

const STUDIO_FE_ROWS: RawTuple[] = [
  // N1 Core 6 primitives
  ['N1-01', 'studio-fe', 'FE', 'Примитив N1 «Отрезок» (tikz.line · хоткей L)', 'implemented', 'rust-main', 'Жест мыши, ручки концов, инспектор и JSONL tool.gesture'],
  ['N1-02', 'studio-fe', 'FE', 'Примитив N1 «Стрелка» (tikz.arrow · хоткей A · arrows.meta)', 'implemented', 'rust-main', 'Наконечники Stealth/Latex и автоподключение arrows.meta'],
  ['N1-03', 'studio-fe', 'FE', 'Примитив N1 «Прямоугольник» (tikz.rectangle · хоткей R)', 'implemented', 'rust-main', 'Жест по двум углам, 4 угловые ручки, скругления'],
  ['N1-04', 'studio-fe', 'FE', 'Примитив N1 «Окружность» (tikz.circle · хоткей C)', 'implemented', 'rust-main', 'Центр и строго положительный радиус с защитой > 0'],
  ['N1-05', 'studio-fe', 'FE', 'Примитив N1 «Узел текста/формулы» (tikz.node · хоткей N)', 'implemented', 'rust-main', 'Режимы text/math, быстрый редактор двойным кликом'],
  ['N1-06', 'studio-fe', 'FE', 'Примитив N1 «Кубическая кривая Безье» (tikz.bezier-cubic · хоткей K)', 'implemented', 'rust-main', 'Два рычага касательных control1 и control2'],

  // P01..P80
  ['P01', 'studio-fe', 'FE', 'Интерактивные узловые ручки изменения размеров и касательных Безье на холсте', 'implemented', 'rust-proposal', 'ergonomicsBundle.ts + CanvasStage.tsx'],
  ['P02', 'studio-fe', 'FE', 'Умные направляющие выравнивания (Smart Snap Guides) к центрам и краям фигур', 'implemented', 'rust-proposal', 'computeSmartSnap в ergonomicsBundle.ts'],
  ['P03', 'studio-fe', 'FE', 'Рамочное мультивыделение (Marquee Lasso) и пакетное выравнивание/распределение 8 режимов', 'implemented', 'rust-proposal', 'alignOwnedPrimitivesInSource + рельс холста'],
  ['P04', 'studio-fe', 'FE', 'Плавное панорамирование холста (Пробел+мышь / средняя кнопка) и масштабирование 50%–250%', 'implemented', 'rust-proposal', 'CanvasStage.tsx'],
  ['P05', 'studio-fe', 'FE', 'Сантиметровые линейки с отрицательными квадрантами и измеритель «Линейка-транспортир» (Δx, Δy, L, ∠)', 'implemented', 'rust-proposal', 'Инструмент рулетки и оси координат в CanvasStage.tsx'],
  ['P06', 'studio-fe', 'FE', 'Управление порядком наложения Z-Order (на передний/задний план) внутри tikzpicture', 'implemented', 'rust-proposal', 'reorderOwnedPrimitiveInSource'],
  ['P07', 'studio-fe', 'FE', 'Визуальные стили примитивов (толщина штриха, пунктир, цвет контура и заливки, скругление углов)', 'implemented', 'rust-proposal', 'Инспектор стилей + валидация в tikzEngine.ts'],
  ['P08', 'studio-fe', 'FE', 'Якоря позиционирования узлов (above/below/left/right), быстрые матсимволы и inline-правка по двойному клику', 'implemented', 'rust-proposal', 'CanvasStage.tsx + InspectorAndHelpPane.tsx'],
  ['P09', 'studio-fe', 'FE', 'Умные логические коннекторы между именованными узлами (from_node → to_node)', 'implemented', 'rust-proposal', 'resolveSmartConnectorEndpoints'],
  ['P10', 'studio-fe', 'FE', 'Определение диапазона преамбулы и сворачивание шапки документа (Code Folding)', 'implemented', 'rust-proposal', 'detectPreambleFoldRange + двухоконный редактор'],
  ['P11', 'studio-fe', 'FE', 'Контекстное автодополнение команд LaTeX/TikZ и пользовательских макросов \\newcommand (Ctrl+Space)', 'implemented', 'rust-proposal', 'getTexAutocompleteSuggestions в TexSourceEditor.tsx'],
  ['P12', 'studio-fe', 'FE', 'Двустороннее принятие чистого кода TikZ под управление холста (Adopt → n1) и отвязка (Detach)', 'implemented', 'rust-proposal', 'detectAdoptableTikzLines / adoptRawTikzLineIntoN1'],
  ['P13', 'studio-fe', 'FE', 'Построчный структурный предпросмотр изменений (Diff) и шкала истории ревизий', 'implemented', 'rust-proposal', 'RevisionHistoryDiffModal'],
  ['P14', 'studio-fe', 'FE', 'Режим полупрозрачной кальки (Onion-Skin) поверх эскиза для сверки геометрии', 'implemented', 'rust-proposal', 'Оверлей кальки в CanvasStage.tsx'],
  ['P15', 'studio-fe', 'FE', 'Опциональная автоматическая пересборка на паузе ввода (Live Auto-Build 900 мс)', 'partial', 'rust-proposal', 'Таймер дебаунса работает в App.tsx (сборка в стенде смоделирована)'],
  ['P16', 'studio-fe', 'FE', 'Мастер чистого публикационного экспорта (чистый .tex для Overleaf без % tikzarium:n1:, SVG, PNG DPI)', 'implemented', 'rust-proposal', 'PublicationExportModal + stripOwnershipMarkersForExport'],
  ['P17', 'studio-fe', 'FE', 'Исправление типовых ошибок XeLaTeX в 1 клик (Quick Fix: arrows.meta, fontspec, пропущенная ; и незакрытый $)', 'implemented', 'rust-proposal', 'applyDiagnosticQuickFix + studioControlApi editor.quickfix'],
  ['P18', 'studio-fe', 'FE', 'Мониторинг внешних изменений файла на диске с выбором «Принять с диска / Оставить буфер»', 'partial', 'rust-proposal', 'Маршрут /api/fs/watch-status и баннер конфликта в стенде (демонстрационный триггер)'],
  ['P19', 'studio-fe', 'FE', 'Импорт таблиц CSV/TSV и Drag-and-Drop файлов (.tex, .csv → PGFPlots, .png → подложка кальки)', 'implemented', 'rust-proposal', 'convertCsvToPgfplotsDocument + обработчик Drag-and-Drop окна'],
  ['P20', 'studio-fe', 'FE', 'Персистентное хранилище настроек рабочей среды, недавних файлов и личной полки заготовок (Snippets)', 'implemented', 'rust-proposal', 'loadEframeStorage / saveEframeStorage + WorkspaceSnippetsAndOsModal'],
  ['P21', 'studio-fe', 'FE', 'Машиностроительные размерные выноски ГОСТ |<->| и обозначения плоских углов ∠α', 'implemented', 'rust-proposal', 'scientificCadBundle.ts + рендеринг выносок на холсте'],
  ['P22', 'studio-fe', 'FE', 'Геометрические преобразования выделенных объектов: поворот на угол, зеркало X/Y и масштабирование', 'implemented', 'rust-proposal', 'rotate / mirror / scaleOwnedPrimitivesInSource'],
  ['P23', 'studio-fe', 'FE', 'Генератор параметрических линейных и круговых массивов \\foreach', 'implemented', 'rust-proposal', 'generateForeachArrayInSource'],
  ['P24', 'studio-fe', 'FE', 'Конвертер полярных (θ:r) и относительных (++dx,dy) координат TikZ', 'implemented', 'rust-proposal', 'scientificCadBundle.ts'],
  ['P25', 'studio-fe', 'FE', 'Библиотека параметрических научных штампов (линзы, зеркала, резисторы, пружины, заделки)', 'implemented', 'rust-proposal', 'insertScientificStampIntoSource'],
  ['P26', 'studio-fe', 'FE', 'Ортогональная трассировка соединителей (прямая --, Г-образные манхэттенские трассы |- и -|)', 'implemented', 'rust-proposal', 'Ключ path_mode в Инспекторе и CanvasStage'],
  ['P27', 'studio-fe', 'FE', 'Визуальный конструктор параметров осей PGFPlots \\begin{axis} (подписи, сетка, легенда, шкалы)', 'implemented', 'rust-proposal', 'upsertPgfplotsAxisInSource'],
  ['P28', 'studio-fe', 'FE', 'Калибр ширины колонки научного журнала (Nature 89 мм,APS 86 мм, IEEE, ГОСТ 170 мм) и контроль кегля', 'implemented', 'rust-proposal', 'JOURNAL_COLUMN_GAUGES + вертикальная граница на холсте'],
  ['P29', 'studio-fe', 'FE', 'Дальтоник-безопасная научная палитра Okabe–Ito (\\definecolor) и экранная цветопроба Ч/Б печати / дейтеранопии', 'implemented', 'rust-proposal', 'ensureDefineColorInPreamble + фильтры цветопробы холста'],
  ['P30', 'studio-fe', 'FE', 'Двусторонний переход кликом с листа PDF на строку исходного кода .tex (резолвер SyncTeX)', 'partial', 'rust-proposal', 'Алгоритм сопоставления координат работает в стенде; вызов бинарного synctex — в Rust чертеже'],
  ['P31', 'studio-fe', 'FE', 'Единый стилевой паспорт серии иллюстраций статьи (shared_style.tikz)', 'implemented', 'rust-proposal', 'injectSharedStyleIntoDocument'],
  ['P32', 'studio-fe', 'FE', 'Компоновщик многопанельных рисунков рукописи с подписями (а), (б), (в) (subfigure)', 'implemented', 'rust-proposal', 'ArticleProjectModal + scientificCadBundle.ts'],
  ['P33', 'studio-fe', 'FE', 'Пакетный аудитор и профилировщик комплекта фигур проекта статьи', 'implemented', 'rust-proposal', 'scientificCadBundle.ts'],
  ['P34', 'studio-fe', 'FE', 'Контекстное меню правой кнопки мыши на холсте и примитивах с учётом активной цветовой темы', 'implemented', 'rust-proposal', 'CanvasStage.tsx (семантические токены всех 4 тем)'],
  ['P35', 'studio-fe', 'FE', 'Прямая вставка табличных колонок из буфера Excel / LibreOffice Calc (TSV) в кривую или \\addplot', 'implemented', 'rust-proposal', 'parseClipboardTableToSource'],
  ['P36', 'studio-fe', 'FE', 'Многовершинные ломаные и замкнутые полигоны (-- cycle: призмы, клинья, апертуры)', 'implemented', 'rust-proposal', 'insertPolygonContourIntoSource + инструмент Полигон на рельсе'],
  ['P37', 'studio-fe', 'FE', 'Геометрический решатель точных пересечений (∩) и перпендикуляров (⊥) с маркером прямого угла', 'implemented', 'rust-proposal', 'constructIntersectionOrPerpendicularInSource'],
  ['P38', 'studio-fe', 'FE', 'Векторные штриховки сечений по ГОСТ 2.306 (металл 45°, керамика крест, грунт/стекло)', 'implemented', 'rust-proposal', 'SVG pattern на холсте + генерация patterns в TikZ'],
  ['P39', 'studio-fe', 'FE', 'Декорации путей: фигурные скобки brace, фотонные волны snake, пружины zigzag и индуктивности coil', 'implemented', 'rust-proposal', 'PATH_DECORATION_SPECS + рендеринг на холсте'],
  ['P40', 'studio-fe', 'FE', 'Менеджер параметрических переменных преамбулы \\pgfmathsetmacro с живыми ползунками', 'implemented', 'rust-proposal', 'upsertPgfMathMacroInSource в AdvancedCadAndLayersModal'],
  ['P41', 'studio-fe', 'FE', 'Прямой скруббер числовых литералов с единицами в исходнике .tex (Alt+колесо / кнопки ±шаг)', 'implemented', 'rust-proposal', 'scrubNumericTokenAtCaret в TexSourceEditor.tsx'],
  ['P42', 'studio-fe', 'FE', 'Конструктор физических величин и прямых единиц СИ (ГОСТ 8.417 / пакет siunitx) + линтер курсивных единиц', 'implemented', 'rust-proposal', 'advancedCadBundle.ts + диагностика в tikzEngine.ts'],
  ['P43', 'studio-fe', 'FE', 'Оцифровщик растровых сканов графиков и осциллограмм по 2 реперным точкам осей', 'implemented', 'rust-proposal', 'mapCanvasPointsToPhysical + insertDigitizedCurveIntoSource'],
  ['P44', 'studio-fe', 'FE', 'Аналитический плоттер функций F(x) (Гаусс, Лоренц, sinc, затухание) с защитой от Dimension too large', 'implemented', 'rust-proposal', 'insertAnalyticalPlotIntoSource'],
  ['P45', 'studio-fe', 'FE', 'Генератор векторных полей и фазовых портретов (стрелочная сетка quiver E, B, v)', 'implemented', 'rust-proposal', 'insertVectorFieldIntoSource'],
  ['P46', 'studio-fe', 'FE', 'Диспетчер слоёв \\begin{scope} (bg, main, annotations) с блокировкой Lock и скрытием Hide на холсте', 'implemented', 'rust-proposal', 'hiddenLayers / lockedLayers в App и CanvasStage'],
  ['P47', 'studio-fe', 'FE', 'Пошаговый инспектор кадров презентаций Beamer (\\onslide<n->) прямо на холсте', 'implemented', 'rust-proposal', 'activeBeamerSlide + пошаговая фильтрация на холсте'],
  ['P48', 'studio-fe', 'FE', 'Генератор обёртки \\begin{figure}[htbp] с \\caption и \\label для рукописей IEEE / REVTeX / ГОСТ', 'implemented', 'rust-proposal', 'PublicationExportModal'],
  ['P49', 'studio-fe', 'FE', 'Перетаскиваемые мышью вертикальные сплиттеры 3 панелей студии (24-колоночная сетка) с автосохранением', 'implemented', 'rust-proposal', 'clampSplitterColumns + splitterDragRef в App.tsx'],
  ['P50', 'studio-fe', 'BLUEPRINT', 'Сводная архитектурная витрина совместимости решений со стеком eframe/egui = 0.33.3', 'implemented', 'rust-proposal', 'Вкладка EguiNativeBlueprintView (справочная спецификация для Rust)'],
  ['P51', 'studio-fe', 'FE', 'Пресеты квантовых цепей и пропагаторов Фейнмана (КЭД / КХД)', 'implemented', 'rust-proposal', 'scientificNotationsAndAuditBundle.ts'],
  ['P52', 'studio-fe', 'FE', 'Энергетические диаграммы уровней Яблонского и органические циклы', 'implemented', 'rust-proposal', 'scientificNotationsAndAuditBundle.ts'],
  ['P53', 'studio-fe', 'FE', 'Контуры теории автоматического управления (ТАУ) и звенья ЦОС z⁻¹', 'implemented', 'rust-proposal', 'scientificNotationsAndAuditBundle.ts'],
  ['P54', 'studio-fe', 'FE', '3D-аксонометрический и сферический проектор базиса (ГОСТ 2.317 / tikz-3dplot → n1)', 'implemented', 'rust-proposal', 'project3dPointTo2dCm + insert3dProjectedSceneIntoSource'],
  ['P55', 'studio-fe', 'FE', 'Нотации конечных автоматов и коммутативных квадратов', 'implemented', 'rust-proposal', 'scientificNotationsAndAuditBundle.ts'],
  ['P56', 'studio-fe', 'FE', 'САПР-решатель касательных скруглений углов (Fillet R) и плоских фасок (Chamfer) между двумя отрезками', 'implemented', 'rust-proposal', 'constructFilletOrChamferInSource'],
  ['P57', 'studio-fe', 'FE', 'Заливка площади между двумя кривыми и доверительного коридора ±σ на фоновом слое', 'implemented', 'rust-proposal', 'insertFillBetweenCurvesIntoSource'],
  ['P58', 'studio-fe', 'FE', 'Интерактивный выносной элемент-лупа увеличенного узла (\\usetikzlibrary{spy} / ГОСТ 2.305)', 'implemented', 'rust-proposal', 'insertSpyMagnifierInsetIntoSource'],
  ['P59', 'studio-fe', 'FE', 'Патентные и конструкторские позиционные выноски-полки (1, 2, 3… по ГОСТ 2.316) со сборкой экспликации', 'implemented', 'rust-proposal', 'insertPositionalLeaderShelfIntoSource'],
  ['P60', 'studio-fe', 'FE', 'Радиальное кольцевое Pie-меню из 8 секторов на холсте без inline-стилей', 'implemented', 'rust-proposal', 'Геометрия кольцевых секторов в CanvasStage.tsx'],
  ['P61', 'studio-fe', 'FE', 'Инструмент «Пипетка стиля» (Style Passport): копирование и пакетное применение оформления между фигурами', 'implemented', 'rust-proposal', 'extractStylePassport / applyStylePassportToPrimitivesInSource'],
  ['P62', 'studio-fe', 'FE', 'Табличный реестр всех объектов сцены (Spreadsheet Outliner) с пакетной правкой координат и слоёв', 'implemented', 'rust-proposal', 'applySpreadsheetCellEditInSource'],
  ['P63', 'studio-fe', 'FE', 'Живой типографический шейпер формул на холсте (индексы SVG <tspan>, греческий алфавит, прямые единицы СИ)', 'implemented', 'rust-proposal', 'shapeMathLabelRuns в CanvasStage.tsx'],
  ['P64', 'studio-fe', 'FE', 'Геометрический и визуальный пре-принт линтер (коллизии подписей BBox, вылет за колонку, кириллические омоглифы в $...$)', 'implemented', 'rust-proposal', 'runVisualPreSubmissionAudit + автоисправление омоглифов'],
  ['P65', 'studio-fe', 'FE', 'Портативный JSON-пакет полной рабочей сессии .tikzproj для переноса между Linux и Windows 10', 'implemented', 'rust-proposal', 'serializeTikzprojSession / parseTikzprojSession'],
  ['P66', 'studio-fe', 'FE', 'AST-безопасный автоформатер кода TikZ/LaTeX с защитой % tikzarium:n1:, verbatim и CRLF', 'implemented', 'rust-pr-190', 'formatTikzDocumentSource + editor.format в Control API'],
  ['P67', 'studio-fe', 'FE', 'Пакетный конвертер единиц измерения и нормализатор координат документа (cm ↔ mm ↔ pt)', 'implemented', 'rust-proposal', 'convertDocumentUnitsInSource'],
  ['P68', 'studio-fe', 'FE', 'DRY-экстрактор повторяющихся визуальных опций в именованный стиль \\tikzset преамбулы', 'implemented', 'rust-proposal', 'extractRepeatedStyleToTikzset'],
  ['P69', 'studio-fe', 'FE', 'Органайзер преамбулы и безопасный детектор/очиститель неиспользуемых библиотек \\usetikzlibrary', 'implemented', 'rust-pr-190', 'cleanPreambleAndUnusedLibraries + preamble.clean_unused'],
  ['P70', 'studio-fe', 'FE', 'Защищённый пакетный Поиск и Замена с охраной служебных маркеров % tikzarium:n1:', 'implemented', 'rust-proposal', 'replaceAllSafeForN1 в formatterRefactorAndCadBundle.ts'],
  ['P71', 'studio-fe', 'FE', 'Подсветка парных скобок {} [] () и окружений \\begin…\\end под курсором с учётом комментариев и \\%', 'implemented', 'rust-proposal', 'findMatchingDelimiterOrEnvPair в TexSourceEditor.tsx'],
  ['P72', 'studio-fe', 'FE', 'Структурное оглавление документа .tex (Document Outline) с быстрым переходом к секциям и блокам', 'implemented', 'rust-pr-190', 'buildTexDocumentOutline + editor.outline'],
  ['P73', 'studio-fe', 'FE', 'Многострочные операции IDE в редакторе: переключение комментария Ctrl+/, сдвиг строк Alt+↑/↓ и выравнивание по &', 'implemented', 'rust-proposal', 'formatterRefactorAndCadBundle.ts + TexSourceEditor.tsx'],
  ['P74', 'studio-fe', 'FE', 'Параллельный отступ контура (эквидистанта Offset ±Δd см) для отрезков, прямоугольников, окружностей и полигонов', 'implemented', 'rust-pr-190', 'insertParallelOffsetContourIntoSource'],
  ['P75', 'studio-fe', 'FE', 'Гладкий интерполяционный сплайн Catmull–Rom → цепочка кубических кривых Безье C¹', 'implemented', 'rust-pr-190', 'insertCatmullRomSplineIntoSource'],
  ['P76', 'studio-fe', 'FE', 'Инструмент подрезки луча «Ножницы» (Trim) и дотягивания отрезка до секущей границы (Extend)', 'implemented', 'rust-proposal', 'trimOrExtendSegmentToBoundaryInSource'],
  ['P77', 'studio-fe', 'FE', 'Генератор гребёнки штриховки заделки, опоры и оптического зеркала по ГОСТ вдоль произвольного отрезка', 'implemented', 'rust-pr-190', 'insertGostSupportCombHatchIntoSource'],
  ['P78', 'studio-fe', 'FE', 'Векторный импортёр внешнего SVG (<line>, <rect>, <circle>, <polygon>, <path>) в примитивы n1 с инверсией оси Y', 'implemented', 'rust-proposal', 'importExternalSvgIntoSource'],
  ['P79', 'studio-fe', 'FE', 'Генератор академических таблиц booktabs + колонок siunitx S из CSV/TSV с выравниванием разделителей &', 'implemented', 'rust-pr-190', 'buildBooktabsTableLatex + workshop.booktabs_table'],
  ['P80', 'studio-fe', 'FE', 'Сборщик автономного однофайлового архива публикации с \\begin{filecontents*} для журналов и arXiv', 'implemented', 'rust-proposal', 'buildSingleFileBundleTex'],

  // E01..E08 Workspace Ergonomics
  ['E01', 'studio-fe', 'FE', 'Побайтово-точный двухоконный сплиттер .tex: Окно 1 «Преамбула» ↕ Окно 2 «Код рисунка»', 'implemented', 'rust-pr-190', 'splitTexDocumentIntoPreambleAndBody с сохранением LF/CRLF'],
  ['E02', 'studio-fe', 'FE', 'Единый поисковый хаб «Мастерские» (Ctrl+Shift+T) вместо россыпи модальных кнопок в тулбаре', 'implemented', 'rust-proposal', 'StudioWorkshopsHubModal.tsx'],
  ['E03', 'studio-fe', 'FE', 'Компактный вертикальный левый рельс CAD-инструментов шириной 38 px на холсте', 'implemented', 'rust-proposal', 'CanvasStage.tsx'],
  ['E04', 'studio-fe', 'FE', 'Однорядная шапка холста с поповером сетки/калибров/цветопробы без перегрузки высоты', 'implemented', 'rust-proposal', 'CanvasStage.tsx'],
  ['E05', 'studio-fe', 'FE', 'Чистые заголовки двух окон редактора со сквозной физической нумерацией строк 1…K и K+1…N', 'implemented', 'rust-proposal', 'TexSourceEditor.tsx'],
  ['E06', 'studio-fe', 'FE', 'Быстрые пресеты высоты окна преамбулы (Свёрнуто / Компакт / Баланс / Широко) + хоткей Alt+P', 'implemented', 'rust-pr-190', 'PreambleSplitterPresetId + preamble.toggle_collapse'],
  ['E07', 'studio-fe', 'FE', 'Ролевые профили рабочего места («Инженер 50/50», «Чертёж САПР», «Код + Преамбула», «Ноутбук 13″»)', 'implemented', 'rust-proposal', 'WORKSPACE_ROLE_PROFILES в тулбаре студии'],
  ['E08', 'studio-fe', 'FE', 'До 4 закрепляемых пользователем слотов избранных мастерских (★) на главной панели', 'implemented', 'rust-proposal', 'loadPinnedWorkshopIds / savePinnedWorkshopIds'],

  // F01..F16 Engineering Stages 2–4
  ['F01', 'studio-fe', 'FE', 'Срединные ручки рёбер полигона для вставки/удаления вершин в 1 клик и переключения -- cycle', 'implemented', 'rust-proposal', 'insertPolyVertexAtEdgeInSource / togglePolyClosedInSource'],
  ['F02', 'studio-fe', 'FE', 'Аналитическое построение круговой дуги по 3 точкам и повёрнутого эллипса в живых примитивах n1', 'implemented', 'rust-proposal', 'insertThreePointArcIntoSource / insertParametricEllipseIntoSource'],
  ['F03', 'studio-fe', 'FE', 'Топологическое автообновление координат связанных стрелок при перетаскивании узлов на холсте', 'implemented', 'rust-proposal', 'rerouteBoundConnectorsInSource'],
  ['F04', 'studio-fe', 'FE', 'Локальная группировка и разгруппировка примитивов на холсте (Ctrl+G / Ctrl+Shift+G)', 'implemented', 'rust-proposal', 'groupPrimitivesInSource / ungroupPrimitivesInSource'],
  ['F05', 'studio-fe', 'FE', 'Полярная (r–θ) и изометрическая (30°/60°) сетки холста с математической привязкой курсора', 'implemented', 'rust-proposal', 'snapPointToActiveGridMode + рендерер сеток CanvasStage'],
  ['F06', 'studio-fe', 'FE', 'Инженерные метрики выделенного контура (длина, периметр, площадь Гаусса, центроид с постановкой маркера)', 'implemented', 'rust-proposal', 'computeSelectionGeometryMetrics + insertCentroidMarkerIntoSource'],
  ['F07', 'studio-fe', 'FE', 'Живой мост пользовательских стилей \\tikzset между окном Преамбулы и селектором Инспектора', 'implemented', 'rust-proposal', 'extractTikzsetStylesFromPreamble + upsertTikzsetStyleInPreamble'],
  ['F08', 'studio-fe', 'FE', 'Детектор повторяющихся размеров («магических чисел») с выносом в константу \\pgfmathsetmacro преамбулы', 'implemented', 'rust-proposal', 'detectMagicNumberCandidates + parameterizeMagicNumberIntoMacro'],
  ['F09', 'studio-fe', 'FE', 'Калибровка масштаба всего чертежа по эталонному расстоянию между 2 точками', 'implemented', 'rust-proposal', 'calibrateSceneScaleByTwoPoints'],
  ['F10', 'studio-fe', 'FE', '2D булевы операции над контурами (∪, \\, ∩, ⊕) и аналитические общие касательные к окружностям', 'implemented', 'rust-proposal', 'booleanCombineTwoPrimitivesInSource + constructCircleTangentsInSource'],
  ['F11', 'studio-fe', 'FE', 'Визуальный Diff фигур на холсте и выборочный возврат одной конкретной фигуры из прошлой ревизии', 'implemented', 'rust-proposal', 'computeVisualPrimitiveDiff + revertSinglePrimitiveFromRevision'],
  ['F12', 'studio-fe', 'FE', 'Конструктор принципиальных электросхем ГОСТ ЕСКД и ANSI на сгруппированных живых примитивах n1', 'implemented', 'rust-proposal', 'insertElectricalCircuitComponentInSource'],
  ['F13', 'studio-fe', 'FE', 'Геометрическая оптика: параксиальная трассировка хода 3 главных лучей через тонкую линзу', 'implemented', 'rust-proposal', 'insertThinLensRayTraceInSource'],
  ['F14', 'studio-fe', 'FE', 'Строительная механика: расчётная схема балки с автоматическим построением эпюр Q(x) и M(x)', 'implemented', 'rust-proposal', 'insertBeamWithShearAndMomentDiagramsInSource'],
  ['F15', 'studio-fe', 'FE', 'Автоукладка блок-схем алгоритмов по ГОСТ 19.701 и научных диаграмм Ганта в n1', 'implemented', 'rust-proposal', 'insertGostFlowchartInSource / insertScientificGanttInSource'],
  ['F16', 'studio-fe', 'FE', 'Регрессия МНК (линейная/квадратичная/экспоненциальная + R² + коридор ±σ) и BoxPlot / Гистограмма', 'implemented', 'rust-proposal', 'insertOlsRegressionPlotInSource / insertStatisticalBoxOrHistInSource'],

  // EXT-01..EXT-12, Atomic Passport, PDF Manuals, Control API v2, GitHub OAuth & Ergonomics
  ['EXT-01', 'studio-fe', 'FE', 'Мастерская пакета PGFPlots 1.18 (2D, error bars, fillbetween, groupplots 2×2, polar, 3D surf)', 'implemented', 'rust-pr-190', 'tikzExtensionsSuite.ts + extension.insert'],
  ['EXT-02', 'studio-fe', 'FE', 'Мастерская пакета CircuiTikZ (ОУ, RLC, мост Уитстона, ключ MOSFET в стандартах ГОСТ и ANSI)', 'implemented', 'rust-pr-190', 'tikzExtensionsSuite.ts'],
  ['EXT-03', 'studio-fe', 'FE', 'Мастерская пакета tikz-cd (коммутативные квадраты, Pullback, точные последовательности, сопряжённые функторы)', 'implemented', 'rust-pr-190', 'tikzExtensionsSuite.ts'],
  ['EXT-04', 'studio-fe', 'FE', 'Мастерская пакетов chemfig + mhchem (ароматика, пептидная связь, каталитический цикл)', 'implemented', 'rust-pr-190', 'tikzExtensionsSuite.ts'],
  ['EXT-05', 'studio-fe', 'FE', 'Мастерская пакета tikz-3dplot (сферические оси Эйлера и квантовая сфера Блоха)', 'implemented', 'rust-pr-190', 'tikzExtensionsSuite.ts'],
  ['EXT-06', 'studio-fe', 'FE', 'Мастерская пакета forest (компактные деревья AST, таксономии и разветвления с forked edges)', 'implemented', 'rust-pr-190', 'tikzExtensionsSuite.ts'],
  ['EXT-07', 'studio-fe', 'FE', 'Мастерская пакета pgfgantt (календарные графики НИОКР, вехи и зависимости)', 'implemented', 'rust-pr-190', 'tikzExtensionsSuite.ts'],
  ['EXT-08', 'studio-fe', 'FE', 'Мастерская пакетов quantikz + tikz-feynman (пара состояние Белла, телепортация, КЭД вершина под XeLaTeX)', 'implemented', 'rust-pr-190', 'tikzExtensionsSuite.ts'],
  ['EXT-09', 'studio-fe', 'FE', 'Мастерская пакетов tkz-euclide + tikz-network (описанная окружность, ортоцентр, взвешенный граф)', 'implemented', 'rust-pr-190', 'tikzExtensionsSuite.ts'],
  ['EXT-10', 'studio-fe', 'FE', 'Мастерская пакета tikz-timing (тайминги цифровых шин SPI, I²C и AXI-Stream)', 'implemented', 'rust-pr-190', 'tikzExtensionsSuite.ts'],
  ['EXT-11', 'studio-fe', 'FE', 'Мастерская пакетов tikz-optics + stanli (интерферометр Майкельсона и балка со стержневыми опорами)', 'implemented', 'rust-pr-190', 'tikzExtensionsSuite.ts'],
  ['EXT-12', 'studio-fe', 'FE', 'Мастерская штатных библиотек ядра PGF (automata ДКА, сети Петри, конвейеры chains, фракталы Коха)', 'implemented', 'rust-pr-190', 'tikzExtensionsSuite.ts'],
  ['AP-01', 'studio-fe', 'FE', 'Паспорт пакетов атомарного рисунка в шапке окна Преамбулы (класс документа, подключённые пакеты и библиотеки)', 'implemented', 'rust-pr-190', 'atomicFigureProfile.ts + TexSourceEditor.tsx'],
  ['AP-02', 'studio-fe', 'FE', 'Защита от отключения используемой примитивами библиотеки и удаление лишних деклараций в 1 клик', 'implemented', 'rust-pr-190', 'toggleTikzLibraryInPreamble с подсчётом зависимых объектов'],
  ['AP-03', 'studio-fe', 'FE', 'Шесть профилей специализации преамбулы атомарного рисунка (standalone, кириллица, оптика, графики, субфигура, Beamer)', 'implemented', 'rust-pr-190', 'ATOMIC_FIGURE_PROFILES'],
  ['AP-04', 'studio-fe', 'FE', 'Автораспознавание активных пакетов расширений в чистом TeX с прямым переходом из Инспектора в Мастерскую и PDF', 'implemented', 'rust-proposal', 'detectActiveExtensionsInSource + карточка активных расширений в Инспекторе'],
  ['PDF-01', 'studio-fe', 'FE', 'Реестр 12 оригинальных PDF-мануалов TeX Live и 44 прямых точек [page, section, namedDest, bboxNorm]', 'implemented', 'rust-pr-190', 'pdfManualAnchors.ts + manual_anchors.index.json'],
  ['PDF-02', 'studio-fe', 'FE', 'Окно просмотра прямой точки оригинального PDF-мануала с подсветкой области определения и 1-клик вставкой примера', 'partial', 'rust-pr-190', 'В веб-стенде — точная карточка-симулятор листа Computer Modern; в Rust — рендер локального PDF через pdftoppm'],
  ['PDF-03', 'studio-fe', 'FE', 'Мгновенный вызов прямой точки PDF-руководства из позиции курсора в коде .tex по Shift+F1', 'implemented', 'rust-pr-190', 'TexSourceEditor.tsx + нижняя строка сигнатуры под курсором'],
  ['PDF-04', 'studio-fe', 'FE', 'Прямые ссылки из диагностики ошибок XeLaTeX и карточки F1 на страницу оригинального PDF-руководства', 'implemented', 'rust-pr-190', 'resolveManualAnchorForDiagnosticCode + InspectorAndHelpPane.tsx'],
  ['PDF-05', 'studio-fe', 'FE', 'Офлайн-скрипты сборки индекса kpsewhich + PyMuPDF (01_discover_texlive_manuals.sh, 02_extract_pdf_anchors.py)', 'implemented', 'rust-pr-190', 'Генерация и скачивание готовых артефактов индексации без коммита самих PDF'],
  ['API-V1', 'studio-fe', 'FE', 'Полная обратная совместимость со всеми 26 операциями и прямоугольниками виджетов tikzarium-qa-control v1', 'implemented', 'rust-main', 'Проверено контрактами studioControlApi.test.ts'],
  ['API-V2', 'studio-fe', 'FE', 'Расширенный JSONL-движок tikzarium-qa-control v2 (57 операций: 100% паритет GUI ↔ API, включая package_canvas.* и insights.inspect)', 'implemented', 'rust-pr-190', 'studioControlApi.ts + живая JSONL-консоль во вкладке 3 окна PDF-мануала'],
  ['GH-01', 'studio-fe', 'FE', 'Авторизация GitHub OAuth (Authorization Code + Device Flow) с устойчивой серверной сессией для iframe', 'implemented', 'rust-proposal', 'server.ts + Partitioned cookie + заголовок X-Tikzarium-Gh-Sid'],
  ['GH-02', 'studio-fe', 'FE', 'Прямая публикация миграционных коммитов и открытие Pull Request в i-shutov/tikzarium через GitHub REST API', 'implemented', 'rust-pr-190', 'Проверено созданием и сопровождением реального PR #190 (23/23 CI green)'],
  ['GH-03', 'studio-fe', 'FE', 'Генератор автономного shell-скрипта создания ветки и локального прогона cargo test --workspace', 'implemented', 'rust-proposal', 'buildSelfContainedGitSyncShellScript'],
  ['ERG-01', 'studio-fe', 'FE', 'Трёхзонная верхняя шапка и разгруженная однорядная рабочая панель под ноутбуки 1280–1440px', 'implemented', 'rust-proposal', 'App.tsx (экономия ~130px горизонтальной ширины)'],
  ['ERG-02', 'studio-fe', 'FE', 'Полное устранение жёстко зашитого тёмного хрома в модальном окне PDF-мануала и ПКМ-меню холста на светлых темах', 'implemented', 'rust-proposal', 'Семантические CSS-переменные var(--tz-*) во всех 4 темах'],
  ['ERG-03', 'studio-fe', 'FE', 'Закрытие окна PDF-мануала по клавише Esc и клику по подложке + хоткей Alt+P сворачивания преамбулы', 'implemented', 'rust-proposal', 'PdfManualAnchorModal.tsx + TexSourceEditor.tsx'],
  ['ERG-04', 'studio-fe', 'FE', 'Контрастные кольца фокуса :focus-visible во всех 4 темах и уважение системной настройки prefers-reduced-motion', 'implemented', 'rust-proposal', 'src/index.css'],
  ['ERG-05', 'studio-fe', 'FE', 'Чистая научная типографика tabular-nums без декоративных кружков-индикаторов, боковых полос и лишних рамок-бейджей', 'implemented', 'rust-proposal', 'Приведено к инженерному стандарту во всех основных панелях'],
  ['PKG-01', 'studio-fe', 'FE', 'Палитра прямого рисования на холсте объектами и механиками 7 семейств пакетов (20 инструментов без модальных окон)', 'implemented', 'rust-proposal', 'PACKAGE_CANVAS_TOOLS в packageCanvasSemantics.ts + CanvasStage.tsx'],
  ['PKG-02', 'studio-fe', 'FE', 'Позиционный парсер и мутатор чистого идиоматического TikZ без комментариев % tikzarium:n1:', 'implemented', 'rust-proposal', 'parseScenePackageObjects + SourcePatch (MOD-04, MOD-06)'],
  ['PKG-03', 'studio-fe', 'FE', 'Двустороннее рисование и правка осей PGFPlots \\begin{axis} и серий \\addplot прямо на холсте и в Инспекторе', 'implemented', 'rust-proposal', 'pkg:pgfplots-axis + pkg:pgfplots-curve + карточка Инспектора (MOD-07)'],
  ['PKG-04', 'studio-fe', 'FE', 'Интерактивное рисование и семантическая правка двухполюсников CircuiTikZ (R, C, L, V, Do, ground) на холсте', 'implemented', 'rust-proposal', 'pkg:circuit-* + автоподключение \\usepackage[european]{circuitikz}'],
  ['PKG-05', 'studio-fe', 'FE', 'Интерактивные состояния \\node[state,initial,accepting] и дуги переходов конечных автоматов automata на холсте', 'implemented', 'rust-proposal', 'pkg:automata-state + pkg:automata-edge + правка флагов в Инспекторе'],
  ['PKG-06', 'studio-fe', 'FE', 'Прямые инструменты оптики, теоретической физики (coil, snake), опор ГОСТ и колец chemfig на холсте', 'implemented', 'rust-proposal', 'pkg:optics-lens, pkg:physics-*, pkg:mechanics-support, pkg:chemfig-ring'],
  ['PKG-07', 'studio-fe', 'FE', 'Иерархическое «Дерево фигуры» (Figure Explorer) и статический аудитор таблиц .dat/.csv (SC-DATA) в Инспекторе', 'implemented', 'rust-proposal', 'buildFigureStructureTree + inspectDataFileDependencies в InspectorAndHelpPane.tsx'],
  ['PDF-U01', 'studio-fe', 'FE', 'Серверный конвейер POST /api/render/pdf-underlay: реальный PDF + калиброванный PNG 144 DPI (XeLaTeX / Ghostscript 9.55)', 'implemented', 'rust-proposal', 'server.ts + pdfUnderlayRenderer.ts + LRU-кэш рендера'],
  ['PDF-U02', 'studio-fe', 'FE', 'Живая PDF-калька 1:1 под сеткой холста с плавным ползунком прозрачности 0–100% (как в Photoshop) и скачиванием .pdf', 'implemented', 'rust-proposal', 'canvas-tracing-opacity-slider + canvas-real-pdf-underlay в CanvasStage.tsx'],
  ['DOC-INS', 'studio-fe', 'FE', 'Инженерный документ архитектурных инсайтов, выбора стека egui vs Tauri и волн реализации (docs/INSIGHTS_AND_PLANS_RU.md)', 'implemented', 'rust-pr-190', 'insightsAndPlans.ts + вкладка «Инсайты и План» в Реестре требований'],
  ['ERG-06', 'studio-fe', 'FE', 'Плавный ползунок непрозрачности 0–100% в стиле Photoshop для 4 композитных слоёв (Чертёж, Калька PDF 1:1, Калька-скан PNG, Сетка)', 'implemented', 'rust-proposal', 'photoshop-layer-opacity-bar в InspectorAndHelpPane.tsx + верхний ползунок Калька в CanvasStage.tsx'],
  ['ERG-07', 'studio-fe', 'FE', 'Скрытие LaTeX-шапки (преамбулы) из постоянного просмотра в отдельную вкладку «Шапка» — 100% высоты отдано коду чертежа', 'implemented', 'rust-proposal', '3 вкладки редактора «Чертёж | Шапка (N) | Весь .tex» в TexSourceEditor.tsx с сохранением сквозной нумерации строк'],
  ['ERG-08', 'studio-fe', 'FE', 'Устранение задвоения отметки «0см» в левом нижнем углу координатной линейки листа', 'implemented', 'rust-proposal', 'Единый нулевой отсчёт (0,0) и размерность «см» на концевых делениях осей в CanvasStage.tsx'],
  ['ERG-09', 'studio-fe', 'FE', 'Схемотехническая иконографика ГОСТ / IEC 60617 / ChemFig вместо текстовых кнопок для электрических цепей, химии, оптики и механики', 'implemented', 'rust-proposal', 'PackageSchematicIcon.tsx (20 векторных УГО: резистор R, конденсатор C, катушка L, ЭДС U, земля GND, кольца C₆/C₅, опора ГОСТ и др.)'],
  ['ERG-10', 'studio-fe', 'FE', 'Полная ликвидация дублирования подложек, слоёв, списка объектов и кнопки «Таблица» между верхом/низом холста и правой панелью', 'implemented', 'rust-proposal', 'Единая вкладка «Слои (N)» в правом доке (4 композитных слоя + подслои CAD + единое дерево объектов + переход к Таблице)'],
  ['ARCH-STACK', 'studio-fe', 'REQ', 'Архитектурное обоснование выбора стека UI (egui 0.33.3 + Rust vs Tauri v2 + Rust) при общем чистом ядре tikzarium-core', 'implemented', 'rust-proposal', 'Сравнение и гибридная архитектура зафиксированы в INS-06 (docs/INSIGHTS_AND_PLANS_RU.md)'],
  ['TAURI-V2-01', 'studio-fe', 'FE', 'Нативная десктопная оболочка Tauri v2 + Rust (src-tauri / apps/tikzarium-studio-tauri) с 9 командами #[tauri::command] поверх tikzarium-core и tikzarium-extensions', 'implemented', 'rust-proposal', 'src-tauri/src/{lib,commands,patch_engine}.rs + двухрежимный мост tauriNativeBridge.ts'],
  ['TAURI-V2-02', 'studio-fe', 'FE', 'Публикация полной ветки feat/tauri-v2-studio в i-shutov/tikzarium в 1 клик (GitHub Git Data Blobs API + автономный .tar.gz архив без мутации Cargo.lock и PR #190)', 'implemented', 'rust-proposal', 'POST /api/github/publish-tauri-branch + TauriV2BranchWorkbenchView.tsx'],
];

const EGUI_BLUEPRINTS_ROWS: RawTuple[] = [
  ['EGUI-BP-01', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #1: Всплывающая подсказка аргументов LaTeX поверх egui::Galley с переводом char → UTF-8 byte', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет в EguiNativeBlueprintView)'],
  ['EGUI-BP-02', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #2: Тактильный шаг размерностей (− / + / ↑↓) и режим «Автошаг» в Инспекторе egui', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-03', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #3: Палитра Ctrl+K и защита модификаторов от перехвата системного копирования Ctrl+C', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-04', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #4: Диалог создания документа по шаблону в нативном egui::Modal', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-05', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #5: Полупрозрачный ghost-предпросмотр рисуемой фигуры через egui::Painter', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-06', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #6: Узловые ручки Sense::drag(), направляющие Smart Snap и режим кальки в egui', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-07', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #7: Наблюдатель notify::RecommendedWatcher, dropped_files и eframe::Storage', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-08', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #8: Нативное контекстное меню Response::context_menu, трассы |- / -| и выноски ГОСТ', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-09', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #9: Калибр колонки журнала, Ч/Б проба ITU-R BT.709 и вызов synctex edit', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-10', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #10: Системный буфер обмена ОС через крейт arboard (RGBA PNG + таблицы TSV)', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-11', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #11: Перетаскиваемые SidePanel::resizable и живой DragValue-скруббер чисел в .tex', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-12', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #12: Замкнутые полигоны, штриховка ГОСТ 2.306 через with_clip_rect и пересечения лучей', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-13', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #13: Слои Scope (Lock / Hide) и пошаговый фильтр слайдов Beamer на холсте egui', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-14', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #14: Радиальное Pie-меню на egui::Area + Painter и 3D-проектор базиса ГОСТ 2.317', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-15', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #15: Табличный реестр примитивов на egui_extras::TableBuilder, Пипетка стиля и Fillet', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-16', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #16: Рендеринг индексов формул через LayoutJob (valign Bottom/Top) и сессия .tikzproj', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-17', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #17: AST-безопасный автоформатер TikZ/LaTeX на Rust с защитой % tikzarium:n1: и CRLF', 'proposal', 'rust-proposal', 'Описание-предложение для crates/tikzarium-core/src/formatter.rs'],
  ['EGUI-BP-18', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #18: Подсветка парных скобок {} [] () и \\begin…\\end поверх Galley с учётом кириллицы', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-19', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #19: Сплайн Catmull–Rom C¹ и векторный импортёр SVG в сантиметры TikZ на Rust', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-20', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #20: Двухоконный .tex-сплиттер TopBottomPanel::top("tex_preamble_pane") + CentralPanel', 'proposal', 'rust-pr-190', 'Часть контракта сплиттера и геометрии вошла в PR #190'],
  ['EGUI-BP-21', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #21: Вертикальный рельс инструментов 38 px, хаб «Мастерские» и слоты ★ Избранное', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-22', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #22: Полярная/изометрическая привязка 30° и вычисление площади/центроида Гаусса на Rust', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-23', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #23: Триангуляция невыпуклых булевых полигонов (earcutr) в egui::Mesh и паспорт преамбулы', 'proposal', 'rust-proposal', 'Описание-предложение (готовый Rust-сниппет)'],
  ['EGUI-BP-24', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #24: Двухпанельная мастерская 12 пакетов расширений TikZ с гибридной вставкой в egui', 'proposal', 'rust-pr-190', 'Модуль extensions_workshop и API вошли в PR #190'],
  ['EGUI-BP-25', 'egui-blueprints', 'BLUEPRINT', 'Чертёж Rust #25: Встроенный PDF-ридер прямых точек [page, NamedDest, bbox_norm] и JSONL API v2', 'proposal', 'rust-pr-190', 'Индекс прямых точек и операции manual.open_anchor открыты в PR #190'],
];

const MODERNIZATION_ROWS: RawTuple[] = MODERNIZATION_TASKS_20.map((t) => [
  t.id,
  'modernization-20',
  'REFACTOR',
  `${t.priority} · ${t.titleRu}`,
  t.studioStatus,
  'rust-proposal',
  `${t.trackRu}. ${t.statusNoteRu}`,
]);

const ALL_RAW_TUPLES: RawTuple[] = [
  ...CORE_AND_GATES_ROWS,
  ...ROADMAP_ROWS,
  ...UX_AUDIT_ROWS,
  ...SCI142_ROWS,
  ...AI88_PACKAGES_AND_LIBS_ROWS,
  ...AI88_CASES_ROWS,
  ...STUDIO_FE_ROWS,
  ...EGUI_BLUEPRINTS_ROWS,
  ...MODERNIZATION_ROWS,
];

export const REQUIREMENTS_AND_FE_LEDGER: LedgerEntry[] = ALL_RAW_TUPLES.map(
  ([id, group, kind, titleRu, studioStatus, rustStatus, noteRu]) => ({
    id,
    group,
    kind,
    titleRu,
    studioStatus,
    rustStatus,
    noteRu,
  })
);

export interface LedgerSummaryStats {
  total: number;
  byStudioStatus: Record<ImplementationStatus, number>;
  byRustStatus: Record<RustUpstreamStatus, number>;
  byGroup: {
    group: LedgerGroupId;
    labelRu: string;
    total: number;
    implemented: number;
    partial: number;
    proposal: number;
  }[];
}

export function getRequirementsLedgerSummary(): LedgerSummaryStats {
  const byStudioStatus: Record<ImplementationStatus, number> = {
    implemented: 0,
    partial: 0,
    proposal: 0,
  };
  const byRustStatus: Record<RustUpstreamStatus, number> = {
    'rust-main': 0,
    'rust-pr-190': 0,
    'rust-proposal': 0,
  };

  for (const row of REQUIREMENTS_AND_FE_LEDGER) {
    byStudioStatus[row.studioStatus]++;
    byRustStatus[row.rustStatus]++;
  }

  const groupOrder: LedgerGroupId[] = [
    'core-acceptance',
    'roadmap-stages',
    'ux-audit',
    'sci142-reqs',
    'ai88-packages-libs',
    'ai88-cases',
    'studio-fe',
    'egui-blueprints',
    'modernization-20',
  ];

  const byGroup = groupOrder.map((group) => {
    const items = REQUIREMENTS_AND_FE_LEDGER.filter((r) => r.group === group);
    return {
      group,
      labelRu: LEDGER_GROUP_LABELS[group],
      total: items.length,
      implemented: items.filter((i) => i.studioStatus === 'implemented').length,
      partial: items.filter((i) => i.studioStatus === 'partial').length,
      proposal: items.filter((i) => i.studioStatus === 'proposal').length,
    };
  });

  return {
    total: REQUIREMENTS_AND_FE_LEDGER.length,
    byStudioStatus,
    byRustStatus,
    byGroup,
  };
}

function escapeMdPipe(text: string): string {
  return text.replace(/\|/g, '\\|');
}

export function buildMarkdownLedgerDocumentRu(): string {
  const stats = getRequirementsLedgerSummary();
  const lines: string[] = [];

  lines.push('# Единый реестр ВСЕХ требований, этапов Roadmap и функциональных элементов (FE) TikZarium Studio');
  lines.push('');
  lines.push(
    '> Авторитетная сводная ведомость репозитория, синхронизированная с продуктовой спецификацией `SCIENCE_FIRST_DATA_LAST` (`AGENTS.md`, `PRODUCT_SPEC.md`, `ROADMAP.md`), критическим UX-аудитом (`UX-F01…F14`), корпусом `Scientific-142 R4` (`103` требования `SC-*`), каталогом `AI88` (`35` пакетов, `23` библиотеки, `88` сценариев), всеми функциональными элементами (`FE`) текущего стенда (`N1`, `P01…P80`, `E01…E08`, `F01…F16`, `EXT-01…12`, `PDF`, `API-V2`) и планом модернизации/рефакторинга (`MOD-01…MOD-20`).'
  );
  lines.push('');
  lines.push('## Сводная статистика покрытия');
  lines.push('');
  lines.push(`- **Всего учтено требований и FE**: **${stats.total}**`);
  lines.push(
    `- **В текущем репозитории Studio**: Реализовано — **${stats.byStudioStatus.implemented}** · Частично (стенд / подмножество) — **${stats.byStudioStatus.partial}** · Описание-предложение (не реализовано) — **${stats.byStudioStatus.proposal}**`
  );
  lines.push(
    `- **В целевом Rust-репозитории \`i-shutov/tikzarium\`**: В \`main\` — **${stats.byRustStatus['rust-main']}** · В открытом \`PR #190\` — **${stats.byRustStatus['rust-pr-190']}** · Описание-предложение — **${stats.byRustStatus['rust-proposal']}**`
  );
  lines.push('');
  lines.push('| Раздел реестра | Всего | Реализовано | Частично (стенд) | Описание-предложение |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const g of stats.byGroup) {
    lines.push(
      `| ${escapeMdPipe(g.labelRu)} | ${g.total} | ${g.implemented} | ${g.partial} | ${g.proposal} |`
    );
  }
  lines.push('');

  lines.push('## Легенда статусов');
  lines.push('');
  lines.push(
    '- **`РЕАЛИЗОВАНО`** — функция или требование имеет рабочий исполняемый код, UI и/или операцию JSONL API в данном репозитории, проверенные автотестами.'
  );
  lines.push(
    '- **`ЧАСТИЧНО (СТЕНД / ПОДМНОЖЕСТВО)`** — алгоритм или интерфейс реализован в веб-стенде (например, для примитивов `% tikzarium:n1:` или со смоделированным вызовом внешнего бинарника ОС `xelatex`/`synctex`), но для полного закрытия нормативного критерия требуется расширение на произвольный немаркированный `.tex` либо реальный системный процесс.'
  );
  lines.push(
    '- **`ОПИСАНИЕ-ПРЕДЛОЖЕНИЕ`** — элемент пока не реализован в исполняемом коде: это плановый этап продуктового Roadmap, не проведённый пилот на 5 пользователях (`T0–T8`), физический релизный гейт (`W2b/W3/W4`), ещё не адаптированный пакет `AI88`, справочный Rust-сниппет `EguiNativeBlueprintView` или задача модернизации `MOD-01…MOD-20`.'
  );
  lines.push('');

  for (const g of stats.byGroup) {
    lines.push(`## ${g.labelRu}`);
    lines.push('');
    lines.push(
      `Сводка раздела: всего **${g.total}** · реализовано **${g.implemented}** · частично **${g.partial}** · описание-предложение **${g.proposal}**.`
    );
    lines.push('');
    lines.push('| ID | Тип | Статус в Studio | Статус в Rust (`i-shutov/tikzarium`) | Наименование требования / FE | Примечание и трассировка |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    const items = REQUIREMENTS_AND_FE_LEDGER.filter((r) => r.group === g.group);
    for (const row of items) {
      lines.push(
        `| \`${row.id}\` | ${row.kind} | **${IMPLEMENTATION_STATUS_LABELS[row.studioStatus]}** | ${RUST_STATUS_LABELS[row.rustStatus]} | ${escapeMdPipe(row.titleRu)} | ${escapeMdPipe(row.noteRu)} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
