// @vitest-environment happy-dom
import { parse } from '@markmap/parse';
import type { Primitive } from '@markmap/core';
import { approximateMeasurer } from '@markmap/render';
import { Markmap } from '@markmap/view';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasBackend } from './backend';

/** A context that records transforms, clears and fills. */
function fakeContext() {
  const calls: unknown[][] = [];
  const ctx = new Proxy(
    {},
    {
      get: (target: Record<string, unknown>, name: string) =>
        name in target
          ? target[name]
          : (...args: unknown[]) => {
              calls.push([name, ...args]);
            },
      set(target, name: string, value) {
        target[name] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

function createCanvas(width = 800, height = 600) {
  const canvas = document.createElement('canvas');
  const { ctx, calls } = fakeContext();
  canvas.getContext = (() => ctx) as never;
  canvas.getBoundingClientRect = () => ({ x: 0, y: 0, width, height }) as DOMRect;
  document.body.append(canvas);
  return { canvas, calls };
}

const rect: Primitive = { kind: 'rect', x: 1, y: 2, w: 3, h: 4, fill: 'red' };
const named = (calls: unknown[][], name: string) => calls.filter(([n]) => n === name);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  vi.stubGlobal('Path2D', String);
  window.devicePixelRatio = 2;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

describe('CanvasBackend', () => {
  it('draws at most once per frame, with the latest state', () => {
    const { canvas, calls } = createCanvas();
    const backend = new CanvasBackend(canvas);
    backend.draw([rect]);
    backend.setTransform({ k: 2, x: 10, y: 20 });
    backend.draw([rect, rect]);
    expect(named(calls, 'fill')).toHaveLength(0);
    vi.advanceTimersToNextFrame();
    expect(named(calls, 'fill')).toHaveLength(2);
    expect(named(calls, 'setTransform').at(-1)).toEqual(['setTransform', 4, 0, 0, 4, 20, 40]);
    vi.advanceTimersToNextFrame();
    expect(named(calls, 'fill')).toHaveLength(2);
  });

  it('sizes the bitmap for the screen and clears before drawing', () => {
    const { canvas, calls } = createCanvas(300, 200);
    const backend = new CanvasBackend(canvas);
    backend.paint();
    expect([canvas.width, canvas.height]).toEqual([600, 400]);
    expect(named(calls, 'clearRect')).toEqual([['clearRect', 0, 0, 600, 400]]);
  });

  it('holds the element size when only the bitmap sized it', () => {
    const { canvas } = createCanvas();
    canvas.width = 300;
    canvas.height = 150;
    canvas.getBoundingClientRect = () =>
      ({ x: 0, y: 0, width: canvas.width, height: canvas.height }) as DOMRect;
    new CanvasBackend(canvas).paint();
    expect(canvas.style.width).toBe('300px');
    expect(canvas.style.height).toBe('150px');
  });

  it('tells drawing what is on screen', () => {
    const { canvas, calls } = createCanvas(400, 300);
    const backend = new CanvasBackend(canvas);
    const inView: Primitive = {
      kind: 'group',
      bounds: { x: 0, y: 0, width: 10, height: 10 },
      children: [rect],
    };
    const outOfView = { ...inView, bounds: { x: 300, y: 0, width: 10, height: 10 } } as Primitive;
    backend.draw([inView, outOfView]);
    backend.setTransform({ k: 2, x: 0, y: 0 }); // Shows 0..200 × 0..150.
    backend.paint();
    expect(named(calls, 'fill')).toHaveLength(1);
  });

  it('skips drawing while the element has no size', () => {
    const { canvas, calls } = createCanvas(0, 0);
    new CanvasBackend(canvas).paint();
    expect(calls).toEqual([]);
  });

  it('resolves tokens from CSS, including overrides', () => {
    const { canvas } = createCanvas();
    const backend = new CanvasBackend(canvas);
    canvas.style.setProperty('--mm-test', 'rebeccapurple');
    const fills: unknown[] = [];
    const ctx = canvas.getContext('2d')!;
    ctx.fill = () => fills.push(ctx.fillStyle);
    backend.draw([{ ...rect, fill: 'var(--mm-test)' } as Primitive]);
    backend.paint();
    expect(fills).toEqual(['rebeccapurple']);
  });

  it('cleans up', () => {
    const { canvas } = createCanvas();
    const backend = new CanvasBackend(canvas);
    backend.setCSS('.markmap{--mm-bg:#fff;}');
    expect(document.head.querySelector('style')?.textContent).toContain('--mm-bg');
    backend.draw([rect]);
    backend.destroy();
    expect(document.head.querySelector('style')).toBeNull();
    expect(() => vi.advanceTimersToNextFrame()).not.toThrow();
  });
});

describe('Markmap on canvas', () => {
  const md = '# Root\n\n- [docs](https://example.com/docs)\n- plain\n  - child';

  function create() {
    const { canvas, calls } = createCanvas();
    const mm = Markmap.create(new CanvasBackend(canvas), parse(md).root, {
      measurer: approximateMeasurer,
      duration: 0,
    });
    return { mm, canvas, calls };
  }

  it('draws labels and themes the element', () => {
    const { mm, canvas, calls } = create();
    vi.advanceTimersToNextFrame();
    expect(mm.element).toBe(canvas);
    expect(canvas.classList.contains('markmap')).toBe(true);
    expect(named(calls, 'fillText').map(([, text]) => text)).toContain('plain');
    expect(document.head.querySelector('style')?.textContent).toContain('--mm-branch-0:');
  });

  it('shows the pointer over targets and opens links', () => {
    const open = vi.fn<(url: string, target: string, features: string) => void>();
    vi.stubGlobal('open', open);
    const { mm, canvas } = create();
    const link = mm.state!.layout.nodes[1];
    const [clientX, clientY] = mm.transform.apply([link.rect.x + 8, link.rect.y + 8]);
    const at = { bubbles: true, clientX, clientY };
    canvas.dispatchEvent(new MouseEvent('pointermove', at));
    expect(canvas.style.cursor).toBe('pointer');
    canvas.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 1, clientY: 1 }));
    expect(canvas.style.cursor).toBe('');
    canvas.dispatchEvent(new MouseEvent('click', at));
    expect(open).toHaveBeenCalledWith('https://example.com/docs', '_blank', 'noopener,noreferrer');
  });
});
