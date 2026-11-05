import type { Point, Rect, Side, Size } from './geometry';
import type { NodeContext } from './theme';
import type { MarkmapNode } from './types';

export interface LayoutNode {
  node: MarkmapNode;
  parent?: LayoutNode;
  /** Visible children: empty when the node is folded. */
  children: LayoutNode[];
  depth: number;
  folded: boolean;
  rect: Rect;
  /**
   * The way this node grows away from its parent, and its children away from it. Edges
   * leave the parent on this side and enter the node on the opposite one. For the root,
   * the side of its fold toggle.
   */
  direction: Side;
}

export interface LayoutResult {
  /** Visible nodes in pre-order. */
  nodes: LayoutNode[];
  byId: Map<string, LayoutNode>;
  /** Union of all node rects. */
  bounds: Rect;
}

export interface LayoutOptions {
  /** Box size of each visible node. */
  sizes: ReadonlyMap<string, Size>;
  folded?: ReadonlySet<string>;
  /** Gap between a node and its children. */
  spacingHorizontal?: number;
  /** Gap between siblings; doubled between cousins. */
  spacingVertical?: number;
}

/** A node in one animation frame: where it is and how present it is. */
export interface FrameNode {
  node: MarkmapNode;
  ctx: NodeContext;
  rect: Rect;
  /** `1` when fully shown, `0` when gone. Themes decide how it looks; the default is a fade. */
  presence: number;
}

/** One frame. Extra fields on the nodes are kept by interpolation. */
export interface LayoutFrame<N extends FrameNode = FrameNode> {
  nodes: N[];
}

export interface InterpolateContext<N extends FrameNode = FrameNode> {
  /** A point on one side of a frame node, as the theme draws it. */
  anchor(item: N, side: Side): Point;
}

/** Places nodes, and optionally decides how they move between two placements. */
export interface Layout {
  name: string;
  layout(root: MarkmapNode, options: LayoutOptions): LayoutResult;
  /**
   * The frame `t` (already eased, 0 to 1) of the way from `from` to `to`. `from` may be
   * a frame of an earlier animation. Nodes only in `to` are entering, nodes only in
   * `from` are leaving; return entering nodes in `to` order, then leaving ones. Defaults
   * to straight-line moves, with entering and leaving nodes growing out of and shrinking
   * into their nearest ancestor's anchor.
   */
  interpolate?<N extends FrameNode>(
    from: LayoutFrame<N>,
    to: LayoutFrame<N>,
    t: number,
    ctx: InterpolateContext<N>,
  ): LayoutFrame<N>;
}
