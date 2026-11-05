import type { Primitive } from '@markmap/core';
import { primitivesToSVG } from '@markmap/render';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface Item {
  el: SVGGElement;
  markup: string;
}

/**
 * Draws primitives into an SVG element. Top-level groups with a `key` keep their
 * element between draws, so only changed transforms and contents touch the DOM.
 */
export class SvgDomBackend {
  readonly root: SVGGElement;
  private items = new Map<string, Item>();

  constructor(parent: SVGElement) {
    this.root = parent.ownerDocument.createElementNS(SVG_NS, 'g');
    parent.append(this.root);
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

      const markup = primitivesToSVG(isGroup ? p.children : [p], { interactive: true });
      if (markup !== item.markup) {
        el.innerHTML = markup;
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
    this.root.remove();
    this.items.clear();
  }
}

function setAttr(el: Element, name: string, value: string | null) {
  if (value == null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}
