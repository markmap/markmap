import type { Theme } from '@markmap/core';
import {
  alignFor,
  CODE_FONT,
  CONTENT_TOKENS,
  DARK_CONTENT_TOKENS,
  sCurve,
  sidePoint,
  SYSTEM_FONT,
} from './shared';

/** Space between a label and where its edges start. */
const GAP = 6;
const DOT_RADIUS = 3.5;

/** Plain text joined by thin gray lines; a small dot marks nodes that fold. */
export const minimalTheme: Theme = {
  name: 'minimal',
  tokens: {
    'mm-color': '#333',
    'mm-bg': '#fff',
    'mm-edge': '#c4c4c4',
    ...CONTENT_TOKENS,
  },
  darkTokens: {
    'mm-color': '#ddd',
    'mm-bg': '#1e1e1e',
    'mm-edge': '#555',
    ...DARK_CONTENT_TOKENS,
  },
  font: SYSTEM_FONT,
  codeFontFamily: CODE_FONT,
  textFill: 'var(--mm-color)',
  node: {
    padding: [2, 4, 2, 4],
    textAlign: (ctx) => alignFor(ctx.direction),
    render(_node, box, ctx) {
      if (!ctx.hasChildren) return [];
      const at = sidePoint(box.width, box.height, ctx.direction, GAP);
      return [
        {
          kind: 'rect',
          x: at.x - DOT_RADIUS,
          y: at.y - DOT_RADIUS,
          w: DOT_RADIUS * 2,
          h: DOT_RADIUS * 2,
          r: DOT_RADIUS,
          fill: ctx.folded ? 'var(--mm-edge)' : 'var(--mm-bg)',
          stroke: 'var(--mm-edge)',
          strokeWidth: 1.5,
        },
      ];
    },
    anchor(rect, side) {
      const at = sidePoint(rect.width, rect.height, side, GAP);
      return { x: rect.x + at.x, y: rect.y + at.y, side };
    },
  },
  edge: {
    render: (from, to) => [
      { kind: 'path', d: sCurve(from, to), stroke: 'var(--mm-edge)', strokeWidth: 1 },
    ],
  },
};
