import type { LiteElement } from 'mathjax-full/js/adaptors/lite/Element.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { SVG } from 'mathjax-full/js/output/svg.js';

/** A formula as self-contained SVG, measured in ex. */
export interface MathSvg {
  /** Markup inside the formula's `<svg>` element: paths only, no fonts or links. */
  body: string;
  viewBox: string;
  width: number;
  height: number;
  /** Distance of the baseline below the bottom edge (usually negative), from `vertical-align`. */
  verticalAlign: number;
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
  };
}
