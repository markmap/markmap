import type { Theme } from '@markmap/core';
import { validators } from '@markmap/core';
import { branchIndex } from './branch';

const DEFAULT_COLORS = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
];

const CIRCLE_RADIUS = 6;

/** Line width shrinks with depth: 4, 2.5, 1.75, … */
const lineWidth = (depth: number) => 1 + 3 / 2 ** depth;

export interface ClassicThemeOptions {
  /** Branch colors, cycled through. One color paints every branch the same. */
  color?: string[];
  /** Nodes deeper than this level (the root is level 1) take their ancestor's color. `0` disables. */
  colorFreezeLevel?: number;
}

/** The original markmap look: underlined labels, curved edges and fold circles. */
export function createClassicTheme(options: ClassicThemeOptions = {}): Theme {
  const colors = options.color?.length ? options.color : DEFAULT_COLORS;
  const freezeLevel = options.colorFreezeLevel ?? 0;
  const colorOf = (path: readonly string[]) =>
    `var(--mm-branch-${branchIndex(path, colors.length, freezeLevel)})`;

  return {
    name: 'classic',
    options: {
      color: validators.colors(),
      colorFreezeLevel: validators.number(0, true),
    },
    configure: (next) => createClassicTheme({ ...options, ...next }),
    tokens: {
      'mm-color': '#333',
      'mm-bg': '#fff',
      'mm-circle-open-bg': '#fff',
      'mm-link-color': '#0097e6',
      'mm-code-bg': '#f0f0f0',
      'mm-code-color': '#555',
      'mm-mark-bg': '#ffeaa7',
      'mm-checkbox': '#555',
      'mm-attachment': '#999',
      ...Object.fromEntries(colors.map((color, i) => [`mm-branch-${i}`, color])),
    },
    font: {
      family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      size: 16,
      weight: 400,
      style: 'normal',
      lineHeight: 20,
    },
    codeFontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    textFill: 'var(--mm-color)',
    node: {
      padding: [0, 8, 0, 8],
      minHeight: 16,
      render(_node, box, ctx) {
        const color = colorOf(ctx.path);
        const width = lineWidth(ctx.depth);
        const y = box.height + width / 2;
        // The fold toggle sits where the children go: the outer end of the underline.
        const cx = ctx.direction === 'left' ? 0 : box.width;
        const chrome = [
          { kind: 'path' as const, d: `M0,${y}H${box.width}`, stroke: color, strokeWidth: width },
        ];
        if (!ctx.hasChildren) return chrome;
        return [
          ...chrome,
          {
            kind: 'rect',
            x: cx - CIRCLE_RADIUS,
            y: y - CIRCLE_RADIUS,
            w: CIRCLE_RADIUS * 2,
            h: CIRCLE_RADIUS * 2,
            r: CIRCLE_RADIUS,
            fill: ctx.folded ? color : 'var(--mm-circle-open-bg)',
            stroke: color,
            strokeWidth: 1.5,
          },
        ];
      },
      anchor(rect, side, ctx) {
        // Left and right: the ends of the underline. Top and bottom: the box's middle.
        const y = rect.y + rect.height + lineWidth(ctx.depth) / 2;
        if (side === 'left') return { x: rect.x, y, side };
        if (side === 'right') return { x: rect.x + rect.width, y, side };
        const x = rect.x + rect.width / 2;
        return { x, y: side === 'top' ? rect.y : y, side };
      },
    },
    edge: {
      render(from, to, ctx) {
        const mid = (from.x + to.x) / 2;
        return [
          {
            kind: 'path',
            d: `M${from.x},${from.y}C${mid},${from.y},${mid},${to.y},${to.x},${to.y}`,
            stroke: colorOf(ctx.node.path),
            strokeWidth: lineWidth(ctx.node.depth),
          },
        ];
      },
    },
  };
}

export const classicTheme: Theme = createClassicTheme();
