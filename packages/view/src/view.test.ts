// @vitest-environment happy-dom
import { type Primitive, toPlainText } from '@markmap/core';
import { parse } from '@markmap/parse';
import { approximateMeasurer } from '@markmap/render';
import { afterEach, describe, expect, it } from 'vitest';
import { applyViewOptions, Markmap, SvgDomBackend } from '.';

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
    Markmap.create(createSvg(), parse(md).root, { measurer: approximateMeasurer, ...options });

  it('draws every node and edge with theme tokens', () => {
    const mm = create();
    expect(mm.svg.classList.contains('markmap')).toBe(true);
    expect(mm.svg.querySelector('style')?.textContent).toContain('--mm-branch-0:');
    expect(mm.svg.querySelectorAll('[data-key^="node:"]')).toHaveLength(7);
    expect(mm.svg.querySelectorAll('[data-key^="edge:"]')).toHaveLength(6);
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
    const anchor = mm.theme.node.anchor(a.rect, 'source', {
      depth: a.depth,
      branch: 0,
      hasChildren: true,
      folded: false,
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
    expect(mm.svg.children).toHaveLength(0);
    expect(mm.svg.classList.contains('markmap')).toBe(false);
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
      applyViewOptions({ measurer: approximateMeasurer }, { color: ['#abcdef'], zoom: false }),
    );
    expect(mm.options.maxWidth).toBeUndefined();
    expect(mm.options.zoom).toBe(false);
    expect(mm.options.pan).toBe(true);
    expect(mm.svg.querySelector('style')?.textContent).toContain('--mm-branch-0:#abcdef;');
    expect(mm.svg.innerHTML).not.toContain('--mm-branch-1)');
  });

  it('applies options passed with data', () => {
    const mm = new Markmap(createSvg(), { measurer: approximateMeasurer });
    mm.setData(parse(md).root, { measurer: approximateMeasurer, initialExpandLevel: 1 });
    expect(visibleIds(mm)).toHaveLength(3);
  });
});
