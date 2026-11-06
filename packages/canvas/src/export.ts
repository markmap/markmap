import { expandRect, type Primitive } from '@markmap/core';
import { type RenderResult, resolvePaint, themeTokens } from '@markmap/render';
import { type DrawEnv, drawPrimitives } from './draw';
import { ImageCache } from './images';

export interface ImageExportOptions {
  /** Pixels per layout px. Defaults to 2, which stays sharp on high-density screens. */
  scale?: number;
  /** Space around the drawing, in px. */
  padding?: number;
  /** Fill the background with `--mm-bg`. Otherwise it is transparent. */
  background?: boolean;
  /** Which tokens to use. Defaults to `light`. */
  colorScheme?: 'light' | 'dark';
  /**
   * Largest width or height of the image, in pixels; `scale` is lowered to fit. Browsers
   * refuse canvases past a limit, and the default is the largest most of them allow.
   */
  maxSize?: number;
}

const DEFAULT_MAX_SIZE = 16384;

/** Pixel size of an export and how to place the drawing in it. */
export function exportLayout(result: RenderResult, options: ImageExportOptions = {}) {
  const { padding = 20, scale = 2, maxSize = DEFAULT_MAX_SIZE } = options;
  const box = expandRect(result.bounds, padding);
  const fitted = Math.min(scale, maxSize / Math.max(box.width, box.height));
  return {
    box,
    scale: fitted,
    // Rounding up must not pass the limit.
    width: Math.min(maxSize, Math.ceil(box.width * fitted)),
    height: Math.min(maxSize, Math.ceil(box.height * fitted)),
  };
}

/** Sources of all images in `primitives`. */
export function imageSources(primitives: readonly Primitive[]): Set<string> {
  const sources = new Set<string>();
  const visit = (list: readonly Primitive[]) => {
    for (const p of list) {
      if (p.backends && !p.backends.includes('canvas')) continue;
      if (p.kind === 'group') visit(p.children);
      else if (p.kind === 'image') sources.add(p.src);
    }
  };
  visit(primitives);
  return sources;
}

/** Draw a whole map in full on a context of the size from {@link exportLayout}. */
export function drawExport(
  ctx: CanvasRenderingContext2D,
  result: RenderResult,
  options: ImageExportOptions,
  env: Omit<DrawEnv, 'tokens' | 'view'>,
): void {
  const { box, scale, width, height } = exportLayout(result, options);
  const tokens = themeTokens(result.theme, options.colorScheme);
  const background = resolvePaint('var(--mm-bg)', tokens);
  if (options.background !== false && background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.setTransform(scale, 0, 0, scale, -box.x * scale, -box.y * scale);
  drawPrimitives(ctx, result.primitives, { ...env, tokens });
}

/**
 * Export a map as a PNG, in the browser. Pass a finished result, such as `mm.state` or
 * what `renderTreeAsync` gives. Images load first; ones whose server does not allow
 * cross-origin use show their alt text, because they would make the canvas unreadable.
 */
export async function toPNG(result: RenderResult, options: ImageExportOptions = {}): Promise<Blob> {
  const { width, height } = exportLayout(result, options);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available');
  const images = new ImageCache({ crossOrigin: 'anonymous' });
  // Labels were measured with these fonts; they may still be loading.
  await Promise.all([images.preload(imageSources(result.primitives)), document.fonts?.ready]);
  drawExport(ctx, result, options, { image: (src) => images.get(src) });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`Could not export a ${width}×${height} image`));
    }, 'image/png');
  });
}
