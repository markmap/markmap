import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Layout, type MarkmapNode, type Primitive, unionRects } from '@markmap/core';
import { parse } from '@markmap/parse';
import { describe, expect, it } from 'vitest';
import {
  approximateMeasurer,
  layoutTree,
  primitiveBounds,
  primitivesToSVG,
  renderTree,
  toSVGString,
} from '.';

const sample = readFileSync(join(import.meta.dirname, '../test/sample.md'), 'utf8');
const render = (md: string, folded?: Set<string>) =>
  renderTree(parse(md).root, { measurer: approximateMeasurer, folded, wrapWidth: 240 });

const overlaps = (a: { y: number; height: number }, b: { y: number; height: number }) =>
  a.y < b.y + b.height && b.y < a.y + a.height;

describe('layoutTree', () => {
  const { layout } = render(sample);

  it('places children to the right of their parent', () => {
    for (const item of layout.nodes) {
      for (const child of item.children) {
        expect(child.rect.x).toBeGreaterThanOrEqual(item.rect.x + item.rect.width + 80);
      }
    }
  });

  it('keeps nodes in the same column from overlapping', () => {
    const columns = Map.groupBy(layout.nodes, (item) => item.rect.x);
    for (const column of columns.values()) {
      const sorted = column.toSorted((a, b) => a.rect.y - b.rect.y);
      for (let i = 1; i < sorted.length; i += 1) {
        expect(overlaps(sorted[i - 1].rect, sorted[i].rect)).toBe(false);
      }
    }
  });

  it('links every visible child to its parent and grows to the right', () => {
    for (const item of layout.nodes.slice(1)) {
      expect(item.parent?.children).toContain(item);
      expect(item.rect.x).toBeGreaterThan(item.parent!.rect.x + item.parent!.rect.width);
    }
    expect(layout.nodes.every((item) => item.direction === 'right')).toBe(true);
  });

  it('hides the children of folded nodes', () => {
    const root = parse(sample).root;
    const section = root.children[1];
    const folded = renderTree(root, {
      measurer: approximateMeasurer,
      folded: new Set([section.id]),
    });
    const item = folded.layout.byId.get(section.id)!;
    expect(item.folded).toBe(true);
    expect(item.children).toEqual([]);
    expect(folded.layout.byId.has(section.children[0].id)).toBe(false);
  });

  it('requires a size for every visible node', () => {
    const root: MarkmapNode = {
      id: 'root',
      type: 'root',
      content: [],
      notes: [],
      data: {},
      children: [],
    };
    expect(() => layoutTree(root, { sizes: new Map() })).toThrow(/Missing size/);
  });
});

