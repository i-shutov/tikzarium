import type { SpecimenDocument } from './catalog';
import { generateOwnedLine } from './tikzEngine';

export type DocumentTemplateId = 'diagram' | 'plot' | 'optics' | 'geometry' | 'minimal';

export interface TemplateCreationOptions {
  filename: string;
  includeCyrillicFontspec: boolean;
  borderPt: 4 | 6 | 10;
  lineEnding: 'LF' | 'CRLF';
}

export interface DocumentTemplateSpec {
  id: DocumentTemplateId;
  titleRu: string;
  categoryRu: string;
  defaultFilename: string;
  summaryRu: string;
  packages: string[];
  libraries: string[];
  primitiveCount: number;
  dataDependencies: string[];
}

export const DOCUMENT_TEMPLATES: DocumentTemplateSpec[] = [
  {
    id: 'diagram',
    titleRu: 'Диаграмма',
    categoryRu: 'Блок-схемы и потоки',
    defaultFilename: 'diagram_flow.tex',
    summaryRu:
      'Трёхзвенная блок-схема процесса с подписями узлов, направленными стрелками Stealth и дугой обратной связи Безье.',
    packages: ['tikz'],
    libraries: ['arrows.meta', 'positioning', 'calc'],
    primitiveCount: 9,
    dataDependencies: [],
  },
  {
    id: 'plot',
    titleRu: 'График',
    categoryRu: 'Научные графики и оси',
    defaultFilename: 'plot_scientific.tex',
    summaryRu:
      'Координатная плоскость X/Y со стрелками, линией асимптоты, переходной характеристикой U(t), точкой экстремума и преамбулой PGFPlots 1.18.',
    packages: ['tikz', 'pgfplots'],
    libraries: ['arrows.meta', 'calc'],
    primitiveCount: 7,
    dataDependencies: [],
  },
  {
    id: 'optics',
    titleRu: 'Схема оптики',
    categoryRu: 'Физика и ход лучей',
    defaultFilename: 'optics_scheme.tex',
    summaryRu:
      'Главная оптическая ось, апертура собирающей линзы, преломлённый луч, фокальный вектор и обозначение фокуса F₁.',
    packages: ['tikz'],
    libraries: ['arrows.meta', 'calc', 'positioning'],
    primitiveCount: 6,
    dataDependencies: [],
  },
  {
    id: 'geometry',
    titleRu: 'Геометрический чертёж',
    categoryRu: 'Планиметрия и векторы',
    defaultFilename: 'geometry_figure.tex',
    summaryRu:
      'Описанный прямоугольник, вписанная окружность, секущая прямая, радиус-вектор и математические метки центра.',
    packages: ['tikz'],
    libraries: ['arrows.meta', 'calc'],
    primitiveCount: 6,
    dataDependencies: [],
  },
  {
    id: 'minimal',
    titleRu: 'Минимальный каркас',
    categoryRu: 'Чистый старт XeLaTeX',
    defaultFilename: 'figure_clean.tex',
    summaryRu:
      'Готовая преамбула standalone с настроенной кодировкой UTF-8 и одним стартовым вектором для быстрого построения с нуля.',
    packages: ['tikz'],
    libraries: ['arrows.meta'],
    primitiveCount: 1,
    dataDependencies: [],
  },
];

export function validateTemplateFilename(rawName: string): {
  valid: boolean;
  normalized: string;
  reasonRu?: string;
} {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return { valid: false, normalized: '', reasonRu: 'Укажите имя нового файла .tex.' };
  }
  if (/[<>:"/\\|?*\x00-\x1f]/.test(trimmed)) {
    return {
      valid: false,
      normalized: trimmed,
      reasonRu: 'Имя файла не должно содержать слеши или недопустимые символы ОС.',
    };
  }
  if (trimmed === '.tex') {
    return {
      valid: false,
      normalized: trimmed,
      reasonRu: 'Укажите основу имени файла перед расширением .tex.',
    };
  }
  const normalized = trimmed.toLowerCase().endsWith('.tex') ? trimmed : `${trimmed}.tex`;
  return { valid: true, normalized };
}

