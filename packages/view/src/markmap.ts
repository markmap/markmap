import type { MarkmapNode, Measurer, Rect } from '@markmap/core';
import {
  classicTheme,
  createCanvasMeasurer,
  type DrawNode,
  type DrawState,
  drawState,
  easeCubicInOut,
  interpolateStates,
  type RenderOptions,
  type RenderResult,
  renderTree,
  resolveRenderOptions,
  tokensToCSS,
} from '@markmap/render';
import { pointer, select, type Selection } from 'd3-selection';
import { zoom, type ZoomBehavior, zoomIdentity, type ZoomTransform, zoomTransform } from 'd3-zoom';
import { Popover } from './popover';
import { SvgDomBackend } from './svg-backend';
import { Tween } from './tween';

export interface ViewOptions extends Omit<RenderOptions, 'measurer' | 'folded'> {
  /** Defaults to a canvas measurer. */
  measurer?: Measurer;
  /** Zoom with the wheel or pinch. */
  zoom?: boolean;
  /** Pan by dragging. */
  pan?: boolean;
  /** Space kept around the drawing by `fit()`, in px. */
  fitPadding?: number;
  /** Largest scale `fit()` zooms in to. */
  maxFitScale?: number;
  /** Fold nodes at this depth and deeper when first seen. `-1` expands everything. */
  initialExpandLevel?: number;
  /**
   * Length of fold, update and fit animations, in ms. `0` disables them, and so does
   * the user's `prefers-reduced-motion` setting.
   */
  duration?: number;
}

const DEFAULTS: ViewOptions = {
  zoom: true,
  pan: true,
  fitPadding: 20,
  maxFitScale: 2,
  initialExpandLevel: -1,
  duration: 500,
};

/**
 * Validate untrusted Markdown options (usually `frontmatter.markmap`) and apply them on
 * top of `base`, including the theme's own options. Ignored values come back as warnings.
 */
export function resolveViewOptions(
  base: ViewOptions,
  input: unknown,
): { options: ViewOptions; warnings: string[] } {
  const { options, json, warnings } = resolveRenderOptions(base, input);
  const keys = [
    'zoom',
    'pan',
    'fitPadding',
    'maxFitScale',
    'initialExpandLevel',
    'duration',
  ] as const;
  for (const key of keys) {
    if (json[key] != null) (options as Record<string, unknown>)[key] = json[key];
  }
  return { options, warnings };
}

/** How close to a node's fold anchor a click must be to toggle it, in px. */
const TOGGLE_RADIUS = 10;

export class Markmap {
  readonly svg: SVGSVGElement;
  private viewOptions: ViewOptions = DEFAULTS;
  private backend: SvgDomBackend;
  private style: SVGStyleElement;
  private zoomBehavior: ZoomBehavior<SVGSVGElement, unknown>;
  private selection: Selection<SVGSVGElement, unknown, null, undefined>;
  private measurer: Measurer;
  private root?: MarkmapNode;
  private folded = new Set<string>();
  private known = new Set<string>();
  private result?: RenderResult;
  private pendingFit?: ResizeObserver;
  private popover?: { id: string; popover: Popover };
  /** Bumped on every open/close, so a slow lazy import cannot open a stale popover. */
  private popoverRequest = 0;
  /** What is on screen: the final state, or a frame of an animation towards it. */
  private frame?: DrawState;
  private stateTween = new Tween();
  private zoomTween = new Tween();
  /** Whether the first fit has happened; it is never animated. */
  private placed = false;
  /**
   * A node held at a fixed point in the SVG (its top-left corner) while the tree moves
   * around it, as when folding. Applied on every frame, so it works however the
   * frames move the node, and released when the animation ends or the user moves the view.
   */
  private pin?: { id: string; x: number; y: number };

  constructor(svg: SVGSVGElement, options: ViewOptions = {}) {
    this.svg = svg;
    svg.classList.add('markmap');
    this.style = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'style');
    svg.append(this.style);
    this.measurer = options.measurer ?? createCanvasMeasurer();
    this.applyOptions(options);
    this.backend = new SvgDomBackend(svg);

