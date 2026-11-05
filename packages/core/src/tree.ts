import type { Inline, MarkmapNode } from './types';

/** Return `false` from the visitor to skip a node's children. */
export type TreeVisitor = (
  node: MarkmapNode,
  parent: MarkmapNode | undefined,
  depth: number,
) => void | false;

/** Visit every node in pre-order. */
export function walkTree(root: MarkmapNode, visitor: TreeVisitor): void {
  const visit = (node: MarkmapNode, parent: MarkmapNode | undefined, depth: number) => {
    if (visitor(node, parent, depth) === false) return;
    for (const child of node.children) visit(child, node, depth + 1);
  };
  visit(root, undefined, 0);
}

/** Return the path from the root to the node with `id`, both included, or `undefined`. */
export function findPath(root: MarkmapNode, id: string): MarkmapNode[] | undefined {
  if (root.id === id) return [root];
  for (const child of root.children) {
    const path = findPath(child, id);
    if (path) return [root, ...path];
  }
  return undefined;
}

export function findNode(root: MarkmapNode, id: string): MarkmapNode | undefined {
  return findPath(root, id)?.at(-1);
}

/** Plain text of inline content, as used for ids, search and accessibility labels. */
export function toPlainText(content: readonly Inline[]): string {
  let text = '';
  for (const node of content) {
    if ('value' in node) text += node.value;
    else if (node.type === 'image' || node.type === 'imageReference') text += node.alt ?? '';
    else if (node.type === 'break') text += '\n';
    else if ('children' in node) text += toPlainText(node.children as Inline[]);
  }
  return text;
}
