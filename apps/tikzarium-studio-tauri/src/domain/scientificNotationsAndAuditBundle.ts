import type { SpecimenDocument, ToolId } from './catalog';
import {
  applyOwnedPrimitivePatch,
  insertOwnedPrimitiveIntoSource,
  parseDimensionToCm,
  parseOwnedPrimitives,
  parsePolyPointsList,
  proposeLibraryConnect,
  serializePolyPointsList,
} from './tikzEngine';
import type { OwnedPrimitive } from './tikzEngine';
import { reorderOwnedPrimitiveInSource } from './ergonomicsBundle';
import type { UserSnippetItem } from './ergonomicsBundle';
import type { CadLayerId, DigitizerCalibration } from './advancedCadBundle';

export type NotationDomainGroup =
  | 'quantum-feynman'
  | 'chem-jablonski'
  | 'control-dsp'
  | 'automata-cd';

export interface NotationSeedPrimitive {
  tool: ToolId;
  dxCm: number;
  dyCm: number;
  dx2Cm?: number;
  dy2Cm?: number;
  values: Record<string, string>;
}

export interface ScientificNotationPreset {
  id: string;
  domainGroup: NotationDomainGroup;
  codeTag: string;
  titleRu: string;
  subtitleRu: string;
  requiredLibraries: string[];
  primitives: NotationSeedPrimitive[];
}

