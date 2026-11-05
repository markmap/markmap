import type { Theme } from '@markmap/core';
import { validators } from '@markmap/core';
import { type BranchColorOptions, branchColors } from './branch';
import {
  alignFor,
  CODE_FONT,
  CONTENT_TOKENS,
  DARK_CONTENT_TOKENS,
  sCurve,
  SYSTEM_FONT,
} from './shared';

const CIRCLE_RADIUS = 6;

/** Space between a top anchor and the label below it. */
const TOP_GAP = 4;

/** Line width shrinks with depth: 4, 2.5, 1.75, … */
const lineWidth = (depth: number) => 1 + 3 / 2 ** depth;

export type ClassicThemeOptions = BranchColorOptions;

/** The original markmap look: underlined labels, curved edges and fold circles. */
export function createClassicTheme(options: ClassicThemeOptions = {}): Theme {
  const { tokens: branchTokens, colorOf } = branchColors(options);

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
      ...CONTENT_TOKENS,
      ...branchTokens,
    },
    darkTokens: {
      'mm-color': '#ddd',
      'mm-bg': '#1e1e1e',
      'mm-circle-open-bg': '#1e1e1e',
      ...DARK_CONTENT_TOKENS,
    },
    font: SYSTEM_FONT,
    codeFontFamily: CODE_FONT,
    textFill: 'var(--mm-color)',
    node: {
      padding: [0, 8, 0, 8],
      minHeight: 16,
      textAlign: (ctx) => alignFor(ctx.direction),
      render(_node, box, ctx) {
        const color = colorOf(ctx.path);
        const width = lineWidth(ctx.depth);
        const y = box.height + width / 2;
        // The fold toggle sits where the children go: the outer end of the underline,
        // or its middle when children grow up or down.
        const cx = { left: 0, right: box.width, top: box.width / 2, bottom: box.width / 2 }[
          ctx.direction
        ];
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
        // Stop short of the label, so the edge does not touch the text.
        return { x, y: side === 'top' ? rect.y - TOP_GAP : y, side };
      },
    },
    edge: {
      render: (from, to, ctx) => [
        {
          kind: 'path',
          d: sCurve(from, to),
          stroke: colorOf(ctx.node.path),
          strokeWidth: lineWidth(ctx.node.depth),
        },
      ],
    },
  };
}

export const classicTheme: Theme = createClassicTheme();
