import React from 'react';
import type {
  PackageCanvasToolSpec,
  PackageToolId,
  RecognizedPackageObject,
} from '../domain/packageCanvasSemantics';

interface SchematicIconProps {
  toolId?: PackageToolId;
  objectKind?: RecognizedPackageObject['kind'];
  circuitKind?: RecognizedPackageObject['circuitKind'];
  familyId?: PackageCanvasToolSpec['familyId'];
  className?: string;
}

/**
 * Compact technical glyph badge (1–4 chars) paired with schematic icons so engineers
 * recognize R, C, L, U, VD, GND, C6, f(x), q0 instantly without long Russian button text.
 */
export const PACKAGE_TOOL_TECH_BADGE: Record<PackageToolId, string> = {
  'pkg:pgfplots-axis': 'XY',
  'pkg:pgfplots-series': 'f(x)',
  'pkg:circuit-R': 'R',
  'pkg:circuit-C': 'C',
  'pkg:circuit-L': 'L',
  'pkg:circuit-V': 'U',
  'pkg:circuit-Do': 'VD',
  'pkg:circuit-ground': 'GND',
  'pkg:automata-state': 'q₀',
  'pkg:automata-edge': 'q→p',
  'pkg:physics-spring': 'k',
  'pkg:physics-wave': 'hν',
  'pkg:optics-lens': 'F',
  'pkg:mech-support': 'Оп',
  'pkg:chem-ring': 'C₆',
  'pkg:clean-line': '—',
  'pkg:clean-arrow': '→',
  'pkg:clean-rect': '▭',
  'pkg:clean-circle': '◯',
  'pkg:clean-node': '$x$',
};

export const PACKAGE_FAMILY_META: Record<
  PackageCanvasToolSpec['familyId'],
  { shortRu: string; tooltipRu: string }
> = {
  circuitikz: {
    shortRu: 'Цепи',
    tooltipRu: 'CircuiTikZ: резисторы R, конденсаторы C, катушки L, источники U, диоды VD, земля GND',
  },
  chemfig: {
    shortRu: 'Химия',
    tooltipRu: 'ChemFig: структурные бензольные кольца и молекулярные скелеты',
  },
  pgfplots: {
    shortRu: 'Графики',
    tooltipRu: 'PGFPlots: координатные оси axis и аналитические кривые \\addplot',
  },
  'physics-optics': {
    shortRu: 'Оптика',
    tooltipRu: 'Физика и оптика: пружины coil, фотоны/волны snake, собирающие линзы',
  },
  mechanics: {
    shortRu: 'ГОСТ',
    tooltipRu: 'Механика и статика: шарнирные опоры и заделки со штриховкой ГОСТ',
  },
  automata: {
    shortRu: 'Графы',
    tooltipRu: 'Automata: состояния конечных автоматов q₀ и дуги переходов',
  },
  'tikz-clean': {
    shortRu: 'TikZ',
    tooltipRu: 'Чистый идиоматический TikZ без служебных комментариев % tikzarium:n1:',
  },
};

export function formatRecognizedPackageObjectLabelRu(pkg: RecognizedPackageObject): string {
  switch (pkg.kind) {
    case 'pgfplots-axis':
      return `Оси ${pkg.axisEnv ?? 'axis'}${pkg.axisTitle ? ` «${pkg.axisTitle}»` : ''}`;
    case 'circuit-bipole':
      return `Цепь ${pkg.circuitKind ?? 'R'}${pkg.labelLatex ? ` (${pkg.labelLatex})` : ''}`;
    case 'circuit-ground':
      return 'Земля GND';
    case 'automata-state':
      return `Состояние ${pkg.nodeName ?? 'q'}`;
    case 'automata-edge':
      return `Переход ${pkg.fromStateId ?? '?'}→${pkg.toStateId ?? '?'}`;
    case 'physics-spring':
      return 'Пружина coil';
    case 'physics-wave':
      return 'Волна / фотон';
    case 'optics-lens':
      return `Линза${pkg.labelLatex ? ` ${pkg.labelLatex}` : ''}`;
    case 'mech-support':
      return 'Опора ГОСТ';
    case 'chemfig-molecule':
      return `Молекула ${pkg.chemFormula ?? 'ChemFig'}`;
    case 'clean-node':
      return `Узел${pkg.nodeName ? ` (${pkg.nodeName})` : ''}${pkg.labelLatex ? ` ${pkg.labelLatex}` : ''}`;
    case 'clean-arrow':
      return 'Вектор TikZ';
    case 'clean-rect':
      return 'Прямоугольник TikZ';
    case 'clean-circle':
      return 'Окружность TikZ';
    case 'clean-line':
    default:
      return 'Отрезок TikZ';
  }
}

