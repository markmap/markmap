import { parse } from '@markmap/parse';
import { describe, expect, it } from 'vitest';
import { easeCubicInOut, interpolateStates } from './animate';
import { approximateMeasurer } from './measure';
import { renderTree } from './render';
import { classicTheme } from './themes/classic';

const root = parse('# R\n\n- a\n  - a1\n  - a2\n- b').root;
const [a] = root.children;
const render = (folded: string[] = []) =>
  renderTree(root, { measurer: approximateMeasurer, folded: new Set(folded) });
const byId = (state: ReturnType<typeof render>['state']) =>
  new Map(state.nodes.map((item) => [item.node.id, item]));

describe('interpolateStates', () => {
  const open = render().state;
  const closed = render([a.id]).state;

  it('returns the end states at 0 and 1, apart from leaving nodes', () => {
    // Contexts switch at once (a fold circle fills straight away); geometry animates.
    const geometry = (nodes: typeof open.nodes) =>
      nodes.map(({ rect, opacity }) => ({ rect, opacity }));
    const start = interpolateStates(open, closed, 0, classicTheme);
    expect(geometry(start.nodes).toSorted((x, y) => x.rect.y - y.rect.y)).toEqual(
      geometry(open.nodes).toSorted((x, y) => x.rect.y - y.rect.y),
    );
    const end = interpolateStates(open, closed, 1, classicTheme);
    expect(end.nodes.slice(0, closed.nodes.length)).toEqual(closed.nodes);
    expect(end.nodes.slice(closed.nodes.length).map((n) => n.opacity)).toEqual([0, 0]);
  });

  it('shrinks leaving nodes into the anchor of their folded ancestor', () => {
    const end = byId(interpolateStates(open, closed, 1, classicTheme));
    const parent = byId(closed).get(a.id)!;
    const anchor = classicTheme.node.anchor(parent.rect, 'source', parent.ctx);
    const child = end.get(a.children[0].id)!;
    expect(child.rect.x).toBeCloseTo(anchor.x);
    expect(child.rect.y + child.rect.height).toBeCloseTo(anchor.y);
  });

  it('grows entering nodes out of the anchor and fades them in', () => {
    const half = byId(interpolateStates(closed, open, 0.5, classicTheme));
    const child = half.get(a.children[0].id)!;
    expect(child.opacity).toBe(0.5);
    const start = classicTheme.node.anchor(byId(closed).get(a.id)!.rect, 'source', child.ctx);
    const target = byId(open).get(a.children[0].id)!.rect;
    expect(child.rect.x).toBeCloseTo((start.x + target.x) / 2);
  });

  it('restarts from a frame of an earlier animation', () => {
    const frame = interpolateStates(open, closed, 0.5, classicTheme);
    const back = byId(interpolateStates(frame, open, 0.5, classicTheme));
    expect(back.get(a.children[0].id)!.opacity).toBeCloseTo(0.75);
  });
});

describe('easeCubicInOut', () => {
  it('is symmetric and pinned at the ends', () => {
    expect([0, 0.5, 1].map(easeCubicInOut)).toEqual([0, 0.5, 1]);
    expect(easeCubicInOut(0.25) + easeCubicInOut(0.75)).toBeCloseTo(1);
  });
});
