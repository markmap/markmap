import type {
  AtomSize,
  ContentPlugin,
  InlineContext,
  Matrix,
  Primitive,
  Rect,
  TextPrimitive,
  TextStyle,
} from '@markmap/core';
import type { Element, ElementContent, Root as HastRoot } from 'hast';
import type { InlineMath } from 'mdast-util-math';
import type { MathSvg } from './mathjax';
import { withColor } from './shapes';

/** Parses `$…$` (and `$$…$$`) into math nodes. Pass it to `parse(md, { plugins })`. */
export { default as remarkMath } from 'remark-math';

export interface MathContentOptions {
  /**
   * Load the TeX converter. Defaults to a dynamic import of MathJax, so it stays out of
   * the initial bundle and loads the first time a formula is drawn.
   */
  load?: () => Promise<{ texToSvg(tex: string, display: boolean): MathSvg }>;
  /** Size of 1ex as a fraction of the font size. */
  exFactor?: number;
}

/** Placeholder and error look: the TeX source in the code font. */
function sourceStyle(style: TextStyle, ctx: InlineContext): TextStyle {
  return {
    font: { ...style.font, family: ctx.theme.codeFontFamily, size: style.font.size * 0.875 },
    fill: 'var(--mm-code-color)',
  };
}

function sourceSize(tex: string, style: TextStyle, ctx: InlineContext): AtomSize {
  const { font } = sourceStyle(style, ctx);
  return {
    width: ctx.measurer.measure(tex, font),
    height: style.font.lineHeight,
    baseline: (style.font.lineHeight + style.font.size * 0.7) / 2,
  };
}

/** Trusted markup that `hast-util-to-html` prints as is with `allowDangerousHtml`. */
interface RawNode {
  type: 'raw';
  value: string;
}

/** Fit a `viewBox` in `box`, centered and keeping its aspect ratio, like SVG does. */
function fitViewBox(viewBox: string, box: Rect): Matrix {
  const [minX, minY, width, height] = viewBox.split(/\s+/).map(Number);
  const k = Math.min(box.width / width, box.height / height);
  return [
    k,
    0,
    0,
    k,
    box.x + (box.width - width * k) / 2 - minX * k,
    box.y + (box.height - height * k) / 2 - minY * k,
  ];
}

const escapeAttr = (value: string) => value.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`);

const isMathCode = (node: ElementContent | undefined): node is Element =>
  node?.type === 'element' &&
  node.tagName === 'code' &&
  Array.isArray(node.properties.className) &&
  node.properties.className.includes('language-math');

const textOf = (node: Element) =>
  node.children.map((child) => (child.type === 'text' ? child.value : '')).join('');

/** Standalone HTML `<svg>` for a popover, sized in ex so it scales with the text. */
function popoverSvg(tex: string, svg: MathSvg): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svg.width}ex" height="${svg.height}ex" viewBox="${escapeAttr(svg.viewBox)}" style="vertical-align:${svg.verticalAlign}ex" role="img" focusable="false" aria-label="${escapeAttr(tex)}">${svg.body}</svg>`;
}

/**
 * Draws `$…$` in labels as MathJax SVG. Formulas are measured from the TeX source until
 * MathJax has loaded and converted them, then the view renders again with the real
 * size. Invalid TeX keeps showing its source.
 */
