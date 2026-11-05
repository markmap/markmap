import { parse } from '@markmap/parse';
import { describe, expect, it } from 'vitest';
import { approximateMeasurer } from '../measure';
import { renderTree } from '../render';
import { classicTheme } from '../themes/classic';
import { orgChartLayout } from './org-chart';

const md = '# R\n\n- a\n  - a1\n  - a2\n- b\n- c';
const render = (folded: string[] = []) =>
  renderTree(parse(md).root, {
    measurer: approximateMeasurer,
    layout: orgChartLayout,
    folded: new Set(folded),
  });

const middle = (r: { x: number; width: number }) => r.x + r.width / 2;

describe('orgChartLayout', () => {
  it('grows downwards with each level below its parent', () => {
    const { layout } = render();
    for (const item of layout.nodes.slice(1)) {
      expect(item.direction).toBe('bottom');
      // spacingHorizontal (80) is the gap between levels.
      const parent = item.parent!.rect;
      expect(item.rect.y).toBeCloseTo(parent.y + parent.height + 80);
    }
  });

  it('centers parents over their children and keeps siblings apart', () => {
    const { layout } = render();
    const [root, a] = layout.nodes;
    // Roughly: flextree centers on the children's extent, not their midpoints.
    const span = (middle(root.children[0].rect) + middle(root.children.at(-1)!.rect)) / 2;
    expect(Math.abs(middle(root.rect) - span)).toBeLessThan(1);
    const [a1, a2] = a.children;
    // Siblings: spacingVertical (5) × 3.
    expect(a2.rect.x - (a1.rect.x + a1.rect.width)).toBeCloseTo(15);
  });

  it('draws vertical edges from the bottom middle to the top middle', () => {
    const result = render();
    const [root, a] = result.layout.nodes;
    const edge = result.primitives.find((p) => p.kind === 'group' && p.key === `edge:${a.node.id}`);
    const d = edge?.kind === 'group' && edge.children[0].kind === 'path' ? edge.children[0].d : '';
    const from = classicTheme.node.anchor(root.rect, 'bottom', result.contexts.get(root.node.id)!);
    expect(d.startsWith(`M${from.x},${from.y}C${from.x},`)).toBe(true);
    expect(d.endsWith(`${a.rect.x + a.rect.width / 2},${a.rect.y - 4}`)).toBe(true);
  });

  it('puts the fold circle in the middle of the underline', () => {
    const result = render();
    const [root] = result.layout.nodes;
    const group = result.primitives.find((p) => p.kind === 'group' && p.key === 'node:root');
    const circle =
      group?.kind === 'group' ? group.children.find((p) => p.kind === 'rect') : undefined;
    expect(circle?.kind === 'rect' && circle.x + circle.w / 2).toBeCloseTo(root.rect.width / 2);
  });
});