describe('renderTree', () => {
  it('draws edges under nodes with stable keys', () => {
    const { primitives, layout } = render(sample);
    const keys = primitives.map((p) => (p.kind === 'group' ? p.key : undefined));
    const edgeCount = layout.nodes.length - 1;
    expect(keys.filter((k) => k?.startsWith('edge:'))).toHaveLength(edgeCount);
    expect(keys.slice(edgeCount).every((k) => k?.startsWith('node:'))).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('draws fold circles only on nodes with children', () => {
    const { primitives } = render('- a\n  - b');
    const circles = (id: string) =>
      primitives
        .filter((p) => p.kind === 'group' && p.key === `node:${id}`)
        .flatMap((p) => (p as Extract<Primitive, { kind: 'group' }>).children)
        .filter((p) => p.kind === 'rect');
    const root = parse('- a\n  - b').root;
    expect(circles(root.children[0].id)).toHaveLength(1);
    expect(circles(root.children[0].children[0].id)).toHaveLength(0);
  });

  it('includes strokes and fold circles in the bounds', () => {
    const { bounds, layout } = render(sample);
    expect(bounds.x).toBeLessThanOrEqual(layout.bounds.x);
    expect(bounds.x + bounds.width).toBeGreaterThan(layout.bounds.x + layout.bounds.width);
  });

  it('measures path control points for bounds', () => {
    const bounds = primitiveBounds([
      {
        kind: 'group',
        transform: [1, 0, 0, 1, 10, 20],
        children: [{ kind: 'path', d: 'M0,0H5V7C1,2,3,4,9,-3', stroke: 'red', strokeWidth: 2 }],
      },
    ]);
    expect(bounds).toEqual({ x: 9, y: 16, width: 11, height: 12 });
  });
});

describe('toSVGString', () => {
  it('renders the sample', async () => {
    const svg = toSVGString(render(sample));
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(svg).toContain('--mm-branch-0:#1f77b4;');
    expect(svg).not.toContain('NaN');
    await expect(svg).toMatchFileSnapshot('../test/snapshots/sample.svg');
  });

  it('escapes text and attributes', () => {
    const svg = toSVGString(render('- 1 < 2 & "a" \'b\' [x](https://a.b/?q=1&r=2)'));
    expect(svg).toContain('1 &lt; 2 &amp; &quot;a&quot; &#39;b&#39;');
    expect(svg).toContain('href="https://a.b/?q=1&amp;r=2"');
  });

  it('emits hit areas only when interactive', () => {
    const hit: Primitive = { kind: 'hit', action: 'x', rect: { x: 1, y: 2, width: 3, height: 4 } };
    expect(primitivesToSVG([hit])).toBe('');
    expect(primitivesToSVG([hit], { interactive: true })).toBe(
      '<rect x="1" y="2" width="3" height="4" data-action="x" style="fill:transparent;cursor:pointer"/>',
    );
  });

  it('finds bounds through scaled and flipped groups', () => {
    const path: Primitive = { kind: 'path', d: 'M0,0H1000V500', fill: 'red' };
    const group: Primitive = {
      kind: 'group',
      transform: [0.01, 0, 0, -0.01, 5, 20],
      children: [path],
    };
    const bounds = primitiveBounds([group]);
    expect(bounds.x).toBeCloseTo(5);
    expect(bounds.y).toBeCloseTo(15);
    expect(bounds.width).toBeCloseTo(10);
    expect(bounds.height).toBeCloseTo(5);
  });

  it('stops bounds at a clip', () => {
    const path: Primitive = { kind: 'path', d: 'M-500,0H500', fill: 'red' };
    const clip = { x: 0, y: 0, width: 10, height: 5 };
    expect(primitiveBounds([{ kind: 'group', clip, children: [path] }])).toEqual(clip);
  });

  it('clips groups with a nested svg', () => {
    const group: Primitive = {
      kind: 'group',
      clip: { x: 1, y: 2, width: 3, height: 4 },
      children: [{ kind: 'path', d: 'M0,0', stroke: 'red' }],
    };
    expect(primitivesToSVG([group])).toBe(
      '<g><svg x="1" y="2" width="3" height="4" viewBox="1 2 3 4"><path d="M0,0" style="fill:none;stroke:red"/></svg></g>',
    );
  });

  it('skips primitives for other backends and overlays', () => {
    const result = render('- a');
    result.primitives.push(
      { kind: 'rect', x: 0, y: 0, w: 1, h: 1, backends: ['canvas'] },
      {
        kind: 'overlay',
        rect: { x: 0, y: 0, width: 1, height: 1 },
        html: () => ({}) as HTMLElement,
      },
      { kind: 'custom', svg: () => '<circle id="custom"/>' },
    );
    const svg = toSVGString(result);
    expect(svg).toContain('<circle id="custom"/>');
    expect(svg).not.toContain('width="1"');
  });
});

describe('custom layouts', () => {
  it('uses the layout and its node directions for edges and fold toggles', () => {
    const root = parse('# R\n\n- a\n  - a1').root;
    // The tree layout, mirrored: everything grows to the left.
    const mirrored: Layout = {
      name: 'mirrored',
      layout(tree, options) {
        const result = layoutTree(tree, options);
        for (const item of result.nodes) {
          item.rect = { ...item.rect, x: -item.rect.x - item.rect.width };
          item.direction = 'left';
        }
        return { ...result, bounds: unionRects(result.nodes.map((n) => n.rect)) };
      },
    };
    const { layout, primitives } = renderTree(root, {
      measurer: approximateMeasurer,
      layout: mirrored,
    });
    const [r, a] = layout.nodes;
    expect(a.rect.x + a.rect.width).toBeLessThan(r.rect.x);
    const edge = primitives.find((p) => p.kind === 'group' && p.key === `edge:${a.node.id}`);
    const d = edge?.kind === 'group' && edge.children[0].kind === 'path' ? edge.children[0].d : '';
    // From the root's left end to the child's right end.
    expect(d.startsWith(`M${r.rect.x},`)).toBe(true);
    expect(d).toContain(`,${a.rect.x + a.rect.width},`);
  });
});
