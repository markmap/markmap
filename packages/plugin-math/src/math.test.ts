import type { Primitive } from '@markmap/core';
import { parse } from '@markmap/parse';
import {
  approximateMeasurer,
  basicContent,
  renderTree,
  renderTreeAsync,
  toSVGString,
} from '@markmap/render';
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
    expect(svg).toContain('style="color:var(--mm-color);overflow:visible"');
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
