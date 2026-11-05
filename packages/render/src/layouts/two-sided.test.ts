import { parse } from '@markmap/parse';
import { describe, expect, it } from 'vitest';
import { approximateMeasurer } from '../measure';
import { renderTree } from '../render';
import { classicTheme } from '../themes/classic';
import { splitBranches, twoSidedLayout } from './two-sided';

const md = '# R\n\n- a\n  - a1\n  - a2\n- b\n- c\n  - c1\n- d';
const render = (source = md, folded: string[] = []) =>
  renderTree(parse(source).root, {
    measurer: approximateMeasurer,
    layout: twoSidedLayout,
    folded: new Set(folded),
  });
const label = (id: string, result: ReturnType<typeof render>) =>
  result.layout.byId
    .get(id)!
    .node.content.map((c) => ('value' in c ? c.value : ''))
    .join('');

const branch = (leaves: number) =>
  parse(`# R\n\n- x\n${'  - y\n'.repeat(leaves)}`).root.children[0];

describe('splitBranches', () => {
  it('balances leaf counts and favors the right on a tie', () => {
    expect(splitBranches([branch(1), branch(1)])).toBe(1);
    expect(splitBranches([branch(1), branch(1), branch(1)])).toBe(2);
    expect(splitBranches([branch(5), branch(1), branch(1), branch(1)])).toBe(1);
    expect(splitBranches([branch(1), branch(1), branch(1), branch(5)])).toBe(3);
  });
});

describe('twoSidedLayout', () => {
  it('puts the first branches on the right and the rest on the left', () => {
    const result = render();
    const [root, ...rest] = result.layout.nodes;
    const right = rest.filter((n) => n.direction === 'right').map((n) => label(n.node.id, result));
    const left = rest.filter((n) => n.direction === 'left').map((n) => label(n.node.id, result));
    // Leaves: a has 2, b 1, c 1, d 1 → a + b on the right (3), c + d on the left (2).
    expect(right).toEqual(['a', 'a1', 'a2', 'b']);
    expect(left).toEqual(['c', 'c1', 'd']);
    const rootRight = root.rect.x + root.rect.width;
    const onItsSide = rest.map((item) =>
      item.direction === 'right'
        ? item.rect.x > rootRight
        : item.rect.x + item.rect.width < root.rect.x,
    );
    expect(onItsSide.every(Boolean)).toBe(true);
  });

  it('keeps document pre-order and parent links', () => {
    const { layout } = render();
    const labels = layout.nodes.map((n) => n.node.id);
    const expected: string[] = [];
    const walk = (node: (typeof layout.nodes)[number]['node']) => {
      expected.push(node.id);
      node.children.forEach(walk);
    };
    walk(layout.nodes[0].node);
    expect(labels).toEqual(expected);
    for (const item of layout.nodes.slice(1)) expect(item.parent!.children).toContain(item);
  });

  it('mirrors spacing: left children sit as far from the root as right ones', () => {
    const { layout } = render();
    const [root] = layout.nodes;
    const gapRight = root.children[0].rect.x - (root.rect.x + root.rect.width);
    const leftChild = root.children.find((n) => n.direction === 'left')!;
    const gapLeft = root.rect.x - (leftChild.rect.x + leftChild.rect.width);
    expect(gapLeft).toBeCloseTo(gapRight);
  });

  it('does not move branches to the other side when folding', () => {
    const before = render();
    const c = before.layout.nodes.find((n) => label(n.node.id, before) === 'a')!;
    const after = render(md, [c.node.id]);
    for (const item of after.layout.nodes) {
      expect(item.direction).toBe(before.layout.byId.get(item.node.id)!.direction);
    }
  });

  it('draws edges and fold circles on the outer side', () => {
    const result = render();
    const [root] = result.layout.nodes;
    const left = root.children.find((n) => n.children.length && n.direction === 'left')!;
    const ctx = result.contexts.get(left.node.id)!;
    expect(ctx.direction).toBe('left');
    const group = result.primitives.find(
      (p) => p.kind === 'group' && p.key === `node:${left.node.id}`,
    );
    const circle =
      group?.kind === 'group' ? group.children.find((p) => p.kind === 'rect') : undefined;
    expect(circle?.kind === 'rect' && circle.x).toBe(-6);
    // The edge into the left node ends at its right end.
    const edge = result.primitives.find(
      (p) => p.kind === 'group' && p.key === `edge:${left.node.id}`,
    );
    const d = edge?.kind === 'group' && edge.children[0].kind === 'path' ? edge.children[0].d : '';
    const end = classicTheme.node.anchor(left.rect, 'right', ctx);
    expect(d.endsWith(`${end.x},${end.y}`)).toBe(true);
  });

  it('falls back to one side for a single branch or a folded root', () => {
    expect(render('# R\n\n- a\n  - a1').layout.nodes.every((n) => n.direction === 'right')).toBe(
      true,
    );
    expect(render(md, ['root']).layout.nodes).toHaveLength(1);
  });
});
