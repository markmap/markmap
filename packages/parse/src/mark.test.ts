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
  it('does not use escaped or encoded `=` as a delimiter', () => {
    expect(label('\\=\\=a\\=\\=')).toEqual([{ type: 'text', value: '==a==' }]);
    expect(label('a\\==b==')).toEqual([{ type: 'text', value: 'a==b==' }]);
    expect(label('==a=\\=')).toEqual([{ type: 'text', value: '==a==' }]);
    expect(label('&#61;&#61;a&equals;&#x3D;')).toEqual([{ type: 'text', value: '==a==' }]);
  });

  it('still uses unescaped delimiters next to escapes', () => {
    expect(label('\\===a==')).toEqual([
      { type: 'text', value: '=' },
      { type: 'mark', children: [{ type: 'text', value: 'a' }] },
    ]);
    expect(label('\\\\==a==')).toEqual([
      { type: 'text', value: '\\' },
      { type: 'mark', children: [{ type: 'text', value: 'a' }] },
    ]);
    expect(label('&amp; ==a==')).toEqual([
      { type: 'text', value: '& ' },
      { type: 'mark', children: [{ type: 'text', value: 'a' }] },
    ]);
  });

  it('handles escapes in multi-line text', () => {
    expect(label('==a\n  b\\=\\= c==')).toEqual([
      { type: 'mark', children: [{ type: 'text', value: 'a\nb== c' }] },
    ]);
  });

  it('treats runs other than two `=` as text', () => {
    expect(label('===a===')).toEqual([{ type: 'text', value: '===a===' }]);
    expect(label('a = b')).toEqual([{ type: 'text', value: 'a = b' }]);
  });

  it('works within words and across emphasis', () => {
    expect(label('a==b==c')).toEqual([
      { type: 'text', value: 'a' },
      { type: 'mark', children: [{ type: 'text', value: 'b' }] },
      { type: 'text', value: 'c' },
    ]);
    expect(label('*==a==*')).toEqual([
      { type: 'emphasis', children: [{ type: 'mark', children: [{ type: 'text', value: 'a' }] }] },
    ]);
  });

  it('does not cross links or autolinks', () => {
    expect(label('==[a==](u)')).toEqual([
      { type: 'text', value: '==' },
      { type: 'link', url: 'u', title: null, children: [{ type: 'text', value: 'a==' }] },
    ]);
    expect(label('<https://x.y/?a==b> ==c==')).toMatchObject([
      { type: 'link', url: 'https://x.y/?a==b' },
      { type: 'text', value: ' ' },
      { type: 'mark', children: [{ type: 'text', value: 'c' }] },
    ]);
  });
});
