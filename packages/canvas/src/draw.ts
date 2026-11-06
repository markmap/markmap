import type {
  ImagePrimitive,
  PathPrimitive,
  Primitive,
  Rect,
  RectPrimitive,
  TextPrimitive,
  TextRun,
} from '@markmap/core';
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
  /**
   * What is on screen. Top-level groups outside it are skipped, and what is too small to
   * read is sketched. Leave it out to draw everything in full, as for exports.
   */
  view?: DrawView;
}

export interface DrawView {
  /** The visible area, in the coordinates of the primitives. */
  rect: Rect;
  /** Screen pixels per unit of those coordinates. */
  scale: number;
}

const warned = new Set<string>();

function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

/** Text without a usable paint is black, as in SVG. */
const DEFAULT_TEXT_FILL = '#000';
/** Below this font size on screen, in px, text is drawn as bars. */
const MIN_TEXT_SIZE = 3;
/** Below this size on screen, in px, images are drawn as plain boxes. */
const MIN_IMAGE_SIZE = 6;
/** How strongly bars and boxes stand in for what they replace. */
const SKETCH_ALPHA = 0.4;
const SKETCH_IMAGE_FILL = '#888';

/** Parsed paths, kept with their primitives: redrawing the same frame reuses them. */
const parsedPaths = new WeakMap<PathPrimitive, Path2D>();

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Width of a run, estimated if the layout did not record it. */
const runWidth = (run: TextRun) => run.width ?? run.text.length * run.font.size * 0.5;

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
  const { view } = env;
  const scale = view?.scale;
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

  const pathOf = (p: PathPrimitive) => {
    let path = parsedPaths.get(p);
    if (!path) {
      path = createPath(p.d);
      parsedPaths.set(p, path);
    }
    return path;
  };

  /** Each run as a bar where its letters would be. */
  const sketchText = (p: TextPrimitive) => {
    const { globalAlpha } = ctx;
    ctx.globalAlpha = globalAlpha * SKETCH_ALPHA;
    for (const run of p.runs) {
      const { size } = run.font;
      ctx.fillStyle = paint(run.fill) ?? DEFAULT_TEXT_FILL;
      ctx.fillRect(p.x + run.x, p.y + run.y - size * 0.7, runWidth(run), size * 0.8);
    }
    ctx.globalAlpha = globalAlpha;
  };

  const sketchImage = (p: ImagePrimitive) => {
    const { globalAlpha } = ctx;
    ctx.globalAlpha = globalAlpha * SKETCH_ALPHA;
    ctx.fillStyle = SKETCH_IMAGE_FILL;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.globalAlpha = globalAlpha;
  };

  const drawText = (p: TextPrimitive) => {
    if (scale && p.runs.every((run) => run.font.size * scale < MIN_TEXT_SIZE)) {
      sketchText(p);
      return;
    }
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

  const draw = (list: readonly Primitive[], top = false) => {
    for (const p of list) {
      // Excluded on purpose, usually next to a variant for canvas.
      if (p.backends && !p.backends.includes('canvas')) continue;
      switch (p.kind) {
        case 'group': {
          // Bounds are in the parent's coordinates, which are the view's only at the top.
          if (top && p.bounds && view && !overlaps(p.bounds, view.rect)) break;
          const isolated = p.transform || p.opacity != null || p.clip;
          const outerFont = currentFont;
          if (isolated) ctx.save();
          if (p.transform) ctx.transform(...p.transform);
          if (p.opacity != null) ctx.globalAlpha *= p.opacity;
          if (p.clip) {
            ctx.beginPath();
            ctx.rect(p.clip.x, p.clip.y, p.clip.width, p.clip.height);
            ctx.clip();
          }
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
          const path = pathOf(p);
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
          if (scale && Math.max(p.w, p.h) * scale < MIN_IMAGE_SIZE) {
            sketchImage(p);
            break;
          }
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
  draw(primitives, true);
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