export const SCIENTIFIC_NOTATION_PRESETS: ScientificNotationPreset[] = [
  // P51: Quantum Circuits & Feynman Propagators
  {
    id: 'qubit-bell-cnot',
    domainGroup: 'quantum-feynman',
    codeTag: 'P51 · Квантовая цепь',
    titleRu: 'Пара Белла: |0⟩ — [H] — •/⊕ (CNOT)',
    subtitleRu: 'Две кубитные шины, вентиль Адамара H, управляющий узел • и мишень ⊕',
    requiredLibraries: ['arrows.meta'],
    primitives: [
      { tool: 'node', dxCm: 0.0, dyCm: 0.9, values: { mode: 'math', content: '\\langle 0| \\to |0\\rangle', anchor: 'right' } },
      { tool: 'node', dxCm: 0.0, dyCm: 0.0, values: { mode: 'math', content: '|0\\rangle', anchor: 'right' } },
      { tool: 'line', dxCm: 0.55, dyCm: 0.9, dx2Cm: 3.6, dy2Cm: 0.9, values: { stroke_width: 'semithick' } },
      { tool: 'line', dxCm: 0.55, dyCm: 0.0, dx2Cm: 3.6, dy2Cm: 0.0, values: { stroke_width: 'semithick' } },
      {
        tool: 'rectangle',
        dxCm: 1.05,
        dyCm: 0.62,
        dx2Cm: 1.65,
        dy2Cm: 1.18,
        values: { fill_color: 'blue!8', stroke_width: 'semithick' },
      },
      { tool: 'node', dxCm: 1.35, dyCm: 0.9, values: { mode: 'math', content: 'H' } },
      { tool: 'line', dxCm: 2.45, dyCm: 0.9, dx2Cm: 2.45, dy2Cm: 0.0, values: { stroke_width: 'thick' } },
      { tool: 'circle', dxCm: 2.45, dyCm: 0.9, values: { radius: '0.10cm', fill_color: 'slate!12', stroke_width: 'thick' } },
      { tool: 'circle', dxCm: 2.45, dyCm: 0.0, values: { radius: '0.24cm', fill_color: 'none', stroke_width: 'semithick' } },
      { tool: 'node', dxCm: 2.45, dyCm: 0.0, values: { mode: 'math', content: '\\oplus' } },
      { tool: 'node', dxCm: 3.85, dyCm: 0.45, values: { mode: 'math', content: '|\\Phi^+\\rangle' } },
    ],
  },
  {
    id: 'qubit-measure-meter',
    domainGroup: 'quantum-feynman',
    codeTag: 'P51 · Квантовое измерение',
    titleRu: 'Вентиль Паули R_z(φ) и детектор измерения в Z-базисе',
    subtitleRu: 'Кубитная линия, фазовый блок и шкала измерителя со стрелкой',
    requiredLibraries: ['arrows.meta'],
    primitives: [
      { tool: 'node', dxCm: 0.0, dyCm: 0.45, values: { mode: 'math', content: '|\\psi\\rangle' } },
      { tool: 'line', dxCm: 0.35, dyCm: 0.45, dx2Cm: 2.55, dy2Cm: 0.45, values: { stroke_width: 'semithick' } },
      {
        tool: 'rectangle',
        dxCm: 0.85,
        dyCm: 0.15,
        dx2Cm: 1.75,
        dy2Cm: 0.75,
        values: { fill_color: 'emerald!10', stroke_width: 'semithick', rounded_corners: '2pt' },
      },
      { tool: 'node', dxCm: 1.3, dyCm: 0.45, values: { mode: 'math', content: 'R_z(\\varphi)' } },
      {
        tool: 'rectangle',
        dxCm: 2.55,
        dyCm: 0.12,
        dx2Cm: 3.35,
        dy2Cm: 0.78,
        values: { fill_color: 'amber!14', stroke_width: 'semithick' },
      },
      { tool: 'arrow', dxCm: 2.75, dyCm: 0.25, dx2Cm: 3.18, dy2Cm: 0.66, values: { stroke_width: 'semithick' } },
    ],
  },
  {
    id: 'feynman-qed-vertex',
    domainGroup: 'quantum-feynman',
    codeTag: 'P51 · Диаграмма Фейнмана КЭД',
    titleRu: 'Вершина КЭД: e⁻ + e⁺ → γ* → μ⁻ + μ⁺',
    subtitleRu: 'Фермионные лучи со стрелками и волновой пропагатор фотона (snake)',
    requiredLibraries: ['arrows.meta', 'decorations.pathmorphing'],
    primitives: [
      { tool: 'arrow', dxCm: 0.0, dyCm: 1.1, dx2Cm: 1.1, dy2Cm: 0.55, values: { stroke_width: 'semithick' } },
      { tool: 'arrow', dxCm: 1.1, dyCm: 0.55, dx2Cm: 0.0, dy2Cm: 0.0, values: { stroke_width: 'semithick' } },
      {
        tool: 'line',
        dxCm: 1.1,
        dyCm: 0.55,
        dx2Cm: 2.55,
        dy2Cm: 0.55,
        values: { decoration_kind: 'snake', stroke_color: 'blue!75!black', stroke_width: 'semithick', decoration_label: '\\gamma^*' },
      },
      { tool: 'arrow', dxCm: 2.55, dyCm: 0.55, dx2Cm: 3.65, dy2Cm: 1.1, values: { stroke_width: 'semithick' } },
      { tool: 'arrow', dxCm: 3.65, dyCm: 0.0, dx2Cm: 2.55, dy2Cm: 0.55, values: { stroke_width: 'semithick' } },
      { tool: 'node', dxCm: 0.1, dyCm: 1.3, values: { mode: 'math', content: 'e^-' } },
      { tool: 'node', dxCm: 0.1, dyCm: -0.2, values: { mode: 'math', content: 'e^+' } },
      { tool: 'node', dxCm: 3.55, dyCm: 1.3, values: { mode: 'math', content: '\\mu^-' } },
      { tool: 'node', dxCm: 3.55, dyCm: -0.2, values: { mode: 'math', content: '\\mu^+' } },
    ],
  },
  {
    id: 'feynman-gluon-loop',
    domainGroup: 'quantum-feynman',
    codeTag: 'P51 · КХД глюонный пропагатор',
    titleRu: 'Кварк-глюонное излучение q → q + g (coil)',
    subtitleRu: 'Фермионная линия кварка и спиральный глюонный пропагатор ПГФ coil',
    requiredLibraries: ['arrows.meta', 'decorations.pathmorphing'],
    primitives: [
      { tool: 'arrow', dxCm: 0.0, dyCm: 0.35, dx2Cm: 1.6, dy2Cm: 0.35, values: { stroke_width: 'semithick' } },
      { tool: 'arrow', dxCm: 1.6, dyCm: 0.35, dx2Cm: 3.3, dy2Cm: 0.35, values: { stroke_width: 'semithick' } },
      {
        tool: 'line',
        dxCm: 1.6,
        dyCm: 0.35,
        dx2Cm: 2.9,
        dy2Cm: 1.35,
        values: { decoration_kind: 'coil', stroke_color: 'red!75!black', stroke_width: 'semithick', decoration_label: 'g' },
      },
      { tool: 'circle', dxCm: 1.6, dyCm: 0.35, values: { radius: '0.08cm', fill_color: 'slate!12' } },
      { tool: 'node', dxCm: 0.25, dyCm: 0.62, values: { mode: 'math', content: 'q_i' } },
      { tool: 'node', dxCm: 3.05, dyCm: 0.62, values: { mode: 'math', content: 'q_f' } },
    ],
  },

  // P52: Jablonski Energy Levels & Chemistry Rings
  {
    id: 'jablonski-s0-s1-t1',
    domainGroup: 'chem-jablonski',
    codeTag: 'P52 · Диаграмма Яблонского',
    titleRu: 'Каскад уровней S₀ → S₁ → T₁ (флуоресценция и ИКК)',
    subtitleRu: 'Поглощение hν_A, внутренняя конверсия, интеркомбинационный переход ISC и фосфоресценция',
    requiredLibraries: ['arrows.meta', 'decorations.pathmorphing'],
    primitives: [
      { tool: 'line', dxCm: 0.0, dyCm: 0.0, dx2Cm: 2.1, dy2Cm: 0.0, values: { stroke_width: 'very thick' } },
      { tool: 'line', dxCm: 0.15, dyCm: 1.65, dx2Cm: 1.95, dy2Cm: 1.65, values: { stroke_width: 'very thick', stroke_color: 'blue!75!black' } },
      { tool: 'line', dxCm: 0.25, dyCm: 1.92, dx2Cm: 1.85, dy2Cm: 1.92, values: { stroke_width: 'thin', stroke_color: 'blue!75!black' } },
      { tool: 'line', dxCm: 2.55, dyCm: 1.15, dx2Cm: 4.05, dy2Cm: 1.15, values: { stroke_width: 'very thick', stroke_color: 'orange!85!black' } },
      { tool: 'arrow', dxCm: 0.55, dyCm: 0.0, dx2Cm: 0.55, dy2Cm: 1.92, values: { stroke_color: 'blue!75!black', stroke_width: 'semithick' } },
      { tool: 'arrow', dxCm: 1.35, dyCm: 1.65, dx2Cm: 1.35, dy2Cm: 0.0, values: { stroke_color: 'teal!80!black', stroke_width: 'semithick' } },
      {
        tool: 'line',
        dxCm: 1.95,
        dyCm: 1.65,
        dx2Cm: 2.55,
        dy2Cm: 1.15,
        values: { decoration_kind: 'snake', stroke_color: 'orange!85!black', decoration_label: '\\text{ISC}' },
      },
      { tool: 'arrow', dxCm: 3.3, dyCm: 1.15, dx2Cm: 3.3, dy2Cm: 0.0, values: { line_style: 'dashed', stroke_color: 'red!75!black', stroke_width: 'semithick' } },
      { tool: 'node', dxCm: -0.25, dyCm: 0.0, values: { mode: 'math', content: 'S_0' } },
      { tool: 'node', dxCm: -0.2, dyCm: 1.65, values: { mode: 'math', content: 'S_1' } },
      { tool: 'node', dxCm: 4.35, dyCm: 1.15, values: { mode: 'math', content: 'T_1' } },
    ],
  },
  {
    id: 'chem-benzene-aromatic',
    domainGroup: 'chem-jablonski',
    codeTag: 'P52 · Органика (6-цикл)',
    titleRu: 'Ароматическое бензольное кольцо C₆H₆ с сопряжением',
    subtitleRu: 'Правильный шестиугольник (-- cycle) и делокализованное π-кольцо',
    requiredLibraries: [],
    primitives: [
      {
        tool: 'line',
        dxCm: 0,
        dyCm: 0,
        values: {
          poly_points: '0.80cm,0.00cm;1.50cm,0.40cm;1.50cm,1.20cm;0.80cm,1.60cm;0.10cm,1.20cm;0.10cm,0.40cm',
          poly_closed: 'cycle',
          stroke_width: 'semithick',
        },
      },
      {
        tool: 'circle',
        dxCm: 0.8,
        dyCm: 0.8,
        values: { radius: '0.42cm', line_style: 'dashed', stroke_width: 'semithick', stroke_color: 'teal!80!black' },
      },
      { tool: 'line', dxCm: 1.5, dyCm: 1.2, dx2Cm: 2.05, dy2Cm: 1.52, values: { stroke_width: 'semithick' } },
      { tool: 'node', dxCm: 2.35, dyCm: 1.62, values: { mode: 'math', content: '\\mathrm{OH}' } },
    ],
  },

  // P53: Control Theory (ТАУ) & DSP Block Diagrams
  {
    id: 'tau-closed-loop-pid',
    domainGroup: 'control-dsp',
    codeTag: 'P53 · Контур ТАУ',
    titleRu: 'Замкнутая САУ с сумматором ±, регулятором W_p(s) и ООС',
    subtitleRu: 'Вход r(t), сумматор с отрицательной обратной связью, объект W_o(s) и выход y(t)',
    requiredLibraries: ['arrows.meta'],
    primitives: [
      { tool: 'arrow', dxCm: 0.0, dyCm: 0.9, dx2Cm: 0.68, dy2Cm: 0.9, values: { stroke_width: 'semithick' } },
      { tool: 'node', dxCm: 0.2, dyCm: 1.15, values: { mode: 'math', content: 'r(t)' } },
      { tool: 'circle', dxCm: 0.92, dyCm: 0.9, values: { radius: '0.24cm', fill_color: 'none', stroke_width: 'semithick' } },
      { tool: 'node', dxCm: 0.92, dyCm: 0.9, values: { mode: 'math', content: '\\Sigma' } },
      { tool: 'node', dxCm: 0.62, dyCm: 1.08, values: { mode: 'math', content: '+' } },
      { tool: 'node', dxCm: 0.75, dyCm: 0.55, values: { mode: 'math', content: '-' } },
      { tool: 'arrow', dxCm: 1.16, dyCm: 0.9, dx2Cm: 1.65, dy2Cm: 0.9, values: { stroke_width: 'semithick' } },
      {
        tool: 'rectangle',
        dxCm: 1.65,
        dyCm: 0.58,
        dx2Cm: 2.65,
        dy2Cm: 1.22,
        values: { fill_color: 'blue!8', stroke_width: 'semithick', rounded_corners: '2pt' },
      },
      { tool: 'node', dxCm: 2.15, dyCm: 0.9, values: { mode: 'math', content: 'W_p(s)' } },
      { tool: 'arrow', dxCm: 2.65, dyCm: 0.9, dx2Cm: 3.15, dy2Cm: 0.9, values: { stroke_width: 'semithick' } },
      {
        tool: 'rectangle',
        dxCm: 3.15,
        dyCm: 0.58,
        dx2Cm: 4.15,
        dy2Cm: 1.22,
        values: { fill_color: 'emerald!10', stroke_width: 'semithick', rounded_corners: '2pt' },
      },
      { tool: 'node', dxCm: 3.65, dyCm: 0.9, values: { mode: 'math', content: 'W_o(s)' } },
      { tool: 'arrow', dxCm: 4.15, dyCm: 0.9, dx2Cm: 4.95, dy2Cm: 0.9, values: { stroke_width: 'semithick' } },
      { tool: 'node', dxCm: 4.85, dyCm: 1.15, values: { mode: 'math', content: 'y(t)' } },
      { tool: 'circle', dxCm: 4.48, dyCm: 0.9, values: { radius: '0.06cm', fill_color: 'slate!12' } },
      { tool: 'line', dxCm: 4.48, dyCm: 0.9, dx2Cm: 4.48, dy2Cm: 0.15, values: { stroke_width: 'semithick' } },
      { tool: 'line', dxCm: 4.48, dyCm: 0.15, dx2Cm: 0.92, dy2Cm: 0.15, values: { stroke_width: 'semithick' } },
      { tool: 'arrow', dxCm: 0.92, dyCm: 0.15, dx2Cm: 0.92, dy2Cm: 0.66, values: { stroke_width: 'semithick' } },
    ],
  },
  {
    id: 'dsp-integrator-z1',
    domainGroup: 'control-dsp',
    codeTag: 'P53 · ЦОС / z⁻¹ звено',
    titleRu: 'Каскад задержки ЦОС z⁻¹ с весовым умножителем b₁',
    subtitleRu: 'Линия задержки, отводной узел, треугольный усилитель и сумматор',
    requiredLibraries: ['arrows.meta'],
    primitives: [
      { tool: 'arrow', dxCm: 0.0, dyCm: 0.95, dx2Cm: 0.8, dy2Cm: 0.95, values: { stroke_width: 'semithick' } },
      {
        tool: 'rectangle',
        dxCm: 0.8,
        dyCm: 0.62,
        dx2Cm: 1.55,
        dy2Cm: 1.28,
        values: { fill_color: 'amber!14', stroke_width: 'semithick' },
      },
      { tool: 'node', dxCm: 1.18, dyCm: 0.95, values: { mode: 'math', content: 'z^{-1}' } },
      { tool: 'arrow', dxCm: 1.55, dyCm: 0.95, dx2Cm: 2.85, dy2Cm: 0.95, values: { stroke_width: 'semithick' } },
      {
        tool: 'line',
        dxCm: 0,
        dyCm: 0,
        values: {
          poly_points: '1.95cm,0.65cm;1.95cm,0.15cm;2.45cm,0.40cm',
          poly_closed: 'cycle',
          fill_color: 'blue!8',
          stroke_width: 'semithick',
        },
      },
      { tool: 'node', dxCm: 2.12, dyCm: 0.4, values: { mode: 'math', content: 'b_1' } },
      { tool: 'circle', dxCm: 3.1, dyCm: 0.95, values: { radius: '0.22cm', stroke_width: 'semithick' } },
      { tool: 'node', dxCm: 3.1, dyCm: 0.95, values: { mode: 'math', content: '+' } },
    ],
  },

  // P55: Finite Automata & Commutative Diagrams
  {
    id: 'dfa-accepting-pair',
    domainGroup: 'automata-cd',
    codeTag: 'P55 · Конечный автомат',
    titleRu: 'Автомат Мили / ДКА: start → q₀ ⇄ q₁ (двойное кольцо accepting)',
    subtitleRu: 'Состояния q₀ и допускающее состояние q₁ с дугами переходов по символам 0/1',
    requiredLibraries: ['arrows.meta'],
    primitives: [
      { tool: 'arrow', dxCm: 0.0, dyCm: 0.75, dx2Cm: 0.56, dy2Cm: 0.75, values: { stroke_width: 'semithick' } },
      { tool: 'circle', dxCm: 0.92, dyCm: 0.75, values: { radius: '0.36cm', fill_color: 'blue!8', stroke_width: 'semithick' } },
      { tool: 'node', dxCm: 0.92, dyCm: 0.75, values: { mode: 'math', content: 'q_0', node_id: 'Q0' } },
      { tool: 'circle', dxCm: 2.95, dyCm: 0.75, values: { radius: '0.38cm', fill_color: 'emerald!10', stroke_width: 'semithick' } },
      { tool: 'circle', dxCm: 2.95, dyCm: 0.75, values: { radius: '0.30cm', fill_color: 'none', stroke_width: 'thin' } },
      { tool: 'node', dxCm: 2.95, dyCm: 0.75, values: { mode: 'math', content: 'q_1', node_id: 'Q1' } },
      {
        tool: 'cubic',
        dxCm: 1.24,
        dyCm: 0.95,
        values: {
          start_x: '1.24cm',
          start_y: '0.95cm',
          control1_x: '1.75cm',
          control1_y: '1.38cm',
          control2_x: '2.15cm',
          control2_y: '1.38cm',
          end_x: '2.62cm',
          end_y: '0.95cm',
          stroke_width: 'semithick',
        },
      },
      { tool: 'node', dxCm: 1.95, dyCm: 1.42, values: { mode: 'math', content: 'a' } },
      {
        tool: 'cubic',
        dxCm: 2.62,
        dyCm: 0.55,
        values: {
          start_x: '2.62cm',
          start_y: '0.55cm',
          control1_x: '2.15cm',
          control1_y: '0.12cm',
          control2_x: '1.75cm',
          control2_y: '0.12cm',
          end_x: '1.24cm',
          end_y: '0.55cm',
          stroke_width: 'semithick',
        },
      },
      { tool: 'node', dxCm: 1.95, dyCm: 0.08, values: { mode: 'math', content: 'b' } },
    ],
  },
  {
    id: 'commutative-square-2x2',
    domainGroup: 'automata-cd',
    codeTag: 'P55 · Коммутативный квадрат',
    titleRu: 'Диаграмма морфизмов A → B, C → D (tikz-cd эквивалент)',
    subtitleRu: 'Четыре именованных узла объектов, морфизмы f, g, α, β и диагональ пунктиром',
    requiredLibraries: ['arrows.meta'],
    primitives: [
      { tool: 'node', dxCm: 0.4, dyCm: 1.5, values: { mode: 'math', content: 'A', node_id: 'CDA' } },
      { tool: 'node', dxCm: 2.6, dyCm: 1.5, values: { mode: 'math', content: 'B', node_id: 'CDB' } },
      { tool: 'node', dxCm: 0.4, dyCm: 0.1, values: { mode: 'math', content: 'C', node_id: 'CDC' } },
      { tool: 'node', dxCm: 2.6, dyCm: 0.1, values: { mode: 'math', content: 'D', node_id: 'CDD' } },
      { tool: 'arrow', dxCm: 0.72, dyCm: 1.5, dx2Cm: 2.28, dy2Cm: 1.5, values: { from_node: 'CDA', to_node: 'CDB', stroke_width: 'semithick' } },
      { tool: 'arrow', dxCm: 0.72, dyCm: 0.1, dx2Cm: 2.28, dy2Cm: 0.1, values: { from_node: 'CDC', to_node: 'CDD', stroke_width: 'semithick' } },
      { tool: 'arrow', dxCm: 0.4, dyCm: 1.24, dx2Cm: 0.4, dy2Cm: 0.36, values: { from_node: 'CDA', to_node: 'CDC', stroke_width: 'semithick' } },
      { tool: 'arrow', dxCm: 2.6, dyCm: 1.24, dx2Cm: 2.6, dy2Cm: 0.36, values: { from_node: 'CDB', to_node: 'CDD', stroke_width: 'semithick' } },
      {
        tool: 'arrow',
        dxCm: 0.68,
        dyCm: 1.32,
        dx2Cm: 2.32,
        dy2Cm: 0.28,
        values: { line_style: 'dashed', stroke_color: 'blue!75!black' },
      },
      { tool: 'node', dxCm: 1.5, dyCm: 1.74, values: { mode: 'math', content: 'f' } },
      { tool: 'node', dxCm: 1.5, dyCm: -0.15, values: { mode: 'math', content: 'g' } },
      { tool: 'node', dxCm: 0.12, dyCm: 0.8, values: { mode: 'math', content: '\\alpha' } },
      { tool: 'node', dxCm: 2.88, dyCm: 0.8, values: { mode: 'math', content: '\\beta' } },
    ],
  },
];

