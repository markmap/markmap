import {
  findNode,
  type MarkmapNode,
  type Measurer,
  type Primitive,
  type Rect,
} from '@markmap/core';
import {
  classicTheme,
  createCanvasMeasurer,
  defaultContentPlugins,
  type DrawNode,
  type DrawState,
  drawState,
  easeCubicInOut,
  interpolateStates,
  type RenderOptions,
  type ResolveOptions,
  type RenderResult,
  renderTree,
  resolveRenderOptions,
  themeCSS,
  type ColorScheme,
} from '@markmap/render';
import { select, type Selection } from 'd3-selection';
import { zoom, type ZoomBehavior, zoomIdentity, type ZoomTransform, zoomTransform } from 'd3-zoom';
import type { ViewBackend } from './backend';
import { HitIndex, type HitTarget } from './hit-index';
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
  /** Color code blocks in attachment popovers. Defaults to `true`. */
  highlight?: boolean;
  /** Which theme tokens to use; `auto` follows the reader's system setting. Defaults to `light`. */
  colorScheme?: ColorScheme;
}

/** What each event passes to its listeners. */
export interface MarkmapEvents {
  /** After every render, with the final (not mid-animation) result. */
  render: RenderResult;
  /** Whenever the view moves, by the user or by the API. */
  zoom: ZoomTransform;
  /** When the set of folded nodes changes. */
  fold: ReadonlySet<string>;
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
  resolve?: ResolveOptions,
): { options: ViewOptions; warnings: string[] } {
  const { options, json, warnings } = resolveRenderOptions(base, input, resolve);
  const keys = [
    'zoom',
    'pan',
    'fitPadding',
    'maxFitScale',
    'initialExpandLevel',
    'duration',
    'colorScheme',
  ] as const;
  for (const key of keys) {
    if (json[key] != null) (options as Record<string, unknown>)[key] = json[key];
  }
  return { options, warnings };
}

/** Scale change of one `zoomIn()` or `zoomOut()` step. */
const ZOOM_STEP = 1.25;

/** Visit a node and its descendants, depth-first. `depth` counts from `node` (0). */
function walk(node: MarkmapNode, visit: (node: MarkmapNode, depth: number) => void, depth = 0) {
  visit(node, depth);
  for (const child of node.children) walk(child, visit, depth + 1);
}

/** How close to a node's fold anchor a click must be to toggle it, in px. */
const TOGGLE_RADIUS = 10;

const isBackend = (value: Element | ViewBackend): value is ViewBackend =>
  typeof (value as ViewBackend).draw === 'function';

export class Markmap {
  readonly backend: ViewBackend;
  private viewOptions: ViewOptions = DEFAULTS;
  private zoomBehavior: ZoomBehavior<Element, unknown>;
  private selection: Selection<Element, unknown, null, undefined>;
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
  /** Primitives drawn for `frame`. */
  private primitives: Primitive[] = [];
  /** Hit targets of `frame`, built on the first lookup after it is drawn. */
  private hits?: { frame: DrawState; index: HitIndex };
  private stateTween = new Tween();
  private zoomTween = new Tween();
  /** Whether the first fit has happened; it is never animated. */
  private placed = false;
  /** Where the running zoom animation ends. */
  private zoomTarget?: ZoomTransform;
  /**
   * A node held at a fixed point in the element (its top-left corner) while the tree moves
   * around it, as when folding. Applied on every frame, so it works however the
   * frames move the node, and released when the animation ends or the user moves the view.
   */
  private pin?: { id: string; x: number; y: number };

