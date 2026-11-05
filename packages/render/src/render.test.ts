import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MarkmapNode, Primitive } from '@markmap/core';
import { parse } from '@markmap/parse';
import { describe, expect, it } from 'vitest';
import { approximateMeasurer, layoutTree, primitiveBounds, renderTree, toSVGString } from '.';

const sample = readFileSync(join(import.meta.dirname, '../test/sample.md'), 'utf8');
const render = (md: string, folded?: Set<string>) =>
  renderTree(parse(md).root, { measurer: approximateMeasurer, folded, maxWidth: 240 });

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

  it('connects every visible child to its parent', () => {
    expect(layout.edges).toHaveLength(layout.nodes.length - 1);
    for (const edge of layout.edges) expect(edge.target.parent).toBe(edge.source);
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
      attachments: [],
      data: {},
      children: [],
    };
    expect(() =>
      layoutTree(root, { sizes: new Map(), anchor: (r) => ({ ...r, side: 'left' }) }),
    ).toThrow(/Missing size/);
  });
});

describe('renderTree', () => {
  it('draws edges under nodes with stable keys', () => {
    const { primitives, layout } = render(sample);
    const keys = primitives.map((p) => (p.kind === 'group' ? p.key : undefined));
    expect(keys.filter((k) => k?.startsWith('edge:'))).toHaveLength(layout.edges.length);
    expect(keys.slice(layout.edges.length).every((k) => k?.startsWith('node:'))).toBe(true);
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
    const svg = toSVGString(render('- <b>&"\'</b> [x](https://a.b/?q=1&r=2)'));
    expect(svg).toContain('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
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
