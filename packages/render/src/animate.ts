import type { Rect, Theme } from '@markmap/core';
import type { DrawNode, DrawState } from './render';

export type Easing = (t: number) => number;

export const easeCubicInOut: Easing = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  width: lerp(a.width, b.width, t),
  height: lerp(a.height, b.height, t),
});

/** A zero-progress rect for a node growing out of (or shrinking into) `ancestor`. */
function collapsedInto(ancestor: DrawNode, size: Rect, theme: Theme): Rect {
  const anchor = theme.node.anchor(ancestor.rect, 'source', ancestor.ctx);
  return { x: anchor.x, y: anchor.y - size.height, width: size.width, height: size.height };
}

/** The closest ancestor of `item` (by its id path) that exists in `byId`. */
function nearestAncestor(item: DrawNode, byId: Map<string, DrawNode>): DrawNode | undefined {
  const { path } = item.ctx;
  for (let i = path.length - 2; i >= 0; i--) {
    const found = byId.get(path[i]);
    if (found) return found;
  }
  return undefined;
}

/**
 * The frame `t` (already eased, 0 to 1) of the way from one state to another.
 *
 * - Nodes in both move and resize between their rects.
 * - Entering nodes grow out of their nearest ancestor's old fold anchor and fade in.
 * - Leaving nodes shrink into their nearest surviving ancestor's new anchor and fade out.
 *
 * `from` can itself be a frame of an earlier animation, so animations can be restarted
 * from wherever they are.
 */
export function interpolateStates(
  from: DrawState,
  to: DrawState,
  t: number,
  theme: Theme,
): DrawState {
  const fromById = new Map(from.nodes.map((item) => [item.node.id, item]));
  const toById = new Map(to.nodes.map((item) => [item.node.id, item]));
  const nodes: DrawNode[] = to.nodes.map((item) => {
    const old = fromById.get(item.node.id);
    if (old) {
      return {
        ...item,
        rect: lerpRect(old.rect, item.rect, t),
        opacity: lerp(old.opacity, item.opacity, t),
      };
    }
    const ancestor = nearestAncestor(item, fromById);
    const start = ancestor ? collapsedInto(ancestor, item.rect, theme) : item.rect;
    return { ...item, rect: lerpRect(start, item.rect, t), opacity: item.opacity * t };
  });
  for (const item of from.nodes) {
    if (toById.has(item.node.id)) continue;
    const ancestor = nearestAncestor(item, toById);
    const end = ancestor ? collapsedInto(ancestor, item.rect, theme) : item.rect;
    nodes.push({ ...item, rect: lerpRect(item.rect, end, t), opacity: item.opacity * (1 - t) });
  }
  return { nodes };
}
