import type { Mark } from '@markmap/core';
import type { Definition, Nodes, Parent, PhrasingContent, Root, Text } from 'mdast';

function visitParents(node: Nodes, fn: (parent: Parent) => void) {
  if (!('children' in node)) return;
  for (const child of node.children) visitParents(child, fn);
  fn(node);
}

/**
 * Turn `==text==` into `mark` nodes. Like `**`, the opening `==` must be followed by
 * a non-space and the closing one preceded by a non-space. Delimiters can wrap other
 * inline nodes (`==a **b**==`) but not cross block boundaries.
 */
export function remarkMark() {
  return (tree: Root) =>
    visitParents(tree, (parent) => {
      if (parent.children.some((child) => child.type === 'text' && child.value.includes('=='))) {
        parent.children = markChildren(parent.children as PhrasingContent[]) as Parent['children'];
      }
    });
}

type Token =
  | { delim: true; canOpen: boolean; canClose: boolean }
  | { delim: false; node: PhrasingContent };

function markChildren(children: PhrasingContent[]): PhrasingContent[] {
  const tokens: Token[] = [];
  for (const child of children) {
    if (child.type !== 'text') {
      tokens.push({ delim: false, node: child });
      continue;
    }
    child.value.split(/(==)/).forEach((part) => {
      if (part === '==') tokens.push({ delim: true, canOpen: false, canClose: false });
      else if (part) tokens.push({ delim: false, node: { type: 'text', value: part } });
    });
  }

  const edgeChar = (token: Token | undefined, end: boolean) => {
    if (!token) return '';
    if (token.delim) return '=';
    if (token.node.type === 'text') return end ? token.node.value.at(-1)! : token.node.value[0];
    return 'x';
  };
  tokens.forEach((token, i) => {
    if (!token.delim) return;
    const next = edgeChar(tokens[i + 1], false);
    const prev = edgeChar(tokens[i - 1], true);
    token.canOpen = !!next && !/\s/.test(next);
    token.canClose = !!prev && !/\s/.test(prev);
  });

  const pairs = new Map<number, number>();
  let open = -1;
  tokens.forEach((token, i) => {
    if (!token.delim) return;
    if (open >= 0 && token.canClose && i > open + 1) {
      pairs.set(open, i);
      open = -1;
    } else if (open < 0 && token.canOpen) open = i;
  });

  const build = (from: number, to: number): PhrasingContent[] => {
    const result: PhrasingContent[] = [];
    const pushText = (value: string) => {
      const last = result.at(-1);
      if (last?.type === 'text') last.value += value;
      else result.push({ type: 'text', value } satisfies Text);
    };
    for (let i = from; i < to; i += 1) {
      const token = tokens[i];
      const close = pairs.get(i);
      if (close != null) {
        result.push({ type: 'mark', children: build(i + 1, close) } satisfies Mark);
        i = close;
      } else if (token.delim) pushText('==');
      else if (token.node.type === 'text') pushText(token.node.value);
      else result.push(token.node);
    }
    return result;
  };
  return build(0, tokens.length);
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
