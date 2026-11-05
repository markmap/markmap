import { describe, expect, it } from 'vitest';
import { assignIds, findNode, findPath, hashString, ROOT_ID, toPlainText, walkTree } from '.';
import type { Inline, MarkmapNode } from '.';

const text = (value: string): Inline[] => [{ type: 'text', value }];

const node = (label: string, children: MarkmapNode[] = []): MarkmapNode => ({
  id: '',
  type: 'listItem',
  content: text(label),
  attachments: [],
  data: {},
  children,
});

describe('toPlainText', () => {
  it('flattens nested inline content', () => {
    expect(
      toPlainText([
        { type: 'text', value: 'a ' },
        { type: 'strong', children: [{ type: 'emphasis', children: text('b') }] },
        { type: 'inlineCode', value: ' c' },
        { type: 'image', url: 'x.png', alt: ' d' },
      ]),
    ).toBe('a b c d');
  });
});

describe('hashString', () => {
  it('is deterministic and fixed-width', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
    expect(hashString('')).toHaveLength(7);
  });
});

describe('assignIds', () => {
  it('derives ids from the parent path and text', () => {
    const a = assignIds(node('R', [node('A', [node('X')]), node('B')]));
    const b = assignIds(node('Other root', [node('New'), node('A', [node('X')])]));
    expect(a.id).toBe(ROOT_ID);
    // Same path and text: same id, even with different siblings and root text.
    expect(b.children[1].id).toBe(a.children[0].id);
    expect(b.children[1].children[0].id).toBe(a.children[0].children[0].id);
    // Same text under a different parent: different id.
    expect(a.children[0].children[0].id).not.toBe(a.children[1].id);
  });

  it('separates siblings with the same text', () => {
    const root = assignIds(node('R', [node('A'), node('A'), node('A')]));
    expect(new Set(root.children.map((child) => child.id)).size).toBe(3);
  });
});

describe('tree utilities', () => {
  const root = assignIds(node('R', [node('A', [node('X')]), node('B')]));
  const x = root.children[0].children[0];

  it('walks in pre-order and can skip subtrees', () => {
    const visited: string[] = [];
    walkTree(root, (n, _parent, depth) => {
      visited.push(`${depth}:${toPlainText(n.content)}`);
      if (toPlainText(n.content) === 'A') return false;
    });
    expect(visited).toEqual(['0:R', '1:A', '1:B']);
  });

  it('finds nodes and paths by id', () => {
    expect(findNode(root, x.id)).toBe(x);
    expect(findPath(root, x.id)?.map((n) => toPlainText(n.content))).toEqual(['R', 'A', 'X']);
    expect(findNode(root, 'missing')).toBeUndefined();
  });
});