function mapObjectToToolId(
  kind?: RecognizedPackageObject['kind'],
  circuitKind?: RecognizedPackageObject['circuitKind']
): PackageToolId {
  switch (kind) {
    case 'pgfplots-axis':
      return 'pkg:pgfplots-axis';
    case 'circuit-bipole':
      if (circuitKind === 'C') return 'pkg:circuit-C';
      if (circuitKind === 'L') return 'pkg:circuit-L';
      if (circuitKind === 'Do') return 'pkg:circuit-Do';
      if (circuitKind === 'V' || circuitKind === 'I') return 'pkg:circuit-V';
      return 'pkg:circuit-R';
    case 'circuit-ground':
      return 'pkg:circuit-ground';
    case 'automata-state':
      return 'pkg:automata-state';
    case 'automata-edge':
      return 'pkg:automata-edge';
    case 'physics-spring':
      return 'pkg:physics-spring';
    case 'physics-wave':
      return 'pkg:physics-wave';
    case 'optics-lens':
      return 'pkg:optics-lens';
    case 'mech-support':
      return 'pkg:mech-support';
    case 'chemfig-molecule':
      return 'pkg:chem-ring';
    case 'clean-arrow':
      return 'pkg:clean-arrow';
    case 'clean-rect':
      return 'pkg:clean-rect';
    case 'clean-circle':
      return 'pkg:clean-circle';
    case 'clean-node':
      return 'pkg:clean-node';
    default:
      return 'pkg:clean-line';
  }
}

