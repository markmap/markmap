import type { Primitive } from '@markmap/core';
import { describe, expect, it } from 'vitest';
import { texToSvg } from './mathjax';
import { type SvgNode, svgToPrimitives, withColor } from './shapes';

const node = (tag: string, attrs: SvgNode['attrs'] = {}, children: SvgNode[] = []): SvgNode => ({
  tag,
  attrs,
  children,
});

describe('svgToPrimitives', () => {
  it('keeps paths and groups, with inherited paints', () => {
    const tree = node('g', { fill: 'currentColor', 'stroke-width': '0', stroke: 'red' }, [
      node('path', { d: 'M0,0H5', 'data-c': '78' }),
      node('g', { fill: 'blue', transform: 'translate(10, 20) scale(2,-1)' }, [
        node('path', { d: 'M1,1', transform: 'matrix(1 0 0 1 3 4)' }),
      ]),
    ]);
    expect(svgToPrimitives([tree])).toEqual([
      {
        kind: 'group',
        children: [
          { kind: 'path', d: 'M0,0H5', fill: 'currentColor' },
          {
            kind: 'group',
            transform: [2, 0, 0, -1, 10, 20],
            children: [
              {
                kind: 'group',
                transform: [1, 0, 0, 1, 3, 4],
                children: [{ kind: 'path', d: 'M1,1', fill: 'blue' }],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('converts rects, lines and ellipses', () => {
    expect(
      svgToPrimitives([
        node('rect', { x: '1', width: '3', height: '4', fill: 'none', stroke: 'red' }),
        node('line', { x1: '1', y1: '2', x2: '3', y2: '4', stroke: 'red', 'stroke-width': '2' }),
        node('ellipse', { rx: '2', ry: '1', cx: '5', cy: '6', fill: 'none', stroke: 'red' }),
      ]),
    ).toEqual([
      { kind: 'rect', x: 1, y: 0, w: 3, h: 4, fill: undefined, stroke: 'red', strokeWidth: 1 },
      {
        kind: 'path',
        d: 'M1,2L3,4',
        fill: 'currentColor',
        stroke: 'red',
        strokeWidth: 2,
      },
      {
        kind: 'path',
        d: 'M3,6A2,1 0 1 0 7,6A2,1 0 1 0 3,6Z',
        fill: undefined,
        stroke: 'red',
        strokeWidth: 1,
      },
    ]);
  });

  it('fits nested svgs like SVG does', () => {
    const [nested] = svgToPrimitives([
      node('svg', { x: '10', y: '20', width: '40', height: '20', viewBox: '1 2 10 10' }),
    ])!;
    // Scale 2 to fit the height, centered across the spare 20 of width.
    expect(nested).toMatchObject({
      transform: [2, 0, 0, 2, 18, 16],
      // The whole viewport, which is wider than the view box.
      clip: { x: -4, y: 2, width: 20, height: 10 },
    });
  });

  it.each<[string, SvgNode]>([
    ['unknown elements', node('text', {}, [node('#text')])],
    ['unknown attributes', node('path', { d: 'M0,0', 'stroke-dasharray': '2' })],
    ['clip paths', node('g', { 'clip-path': 'url(#a)' })],
    ['units', node('rect', { width: '1ex', height: '1' })],
    ['percentages', node('svg', { width: '100%', height: '1', viewBox: '0 0 1 1' })],
    ['other transforms', node('g', { transform: 'rotate(45)' })],
    ['broken transforms', node('g', { transform: 'translate(1,2) oops' })],
    ['empty view boxes', node('svg', { width: '1', height: '1', viewBox: '0 0 0 0' })],
    ['deep unknowns', node('g', {}, [node('g', {}, [node('use', { href: '#a' })])])],
  ])('rejects %s', (_, tree) => {
    expect(svgToPrimitives([tree])).toBeUndefined();
  });
});

describe('withColor', () => {
  it('fills in the text color and keeps explicit paints', () => {
    const colored = withColor(
      [
        {
          kind: 'group',
          children: [
            { kind: 'path', d: 'M0,0', fill: 'currentColor', stroke: 'red' },
            { kind: 'rect', x: 0, y: 0, w: 1, h: 1, stroke: 'currentColor' },
          ],
        },
      ],
      'var(--mm-text)',
    );
    expect(colored).toMatchObject([
      {
        children: [{ fill: 'var(--mm-text)', stroke: 'red' }, { stroke: 'var(--mm-text)' }],
      },
    ]);
  });
});

describe('MathJax output', () => {
  // What the whitelist was built from: if a MathJax upgrade changes its output, this fails.
  const corpus = [
    'x^2',
    '\\frac{a}{b}',
    '\\sqrt{x}',
    '\\sqrt[3]{x}',
    '\\sum_{k=1}^n k',
    '\\int_0^1 f(x)\\,dx',
    '\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}',
    '\\begin{cases}a&b\\\\c&d\\end{cases}',
    '\\begin{aligned}a&=b\\\\c&=d\\end{aligned}',
    '\\cancel{x}',
    '\\boxed{x}',
    '\\fbox{x}',
    '\\overline{ab}',
    '\\underbrace{a+b}_c',
    '\\enclose{circle}{x}',
    '\\left(\\frac{a}{b}\\right)',
    '\\xrightarrow{abc}',
    '\\mathbb{R}',
    '\\text{hi}',
    '\\color{red}{x}',
    '\\colorbox{yellow}{x}',
    '\\bbox[red]{x}',
    '\\phantom{x}y',
  ];

  it.each(corpus)('converts %s', (tex) => {
    for (const display of [false, true]) {
      const shapes: Primitive[] | undefined = texToSvg(tex, display).shapes;
      expect(shapes?.length).toBeGreaterThan(0);
    }
  });

  it('cuts stretched rules to length', () => {
    expect(JSON.stringify(texToSvg('\\overline{ab}', false).shapes)).toContain('"clip":');
  });

  it('keeps explicit colors', () => {
    expect(JSON.stringify(texToSvg('\\color{red}{x}', false).shapes)).toContain('"fill":"red"');
  });
});
