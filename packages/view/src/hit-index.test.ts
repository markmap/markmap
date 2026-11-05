import type { Primitive } from '@markmap/core';
import { describe, expect, it } from 'vitest';
import { HitIndex } from './hit-index';

const rect = { x: 0, y: 0, width: 10, height: 10 };

const node = (nodeId: string, x: number, y: number, children: Primitive[]): Primitive => ({
  kind: 'group',
  nodeId,
  transform: [1, 0, 0, 1, x, y],
  children,
});

describe('HitIndex', () => {
  it('finds nothing in an empty drawing', () => {
    expect(new HitIndex([]).hit(0, 0)).toBeUndefined();
  });

  it('places hit areas and links with their group transforms', () => {
    const index = new HitIndex([
      node('a', 100, 50, [
        { kind: 'hit', action: 'attachments', rect },
        // Nested and scaled: covers 120..140 × 50..70.
        {
          kind: 'group',
          transform: [2, 0, 0, 2, 20, 0],
          children: [{ kind: 'link', href: 'https://example.com', rect }],
        },
      ]),
    ]);
    expect(index.hit(105, 55)).toEqual({ kind: 'action', nodeId: 'a', action: 'attachments' });
    expect(index.hit(139, 69)).toEqual({ kind: 'link', nodeId: 'a', href: 'https://example.com' });
    expect(index.hit(115, 55)).toBeUndefined();
    expect(index.hit(5, 5)).toBeUndefined();
  });

  it('finds the nearest toggle within the radius', () => {
    const index = new HitIndex([], {
      toggles: [
        { nodeId: 'a', x: 0, y: 0 },
        { nodeId: 'b', x: 12, y: 0 },
      ],
      toggleRadius: 10,
    });
    expect(index.hit(4, 0)).toEqual({ kind: 'toggle', nodeId: 'a' });
    expect(index.hit(8, 0)).toEqual({ kind: 'toggle', nodeId: 'b' });
    // Inside the box around the anchor but outside the circle.
    expect(index.hit(-8, -8)).toBeUndefined();
  });

  it('prefers actions over toggles, and the topmost action', () => {
    const index = new HitIndex(
      [
        node('a', 0, 0, [{ kind: 'hit', action: 'first', rect }]),
        node('b', 0, 0, [{ kind: 'hit', action: 'second', rect }]),
      ],
      { toggles: [{ nodeId: 'c', x: 5, y: 5 }] },
    );
    expect(index.hit(5, 5)).toEqual({ kind: 'action', nodeId: 'b', action: 'second' });
  });

  it('leaves out nodes that are not included', () => {
    const index = new HitIndex([node('gone', 0, 0, [{ kind: 'hit', action: 'x', rect }])], {
      toggles: [{ nodeId: 'gone', x: 5, y: 5 }],
      include: (id) => id !== 'gone',
    });
    expect(index.hit(5, 5)).toBeUndefined();
  });

  it('handles many targets', () => {
    const primitives = Array.from({ length: 2000 }, (_, i) =>
      node(`n${i}`, (i % 50) * 20, Math.floor(i / 50) * 20, [{ kind: 'hit', action: 'x', rect }]),
    );
    const index = new HitIndex(primitives);
    expect(index.hit(20 * 7 + 3, 20 * 9 + 3)).toMatchObject({ nodeId: 'n457' });
    expect(index.hit(20 * 7 + 15, 20 * 9 + 3)).toBeUndefined();
  });
});
