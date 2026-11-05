import type { Theme } from '@markmap/core';

const BRANCH_COLORS = [
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

const branchColor = (branch: number) => `var(--mm-branch-${branch % BRANCH_COLORS.length})`;

/** The original markmap look: underlined labels, curved edges and fold circles. */
export const classicTheme: Theme = {
  name: 'classic',
  tokens: {
    'mm-color': '#333',
    'mm-bg': '#fff',
    'mm-circle-open-bg': '#fff',
    'mm-link-color': '#0097e6',
    'mm-code-bg': '#f0f0f0',
    'mm-code-color': '#555',
    'mm-mark-bg': '#ffeaa7',
    'mm-checkbox': '#555',
    ...Object.fromEntries(BRANCH_COLORS.map((color, i) => [`mm-branch-${i}`, color])),
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
      const color = branchColor(ctx.branch);
      const width = lineWidth(ctx.depth);
      const y = box.height + width / 2;
      const chrome = [
        { kind: 'path' as const, d: `M0,${y}H${box.width}`, stroke: color, strokeWidth: width },
      ];
      if (!ctx.hasChildren) return chrome;
      return [
        ...chrome,
        {
          kind: 'rect',
          x: box.width - CIRCLE_RADIUS,
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
    anchor(rect, role, ctx) {
      const y = rect.y + rect.height + lineWidth(ctx.depth) / 2;
      return role === 'source'
        ? { x: rect.x + rect.width, y, side: 'right' }
        : { x: rect.x, y, side: 'left' };
    },
  },
  edge: {
    render(from, to, ctx) {
      const mid = (from.x + to.x) / 2;
      return [
        {
          kind: 'path',
          d: `M${from.x},${from.y}C${mid},${from.y},${mid},${to.y},${to.x},${to.y}`,
          stroke: branchColor(ctx.node.branch),
          strokeWidth: lineWidth(ctx.node.depth),
        },
      ];
    },
  },
};
