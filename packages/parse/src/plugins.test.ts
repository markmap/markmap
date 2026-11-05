import type { PhrasingContent } from 'mdast';
import { describe, expect, it } from 'vitest';
import { parse } from '.';

const label = (md: string): PhrasingContent[] => parse(`- ${md}`).root.children[0].content;

describe('remarkMark', () => {
  it('wraps ==text== in mark nodes', () => {
    expect(label('a ==b== c')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'mark', children: [{ type: 'text', value: 'b' }] },
      { type: 'text', value: ' c' },
    ]);
  });

  it('wraps other inline nodes', () => {
    expect(label('==a **b**==')).toEqual([
      {
        type: 'mark',
        children: [
          { type: 'text', value: 'a ' },
          { type: 'strong', children: [{ type: 'text', value: 'b' }] },
        ],
      },
    ]);
  });

  it('works inside other inline nodes', () => {
    expect(label('**==a==**')).toEqual([
      { type: 'strong', children: [{ type: 'mark', children: [{ type: 'text', value: 'a' }] }] },
    ]);
  });

  it('needs non-space next to the delimiters', () => {
    expect(label('a == b == c')).toEqual([{ type: 'text', value: 'a == b == c' }]);
    expect(label('a ==b')).toEqual([{ type: 'text', value: 'a ==b' }]);
    expect(label('====')).toEqual([{ type: 'text', value: '====' }]);
  });

  it('leaves code alone', () => {
    expect(label('`==a==`')).toEqual([{ type: 'inlineCode', value: '==a==' }]);
  });
});

describe('remarkResolveReferences', () => {
  it('turns references into links and images', () => {
    const content = label('[a][r] ![b][r]\n\n[r]: https://x.y "T"');
    expect(content).toEqual([
      { type: 'link', url: 'https://x.y', title: 'T', children: [{ type: 'text', value: 'a' }] },
      { type: 'text', value: ' ' },
      { type: 'image', url: 'https://x.y', title: 'T', alt: 'b' },
    ]);
  });

  it('resolves definitions that appear before use and in other sections', () => {
    const { root } = parse('[r]: https://x.y\n\n# A\n\n- [a][r]');
    expect(root.children[0].content[0]).toMatchObject({ type: 'link', url: 'https://x.y' });
  });
});