export function insertNotationPresetIntoSource(
  source: string,
  presetId: string,
  originCm: { x: number; y: number } = { x: 1.0, y: 1.0 }
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  const preset = SCIENTIFIC_NOTATION_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    return { nextSource: source, insertedIds: [], summaryRu: 'Шаблон нотации не найден.' };
  }

  let cur = source;
  for (const lib of preset.requiredLibraries) {
    const plan = proposeLibraryConnect(cur, lib);
    if (plan.ok) {
      cur = plan.nextSource;
    }
  }

  const insertedIds: number[] = [];
  for (const seed of preset.primitives) {
    const x1 = +(originCm.x + seed.dxCm).toFixed(2);
    const y1 = +(originCm.y + seed.dyCm).toFixed(2);
    const x2 = +(originCm.x + (seed.dx2Cm ?? seed.dxCm + 1.0)).toFixed(2);
    const y2 = +(originCm.y + (seed.dy2Cm ?? seed.dyCm)).toFixed(2);

    const vals: Record<string, string> = { ...seed.values };
    if (seed.tool === 'arrow' && !vals.tip) {
      vals.tip = 'Stealth';
    }
    if (seed.tool === 'node') {
      vals.x = `${x1}cm`;
      vals.y = `${y1}cm`;
    } else if (seed.tool === 'circle') {
      vals.center_x = `${x1}cm`;
      vals.center_y = `${y1}cm`;
      if (!vals.radius) vals.radius = '0.25cm';
    } else if (seed.tool === 'cubic') {
      const shiftCoord = (raw: string | undefined, base: number) =>
        `${+((parseDimensionToCm(raw) ?? 0) + base).toFixed(2)}cm`;
      vals.start_x = shiftCoord(seed.values.start_x, originCm.x);
      vals.start_y = shiftCoord(seed.values.start_y, originCm.y);
      vals.control1_x = shiftCoord(seed.values.control1_x, originCm.x);
      vals.control1_y = shiftCoord(seed.values.control1_y, originCm.y);
      vals.control2_x = shiftCoord(seed.values.control2_x, originCm.x);
      vals.control2_y = shiftCoord(seed.values.control2_y, originCm.y);
      vals.end_x = shiftCoord(seed.values.end_x, originCm.x);
      vals.end_y = shiftCoord(seed.values.end_y, originCm.y);
    } else if (vals.poly_points) {
      const pts = parsePolyPointsList(vals.poly_points).map((p) => ({
        xCm: p.xCm + originCm.x,
        yCm: p.yCm + originCm.y,
      }));
      vals.poly_points = serializePolyPointsList(pts);
      vals.start_x = `${(pts[0]?.xCm ?? originCm.x).toFixed(2)}cm`;
      vals.start_y = `${(pts[0]?.yCm ?? originCm.y).toFixed(2)}cm`;
      vals.end_x = `${(pts[pts.length - 1]?.xCm ?? originCm.x + 1).toFixed(2)}cm`;
      vals.end_y = `${(pts[pts.length - 1]?.yCm ?? originCm.y).toFixed(2)}cm`;
    } else {
      vals.start_x = `${x1}cm`;
      vals.start_y = `${y1}cm`;
      vals.end_x = `${x2}cm`;
      vals.end_y = `${y2}cm`;
    }

    const res = insertOwnedPrimitiveIntoSource(cur, seed.tool, vals);
    cur = res.nextSource;
    insertedIds.push(res.newId);
  }

  return {
    nextSource: cur,
    insertedIds,
    summaryRu: `Вставлена научная нотация «${preset.titleRu}» (${insertedIds.length} объектов n1).`,
  };
}

// ============================================================================
// P54: 3D Axonometric & Spherical Projector (ГОСТ 2.317 / tikz-3dplot basis)
// ============================================================================

export type Scene3dPresetId = 'axes-xyz-triad' | 'em-wave-keb' | 'bloch-vector-psi' | 'crystal-unit-cell';

export interface AxonometricBasisPreset {
  id: string;
  labelRu: string;
  azimuthDeg: number;
  elevationDeg: number;
}

export const AXONOMETRIC_BASIS_PRESETS: AxonometricBasisPreset[] = [
  { id: 'gost-isometric', labelRu: 'Изометрия ГОСТ 2.317 (φ=45°, θ=35°)', azimuthDeg: 45, elevationDeg: 35 },
  { id: 'gost-dimetric', labelRu: 'Диметрия ГОСТ 2.317 (φ=22°, θ=20°)', azimuthDeg: 22, elevationDeg: 20 },
  { id: 'optics-oblique', labelRu: 'Волновой ракурс (φ=62°, θ=28°)', azimuthDeg: 62, elevationDeg: 28 },
];

export function project3dPointTo2dCm(
  x3: number,
  y3: number,
  z3: number,
  azimuthDeg: number,
  elevationDeg: number,
  originCm: { x: number; y: number } = { x: 2.8, y: 1.6 },
  scaleCm = 1.0
): { x: number; y: number } {
  const phi = (azimuthDeg * Math.PI) / 180;
  const theta = (elevationDeg * Math.PI) / 180;
  // Standard tikz-3dplot / orthographic camera projection with Z pointing upward
  const u = -Math.sin(phi) * x3 + Math.cos(phi) * y3;
  const v = -Math.sin(theta) * Math.cos(phi) * x3 - Math.sin(theta) * Math.sin(phi) * y3 + Math.cos(theta) * z3;
  return {
    x: +(originCm.x + u * scaleCm).toFixed(2),
    y: +(originCm.y + v * scaleCm).toFixed(2),
  };
}