  /**
   * Show a map in an `<svg>` element, or through another backend (such as canvas from
   * `@markmap/canvas`).
   */
  constructor(target: SVGSVGElement | ViewBackend, options: ViewOptions = {}) {
    this.backend = isBackend(target) ? target : new SvgDomBackend(target);
    const { element } = this.backend;
    element.classList.add('markmap');
    this.measurer = options.measurer ?? createCanvasMeasurer();
    this.applyOptions(options);

    this.selection = select(element);
    this.zoomBehavior = zoom<Element, unknown>()
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
        this.backend.setTransform(event.transform);
        this.positionPopover();
        this.emit('zoom', event.transform);
      });
    this.selection.call(this.zoomBehavior);
    element.addEventListener('click', this.handleClick);
    element.addEventListener('pointermove', this.handleHover);
  }

  /** The element the map is shown in. */
  get element(): Element {
    return this.backend.element;
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
    this.backend.setCSS(themeCSS(this.theme, this.viewOptions.colorScheme));
  }

  static create(
    target: SVGSVGElement | ViewBackend,
    root?: MarkmapNode,
    options?: ViewOptions,
  ): Markmap {
    const mm = new Markmap(target, options);
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
    const before = new Set(this.folded);
    visit(root, 0, false);
    for (const id of this.folded) if (!ids.has(id)) this.folded.delete(id);
    this.known = ids;
    this.render();
    if (!sameSet(before, this.folded)) this.emit('fold', this.folded);
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
      const layout = this.options.layout;
      this.stateTween.start(duration, (t) => {
        this.drawFrame(
          t < 1 ? interpolateStates(from, target, easeCubicInOut(t), theme, layout) : target,
        );
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
    this.emit('render', this.result);
    const { pending } = this.result;
    // Placeholder sizes (such as loading images): render again, animated, once they settle.
    if (pending) {
      const result = this.result;
      void pending.then(() => {
        if (this.result === result) this.render();
      });
    }
    return this.result;
  }

  private drawFrame(state: DrawState) {
    this.frame = state;
    this.primitives = drawState(state, this.theme);
    this.backend.draw(this.primitives);
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
    const view = this.element.ownerDocument.defaultView;
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
    this.updateFolded(id, () => {
      if (folded) this.folded.add(id);
      else this.folded.delete(id);
    });
  }

  /** Unfold a node and everything below it. Defaults to the whole tree. */
  expandAll(id?: string): void {
    const node = this.subtree(id);
    if (!node) return;
    this.updateFolded(node.id, () => {
      walk(node, (child) => this.folded.delete(child.id));
    });
  }

  /**
   * Fold a node and every node below it that has children, so unfolding later reveals
   * one level at a time. Defaults to the whole tree, leaving only the root.
   */
  foldAll(id?: string): void {
    const node = this.subtree(id);
    if (!node) return;
    this.updateFolded(node.id, () => {
      walk(node, (child) => {
        if (child.children.length) this.folded.add(child.id);
      });
    });
  }

  /**
   * Show the tree down to `level`: nodes at that depth and deeper are folded, the rest
   * unfolded. The root is depth 0, so `1` shows only the root's children. `-1` expands
   * everything. Same meaning as the `initialExpandLevel` option.
   */
  foldToLevel(level: number): void {
    if (!this.root) return;
    this.updateFolded(this.root.id, () => {
      walk(this.root!, (node, depth) => {
        if (level >= 0 && depth >= level && node.children.length) this.folded.add(node.id);
        else this.folded.delete(node.id);
      });
    });
  }

  private subtree(id?: string): MarkmapNode | undefined {
    if (!this.root) return undefined;
    return id == null ? this.root : findNode(this.root, id);
  }

  /**
   * Change fold state and redraw once, animated, keeping `pinId` still on screen. If that
   * node is not drawn (inside a folded branch), the root stays still instead.
   */
  private updateFolded(pinId: string, change: () => void) {
    const before = new Set(this.folded);
    change();
    if (sameSet(before, this.folded)) return;
    const pinned = this.frameNode(pinId) ?? (this.root && this.frameNode(this.root.id));
    if (pinned) {
      const [x, y] = this.transform.apply([pinned.rect.x, pinned.rect.y]);
      this.zoomTween.stop();
      this.pin = { id: pinned.node.id, x, y };
    }
    this.render();
    this.emit('fold', this.folded);
  }

  private listeners = new Map<keyof MarkmapEvents, Set<(value: never) => void>>();

  /** Listen to an event. Returns a function that stops listening. */
  on<K extends keyof MarkmapEvents>(
    type: K,
    listener: (value: MarkmapEvents[K]) => void,
  ): () => void {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    set.add(listener);
    return () => set.delete(listener);
  }

  private emit<K extends keyof MarkmapEvents>(type: K, value: MarkmapEvents[K]) {
    for (const listener of this.listeners.get(type) ?? []) {
      (listener as (value: MarkmapEvents[K]) => void)(value);
    }
  }

  /**
   * Zoom by `factor` around the center of the element, animated. Repeated calls during an
   * animation add up. The scale stays within the zoom behavior's scale extent.
   */
  zoomBy(factor: number): void {
    const { width, height } = this.element.getBoundingClientRect();
    const base = (this.zoomTween.running && this.zoomTarget) || this.transform;
    const [min, max] = this.zoomBehavior.scaleExtent();
    const k = Math.min(max, Math.max(min, base.k * factor));
    const cx = width / 2;
    const cy = height / 2;
    const x = (cx - base.x) / base.k;
    const y = (cy - base.y) / base.k;
    this.zoomTo(zoomIdentity.translate(cx - x * k, cy - y * k).scale(k));
  }

  zoomIn(): void {
    this.zoomBy(ZOOM_STEP);
  }

  zoomOut(): void {
    this.zoomBy(1 / ZOOM_STEP);
  }

  /** Move the view to `target`, animated unless animations are off. */
  private zoomTo(target: ZoomTransform, animate = true) {
    this.pin = undefined;
    this.zoomTarget = target;
    const from = this.transform;
    const { width, height } = this.element.getBoundingClientRect();
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
   * Scale and center the drawing to fill the element. If it has no size yet (hidden,
   * or not laid out), the fit happens as soon as it gets one.
   */
  fit(): void {
    if (!this.result) return;
    const { width, height } = this.element.getBoundingClientRect();
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
      const { width, height } = this.element.getBoundingClientRect();
      if (width && height) this.fit();
    });
    this.pendingFit.observe(this.element);
  }

  /** Current zoom transform. */
  get transform() {
    return zoomTransform(this.element);
  }

  /**
   * What a point in layout coordinates acts on, where things are drawn right now (also
   * mid-animation). Nodes on their way out cannot be clicked.
   */
  hitAt(x: number, y: number): HitTarget | undefined {
    const { frame, result } = this;
    if (!frame || !result) return undefined;
    if (this.hits?.frame !== frame) {
      const toggles = frame.nodes
        .filter((item) => item.ctx.hasChildren)
        .map((item) => ({
          nodeId: item.node.id,
          ...this.theme.node.anchor(item.rect, item.ctx.direction, item.ctx),
        }));
      const index = new HitIndex(this.primitives, {
        toggles,
        toggleRadius: TOGGLE_RADIUS,
        include: (id) => result.layout.byId.has(id),
      });
      this.hits = { frame, index };
    }
    return this.hits.index.hit(x, y);
  }

  /** The node whose fold anchor is under a point in layout coordinates. */
  hitToggle(x: number, y: number): DrawNode | undefined {
    const target = this.hitAt(x, y);
    return target?.kind === 'toggle' ? this.frameNode(target.nodeId) : undefined;
  }

  /** Layout coordinates of a pointer event. */
  private layoutPoint(event: MouseEvent): [number, number] {
    const box = this.element.getBoundingClientRect();
    return this.transform.invert([event.clientX - box.x, event.clientY - box.y]);
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
    const html = await attachmentsToHtml(item.node.attachments, {
      plugins: this.options.plugins ?? defaultContentPlugins,
      highlight: this.options.highlight,
    });
    if (request !== this.popoverRequest) return;
    const popover = new Popover(this.element.ownerDocument, html, this.currentTokens());
    popover.el.setAttribute('aria-label', 'Notes');
    this.popover = { id, popover };
    this.positionPopover();
    const doc = this.element.ownerDocument;
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
    const doc = this.element.ownerDocument;
    doc.removeEventListener('click', this.handleOutside, true);
    doc.removeEventListener('keydown', this.handleKey);
    doc.defaultView?.removeEventListener('scroll', this.handleScroll, true);
  }

  /**
   * Token values as the element resolves them right now, so the popover matches the color
   * scheme in effect and any CSS overrides on the page.
   */
  private currentTokens(): Record<string, string> {
    const { tokens, darkTokens = {} } = this.theme;
    const style = this.element.ownerDocument.defaultView?.getComputedStyle(this.element);
    const result: Record<string, string> = {};
    for (const name of new Set([...Object.keys(tokens), ...Object.keys(darkTokens)])) {
      result[name] = style?.getPropertyValue(`--${name}`).trim() || tokens[name] || '';
    }
    return result;
  }

  /** A node's box in viewport coordinates, where it is drawn right now. */
  screenRect(id: string): Rect | undefined {
    const rect = this.frameNode(id)?.rect;
    if (!rect) return undefined;
    const svgRect = this.element.getBoundingClientRect();
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
    const target = event.target as Node | null;
    if (this.popover?.popover.contains(target)) return;
    // Clicking a dot is handled by the click handler.
    if (target && this.element.contains(target) && event instanceof MouseEvent) {
      const hit = this.hitAt(...this.layoutPoint(event));
      if (hit?.kind === 'action' && hit.action === 'attachments') return;
    }
    this.closeAttachments();
  };

  private handleKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') this.closeAttachments();
  };

  private handleScroll = (event: Event) => {
    if (!this.popover?.popover.contains(event.target as Node)) this.closeAttachments();
  };

  destroy(): void {
    // Late callbacks (such as images finishing loading) find nothing to render.
    this.root = undefined;
    this.listeners.clear();
    this.stateTween.stop();
    this.zoomTween.stop();
    this.closeAttachments();
    this.element.removeEventListener('click', this.handleClick);
    this.element.removeEventListener('pointermove', this.handleHover);
    this.setCursor('');
    this.pendingFit?.disconnect();
    this.selection.on('.zoom', null);
    this.backend.destroy();
    this.element.classList.remove('markmap');
  }

  /** Show that a target is clickable, whatever the backend draws it with. */
  private handleHover = (event: Event) => {
    const pointer = event as PointerEvent;
    // Dragging pans the view; leave its cursor alone.
    if (pointer.buttons) return;
    this.setCursor(this.hitAt(...this.layoutPoint(pointer)) ? 'pointer' : '');
  };

  private setCursor(cursor: string) {
    (this.element as HTMLElement | SVGElement).style.cursor = cursor;
  }

  // Typed as a plain listener: `Element` has no `click` entry in its event map.
  private handleClick = (event: Event) => {
    if (event.defaultPrevented) return;
    const target = this.hitAt(...this.layoutPoint(event as MouseEvent));
    if (target?.kind === 'action' && target.action === 'attachments') {
      if (target.nodeId === this.popover?.id) this.closeAttachments();
      else void this.openAttachments(target.nodeId);
    } else if (target?.kind === 'link') {
      // SVG links follow themselves; other backends draw no link elements.
      if (!this.backend.nativeLinks) {
        this.element.ownerDocument.defaultView?.open(target.href, '_blank', 'noopener,noreferrer');
      }
    } else if (target?.kind === 'toggle') {
      this.toggle(target.nodeId);
    }
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

function sameSet<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  return a.size === b.size && [...a].every((item) => b.has(item));
}
