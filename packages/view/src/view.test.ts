// @vitest-environment happy-dom
import { type Primitive, toPlainText } from '@markmap/core';
import { parse } from '@markmap/parse';
import { approximateMeasurer, createImageContent } from '@markmap/render';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { interpolateZoom, Markmap, resolveViewOptions, SvgDomBackend, type ViewBackend } from '.';
import { zoomIdentity } from 'd3-zoom';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvg(width = 800, height = 600): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.getBoundingClientRect = () => ({ x: 0, y: 0, width, height }) as DOMRect;
  document.body.append(svg);
  return svg;
}

const group = (key: string, x: number, label = key): Primitive => ({
  kind: 'group',
  key,
  nodeId: key,
  transform: [1, 0, 0, 1, x, 0],
  children: [{ kind: 'path', d: `M0,0H${label.length}`, stroke: 'red' }],
});

const visibleIds = (mm: Markmap) => mm.state!.layout.nodes.map((n) => n.node.id);
const labels = (mm: Markmap) => mm.state!.layout.nodes.map((n) => toPlainText(n.node.content));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SvgDomBackend', () => {
  it('creates one element per keyed group', () => {
    const backend = new SvgDomBackend(createSvg());
    backend.draw([group('a', 0), group('b', 10)]);
    const children = [...backend.root.children];
    expect(children.map((el) => el.getAttribute('data-key'))).toEqual(['a', 'b']);
    expect(children[1].getAttribute('transform')).toBe('matrix(1 0 0 1 10 0)');
    expect(children[0].querySelector('path')?.getAttribute('d')).toBe('M0,0H1');
  });

  it('keeps elements across draws and only rewrites changed content', () => {
    const backend = new SvgDomBackend(createSvg());
    backend.draw([group('a', 0), group('b', 10)]);
    const a = backend.get('a')!;
    const path = a.querySelector('path');
    backend.draw([group('a', 5), group('b', 10, 'bbb')]);
    expect(backend.get('a')).toBe(a);
    expect(a.getAttribute('transform')).toBe('matrix(1 0 0 1 5 0)');
    expect(a.querySelector('path')).toBe(path);
    expect(backend.get('b')!.querySelector('path')?.getAttribute('d')).toBe('M0,0H3');
  });

  it('removes missing groups and follows the new order', () => {
    const backend = new SvgDomBackend(createSvg());
    backend.draw([group('a', 0), group('b', 0), group('c', 0)]);
    backend.draw([group('c', 0), group('a', 0)]);
    expect([...backend.root.children].map((el) => el.getAttribute('data-key'))).toEqual(['c', 'a']);
    expect(backend.get('b')).toBeUndefined();
  });

  it('skips primitives for other backends', () => {
    const backend = new SvgDomBackend(createSvg());
    backend.draw([{ ...group('a', 0), backends: ['canvas'] }]);
    expect(backend.root.children).toHaveLength(0);
  });
});

