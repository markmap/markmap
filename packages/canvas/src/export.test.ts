// @vitest-environment happy-dom
import type { Primitive } from '@markmap/core';
import { parse } from '@markmap/parse';
import { approximateMeasurer, cardsTheme, renderTree } from '@markmap/render';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportLayout, imageSources, toPNG } from './export';

const tree = (md: string) =>
  renderTree(parse(md).root, { measurer: approximateMeasurer, theme: cardsTheme });

describe('exportLayout', () => {
  const result = tree('# Root\n\n- a\n- b');
  const { width, height } = result.bounds;

  it('adds padding and scales', () => {
    const layout = exportLayout(result, { padding: 10, scale: 3 });
    expect(layout.width).toBe(Math.ceil((width + 20) * 3));
    expect(layout.height).toBe(Math.ceil((height + 20) * 3));
  });

  it('lowers the scale to stay within the size limit', () => {
    // Sizes whose scaled bounds fall between two whole pixels must round inside the limit.
    for (const maxSize of [100, 101, 137, 200, 333]) {
      const layout = exportLayout(result, { maxSize });
      expect(Math.max(layout.width, layout.height)).toBe(maxSize);
      expect(layout.scale).toBeLessThan(2);
    }
  });
});

describe('imageSources', () => {
  it('finds images in groups, once each, for canvas only', () => {
    const image = { kind: 'image', x: 0, y: 0, w: 1, h: 1, src: 'a' } as const;
    const list: Primitive[] = [
      image,
      { kind: 'group', children: [image, { ...image, src: 'b' }] },
      { ...image, src: 'c', backends: ['svg'] },
    ];
    expect([...imageSources(list)]).toEqual(['a', 'b']);
  });
});

describe('toPNG', () => {
  const fills: unknown[][] = [];
  let toBlob: (done: (blob: Blob | null) => void) => void;

  beforeEach(() => {
    fills.length = 0;
    toBlob = (done) => done(new Blob(['png'], { type: 'image/png' }));
    const ctx = new Proxy(
      {},
      {
        get: (target: Record<string, unknown>, name: string) =>
          name in target
            ? target[name]
            : (...args: unknown[]) => {
                if (name === 'fillRect') fills.push([target.fillStyle, ...args]);
              },
        set(target, name: string, value) {
          target[name] = value;
          return true;
        },
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(((done: never) =>
      toBlob(done)) as never);
    vi.stubGlobal('Path2D', String);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('gives a PNG, with the background of the color scheme', async () => {
    const result = tree('# Root\n\n- a');
    const blob = await toPNG(result, { colorScheme: 'dark' });
    expect(blob.type).toBe('image/png');
    expect(fills[0][0]).toBe(cardsTheme.darkTokens!['mm-bg']);
  });

  it('can leave the background transparent', async () => {
    await toPNG(tree('# Root'), { background: false });
    expect(fills).toEqual([]);
  });

  it('fails clearly when the browser refuses the size', async () => {
    toBlob = (done) => done(null);
    await expect(toPNG(tree('# Root'))).rejects.toThrow(/Could not export/);
  });
});
