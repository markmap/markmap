import { type Matrix, multiply, type Primitive, type Rect, translate } from '@markmap/core';

/** An element of MathJax's SVG output. */
export interface SvgNode {
  tag: string;
  attrs: Readonly<Record<string, string>>;
  children: readonly SvgNode[];
}

/** Paint that stands for the label's text color until a formula is drawn. */
const CURRENT_COLOR = 'currentColor';

/** Paints inherited down the tree, as in SVG. */
interface Paints {
  fill?: string;
  stroke?: string;
  strokeWidth: number;
}

class Unsupported extends Error {}

const COMMON_ATTRS = ['transform', 'fill', 'stroke', 'stroke-width'];
const ALLOWED_ATTRS: Readonly<Record<string, readonly string[]>> = {
  g: COMMON_ATTRS,
  path: [...COMMON_ATTRS, 'd'],
  rect: [...COMMON_ATTRS, 'x', 'y', 'width', 'height'],
  line: [...COMMON_ATTRS, 'x1', 'y1', 'x2', 'y2'],
  ellipse: [...COMMON_ATTRS, 'cx', 'cy', 'rx', 'ry'],
  svg: ['x', 'y', 'width', 'height', 'viewBox'],
};

function number(value: string | undefined, fallback?: number): number {
  if (value == null && fallback != null) return fallback;
  const result = Number(value);
  // Units and percentages end up here too.
  if (value == null || value.trim() === '' || !Number.isFinite(result)) throw new Unsupported();
  return result;
}

const numbers = (value: string) =>
  value
    .trim()
    .split(/[\s,]+/)
    .map((part) => number(part));

function parseTransform(value: string): Matrix {
  let matrix: Matrix = [1, 0, 0, 1, 0, 0];
  const rest = value.replace(/(\w+)\(([^)]*)\)/g, (_, name: string, args: string) => {
    const v = numbers(args);
    let next: Matrix;
    if (name === 'translate' && v.length <= 2) next = translate(v[0], v[1] ?? 0);
    else if (name === 'scale' && v.length <= 2) next = [v[0], 0, 0, v[1] ?? v[0], 0, 0];
    else if (name === 'matrix' && v.length === 6) next = v as Matrix;
    else throw new Unsupported();
    matrix = multiply(matrix, next);
    return '';
  });
  if (rest.trim()) throw new Unsupported();
  return matrix;
}

const inheritPaint = (value: string | undefined, current: string | undefined) =>
  value == null ? current : value === 'none' ? undefined : value;

function inherit(attrs: SvgNode['attrs'], paints: Paints): Paints {
  return {
    fill: inheritPaint(attrs.fill, paints.fill),
    stroke: inheritPaint(attrs.stroke, paints.stroke),
    strokeWidth: number(attrs['stroke-width'], paints.strokeWidth),
  };
}

/** A shape's paints; a stroke of width 0 draws nothing. */
const paintsOf = ({ fill, stroke, strokeWidth }: Paints) => ({
  fill,
  ...(stroke && strokeWidth > 0 ? { stroke, strokeWidth } : {}),
});

function shape(node: SvgNode, paints: Paints): Primitive {
  const { attrs } = node;
  switch (node.tag) {
    case 'path':
      if (!attrs.d) throw new Unsupported();
      return { kind: 'path', d: attrs.d, ...paintsOf(paints) };
    case 'rect':
      return {
        kind: 'rect',
        x: number(attrs.x, 0),
        y: number(attrs.y, 0),
        w: number(attrs.width),
        h: number(attrs.height),
        ...paintsOf(paints),
      };
    case 'line': {
      const [x1, y1] = [number(attrs.x1, 0), number(attrs.y1, 0)];
      const [x2, y2] = [number(attrs.x2, 0), number(attrs.y2, 0)];
      return { kind: 'path', d: `M${x1},${y1}L${x2},${y2}`, ...paintsOf(paints) };
    }
    case 'ellipse': {
      const [cx, cy] = [number(attrs.cx, 0), number(attrs.cy, 0)];
      const [rx, ry] = [number(attrs.rx), number(attrs.ry)];
      const arc = `A${rx},${ry} 0 1 0`;
      const d = `M${cx - rx},${cy}${arc} ${cx + rx},${cy}${arc} ${cx - rx},${cy}Z`;
      return { kind: 'path', d, ...paintsOf(paints) };
    }
    default:
      throw new Unsupported();
  }
}

/**
 * What a nested `<svg>` does to its content: place it, fit its view box to its size, and
 * hide what overflows. MathJax relies on that to cut stretched rules to length.
 */
function nestedView({ x, y, width, height, viewBox }: SvgNode['attrs']): {
  transform: Matrix;
  clip: Rect;
} {
  const [minX, minY, boxWidth, boxHeight] = numbers(viewBox ?? '');
  const [w, h] = [number(width), number(height)];
  if (!(boxWidth > 0) || !(boxHeight > 0)) throw new Unsupported();
  const k = Math.min(w / boxWidth, h / boxHeight);
  const left = minX - (w / k - boxWidth) / 2;
  const top = minY - (h / k - boxHeight) / 2;
  return {
    transform: [k, 0, 0, k, number(x, 0) - left * k, number(y, 0) - top * k],
    clip: { x: left, y: top, width: w / k, height: h / k },
  };
}

function convert(node: SvgNode, outer: Paints): Primitive {
  const allowed = ALLOWED_ATTRS[node.tag];
  if (!allowed) throw new Unsupported();
  for (const name of Object.keys(node.attrs)) {
    if (!allowed.includes(name) && !name.startsWith('data-')) throw new Unsupported();
  }
  const paints = inherit(node.attrs, outer);
  const isContainer = node.tag === 'g' || node.tag === 'svg';
  if (!isContainer && node.children.length) throw new Unsupported();
  const content = isContainer
    ? node.children.map((child) => convert(child, paints))
    : [shape(node, paints)];
  if (node.tag === 'svg') return { kind: 'group', ...nestedView(node.attrs), children: content };
  const { transform } = node.attrs;
  if (!isContainer && !transform) return content[0];
  return {
    kind: 'group',
    ...(transform ? { transform: parseTransform(transform) } : {}),
    children: content,
  };
}

/**
 * Turn MathJax's SVG into primitives, in its view box coordinates, for backends that
 * cannot use SVG markup. Only what MathJax is known to emit is accepted: anything else
 * returns `undefined`, so a formula is never drawn wrong.
 */
export function svgToPrimitives(nodes: readonly SvgNode[]): Primitive[] | undefined {
  try {
    const paints: Paints = { fill: CURRENT_COLOR, strokeWidth: 1 };
    return nodes.map((node) => convert(node, paints));
  } catch (error) {
    if (error instanceof Unsupported) return undefined;
    throw error;
  }
}

/** A copy of `primitives` with the text color filled in. */
export function withColor(primitives: readonly Primitive[], color: string): Primitive[] {
  const paint = (value: string | undefined) => (value === CURRENT_COLOR ? color : value);
  return primitives.map((p) => {
    if (p.kind === 'group') return { ...p, children: withColor(p.children, color) };
    if (p.kind === 'rect' || p.kind === 'path') {
      return { ...p, fill: paint(p.fill), stroke: paint(p.stroke) };
    }
    return p;
  });
}
