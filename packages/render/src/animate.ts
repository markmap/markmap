import {
  type FrameNode,
  type InterpolateContext,
  type Layout,
  type LayoutFrame,
  oppositeSide,
  type Rect,
  type Theme,
} from '@markmap/core';
import type { DrawState } from './render';

export type Easing = (t: number) => number;

export const easeCubicInOut: Easing = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  width: lerp(a.width, b.width, t),
  height: lerp(a.height, b.height, t),
});

/** The closest ancestor of `item` (by its id path) that exists in `byId`. */
function nearestAncestor<N extends FrameNode>(item: N, byId: Map<string, N>): N | undefined {
  const { path } = item.ctx;
  for (let i = path.length - 2; i >= 0; i--) {
    const found = byId.get(path[i]);
    if (found) return found;
  }
  return undefined;
}

/**
 * The default {@link Layout.interpolate}: nodes in both frames move in a straight line;
 * entering nodes grow out of their nearest ancestor's anchor (on the side they grow
 * towards) and leaving nodes shrink back into their nearest surviving ancestor's.
 */
export function interpolateFrames<N extends FrameNode>(
  from: LayoutFrame<N>,
  to: LayoutFrame<N>,
  t: number,
  ctx: InterpolateContext<N>,
): LayoutFrame<N> {
  const fromById = new Map(from.nodes.map((item) => [item.node.id, item]));
  const toById = new Map(to.nodes.map((item) => [item.node.id, item]));

  /** A rect of `item`'s size whose incoming anchor sits on `ancestor`'s outgoing one. */
  const collapsedInto = (item: N, ancestor: N): Rect => {
    const side = item.ctx.direction;
    const point = ctx.anchor(ancestor, side);
    const offset = ctx.anchor({ ...item, rect: { ...item.rect, x: 0, y: 0 } }, oppositeSide(side));
    return { ...item.rect, x: point.x - offset.x, y: point.y - offset.y };
  };

  const nodes: N[] = to.nodes.map((item) => {
    const old = fromById.get(item.node.id);
    if (old) {
      return {
        ...item,
        rect: lerpRect(old.rect, item.rect, t),
        presence: lerp(old.presence, item.presence, t),
      };
    }
    const ancestor = nearestAncestor(item, fromById);
    const start = ancestor ? collapsedInto(item, ancestor) : item.rect;
    return { ...item, rect: lerpRect(start, item.rect, t), presence: item.presence * t };
  });
  for (const item of from.nodes) {
    if (toById.has(item.node.id)) continue;
    const ancestor = nearestAncestor(item, toById);
    const end = ancestor ? collapsedInto(item, ancestor) : item.rect;
    nodes.push({
      ...item,
      rect: lerpRect(item.rect, end, t),
      presence: item.presence * (1 - t),
    });
  }
  return { nodes };
}

/** Interpolate draw states with the layout's own interpolation, or the default one. */
export function interpolateStates(
  from: DrawState,
  to: DrawState,
  t: number,
  theme: Theme,
  layout?: Layout,
): DrawState {
  const interpolate = layout?.interpolate ?? interpolateFrames;
  return interpolate(from, to, t, {
    anchor: (item, side) => theme.node.anchor(item.rect, side, item.ctx),
  });
}
