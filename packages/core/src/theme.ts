import type { Anchor, Rect, Size } from './geometry';
import type { FontStyle, Paint, Primitive } from './primitives';
import type { MarkmapNode } from './types';

/** Measures the advance width of a single-font string, in px. */
export interface Measurer {
  measure(text: string, font: FontStyle): number;
}

export interface NodeContext {
  depth: number;
  /** Stable per-node number for picking a branch color. */
  branch: number;
  hasChildren: boolean;
  folded: boolean;
}

export interface EdgeContext {
  source: MarkmapNode;
  target: MarkmapNode;
  /** Context of the target node. */
  node: NodeContext;
}

export interface Theme {
  name: string;
  /** Emitted as CSS variables, e.g. `{ 'mm-color': '#333' }` → `--mm-color: #333`. */
  tokens: Record<string, string>;
  font: FontStyle;
  textFill: Paint;
  node: {
    /** `[top, right, bottom, left]` around the content. */
    padding: [number, number, number, number];
    minHeight?: number;
    /** Box size from content size. Defaults to content plus padding, at least `minHeight` tall. */
    measure?(content: Size, node: MarkmapNode, ctx: NodeContext): Size;
    /** Chrome in node-local coordinates (the box starts at 0, 0). */
    render(node: MarkmapNode, box: Size, ctx: NodeContext): Primitive[];
    /** Where edges leave (`source`) or enter (`target`) the node, in layout coordinates. */
    anchor(rect: Rect, role: 'source' | 'target', ctx: NodeContext): Anchor;
  };
  edge: {
    render(from: Anchor, to: Anchor, ctx: EdgeContext): Primitive[];
  };
}
