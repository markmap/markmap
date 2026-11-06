import type { Primitive } from '@markmap/core';
import { primitivesToSVG } from '@markmap/render';
import type { ViewBackend, ViewTransform } from './backend';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface Item {
  el: SVGGElement;
  markup: string;
}

/**
 * Draws primitives into an SVG element. Top-level groups with a `key` keep their
 * element between draws, so only changed transforms and contents touch the DOM.
 */
export class SvgDomBackend implements ViewBackend {
  readonly element: SVGSVGElement;
  readonly nativeLinks = true;
  /** Group that holds the drawing and carries the zoom transform. */
  readonly root: SVGGElement;
  private style: SVGStyleElement;
  private items = new Map<string, Item>();

  constructor(svg: SVGSVGElement) {
    this.element = svg;
    const doc = svg.ownerDocument;
    this.style = doc.createElementNS(SVG_NS, 'style');
    this.root = doc.createElementNS(SVG_NS, 'g');
    svg.append(this.style, this.root);
  }

  setCSS(css: string): void {
    this.style.textContent = css;
  }

  setTransform({ k, x, y }: ViewTransform): void {
    this.root.setAttribute('transform', `translate(${x},${y}) scale(${k})`);
  }

  /** Element drawn for a keyed group, if any. */
  get(key: string): SVGGElement | undefined {
    return this.items.get(key)?.el;
  }

  draw(primitives: Primitive[]): void {
    const seen = new Set<string>();
    let prev: Element | null = null;

    primitives.forEach((p, index) => {
      if (p.backends && !p.backends.includes('svg')) return;
      const isGroup = p.kind === 'group';
      const key = isGroup && p.key ? p.key : `#${index}`;
      seen.add(key);

      let item = this.items.get(key);
      if (!item) {
        item = { el: this.root.ownerDocument.createElementNS(SVG_NS, 'g'), markup: '' };
        this.items.set(key, item);
      }
      const { el } = item;

      setAttr(el, 'transform', isGroup && p.transform ? `matrix(${p.transform.join(' ')})` : null);
      setAttr(el, 'opacity', isGroup && p.opacity != null ? String(p.opacity) : null);
      setAttr(el, 'data-node-id', isGroup ? (p.nodeId ?? null) : null);
      setAttr(el, 'data-key', key);

      const content = !isGroup
        ? [p]
        : p.clip
          ? [{ ...p, transform: undefined, opacity: undefined }]
          : p.children;
      const markup = primitivesToSVG(content, { interactive: true });
      if (markup !== item.markup) {
        // Animated edges only change their path data: update it in place.
        if (!patchPath(el, item.markup, markup)) el.innerHTML = markup;
        item.markup = markup;
      }

      const expected: ChildNode | null = prev ? prev.nextSibling : this.root.firstChild;
      if (expected !== el) this.root.insertBefore(el, expected);
      prev = el;
    });

    for (const [key, item] of this.items) {
      if (!seen.has(key)) {
        item.el.remove();
        this.items.delete(key);
      }
    }
  }

  destroy(): void {
    this.style.remove();
    this.root.remove();
    this.items.clear();
  }
}

function setAttr(el: Element, name: string, value: string | null) {
  if (value == null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

const SINGLE_PATH = /^<path d="([^"]*)"([^>]*)\/>$/;

/** If both markups are one path that differs only in `d`, set `d` and return true. */
function patchPath(el: Element, before: string, after: string): boolean {
  const a = SINGLE_PATH.exec(before);
  const b = SINGLE_PATH.exec(after);
  const path = el.firstElementChild;
  if (!a || !b || a[2] !== b[2] || b[1].includes('&')) return false;
  if (!path || path !== el.lastElementChild) return false;
  path.setAttribute('d', b[1]);
  return true;
}
