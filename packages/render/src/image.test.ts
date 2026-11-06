import type { Primitive, Size } from '@markmap/core';
import { parse } from '@markmap/parse';
import { describe, expect, it } from 'vitest';
import { noteContent, basicContent } from './content';
import { createImageContent, type ImageContentOptions, sanitizeImageUrl } from './image';
import { approximateMeasurer } from './measure';
import { renderTree, renderTreeAsync } from './render';

const images = (primitives: Primitive[]): Extract<Primitive, { kind: 'image' }>[] =>
  primitives.flatMap((p) =>
    p.kind === 'image' ? [p] : p.kind === 'group' ? images(p.children) : [],
  );

function setup(options: ImageContentOptions = {}, wrapWidth = 0) {
  const plugins = [basicContent, createImageContent(options), noteContent];
  return (md: string) =>
    renderTree(parse(md).root, { measurer: approximateMeasurer, plugins, wrapWidth });
}

const loader = (sizes: Record<string, Size>) => {
  const calls: string[] = [];
  const loadSize = (src: string) => {
    calls.push(src);
    return sizes[src] ? Promise.resolve(sizes[src]) : Promise.reject(new Error('404'));
  };
  return { calls, loadSize };
};

describe('image content', () => {
  it('uses both given sizes at once, without loading', () => {
    const { calls, loadSize } = loader({});
    const result = setup({ loadSize })('# <img src="a.png" width="120" height="80">');
    expect(images(result.primitives)).toMatchObject([{ src: 'a.png', w: 120, h: 80 }]);
    expect(result.pending).toBeUndefined();
    expect(calls).toEqual([]);
  });

  it('measures with a placeholder, then the loaded size, loading each image once', async () => {
    const { calls, loadSize } = loader({ 'b.png': { width: 200, height: 100 } });
    const render = setup({ loadSize });
    const md = '# ![logo](b.png)\n\n- ![again](b.png)';
    const first = render(md);
    expect(images(first.primitives)[0]).toMatchObject({ w: 40, h: 30 });
    expect(first.pending).toBeInstanceOf(Promise);
    await first.pending;
    const second = render(md);
    expect(images(second.primitives).map((i) => [i.w, i.h])).toEqual([
      [200, 100],
      [200, 100],
    ]);
    expect(second.pending).toBeUndefined();
    expect(calls).toEqual(['b.png']);
  });

  it('keeps the aspect ratio when one size is given', async () => {
    const { loadSize } = loader({ 'c.png': { width: 400, height: 100 } });
    const result = await renderTreeAsync(parse('# <img src="c.png" width="80">').root, {
      measurer: approximateMeasurer,
      plugins: [createImageContent({ loadSize })],
    });
    expect(images(result.primitives)[0]).toMatchObject({ w: 80, h: 20 });
  });

  it('caps the width at wrapWidth', () => {
    const result = setup({}, 100)('# <img src="d.png" width="400" height="200">');
    expect(images(result.primitives)[0]).toMatchObject({ w: 100, h: 50 });
  });

  it('shows the alt text for failed, blocked or unsafe images', async () => {
    const { loadSize } = loader({});
    const render = setup({ loadSize, allow: (src) => !src.startsWith('http') });
    const md = '# ![broken](e.png) ![remote](https://x.y/a.png) ![bad](javascript:alert(1))';
    await render(md).pending;
    const result = render(md);
    expect(images(result.primitives)).toEqual([]);
    expect(JSON.stringify(result.primitives)).toContain('"text":"broken"');
    expect(JSON.stringify(result.primitives)).toContain('"text":"remote"');
    expect(JSON.stringify(result.primitives)).toContain('"text":"bad"');
  });

  it('accepts raster data URLs only', () => {
    expect(sanitizeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBeDefined();
    expect(sanitizeImageUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBeUndefined();
    expect(sanitizeImageUrl('data:text/html;base64,PHA+')).toBeUndefined();
  });
});
