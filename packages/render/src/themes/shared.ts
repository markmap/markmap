import type { Anchor, Point, Side, TextAlign, Theme } from '@markmap/core';

/** Tokens for inline content, shared by the built-in themes. */
export const CONTENT_TOKENS = {
  'mm-link-color': '#0097e6',
  'mm-code-bg': '#f0f0f0',
  'mm-code-color': '#555',
  'mm-mark-bg': '#ffeaa7',
  'mm-checkbox': '#555',
  'mm-attachment': '#999',
  // Code highlighting in popovers.
  'mm-hl-keyword': '#cf222e',
  'mm-hl-string': '#0a3069',
  'mm-hl-comment': '#6e7781',
  'mm-hl-number': '#0550ae',
  'mm-hl-title': '#8250df',
  'mm-hl-attr': '#116329',
};

export const DARK_CONTENT_TOKENS = {
  'mm-link-color': '#4fb3f6',
  'mm-code-bg': '#2f2f33',
  'mm-code-color': '#d4d4d4',
  'mm-mark-bg': '#6b5a1e',
  'mm-checkbox': '#bbb',
  'mm-attachment': '#888',
  'mm-hl-keyword': '#ff7b72',
  'mm-hl-string': '#a5d6ff',
  'mm-hl-comment': '#8b949e',
  'mm-hl-number': '#79c0ff',
  'mm-hl-title': '#d2a8ff',
  'mm-hl-attr': '#7ee787',
};

export const SYSTEM_FONT: Theme['font'] = {
  family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  size: 16,
  weight: 400,
  style: 'normal',
  lineHeight: 20,
};

export const CODE_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** Wrapped lines hug the edge that faces the parent. */
export function alignFor(direction: Side): TextAlign {
  if (direction === 'left') return 'end';
  if (direction === 'right') return 'start';
  return 'center';
}

/** An S-curve that leaves and arrives along the anchors' axis. */
export function sCurve(from: Anchor, to: Point): string {
  const vertical = from.side === 'top' || from.side === 'bottom';
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const controls = vertical ? `${from.x},${my},${to.x},${my}` : `${mx},${from.y},${mx},${to.y}`;
  return `M${from.x},${from.y}C${controls},${to.x},${to.y}`;
}

/** The middle of one side of a box at (0, 0), pushed `gap` px outwards. */
export function sidePoint(width: number, height: number, side: Side, gap = 0): Point {
  if (side === 'left') return { x: -gap, y: height / 2 };
  if (side === 'right') return { x: width + gap, y: height / 2 };
  if (side === 'top') return { x: width / 2, y: -gap };
  return { x: width / 2, y: height + gap };
}
