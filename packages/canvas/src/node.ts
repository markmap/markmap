import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { MarkmapNode, Measurer } from '@markmap/core';
import {
  createCanvasMeasurer,
  createImageContent,
  defaultContentPlugins,
  type RenderOptions,
  type RenderResult,
  renderTreeAsync,
} from '@markmap/render';
import { createCanvas, GlobalFonts, Image, loadImage, Path2D } from '@napi-rs/canvas';
import { drawExport, exportLayout, type ImageExportOptions, imageSources } from './export';
import { ImageCache, type LoadedImage } from './images';

export interface NodeImageOptions {
  /**
   * Folder that images with relative paths are read from, usually the Markdown file's.
   * Nothing outside it can be read. Without it, no local files are read: Markdown from
   * someone else must not be able to pull files off this machine into an image.
   */
  baseDir?: string;
  /** Return `true` to fetch a remote image. Without it, none are: they show their alt text. */
  allow?: (url: string) => boolean;
  /** Longest wait for a remote image, in ms. */
  timeout?: number;
}

export interface NodeFont {
  /** Path to a font file. */
  path: string;
  /** Family name to use it under. Defaults to the name in the file. */
  family?: string;
}

export interface RenderPNGOptions
  extends Omit<RenderOptions, 'measurer' | 'folded'>, ImageExportOptions, NodeImageOptions {
  /** Fonts to load before measuring. System fonts are available without this. */
  fonts?: readonly NodeFont[];
  /** Ids of folded nodes. */
  folded?: ReadonlySet<string>;
}

/**
 * Families with wide coverage on common systems, most useful first. Node's canvas does
 * not fall back to system fonts by itself, so characters these do not reach need `fonts`.
 */
const FALLBACK_FAMILIES = [
  // macOS
  'PingFang SC',
  'Hiragino Sans GB',
  'Heiti SC',
  'Hiragino Sans',
  'Apple SD Gothic Neo',
  'Apple Color Emoji',
  // Windows
  'Microsoft YaHei',
  'Yu Gothic',
  'Malgun Gothic',
  'Segoe UI Emoji',
  // Linux
  'Noto Sans CJK SC',
  'Noto Sans CJK JP',
  'Noto Sans CJK KR',
  'Source Han Sans SC',
  'WenQuanYi Micro Hei',
  'Noto Color Emoji',
];

/** The families in `wanted` that are installed, as a CSS list. */
export function fontFallback(
  available: Iterable<string> = GlobalFonts.families.map(({ family }) => family),
  wanted: readonly string[] = FALLBACK_FAMILIES,
): string {
  const installed = new Set(available);
  return wanted
    .filter((family) => installed.has(family))
    .map((family) => `"${family}"`)
    .join(', ');
}

const DATA_URL = /^data:[^,]*;base64,/i;
const REMOTE_URL = /^https?:/i;

async function readLocal(src: string, baseDir: string | undefined): Promise<Buffer> {
  if (baseDir == null) throw new Error(`Not reading ${src}: no baseDir`);
  const base = await realpath(baseDir);
  // After `realpath`, so links cannot point out of the folder either.
  const file = await realpath(resolve(base, decodeURI(src)));
  const path = relative(base, file);
  if (path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) {
    throw new Error(`Not reading ${src}: outside baseDir`);
  }
  return readFile(file);
}

async function fetchRemote(url: string, options: NodeImageOptions): Promise<Buffer> {
  if (!options.allow?.(url)) throw new Error(`Not fetching ${url}`);
  // `allow` judged this URL only, so do not follow redirects to another one.
  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(options.timeout ?? 10_000),
  });
  if (!response.ok) throw new Error(`Could not fetch ${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Load an image the way {@link NodeImageOptions} permits. Rejects if it may not. */
export async function loadNodeImage(
  src: string,
  options: NodeImageOptions = {},
): Promise<LoadedImage> {
  let data: Buffer;
  if (DATA_URL.test(src)) data = Buffer.from(src.slice(src.indexOf(',') + 1), 'base64');
  else if (REMOTE_URL.test(src)) data = await fetchRemote(src, options);
  else data = await readLocal(src, options.baseDir);
  const image: Image = await loadImage(data);
  return {
    source: image as unknown as CanvasImageSource,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

/** Draw a finished result on a Node canvas. */
async function encode(
  result: RenderResult,
  options: ImageExportOptions,
  images: ImageCache,
): Promise<Buffer> {
  const { width, height } = exportLayout(result, options);
  const canvas = createCanvas(width, height);
  await images.preload(imageSources(result.primitives));
  drawExport(canvas.getContext('2d') as unknown as CanvasRenderingContext2D, result, options, {
    image: (src) => images.get(src),
    createPath: (d) => new Path2D(d) as unknown as globalThis.Path2D,
    fontFallback: fontFallback(),
  });
  return canvas.encode('png');
}

/**
 * Export a finished result as a PNG, in Node. Measure with {@link createNodeMeasurer} so
 * the text fits what was laid out. Most callers want {@link renderPNG} instead.
 */
export function toPNG(
  result: RenderResult,
  options: ImageExportOptions & NodeImageOptions = {},
): Promise<Buffer> {
  return encode(result, options, new ImageCache({ load: (src) => loadNodeImage(src, options) }));
}

/** Measures with the same text engine and fonts that draw the PNG. */
export function createNodeMeasurer(): Measurer {
  const measurer = createCanvasMeasurer(createCanvas(1, 1).getContext('2d'));
  const fallback = fontFallback();
  return {
    measure(text, font) {
      const family = fallback ? `${font.family}, ${fallback}` : font.family;
      return measurer.measure(text, { ...font, family });
    },
  };
}

/**
 * Measure, lay out and export a tree as a PNG. Images load through the same rules for
 * sizing and drawing, and each loads once. `plugins` works as for rendering; its image
 * plugin, if any, is replaced by one that can load images here.
 */
export async function renderPNG(
  root: MarkmapNode,
  options: RenderPNGOptions = {},
): Promise<Buffer> {
  for (const { path, family } of options.fonts ?? []) {
    if (!GlobalFonts.registerFromPath(path, family)) throw new Error(`Could not load font ${path}`);
  }
  const images = new ImageCache({ load: (src) => loadNodeImage(src, options) });
  const nodeImages = createImageContent({
    async loadSize(src) {
      await images.preload([src]);
      const image = images.get(src);
      if (!image) throw new Error(`Could not load ${src}`);
      return image;
    },
  });
  const plugins = (options.plugins ?? defaultContentPlugins).map((plugin) =>
    plugin.name === nodeImages.name ? nodeImages : plugin,
  );
  const result = await renderTreeAsync(root, {
    ...options,
    plugins,
    measurer: createNodeMeasurer(),
    folded: options.folded ?? new Set(),
  });
  return encode(result, options, images);
}