describe('Markmap', () => {
  const md = '# Root\n\n## A\n\n- a1\n- a2\n  - a2x\n\n## B\n\n- b1';
  const create = (options = {}) =>
    Markmap.create(createSvg(), parse(md).root, {
      measurer: approximateMeasurer,
      duration: 0,
      ...options,
    });

  it('draws every node and edge with theme tokens', () => {
    const mm = create();
    expect(mm.element.classList.contains('markmap')).toBe(true);
    expect(mm.element.querySelector('style')?.textContent).toContain('--mm-branch-0:');
    expect(mm.element.querySelectorAll('[data-key^="node:"]')).toHaveLength(7);
    expect(mm.element.querySelectorAll('[data-key^="edge:"]')).toHaveLength(6);
  });

  it('fits the drawing into the SVG', () => {
    const mm = create();
    const { bounds } = mm.state!;
    const t = mm.transform;
    const [x0, y0] = t.apply([bounds.x, bounds.y]);
    const [x1, y1] = t.apply([bounds.x + bounds.width, bounds.y + bounds.height]);
    expect(x0).toBeGreaterThanOrEqual(19.9);
    expect(y0).toBeGreaterThanOrEqual(19.9);
    expect(x1).toBeLessThanOrEqual(780.1);
    expect(y1).toBeLessThanOrEqual(580.1);
    // Centered on at least one axis, touching the padding on the other.
    expect(Math.abs(x0 - (800 - x1)) < 0.1 || Math.abs(y0 - (600 - y1)) < 0.1).toBe(true);
  });

  it('folds and unfolds, keeping the node in place', () => {
    const mm = create();
    const a = mm.state!.layout.nodes[1];
    const screenBefore = mm.transform.apply([a.rect.x, a.rect.y]);
    mm.toggle(a.node.id);
    expect(visibleIds(mm)).toHaveLength(4);
    expect(mm.foldedIds.has(a.node.id)).toBe(true);
    const rect = mm.state!.layout.byId.get(a.node.id)!.rect;
    const screenAfter = mm.transform.apply([rect.x, rect.y]);
    expect(screenAfter[0]).toBeCloseTo(screenBefore[0]);
    expect(screenAfter[1]).toBeCloseTo(screenBefore[1]);
    mm.toggle(a.node.id);
    expect(visibleIds(mm)).toHaveLength(7);
  });

  it('hit-tests fold anchors', () => {
    const mm = create();
    const a = mm.state!.layout.nodes[1];
    const anchor = mm.theme.node.anchor(a.rect, 'right', {
      depth: a.depth,
      path: [],
      hasChildren: true,
      folded: false,
      direction: 'right',
    });
    expect(mm.hitToggle(anchor.x + 3, anchor.y - 3)?.node.id).toBe(a.node.id);
    expect(mm.hitToggle(a.rect.x, a.rect.y)).toBeUndefined();
  });

  it('applies the initial expand level to new nodes only', () => {
    const mm = create({ initialExpandLevel: 1 });
    expect(visibleIds(mm)).toHaveLength(3);
    const a = mm.state!.layout.nodes[1].node.id;
    mm.setFolded(a, false);
    // Re-parsing keeps the user's choice for existing ids.
    mm.setData(parse(`${md}\n- b2`).root);
    expect(mm.foldedIds.has(a)).toBe(false);
    // Root, A, a1, a2 (folded at depth 2), B (still folded, so b2 stays hidden).
    expect(visibleIds(mm)).toHaveLength(5);
  });

  it('forgets fold state for removed nodes', () => {
    const mm = create();
    const b = mm.state!.layout.nodes.find((n) => toPlainText(n.node.content) === 'B')!;
    mm.toggle(b.node.id);
    mm.setData(parse('# Root\n\n## A').root);
    expect(mm.foldedIds.size).toBe(0);
  });

  it('defers fit until the SVG has a size', () => {
    const callbacks: ResizeObserverCallback[] = [];
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        callbacks.push(cb);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    try {
      let size = { width: 0, height: 0 };
      const svg = createSvg();
      svg.getBoundingClientRect = () => ({ x: 0, y: 0, ...size }) as DOMRect;
      const mm = Markmap.create(svg, parse(md).root, { measurer: approximateMeasurer });
      expect(mm.transform.k).toBe(1);
      expect(callbacks).toHaveLength(1);
      size = { width: 800, height: 600 };
      callbacks[0]([], {} as ResizeObserver);
      expect(mm.transform.k).not.toBe(1);
    } finally {
      globalThis.ResizeObserver = original;
    }
  });

  it('cleans up on destroy', () => {
    const mm = create();
    mm.destroy();
    expect(mm.element.children).toHaveLength(0);
    expect(mm.element.classList.contains('markmap')).toBe(false);
  });
});