export function createMathContent(options: MathContentOptions = {}): ContentPlugin {
  const load = options.load ?? (() => import('./mathjax'));
  const exFactor = options.exFactor ?? 0.5;
  let converter: ReturnType<typeof load> | undefined;
  /** Converted formulas by TeX; an `Error` when the TeX is invalid. */
  const formulas = new Map<string, MathSvg | Error>();
  const converting = new Map<string, Promise<unknown>>();

  const convert = (tex: string, ctx: InlineContext) => {
    let task = converting.get(tex);
    if (!task) {
      converter ??= load();
      task = converter
        .then(({ texToSvg }) => {
          try {
            formulas.set(tex, texToSvg(tex, false));
          } catch (error) {
            formulas.set(tex, error instanceof Error ? error : new Error(String(error)));
          }
        })
        .catch((error: unknown) => {
          // The converter failed to load: show sources and allow a retry later.
          converter = undefined;
          formulas.set(tex, error instanceof Error ? error : new Error(String(error)));
        })
        .finally(() => converting.delete(tex));
      converting.set(tex, task);
    }
    ctx.defer?.(task);
  };

  /** Replace `$…$` and `$$…$$` (code with `language-math` after sanitizing) with SVG. */
  const popover = async (tree: HastRoot) => {
    const found: { parent: HastRoot | Element; index: number; tex: string; display: boolean }[] =
      [];
    const visit = (parent: HastRoot | Element) => {
      parent.children.forEach((child, index) => {
        if (child.type !== 'element') return;
        const [only] = child.children;
        if (child.tagName === 'pre' && child.children.length === 1 && isMathCode(only)) {
          found.push({ parent, index, tex: textOf(only), display: true });
        } else if (isMathCode(child)) {
          found.push({ parent, index, tex: textOf(child), display: false });
        } else {
          visit(child);
        }
      });
    };
    visit(tree);
    if (!found.length) return;
    let texToSvg: Awaited<ReturnType<typeof load>>['texToSvg'];
    try {
      converter ??= load();
      ({ texToSvg } = await converter);
    } catch {
      converter = undefined;
      return;
    }
    for (const { parent, index, tex, display } of found) {
      let svg: MathSvg;
      try {
        svg = texToSvg(tex, display);
      } catch {
        // Invalid TeX: leave the source in its code element.
        continue;
      }
      const markup = popoverSvg(tex, svg);
      const raw: RawNode = {
        type: 'raw',
        value: display
          ? `<div class="markmap-math-display" style="margin:0.5em 0;text-align:center;overflow-x:auto">${markup}</div>`
          : markup,
      };
      // hast-util-to-html prints raw nodes; hast's own types only know them once
      // mdast-util-to-hast is loaded, which this package does not need.
      parent.children[index] = raw as unknown as ElementContent;
    }
  };

  const formula = (inline: InlineMath, ctx: InlineContext): MathSvg | undefined => {
    const found = formulas.get(inline.value);
    if (!found) convert(inline.value, ctx);
    return found instanceof Error ? undefined : found;
  };

  return {
    name: 'math',
    popover,
    atoms: {
      inlineMath: {
        measure(inline, style, ctx) {
          const svg = formula(inline, ctx);
          if (!svg) return sourceSize(inline.value, style, ctx);
          const ex = style.font.size * exFactor;
          const height = svg.height * ex;
          // `vertical-align` is how far the bottom sits below the baseline.
          return { width: svg.width * ex, height, baseline: height + svg.verticalAlign * ex };
        },
        render(inline, box, style, ctx): Primitive[] {
          const svg = formulas.get(inline.value);
          const sourceText = (): TextPrimitive => {
            const source = sourceStyle(style, ctx);
            const { baseline } = sourceSize(inline.value, style, ctx);
            const run = { text: inline.value, x: 0, y: baseline, ...source };
            return { kind: 'text', x: box.x, y: box.y, runs: [run] };
          };
          if (!svg || svg instanceof Error) return [sourceText()];
          const attrs = [
            `x="${box.x}"`,
            `y="${box.y}"`,
            `width="${box.width}"`,
            `height="${box.height}"`,
            `viewBox="${escapeAttr(svg.viewBox)}"`,
            // MathJax paints with currentColor.
            `style="color:${escapeAttr(style.fill)};overflow:visible"`,
          ].join(' ');
          return [
            { kind: 'custom', backends: ['svg'], svg: () => `<svg ${attrs}>${svg.body}</svg>` },
            svg.shapes
              ? {
                  kind: 'group',
                  backends: ['canvas'],
                  transform: fitViewBox(svg.viewBox, box),
                  children: withColor(svg.shapes, style.fill),
                }
              : { ...sourceText(), backends: ['canvas'] },
          ];
        },
      },
    },
  };
}

/** Math in labels, with MathJax loaded on first use. */
export const mathContent: ContentPlugin = createMathContent();