export function insert3dProjectedSceneIntoSource(
  source: string,
  sceneId: Scene3dPresetId,
  azimuthDeg: number,
  elevationDeg: number,
  originCm: { x: number; y: number } = { x: 2.9, y: 1.55 },
  scaleCm = 1.15
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  let cur = source;
  const libPlan = proposeLibraryConnect(cur, 'arrows.meta');
  if (libPlan.ok) cur = libPlan.nextSource;

  const p = (x: number, y: number, z: number) =>
    project3dPointTo2dCm(x, y, z, azimuthDeg, elevationDeg, originCm, scaleCm);

  const insertedIds: number[] = [];
  const addPrim = (tool: ToolId, vals: Record<string, string>) => {
    const cleanVals = tool === 'arrow' && !vals.tip ? { ...vals, tip: 'Stealth' } : vals;
    const res = insertOwnedPrimitiveIntoSource(cur, tool, cleanVals);
    cur = res.nextSource;
    insertedIds.push(res.newId);
  };

  const o = p(0, 0, 0);
  const ex = p(1.45, 0, 0);
  const ey = p(0, 1.45, 0);
  const ez = p(0, 0, 1.45);

  // Always emit projected X, Y, Z basis axes
  addPrim('arrow', { start_x: `${o.x}cm`, start_y: `${o.y}cm`, end_x: `${ex.x}cm`, end_y: `${ex.y}cm`, stroke_width: 'thin' });
  addPrim('arrow', { start_x: `${o.x}cm`, start_y: `${o.y}cm`, end_x: `${ey.x}cm`, end_y: `${ey.y}cm`, stroke_width: 'thin' });
  addPrim('arrow', { start_x: `${o.x}cm`, start_y: `${o.y}cm`, end_x: `${ez.x}cm`, end_y: `${ez.y}cm`, stroke_width: 'thin' });
  addPrim('node', { x: `${ex.x}cm`, y: `${ex.y}cm`, mode: 'math', content: 'x', anchor: 'below left' });
  addPrim('node', { x: `${ey.x}cm`, y: `${ey.y}cm`, mode: 'math', content: 'y', anchor: 'right' });
  addPrim('node', { x: `${ez.x}cm`, y: `${ez.y}cm`, mode: 'math', content: 'z', anchor: 'above' });

  if (sceneId === 'axes-xyz-triad') {
    const r = p(1.0, 1.0, 0.95);
    const rxy = p(1.0, 1.0, 0);
    addPrim('line', { start_x: `${o.x}cm`, start_y: `${o.y}cm`, end_x: `${rxy.x}cm`, end_y: `${rxy.y}cm`, line_style: 'dashed', stroke_color: 'teal!80!black' });
    addPrim('line', { start_x: `${rxy.x}cm`, start_y: `${rxy.y}cm`, end_x: `${r.x}cm`, end_y: `${r.y}cm`, line_style: 'dashed', stroke_color: 'teal!80!black' });
    addPrim('arrow', { start_x: `${o.x}cm`, start_y: `${o.y}cm`, end_x: `${r.x}cm`, end_y: `${r.y}cm`, stroke_width: 'thick', stroke_color: 'blue!75!black' });
    addPrim('node', { x: `${r.x}cm`, y: `${+(r.y + 0.22).toFixed(2)}cm`, mode: 'math', content: '\\vec{r}(\\theta,\\varphi)' });
  } else if (sceneId === 'em-wave-keb') {
    // Orthogonal wave triad k (along y), E (along z), B (along x)
    const ePts: { xCm: number; yCm: number }[] = [];
    const bPts: { xCm: number; yCm: number }[] = [];
    for (let i = 0; i <= 16; i++) {
      const yVal = (i / 16) * 1.4;
      const amp = 0.55 * Math.sin((i / 16) * Math.PI * 2);
      const pe = p(0, yVal, amp);
      const pb = p(amp, yVal, 0);
      ePts.push({ xCm: pe.x, yCm: pe.y });
      bPts.push({ xCm: pb.x, yCm: pb.y });
    }
    addPrim('line', {
      start_x: `${o.x}cm`,
      start_y: `${o.y}cm`,
      end_x: `${ey.x}cm`,
      end_y: `${ey.y}cm`,
      poly_points: serializePolyPointsList(ePts),
      stroke_color: 'blue!75!black',
      stroke_width: 'semithick',
    });
    addPrim('line', {
      start_x: `${o.x}cm`,
      start_y: `${o.y}cm`,
      end_x: `${ey.x}cm`,
      end_y: `${ey.y}cm`,
      poly_points: serializePolyPointsList(bPts),
      stroke_color: 'red!75!black',
      stroke_width: 'semithick',
    });
    const topE = p(0, 0.35, 0.65);
    addPrim('node', { x: `${topE.x}cm`, y: `${topE.y}cm`, mode: 'math', content: '\\vec{E}' });
  } else if (sceneId === 'bloch-vector-psi') {
    addPrim('circle', { center_x: `${o.x}cm`, center_y: `${o.y}cm`, radius: `${+(1.15 * scaleCm).toFixed(2)}cm`, line_style: 'dashed', stroke_width: 'thin' });
    const psi = p(0.65, 0.72, 0.82);
    addPrim('arrow', { start_x: `${o.x}cm`, start_y: `${o.y}cm`, end_x: `${psi.x}cm`, end_y: `${psi.y}cm`, stroke_width: 'thick', stroke_color: 'orange!85!black' });
    addPrim('node', { x: `${psi.x}cm`, y: `${+(psi.y + 0.22).toFixed(2)}cm`, mode: 'math', content: '|\\psi\\rangle' });
  } else {
    // Crystal unit cell wireframe cube
    const c000 = p(0, 0, 0);
    const c100 = p(1, 0, 0);
    const c110 = p(1, 1, 0);
    const c010 = p(0, 1, 0);
    const c001 = p(0, 0, 1);
    const c101 = p(1, 0, 1);
    const c111 = p(1, 1, 1);
    const c011 = p(0, 1, 1);
    const bot = serializePolyPointsList([c000, c100, c110, c010].map((q) => ({ xCm: q.x, yCm: q.y })));
    const top = serializePolyPointsList([c001, c101, c111, c011].map((q) => ({ xCm: q.x, yCm: q.y })));
    addPrim('line', { start_x: `${c000.x}cm`, start_y: `${c000.y}cm`, end_x: `${c010.x}cm`, end_y: `${c010.y}cm`, poly_points: bot, poly_closed: 'cycle', stroke_color: 'teal!80!black' });
    addPrim('line', { start_x: `${c001.x}cm`, start_y: `${c001.y}cm`, end_x: `${c011.x}cm`, end_y: `${c011.y}cm`, poly_points: top, poly_closed: 'cycle', stroke_color: 'blue!75!black', stroke_width: 'semithick' });
    for (const [a, b] of [
      [c000, c001],
      [c100, c101],
      [c110, c111],
      [c010, c011],
    ]) {
      addPrim('line', { start_x: `${a.x}cm`, start_y: `${a.y}cm`, end_x: `${b.x}cm`, end_y: `${b.y}cm`, line_style: 'dashed' });
    }
  }

  return {
    nextSource: cur,
    insertedIds,
    summaryRu: `Построена 3D-проекция (φ=${azimuthDeg}°, θ=${elevationDeg}°, ${insertedIds.length} объектов n1 · P54).`,
  };
}

// ============================================================================
// P56: Corner Rounding & Two-Segment Fillet / Chamfer CAD Solver
// ============================================================================

export const ALLOWED_ROUNDED_CORNERS_OPTIONS = ['', '2pt', '3pt', '4pt', '6pt', '2mm', '3mm'] as const;

export function parseCornerRadiusPx(raw: string | undefined, pxPerCm: number): number {
  if (!raw) return 0;
  const cm = parseDimensionToCm(raw);
  if (cm !== null && cm > 0) {
    return Math.min(28, Math.max(2, +(cm * pxPerCm).toFixed(1)));
  }
  return 4;
}

export function constructFilletOrChamferInSource(
  source: string,
  primitiveIds: number[],
  radiusCm: number,
  mode: 'fillet' | 'chamfer'
): { nextSource: string; newId: number | null; summaryRu: string } {
  const all = parseOwnedPrimitives(source);
  const segs = primitiveIds
    .map((id) => all.find((p) => p.id === id))
    .filter(
      (p): p is OwnedPrimitive =>
        Boolean(p && (p.tool === 'line' || p.tool === 'arrow') && !p.values.poly_points)
    );

  if (segs.length < 2) {
    return {
      nextSource: source,
      newId: null,
      summaryRu: 'Выделите два пересекающихся или смежных отрезка (Shift+клик) для построения сопряжения (P56).',
    };
  }

  const s1 = segs[0];
  const s2 = segs[1];
  const a1 = { x: parseDimensionToCm(s1.values.start_x) ?? 0, y: parseDimensionToCm(s1.values.start_y) ?? 0 };
  const b1 = { x: parseDimensionToCm(s1.values.end_x) ?? 1, y: parseDimensionToCm(s1.values.end_y) ?? 0 };
  const a2 = { x: parseDimensionToCm(s2.values.start_x) ?? 0, y: parseDimensionToCm(s2.values.start_y) ?? 0 };
  const b2 = { x: parseDimensionToCm(s2.values.end_x) ?? 0, y: parseDimensionToCm(s2.values.end_y) ?? 1 };

  const dx1 = b1.x - a1.x;
  const dy1 = b1.y - a1.y;
  const dx2 = b2.x - a2.x;
  const dy2 = b2.y - a2.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-5) {
    return {
      nextSource: source,
      newId: null,
      summaryRu: 'Отрезки параллельны — невозможно построить угловое сопряжение или фаску.',
    };
  }

  const t = ((a2.x - a1.x) * dy2 - (a2.y - a1.y) * dx2) / denom;
  const ix = a1.x + t * dx1;
  const iy = a1.y + t * dy1;

  // Choose the far endpoint on each segment away from intersection I
  const dist = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y);
  const far1 = dist(a1, { x: ix, y: iy }) >= dist(b1, { x: ix, y: iy }) ? a1 : b1;
  const far2 = dist(a2, { x: ix, y: iy }) >= dist(b2, { x: ix, y: iy }) ? a2 : b2;
  const trimEnd1IsB = far1 === a1;
  const trimEnd2IsB = far2 === a2;

  const len1 = Math.max(0.05, dist(far1, { x: ix, y: iy }));
  const len2 = Math.max(0.05, dist(far2, { x: ix, y: iy }));
  const u1 = { x: (far1.x - ix) / len1, y: (far1.y - iy) / len1 };
  const u2 = { x: (far2.x - ix) / len2, y: (far2.y - iy) / len2 };

  const cosAlpha = Math.max(-0.98, Math.min(0.98, u1.x * u2.x + u1.y * u2.y));
  const alpha = Math.acos(cosAlpha);
  const setbackRaw = mode === 'fillet' ? radiusCm / Math.max(0.15, Math.tan(alpha / 2)) : radiusCm;
  const setback = Math.min(setbackRaw, len1 * 0.45, len2 * 0.45);

  const t1 = { x: +(ix + u1.x * setback).toFixed(2), y: +(iy + u1.y * setback).toFixed(2) };
  const t2 = { x: +(ix + u2.x * setback).toFixed(2), y: +(iy + u2.y * setback).toFixed(2) };

  let cur = applyOwnedPrimitivePatch(source, s1.id, {
    ...s1.values,
    ...(trimEnd1IsB
      ? { end_x: `${t1.x.toFixed(2)}cm`, end_y: `${t1.y.toFixed(2)}cm` }
      : { start_x: `${t1.x.toFixed(2)}cm`, start_y: `${t1.y.toFixed(2)}cm` }),
  });

  cur = applyOwnedPrimitivePatch(cur, s2.id, {
    ...s2.values,
    ...(trimEnd2IsB
      ? { end_x: `${t2.x.toFixed(2)}cm`, end_y: `${t2.y.toFixed(2)}cm` }
      : { start_x: `${t2.x.toFixed(2)}cm`, start_y: `${t2.y.toFixed(2)}cm` }),
  });

  if (mode === 'chamfer') {
    const ins = insertOwnedPrimitiveIntoSource(cur, 'line', {
      start_x: `${t1.x.toFixed(2)}cm`,
      start_y: `${t1.y.toFixed(2)}cm`,
      end_x: `${t2.x.toFixed(2)}cm`,
      end_y: `${t2.y.toFixed(2)}cm`,
      stroke_width: s1.values.stroke_width ?? 'semithick',
      ...(s1.values.stroke_color ? { stroke_color: s1.values.stroke_color } : {}),
    });
    return {
      nextSource: ins.nextSource,
      newId: ins.newId,
      summaryRu: `Построена фаска ${setback.toFixed(2)} см между #${s1.id} и #${s2.id} (объект #${ins.newId} · P56).`,
    };
  }

  // Smooth tangent Bezier arc from t1 to t2 towards vertex I
  const kappa = 0.552;
  const c1 = { x: +(t1.x + (ix - t1.x) * kappa).toFixed(2), y: +(t1.y + (iy - t1.y) * kappa).toFixed(2) };
  const c2 = { x: +(t2.x + (ix - t2.x) * kappa).toFixed(2), y: +(t2.y + (iy - t2.y) * kappa).toFixed(2) };
  const ins = insertOwnedPrimitiveIntoSource(cur, 'cubic', {
    start_x: `${t1.x.toFixed(2)}cm`,
    start_y: `${t1.y.toFixed(2)}cm`,
    control1_x: `${c1.x.toFixed(2)}cm`,
    control1_y: `${c1.y.toFixed(2)}cm`,
    control2_x: `${c2.x.toFixed(2)}cm`,
    control2_y: `${c2.y.toFixed(2)}cm`,
    end_x: `${t2.x.toFixed(2)}cm`,
    end_y: `${t2.y.toFixed(2)}cm`,
    stroke_width: s1.values.stroke_width ?? 'semithick',
    ...(s1.values.stroke_color ? { stroke_color: s1.values.stroke_color } : {}),
  });

  return {
    nextSource: ins.nextSource,
    newId: ins.newId,
    summaryRu: `Построено касательное скругление R=${radiusCm.toFixed(2)} см между #${s1.id} и #${s2.id} (#${ins.newId} · P56).`,
  };
}