function buildPreambleLines(
  spec: DocumentTemplateSpec,
  options: TemplateCreationOptions
): string[] {
  const lines: string[] = [];
  lines.push(`\\documentclass[border=${options.borderPt}pt]{standalone}`);
  if (options.includeCyrillicFontspec) {
    lines.push('\\usepackage{fontspec}');
    lines.push('\\usepackage{unicode-math}');
  }
  for (const pkg of spec.packages) {
    lines.push(`\\usepackage{${pkg}}`);
  }
  if (spec.libraries.length > 0) {
    lines.push(`\\usetikzlibrary{${spec.libraries.join(',')}}`);
  }
  if (options.includeCyrillicFontspec) {
    lines.push('\\setmainfont{DejaVu Serif}');
  }
  if (spec.packages.includes('pgfplots')) {
    lines.push('\\pgfplotsset{compat=1.18}');
  }
  return lines;
}

function buildBodyOwnedLines(
  templateId: DocumentTemplateId,
  includeCyrillic: boolean
): string[] {
  switch (templateId) {
    case 'diagram':
      return [
        '% Шаблон «Диаграмма»: блоки, стрелки связей и дуга обратной связи',
        generateOwnedLine(1, 'rectangle', {
          start_x: '0.35cm',
          start_y: '1.45cm',
          end_x: '1.85cm',
          end_y: '2.45cm',
        }),
        generateOwnedLine(2, 'node', {
          x: '1.10cm',
          y: '1.95cm',
          mode: 'text',
          content: includeCyrillic ? 'Вход .tex' : 'Input .tex',
        }),
        generateOwnedLine(3, 'arrow', {
          start_x: '1.85cm',
          start_y: '1.95cm',
          end_x: '2.45cm',
          end_y: '1.95cm',
          tip: 'Stealth',
        }),
        generateOwnedLine(4, 'rectangle', {
          start_x: '2.45cm',
          start_y: '1.45cm',
          end_x: '4.05cm',
          end_y: '2.45cm',
        }),
        generateOwnedLine(5, 'node', {
          x: '3.25cm',
          y: '1.95cm',
          mode: 'text',
          content: 'XeLaTeX',
        }),
        generateOwnedLine(6, 'arrow', {
          start_x: '4.05cm',
          start_y: '1.95cm',
          end_x: '4.65cm',
          end_y: '1.95cm',
          tip: 'Stealth',
        }),
        generateOwnedLine(7, 'rectangle', {
          start_x: '4.65cm',
          start_y: '1.45cm',
          end_x: '5.90cm',
          end_y: '2.45cm',
        }),
        generateOwnedLine(8, 'node', {
          x: '5.28cm',
          y: '1.95cm',
          mode: 'text',
          content: 'PDF',
        }),
        generateOwnedLine(9, 'cubic', {
          start_x: '5.28cm',
          start_y: '1.45cm',
          control1_x: '4.50cm',
          control1_y: '0.55cm',
          control2_x: '1.90cm',
          control2_y: '0.55cm',
          end_x: '1.10cm',
          end_y: '1.45cm',
        }),
      ];

    case 'plot':
      return [
        '% Шаблон «График»: координатные оси X/Y, асимптота и переходная кривая U(t)',
        generateOwnedLine(1, 'arrow', {
          start_x: '0.65cm',
          start_y: '0.65cm',
          end_x: '5.75cm',
          end_y: '0.65cm',
          tip: 'Stealth',
        }),
        generateOwnedLine(2, 'arrow', {
          start_x: '0.65cm',
          start_y: '0.65cm',
          end_x: '0.65cm',
          end_y: '3.35cm',
          tip: 'Stealth',
        }),
        generateOwnedLine(3, 'line', {
          start_x: '0.65cm',
          start_y: '2.50cm',
          end_x: '5.45cm',
          end_y: '2.50cm',
        }),
        generateOwnedLine(4, 'cubic', {
          start_x: '0.65cm',
          start_y: '0.65cm',
          control1_x: '1.65cm',
          control1_y: '3.20cm',
          control2_x: '3.20cm',
          control2_y: '2.75cm',
          end_x: '5.40cm',
          end_y: '2.50cm',
        }),
        generateOwnedLine(5, 'circle', {
          center_x: '2.05cm',
          center_y: '2.48cm',
          radius: '0.12cm',
        }),
        generateOwnedLine(6, 'node', {
          x: '5.45cm',
          y: '0.32cm',
          mode: 'math',
          content: includeCyrillic ? 't,\\,\\text{мс}' : 't\\,\\mathrm{(ms)}',
        }),
        generateOwnedLine(7, 'node', {
          x: '3.55cm',
          y: '3.05cm',
          mode: 'math',
          content: 'U(t) = U_0 (1 - e^{-t/\\tau})',
        }),
      ];

    case 'optics':
      return [
        '% Шаблон «Схема оптики»: главная оптическая ось, собирающая линза и фокус F_1',
        generateOwnedLine(1, 'line', {
          start_x: '0.40cm',
          start_y: '1.85cm',
          end_x: '5.80cm',
          end_y: '1.85cm',
        }),
        generateOwnedLine(2, 'rectangle', {
          start_x: '2.35cm',
          start_y: '0.75cm',
          end_x: '3.05cm',
          end_y: '2.95cm',
        }),
        generateOwnedLine(3, 'circle', {
          center_x: '2.70cm',
          center_y: '1.85cm',
          radius: '0.85cm',
        }),
        generateOwnedLine(4, 'cubic', {
          start_x: '0.60cm',
          start_y: '2.50cm',
          control1_x: '1.85cm',
          control1_y: '2.50cm',
          control2_x: '3.40cm',
          control2_y: '2.30cm',
          end_x: '4.75cm',
          end_y: '1.85cm',
        }),
        generateOwnedLine(5, 'arrow', {
          start_x: '0.60cm',
          start_y: '1.20cm',
          end_x: '4.75cm',
          end_y: '1.85cm',
          tip: 'Stealth',
        }),
        generateOwnedLine(6, 'node', {
          x: '4.90cm',
          y: '2.30cm',
          mode: 'math',
          content: includeCyrillic ? 'F_1 (f = 25\\,\\text{мм})' : 'F_1 (f = 25\\,\\mathrm{mm})',
        }),
      ];

    case 'geometry':
      return [
        '% Шаблон «Геометрический чертёж»: вписанная окружность, секущая и радиус-вектор',
        generateOwnedLine(1, 'rectangle', {
          start_x: '1.55cm',
          start_y: '0.65cm',
          end_x: '4.05cm',
          end_y: '3.15cm',
        }),
        generateOwnedLine(2, 'circle', {
          center_x: '2.80cm',
          center_y: '1.90cm',
          radius: '1.25cm',
        }),
        generateOwnedLine(3, 'line', {
          start_x: '0.95cm',
          start_y: '0.85cm',
          end_x: '4.85cm',
          end_y: '2.95cm',
        }),
        generateOwnedLine(4, 'arrow', {
          start_x: '2.80cm',
          start_y: '1.90cm',
          end_x: '3.68cm',
          end_y: '2.78cm',
          tip: 'Stealth',
        }),
        generateOwnedLine(5, 'node', {
          x: '2.65cm',
          y: '1.55cm',
          mode: 'math',
          content: 'O(x_0,y_0)',
        }),
        generateOwnedLine(6, 'node', {
          x: '3.45cm',
          y: '2.45cm',
          mode: 'math',
          content: 'R',
        }),
      ];

    case 'minimal':
      return [
        '% Стартовый примитив TikZarium (готов к редактированию на холсте и в коде):',
        generateOwnedLine(1, 'arrow', {
          start_x: '0.80cm',
          start_y: '1.85cm',
          end_x: '4.80cm',
          end_y: '1.85cm',
          tip: 'Stealth',
        }),
      ];
  }
}

