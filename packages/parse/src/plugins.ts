import type { Definition, Nodes, Parent, Root } from 'mdast';

function visit(node: Nodes, fn: (node: Nodes) => void) {
  if ('children' in node) {
    for (const child of node.children) visit(child, fn);
  }
  fn(node);
}

/** Replace `[text][ref]` and `![alt][ref]` with plain links and images, and drop definitions. */
export function remarkResolveReferences() {
  return (tree: Root) => {
    const definitions = new Map<string, Definition>();
    visit(tree, (node) => {
      if (node.type === 'definition' && !definitions.has(node.identifier)) {
        definitions.set(node.identifier, node);
      }
    });
    visit(tree, (parent) => {
      if (!('children' in parent)) return;
      parent.children = parent.children.flatMap((child): Nodes[] => {
        if (child.type === 'linkReference') {
          const def = definitions.get(child.identifier);
          return def
            ? [{ type: 'link', url: def.url, title: def.title, children: child.children }]
            : child.children;
        }
        if (child.type === 'imageReference') {
          const def = definitions.get(child.identifier);
          return def
            ? [{ type: 'image', url: def.url, title: def.title, alt: child.alt }]
            : [{ type: 'text', value: child.alt ?? '' }];
        }
        return [child];
      }) as Parent['children'];
    });
  };
}