// ============================================================================
// P57: Shaded Area Between Two Curves / Confidence Band (±σ)
// ============================================================================

function sampleCurvePointsCm(prim: OwnedPrimitive): Array<{ x: number; y: number }> {
  const v = prim.values;
  if (v.poly_points) {
    const pts = parsePolyPointsList(v.poly_points);
    if (pts.length >= 2) {
      return pts.map((p) => ({ x: p.xCm, y: p.yCm }));
    }
  }
  if (prim.tool === 'cubic') {
    const sx = parseDimensionToCm(v.start_x) ?? 0.6;
    const sy = parseDimensionToCm(v.start_y) ?? 0.8;
    const c1x = parseDimensionToCm(v.control1_x) ?? 1.6;
    const c1y = parseDimensionToCm(v.control1_y) ?? 2.4;
    const c2x = parseDimensionToCm(v.control2_x) ?? 3.2;
    const c2y = parseDimensionToCm(v.control2_y) ?? 2.4;
    const ex = parseDimensionToCm(v.end_x) ?? 4.4;
    const ey = parseDimensionToCm(v.end_y) ?? 1.1;
    const out: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const mt = 1 - t;
      const x = mt * mt * mt * sx + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * ex;
      const y = mt * mt * mt * sy + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * ey;
      out.push({ x: +x.toFixed(2), y: +y.toFixed(2) });
    }
    return out;
  }
  if (prim.tool === 'line' || prim.tool === 'arrow') {
    return [
      { x: parseDimensionToCm(v.start_x) ?? 0.5, y: parseDimensionToCm(v.start_y) ?? 1.0 },
      { x: parseDimensionToCm(v.end_x) ?? 3.5, y: parseDimensionToCm(v.end_y) ?? 2.0 },
    ];
  }
  return [];
}

export function insertFillBetweenCurvesIntoSource(
  source: string,
  primitiveIds: number[],
  baselineYCm = 0.5,
  options: { fillColor?: string; hatchPattern?: string } = {}
): { nextSource: string; newId: number | null; summaryRu: string } {
  const all = parseOwnedPrimitives(source);
  const curves = primitiveIds
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is OwnedPrimitive => Boolean(p))
    .map((p) => ({ prim: p, pts: sampleCurvePointsCm(p) }))
    .filter((item) => item.pts.length >= 2);

  if (curves.length === 0) {
    return {
      nextSource: source,
      newId: null,
      summaryRu: 'Выделите 1 кривую (для заливки до базовой линии y₀) или 2 кривые (для коридора ±σ · P57).',
    };
  }

  let cur = source;
  if (options.hatchPattern) {
    const patPlan = proposeLibraryConnect(cur, 'patterns');
    if (patPlan.ok) cur = patPlan.nextSource;
  }

  let closedPts: Array<{ x: number; y: number }>;
  if (curves.length >= 2) {
    const upper = curves[0].pts;
    const lower = [...curves[1].pts].reverse();
    closedPts = [...upper, ...lower];
  } else {
    const top = curves[0].pts;
    const first = top[0];
    const last = top[top.length - 1];
    closedPts = [
      ...top,
      { x: last.x, y: +baselineYCm.toFixed(2) },
      { x: first.x, y: +baselineYCm.toFixed(2) },
    ];
  }

  const polyStr = serializePolyPointsList(closedPts.map((p) => ({ xCm: p.x, yCm: p.y })));
  const ins = insertOwnedPrimitiveIntoSource(cur, 'line', {
    start_x: `${closedPts[0].x.toFixed(2)}cm`,
    start_y: `${closedPts[0].y.toFixed(2)}cm`,
    end_x: `${closedPts[closedPts.length - 1].x.toFixed(2)}cm`,
    end_y: `${closedPts[closedPts.length - 1].y.toFixed(2)}cm`,
    poly_points: polyStr,
    poly_closed: 'cycle',
    fill_color: options.fillColor || 'blue!8',
    stroke_color: 'oiSkyBlue',
    stroke_width: 'thin',
    layer_id: 'bg',
    ...(options.hatchPattern ? { hatch_pattern: options.hatchPattern } : {}),
  });

  const reordered = reorderOwnedPrimitiveInSource(ins.nextSource, ins.newId, 'back');
  return {
    nextSource: reordered.nextSource,
    newId: ins.newId,
    summaryRu:
      curves.length >= 2
        ? `Построена заливка области между кривыми #${curves[0].prim.id} и #${curves[1].prim.id} (#${ins.newId} на слое bg · P57).`
        : `Построена заливка под кривой #${curves[0].prim.id} до уровня y=${baselineYCm.toFixed(2)} см (#${ins.newId} · P57).`,
  };
}

// ============================================================================
// P58: Interactive Spy Magnifier Inset (\usetikzlibrary{spy} / ГОСТ 2.305)
// ============================================================================

export function insertSpyMagnifierInsetIntoSource(
  source: string,
  lensCenterCm: { x: number; y: number },
  lensRadiusCm: number,
  insetCenterCm: { x: number; y: number },
  magnification: number
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  let cur = source;
  const existing = parseOwnedPrimitives(cur);
  const mag = Math.max(2, Math.min(8, magnification));
  const insetRadiusCm = +(lensRadiusCm * Math.min(2.4, 1 + (mag - 1) * 0.35)).toFixed(2);
  const insertedIds: number[] = [];

  const addPrim = (tool: ToolId, vals: Record<string, string>) => {
    const cleanVals = tool === 'arrow' && !vals.tip ? { ...vals, tip: 'Stealth' } : vals;
    const res = insertOwnedPrimitiveIntoSource(cur, tool, cleanVals);
    cur = res.nextSource;
    insertedIds.push(res.newId);
  };

  // 1. Source lens circle
  addPrim('circle', {
    center_x: `${lensCenterCm.x.toFixed(2)}cm`,
    center_y: `${lensCenterCm.y.toFixed(2)}cm`,
    radius: `${lensRadiusCm.toFixed(2)}cm`,
    line_style: 'dashed',
    stroke_color: 'orange!85!black',
    stroke_width: 'semithick',
    layer_id: 'annotations',
  });

  // 2. Inset callout background circle
  addPrim('circle', {
    center_x: `${insetCenterCm.x.toFixed(2)}cm`,
    center_y: `${insetCenterCm.y.toFixed(2)}cm`,
    radius: `${insetRadiusCm.toFixed(2)}cm`,
    fill_color: 'slate!12',
    stroke_color: 'orange!85!black',
    stroke_width: 'thick',
    layer_id: 'annotations',
  });

  // 3. Connecting leader segment between lens rim and inset rim
  const dx = insetCenterCm.x - lensCenterCm.x;
  const dy = insetCenterCm.y - lensCenterCm.y;
  const dLen = Math.max(0.01, Math.hypot(dx, dy));
  const ux = dx / dLen;
  const uy = dy / dLen;
  if (dLen > lensRadiusCm + insetRadiusCm) {
    addPrim('line', {
      start_x: `${(lensCenterCm.x + ux * lensRadiusCm).toFixed(2)}cm`,
      start_y: `${(lensCenterCm.y + uy * lensRadiusCm).toFixed(2)}cm`,
      end_x: `${(insetCenterCm.x - ux * insetRadiusCm).toFixed(2)}cm`,
      end_y: `${(insetCenterCm.y - uy * insetRadiusCm).toFixed(2)}cm`,
      line_style: 'dotted',
      stroke_color: 'orange!85!black',
      layer_id: 'annotations',
    });
  }

  // 4. Magnify up to 3 nearby line/circle primitives inside the inset circle
  const clampInInset = (x: number, y: number) => {
    const rx = x - insetCenterCm.x;
    const ry = y - insetCenterCm.y;
    const r = Math.hypot(rx, ry);
    const maxR = insetRadiusCm * 0.88;
    if (r <= maxR || r < 1e-4) return { x: +x.toFixed(2), y: +y.toFixed(2) };
    return {
      x: +(insetCenterCm.x + (rx / r) * maxR).toFixed(2),
      y: +(insetCenterCm.y + (ry / r) * maxR).toFixed(2),
    };
  };

  let clonedDetails = 0;
  for (const prim of existing) {
    if (clonedDetails >= 3) break;
    if (prim.tool === 'line' || prim.tool === 'arrow') {
      const sx = parseDimensionToCm(prim.values.start_x) ?? 0;
      const sy = parseDimensionToCm(prim.values.start_y) ?? 0;
      const ex = parseDimensionToCm(prim.values.end_x) ?? 0;
      const ey = parseDimensionToCm(prim.values.end_y) ?? 0;
      const mx = (sx + ex) / 2;
      const my = (sy + ey) / 2;
      if (Math.hypot(mx - lensCenterCm.x, my - lensCenterCm.y) <= lensRadiusCm * 2.4) {
        const ms = clampInInset(
          insetCenterCm.x + (sx - lensCenterCm.x) * mag * 0.55,
          insetCenterCm.y + (sy - lensCenterCm.y) * mag * 0.55
        );
        const me = clampInInset(
          insetCenterCm.x + (ex - lensCenterCm.x) * mag * 0.55,
          insetCenterCm.y + (ey - lensCenterCm.y) * mag * 0.55
        );
        addPrim(prim.tool, {
          start_x: `${ms.x}cm`,
          start_y: `${ms.y}cm`,
          end_x: `${me.x}cm`,
          end_y: `${me.y}cm`,
          stroke_width: 'thick',
          ...(prim.values.stroke_color ? { stroke_color: prim.values.stroke_color } : {}),
          layer_id: 'annotations',
        });
        clonedDetails++;
      }
    }
  }

  // 5. ГОСТ 2.305 callout header above inset
  addPrim('node', {
    x: `${insetCenterCm.x.toFixed(2)}cm`,
    y: `${(insetCenterCm.y + insetRadiusCm + 0.24).toFixed(2)}cm`,
    mode: 'math',
    content: `\\mathrm{A}\\,(\\times ${mag})`,
    layer_id: 'annotations',
  });

  return {
    nextSource: cur,
    insertedIds,
    summaryRu: `Добавлен выносной элемент-лупа А (×${mag}, ГОСТ 2.305 · P58).`,
  };
}

// ============================================================================
// P59: Patent & ГОСТ Positional Leader Shelves (1, 2, 3...) + Legend Builder
// ============================================================================

export interface PositionalLegendEntry {
  posNumber: number;
  labelRu: string;
}