describe('Markmap options', () => {
  const md = '# Root\n\n## A\n\n- a1\n  - a1x\n\n## B\n\n- b1';

  it('folds a node and everything below with foldAll', () => {
    const { root } = parse(
      '# R\n\n## A <!-- markmap: foldAll -->\n\n- a1\n  - a1x\n\n## B\n\n- b1',
    );
    const mm = Markmap.create(createSvg(), root, { measurer: approximateMeasurer });
    const [a] = root.children;
    expect(mm.foldedIds.has(a.id)).toBe(true);
    expect(mm.foldedIds.has(a.children[0].id)).toBe(true);
    mm.toggle(a.id);
    // Children stay folded after the parent opens.
    expect(visibleIds(mm)).toContain(a.children[0].id);
    expect(visibleIds(mm)).not.toContain(a.children[0].children[0].id);
  });

  it('replaces options and redraws', () => {
    const mm = Markmap.create(createSvg(), parse(md).root, {
      measurer: approximateMeasurer,
      maxWidth: 50,
    });
    mm.setOptions(
      resolveViewOptions({ measurer: approximateMeasurer }, { color: ['#abcdef'], zoom: false })
        .options,
    );
    expect(mm.options.maxWidth).toBeUndefined();
    expect(mm.options.zoom).toBe(false);
    expect(mm.options.pan).toBe(true);
    expect(mm.element.querySelector('style')?.textContent).toContain('--mm-branch-0:#abcdef;');
    expect(mm.element.innerHTML).not.toContain('--mm-branch-1)');
  });

  it('applies options passed with data', () => {
    const mm = new Markmap(createSvg(), { measurer: approximateMeasurer });
    mm.setData(parse(md).root, { measurer: approximateMeasurer, initialExpandLevel: 1 });
    expect(visibleIds(mm)).toHaveLength(3);
  });
});

describe('resolveViewOptions', () => {
  it('applies view, render and theme options and reports the rest', () => {
    const { options, warnings } = resolveViewOptions(
      { maxWidth: 100, zoom: true },
      { zoom: false, initialExpandLevel: 2, maxWidth: 'x', colorFreezeLevel: 1, nope: true },
    );
    expect(options).toMatchObject({ maxWidth: 100, zoom: false, initialExpandLevel: 2 });
    expect(options.theme?.name).toBe('classic');
    expect(warnings).toEqual(['`maxWidth` must be a number', 'Unknown option `nope`']);
  });
});

describe('animation', () => {
  const md = '# Root\n\n## A\n\n- a1\n- a2\n\n## B';
  const create = (options = {}) =>
    Markmap.create(createSvg(), parse(md).root, { measurer: approximateMeasurer, ...options });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('animates folding while the toggled node stays still on screen', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const mm = create({ duration: 300 });
    const a = mm.state!.layout.nodes[1].node.id;
    const leaving = mm.state!.layout.nodes[3].node.id;
    const before = mm.screenRect(a)!;
    mm.toggle(a);

    vi.advanceTimersByTime(150);
    const mid = mm.element.querySelector(`[data-key="node:${leaving}"]`);
    expect(Number(mid?.getAttribute('opacity'))).toBeGreaterThan(0);
    expect(Number(mid?.getAttribute('opacity'))).toBeLessThan(1);
    expect(mm.screenRect(a)!.x).toBeCloseTo(before.x);
    expect(mm.screenRect(a)!.y).toBeCloseTo(before.y);

    vi.advanceTimersByTime(300);
    expect(mm.element.querySelector(`[data-key="node:${leaving}"]`)).toBeNull();
    expect(mm.element.querySelectorAll('[opacity]')).toHaveLength(0);
    expect(mm.screenRect(a)!.y).toBeCloseTo(before.y);
  });

  it('can reverse a fold half way through', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const mm = create({ duration: 300 });
    const a = mm.state!.layout.nodes[1].node.id;
    const before = mm.screenRect(a)!;
    mm.toggle(a);
    vi.advanceTimersByTime(100);
    mm.toggle(a);
    vi.advanceTimersByTime(400);
    expect(mm.element.querySelectorAll('[data-key^="node:"]')).toHaveLength(5);
    expect(mm.element.querySelectorAll('[opacity]')).toHaveLength(0);
    expect(mm.screenRect(a)!.y).toBeCloseTo(before.y);
  });

  it('draws at once when the user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
    const mm = create({ duration: 300 });
    mm.toggle(mm.state!.layout.nodes[1].node.id);
    expect(mm.element.querySelectorAll('[data-key^="node:"]')).toHaveLength(3);
  });

  it('interpolates zoom transforms', () => {
    const a = zoomIdentity.translate(10, 20);
    const b = zoomIdentity.translate(100, 50).scale(4);
    expect(interpolateZoom(a, b, 0, 400, 300)).toEqual(a);
    const end = interpolateZoom(a, b, 1, 400, 300);
    expect([end.x, end.y, end.k]).toEqual([b.x, b.y, b.k].map((v) => expect.closeTo(v)));
    expect(interpolateZoom(a, b, 0.5, 400, 300).k).toBeCloseTo(2);
    // A pure pan moves linearly.
    const pan = interpolateZoom(a, zoomIdentity.translate(30, 20), 0.25, 400, 300);
    expect(pan.x).toBeCloseTo(15);
  });
});

