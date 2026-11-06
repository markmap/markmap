import type { MarkmapViewElement } from '@markmap/element';
import type { ViewOptions } from '@markmap/view';

export interface AutoloaderConfig {
  /** Load math for every map. Off by default because of its size; `data-math` is per map. */
  math?: boolean;
  /** Show the toolbar on every map. `data-toolbar` is per map. */
  toolbar?: boolean;
  /** Defaults for the attributes of the same names, which a block can override. */
  theme?: string;
  layout?: string;
  colorScheme?: 'light' | 'dark' | 'auto';
  renderer?: 'svg' | 'canvas';
  /** View options for what attributes cannot express. */
  options?: ViewOptions;
}

const PENDING = 'data-markmap-pending';
/** Maps themselves have the `markmap` class too. */
const SELECTOR = '.markmap:not(markmap-view, svg, canvas)';

/** Keeps the space the map will take, and hides any Markdown written as plain text. */
const CSS = `:where([${PENDING}]) { display: block; height: 400px; overflow: hidden; color: transparent; }`;

/** How far from the viewport a map starts loading. */
const ROOT_MARGIN = '200px';

const config: AutoloaderConfig = {};
const shown = new WeakMap<Element, Promise<MarkmapViewElement | undefined>>();
let observer: IntersectionObserver | undefined;

/** Set options for maps that are not on show yet. Call it right after importing. */
export function configure(options: AutoloaderConfig): void {
  Object.assign(config, options);
}

function show(block: Element) {
  let result = shown.get(block);
  if (!result) {
    observer?.unobserve(block);
    result = import('./mount').then(async ({ mount }) =>
      block.isConnected ? mount(block, config) : undefined,
    );
    shown.set(block, result);
  }
  return result;
}

function report(error: unknown) {
  console.error('markmap:', error);
}

/** Find blocks not seen yet, to show as they get near the viewport. */
function scan(root: ParentNode) {
  for (const block of root.querySelectorAll(SELECTOR)) {
    if (block.hasAttribute(PENDING)) continue;
    block.setAttribute(PENDING, '');
    observer?.observe(block);
  }
}

/**
 * Show every block under `root` now, including ones added since the page loaded and ones
 * not scrolled to yet. Resolves with the new elements.
 */
export async function renderAll(root: ParentNode = document): Promise<MarkmapViewElement[]> {
  scan(root);
  const blocks = [...root.querySelectorAll(`[${PENDING}]`)];
  const views = await Promise.all(blocks.map(show));
  return views.filter((view) => view != null);
}

function start() {
  const style = document.createElement('style');
  style.textContent = CSS;
  // First, so that the page's own rules win.
  document.head.prepend(style);
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) show(entry.target).catch(report);
      }
    },
    { rootMargin: ROOT_MARGIN },
  );
  scan(document);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
