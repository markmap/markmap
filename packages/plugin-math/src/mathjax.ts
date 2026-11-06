// MathJax's TeX packages register themselves when imported.
/* oxlint-disable import/no-unassigned-import */
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/action/ActionConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/js/input/tex/amscd/AmsCdConfiguration.js';
import '@mathjax/src/js/input/tex/bbox/BboxConfiguration.js';
import '@mathjax/src/js/input/tex/boldsymbol/BoldsymbolConfiguration.js';
import '@mathjax/src/js/input/tex/braket/BraketConfiguration.js';
import '@mathjax/src/js/input/tex/bussproofs/BussproofsConfiguration.js';
import '@mathjax/src/js/input/tex/cancel/CancelConfiguration.js';
import '@mathjax/src/js/input/tex/cases/CasesConfiguration.js';
import '@mathjax/src/js/input/tex/centernot/CenternotConfiguration.js';
import '@mathjax/src/js/input/tex/color/ColorConfiguration.js';
import '@mathjax/src/js/input/tex/colortbl/ColortblConfiguration.js';
import '@mathjax/src/js/input/tex/empheq/EmpheqConfiguration.js';
import '@mathjax/src/js/input/tex/enclose/EncloseConfiguration.js';
import '@mathjax/src/js/input/tex/extpfeil/ExtpfeilConfiguration.js';
import '@mathjax/src/js/input/tex/gensymb/GensymbConfiguration.js';
import '@mathjax/src/js/input/tex/mathtools/MathtoolsConfiguration.js';
import '@mathjax/src/js/input/tex/mhchem/MhchemConfiguration.js';
import '@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js';
import '@mathjax/src/js/input/tex/noerrors/NoErrorsConfiguration.js';
import '@mathjax/src/js/input/tex/noundefined/NoUndefinedConfiguration.js';
import '@mathjax/src/js/input/tex/physics/PhysicsConfiguration.js';
import '@mathjax/src/js/input/tex/tagformat/TagFormatConfiguration.js';
import '@mathjax/src/js/input/tex/textcomp/TextcompConfiguration.js';
import '@mathjax/src/js/input/tex/textmacros/TextMacrosConfiguration.js';
import '@mathjax/src/js/input/tex/unicode/UnicodeConfiguration.js';
import '@mathjax/src/js/input/tex/upgreek/UpgreekConfiguration.js';
import '@mathjax/src/js/input/tex/verb/VerbConfiguration.js';
import { MathJaxTexFont } from '@mathjax/mathjax-tex-font/js/svg.js';
import type { LiteElement } from '@mathjax/src/js/adaptors/lite/Element.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import { mathjax } from '@mathjax/src/js/mathjax.js';
import { SVG } from '@mathjax/src/js/output/svg.js';
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
 * TeX packages that only lay out math. The rest, such as `html`, `texhtml`, `require`,
 * `autoload`, `setoptions` and `configmacros`, can reach outside the formula or change
 * the converter, so Markdown cannot use them.
 */
const SAFE_PACKAGES = [
  'base',
  'action',
  'ams',
  'amscd',
  'bbox',
  'boldsymbol',
  'braket',
  'bussproofs',
  'cancel',
  'cases',
  'centernot',
  'color',
  'colortbl',
  'empheq',
  'enclose',
  'extpfeil',
  'gensymb',
  'mathtools',
  'mhchem',
  'newcommand',
  'noerrors',
  'noundefined',
  'physics',
  'tagformat',
  'textcomp',
  'textmacros',
  'unicode',
  'upgreek',
  'verb',
];

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document('', {
  InputJax: new TeX({ packages: SAFE_PACKAGES }),
  // The TeX font has no files to load on demand, so converting stays synchronous. Paths
  // are inline in every formula, so each one stands alone and exports cleanly.
  OutputJax: new SVG({
    fontData: MathJaxTexFont,
    fontCache: 'none',
    // Otherwise a long inline formula is cut into one <svg> per line.
    linebreaks: { inline: false },
  }),
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
  // MathJax 4 repeats the TeX source on its elements, which nothing here needs.
  const body = adaptor.innerHTML(svg).replace(/\sdata-latex(?:-item)?="[^"]*"/g, '');
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
