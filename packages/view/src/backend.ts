import type { Primitive } from '@markmap/core';

/** Maps layout coordinates to the element's: `screen = layout × k + (x, y)`. */
export interface ViewTransform {
  k: number;
  x: number;
  y: number;
}

/**
 * What the view draws through. The view owns everything else (zoom and pan, animation,
 * hit testing, popovers), so a backend only turns primitives into pixels or DOM.
 */
export interface ViewBackend {
  /**
   * The element on the page: it receives pointer events, its size is the viewport, and
   * it gets the `markmap` class and the class of its own that theme CSS applies to.
   */
  readonly element: Element;
  /**
   * Whether `link` primitives work by themselves (SVG `<a>` elements). Otherwise the view
   * opens links on click.
   */
  readonly nativeLinks?: boolean;
  /** Draw primitives in layout coordinates. Called once per animation frame. */
  draw(primitives: Primitive[]): void;
  /** Move the drawing; called whenever the view zooms or pans. */
  setTransform(transform: ViewTransform): void;
  /** Theme CSS (custom properties on the map's class), whenever the theme or color scheme changes. */
  setCSS(css: string): void;
  /** Remove everything the backend added to the page. */
  destroy(): void;
}
