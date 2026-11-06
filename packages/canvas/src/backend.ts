import type { Primitive } from '@markmap/core';
import type { ViewBackend, ViewTransform } from '@markmap/view';
import { drawPrimitives, type DrawEnv } from './draw';
import { ImageCache } from './images';

/**
 * Shows a map in a `<canvas>`, for much larger maps than SVG can animate smoothly. Pass
 * it to `Markmap`: `new Markmap(new CanvasBackend(canvas))`. Size the canvas with CSS.
 *
 * Unlike SVG, a canvas has no accessibility tree and its text cannot be selected.
 */
export class CanvasBackend implements ViewBackend {
  readonly element: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private style: HTMLStyleElement;
  private primitives: Primitive[] = [];
  private transform: ViewTransform = { k: 1, x: 0, y: 0 };
  private images = new ImageCache({ onLoad: () => this.schedule() });
  private env: DrawEnv;
  private frame?: number;
  private resizeObserver?: ResizeObserver;
  private darkQuery?: MediaQueryList;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.element = canvas;
    this.ctx = ctx;
    const doc = canvas.ownerDocument;
    this.style = doc.createElement('style');
    doc.head.append(this.style);
    const computed = doc.defaultView?.getComputedStyle(canvas);
    this.env = {
      // Read live, so CSS overrides on the page apply as in SVG.
      tokens: (name) => computed?.getPropertyValue(`--${name}`),
      image: (src) => this.images.get(src),
    };
    if (typeof ResizeObserver !== 'undefined') {
      // Resizing clears the canvas: draw at once, or it flashes empty for a frame.
      this.resizeObserver = new ResizeObserver(() => this.paint());
      this.resizeObserver.observe(canvas);
    }
    // `auto` color schemes switch tokens without the view knowing.
    this.darkQuery = doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
    this.darkQuery?.addEventListener('change', this.schedule);
  }

  draw(primitives: Primitive[]): void {
    this.primitives = primitives;
    this.schedule();
  }

  setTransform(transform: ViewTransform): void {
    this.transform = transform;
    this.schedule();
  }

  setCSS(css: string): void {
    this.style.textContent = css;
    this.schedule();
  }

  private schedule = () => {
    if (this.frame != null) return;
    const view = this.element.ownerDocument.defaultView;
    this.frame = view?.requestAnimationFrame(() => {
      this.frame = undefined;
      this.paint();
    });
  };

  /** Draw now. Changes are otherwise drawn on the next animation frame, at most once. */
  paint(): void {
    const { ctx, element } = this;
    const ratio = this.fitToElement();
    if (!ratio) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, element.width, element.height);
    const { k, x, y } = this.transform;
    ctx.setTransform(k * ratio, 0, 0, k * ratio, x * ratio, y * ratio);
    drawPrimitives(ctx, this.primitives, this.env);
  }

  /**
   * Match the bitmap to the element's size and the screen's pixel density. Returns the
   * device pixel ratio, or 0 when the element has no size.
   */
  private fitToElement(): number {
    const { element } = this;
    const { width, height } = element.getBoundingClientRect();
    if (!width || !height) return 0;
    const ratio = element.ownerDocument.defaultView?.devicePixelRatio || 1;
    const bitmapWidth = Math.round(width * ratio);
    const bitmapHeight = Math.round(height * ratio);
    if (element.width !== bitmapWidth || element.height !== bitmapHeight) {
      element.width = bitmapWidth;
      element.height = bitmapHeight;
      // Without a CSS size the bitmap sets the element's size, which would grow on
      // every resize on high-density screens: hold it at the size it had.
      const after = element.getBoundingClientRect();
      if (after.width !== width || after.height !== height) {
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
      }
    }
    return ratio;
  }

  destroy(): void {
    const view = this.element.ownerDocument.defaultView;
    if (this.frame != null) view?.cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.resizeObserver?.disconnect();
    this.darkQuery?.removeEventListener('change', this.schedule);
    this.style.remove();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.element.width, this.element.height);
  }
}
