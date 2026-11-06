import type { Image, Nodes } from 'mdast';

/** Visit every node of a Markdown tree. */
export function walk(node: Nodes, visit: (node: Nodes) => void): void {
  visit(node);
  if ('children' in node) for (const child of node.children) walk(child, visit);
}

/** Remark plugin that swaps image URLs, in labels and notes alike. */
export function remarkReplaceImages(images: ReadonlyMap<string, string>) {
  return () => (tree: Nodes) => {
    walk(tree, (node) => {
      if (node.type !== 'image') return;
      const image: Image = node;
      image.url = images.get(image.url) ?? image.url;
    });
  };
}