    this.selection = select(svg);
    this.zoomBehavior = zoom<SVGSVGElement, unknown>()
      .filter((event: Event) => {
        if (event.type === 'wheel') return !!this.options.zoom;
        if (event.type === 'dblclick') return false;
        const { button = 0, ctrlKey = false } = event as MouseEvent;
        return !!this.options.pan && !ctrlKey && !button;
      })
      .on('zoom', (event: { transform: ZoomTransform; sourceEvent: unknown }) => {
        // The user took over: stop moving the view under them.
        if (event.sourceEvent) {
          this.zoomTween.stop();
          this.pin = undefined;
        }
        this.backend.root.setAttribute('transform', event.transform.toString());
        this.positionPopover();
      });
    this.selection.call(this.zoomBehavior);
    svg.addEventListener('click', this.handleClick);
  }

  get options(): Readonly<ViewOptions> {
    return this.viewOptions;
  }

  /** Replace all options (defaults fill the gaps) and redraw. */
  setOptions(options: ViewOptions): void {
    this.applyOptions(options);
    this.render();
  }

  private applyOptions(options: ViewOptions) {
    this.viewOptions = { ...DEFAULTS, ...options };
    if (options.measurer) this.measurer = options.measurer;
    this.style.textContent = `.markmap{${tokensToCSS(this.theme)}}`;
  }

  static create(svg: SVGSVGElement, root?: MarkmapNode, options?: ViewOptions): Markmap {
    const mm = new Markmap(svg, options);
    if (root) {
      mm.setData(root);
      mm.fit();
    }
    return mm;
  }

  get theme() {
    return this.options.theme ?? classicTheme;
  }

  /** Ids of folded nodes. */
  get foldedIds(): ReadonlySet<string> {
    return this.folded;
  }

  get state(): RenderResult | undefined {
    return this.result;
  }

  /**
   * Show a new tree, optionally replacing all options at the same time. Fold state is
   * kept for ids that still exist, so live editing does not reset what the user folded.
   * New nodes start folded if `data.fold` or an ancestor's `data.foldAll` is set, or
   * they are below `initialExpandLevel`.
   */
  setData(root: MarkmapNode, options?: ViewOptions): void {
    if (options) this.applyOptions(options);
    this.root = root;
    const ids = new Set<string>();
    const level = this.options.initialExpandLevel ?? -1;
    const visit = (node: MarkmapNode, depth: number, foldAll: boolean) => {
      ids.add(node.id);
      const all = foldAll || !!node.data.foldAll;
      if (!this.known.has(node.id) && node.children.length) {
        if (all || node.data.fold || (level >= 0 && depth >= level)) this.folded.add(node.id);
      }
      for (const child of node.children) visit(child, depth + 1, all);
    };
    visit(root, 0, false);
    for (const id of this.folded) if (!ids.has(id)) this.folded.delete(id);
    this.known = ids;
    this.render();
  }

  /** Re-measure, lay out and draw the current tree. */
  render(): RenderResult | undefined {
    if (!this.root) return undefined;
    this.result = renderTree(this.root, {
      ...this.viewOptions,
      measurer: this.measurer,
      folded: this.folded,
    });
    const target = this.result.state;
    const from = this.frame;
    const duration = this.duration;
    if (from && duration > 0) {
      const theme = this.theme;
      this.stateTween.start(duration, (t) => {
        this.drawFrame(t < 1 ? interpolateStates(from, target, easeCubicInOut(t), theme) : target);
        if (t >= 1) this.pin = undefined;
      });
    } else {
      this.stateTween.stop();
      this.drawFrame(target);
      this.pin = undefined;
    }
    if (this.popover) {
      const item = this.result.layout.byId.get(this.popover.id);
      if (item?.node.attachments.length) this.positionPopover();
      else this.closeAttachments();
    }
    return this.result;
  }

  private drawFrame(state: DrawState) {
    this.frame = state;
    this.backend.draw(drawState(state, this.theme));
    this.applyPin();
    this.positionPopover();
  }

  /** Pan so the pinned node's frame position lands on its pinned point. */
  private applyPin() {
    const rect = this.pin && this.frameNode(this.pin.id)?.rect;
    if (!this.pin || !rect) return;
    const { k, x, y } = this.transform;
    const dx = this.pin.x - (x + rect.x * k);
    const dy = this.pin.y - (y + rect.y * k);
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return;
    this.zoomBehavior.transform(this.selection, zoomIdentity.translate(x + dx, y + dy).scale(k));
  }

  /** Animation length in ms, `0` when animations are off. */
  private get duration(): number {
    const view = this.svg.ownerDocument.defaultView;
    if (view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0;
    return this.options.duration ?? 0;
  }

  /** Where a node is drawn right now, possibly mid-animation. */
  private frameNode(id: string): DrawNode | undefined {
    return this.frame?.nodes.find((item) => item.node.id === id);
  }

  /** Fold or unfold a node, keeping it in place on screen. */
  setFolded(id: string, folded: boolean): void {
    if (folded === this.folded.has(id)) return;
    const rect = this.frameNode(id)?.rect;
    if (rect) {
      const [x, y] = this.transform.apply([rect.x, rect.y]);
      this.zoomTween.stop();
      this.pin = { id, x, y };
    }
    if (folded) this.folded.add(id);
    else this.folded.delete(id);
    this.render();
  }

  /** Move the view to `target`, animated unless animations are off. */
  private zoomTo(target: ZoomTransform, animate = true) {
    this.pin = undefined;
    const from = this.transform;
    const { width, height } = this.svg.getBoundingClientRect();
    const apply = (transform: ZoomTransform) =>
      this.zoomBehavior.transform(this.selection, transform);
    const duration = animate ? this.duration : 0;
    this.zoomTween.start(duration, (t) =>
      apply(
        t < 1 ? interpolateZoom(from, target, easeCubicInOut(t), width / 2, height / 2) : target,
      ),
    );
  }

  toggle(id: string): void {
    this.setFolded(id, !this.folded.has(id));
  }

  /**
   * Scale and center the drawing to fill the SVG. If the SVG has no size yet (hidden,
   * or not laid out), the fit happens as soon as it gets one.
   */
  fit(): void {
    if (!this.result) return;
    const { width, height } = this.svg.getBoundingClientRect();
    if (!width || !height) {
      this.fitWhenSized();
      return;
    }
    this.pendingFit?.disconnect();
    this.pendingFit = undefined;
    const box: Rect = this.result.bounds;
    const padding = this.options.fitPadding ?? 0;
    const scale = Math.min(
      (width - padding * 2) / box.width,
      (height - padding * 2) / box.height,
      this.options.maxFitScale ?? 2,
    );
    const transform = zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-(box.x + box.width / 2), -(box.y + box.height / 2));
    this.zoomTo(transform, this.placed);
    this.placed = true;
  }

  private fitWhenSized() {
    if (this.pendingFit || typeof ResizeObserver === 'undefined') return;
    this.pendingFit = new ResizeObserver(() => {
      const { width, height } = this.svg.getBoundingClientRect();
      if (width && height) this.fit();
    });
    this.pendingFit.observe(this.svg);
  }

  /** Current zoom transform. */
  get transform() {
    return zoomTransform(this.svg);
  }

  /** The node whose fold anchor is under a point in layout coordinates. */
  hitToggle(x: number, y: number): DrawNode | undefined {
    if (!this.frame || !this.result) return undefined;
    for (const item of this.frame.nodes) {
      // Skip nodes that are leaving: they can no longer be toggled.
      if (!item.ctx.hasChildren || !this.result.layout.byId.has(item.node.id)) continue;
      const anchor = this.theme.node.anchor(item.rect, 'source', item.ctx);
      if (Math.hypot(anchor.x - x, anchor.y - y) <= TOGGLE_RADIUS) return item;
    }
    return undefined;
  }

  /** Id of the node whose attachments are open, if any. */
  get openAttachmentsId(): string | undefined {
    return this.popover?.id;
  }

  /** Show a node's attachments in a popover next to it. */
  async openAttachments(id: string): Promise<void> {
    const item = this.result?.layout.byId.get(id);
    if (!item?.node.attachments.length) return;
    this.closeAttachments();
    const request = this.popoverRequest;
    const { attachmentsToHtml } = await import('./attachments-html');
    if (request !== this.popoverRequest) return;
    const popover = new Popover(
      this.svg.ownerDocument,
      attachmentsToHtml(item.node.attachments),
      this.theme.tokens,
    );
    popover.el.setAttribute('aria-label', 'Notes');
    this.popover = { id, popover };
    this.positionPopover();
    const doc = this.svg.ownerDocument;
    // A click, not pointerdown: d3-zoom swallows the click that ends a pan, so panning
    // and zooming keep the popover open while it follows the node.
    doc.addEventListener('click', this.handleOutside, true);
    doc.addEventListener('keydown', this.handleKey);
    doc.defaultView?.addEventListener('scroll', this.handleScroll, true);
    popover.el.focus({ preventScroll: true });
  }

  closeAttachments(): void {
    this.popoverRequest += 1;
    if (!this.popover) return;
    this.popover.popover.destroy();
    this.popover = undefined;
    const doc = this.svg.ownerDocument;
    doc.removeEventListener('click', this.handleOutside, true);
    doc.removeEventListener('keydown', this.handleKey);
    doc.defaultView?.removeEventListener('scroll', this.handleScroll, true);
  }

  /** A node's box in viewport coordinates, where it is drawn right now. */
  screenRect(id: string): Rect | undefined {
    const rect = this.frameNode(id)?.rect;
    if (!rect) return undefined;
    const svgRect = this.svg.getBoundingClientRect();
    const t = this.transform;
    return {
      x: svgRect.x + t.applyX(rect.x),
      y: svgRect.y + t.applyY(rect.y),
      width: rect.width * t.k,
      height: rect.height * t.k,
    };
  }

  private positionPopover() {
    if (!this.popover) return;
    const rect = this.screenRect(this.popover.id);
    if (rect) this.popover.popover.position(rect);
  }

  private handleOutside = (event: Event) => {
    const target = event.target as Element | null;
    if (this.popover?.popover.contains(target)) return;
    // Clicking the dot again is handled by the click handler.
    if (target?.closest?.('[data-action="attachments"]')) return;
    this.closeAttachments();
  };

  private handleKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') this.closeAttachments();
  };

  private handleScroll = (event: Event) => {
    if (!this.popover?.popover.contains(event.target as Node)) this.closeAttachments();
  };

  destroy(): void {
    this.stateTween.stop();
    this.zoomTween.stop();
    this.closeAttachments();
    this.svg.removeEventListener('click', this.handleClick);
    this.pendingFit?.disconnect();
    this.selection.on('.zoom', null);
    this.backend.destroy();
    this.style.remove();
    this.svg.classList.remove('markmap');
  }

  private handleClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    const action = (event.target as Element | null)?.closest?.('[data-action]');
    if (action?.getAttribute('data-action') === 'attachments') {
      const id = action.closest('[data-node-id]')?.getAttribute('data-node-id');
      if (id && id === this.popover?.id) this.closeAttachments();
      else if (id) void this.openAttachments(id);
      return;
    }
    const [x, y] = pointer(event, this.backend.root);
    const item = this.hitToggle(x, y);
    if (item) this.toggle(item.node.id);
  };
}

/**
 * A zoom transform `t` of the way from `a` to `b`. The scale changes geometrically and
 * the layout point under (`cx`, `cy`) moves in a straight line, so a pure pan moves at a
 * constant speed and zooming does not swing sideways.
 */
export function interpolateZoom(
  a: ZoomTransform,
  b: ZoomTransform,
  t: number,
  cx: number,
  cy: number,
): ZoomTransform {
  const k = a.k * (b.k / a.k) ** t;
  const x = ((cx - a.x) / a.k) * (1 - t) + ((cx - b.x) / b.k) * t;
  const y = ((cy - a.y) / a.k) * (1 - t) + ((cy - b.y) / b.k) * t;
  return zoomIdentity.translate(cx - x * k, cy - y * k).scale(k);
}
