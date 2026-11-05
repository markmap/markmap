import type { Element, Root as HastRoot } from 'hast';

/** Languages named by `<pre><code class="language-…">` blocks. */
export function codeLanguages(tree: HastRoot): string[] {
  const languages: string[] = [];
  for (const pre of walkElements(tree, 'pre')) {
    const code = pre.children.find((c): c is Element => c.type === 'element');
    const lang = languageOf(code);
    if (lang) languages.push(lang);
  }
  return languages;
}

export function languageOf(code: Element | undefined): string | undefined {
  if (code?.tagName !== 'code') return undefined;
  const classes = code.properties.className;
  const list = Array.isArray(classes) ? classes : [];
  const name = list.find((c) => typeof c === 'string' && c.startsWith('language-'));
  return typeof name === 'string' ? name.slice('language-'.length) : undefined;
}

export function* walkElements(node: HastRoot | Element, tagName: string): Generator<Element> {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (child.tagName === tagName) yield child;
    yield* walkElements(child, tagName);
  }
}