export function buildDocumentFromTemplate(
  templateId: DocumentTemplateId,
  options: TemplateCreationOptions,
  instanceSerial = 1
): SpecimenDocument {
  const spec = DOCUMENT_TEMPLATES.find((t) => t.id === templateId) ?? DOCUMENT_TEMPLATES[0];
  const fileCheck = validateTemplateFilename(options.filename || spec.defaultFilename);
  const finalFilename = fileCheck.valid ? fileCheck.normalized : spec.defaultFilename;

  const preamble = buildPreambleLines(spec, options);
  const bodyLines = buildBodyOwnedLines(spec.id, options.includeCyrillicFontspec);
  const eol = options.lineEnding === 'CRLF' ? '\r\n' : '\n';

  const allLines = [
    ...preamble,
    '\\begin{document}',
    '\\begin{tikzpicture}',
    ...bodyLines,
    '\\end{tikzpicture}',
    '\\end{document}',
    '',
  ];

  return {
    id: `tpl-${spec.id}-${instanceSerial}`,
    filename: finalFilename,
    titleRu: `${finalFilename} (${spec.titleRu})`,
    subtitleRu: `Создан из шаблона «${spec.titleRu}» · ${options.lineEnding}`,
    lineEnding: options.lineEnding,
    dataDependencies: [...spec.dataDependencies],
    source: allLines.join(eol),
  };
}