export function insertPositionalLeaderShelfIntoSource(
  source: string,
  posNumber: number,
  targetCm: { x: number; y: number },
  shelfCm: { x: number; y: number },
  shelfWidthCm = 0.55
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  const dir = shelfCm.x >= targetCm.x ? 1 : -1;
  const shelfEndX = +(shelfCm.x + dir * shelfWidthCm).toFixed(2);
  const polyPts = serializePolyPointsList([
    { xCm: targetCm.x, yCm: targetCm.y },
    { xCm: shelfCm.x, yCm: shelfCm.y },
    { xCm: shelfEndX, yCm: shelfCm.y },
  ]);

  let cur = source;
  const insertedIds: number[] = [];

  const dotRes = insertOwnedPrimitiveIntoSource(cur, 'circle', {
    center_x: `${targetCm.x.toFixed(2)}cm`,
    center_y: `${targetCm.y.toFixed(2)}cm`,
    radius: '0.05cm',
    fill_color: 'slate!12',
    layer_id: 'annotations',
  });
  cur = dotRes.nextSource;
  insertedIds.push(dotRes.newId);

  const lineRes = insertOwnedPrimitiveIntoSource(cur, 'line', {
    start_x: `${targetCm.x.toFixed(2)}cm`,
    start_y: `${targetCm.y.toFixed(2)}cm`,
    end_x: `${shelfEndX.toFixed(2)}cm`,
    end_y: `${shelfCm.y.toFixed(2)}cm`,
    poly_points: polyPts,
    stroke_width: 'thin',
    layer_id: 'annotations',
  });
  cur = lineRes.nextSource;
  insertedIds.push(lineRes.newId);

  const labelX = +((shelfCm.x + shelfEndX) / 2).toFixed(2);
  const labelY = +(shelfCm.y + 0.18).toFixed(2);
  const nodeRes = insertOwnedPrimitiveIntoSource(cur, 'node', {
    x: `${labelX}cm`,
    y: `${labelY}cm`,
    mode: 'math',
    content: String(posNumber),
    layer_id: 'annotations',
  });
  cur = nodeRes.nextSource;
  insertedIds.push(nodeRes.newId);

  return {
    nextSource: cur,
    insertedIds,
    summaryRu: `Добавлена позиционная выноска-полка №${posNumber} (ГОСТ 2.316 · P59).`,
  };
}

export function formatPositionalLegendCaptionRu(entries: PositionalLegendEntry[]): string {
  const clean = entries
    .filter((e) => e.labelRu.trim().length > 0)
    .sort((a, b) => a.posNumber - b.posNumber);
  if (clean.length === 0) return '';
  return clean.map((e) => `\\textit{${e.posNumber}} — ${e.labelRu.trim()}`).join('; ');
}

// ============================================================================
// P60: Radial Pie-Menu SVG Annular Sector Geometry (zero inline CSS styles)
// ============================================================================

export interface RadialPieSectorSpec {
  id: string;
  shortLabelRu: string;
  hotkeyLabel: string;
  startDeg: number;
  endDeg: number;
}

export const RADIAL_PIE_SECTORS: RadialPieSectorSpec[] = [
  { id: 'tool-select', shortLabelRu: 'Выбор', hotkeyLabel: 'V', startDeg: -112.5, endDeg: -67.5 },
  { id: 'tool-line', shortLabelRu: 'Отрезок', hotkeyLabel: 'L', startDeg: -67.5, endDeg: -22.5 },
  { id: 'tool-arrow', shortLabelRu: 'Стрелка', hotkeyLabel: 'A', startDeg: -22.5, endDeg: 22.5 },
  { id: 'tool-polygon', shortLabelRu: 'Контур', hotkeyLabel: 'P', startDeg: 22.5, endDeg: 67.5 },
  { id: 'tool-node', shortLabelRu: 'Формула', hotkeyLabel: 'N', startDeg: 67.5, endDeg: 112.5 },
  { id: 'act-eyedropper', shortLabelRu: 'Пипетка', hotkeyLabel: 'I', startDeg: 112.5, endDeg: 157.5 },
  { id: 'act-rotate45', shortLabelRu: '↻ +45°', hotkeyLabel: 'R', startDeg: 157.5, endDeg: 202.5 },
  { id: 'act-clone-or-list', shortLabelRu: 'Список…', hotkeyLabel: '≡', startDeg: 202.5, endDeg: 247.5 },
];

export function buildAnnularSectorSvgPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
): { pathD: string; labelX: number; labelY: number } {
  const a0 = (startDeg * Math.PI) / 180;
  const a1 = (endDeg * Math.PI) / 180;
  const amid = ((startDeg + endDeg) * 0.5 * Math.PI) / 180;

  const x0o = +(cx + rOuter * Math.cos(a0)).toFixed(2);
  const y0o = +(cy + rOuter * Math.sin(a0)).toFixed(2);
  const x1o = +(cx + rOuter * Math.cos(a1)).toFixed(2);
  const y1o = +(cy + rOuter * Math.sin(a1)).toFixed(2);

  const x1i = +(cx + rInner * Math.cos(a1)).toFixed(2);
  const y1i = +(cy + rInner * Math.sin(a1)).toFixed(2);
  const x0i = +(cx + rInner * Math.cos(a0)).toFixed(2);
  const y0i = +(cy + rInner * Math.sin(a0)).toFixed(2);

  const rMid = (rInner + rOuter) * 0.5;
  return {
    pathD: `M ${x0o} ${y0o} A ${rOuter} ${rOuter} 0 0 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rInner} ${rInner} 0 0 0 ${x0i} ${y0i} Z`,
    labelX: +(cx + rMid * Math.cos(amid)).toFixed(2),
    labelY: +(cy + rMid * Math.sin(amid)).toFixed(2),
  };
}

// ============================================================================
// P61: Style Eyedropper & Passport Copy/Paste
// ============================================================================

export interface StylePassport {
  sourcePrimitiveId: number;
  stroke_width: string;
  line_style: string;
  stroke_color: string;
  fill_color: string;
  hatch_pattern: string;
  rounded_corners: string;
  layer_id: string;
}

export function extractStylePassport(prim: OwnedPrimitive): StylePassport {
  return {
    sourcePrimitiveId: prim.id,
    stroke_width: prim.values.stroke_width ?? '',
    line_style: prim.values.line_style ?? '',
    stroke_color: prim.values.stroke_color ?? '',
    fill_color: prim.values.fill_color ?? '',
    hatch_pattern: prim.values.hatch_pattern ?? '',
    rounded_corners: prim.values.rounded_corners ?? '',
    layer_id: prim.values.layer_id ?? '',
  };
}

export function applyStylePassportToPrimitivesInSource(
  source: string,
  targetIds: number[],
  passport: StylePassport
): { nextSource: string; updatedCount: number } {
  let cur = source;
  if (passport.hatch_pattern) {
    const patPlan = proposeLibraryConnect(cur, 'patterns');
    if (patPlan.ok) cur = patPlan.nextSource;
  }

  let updatedCount = 0;
  for (const id of targetIds) {
    const prim = parseOwnedPrimitives(cur).find((p) => p.id === id);
    if (!prim) continue;
    const nextVals: Record<string, string> = { ...prim.values };

    const setOrDel = (key: string, val: string) => {
      if (val) nextVals[key] = val;
      else delete nextVals[key];
    };

    if (prim.tool !== 'node') {
      setOrDel('stroke_width', passport.stroke_width);
      setOrDel('line_style', passport.line_style);
      setOrDel('rounded_corners', passport.rounded_corners);
    }
    setOrDel('stroke_color', passport.stroke_color);
    if (
      prim.tool === 'rectangle' ||
      prim.tool === 'circle' ||
      prim.tool === 'node' ||
      prim.values.poly_closed === 'cycle'
    ) {
      setOrDel('fill_color', passport.fill_color);
      if (prim.tool !== 'node') {
        setOrDel('hatch_pattern', passport.hatch_pattern);
      }
    }
    setOrDel('layer_id', passport.layer_id);

    cur = applyOwnedPrimitivePatch(cur, id, nextVals);
    updatedCount++;
  }

  return { nextSource: cur, updatedCount };
}

// ============================================================================
// P62: Spreadsheet Object Outliner (egui_extras::TableBuilder mirror)
// ============================================================================

export interface SpreadsheetPrimitiveRow {
  id: number;
  tool: ToolId;
  lineNumber: number;
  x1Cm: string;
  y1Cm: string;
  x2OrRadiusCm: string;
  y2Cm: string;
  contentOrNote: string;
  layerId: CadLayerId;
  strokeColor: string;
  beamerSpec: string;
  isHidden: boolean;
  isLocked: boolean;
}

export function buildSpreadsheetRows(
  ownedPrimitives: OwnedPrimitive[],
  hiddenLayers: CadLayerId[],
  lockedLayers: CadLayerId[]
): SpreadsheetPrimitiveRow[] {
  return ownedPrimitives.map((p) => {
    const v = p.values;
    const rawLayer = (v.layer_id as CadLayerId | undefined) || (p.tool === 'node' ? 'annotations' : 'main');
    const fmt = (raw: string | undefined, fallback = '0.00') => {
      const n = parseDimensionToCm(raw);
      return n !== null ? n.toFixed(2) : fallback;
    };

    if (p.tool === 'node') {
      return {
        id: p.id,
        tool: p.tool,
        lineNumber: p.lineNumber,
        x1Cm: fmt(v.x),
        y1Cm: fmt(v.y),
        x2OrRadiusCm: '—',
        y2Cm: '—',
        contentOrNote: v.content ?? '',
        layerId: rawLayer,
        strokeColor: v.stroke_color ?? '',
        beamerSpec: v.beamer_spec ?? '',
        isHidden: hiddenLayers.includes(rawLayer),
        isLocked: lockedLayers.includes(rawLayer),
      };
    }

    if (p.tool === 'circle') {
      return {
        id: p.id,
        tool: p.tool,
        lineNumber: p.lineNumber,
        x1Cm: fmt(v.center_x),
        y1Cm: fmt(v.center_y),
        x2OrRadiusCm: fmt(v.radius, '0.50'),
        y2Cm: '—',
        contentOrNote: v.fill_color ? `fill=${v.fill_color}` : 'окружность',
        layerId: rawLayer,
        strokeColor: v.stroke_color ?? '',
        beamerSpec: v.beamer_spec ?? '',
        isHidden: hiddenLayers.includes(rawLayer),
        isLocked: lockedLayers.includes(rawLayer),
      };
    }

    return {
      id: p.id,
      tool: p.tool,
      lineNumber: p.lineNumber,
      x1Cm: fmt(v.start_x),
      y1Cm: fmt(v.start_y),
      x2OrRadiusCm: fmt(v.end_x),
      y2Cm: fmt(v.end_y),
      contentOrNote:
        v.poly_closed === 'cycle'
          ? 'полигон (-- cycle)'
          : v.callout_label || v.decoration_label || (v.from_node ? `${v.from_node}→${v.to_node ?? ''}` : ''),
      layerId: rawLayer,
      strokeColor: v.stroke_color ?? '',
      beamerSpec: v.beamer_spec ?? '',
      isHidden: hiddenLayers.includes(rawLayer),
      isLocked: lockedLayers.includes(rawLayer),
    };
  });
}

