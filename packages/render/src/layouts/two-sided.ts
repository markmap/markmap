import {
  type Layout,
  type LayoutNode,
  type LayoutOptions,
  type LayoutResult,
  type MarkmapNode,
  type Rect,
  type Side,
  unionRects,
} from '@markmap/core';
import { layoutTree } from './tree';

/** Leaves under a node, ignoring folds, so folding never moves a branch to the other side. */
function leafCount(node: MarkmapNode): number {
  return node.children.length ? node.children.reduce((sum, c) => sum + leafCount(c), 0) : 1;
}

/**
 * How many of the root's first children go on the right; the rest go on the left. Splits
 * the list where the two sides' leaf counts are closest, keeping document order on both
 * sides and favoring the right on a tie.
 */
export function splitBranches(children: readonly MarkmapNode[]): number {
  const weights = children.map(leafCount);
  const total = weights.reduce((a, b) => a + b, 0);
  let best = children.length;
  let bestDiff = Infinity;
  let right = 0;
  for (let k = 1; k <= children.length; k++) {
    right += weights[k - 1];
    const diff = Math.abs(right - (total - right));
    // `<=`: on a tie, the later split, so the right side gets the extra branch.
    if (diff <= bestDiff) {
      best = k;
      bestDiff = diff;
    }
  }
  return best;
}

/**
 * A mind map: the root in the middle, its first branches growing to the right and the
 * rest to the left, balanced by size. Both sides keep document order top to bottom.
 */
export function layoutTwoSided(root: MarkmapNode, options: LayoutOptions): LayoutResult {
  if (options.folded?.has(root.id) || root.children.length < 2) return layoutTree(root, options);

  const split = splitBranches(root.children);
  const side = (children: MarkmapNode[]) => layoutTree({ ...root, children }, options);
  const right = side(root.children.slice(0, split));
  const left = side(root.children.slice(split));

  // Mirror the left side around the root, so its children's right edges sit where the
  // right side's children start, measured from the root's left edge instead.
  const rootRect = right.nodes[0].rect;
  const place = new Map<string, { rect: Rect; direction: Side }>();
  for (const item of right.nodes) place.set(item.node.id, { rect: item.rect, direction: 'right' });
  for (const item of left.nodes.slice(1)) {
    const { rect } = item;
    const x = rootRect.x * 2 + rootRect.width - rect.x - rect.width;
    place.set(item.node.id, { rect: { ...rect, x }, direction: 'left' });
  }

  // Rebuild in document pre-order with real parent links.
  const nodes: LayoutNode[] = [];
  const byId = new Map<string, LayoutNode>();
  const visit = (node: MarkmapNode, depth: number, parent?: LayoutNode): LayoutNode => {
    const { rect, direction } = place.get(node.id)!;
    const folded = !!options.folded?.has(node.id) && node.children.length > 0;
    const item: LayoutNode = { node, parent, children: [], depth, folded, rect, direction };
    nodes.push(item);
    byId.set(node.id, item);
    if (!folded)
      for (const child of node.children) item.children.push(visit(child, depth + 1, item));
    return item;
  };
  visit(root, 0);

  return { nodes, byId, bounds: unionRects(nodes.map((n) => n.rect)) };
}

/** Root in the middle, branches on both sides. */
export const twoSidedLayout: Layout = { name: 'two-sided', layout: layoutTwoSided };
