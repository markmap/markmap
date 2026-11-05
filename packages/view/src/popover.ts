import type { Rect } from '@markmap/core';

const STYLE_ID = 'markmap-popover-style';

const CSS = `
.markmap-popover {
  position: fixed;
  z-index: 1000;
  box-sizing: border-box;
  max-width: min(420px, calc(100vw - 16px));
  max-height: min(50vh, 480px);
  overflow: auto;
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  background: var(--mm-bg, #fff);
  color: var(--mm-color, #333);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  font: 14px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
}
/* Focused programmatically so Escape and screen readers land here; no ring needed. */
.markmap-popover:focus { outline: none; }
.markmap-popover > :first-child { margin-top: 0; }
.markmap-popover > :last-child { margin-bottom: 0; }
.markmap-popover p, .markmap-popover pre, .markmap-popover blockquote,
.markmap-popover table, .markmap-popover ul, .markmap-popover ol { margin: 0.5em 0; }
.markmap-popover a { color: var(--mm-link-color, #0097e6); }
.markmap-popover code {
  padding: 0.1em 0.3em;
  border-radius: 3px;
  background: var(--mm-code-bg, #f0f0f0);
  color: var(--mm-code-color, #555);
  font: 0.9em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.markmap-popover pre { padding: 8px; overflow: auto; border-radius: 4px; background: var(--mm-code-bg, #f0f0f0); }
.markmap-popover pre code { padding: 0; background: none; }
.markmap-popover blockquote { padding-left: 0.8em; border-left: 3px solid rgba(0, 0, 0, 0.15); color: inherit; opacity: 0.85; }
.markmap-popover table { border-collapse: collapse; }
.markmap-popover th, .markmap-popover td { padding: 2px 8px; border: 1px solid rgba(0, 0, 0, 0.15); }
.markmap-popover mark { background: var(--mm-mark-bg, #ffeaa7); color: inherit; }
.markmap-popover img { max-width: 100%; }
`;

function ensureStyle(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.append(style);
}

const GAP = 6;
const MARGIN = 8;

/** A floating panel next to a node, outside the SVG so it does not scale with zoom. */
export class Popover {
  readonly el: HTMLDivElement;

  constructor(doc: Document, html: string, tokens: Record<string, string>) {
    ensureStyle(doc);
    this.el = doc.createElement('div');
    this.el.className = 'markmap-popover';
    this.el.setAttribute('role', 'dialog');
    this.el.tabIndex = -1;
    for (const [name, value] of Object.entries(tokens))
      this.el.style.setProperty(`--${name}`, value);
    this.el.innerHTML = html;
    doc.body.append(this.el);
  }

  /** Place below `anchor` (a rect in viewport coordinates), or above when there is no room. */
  position(anchor: Rect): void {
    const view = this.el.ownerDocument.defaultView;
    const vw = view?.innerWidth ?? 0;
    const vh = view?.innerHeight ?? 0;
    const { width, height } = this.el.getBoundingClientRect();
    const below = anchor.y + anchor.height + GAP;
    const above = anchor.y - GAP - height;
    const top = below + height <= vh - MARGIN || above < MARGIN ? below : above;
    const left = Math.min(Math.max(MARGIN, anchor.x), Math.max(MARGIN, vw - width - MARGIN));
    this.el.style.top = `${Math.round(top)}px`;
    this.el.style.left = `${Math.round(left)}px`;
  }

  contains(node: Node | null): boolean {
    return !!node && this.el.contains(node);
  }

  destroy(): void {
    this.el.remove();
  }
}
