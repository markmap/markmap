import type { LiteElement } from 'mathjax-full/js/adaptors/lite/Element.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import type { Primitive } from '@markmap/core';
import { type SvgNode, svgToPrimitives } from './shapes';

/** A formula as self-contained SVG, measured in ex. */
export interface MathSvg {
  /** Markup inside the formula's `<svg>` element: paths only, no fonts or links. */
  body: string;
  viewBox: string;
  width: number;
  height: number;
  /** Distance of the baseline below the bottom edge (usually negative), from `vertical-align`. */
  verticalAlign: number;
  /**
   * The formula as primitives in `viewBox` coordinates, for backends that cannot use SVG
   * markup, with `currentColor` standing for the text color. `undefined` when the
   * formula uses something that has no primitive.
   */
  shapes?: Primitive[];
}

/**
 * TeX packages that only lay out math. `html` (links, classes, styles and ids),
 * `require`, `autoload`, `setoptions` and `configmacros` can reach outside the formula
 * or change the converter, so Markdown cannot use them.
 */
const SAFE_PACKAGES = AllPackages.filter(
  (name) => !['html', 'require', 'autoload', 'setoptions', 'configmacros'].includes(name),
);

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document('', {
  InputJax: new TeX({ packages: SAFE_PACKAGES }),
  // Paths inline in every formula, so each one stands alone (and exports cleanly).
  OutputJax: new SVG({ fontCache: 'none' }),
});

const ex = (value: string | null | undefined) => Number.parseFloat(value ?? '') || 0;

/** MathJax's element tree in the form {@link svgToPrimitives} takes. */
function toSvgNode(node: LiteElement): SvgNode {
  const attrs: Record<string, string> = {};
  for (const { name, value } of adaptor.allAttributes(node)) attrs[name] = value;
  const children = adaptor.childNodes(node).map((child) => {
    const tag = adaptor.kind(child);
    // No element takes text: a <text> or stray node rejects the whole formula.
    return tag.startsWith('#') ? { tag, attrs: {}, children: [] } : toSvgNode(child as LiteElement);
  });
  return { tag: adaptor.kind(node), attrs, children };
}

/** Convert TeX to SVG. Throws on TeX errors. */
export function texToSvg(tex: string, display: boolean): MathSvg {
  const container = doc.convert(tex, { display });
  // The container wraps exactly one <svg>.
  const svg = adaptor.firstChild(container) as LiteElement;
  const body = adaptor.innerHTML(svg);
  if (body.includes('data-mjx-error')) {
    const message = /data-mjx-error="([^"]*)"/.exec(body)?.[1] ?? 'TeX error';
    throw new Error(message);
  }
  const style = adaptor.getAttribute(svg, 'style') ?? '';
  return {
    // Belt and braces: no links or scripts can come out of a formula.
    body: body
      .replace(/<\/?(?:a|script|foreignObject)\b[^>]*>/gi, '')
      .replace(/\shref="[^"]*"/gi, ''),
    viewBox: adaptor.getAttribute(svg, 'viewBox') ?? '0 0 0 0',
    width: ex(adaptor.getAttribute(svg, 'width')),
    height: ex(adaptor.getAttribute(svg, 'height')),
    verticalAlign: ex(/vertical-align:\s*([-\d.]+)ex/.exec(style)?.[1]),
    shapes: svgToPrimitives(toSvgNode(svg).children),
  };
}
