import type { Html, Image, Nodes, Paragraph, Parent, Root } from 'mdast';

export interface HtmlImage {
  src: string;
  alt: string;
  /** In px. Missing when not given, or not in px (such as a percentage). */
  width?: number;
  height?: number;
}

const TAG =
  /^<img((?:\s+[a-z][a-z0-9-]*(?:\s*=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s"'=<>`]+))?)*)\s*\/?>$/i;
const ATTR = /([a-z][a-z0-9-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gi;
const PIXELS = /^(\d+(?:\.\d+)?)(?:px)?$/;
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

const decode = (value: string) => value.replace(/&(?:amp|quot|#39|lt|gt);/g, (e) => ENTITIES[e]);

function pixels(value: string | undefined): number | undefined {
  const match = value && PIXELS.exec(value.trim());
  const n = match ? Number(match[1]) : 0;
  return n > 0 ? n : undefined;
}

/**
 * Read one GitHub-style `<img>` tag: exactly one tag, nothing around it, well-formed
 * attributes. Only `src`, `alt`, `width` and `height` are kept; other attributes are
 * ignored. Returns `undefined` for anything else, which callers then drop.
 */
export function parseHtmlImage(html: string): HtmlImage | undefined {
  const match = TAG.exec(html.trim());
  if (!match) return undefined;
  const attrs = new Map<string, string>();
  for (const [, name, ...values] of match[1].matchAll(ATTR)) {
    const key = name.toLowerCase();
    if (!attrs.has(key)) attrs.set(key, decode(values.find((v) => v != null) ?? ''));
  }
  const src = attrs.get('src')?.trim();
  if (!src) return undefined;
  return {
    src,
    alt: attrs.get('alt') ?? '',
    width: pixels(attrs.get('width')),
    height: pixels(attrs.get('height')),
  };
}

function toImage(html: Html): Image | undefined {
  const parsed = parseHtmlImage(html.value);
  if (!parsed) return undefined;
  const size = {
    ...(parsed.width && { width: parsed.width }),
    ...(parsed.height && { height: parsed.height }),
  };
  // `hProperties` carries the size through mdast-util-to-hast for popovers.
  return { type: 'image', url: parsed.src, alt: parsed.alt, data: { ...size, hProperties: size } };
}

/** Parents whose children are blocks, where an `<img>` line becomes its own paragraph. */
const FLOW = new Set(['root', 'listItem', 'blockquote', 'footnoteDefinition']);

/**
 * Turn raw `<img>` tags into `image` nodes, inline and on their own line. All other raw
 * HTML is left alone for later steps to drop.
 */
export function remarkHtmlImages() {
  const visit = (node: Nodes) => {
    if (!('children' in node)) return;
    const parent = node as Parent;
    parent.children = parent.children.map((child) => {
      if (child.type !== 'html') {
        visit(child);
        return child;
      }
      const image = toImage(child);
      if (!image) return child;
      if (!FLOW.has(parent.type)) return image;
      return { type: 'paragraph', children: [image] } satisfies Paragraph;
    }) as Parent['children'];
  };
  return (tree: Root) => visit(tree);
}
