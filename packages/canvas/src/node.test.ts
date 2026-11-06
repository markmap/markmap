import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from '@markmap/parse';
import { createMathContent, remarkMath } from '@markmap/plugin-math';
import { cardsTheme, defaultContentPlugins, renderTreeAsync } from '@markmap/render';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createNodeMeasurer, fontFallback, loadNodeImage, renderPNG, toPNG } from './node';

/** A solid square PNG. */
async function square(color: string, size = 10): Promise<Buffer> {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  return canvas.encode('png');
}

async function pixels(png: Buffer) {
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);
  return { width: image.width, height: image.height, data };
}

/** Pixels close to an RGB color. */
function count({ data }: { data: Uint8ClampedArray }, [r, g, b]: number[], tolerance = 8) {
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const near =
      Math.abs(data[i] - r) <= tolerance &&
      Math.abs(data[i + 1] - g) <= tolerance &&
      Math.abs(data[i + 2] - b) <= tolerance;
    if (near) n += 1;
  }
  return n;
}

const tree = (md: string) => parse(md).root;

const RED = [255, 0, 0];

describe('renderPNG', () => {
  let redDataUrl: string;

  beforeAll(async () => {
    redDataUrl = `data:image/png;base64,${(await square('#f00')).toString('base64')}`;
  });

  it('makes a PNG of the whole map', async () => {
    const png = await renderPNG(tree('# Root\n\n- first\n- second\n  - third'), { scale: 1 });
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    const image = await pixels(png);
    expect(image.width).toBeGreaterThan(100);
    // Mostly white background, with something drawn on it.
    const white = count(image, [255, 255, 255]);
    expect(white).toBeGreaterThan(image.width * image.height * 0.5);
    expect(white).toBeLessThan(image.width * image.height);
  });

  it('follows scale, theme and color scheme', async () => {
    const options = { theme: cardsTheme, colorScheme: 'dark', padding: 0 } as const;
    const one = await pixels(await renderPNG(tree('# Root'), { ...options, scale: 1 }));
    const two = await pixels(await renderPNG(tree('# Root'), { ...options, scale: 2 }));
    expect(Math.abs(two.width - one.width * 2)).toBeLessThanOrEqual(2);
    const dark = Number.parseInt(cardsTheme.darkTokens!['mm-bg'].slice(1, 3), 16);
    expect(count(one, [dark, dark, dark])).toBeGreaterThan(0);
    expect(count(one, [255, 255, 255], 0)).toBeLessThan(one.width * one.height * 0.1);
  });

  it('sizes and draws data URL images', async () => {
    const image = await pixels(await renderPNG(tree(`- ![x](${redDataUrl})`), { scale: 1 }));
    // Laid out at its natural 10×10, not the 40×30 placeholder.
    expect(count(image, RED)).toBe(100);
  });

  it('draws formulas without a browser', async () => {
    const plugins = [...defaultContentPlugins, createMathContent()];
    const root = parse('- $\\frac{a}{b}$', { plugins: [remarkMath] }).root;
    const withMath = await pixels(await renderPNG(root, { plugins, scale: 3 }));
    const blank = parse('- x', { plugins: [remarkMath] }).root;
    const without = await pixels(await renderPNG(blank, { plugins, scale: 3 }));
    expect(withMath.height).toBeGreaterThan(without.height);
    expect(count(withMath, [255, 255, 255], 0)).toBeLessThan(withMath.width * withMath.height);
    // Not the source text, which would be far wider than the fraction.
    expect(withMath.width).toBeLessThan(without.width + 100);
  });

  it('keeps the image plugin only if it was asked for', async () => {
    const plugins = defaultContentPlugins.filter((plugin) => plugin.name !== 'images');
    const image = await pixels(
      await renderPNG(tree(`- ![x](${redDataUrl})`), { plugins, scale: 1 }),
    );
    expect(count(image, RED)).toBe(0);
  });

  it('fails clearly on a font it cannot load', async () => {
    await expect(
      renderPNG(tree('# R'), { fonts: [{ path: '/nonexistent/font.ttf' }] }),
    ).rejects.toThrow(/Could not load font/);
  });

  it('accepts a result measured elsewhere', async () => {
    const result = await renderTreeAsync(tree('# Root'), { measurer: createNodeMeasurer() });
    expect((await toPNG(result)).subarray(1, 4).toString()).toBe('PNG');
  });
});

describe('fontFallback', () => {
  it('lists only installed families, quoted, in the given order', () => {
    expect(fontFallback(['B Font', 'Other', 'A'], ['A', 'Missing', 'B Font'])).toBe(
      '"A", "B Font"',
    );
    expect(fontFallback([], ['A'])).toBe('');
  });
});

describe('local images', () => {
  let base: string;
  let outside: string;

  beforeAll(async () => {
    const root = await mkdtemp(join(tmpdir(), 'markmap-'));
    base = join(root, 'docs');
    outside = join(root, 'secret.png');
    await mkdir(join(base, 'img'), { recursive: true });
    await writeFile(join(base, 'img', 'red square.png'), await square('#f00'));
    await writeFile(outside, await square('#00f'));
    await symlink(outside, join(base, 'link.png'));
  });

  it('reads files inside baseDir', async () => {
    const png = await renderPNG(tree('- ![x](img/red%20square.png)'), { baseDir: base, scale: 1 });
    expect(count(await pixels(png), RED)).toBe(100);
  });

  it.each([
    ['parent folders', '../secret.png', /outside baseDir/],
    ['absolute paths', () => outside, /outside baseDir/],
    ['links out of the folder', 'link.png', /outside baseDir/],
    ['missing files', 'nope.png', /ENOENT|no such file/i],
  ])('refuses %s', async (_, src, message) => {
    const path = typeof src === 'function' ? src() : src;
    await expect(loadNodeImage(path, { baseDir: base })).rejects.toThrow(message);
  });

  it('reads nothing without baseDir', async () => {
    await expect(loadNodeImage('img/red square.png')).rejects.toThrow(/no baseDir/);
  });

  it('shows the alt text of an image it may not read', async () => {
    const png = await renderPNG(tree('- ![a long alt text here](../secret.png)'), { scale: 1 });
    expect(count(await pixels(png), [0, 0, 255])).toBe(0);
  });
});

describe('remote images', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const url = 'https://example.com/a.png';

  it('fetches nothing unless allowed', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadNodeImage(url)).rejects.toThrow(/Not fetching/);
    await expect(loadNodeImage(url, { allow: () => false })).rejects.toThrow(/Not fetching/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches what is allowed, without following redirects', async () => {
    const body = await square('#f00');
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(new Uint8Array(body))),
    );
    vi.stubGlobal('fetch', fetchMock);
    const image = await loadNodeImage(url, { allow: (src) => src === url });
    expect(image.width).toBe(10);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'error' });
  });
});
