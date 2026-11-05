import type { Attachment, Mark } from '@markmap/core';
import type { Element, Root as HastRoot } from 'hast';
import { defaultSchema, sanitize, type Schema } from 'hast-util-sanitize';
import { toHtml } from 'hast-util-to-html';
import type { Root } from 'mdast';
import { type State, toHast } from 'mdast-util-to-hast';

const schema: Schema = {
  ...defaultSchema,
  // GitHub's schema, plus <mark> for ==highlight==. Raw HTML never gets this far.
  tagNames: [...(defaultSchema.tagNames ?? []), 'mark'],
  // Keep ids readable; the default prefix exists to avoid clobbering page globals.
  clobberPrefix: 'mm-',
};

/**
 * Render attachment blocks as sanitized HTML. Loaded on demand by the view, so the
 * Markdown-to-HTML code stays out of the initial bundle.
 */
export function attachmentsToHtml(attachments: readonly Attachment[]): string {
  const mdast: Root = {
    type: 'root',
    children: attachments.map((a) => a.block) as Root['children'],
  };
  const hast = toHast(mdast, {
    handlers: {
      mark: (state: State, node: Mark): Element => ({
        type: 'element',
        tagName: 'mark',
        properties: {},
        children: state.all(node),
      }),
    },
  }) as HastRoot;
  const clean = sanitize(hast, schema) as HastRoot;
  for (const link of walkElements(clean, 'a')) {
    link.properties.target = '_blank';
    link.properties.rel = ['noopener', 'noreferrer'];
  }
  return toHtml(clean);
}

function* walkElements(node: HastRoot | Element, tagName: string): Generator<Element> {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (child.tagName === tagName) yield child;
    yield* walkElements(child, tagName);
  }
}
