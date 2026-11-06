import { toPlainText } from '@markmap/core';
import type { Image, Paragraph } from 'mdast';
import { describe, expect, it } from 'vitest';
import { parseHtmlImage } from './html-image';
import { parse } from './parse';

describe('parseHtmlImage', () => {
  it('reads src, alt and pixel sizes', () => {
    expect(parseHtmlImage('<img src="a.png" width="120" height="80px" alt="A &amp; B">')).toEqual({
      src: 'a.png',
      alt: 'A & B',
      width: 120,
      height: 80,
    });
    expect(parseHtmlImage("<img src='x.png' width=50%/>")).toEqual({
      src: 'x.png',
      alt: '',
      width: undefined,
      height: undefined,
    });
  });

  it('ignores other attributes but drops anything malformed or extra', () => {
    expect(parseHtmlImage('<img src="a.png" onerror="alert(1)" align="right">')?.src).toBe('a.png');
    for (const html of [
      '<img>',
      '<img src="">',
      '<img src="a.png"><b>',
      'x <img src="a.png">',
      '<img src="a.png" <script>>',
      '<image src="a.png">',
      '<img src="a.png" alt="x>',
    ]) {
      expect(parseHtmlImage(html)).toBeUndefined();
    }
  });
});

describe('parse with <img>', () => {
  it('turns inline and standalone tags into image nodes', () => {
    const { root } = parse(
      '# Logo <img src="logo.png" width="32" height="32" alt="logo">\n\n- <img src="b.png">\n- a <b>bold</b>',
    );
    const [image] = root.content.filter((n) => n.type === 'image') as Image[];
    expect(image).toMatchObject({ url: 'logo.png', alt: 'logo', data: { width: 32, height: 32 } });
    expect(root.children[0].content).toMatchObject([{ type: 'image', url: 'b.png' }]);
    // Other HTML is still dropped.
    expect(toPlainText(root.children[1].content)).toBe('a bold');
  });

  it('keeps sized images in notes', () => {
    const { root } = parse('- a\n\n  <img src="c.png" width="200">');
    const block = root.children[0].notes[0].block as Paragraph;
    expect(block.children[0]).toMatchObject({ type: 'image', url: 'c.png', data: { width: 200 } });
  });
});
