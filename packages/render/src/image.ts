import type {
  AtomSize,
  ContentPlugin,
  Inline,
  InlineContext,
  Primitive,
  Rect,
  Size,
  TextStyle,
} from '@markmap/core';
import { sanitizeUrl } from './content';

type ImageInline = Extract<Inline, { type: 'image' }>;

export interface ImageContentOptions {
  /**
   * Find an image's natural size. Defaults to loading it with `Image` where that exists
   * (browsers); elsewhere unsized images keep their placeholder size.
   */
  loadSize?: (src: string) => Promise<Size>;
  /** Return `false` to show an image's alt text instead, e.g. to block remote images. */
  allow?: (src: string) => boolean;
  /** Width cap when labels do not wrap, in px. With wrapping, `wrapWidth` caps images too. */
  maxWidth?: number;
}

/** Layout size while the real one is unknown. */
const PLACEHOLDER: Size = { width: 40, height: 30 };
const DEFAULT_MAX_WIDTH = 320;
const DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i;

/** Like {@link sanitizeUrl}, plus base64 raster `data:` images. */
export function sanitizeImageUrl(url: string): string | undefined {
  const trimmed = url.trim();
  return DATA_IMAGE.test(trimmed) ? trimmed : sanitizeUrl(trimmed);
}

function browserLoader(): ImageContentOptions['loadSize'] {
  if (typeof Image === 'undefined') return undefined;
  return (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () =>
        resolve({ width: img.naturalWidth, height: img.naturalHeight }),
      );
      img.addEventListener('error', () => reject(new Error(`Could not load ${src}`)));
      img.src = src;
    });
}

interface ImageData {
  width?: number;
  height?: number;
}

/** Size from the given dimensions and, when known, the natural size; `undefined` if unknowable yet. */
function fit(given: ImageData, natural: Size | undefined): Size | undefined {
  const { width, height } = given;
  if (width && height) return { width, height };
  if (!natural?.width || !natural.height) return undefined;
  const ratio = natural.width / natural.height;
  if (width) return { width, height: width / ratio };
  if (height) return { width: height * ratio, height };
  return natural;
}

/** A guess that keeps any given dimension, used until the natural size is known. */
const guess = ({ width, height }: ImageData): Size =>
  width || height ? { width: width ?? height!, height: height ?? width! } : PLACEHOLDER;

/** Size of an image's alt text, drawn in place of the image. */
function altSize(alt: string, style: TextStyle, ctx: InlineContext): AtomSize {
  const { font } = style;
  return {
    width: ctx.measurer.measure(alt, font),
    height: font.lineHeight,
    baseline: (font.lineHeight + font.size * 0.7) / 2,
  };
}

function altText(
  alt: string | null | undefined,
  box: Rect,
  style: TextStyle,
  ctx: InlineContext,
): Primitive[] {
  if (!alt) return [];
  const { baseline } = altSize(alt, style, ctx);
  const run = { text: alt, x: 0, y: baseline, font: style.font, fill: style.fill };
  return [{ kind: 'text', x: box.x, y: box.y, runs: [run] }];
}

/**
 * Draws Markdown images and sized `<img>` tags inside labels. Sizes come from the tag,
 * from a cache of loaded sizes, or from a placeholder while the image loads; the view
 * then renders again (see `InlineContext.defer`). Images are capped at the label wrap
 * width, keeping their aspect ratio. Images that fail to load show their alt text.
 */
export function createImageContent(options: ImageContentOptions = {}): ContentPlugin {
  const loadSize = options.loadSize ?? browserLoader();
  const allow = options.allow ?? (() => true);
  /** Natural sizes; `null` when loading failed. */
  const sizes = new Map<string, Size | null>();
  const loading = new Map<string, Promise<unknown>>();

  const load = (src: string, ctx: InlineContext) => {
    if (!loadSize || sizes.has(src)) return;
    let task = loading.get(src);
    if (!task) {
      task = loadSize(src)
        .then(
          (size) => sizes.set(src, size),
          () => sizes.set(src, null),
        )
        .finally(() => loading.delete(src));
      loading.set(src, task);
    }
    ctx.defer?.(task);
  };

  /** Size of the image as drawn, or `undefined` to show its alt text. */
  const imageSize = (inline: ImageInline, ctx: InlineContext): Size | undefined => {
    const src = sanitizeImageUrl(inline.url);
    if (!src || !allow(src)) return undefined;
    const given = (inline.data ?? {}) as ImageData;
    const natural = sizes.get(src);
    let size = fit(given, natural ?? undefined);
    if (!size) {
      // Failed to load and not fully sized: fall back to the alt text.
      if (natural === null) return undefined;
      load(src, ctx);
      size = guess(given);
    }
    const max =
      ctx.wrapWidth && ctx.wrapWidth > 0 ? ctx.wrapWidth : (options.maxWidth ?? DEFAULT_MAX_WIDTH);
    return size.width > max ? { width: max, height: (size.height * max) / size.width } : size;
  };

  return {
    name: 'images',
    atoms: {
      image: {
        measure(inline, style, ctx) {
          const size = imageSize(inline, ctx);
          // Images sit on the baseline, like a tall letter.
          return size ? { ...size, baseline: size.height } : altSize(inline.alt ?? '', style, ctx);
        },
        render(inline, box, style, ctx): Primitive[] {
          const src = imageSize(inline, ctx) && sanitizeImageUrl(inline.url);
          const alt = altText(inline.alt, box, style, ctx);
          if (!src) return alt;
          const { x, y, width: w, height: h } = box;
          const image: Primitive = { kind: 'image', x, y, w, h, src };
          // The text may be wider than an image sized for the layout.
          if (alt.length) image.fallback = [{ kind: 'group', clip: box, children: alt }];
          return [image];
        },
      },
    },
  };
}

/** Images with sizes loaded in the browser. */
export const imageContent: ContentPlugin = createImageContent();
