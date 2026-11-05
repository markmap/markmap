import type { Rect, Size } from './geometry';
import type { FontStyle, Paint, Primitive } from './primitives';
import type { Measurer, Theme } from './theme';
import type { Inline, MarkmapNode } from './types';

/** Font and color of a piece of text. */
export interface TextStyle {
  font: FontStyle;
  fill: Paint;
}

/** Drawing around a styled span. Spans may wrap across lines; each line gets its own piece. */
export interface Decoration {
  /** Background behind the span. */
  background?: Paint;
  /** Corner radius of the background. */
  radius?: number;
  /** Horizontal space added inside both ends of the span, in px. */
  padding?: number;
  /** Line through the middle of the text. */
  strike?: Paint;
  /** Makes the span a link. Unsafe URLs must be dropped before this point. */
  href?: string;
}

export interface StyleResult {
  font?: Partial<FontStyle>;
  fill?: Paint;
  decoration?: Decoration;
}

export interface InlineContext {
  theme: Theme;
  measurer: Measurer;
  node: MarkmapNode;
  /** Label wrap width in px; `0` or missing when labels do not wrap. */
  maxWidth?: number;
  /**
   * Report work that will change a measurement, such as an image loading to learn its
   * size. The caller renders again once it settles; plugins should cache the result so
   * the next measurement is final.
   */
  defer?(task: Promise<unknown>): void;
}

export interface AtomSize extends Size {
  /** Distance from the top of the atom to the text baseline it sits on. */
  baseline: number;
}

/** Draws an inline node as an unbreakable box, e.g. a checkbox, formula or icon. */
export interface AtomRenderer<T extends Inline = Inline> {
  measure(inline: T, style: TextStyle, ctx: InlineContext): AtomSize;
  /** Primitives in text coordinates. `box` is where the atom was placed. */
  render(inline: T, box: Rect, style: TextStyle, ctx: InlineContext): Primitive[];
}

export type InlineStyler<T extends Inline = Inline> = (
  inline: T,
  style: TextStyle,
  ctx: InlineContext,
) => StyleResult;

export interface ContentPlugin {
  name: string;
  /** Rewrite a node's inline content before layout, e.g. to add a checkbox. */
  transform?(content: Inline[], node: MarkmapNode): Inline[];
  /** Style the text inside inline nodes, keyed by inline type. */
  styles?: { [K in Inline['type']]?: InlineStyler<Extract<Inline, { type: K }>> };
  /** Draw inline nodes as boxes, keyed by inline type. */
  atoms?: { [K in Inline['type']]?: AtomRenderer<Extract<Inline, { type: K }>> };
}
