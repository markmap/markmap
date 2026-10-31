import type { INode } from 'markmap-common';
import { expect, test } from 'vitest';
import { defaultOptions } from '../src/constants';
import { Markmap } from '../src/view';

function createLayout(nodeMinHeight: number, heights = [20, 20, 20]) {
  const markmap = Object.create(Markmap.prototype) as Markmap;
  markmap.options = { ...defaultOptions, nodeMinHeight };
  const root = markmap['_initializeData']({
    content: 'Root',
    children: [
      { content: 'First', children: [] },
      { content: 'Second', children: [] },
    ],
  });
  const nodes = [root, ...root.children];
  markmap.state = {
    id: 'test',
    data: root,
    rect: { x1: 0, x2: 0, y1: 0, y2: 0 },
  };
  // Supply content measurements while exercising the real layout algorithm.
  markmap.g = {
    selectAll: () => ({
      selectAll: () => ({
        each(callback: (this: unknown, node: INode) => void) {
          nodes.forEach((node, index) => {
            callback.call(
              {
                firstChild: {
                  firstChild: {
                    scrollWidth: 100,
                    scrollHeight: heights[index],
                  },
                },
              },
              node,
            );
          });
        },
      }),
    }),
  } as unknown as Markmap['g'];
  return { markmap, nodes };
}

test('reserve the configured minimum height for short nodes', () => {
  const { markmap, nodes } = createLayout(80);
  markmap['_relayout']();

  expect(nodes.map((node) => node.state.rect.height)).toEqual([80, 80, 80]);
  const [first, second] = nodes.slice(1).map((node) => node.state.rect);
  expect(second.y).toBeGreaterThanOrEqual(
    first.y + 80 + defaultOptions.spacingVertical,
  );
  expect(markmap.state.rect.y2 - markmap.state.rect.y1).toBeGreaterThanOrEqual(
    160,
  );
});

test('preserve content taller than the configured minimum', () => {
  const { markmap, nodes } = createLayout(80, [20, 120, 20]);
  markmap['_relayout']();

  expect(nodes.map((node) => node.state.rect.height)).toEqual([80, 120, 80]);
  const [first, second] = nodes.slice(1).map((node) => node.state.rect);
  expect(second.y).toBeGreaterThanOrEqual(
    first.y + first.height + defaultOptions.spacingVertical,
  );
});

test('allow reducing the minimum height without changing content measurements', () => {
  const { markmap, nodes } = createLayout(80);
  markmap['_relayout']();
  markmap.options.nodeMinHeight = 16;
  markmap['_relayout']();

  expect(nodes.map((node) => node.state.size[1])).toEqual([20, 20, 20]);
  expect(nodes.map((node) => node.state.rect.height)).toEqual([20, 20, 20]);
});
