import type { Primitive, TextRun } from '@markmap/core';
import { describe, expect, it, vi } from 'vitest';
import { drawPrimitives, type DrawEnv } from './draw';
import { ImageCache, type LoadedImage } from './images';

/** A 2D context that records calls, with each call's fill, stroke and alpha at the time. */
function recorder() {
  const calls: unknown[][] = [];
  const stack: Record<string, unknown>[] = [];
  const state: Record<string, unknown> = { globalAlpha: 1 };
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
    };
  const ctx = {
    ...state,
    beginPath() {},
    rect: record('rect'),
    clip: record('clip'),
    roundRect: record('roundRect'),
    transform: record('transform'),
    fillText(text: string, x: number, y: number) {
      calls.push(['fillText', text, x, y, ctx.font, ctx.fillStyle]);
    },
    fill(path?: unknown) {
      calls.push(['fill', ctx.fillStyle, ...(path ? [path] : [])]);
    },
    stroke(path?: unknown) {
      calls.push(['stroke', ctx.strokeStyle, ctx.lineWidth, ...(path ? [path] : [])]);
    },
    drawImage: record('drawImage'),
    save() {
      stack.push({ globalAlpha: ctx.globalAlpha, font: ctx.font });
      calls.push(['save']);
    },
    restore() {
      Object.assign(ctx, stack.pop());
      calls.push(['restore']);
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const tokens = { 'mm-a': '#111', 'mm-b': '#222' };
const env = (extra: Partial<DrawEnv> = {}): DrawEnv => ({
  tokens,
  createPath: (d) => d as unknown as Path2D,
  warn: () => {},
  ...extra,
});

function draw(primitives: Primitive[], extra?: Partial<DrawEnv>) {
  const { ctx, calls } = recorder();
  drawPrimitives(ctx, primitives, env(extra));
  return calls;
}

const font = { family: 'serif', size: 16, weight: 400, style: 'normal', lineHeight: 20 } as const;

describe('drawPrimitives', () => {
  it('fills then strokes shapes, with resolved paints', () => {
    const calls = draw([
      { kind: 'rect', x: 1, y: 2, w: 3, h: 4, fill: 'var(--mm-a)', stroke: 'red', strokeWidth: 2 },
      { kind: 'rect', x: 0, y: 0, w: 9, h: 9, r: 3 },
      { kind: 'path', d: 'M0,0H5', stroke: 'var(--mm-b)' },
    ]);
    expect(calls).toEqual([
      ['rect', 1, 2, 3, 4],
      ['fill', '#111'],
      ['stroke', 'red', 2],
      ['roundRect', 0, 0, 9, 9, 3],
      ['stroke', '#222', 1, 'M0,0H5'],
    ]);
  });

  it('draws nothing for a paint it cannot resolve', () => {
    expect(draw([{ kind: 'path', d: 'M0,0', fill: 'var(--mm-x)' }])).toEqual([]);
  });

  it('draws each text run with its own font and color', () => {
    const runs: TextRun[] = [
      { text: 'a', x: 1, y: 10, font, fill: 'var(--mm-a)' },
      { text: 'b', x: 8, y: 10, font: { ...font, weight: 700, style: 'italic' } },
    ];
    expect(draw([{ kind: 'text', x: 100, y: 200, runs }])).toEqual([
      ['fillText', 'a', 101, 210, 'normal 400 16px serif', '#111'],
      ['fillText', 'b', 108, 210, 'italic 700 16px serif', '#000'],
    ]);
  });

  it('only sets the font when it changes', () => {
    const { ctx } = recorder();
    const set = vi.fn<(font: string) => void>();
    Object.defineProperty(ctx, 'font', { set });
    const run: TextRun = { text: 'a', x: 0, y: 0, font };
    drawPrimitives(ctx, [{ kind: 'text', x: 0, y: 0, runs: [run, run, run] }], env());
    expect(set).toHaveBeenCalledOnce();
  });

  it('sets the font again after a group restored the old one', () => {
    const run: TextRun = { text: 'a', x: 0, y: 0, font };
    const label = (): Primitive => ({
      kind: 'group',
      transform: [1, 0, 0, 1, 0, 0],
      children: [{ kind: 'text', x: 0, y: 0, runs: [run] }],
    });
    const calls = draw([label(), label()]);
    expect(calls.filter(([name]) => name === 'fillText').map((call) => call[4])).toEqual([
      'normal 400 16px serif',
      'normal 400 16px serif',
    ]);
  });

  it('applies group transforms and multiplies opacity', () => {
    const shape: Primitive = { kind: 'rect', x: 0, y: 0, w: 1, h: 1, fill: 'red' };
    const { ctx, calls } = recorder();
    const alphas: number[] = [];
    ctx.fill = () => alphas.push(ctx.globalAlpha);
    drawPrimitives(
      ctx,
      [
        {
          kind: 'group',
          transform: [1, 0, 0, 1, 5, 6],
          opacity: 0.5,
          children: [{ kind: 'group', opacity: 0.5, children: [shape] }, shape],
        },
        shape,
      ],
      env(),
    );
    expect(alphas).toEqual([0.25, 0.5, 1]);
    expect(calls[0]).toEqual(['save']);
    expect(calls[1]).toEqual(['transform', 1, 0, 0, 1, 5, 6]);
    expect(calls.filter(([name]) => name === 'restore')).toHaveLength(2);
  });

  it('clips groups in their own coordinates', () => {
    const calls = draw([
      {
        kind: 'group',
        transform: [2, 0, 0, 2, 0, 0],
        clip: { x: 1, y: 2, width: 3, height: 4 },
        children: [],
      },
    ]);
    expect(calls).toEqual([
      ['save'],
      ['transform', 2, 0, 0, 2, 0, 0],
      ['rect', 1, 2, 3, 4],
      ['clip'],
      ['restore'],
    ]);
  });

  it('leaves plain groups without saving the context', () => {
    const calls = draw([{ kind: 'group', children: [] }]);
    expect(calls).toEqual([]);
  });

  it('runs custom drawings in their own context state', () => {
    const canvas = vi.fn<(ctx: CanvasRenderingContext2D) => void>();
    const calls = draw([{ kind: 'custom', canvas }]);
    expect(canvas).toHaveBeenCalledOnce();
    expect(calls).toEqual([['save'], ['restore']]);
  });

  it('skips what is not for canvas, and warns about what cannot be drawn', () => {
    const warn = vi.fn<(message: string) => void>();
    const calls = draw(
      [
        { kind: 'rect', x: 0, y: 0, w: 1, h: 1, fill: 'red', backends: ['svg'] },
        { kind: 'custom', svg: () => '<g/>' },
        { kind: 'overlay', rect: { x: 0, y: 0, width: 1, height: 1 }, html: () => null as never },
      ],
      { warn },
    );
    expect(calls).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('draws nothing for hit areas and links', () => {
    const rect = { x: 0, y: 0, width: 1, height: 1 };
    const warn = vi.fn<(message: string) => void>();
    const calls = draw(
      [
        { kind: 'hit', action: 'x', rect },
        { kind: 'link', href: 'https://example.com', rect },
      ],
      { warn },
    );
    expect(calls).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('fits images in their box like SVG, and skips ones that are not ready', () => {
    const image: LoadedImage = { source: 'img' as never, width: 100, height: 50 };
    const box = { kind: 'image', x: 10, y: 20, w: 40, h: 40 } as const;
    const calls = draw(
      [
        { ...box, src: 'ready' },
        { ...box, src: 'loading' },
      ],
      { image: (src) => (src === 'ready' ? image : undefined) },
    );
    expect(calls).toEqual([['drawImage', 'img', 10, 30, 40, 20]]);
  });
});

describe('ImageCache', () => {
  const image: LoadedImage = { source: 'img' as never, width: 1, height: 1 };

  it('loads once and reports when ready', async () => {
    const load = vi.fn<() => Promise<LoadedImage>>(() => Promise.resolve(image));
    const onLoad = vi.fn<() => void>();
    const cache = new ImageCache({ load, onLoad });
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('a')).toBeUndefined();
    await expect.poll(() => onLoad.mock.calls.length).toBe(1);
    expect(cache.get('a')).toBe(image);
    expect(load).toHaveBeenCalledOnce();
  });

  it('remembers failures', async () => {
    const load = vi.fn<() => Promise<LoadedImage>>(() => Promise.reject(new Error('nope')));
    const onLoad = vi.fn<() => void>();
    const cache = new ImageCache({ load, onLoad });
    cache.get('a');
    await Promise.resolve();
    await Promise.resolve();
    expect(cache.get('a')).toBeUndefined();
    expect(load).toHaveBeenCalledOnce();
    expect(onLoad).not.toHaveBeenCalled();
  });
});
