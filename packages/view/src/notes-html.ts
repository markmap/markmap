import type { Note, ContentPlugin, Mark } from '@markmap/core';
import type { Element, Root as HastRoot } from 'hast';
import { defaultSchema, sanitize, type Schema } from 'hast-util-sanitize';
import { toHtml } from 'hast-util-to-html';
import type { Root } from 'mdast';
import { type State, toHast } from 'mdast-util-to-hast';
import { codeLanguages, walkElements } from './hast-utils';

const schema: Schema = {
  ...defaultSchema,
  // GitHub's schema, plus <mark> for ==highlight==. Raw HTML never gets this far.
  tagNames: [...(defaultSchema.tagNames ?? []), 'mark'],
  // `src` is only allowed on images, where `data:` cannot run anything.
  protocols: { ...defaultSchema.protocols, src: [...(defaultSchema.protocols?.src ?? []), 'data'] },
  // Keep ids readable; the default prefix exists to avoid clobbering page globals.
  clobberPrefix: 'mm-',
};

export interface NotesHtmlOptions {
  /** Plugins whose `popover` hooks run on the sanitized tree, in order. */
  plugins?: readonly ContentPlugin[];
  /** Color code blocks that name a language. Defaults to `true`. */
  highlight?: boolean;
}

/**
 * Render note blocks as HTML: Markdown to HTML, sanitized, then code highlighting
 * and plugin hooks, which may add trusted markup. Loaded on demand by the view, and
 * the highlighter only when a code block names a language, so neither weighs on the
 * initial bundle.
 */
export async function notesToHtml(
  notes: readonly Note[],
  options: NotesHtmlOptions = {},
): Promise<string> {
  const mdast: Root = {
    type: 'root',
    children: notes.map((a) => a.block) as Root['children'],
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
  if (options.highlight !== false && codeLanguages(clean).length) {
    const { highlightCode } = await import('./highlight');
    highlightCode(clean);
  }
  for (const plugin of options.plugins ?? []) await plugin.popover?.(clean);
  // Raw nodes can only come from the hooks above: sanitizing removed any from Markdown.
  return toHtml(clean, { allowDangerousHtml: true });
}