describe('view API', () => {
  // Root > A > (a1, a2 > a2x), B > b1
  const md = '# Root\n\n## A\n\n- a1\n- a2\n  - a2x\n\n## B\n\n- b1';
  const create = () =>
    Markmap.create(createSvg(), parse(md).root, { measurer: approximateMeasurer, duration: 0 });

  it('folds to a level and expands everything again', () => {
    const mm = create();
    mm.foldToLevel(1);
    expect(labels(mm)).toEqual(['Root', 'A', 'B']);
    mm.foldToLevel(2);
    expect(labels(mm)).toEqual(['Root', 'A', 'a1', 'a2', 'B', 'b1']);
    mm.foldToLevel(0);
    expect(labels(mm)).toEqual(['Root']);
    mm.expandAll();
    expect(labels(mm)).toHaveLength(7);
    expect(mm.foldedIds.size).toBe(0);
  });

  it('folds and expands one subtree, one level at a time when reopened', () => {
    const mm = create();
    const a = mm.state!.layout.nodes[1].node.id;
    mm.foldAll(a);
    expect(labels(mm)).toEqual(['Root', 'A', 'B', 'b1']);
    mm.toggle(a);
    expect(labels(mm)).toEqual(['Root', 'A', 'a1', 'a2', 'B', 'b1']);
    mm.expandAll(a);
    expect(labels(mm)).toHaveLength(7);
    mm.foldAll();
    expect(labels(mm)).toEqual(['Root']);
  });

  it('keeps the node it acts on still', () => {
    const mm = create();
    const a = mm.state!.layout.nodes[1].node.id;
    const before = mm.screenRect(a)!;
    mm.foldAll(a);
    expect(mm.screenRect(a)!.y).toBeCloseTo(before.y);
    const root = mm.screenRect('root')!;
    mm.foldToLevel(1);
    expect(mm.screenRect('root')!.y).toBeCloseTo(root.y);
  });

  it('zooms in and out around the center', () => {
    const mm = create();
    const t = mm.transform;
    const center = t.invert([400, 300]);
    mm.zoomIn();
    expect(mm.transform.k).toBeCloseTo(t.k * 1.25);
    expect(mm.transform.invert([400, 300])).toEqual(center.map((v) => expect.closeTo(v)));
    mm.zoomOut();
    expect(mm.transform.k).toBeCloseTo(t.k);
  });

  it('adds up zoom steps taken during an animation', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const mm = Markmap.create(createSvg(), parse(md).root, { measurer: approximateMeasurer });
    const k = mm.transform.k;
    mm.zoomIn();
    vi.advanceTimersByTime(100);
    mm.zoomIn();
    vi.advanceTimersByTime(1000);
    expect(mm.transform.k).toBeCloseTo(k * 1.25 * 1.25);
    vi.useRealTimers();
  });
});

