import type { Primitive, RectPrimitive, TextPrimitive } from '@markmap/core';
import { fontToCss, resolvePaint, type TokenLookup } from '@markmap/render';
import type { LoadedImage } from './images';

export interface DrawEnv {
  /** Values for the `var(--mm-…)` paints in primitives. */
  tokens: TokenLookup;
  /**
   * Find an image by its source. Images that are not ready are left out, so the caller
   * can draw again when they are. See {@link ImageCache}.
   */
  image?: (src: string) => LoadedImage | undefined;
  /** Parse SVG path data. Defaults to the global `Path2D`; Node has none. */
  createPath?: (d: string) => Path2D;
  /** Report something that cannot be drawn. Defaults to warning once per message. */
  warn?: (message: string) => void;
}

const warned = new Set<string>();

function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

/** Text without a usable paint is black, as in SVG. */
const DEFAULT_TEXT_FILL = '#000';

/**
 * Draw primitives on a 2D context, in whatever coordinates the context is set to. Needs
 * no DOM, so it also runs in workers and in Node.
 *
 * Group opacity multiplies down to each primitive instead of fading the group as one
 * layer, so overlapping children of a fading group show through each other.
 */
export function drawPrimitives(
  ctx: CanvasRenderingContext2D,
  primitives: readonly Primitive[],
  env: DrawEnv,
): void {
  const warn = env.warn ?? warnOnce;
  const createPath = env.createPath ?? ((d: string) => new Path2D(d));
  const paints = new Map<string, string | undefined>();
  /** The context's font is costly to set and normalized when read, so track it here. */
  let currentFont: string | undefined;

  const paint = (value: string | undefined) => {
    if (value == null) return undefined;
    if (!paints.has(value)) paints.set(value, resolvePaint(value, env.tokens));
    return paints.get(value);
  };

  const finish = (
    p: Pick<RectPrimitive, 'fill' | 'stroke' | 'strokeWidth'>,
    fill: () => void,
    stroke: () => void,
  ) => {
    const fillStyle = paint(p.fill);
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      fill();
    }
    const strokeStyle = paint(p.stroke);
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = p.strokeWidth ?? 1;
      stroke();
    }
  };

  const drawText = (p: TextPrimitive) => {
    for (const run of p.runs) {
      const font = fontToCss(run.font);
      if (font !== currentFont) {
        ctx.font = font;
        currentFont = font;
      }
      ctx.fillStyle = paint(run.fill) ?? DEFAULT_TEXT_FILL;
      ctx.fillText(run.text, p.x + run.x, p.y + run.y);
    }
  };

  const draw = (list: readonly Primitive[]) => {
    for (const p of list) {
      if (p.backends && !p.backends.includes('canvas')) {
        warn(`Skipped a ${p.kind} primitive that does not support canvas`);
        continue;
      }
      switch (p.kind) {
        case 'group': {
          const isolated = p.transform || p.opacity != null;
          const outerFont = currentFont;
          if (isolated) ctx.save();
          if (p.transform) ctx.transform(...p.transform);
          if (p.opacity != null) ctx.globalAlpha *= p.opacity;
          draw(p.children);
          if (isolated) {
            ctx.restore();
            // Restoring brings back the font as well.
            currentFont = outerFont;
          }
          break;
        }
        case 'rect':
          ctx.beginPath();
          if (p.r) ctx.roundRect(p.x, p.y, p.w, p.h, p.r);
          else ctx.rect(p.x, p.y, p.w, p.h);
          finish(
            p,
            () => ctx.fill(),
            () => ctx.stroke(),
          );
          break;
        case 'path': {
          const path = createPath(p.d);
          finish(
            p,
            () => ctx.fill(path),
            () => ctx.stroke(path),
          );
          break;
        }
        case 'text':
          drawText(p);
          break;
        case 'image': {
          const image = env.image?.(p.src);
          if (image) {
            const { x, y, w, h } = fitImage(p, image);
            ctx.drawImage(image.source, x, y, w, h);
          }
          break;
        }
        case 'custom':
          if (p.canvas) {
            // A custom drawing may leave the context in any state.
            ctx.save();
            p.canvas(ctx);
            ctx.restore();
          } else {
            warn('Skipped a custom primitive with no canvas drawing');
          }
          break;
        case 'overlay':
          warn('Skipped an overlay primitive: canvas does not draw them yet');
          break;
        case 'link':
        case 'hit':
          // Hit areas draw nothing; the view finds them through its hit index.
          break;
      }
    }
  };

  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
  draw(primitives);
}

type Box = Record<'x' | 'y' | 'w' | 'h', number>;

/** The largest centered box with the image's aspect ratio, as SVG's `<image>` draws it. */
function fitImage(box: Box, { width, height }: LoadedImage): Box {
  if (!width || !height) return box;
  const k = Math.min(box.w / width, box.h / height);
  const w = width * k;
  const h = height * k;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}