export const PackageSchematicIcon: React.FC<SchematicIconProps> = ({
  toolId,
  objectKind,
  circuitKind,
  familyId,
  className = 'w-4 h-4',
}) => {
  const effectiveTool: PackageToolId = familyId
    ? familyId === 'circuitikz'
      ? 'pkg:circuit-R'
      : familyId === 'chemfig'
        ? 'pkg:chem-ring'
        : familyId === 'pgfplots'
          ? 'pkg:pgfplots-axis'
          : familyId === 'physics-optics'
            ? 'pkg:optics-lens'
            : familyId === 'mechanics'
              ? 'pkg:mech-support'
              : familyId === 'automata'
                ? 'pkg:automata-state'
                : 'pkg:clean-line'
    : (toolId ?? mapObjectToToolId(objectKind, circuitKind));

  switch (effectiveTool) {
    case 'pkg:circuit-R':
      // GOST / IEC rectangular resistor with leads
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <line x1="1.5" y1="12" x2="6" y2="12" />
          <rect x="6" y="8.5" width="12" height="7" rx="0.8" />
          <line x1="18" y1="12" x2="22.5" y2="12" />
        </svg>
      );

    case 'pkg:circuit-C':
      // Parallel-plate capacitor
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className={className} aria-hidden="true">
          <line x1="2" y1="12" x2="10" y2="12" />
          <line x1="10" y1="5.5" x2="10" y2="18.5" />
          <line x1="14" y1="5.5" x2="14" y2="18.5" />
          <line x1="14" y1="12" x2="22" y2="12" />
        </svg>
      );

    case 'pkg:circuit-L':
      // 3-arch inductor coil
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M1.5 14 H4.5 A2.5 2.8 0 0 1 9.5 14 A2.5 2.8 0 0 1 14.5 14 A2.5 2.8 0 0 1 19.5 14 H22.5" />
        </svg>
      );

    case 'pkg:circuit-V':
      // Voltage source circle with +/-
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className} aria-hidden="true">
          <line x1="1.5" y1="12" x2="5.5" y2="12" />
          <circle cx="12" cy="12" r="6.5" />
          <line x1="18.5" y1="12" x2="22.5" y2="12" />
          <line x1="9.8" y1="10" x2="9.8" y2="14" />
          <line x1="7.8" y1="12" x2="11.8" y2="12" />
          <line x1="13.8" y1="12" x2="16.4" y2="12" />
        </svg>
      );

    case 'pkg:circuit-Do':
      // Semiconductor diode triangle + cathode bar
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <line x1="2" y1="12" x2="8" y2="12" />
          <polygon points="8,6.5 8,17.5 16.2,12" />
          <line x1="16.5" y1="6.2" x2="16.5" y2="17.8" />
          <line x1="16.5" y1="12" x2="22" y2="12" />
        </svg>
      );

    case 'pkg:circuit-ground':
      // 3-bar electrical ground symbol
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className={className} aria-hidden="true">
          <line x1="12" y1="3.5" x2="12" y2="11.5" />
          <line x1="5" y1="11.5" x2="19" y2="11.5" />
          <line x1="7.5" y1="15.2" x2="16.5" y2="15.2" />
          <line x1="10" y1="18.8" x2="14" y2="18.8" />
        </svg>
      );

    case 'pkg:chem-ring':
      // Benzene hexagon with aromatic inner circle
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className={className} aria-hidden="true">
          <polygon points="12,2.8 19.8,7.4 19.8,16.6 12,21.2 4.2,16.6 4.2,7.4" />
          <circle cx="12" cy="12" r="4.6" />
        </svg>
      );

    case 'pkg:pgfplots-axis':
      // Orthogonal coordinate axes with ticks
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <polyline points="4.5,3.5 4.5,19.5 20.5,19.5" />
          <polyline points="2.8,5.8 4.5,3.5 6.2,5.8" />
          <polyline points="18.2,17.8 20.5,19.5 18.2,21.2" />
          <line x1="9.5" y1="19.5" x2="9.5" y2="17.8" />
          <line x1="14.5" y1="19.5" x2="14.5" y2="17.8" />
          <line x1="4.5" y1="14.5" x2="6.2" y2="14.5" />
          <line x1="4.5" y1="9.5" x2="6.2" y2="9.5" />
        </svg>
      );

    case 'pkg:pgfplots-series':
      // Smooth analytical function curve over baseline
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className} aria-hidden="true">
          <line x1="3" y1="19" x2="21" y2="19" strokeOpacity="0.45" />
          <path d="M3 16.5 C 6.5 5, 10.5 5, 12.5 12 C 14.5 18, 18 17, 21 7.5" />
        </svg>
      );

    case 'pkg:automata-state':
      // Double-circle accepting automaton state
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className={className} aria-hidden="true">
          <circle cx="13" cy="12" r="7.5" />
          <circle cx="13" cy="12" r="5" />
          <line x1="1.5" y1="12" x2="5.2" y2="12" />
        </svg>
      );

    case 'pkg:automata-edge':
      // Directed curved state transition arc
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="4.5" cy="15.5" r="2.3" />
          <circle cx="19.5" cy="15.5" r="2.3" />
          <path d="M6.2 13.5 Q 12 5.5 17.5 13.2" />
          <polyline points="14.8,13 17.7,13.4 17.2,10.5" />
        </svg>
      );

    case 'pkg:physics-spring':
      // Helical spring coil
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2 12 H4.5 L6.2 7 L9 17 L12 7 L15 17 L17.8 7 L19.5 12 H22" />
        </svg>
      );

    case 'pkg:physics-wave':
      // Sinusoidal photon wave with arrow
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2 12 Q 4.5 6.5, 7 12 T 12 12 T 17 12 L 21.5 12" />
          <polyline points="18.8,9.5 21.5,12 18.8,14.5" />
        </svg>
      );

    case 'pkg:optics-lens':
      // Thin converging lens with optical axis
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2 2" strokeOpacity="0.55" />
          <line x1="12" y1="3.5" x2="12" y2="20.5" />
          <polyline points="9.5,6.2 12,3.5 14.5,6.2" />
          <polyline points="9.5,17.8 12,20.5 14.5,17.8" />
        </svg>
      );

    case 'pkg:mech-support':
      // Pinned triangle support with GOST comb hatch
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <polygon points="12,5.5 5.5,16 18.5,16" />
          <line x1="3.5" y1="16" x2="20.5" y2="16" />
          <line x1="6.5" y1="16" x2="4.5" y2="20" />
          <line x1="11" y1="16" x2="9" y2="20" />
          <line x1="15.5" y1="16" x2="13.5" y2="20" />
          <line x1="19.5" y1="16" x2="17.5" y2="20" />
        </svg>
      );

    case 'pkg:clean-arrow':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <line x1="3.5" y1="18.5" x2="19.5" y2="5.5" />
          <polyline points="14,5.2 20,5.2 19.6,11.2" />
        </svg>
      );

    case 'pkg:clean-rect':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="1" />
        </svg>
      );

    case 'pkg:clean-circle':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="7.5" />
        </svg>
      );

    case 'pkg:clean-node':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M8 8.5 L16 15.5 M16 8.5 L8 15.5" />
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" strokeDasharray="2.5 2.5" strokeOpacity="0.55" />
        </svg>
      );

    case 'pkg:clean-line':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className={className} aria-hidden="true">
          <line x1="4" y1="19" x2="20" y2="5" />
          <circle cx="4" cy="19" r="1.5" fill="currentColor" />
          <circle cx="20" cy="5" r="1.5" fill="currentColor" />
        </svg>
      );
  }
};