describe('events and color scheme', () => {
  const md = '# Root\n\n## A\n\n- a1\n\n## B';
  const create = (options = {}) =>
    Markmap.create(createSvg(), parse(md).root, {
      measurer: approximateMeasurer,
      duration: 0,
      ...options,
    });

  it('emits render, zoom and fold, and stops after unsubscribing', () => {
    const mm = create();
    const seen: string[] = [];
    const offRender = mm.on('render', (result) =>
      seen.push(`render:${result.layout.nodes.length}`),
    );
    mm.on('fold', (folded) => seen.push(`fold:${folded.size}`));
    mm.on('zoom', (t) => seen.push(`zoom:${t.k.toFixed(2)}`));
    const a = mm.state!.layout.nodes[1].node.id;
    const k = mm.transform.k;
    mm.toggle(a);
    expect(seen).toEqual(['render:3', 'fold:1']);
    seen.length = 0;
    mm.zoomIn();
    expect(seen).toEqual([`zoom:${(k * 1.25).toFixed(2)}`]);
    seen.length = 0;
    offRender();
    mm.toggle(a);
    expect(seen).toEqual(['fold:0']);
    // No change, no event.
    seen.length = 0;
    mm.expandAll();
    expect(seen).toEqual([]);
  });

  it('switches token sets with colorScheme', () => {
    const mm = create();
    const css = () => mm.element.querySelector('style')!.textContent!;
    expect(css()).not.toContain('#1e1e1e');
    mm.setOptions({ ...mm.options, colorScheme: 'dark' });
    expect(css()).toContain('--mm-bg:#1e1e1e;');
    mm.setOptions({ ...mm.options, colorScheme: 'auto' });
    expect(css()).toContain('prefers-color-scheme: dark');
    expect(resolveViewOptions({}, { colorScheme: 'dark' }).options.colorScheme).toBe('dark');
    expect(resolveViewOptions({}, { colorScheme: 'dim' }).warnings).toEqual([
      '`colorScheme` must be one of `light`, `dark`, `auto`',
    ]);
  });
});

describe('images', () => {
  it('renders again once image sizes arrive', async () => {
    let resolve!: (size: { width: number; height: number }) => void;
    const plugins = [createImageContent({ loadSize: () => new Promise((r) => (resolve = r)) })];
    const mm = Markmap.create(createSvg(), parse('# ![a](a.png)').root, {
      measurer: approximateMeasurer,
      duration: 0,
      plugins,
    });
    const width = () => mm.element.querySelector('image')?.getAttribute('width');
    expect(width()).toBe('40');
    resolve({ width: 120, height: 60 });
    await expect.poll(width).toBe('120');
  });
});

/** Layout point at the center of the first primitive of `kind` (only translated groups). */
function centerOf(
  list: Primitive[],
  kind: 'hit' | 'link',
  dx = 0,
  dy = 0,
): [number, number] | undefined {
  for (const p of list) {
    if (p.kind === kind)
      return [dx + p.rect.x + p.rect.width / 2, dy + p.rect.y + p.rect.height / 2];
    if (p.kind === 'group') {
      const tx = dx + (p.transform?.[4] ?? 0);
      const found = centerOf(p.children, kind, tx, dy + (p.transform?.[5] ?? 0));
      if (found) return found;
    }
  }
  return undefined;
}

function click(mm: Markmap, [x, y]: [number, number]) {
  const [clientX, clientY] = mm.transform.apply([x, y]);
  mm.element.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
}

/** A backend that only records what the view asks of it. */
function fakeBackend() {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => ({ x: 0, y: 0, width: 800, height: 600 }) as DOMRect;
  document.body.append(element);
  const calls = { draws: [] as Primitive[][], css: '', transform: '', destroyed: false };
  const backend: ViewBackend = {
    element,
    draw: (primitives) => calls.draws.push(primitives),
    setTransform: ({ k, x, y }) => (calls.transform = `${x},${y},${k}`),
    setCSS: (css) => (calls.css = css),
    destroy: () => (calls.destroyed = true),
  };
  return { backend, calls };
}

