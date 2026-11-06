import type { Primitive } from '@markmap/core';
import { parse } from '@markmap/parse';
import {
  approximateMeasurer,
  basicContent,
  renderTree,
  renderTreeAsync,
  toSVGString,
} from '@markmap/render';
import type { Root as HastRoot } from 'hast';
import { describe, expect, it } from 'vitest';
import { createMathContent, remarkMath } from '.';
import { texToSvg } from './mathjax';

const customs = (primitives: Primitive[]): string[] =>
  primitives.flatMap((p) =>
    p.kind === 'custom' ? [p.svg?.() ?? ''] : p.kind === 'group' ? customs(p.children) : [],
  );
const texts = (primitives: Primitive[]): string[] =>
  primitives.flatMap((p) =>
    p.kind === 'text' ? p.runs.map((r) => r.text) : p.kind === 'group' ? texts(p.children) : [],
  );

const tree = (md: string) => parse(md, { plugins: [remarkMath] }).root;

describe('texToSvg', () => {
  it('converts TeX to self-contained SVG in ex', () => {
    const svg = texToSvg('x^2', false);
    expect(svg.body).toContain('<path');
    expect(svg.body).not.toContain('<use');
    expect(svg.width).toBeGreaterThan(1);
    expect(svg.verticalAlign).toBeLessThanOrEqual(0);
  });

  it('rejects invalid TeX and cannot make links', () => {
    expect(() => texToSvg('\\frac{a', false)).toThrow(/close brace/);
    const svg = texToSvg('\\href{javascript:alert(1)}{x}', false);
    expect(svg.body).not.toMatch(/<a\b|href|javascript:/);
  });
});

describe('math content', () => {
  it('measures with the source first, then renders MathJax SVG', async () => {
    const plugins = [basicContent, createMathContent()];
    const root = tree('# Euler $e^{i\\pi} + 1 = 0$');
    const first = renderTree(root, { measurer: approximateMeasurer, plugins });
    expect(texts(first.primitives)).toContain('e^{i\\pi} + 1 = 0');
    expect(first.pending).toBeInstanceOf(Promise);

    const done = await renderTreeAsync(root, { measurer: approximateMeasurer, plugins });
    expect(done.pending).toBeUndefined();
    const [svg] = customs(done.primitives);
    expect(svg).toMatch(/^<svg x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" viewBox=/);
    expect(svg).toContain('style="color:var(--mm-text);overflow:visible"');
    expect(toSVGString(done)).toContain(svg);
  });

  it('keeps showing the source for invalid TeX', async () => {
    const plugins = [createMathContent()];
    const result = await renderTreeAsync(tree('# $\\frac{a$'), {
      measurer: approximateMeasurer,
      plugins,
    });
    expect(customs(result.primitives)).toEqual([]);
    expect(texts(result.primitives)).toContain('\\frac{a');
  });

  it('loads the converter once and on demand', async () => {
    let loads = 0;
    const plugins = [
      createMathContent({
        load: async () => {
          loads += 1;
          return { texToSvg };
        },
      }),
    ];
    const options = { measurer: approximateMeasurer, plugins };
    renderTree(tree('# plain'), options);
    expect(loads).toBe(0);
    await renderTreeAsync(tree('# $a$ and $b$\n\n- $a$'), options);
    expect(loads).toBe(1);
  });
});

const mathCode = (tex: string) => ({
  type: 'element' as const,
  tagName: 'code',
  properties: { className: ['language-math'] },
  children: [{ type: 'text' as const, value: tex }],
});

describe('math per backend', () => {
  const md = '# Root\n\n- $x^2$';
  const options = {
    measurer: approximateMeasurer,
    plugins: [createMathContent()],
  };

  const atom = (primitives: Primitive[]): Primitive[] =>
    primitives.flatMap((p) => {
      if (p.backends) return [p];
      return p.kind === 'group' ? atom(p.children) : [];
    });

  it('emits SVG markup and primitives, one for each backend', async () => {
    const result = await renderTreeAsync(tree(md), options);
    const variants = atom(result.primitives);
    expect(variants.map((p) => [p.kind, p.backends])).toEqual([
      ['custom', ['svg']],
      ['group', ['canvas']],
    ]);
    const svg = toSVGString(result);
    expect(svg).toContain('viewBox');
    expect(JSON.stringify(variants[1])).toContain('var(--mm-text)');
    expect(JSON.stringify(variants[1])).not.toContain('currentColor');
  });

  it('keeps formulas inside the layout bounds', async () => {
    const result = await renderTreeAsync(tree(md), options);
    expect(result.bounds.width).toBeLessThan(result.layout.bounds.width + 20);
    expect(result.bounds.height).toBeLessThan(result.layout.bounds.height + 20);
  });

  it('shows the source on canvas when a formula has no primitives', async () => {
    const svg = {
      body: '<text>x</text>',
      viewBox: '0 0 10 10',
      width: 1,
      height: 1,
      verticalAlign: 0,
    };
    const plugin = createMathContent({
      load: () => Promise.resolve({ texToSvg: () => svg }),
    });
    const result = await renderTreeAsync(tree(md), { ...options, plugins: [plugin] });
    expect(atom(result.primitives).map((p) => [p.kind, p.backends])).toEqual([
      ['custom', ['svg']],
      ['text', ['canvas']],
    ]);
  });
});

describe('math in popovers', () => {
  it('replaces inline and display math with SVG and keeps invalid TeX', async () => {
    const hast: HastRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'p',
          properties: {},
          children: [mathCode('x^2'), mathCode('\\frac{a')],
        },
        { type: 'element', tagName: 'pre', properties: {}, children: [mathCode('\\sum_k k')] },
      ],
    };
    await createMathContent().popover!(hast);
    const [p, display] = hast.children as { type: string; value?: string; children?: unknown[] }[];
    const [inline, invalid] = p.children as { type: string; value?: string }[];
    expect(inline.type).toBe('raw');
    expect(inline.value).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="[\d.]+ex"/);
    expect(inline.value).toContain('aria-label="x^2"');
    expect(invalid).toMatchObject({ type: 'element', tagName: 'code' });
    expect(display.type).toBe('raw');
    expect(display.value).toMatch(/^<div class="markmap-math-display"/);
  });

  it('escapes the TeX it puts in attributes', async () => {
    const hast: HastRoot = { type: 'root', children: [mathCode('a<b "c"')] };
    await createMathContent().popover!(hast);
    const [node] = hast.children as { value: string }[];
    expect(node.value).toContain('aria-label="a&#60;b &#34;c&#34;"');
  });
});
