import type { Matrix, Rect } from './geometry';

/** A CSS color, usually `var(--mm-…)` so themes and user CSS apply. */
export type Paint = string;

export type Backend = 'svg' | 'canvas';

export interface FontStyle {
  family: string;
  /** Font size in px. */
  size: number;
  weight: number;
  style: 'normal' | 'italic';
  /** Line height in px. */
  lineHeight: number;
}

/** A piece of text with one font and color. `x`/`y` are the baseline start, relative to the text primitive. */
export interface TextRun {
  text: string;
  x: number;
  y: number;
  font: FontStyle;
  fill?: Paint;
}

interface PrimitiveBase {
  /** Backends that can draw this primitive. Omit for all. */
  backends?: Backend[];
}

export interface GroupPrimitive extends PrimitiveBase {
  kind: 'group';
  /** Identity for patching and animation, unique among all groups. */
  key?: string;
  nodeId?: string;
  transform?: Matrix;
  opacity?: number;
  children: Primitive[];
}

export interface RectPrimitive extends PrimitiveBase {
  kind: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  fill?: Paint;
  stroke?: Paint;
  strokeWidth?: number;
}

export interface PathPrimitive extends PrimitiveBase {
  kind: 'path';
  d: string;
  fill?: Paint;
  stroke?: Paint;
  strokeWidth?: number;
}

/** Pre-wrapped, pre-measured text. */
export interface TextPrimitive extends PrimitiveBase {
  kind: 'text';
  x: number;
  y: number;
  runs: TextRun[];
}

export interface ImagePrimitive extends PrimitiveBase {
  kind: 'image';
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
}

/** A hit area that opens `href`. Draws nothing. */
export interface LinkPrimitive extends PrimitiveBase {
  kind: 'link';
  href: string;
  rect: Rect;
}

/** Interactive-only HTML. Never exported. */
export interface OverlayPrimitive extends PrimitiveBase {
  kind: 'overlay';
  rect: Rect;
  html: () => HTMLElement;
}

/** Escape hatch for drawing a backend cannot express with other primitives. */
export interface CustomPrimitive extends PrimitiveBase {
  kind: 'custom';
  /** SVG markup. */
  svg?: () => string;
  canvas?: (ctx: CanvasRenderingContext2D) => void;
}

export type Primitive =
  | GroupPrimitive
  | RectPrimitive
  | PathPrimitive
  | TextPrimitive
  | ImagePrimitive
  | LinkPrimitive
  | OverlayPrimitive
  | CustomPrimitive;
