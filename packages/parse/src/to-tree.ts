import { assignIds, type Attachment, type MarkmapNode, type MdastBlock } from '@markmap/core';
import type { List, ListItem, Node, PhrasingContent, Root, RootContent } from 'mdast';

export interface ToTreeOptions {
  /** Title for a synthesized root, usually from frontmatter. */
  title?: string;
}

/**
 * Convert an mdast tree into a Markmap tree.
 *
 * - Headings nest by depth; list items nest under the heading or item that contains them.
 * - Other blocks become attachments of the node that owns them. Blocks before the first
 *   heading attach to the root.
 * - A lone top-level H1 becomes the root, unless `title` is given.
 * - Raw HTML, frontmatter and link definitions are dropped. A `<!-- markmap: … -->`
 *   comment in a label sets node options: `fold` folds the node, `foldAll` folds it
 *   and everything below.
 */
export function toTree(mdast: Root, options: ToTreeOptions = {}): MarkmapNode {
  let root = createNode('root', options.title ? [{ type: 'text', value: options.title }] : []);
  const stack: { depth: number; node: MarkmapNode }[] = [{ depth: 0, node: root }];

  for (const block of mdast.children) {
    if (block.type === 'heading') {
      while (stack.length > 1 && stack.at(-1)!.depth >= block.depth) stack.pop();
      const node = createNode('heading', block.children, block);
      node.data.depth = block.depth;
      stack.at(-1)!.node.children.push(node);
      stack.push({ depth: block.depth, node });
    } else {
      addBlock(stack.at(-1)!.node, block);
    }
  }

  if (!options.title) root = promoteSingleH1(root);
  return assignIds(root);
}

function createNode(type: string, label: PhrasingContent[], source?: Node): MarkmapNode {
  const { content, directives } = readLabel(label);
  const node: MarkmapNode = { id: '', type, content, attachments: [], data: {}, children: [] };
  if (directives.has('fold')) node.data.fold = true;
  if (directives.has('foldAll')) node.data.foldAll = true;
  const start = source?.position?.start.offset;
  const end = source?.position?.end.offset;
  if (start != null && end != null) node.position = { start, end };
  return node;
}

function addBlock(parent: MarkmapNode, block: RootContent) {
  switch (block.type) {
    case 'list':
      addList(parent, block);
      return;
    case 'html':
    case 'yaml':
    case 'definition':
      return;
    default:
      attach(parent, block as MdastBlock);
  }
}

function addList(parent: MarkmapNode, list: List) {
  for (const item of list.children) parent.children.push(fromListItem(item, list));
}

function fromListItem(item: ListItem, list: List): MarkmapNode {
  const [first, ...rest] = item.children;
  // `- # Title` uses the heading as the label too.
  const hasLabel = first?.type === 'paragraph' || first?.type === 'heading';
  const node = createNode('listItem', hasLabel ? first.children : [], item);
  if (list.ordered) node.data.ordered = true;
  if (item.checked != null) node.data.checked = item.checked;
  for (const block of hasLabel ? rest : item.children) addBlock(node, block);
  return node;
}

function attach(node: MarkmapNode, block: MdastBlock) {
  const attachment: Attachment = { block: stripPositions(block), after: node.children.length };
  node.attachments.push(attachment);
}

function promoteSingleH1(root: MarkmapNode): MarkmapNode {
  const [only] = root.children;
  if (root.children.length !== 1 || only.type !== 'heading' || only.data.depth !== 1) return root;
  // Blocks before the H1 come first in source order.
  only.attachments = [...root.attachments.map((a) => ({ ...a, after: 0 })), ...only.attachments];
  return only;
}

/** Drop mdast `position` fields so the tree stays small and serializable. */
function stripPositions<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripPositions) as T;
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (key !== 'position') result[key] = stripPositions(child);
    }
    return result as T;
  }
  return value;
}

const DIRECTIVE = /^<!--\s*markmap:\s*([\s\S]*?)\s*-->$/;

/** Drop raw HTML from a label, collecting `<!-- markmap: … -->` directives on the way. */
function readLabel(label: PhrasingContent[]): {
  content: PhrasingContent[];
  directives: Set<string>;
} {
  const directives = new Set<string>();
  const clean = (nodes: PhrasingContent[]): PhrasingContent[] =>
    nodes.flatMap((node): PhrasingContent[] => {
      if (node.type === 'html') {
        const match = node.value.trim().match(DIRECTIVE);
        for (const word of match?.[1].split(/\s+/) ?? []) if (word) directives.add(word);
        return [];
      }
      if ('children' in node)
        return [
          { ...node, children: clean(node.children as PhrasingContent[]) } as PhrasingContent,
        ];
      return [node];
    });
  const content = stripPositions(clean(label));
  // `Label <!-- markmap: fold -->` leaves a trailing space behind.
  const last = content.at(-1);
  if (last?.type === 'text') {
    last.value = last.value.trimEnd();
    if (!last.value) content.pop();
  }
  return { content, directives };
}
