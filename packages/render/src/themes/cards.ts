import { scaleAround, type Theme, validators } from '@markmap/core';
import { type BranchColorOptions, branchColors } from './branch';
import {
  alignFor,
  CODE_FONT,
  CONTENT_TOKENS,
  DARK_CONTENT_TOKENS,
  sCurve,
  sidePoint,
  SYSTEM_FONT,
} from './shared';

const RADIUS = 8;
const TOGGLE_RADIUS = 5;

export type CardsThemeOptions = BranchColorOptions;

/** Each node in a rounded card outlined in its branch color. */
export function createCardsTheme(options: CardsThemeOptions = {}): Theme {
  const { tokens: branchTokens, colorOf } = branchColors(options);

  return {
    name: 'cards',
    options: {
      color: validators.colors(),
      colorDepth: validators.number(0, true),
    },
    configure: (next) => createCardsTheme({ ...options, ...next }),
    tokens: {
      'mm-text': '#222',
      'mm-bg': '#f6f7f9',
      'mm-card-bg': '#fff',
      ...CONTENT_TOKENS,
      ...branchTokens,
    },
    darkTokens: {
      'mm-text': '#e6e6e6',
      'mm-bg': '#17181b',
      'mm-card-bg': '#25262b',
      ...DARK_CONTENT_TOKENS,
    },
    font: SYSTEM_FONT,
    codeFontFamily: CODE_FONT,
    textFill: 'var(--mm-text)',
    node: {
      padding: [6, 12, 6, 12],
      minHeight: 32,
      textAlign: (ctx) => alignFor(ctx.direction),
      // Cards grow out of their parent and shrink back into it as well as fading.
      presence: (presence, box) => ({
        opacity: presence,
        transform: scaleAround(0.6 + 0.4 * presence, box.width / 2, box.height / 2),
      }),
      render(_node, box, ctx) {
        const color = colorOf(ctx.path);
        const card = {
          kind: 'rect' as const,
          x: 0,
          y: 0,
          w: box.width,
          h: box.height,
          r: RADIUS,
          fill: 'var(--mm-card-bg)',
          stroke: color,
          strokeWidth: ctx.depth === 0 ? 2.5 : 1.5,
        };
        if (!ctx.hasChildren) return [card];
        const at = sidePoint(box.width, box.height, ctx.direction);
        return [
          card,
          {
            kind: 'rect',
            x: at.x - TOGGLE_RADIUS,
            y: at.y - TOGGLE_RADIUS,
            w: TOGGLE_RADIUS * 2,
            h: TOGGLE_RADIUS * 2,
            r: TOGGLE_RADIUS,
            fill: ctx.folded ? color : 'var(--mm-card-bg)',
            stroke: color,
            strokeWidth: 1.5,
          },
        ];
      },
      anchor(rect, side) {
        const at = sidePoint(rect.width, rect.height, side);
        return { x: rect.x + at.x, y: rect.y + at.y, side };
      },
    },
    edge: {
      render: (from, to, ctx) => [
        { kind: 'path', d: sCurve(from, to), stroke: colorOf(ctx.node.path), strokeWidth: 1.5 },
      ],
    },
  };
}

export const cardsTheme: Theme = createCardsTheme();
