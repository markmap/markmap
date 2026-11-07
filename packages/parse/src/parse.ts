import type { MarkmapNode } from '@markmap/core';
import type { Root } from 'mdast';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { type PluggableList, unified } from 'unified';
import { parse as parseYaml } from 'yaml';
import { remarkHtmlImages } from './html-image';
import { remarkMark, remarkResolveReferences } from './plugins';
import { toTree } from './to-tree';

export interface ParseOptions {
  /** Extra unified plugins, applied after the built-in ones (gfm, frontmatter, highlight, references). */
  plugins?: PluggableList;
}

export interface ParseResult {
  root: MarkmapNode;
  /** Parsed YAML frontmatter. Markmap options live under `markmap`; validate them with the theme in use. */
  frontmatter: Record<string, unknown>;
  /** Whether GFM was applied. It is skipped when the browser cannot run it, see `parseMdast`. */
  gfm: boolean;
}

export function parse(markdown: string, options: ParseOptions = {}): ParseResult {
  const { mdast, gfm } = parseMdast(markdown, options.plugins ?? []);
  const frontmatter = readFrontmatter(mdast);
  const title = typeof frontmatter.title === 'string' ? frontmatter.title : undefined;
  return { root: toTree(mdast, { title }), frontmatter, gfm };
}

/**
 * GFM depends on the most third-party code, and old browsers reject syntax it may use, like
 * regex lookbehind before Safari 16.4. A map without GFM is better than no map at all.
 */
function parseMdast(
  markdown: string,
  plugins: PluggableList,
  gfm = true,
): { mdast: Root; gfm: boolean } {
  const processor = unified()
    .use(remarkParse)
    .use(gfm ? [remarkGfm] : [])
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkHtmlImages)
    .use(remarkMark)
    .use(remarkResolveReferences)
    .use(plugins);
  try {
    return { mdast: processor.runSync(processor.parse(markdown)) as Root, gfm };
  } catch (error) {
    if (!gfm || !(error instanceof SyntaxError)) throw error;
    return parseMdast(markdown, plugins, false);
  }
}

function readFrontmatter(mdast: Root): Record<string, unknown> {
  const node = mdast.children.find((child) => child.type === 'yaml');
  if (!node) return {};
  try {
    const data: unknown = parseYaml(node.value);
    return data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
