import type { Anchor, Matrix, Rect, Side, Size } from './geometry';
import type { OptionSchema } from './options';
import type { FontStyle, Paint, Primitive } from './primitives';
import type { MarkmapNode } from './types';

/** Measures the advance width of a single-font string, in px. */
export interface Measurer {
  measure(text: string, font: FontStyle): number;
}

export interface NodeContext {
  depth: number;
  /** Ids from the root to this node, both included. Ids are stable, so themes can hash them for colors. */
  path: readonly string[];
  hasChildren: boolean;
  folded: boolean;
  /** The way the node grows away from its parent, from the layout. */
  direction: Side;
}

/** What is known about a node before layout: everything but its direction. */
export type MeasureContext = Omit<NodeContext, 'direction'>;

export interface EdgeContext {
  source: MarkmapNode;
  target: MarkmapNode;
  /** Context of the target node. */
  node: NodeContext;
}

/** How a node looks part way into or out of the drawing. */
export interface PresenceStyle {
  opacity?: number;
  /** Applied in node-local coordinates (the box starts at 0, 0), before the node's position. */
  transform?: Matrix;
}

export type TextAlign = 'start' | 'center' | 'end';

export interface Theme {
  name: string;
  /** Theme-specific Markdown options, such as colors. Validated before `configure` sees them. */
  options?: OptionSchema;
  /** A copy of the theme with validated `options` applied. */
  configure?(options: Record<string, unknown>): Theme;
  /** Emitted as CSS variables, e.g. `{ 'mm-color': '#333' }` → `--mm-color: #333`. */
  tokens: Record<string, string>;
  /** Tokens that change in dark mode; the rest of `tokens` still applies. */
  darkTokens?: Record<string, string>;
  font: FontStyle;
  /** Font family for inline code. */
  codeFontFamily: string;
  textFill: Paint;
  node: {
    /** `[top, right, bottom, left]` around the content. */
    padding: [number, number, number, number];
    minHeight?: number;
    /** Box size from content size. Defaults to content plus padding, at least `minHeight` tall. */
    measure?(content: Size, node: MarkmapNode, ctx: MeasureContext): Size;
    /** Alignment of wrapped label lines. Defaults to `start`. */
    textAlign?(ctx: NodeContext): TextAlign;
    /**
     * How a node looks while `presence` goes from 0 (absent) to 1 (shown), as it enters
     * or leaves. Its edge gets the same opacity. Defaults to fading.
     */
    presence?(presence: number, box: Size, ctx: NodeContext): PresenceStyle;
    /** Chrome in node-local coordinates (the box starts at 0, 0). */
    render(node: MarkmapNode, box: Size, ctx: NodeContext): Primitive[];
    /**
     * Where edges meet the node on one side, in layout coordinates. Edges to children
     * leave on `ctx.direction` and the edge from the parent enters on the opposite side.
     */
    anchor(rect: Rect, side: Side, ctx: NodeContext): Anchor;
  };
  edge: {
    render(from: Anchor, to: Anchor, ctx: EdgeContext): Primitive[];
  };
}
