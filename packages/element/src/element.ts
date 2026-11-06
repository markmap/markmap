import { CanvasBackend } from '@markmap/canvas';
import { parse, type ParseOptions } from '@markmap/parse';
import { Markmap, resolveViewOptions, SvgDomBackend, type ViewOptions } from '@markmap/view';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Theme tokens go on the host, where the page's own `--mm-*` rules override them. */
const THEME_SELECTOR = ':host';

const CSS = `
:host { display: block; height: 400px; overflow: hidden; background: var(--mm-bg); }
:host([hidden]) { display: none; }
svg, canvas { display: block; width: 100%; height: 100%; }
`;

/** Properties that may be set before this class is defined. */
const PROPERTIES = [
  'markdown',
  'options',
  'parseOptions',
  'src',
  'theme',
  'layout',
  'colorScheme',
  'renderer',
] as const;

/** Importing this on a server must not fail, so the class needs a base class there too. */
const Base = (globalThis.HTMLElement ?? Object) as typeof HTMLElement;

/**
 * Remove surrounding blank lines and the indentation all lines share, so Markdown can be
 * indented along with the HTML around it without turning into a code block.
 */
export function dedent(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => /^[ \t]*/.exec(line)![0].length);
  const indent = Math.min(...indents);
  return lines.map((line) => line.slice(indent)).join('\n');
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * `<markmap-view>` shows Markdown as a map. Markdown comes from the `markdown` property,
 * else the `src` attribute, else a `<script type="text/markdown">` child.
 *
 * The `theme`, `layout`, `color-scheme` and `renderer` attributes update the map live, and
 * win over the document's frontmatter. Set `--mm-*` properties on the element to override
 * theme tokens. `.mm` is the `Markmap` while the element is on the page.
 *
 * Fires `render` and `fold`, with the view event's value as `detail`, and `error` when
 * `src` cannot be loaded.
 */
export class MarkmapViewElement extends Base {
  static observedAttributes = ['src', 'theme', 'layout', 'color-scheme', 'renderer'];

  private map?: Markmap;
  private sheet: HTMLStyleElement;
  private content: string | null = null;
  private viewOptions: ViewOptions = {};
  private parserOptions: ParseOptions = {};
  private optionWarnings: string[] = [];
  /** The Markdown on show. */
  private text?: string;
  private needsFit = true;
  private request?: AbortController;
  /** Inline Markdown may arrive after the element, and may change later. */
  private observer = new MutationObserver(() => {
    if (this.content != null || this.src != null) return;
    const text = this.inlineMarkdown();
    if (text !== this.text) this.show(text);
  });

  constructor() {
    super();
    this.sheet = this.ownerDocument.createElement('style');
    this.sheet.textContent = CSS;
    this.attachShadow({ mode: 'open' }).append(this.sheet);
  }

  /** The view, while the element is on the page. */
  get mm(): Markmap | undefined {
    return this.map;
  }

  /** Markdown to show, ahead of `src` and inline Markdown. `null` falls back to those. */
  get markdown(): string | null {
    return this.content;
  }

  set markdown(value: string | null) {
    this.content = value ?? null;
    this.load();
  }

  /** View options for what attributes cannot express, such as `plugins`. */
  get options(): ViewOptions {
    return this.viewOptions;
  }

  set options(value: ViewOptions) {
    this.viewOptions = value;
    this.update();
  }

  /** Parser options, such as the `remarkMath` plugin that goes with `mathContent`. */
  get parseOptions(): ParseOptions {
    return this.parserOptions;
  }

  set parseOptions(value: ParseOptions) {
    this.parserOptions = value;
    this.update();
  }

  /** Options that were ignored in the last update, from attributes or frontmatter. */
  get warnings(): readonly string[] {
    return this.optionWarnings;
  }

  get src(): string | null {
    return this.getAttribute('src');
  }

  set src(value: string | null) {
    this.reflect('src', value);
  }

  get theme(): string | null {
    return this.getAttribute('theme');
  }

  set theme(value: string | null) {
    this.reflect('theme', value);
  }

  get layout(): string | null {
    return this.getAttribute('layout');
  }

  set layout(value: string | null) {
    this.reflect('layout', value);
  }

  get colorScheme(): string | null {
    return this.getAttribute('color-scheme');
  }