export type EditableSpreadsheetField =
  | 'x1Cm'
  | 'y1Cm'
  | 'x2OrRadiusCm'
  | 'y2Cm'
  | 'contentOrNote'
  | 'layerId'
  | 'strokeColor'
  | 'beamerSpec';

export function applySpreadsheetCellEditInSource(
  source: string,
  primitiveId: number,
  field: EditableSpreadsheetField,
  rawValue: string
): { nextSource: string; ok: boolean } {
  const prim = parseOwnedPrimitives(source).find((p) => p.id === primitiveId);
  if (!prim) return { nextSource: source, ok: false };
  const nextVals: Record<string, string> = { ...prim.values };

  const parseNumCm = (s: string): string | null => {
    const n = Number(s.trim().replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    return `${n.toFixed(2)}cm`;
  };

  if (field === 'x1Cm') {
    const dim = parseNumCm(rawValue);
    if (!dim) return { nextSource: source, ok: false };
    if (prim.tool === 'node') nextVals.x = dim;
    else if (prim.tool === 'circle') nextVals.center_x = dim;
    else nextVals.start_x = dim;
  } else if (field === 'y1Cm') {
    const dim = parseNumCm(rawValue);
    if (!dim) return { nextSource: source, ok: false };
    if (prim.tool === 'node') nextVals.y = dim;
    else if (prim.tool === 'circle') nextVals.center_y = dim;
    else nextVals.start_y = dim;
  } else if (field === 'x2OrRadiusCm') {
    const dim = parseNumCm(rawValue);
    if (!dim) return { nextSource: source, ok: false };
    if (prim.tool === 'circle') {
      if (Number(dim.replace('cm', '')) <= 0) return { nextSource: source, ok: false };
      nextVals.radius = dim;
    } else if (prim.tool !== 'node') {
      nextVals.end_x = dim;
    }
  } else if (field === 'y2Cm') {
    const dim = parseNumCm(rawValue);
    if (!dim || prim.tool === 'node' || prim.tool === 'circle') return { nextSource: source, ok: false };
    nextVals.end_y = dim;
  } else if (field === 'contentOrNote') {
    if (prim.tool === 'node') {
      nextVals.content = rawValue.trim() || 'A';
    } else if (nextVals.callout === 'dim') {
      nextVals.callout_label = rawValue;
    } else if (nextVals.decoration_kind) {
      nextVals.decoration_label = rawValue;
    }
  } else if (field === 'layerId') {
    if (rawValue) nextVals.layer_id = rawValue;
    else delete nextVals.layer_id;
  } else if (field === 'strokeColor') {
    if (rawValue) nextVals.stroke_color = rawValue;
    else delete nextVals.stroke_color;
  } else if (field === 'beamerSpec') {
    if (rawValue.trim()) nextVals.beamer_spec = rawValue.trim();
    else delete nextVals.beamer_spec;
  }

  return { nextSource: applyOwnedPrimitivePatch(source, primitiveId, nextVals), ok: true };
}

// ============================================================================
// P63: Live Canvas Math Typography Shaper (SVG <tspan> Subscripts/Greek/Units)
// ============================================================================

export interface MathDisplayRun {
  text: string;
  script: 'normal' | 'sub' | 'sup';
  upright?: boolean;
  bold?: boolean;
}

const LATEX_SYMBOL_MAP: ReadonlyArray< readonly [RegExp, string] > = [
  [/\\alpha(?![A-Za-z])/g, 'α'],
  [/\\beta(?![A-Za-z])/g, 'β'],
  [/\\gamma(?![A-Za-z])/g, 'γ'],
  [/\\delta(?![A-Za-z])/g, 'δ'],
  [/\\varepsilon(?![A-Za-z])/g, 'ε'],
  [/\\epsilon(?![A-Za-z])/g, 'ϵ'],
  [/\\zeta(?![A-Za-z])/g, 'ζ'],
  [/\\eta(?![A-Za-z])/g, 'η'],
  [/\\theta(?![A-Za-z])/g, 'θ'],
  [/\\kappa(?![A-Za-z])/g, 'κ'],
  [/\\lambda(?![A-Za-z])/g, 'λ'],
  [/\\mu(?![A-Za-z])/g, 'μ'],
  [/\\nu(?![A-Za-z])/g, 'ν'],
  [/\\xi(?![A-Za-z])/g, 'ξ'],
  [/\\pi(?![A-Za-z])/g, 'π'],
  [/\\rho(?![A-Za-z])/g, 'ρ'],
  [/\\sigma(?![A-Za-z])/g, 'σ'],
  [/\\tau(?![A-Za-z])/g, 'τ'],
  [/\\varphi(?![A-Za-z])/g, 'φ'],
  [/\\phi(?![A-Za-z])/g, 'ϕ'],
  [/\\chi(?![A-Za-z])/g, 'χ'],
  [/\\psi(?![A-Za-z])/g, 'ψ'],
  [/\\omega(?![A-Za-z])/g, 'ω'],
  [/\\Gamma(?![A-Za-z])/g, 'Γ'],
  [/\\Delta(?![A-Za-z])/g, 'Δ'],
  [/\\Theta(?![A-Za-z])/g, 'Θ'],
  [/\\Lambda(?![A-Za-z])/g, 'Λ'],
  [/\\Xi(?![A-Za-z])/g, 'Ξ'],
  [/\\Pi(?![A-Za-z])/g, 'Π'],
  [/\\Sigma(?![A-Za-z])/g, 'Σ'],
  [/\\Phi(?![A-Za-z])/g, 'Φ'],
  [/\\Psi(?![A-Za-z])/g, 'Ψ'],
  [/\\Omega(?![A-Za-z])/g, 'Ω'],
  [/\\hbar(?![A-Za-z])/g, 'ℏ'],
  [/\\pm(?![A-Za-z])/g, '±'],
  [/\\mp(?![A-Za-z])/g, '∓'],
  [/\\times(?![A-Za-z])/g, '×'],
  [/\\cdot(?![A-Za-z])/g, '·'],
  [/\\infty(?![A-Za-z])/g, '∞'],
  [/\\approx(?![A-Za-z])/g, '≈'],
  [/\\sim(?![A-Za-z])/g, '∼'],
  [/\\equiv(?![A-Za-z])/g, '≡'],
  [/\\leq(?![A-Za-z])/g, '≤'],
  [/\\geq(?![A-Za-z])/g, '≥'],
  [/\\neq(?![A-Za-z])/g, '≠'],
  [/\\rightarrow(?![A-Za-z])|\\to(?![A-Za-z])/g, '→'],
  [/\\leftarrow(?![A-Za-z])/g, '←'],
  [/\\leftrightarrow(?![A-Za-z])/g, '↔'],
  [/\\Rightarrow(?![A-Za-z])/g, '⇒'],
  [/\\partial(?![A-Za-z])/g, '∂'],
  [/\\nabla(?![A-Za-z])/g, '∇'],
  [/\\int(?![A-Za-z])/g, '∫'],
  [/\\sum(?![A-Za-z])/g, '∑'],
  [/\\prod(?![A-Za-z])/g, '∏'],
  [/\\oplus(?![A-Za-z])/g, '⊕'],
  [/\\otimes(?![A-Za-z])/g, '⊗'],
  [/\\langle(?![A-Za-z])/g, '⟨'],
  [/\\rangle(?![A-Za-z])/g, '⟩'],
  [/\\dagger(?![A-Za-z])/g, '†'],
  [/\\circ(?![A-Za-z])/g, '°'],
];

function replaceSymbolsInSegment(raw: string): string {
  let s = raw
    .replace(/^\$+|\$+$/g, '')
    .replace(/\\qty\{([^}]*)\}\{([^}]*)\}/g, '$1 $2')
    .replace(/\\SI\{([^}]*)\}\{([^}]*)\}/g, '$1 $2')
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1⁄$2')
    .replace(/\\,|\\;|\\!/g, ' ')
    .replace(/\\quad\b/g, '  ');

  for (const [re, sym] of LATEX_SYMBOL_MAP) {
    s = s.replace(re, sym);
  }
  return s;
}

export function parseLatexToDisplayRuns(rawLatex: string): MathDisplayRun[] {
  const input = replaceSymbolsInSegment(rawLatex || '');
  const runs: MathDisplayRun[] = [];
  let buf = '';
  let i = 0;

  const flushNormal = (upright = false) => {
    if (buf.length > 0) {
      runs.push({ text: buf, script: 'normal', ...(upright ? { upright: true } : {}) });
      buf = '';
    }
  };

  while (i < input.length) {
    // Check \vec{...} or \hat{...} -> bold italic physics vector/operator (zero combining-mark tofu)
    const vecMatch = /^\\(?:vec|hat)\{([^}]*)\}/.exec(input.slice(i));
    if (vecMatch) {
      flushNormal(false);
      const inner = replaceSymbolsInSegment(vecMatch[1]);
      if (inner.length > 0) {
        runs.push({ text: inner, script: 'normal', bold: true });
      }
      i += vecMatch[0].length;
      continue;
    }

    // Check \text{...} or \mathrm{...} or \mathbf{...} or \textit{...}
    const macroMatch = /^\\(text|mathrm|mathbf|textit)\{([^}]*)\}/.exec(input.slice(i));
    if (macroMatch) {
      flushNormal(false);
      const cmd = macroMatch[1];
      const inner = replaceSymbolsInSegment(macroMatch[2]);
      if (inner.length > 0) {
        runs.push({
          text: inner,
          script: 'normal',
          upright: cmd !== 'textit',
          ...(cmd === 'mathbf' ? { bold: true } : {}),
        });
      }
      i += macroMatch[0].length;
      continue;
    }

    const ch = input[i];
    if ((ch === '_' || ch === '^') && i + 1 < input.length) {
      flushNormal(false);
      const scriptKind: 'sub' | 'sup' = ch === '_' ? 'sub' : 'sup';
      if (input[i + 1] === '{') {
        const closeIdx = input.indexOf('}', i + 2);
        if (closeIdx !== -1) {
          const inner = replaceSymbolsInSegment(input.slice(i + 2, closeIdx));
          if (inner) runs.push({ text: inner, script: scriptKind });
          i = closeIdx + 1;
          continue;
        }
      } else {
        // Single char or command token like _0 or _\alpha
        const nextToken = input[i + 1];
        runs.push({ text: nextToken, script: scriptKind });
        i += 2;
        continue;
      }
    }

    if (ch !== '{' && ch !== '}') {
      buf += ch;
    }
    i++;
  }

  flushNormal(false);
  return runs.length > 0 ? runs : [{ text: rawLatex || 'A', script: 'normal' }];
}

// ============================================================================
// P64: Geometric & Visual Pre-Submission Linter (without LaTeX compiler)
// ============================================================================

export type VisualLintCode =
  | 'BBOX-OVERLAP'
  | 'THIN-STROKE-PRINT'
  | 'MATH-HOMOGLYPH'
  | 'DECIMAL-MIX';

