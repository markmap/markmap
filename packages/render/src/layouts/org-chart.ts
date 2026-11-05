import {
  type Layout,
  type LayoutNode,
  type LayoutOptions,
  type LayoutResult,
  type MarkmapNode,
  unionRects,
} from '@markmap/core';
import { flextree, type FlextreeNode } from 'd3-flextree';

/**
 * Siblings sit side by side here, and labels need more room across than above each
 * other, so the sibling gap is this many times `spacingVertical`.
 */
const SIBLING_GAP_FACTOR = 3;

/**
 * Top-down tidy tree: the root at the top, children in a row below their parent.
 * `spacingHorizontal` is the gap between levels; siblings are `spacingVertical × 3`
 * apart, doubled between cousins.
 */
export function layoutOrgChart(root: MarkmapNode, options: LayoutOptions): LayoutResult {
  const { sizes, folded, spacingHorizontal = 80, spacingVertical = 5 } = options;
  const siblingGap = spacingVertical * SIBLING_GAP_FACTOR;
  const sizeOf = (node: MarkmapNode) => {
    const size = sizes.get(node.id);
    if (!size) throw new Error(`Missing size for node ${node.id}`);
    return size;
  };

  const layout = flextree<MarkmapNode>({
    children: (node) => (folded?.has(node.id) ? undefined : node.children),
    nodeSize: (h) => {
      const { width, height } = sizeOf(h.data);
      return [width, height + spacingHorizontal];
    },
    spacing: (a, b) => (a.parent === b.parent ? siblingGap : siblingGap * 2),
  });
  const tree = layout.hierarchy(root);
  layout(tree);

  const nodes: LayoutNode[] = [];
  const byId = new Map<string, LayoutNode>();
  const convert = (h: FlextreeNode<MarkmapNode>, parent?: LayoutNode): LayoutNode => {
    const { width, height } = sizeOf(h.data);
    const item: LayoutNode = {
      node: h.data,
      parent,
      children: [],
      depth: h.depth,
      folded: !!folded?.has(h.data.id) && h.data.children.length > 0,
      rect: { x: h.x - width / 2, y: h.y, width, height },
      direction: 'bottom',
    };
    nodes.push(item);
    byId.set(item.node.id, item);
    for (const child of h.children ?? []) item.children.push(convert(child, item));
    return item;
  };
  convert(tree);

  return { nodes, byId, bounds: unionRects(nodes.map((n) => n.rect)) };
}

/** Org chart: root at the top, growing downwards. */
export const orgChartLayout: Layout = { name: 'org-chart', layout: layoutOrgChart };
