import { toPlainText } from './tree';
import type { MarkmapNode } from './types';

export const ROOT_ID = 'root';

/** 32-bit FNV-1a hash of a string, in base 36. */
export function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

/**
 * Assign stable ids in place. The root is always `root`. Every other id is a hash of
 * the parent id and the node's plain text, so ids survive edits elsewhere in the
 * document. Siblings with the same text are told apart by their occurrence index.
 */
export function assignIds(root: MarkmapNode): MarkmapNode {
  const assign = (node: MarkmapNode, id: string) => {
    node.id = id;
    const seen = new Map<string, number>();
    for (const child of node.children) {
      const text = toPlainText(child.content);
      const index = seen.get(text) ?? 0;
      seen.set(text, index + 1);
      assign(child, hashString(`${id}\0${text}${index ? `\0${index}` : ''}`));
    }
  };
  assign(root, ROOT_ID);
  return root;
}