  set colorScheme(value: string | null) {
    this.reflect('color-scheme', value);
  }

  /** `svg` (the default) or `canvas`. */
  get renderer(): string | null {
    return this.getAttribute('renderer');
  }

  set renderer(value: string | null) {
    this.reflect('renderer', value);
  }

  private reflect(name: string, value: string | null) {
    if (value == null) this.removeAttribute(name);
    else this.setAttribute(name, value);
  }

  connectedCallback(): void {
    this.upgradeProperties();
    this.observer.observe(this, { childList: true, subtree: true, characterData: true });
    // Moved within the page: the map is still there, see `disconnectedCallback`.
    if (this.map) return;
    this.createMap();
    this.load();
  }

  disconnectedCallback(): void {
    // Moving the element disconnects and reconnects it at once: keep the map if so.
    queueMicrotask(() => {
      if (this.isConnected) return;
      this.observer.disconnect();
      this.request?.abort();
      this.map?.destroy();
      this.map = undefined;
    });
  }

  attributeChangedCallback(name: string, before: string | null, value: string | null): void {
    if (before === value || !this.map) return;
    if (name === 'renderer') {
      const folded = [...this.map.foldedIds];
      this.createMap();
      this.update();
      this.map.setFoldedIds(folded, { animate: false });
    } else if (name === 'src') {
      this.needsFit = true;
      this.load();
    } else {
      this.needsFit ||= name !== 'color-scheme';
      this.update();
    }
  }

  /** A framework may set properties on the element before this class is defined. */
  private upgradeProperties() {
    for (const name of PROPERTIES) {
      if (!Object.hasOwn(this, name)) continue;
      const value = this[name] as never;
      delete this[name];
      this[name] = value;
    }
  }

  private createMap() {
    this.map?.destroy();
    const doc = this.ownerDocument;
    const canvas = this.renderer === 'canvas';
    const element = canvas ? doc.createElement('canvas') : doc.createElementNS(SVG_NS, 'svg');
    this.shadowRoot!.replaceChildren(this.sheet, element);
    const options = { themeSelector: THEME_SELECTOR };
    const backend = canvas
      ? new CanvasBackend(element as HTMLCanvasElement, options)
      : new SvgDomBackend(element as SVGSVGElement, options);
    const map = new Markmap(backend, this.viewOptions);
    map.on('render', (detail) => this.fire('render', detail));
    map.on('fold', (detail) => this.fire('fold', detail));
    this.map = map;
    this.needsFit = true;
  }

  private fire(type: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private inlineMarkdown(): string | undefined {
    const script = this.querySelector('script[type="text/markdown"]');
    return script ? dedent(script.textContent ?? '') : undefined;
  }

  /** Find the Markdown to show. */
  private load() {
    this.request?.abort();
    const { src } = this;
    if (!this.map) return;
    if (this.content != null || src == null) {
      this.show(this.content ?? this.inlineMarkdown());
      return;
    }
    const request = new AbortController();
    this.request = request;
    fetch(new URL(src, this.baseURI), { signal: request.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`${src}: ${response.status} ${response.statusText}`);
        return response.text();
      })
      .then(
        (text) => {
          if (!request.signal.aborted) this.show(text);
        },
        (error: unknown) => {
          if (!request.signal.aborted) this.fire('error', error);
        },
      );
  }

  private show(text: string | undefined) {
    this.text = text;
    this.update();
  }

  /** Show `text` with the current options. The view stays put unless something moved it. */
  private update() {
    const { map, text } = this;
    if (!map || text == null) return;
    const { root, frontmatter } = parse(text, this.parserOptions);
    const attributes = {
      ...(this.theme != null && { theme: this.theme }),
      ...(this.layout != null && { layout: this.layout }),
      ...(this.colorScheme != null && { colorScheme: this.colorScheme }),
    };
    const fromDocument = isRecord(frontmatter.markmap) ? frontmatter.markmap : {};
    const { options, warnings } = resolveViewOptions(this.viewOptions, {
      ...fromDocument,
      ...attributes,
    });
    this.optionWarnings = warnings;
    map.setTree(root, options);
    if (this.needsFit) {
      this.needsFit = false;
      map.fit();
    }
  }
}
