import type { Definition, Nodes, Parent, Root } from 'mdast';

function visitParents(node: Nodes, fn: (parent: Parent) => void) {
  if (!('children' in node)) return;
  for (const child of node.children) visitParents(child, fn);
  fn(node);
}

/** Replace `[text][ref]` and `![alt][ref]` with plain links and images, and drop definitions. */
export function remarkResolveReferences() {
  return (tree: Root) => {
    const definitions = new Map<string, Definition>();
    visitParents(tree, (parent) => {
      for (const child of parent.children) {
        if (child.type === 'definition') definitions.set(child.identifier, child);
      }
    });
    visitParents(tree, (parent) => {
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
