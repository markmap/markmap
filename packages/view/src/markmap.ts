import type { MarkmapNode, Measurer, Rect } from '@markmap/core';
import {
  classicTheme,
  createCanvasMeasurer,
  type LayoutNode,
  type RenderOptions,
  type RenderResult,
  renderTree,
  resolveRenderOptions,
  tokensToCSS,
} from '@markmap/render';
import { pointer, select, type Selection } from 'd3-selection';
import { zoom, type ZoomBehavior, zoomIdentity, zoomTransform } from 'd3-zoom';
import { SvgDomBackend } from './svg-backend';

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
}

const DEFAULTS: ViewOptions = {
  zoom: true,
  pan: true,
  fitPadding: 20,
  maxFitScale: 2,
  initialExpandLevel: -1,
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
  for (const key of ['zoom', 'pan', 'fitPadding', 'maxFitScale', 'initialExpandLevel'] as const) {
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
      .on('zoom', (event: { transform: { toString(): string } }) => {
        this.backend.root.setAttribute('transform', event.transform.toString());
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
    this.backend.draw(this.result.primitives);
    return this.result;
  }

  /** Fold or unfold a node, keeping it in place on screen. */
  setFolded(id: string, folded: boolean): void {
    if (folded === this.folded.has(id)) return;
    const before = this.result?.layout.byId.get(id)?.rect;
    if (folded) this.folded.add(id);
    else this.folded.delete(id);
    const after = this.render()?.layout.byId.get(id)?.rect;
    if (before && after) {
      this.zoomBehavior.translateBy(this.selection, before.x - after.x, before.y - after.y);
    }
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
    this.zoomBehavior.transform(this.selection, transform);
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
  hitToggle(x: number, y: number): LayoutNode | undefined {
    if (!this.result) return undefined;
    for (const item of this.result.layout.nodes) {
      if (!item.node.children.length) continue;
      const ctx = this.result.contexts.get(item.node.id)!;
      const anchor = this.theme.node.anchor(item.rect, 'source', ctx);
      if (Math.hypot(anchor.x - x, anchor.y - y) <= TOGGLE_RADIUS) return item;
    }
    return undefined;
  }

  destroy(): void {
    this.svg.removeEventListener('click', this.handleClick);
    this.pendingFit?.disconnect();
    this.selection.on('.zoom', null);
    this.backend.destroy();
    this.style.remove();
    this.svg.classList.remove('markmap');
  }

  private handleClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    const [x, y] = pointer(event, this.backend.root);
    const item = this.hitToggle(x, y);
    if (item) this.toggle(item.node.id);
  };
}
