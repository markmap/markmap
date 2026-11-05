import type { FontStyle, Measurer } from '@markmap/core';

export function fontToCss(font: FontStyle): string {
  return `${font.style} ${font.weight} ${font.size}px ${font.family}`;
}

// Helvetica advance widths for ASCII 32–126, in 1/1000 em.
// prettier-ignore
const ASCII_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

/** East Asian wide characters, fullwidth forms and emoji take a full em. */
const WIDE =
  /[\u1100-\u115f\u2e80-\u303e\u3041-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua960-\ua97f\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6\p{Extended_Pictographic}]/u;
/** Combining marks, variation selectors and format characters such as ZWJ. */
const ZERO_WIDTH = /^[\p{Mn}\p{Me}\p{Cf}]$/u;

/**
 * Approximates widths from Helvetica metrics, without a font or canvas. Good enough
 * for Node rendering and tests; use {@link createCanvasMeasurer} in the browser.
 */
export const approximateMeasurer: Measurer = {
  measure(text, font) {
    const mono = /mono|consolas|courier|menlo/i.test(font.family);
    let em = 0;
    for (const char of text) {
      const code = char.codePointAt(0)!;
      if (code >= 32 && code <= 126) em += mono ? 0.6 : ASCII_WIDTHS[code - 32] / 1000;
      else if (ZERO_WIDTH.test(char)) continue;
      else if (WIDE.test(char)) em += 1;
      else em += 0.6;
    }
    return em * font.size * (font.weight >= 600 ? 1.06 : 1);
  },
};

type Context2D = Pick<CanvasRenderingContext2D, 'font' | 'measureText'>;

/** Measures with a canvas 2D context, caching results per font and text. */
export function createCanvasMeasurer(ctx?: Context2D): Measurer {
  const context = ctx ?? createContext();
  const cache = new Map<string, number>();
  return {
    measure(text, font) {
      const css = fontToCss(font);
      const key = `${css}\n${text}`;
      let width = cache.get(key);
      if (width == null) {
        if (context.font !== css) context.font = css;
        width = context.measureText(text).width;
        cache.set(key, width);
      }
      return width;
    },
  };
}

function createContext(): Context2D {
  const canvas =
    typeof OffscreenCanvas === 'undefined'
      ? document.createElement('canvas')
      : new OffscreenCanvas(1, 1);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is not available');
  return context as Context2D;
}