export interface VisualLintFinding {
  id: string;
  code: VisualLintCode;
  severity: 'warning' | 'info';
  lineNumber: number;
  primitiveIds: number[];
  titleRu: string;
  detailRu: string;
  canAutoFix: boolean;
}

const CYRILLIC_TO_LATIN_MATH_MAP: Record<string, string> = {
  а: 'a',
  е: 'e',
  о: 'o',
  р: 'p',
  с: 'c',
  у: 'y',
  х: 'x',
  А: 'A',
  В: 'B',
  Е: 'E',
  К: 'K',
  М: 'M',
  Н: 'H',
  О: 'O',
  Р: 'P',
  С: 'C',
  Т: 'T',
  Х: 'X',
};

const CYRILLIC_HOMOGLYPH_RE = /[аеорсухАВЕКМНОРСТХ]/;

function stripTextMacros(mathSegment: string): string {
  return mathSegment.replace(/\\(?:text|mathrm|textit)\{[^}]*\}/g, '');
}

export function runVisualPreSubmissionAudit(
  source: string,
  ownedPrimitives: OwnedPrimitive[],
  journalWidthCm = 8.8
): VisualLintFinding[] {
  const findings: VisualLintFinding[] = [];
  const scaleFactor = Math.min(1, journalWidthCm / 12.0);

  // 1. BBOX-OVERLAP: Check node label bounding boxes for collisions
  const nodes = ownedPrimitives.filter((p) => p.tool === 'node');
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const ax = parseDimensionToCm(a.values.x) ?? 0;
      const ay = parseDimensionToCm(a.values.y) ?? 0;
      const bx = parseDimensionToCm(b.values.x) ?? 0;
      const by = parseDimensionToCm(b.values.y) ?? 0;

      const aw = Math.max(0.45, Math.min(1.6, ((a.values.content ?? '').length * 0.09)));
      const bw = Math.max(0.45, Math.min(1.6, ((b.values.content ?? '').length * 0.09)));
      const overlapX = Math.abs(ax - bx) < (aw + bw) * 0.42;
      const overlapY = Math.abs(ay - by) < 0.28;

      if (overlapX && overlapY) {
        findings.push({
          id: `bbox-${a.id}-${b.id}`,
          code: 'BBOX-OVERLAP',
          severity: 'warning',
          lineNumber: b.lineNumber,
          primitiveIds: [a.id, b.id],
          titleRu: `Наложение подписей #${a.id} и #${b.id}`,
          detailRu: `Центры узлов (${ax.toFixed(2)}, ${ay.toFixed(2)}) и (${bx.toFixed(2)}, ${by.toFixed(2)}) см ближе порога читаемости 0.28 см.`,
          canAutoFix: true,
        });
      }
    }
  }

  // 2. THIN-STROKE-PRINT: Hairline strokes < 0.35pt when reduced to 1-column journal width
  for (const p of ownedPrimitives) {
    const sw = p.values.stroke_width ?? '';
    if (sw === 'ultra thin' || sw === 'very thin' || (sw === 'thin' && scaleFactor < 0.8)) {
      const basePt = sw === 'ultra thin' ? 0.1 : sw === 'very thin' ? 0.2 : 0.4;
      const effectivePt = +(basePt * scaleFactor).toFixed(2);
      findings.push({
        id: `thin-${p.id}`,
        code: 'THIN-STROKE-PRINT',
        severity: 'warning',
        lineNumber: p.lineNumber,
        primitiveIds: [p.id],
        titleRu: `Тонкий штрих (${sw}) у объекта #${p.id}`,
        detailRu: `При вёрстке в колонку ${journalWidthCm} см толщина составит ~${effectivePt} pt (< 0.35 pt) — риск обрыва линии при офсетной печати.`,
        canAutoFix: true,
      });
    }
  }

  // 3. MATH-HOMOGLYPH: Cyrillic look-alike letters inside math mode (outside \text{...})
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  lines.forEach((line, idx) => {
    if (line.trimStart().startsWith('%')) return;
    const mathMatches = line.match(/\$[^$]+\$/g) ?? [];
    for (const m of mathMatches) {
      const cleaned = stripTextMacros(m);
      if (CYRILLIC_HOMOGLYPH_RE.test(cleaned)) {
        findings.push({
          id: `homoglyph-L${idx + 1}`,
          code: 'MATH-HOMOGLYPH',
          severity: 'warning',
          lineNumber: idx + 1,
          primitiveIds: [],
          titleRu: `Кириллический омоглиф внутри формулы $...$ (стр. ${idx + 1})`,
          detailRu: `В математической моде ${m} обнаружены русские буквы-двойники (с/c, р/p, х/x, а/a, о/o), исчезающие в шрифтах Computer Modern.`,
          canAutoFix: true,
        });
        break;
      }
    }
  });

  // 4. DECIMAL-MIX: Mixed decimal point (3.14) and comma (3,14) across math node labels
  let dotCount = 0;
  let commaCount = 0;
  for (const n of nodes) {
    const txt = n.values.content ?? '';
    if (/\d\.\d/.test(txt)) dotCount++;
    if (/\d,\d/.test(txt)) commaCount++;
  }
  if (dotCount > 0 && commaCount > 0) {
    findings.push({
      id: 'decimal-mix-doc',
      code: 'DECIMAL-MIX',
      severity: 'info',
      lineNumber: nodes[0]?.lineNumber ?? 1,
      primitiveIds: nodes.map((n) => n.id),
      titleRu: 'Смешение десятичной точки и запятой в подписях',
      detailRu: `Найдено ${dotCount} подписей с точкой (532.5) и ${commaCount} с запятой (532,5). Для русских статей ГОСТ рекомендуется единый разделитель.`,
      canAutoFix: false,
    });
  }

  return findings;
}

export function applyVisualLintAutoFix(source: string, finding: VisualLintFinding): string {
  if (finding.code === 'THIN-STROKE-PRINT' && finding.primitiveIds.length > 0) {
    let cur = source;
    for (const id of finding.primitiveIds) {
      const p = parseOwnedPrimitives(cur).find((item) => item.id === id);
      if (!p) continue;
      cur = applyOwnedPrimitivePatch(cur, id, { ...p.values, stroke_width: 'semithick' });
    }
    return cur;
  }

  if (finding.code === 'BBOX-OVERLAP' && finding.primitiveIds.length >= 2) {
    const targetId = finding.primitiveIds[1];
    const p = parseOwnedPrimitives(source).find((item) => item.id === targetId);
    if (!p || p.tool !== 'node') return source;
    const ny = (parseDimensionToCm(p.values.y) ?? 1.0) + 0.36;
    return applyOwnedPrimitivePatch(source, targetId, { ...p.values, y: `${ny.toFixed(2)}cm` });
  }

  if (finding.code === 'MATH-HOMOGLYPH') {
    const hasCrlf = source.includes('\r\n');
    const eol = hasCrlf ? '\r\n' : '\n';
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const lineIdx = finding.lineNumber - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) return source;

    lines[lineIdx] = lines[lineIdx].replace(/\$[^$]+\$/g, (mathChunk) => {
      // Preserve \text{...} blocks untouched while replacing homoglyphs outside them
      const parts = mathChunk.split(/(\\(?:text|mathrm|textit)\{[^}]*\})/g);
      return parts
        .map((part, idx) => {
          if (idx % 2 === 1) return part;
          return part.replace(/[аеорсухАВЕКМНОРСТХ]/g, (ch) => CYRILLIC_TO_LATIN_MATH_MAP[ch] ?? ch);
        })
        .join('');
    });
    return lines.join(eol);
  }

  return source;
}

// ============================================================================
// P65: Portable .tikzproj JSON Session Bundle (Linux <-> Windows 10)
// ============================================================================

export interface TikzprojSessionV1 {
  schema: 'tikzarium.project.v1';
  exportedAt: string;
  activeSpecimenId: string;
  activeFilename: string;
  activeSource: string;
  createdDocs: SpecimenDocument[];
  customSnippets: UserSnippetItem[];
  sharedStyleTikz: string;
  digitizerCalibration: DigitizerCalibration;
  digitizerPointsCm: Array<{ x: number; y: number }>;
  hiddenLayers: CadLayerId[];
  lockedLayers: CadLayerId[];
  panelCols: { canvas: number; code: number; inspector: number };
}

export function serializeTikzprojSession(input: Omit<TikzprojSessionV1, 'schema' | 'exportedAt'>): string {
  const bundle: TikzprojSessionV1 = {
    schema: 'tikzarium.project.v1',
    exportedAt: new Date().toISOString(),
    ...input,
  };
  return JSON.stringify(bundle, null, 2);
}

export function parseTikzprojSession(
  jsonText: string
): { ok: true; session: TikzprojSessionV1 } | { ok: false; errorRu: string } {
  try {
    const raw = JSON.parse(jsonText) as Partial<TikzprojSessionV1>;
    if (!raw || raw.schema !== 'tikzarium.project.v1' || typeof raw.activeSource !== 'string') {
      return {
        ok: false,
        errorRu: 'Файл не является корректным пакетом проекта TikZarium (.tikzproj v1).',
      };
    }
    return {
      ok: true,
      session: {
        schema: 'tikzarium.project.v1',
        exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
        activeSpecimenId: typeof raw.activeSpecimenId === 'string' ? raw.activeSpecimenId : 'diagram-arch',
        activeFilename: typeof raw.activeFilename === 'string' ? raw.activeFilename : 'restored_figure.tex',
        activeSource: raw.activeSource,
        createdDocs: Array.isArray(raw.createdDocs) ? raw.createdDocs : [],
        customSnippets: Array.isArray(raw.customSnippets) ? raw.customSnippets : [],
        sharedStyleTikz: typeof raw.sharedStyleTikz === 'string' ? raw.sharedStyleTikz : '',
        digitizerCalibration: raw.digitizerCalibration ?? {
          ref1CanvasCm: { x: 0.8, y: 0.7 },
          ref1Phys: { x: 400, y: 0.0 },
          ref2CanvasCm: { x: 5.4, y: 3.2 },
          ref2Phys: { x: 700, y: 1.0 },
        },
        digitizerPointsCm: Array.isArray(raw.digitizerPointsCm) ? raw.digitizerPointsCm : [],
        hiddenLayers: Array.isArray(raw.hiddenLayers) ? raw.hiddenLayers : [],
        lockedLayers: Array.isArray(raw.lockedLayers) ? raw.lockedLayers : [],
        panelCols:
          raw.panelCols &&
          typeof raw.panelCols.canvas === 'number' &&
          typeof raw.panelCols.code === 'number' &&
          typeof raw.panelCols.inspector === 'number'
            ? raw.panelCols
            : { canvas: 5, code: 4, inspector: 3 },
      },
    };
  } catch {
    return { ok: false, errorRu: 'Ошибка разбора JSON в файле проекта .tikzproj.' };
  }
}
