import { type MarkmapJSONOptions, type MarkmapNode, readJSONOptions } from '@markmap/core';
import type { Root } from 'mdast';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { type PluggableList, unified } from 'unified';
import { parse as parseYaml } from 'yaml';
import { remarkMark, remarkResolveReferences } from './plugins';
import { toTree } from './to-tree';

export interface ParseOptions {
  /** Extra unified plugins, applied after the built-in ones (gfm, frontmatter, highlight, references). */
  plugins?: PluggableList;
}

export interface ParseResult {
  root: MarkmapNode;
  frontmatter: Record<string, unknown>;
  /** Validated options from the frontmatter `markmap` key. */
  options: MarkmapJSONOptions;
  /** Options that were ignored, and why. */
  warnings: string[];
}

export function parse(markdown: string, options: ParseOptions = {}): ParseResult {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkMark)
    .use(remarkResolveReferences)
    .use(options.plugins ?? []);
  const mdast = processor.runSync(processor.parse(markdown)) as Root;
  const frontmatter = readFrontmatter(mdast);
  const title = typeof frontmatter.title === 'string' ? frontmatter.title : undefined;
  const { options: markmapOptions, warnings } = readJSONOptions(frontmatter.markmap);
  return { root: toTree(mdast, { title }), frontmatter, options: markmapOptions, warnings };
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
