import type { Element, ElementContent, Root } from 'hast';
import { toText } from 'hast-util-to-text';
import { common, createLowlight } from 'lowlight';
import { languageOf, walkElements } from './hast-utils';

const lowlight = createLowlight(common);

/**
 * Color `<pre><code class="language-…">` blocks in place with highlight.js classes
 * (`hljs-keyword`, …). Unknown languages are left as they are. The tree must already be
 * sanitized: the highlighter only adds spans around the code's own text.
 */
export function highlightCode(tree: Root): void {
  for (const pre of walkElements(tree, 'pre')) {
    const code = pre.children.find((c): c is Element => c.type === 'element');
    const lang = languageOf(code);
    if (!code || !lang || !lowlight.registered(lang)) continue;
    const result = lowlight.highlight(lang, toText(code, { whitespace: 'pre' }));
    code.children = result.children as ElementContent[];
    code.properties.className = [...(code.properties.className as string[]), 'hljs'];
  }
}
