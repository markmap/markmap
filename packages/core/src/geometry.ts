export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

/** Affine transform `[a, b, c, d, e, f]`, as in SVG `matrix()` and canvas `setTransform()`. */
export type Matrix = [number, number, number, number, number, number];

export type Side = 'left' | 'right' | 'top' | 'bottom';

/** Where an edge leaves or enters a node, and which side it faces. */
export interface Anchor extends Point {
  side: Side;
}

export function translate(x: number, y: number): Matrix {
  return [1, 0, 0, 1, x, y];
}

/** Scale by `k` around the point (`cx`, `cy`). */
export function scaleAround(k: number, cx: number, cy: number): Matrix {
  return [k, 0, 0, k, cx * (1 - k), cy * (1 - k)];
}

/** `a` applied after `b`, as in SVG `transform="matrix(a) matrix(b)"`. */
export function multiply(a: Matrix, b: Matrix): Matrix {
  const [a0, a1, a2, a3, a4, a5] = a;
  const [b0, b1, b2, b3, b4, b5] = b;
  return [
    a0 * b0 + a2 * b1,
    a1 * b0 + a3 * b1,
    a0 * b2 + a2 * b3,
    a1 * b2 + a3 * b3,
    a0 * b4 + a2 * b5 + a4,
    a1 * b4 + a3 * b5 + a5,
  ];
}

export function unionRects(rects: Iterable<Rect>): Rect {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of rects) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.width);
    y1 = Math.max(y1, r.y + r.height);
  }
  if (x0 > x1) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

export function expandRect(rect: Rect, by: number): Rect {
  return {
    x: rect.x - by,
    y: rect.y - by,
    width: rect.width + by * 2,
    height: rect.height + by * 2,
  };
}

const OPPOSITE: Record<Side, Side> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };

export function oppositeSide(side: Side): Side {
  return OPPOSITE[side];
}