describe('backends', () => {
  const md = '# Root\n\n## A\n\n- a1\n- a2\n  - a2x\n\n## B\n\n- b1';

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('drives any backend through the interface', () => {
    const { backend, calls } = fakeBackend();
    const mm = Markmap.create(backend, parse(md).root, {
      measurer: approximateMeasurer,
      duration: 0,
    });
    expect(mm.element).toBe(backend.element);
    expect(mm.element.classList.contains('markmap')).toBe(true);
    expect(calls.css).toContain('--mm-branch-0:');
    expect(
      calls.draws.at(-1)!.filter((p) => p.kind === 'group' && p.key?.startsWith('node:')),
    ).toHaveLength(7);
    const { k, x, y } = mm.transform;
    expect(calls.transform).toBe(`${x},${y},${k}`);
    mm.destroy();
    expect(calls.destroyed).toBe(true);
    expect(mm.element.classList.contains('markmap')).toBe(false);
  });

  it('toggles a fold by clicking its anchor', () => {
    const { backend } = fakeBackend();
    const mm = Markmap.create(backend, parse(md).root, {
      measurer: approximateMeasurer,
      duration: 0,
    });
    const a = mm.state!.layout.nodes[1];
    const anchor = mm.theme.node.anchor(a.rect, 'right', {
      depth: a.depth,
      path: [],
      hasChildren: true,
      folded: false,
      direction: 'right',
    });
    click(mm, [anchor.x, anchor.y]);
    expect(mm.foldedIds.has(a.node.id)).toBe(true);
  });

  it('opens links itself only when the backend has no link elements', () => {
    const open = vi.fn<(url: string, target: string, features: string) => void>();
    vi.stubGlobal('open', open);
    const linkMd = '# Root\n\n- [docs](https://example.com/docs)';
    const options = { measurer: approximateMeasurer, duration: 0 };

    const svg = Markmap.create(createSvg(), parse(linkMd).root, options);
    click(svg, centerOf(svg.state!.primitives, 'link')!);
    expect(open).not.toHaveBeenCalled();

    const mm = Markmap.create(fakeBackend().backend, parse(linkMd).root, options);
    click(mm, centerOf(mm.state!.primitives, 'link')!);
    expect(open).toHaveBeenCalledWith('https://example.com/docs', '_blank', 'noopener,noreferrer');
  });

  it('hit-tests where nodes are drawn mid-animation', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const tall = '# Root\n\n## A\n\n- a1\n- a2\n- a3\n- a4\n- a5\n- a6\n\n## B\n\n- b1';
    const mm = Markmap.create(createSvg(), parse(tall).root, {
      measurer: approximateMeasurer,
      duration: 400,
    });
    const nodeB = mm.state!.layout.nodes.find((n) => toPlainText(n.node.content) === 'B')!;
    const anchorOf = (rect: { x: number; y: number; width: number; height: number }) =>
      mm.theme.node.anchor(rect, 'right', {
        depth: nodeB.depth,
        path: [],
        hasChildren: true,
        folded: false,
        direction: 'right',
      });
    mm.toggle(mm.state!.layout.nodes[1].node.id);
    vi.advanceTimersByTime(200);
    // Where B is drawn now, in layout coordinates.
    const screen = mm.screenRect(nodeB.node.id)!;
    const { k } = mm.transform;
    const [x, y] = mm.transform.invert([screen.x, screen.y]);
    const mid = anchorOf({ x, y, width: screen.width / k, height: screen.height / k });
    const end = anchorOf(mm.state!.layout.byId.get(nodeB.node.id)!.rect);
    // Further than the toggle radius from where it ends up, so the final layout would miss it.
    expect(Math.hypot(mid.x - end.x, mid.y - end.y)).toBeGreaterThan(10);
    expect(mm.hitToggle(mid.x, mid.y)?.node.id).toBe(nodeB.node.id);
  });
});
