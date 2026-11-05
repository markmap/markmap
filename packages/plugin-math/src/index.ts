import type { AtomSize, ContentPlugin, InlineContext, Primitive, TextStyle } from '@markmap/core';
import type { InlineMath } from 'mdast-util-math';
import type { MathSvg } from './mathjax';

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

const escapeAttr = (value: string) => value.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`);

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

  const formula = (inline: InlineMath, ctx: InlineContext): MathSvg | undefined => {
    const found = formulas.get(inline.value);
    if (!found) convert(inline.value, ctx);
    return found instanceof Error ? undefined : found;
  };

  return {
    name: 'math',
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
          if (!svg || svg instanceof Error) {
            const source = sourceStyle(style, ctx);
            const { baseline } = sourceSize(inline.value, style, ctx);
            const run = { text: inline.value, x: 0, y: baseline, ...source };
            return [{ kind: 'text', x: box.x, y: box.y, runs: [run] }];
          }
          const attrs = [
            `x="${box.x}"`,
            `y="${box.y}"`,
            `width="${box.width}"`,
            `height="${box.height}"`,
            `viewBox="${escapeAttr(svg.viewBox)}"`,
            // MathJax paints with currentColor.
            `style="color:${escapeAttr(style.fill)};overflow:visible"`,
          ].join(' ');
          return [{ kind: 'custom', svg: () => `<svg ${attrs}>${svg.body}</svg>` }];
        },
      },
    },
  };
}

/** Math in labels, with MathJax loaded on first use. */
export const mathContent: ContentPlugin = createMathContent();
