import type { PhrasingContent } from 'mdast';
import { describe, expect, it } from 'vitest';
import { parse } from '.';

const label = (md: string): PhrasingContent[] => parse(`- ${md}`).root.children[0].content;

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
