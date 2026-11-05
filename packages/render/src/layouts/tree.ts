import {
  type Layout,
  type LayoutNode,
  type LayoutOptions,
  type LayoutResult,
  type MarkmapNode,
  unionRects,
} from '@markmap/core';
import { flextree, type FlextreeNode } from 'd3-flextree';

/** Return the subtree that is visible when the `folded` nodes are collapsed. */
export function visibleNodes(root: MarkmapNode, folded?: ReadonlySet<string>): MarkmapNode[] {
  const result: MarkmapNode[] = [];
  const visit = (node: MarkmapNode) => {
    result.push(node);
    if (!folded?.has(node.id)) node.children.forEach(visit);
  };
  visit(root);
  return result;
}

/** Tidy tree layout, root on the left, growing to the right. */
export function layoutTree(root: MarkmapNode, options: LayoutOptions): LayoutResult {
  const { sizes, folded, spacingHorizontal = 80, spacingVertical = 5 } = options;
  const sizeOf = (node: MarkmapNode) => {
    const size = sizes.get(node.id);
    if (!size) throw new Error(`Missing size for node ${node.id}`);
    return size;
  };

  const layout = flextree<MarkmapNode>({
    children: (node) => (folded?.has(node.id) ? undefined : node.children),
    // flextree grows downwards, so breadth and depth are swapped for a horizontal tree.
    nodeSize: (h) => {
      const { width, height } = sizeOf(h.data);
      return [height, width + spacingHorizontal];
    },
    spacing: (a, b) => (a.parent === b.parent ? spacingVertical : spacingVertical * 2),
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
      rect: { x: h.y, y: h.x - height / 2, width, height },
      direction: 'right',
    };
    nodes.push(item);
    byId.set(item.node.id, item);
    for (const child of h.children ?? []) item.children.push(convert(child, item));
    return item;
  };
  convert(tree);

  return { nodes, byId, bounds: unionRects(nodes.map((n) => n.rect)) };
}

/** The classic markmap layout: a tidy tree growing to the right. */
export const treeLayout: Layout = { name: 'tree', layout: layoutTree };
