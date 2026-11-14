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
  return (tree: Root, file: { value: unknown }) => {
    const source = typeof file.value === 'string' ? file.value : '';
    visitParents(tree, (parent) => {
      if (parent.children.some((child) => child.type === 'text' && child.value.includes('=='))) {
        parent.children = markChildren(
          parent.children as PhrasingContent[],
          source,
        ) as Parent['children'];
      }
    });
  };
}

// A backslash escape, a character reference, or a plain `=`.
const SOURCE_EQUALS =
  /\\[!-/:-@[-`{-~]|&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[A-Za-z][A-Za-z\d]{0,31});|=/g;

function isEncodedEquals(reference: string) {
  const name = reference.slice(1, -1);
  if (name === 'equals') return true;
  if (name[0] !== '#') return false;
  const hex = name[1] === 'x' || name[1] === 'X';
  return Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10) === 0x3d;
}

/**
 * Indexes of the `=` in a text node that were written as `\=` or `&#61;` and so must stay
 * literal. remark has already decoded them, so they are found in the source. If the source
 * does not line up with the text, nothing is reported and every `=` can be a delimiter.
 */
function escapedEquals(node: Text, source: string): Set<number> {
  const escaped = new Set<number>();
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start == null || end == null) return escaped;
  const literal: boolean[] = [];
  for (const [match] of source.slice(start, end).matchAll(SOURCE_EQUALS)) {
    if (match === '=') literal.push(false);
    else if (match === '\\=' || (match[0] === '&' && isEncodedEquals(match))) literal.push(true);
  }
  const indexes: number[] = [];
  for (let i = node.value.indexOf('='); i >= 0; i = node.value.indexOf('=', i + 1)) indexes.push(i);
  if (indexes.length !== literal.length) return escaped;
  indexes.forEach((index, i) => literal[i] && escaped.add(index));
  return escaped;
}

type Token =
  | { delim: true; canOpen: boolean; canClose: boolean }
  | { delim: false; node: PhrasingContent };

function markChildren(children: PhrasingContent[], source: string): PhrasingContent[] {
  const tokens: Token[] = [];
  for (const child of children) {
    if (child.type !== 'text') {
      tokens.push({ delim: false, node: child });
      continue;
    }
    const { value } = child;
    const escaped = escapedEquals(child, source);
    let text = '';
    for (let i = 0; i < value.length; i += 1) {
      if (value.startsWith('==', i) && !escaped.has(i) && !escaped.has(i + 1)) {
        if (text) tokens.push({ delim: false, node: { type: 'text', value: text } });
        tokens.push({ delim: true, canOpen: false, canClose: false });
        text = '';
        i += 1;
      } else text += value[i];
    }
    if (text) tokens.push({ delim: false, node: { type: 'text', value: text } });
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
