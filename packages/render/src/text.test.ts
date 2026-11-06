import type {
  ContentPlugin,
  FontStyle,
  Inline,
  MarkmapNode,
  Measurer,
  Primitive,
} from '@markmap/core';
import { describe, expect, it } from 'vitest';
import {
  approximateMeasurer,
  classicTheme,
  createCanvasMeasurer,
  defaultContentPlugins,
  fontToCss,
  layoutText,
  sanitizeUrl,
  type TextLayoutOptions,
  transformContent,
} from '.';

const font: FontStyle = {
  family: 'sans-serif',
  size: 10,
  weight: 400,
  style: 'normal',
  lineHeight: 12,
};
/** Every character is 10px wide, so widths are easy to read. */
const mono: Measurer = { measure: (text) => [...text].length * 10 };
const text = (value: string): Inline[] => [{ type: 'text', value }];
const node: MarkmapNode = {
  id: 'n',
  type: 'listItem',
  content: [],
  notes: [],
  data: {},
  children: [],
};
const theme = { ...classicTheme, codeFontFamily: 'monospace' };
const options = (extra: Partial<TextLayoutOptions> = {}): TextLayoutOptions => ({
  style: { font, fill: 'black' },
  plugins: defaultContentPlugins,
  ctx: { theme, measurer: mono, node },
  ...extra,
});
const layout = (content: Inline[], extra?: Partial<TextLayoutOptions>) =>
  layoutText(content, options(extra));
const lines = (content: Inline[], wrapWidth: number) => {
  const result = layout(content, { wrapWidth });
  const byLine = new Map<number, string>();
  for (const run of result.runs) byLine.set(run.y, (byLine.get(run.y) ?? '') + run.text);
  return [...byLine.values()];
};

const links = (url: string) =>
  layout([{ type: 'link', url, children: text('ab') }]).primitives.filter((p) => p.kind === 'link');

describe('approximateMeasurer', () => {
  it('scales with font size and weight', () => {
    const w = approximateMeasurer.measure('Hello', font);
    expect(w).toBeCloseTo(((722 + 556 + 222 + 222 + 556) / 1000) * 10);
    expect(approximateMeasurer.measure('Hello', { ...font, size: 20 })).toBeCloseTo(w * 2);
    expect(approximateMeasurer.measure('Hello', { ...font, weight: 700 })).toBeGreaterThan(w);
  });

  it('treats CJK and emoji as full width', () => {
    expect(approximateMeasurer.measure('中文', font)).toBe(20);
    expect(approximateMeasurer.measure('😀', font)).toBe(10);
  });
});

describe('createCanvasMeasurer', () => {
  it('sets the font and caches results', () => {
    let calls = 0;
    const ctx = {
      font: '',
      measureText: (t: string) => (calls++, { width: t.length }) as TextMetrics,
    };
    const measurer = createCanvasMeasurer(ctx);
    expect(measurer.measure('abc', font)).toBe(3);
    expect(measurer.measure('abc', font)).toBe(3);
    expect(ctx.font).toBe(fontToCss(font));
    expect(calls).toBe(1);
  });
});

describe('layoutText', () => {
  it('keeps a single line when wrapping is off', () => {
    const result = layout(text('hello world'));
    expect(result).toMatchObject({ width: 110, height: 12, lines: 1 });
  });

  it('wraps at spaces and trims them at line ends', () => {
    expect(lines(text('aaa bbb ccc'), 70)).toEqual(['aaa bbb', 'ccc']);
    expect(layout(text('aaa bbb ccc'), { wrapWidth: 70 }).width).toBe(70);
  });

  it('breaks words longer than the line', () => {
    expect(lines(text('abcdefgh'), 30)).toEqual(['abc', 'def', 'gh']);
  });

  it('breaks between CJK characters but not before closing punctuation', () => {
    // Exact breaks depend on the ICU dictionary, so check the rules instead.
    const result = lines(text('中文换行。中文换行。'), 30);
    expect(result.join('')).toBe('中文换行。中文换行。');
    expect(result.length).toBeGreaterThan(2);
    for (const line of result) {
      expect(line).not.toMatch(/^。/);
      expect([...line.replace(/。$/, '')].length).toBeLessThanOrEqual(3);
    }
  });

  it('keeps punctuation attached to words', () => {
    expect(lines(text('aa bb, cc'), 50)).toEqual(['aa', 'bb,', 'cc']);
  });

  it('honors hard breaks', () => {
    expect(lines([...text('a'), { type: 'break' }, ...text('b')], 0)).toEqual(['a', 'b']);
  });

  it('treats soft line breaks as spaces', () => {
    expect(lines(text('a\nb'), 0)).toEqual(['a b']);
  });

  it('splits styles into runs with their own fonts', () => {
    const { runs } = layout([
      ...text('a '),
      { type: 'strong', children: text('b') },
      { type: 'emphasis', children: text('c') },
      { type: 'link', url: 'https://x.y', children: text('d') },
    ]);
    expect(runs.map((r) => [r.text, r.x, r.font.weight, r.font.style, r.fill])).toEqual([
      ['a ', 0, 400, 'normal', 'black'],
      ['b', 20, 700, 'normal', 'black'],
      ['c', 30, 400, 'italic', 'black'],
      ['d', 40, 400, 'normal', 'var(--mm-link)'],
    ]);
  });

  it('pads inline code and draws its background', () => {
    const { runs, primitives, width } = layout([
      ...text('a'),
      { type: 'inlineCode', value: 'bc' },
      ...text('d'),
    ]);
    expect(runs.map((r) => [r.text, r.x, r.font.family])).toEqual([
      ['a', 0, 'sans-serif'],
      ['bc', 12, 'monospace'],
      ['d', 34, 'sans-serif'],
    ]);
    expect(width).toBe(44);
    expect(primitives[0]).toMatchObject({ kind: 'rect', x: 10, w: 24, fill: 'var(--mm-code-bg)' });
  });

  it('decorates spans across lines and nested styles', () => {
    const { primitives } = layout(
      [{ type: 'delete', children: [...text('aa '), { type: 'mark', children: text('bb cc') }] }],
      { wrapWidth: 50 },
    );
    const of = (kind: Primitive['kind']) => primitives.filter((p) => p.kind === kind);
    // Strike on both lines; highlight on both lines, starting at "bb".
    expect(of('path').map((p) => (p as { d: string }).d)).toEqual([
      expect.stringMatching(/^M0,\S+H50$/),
      expect.stringMatching(/^M0,\S+H20$/),
    ]);
    expect(of('rect').map((p) => [(p as { x: number }).x, (p as { w: number }).w])).toEqual([
      [30, 20],
      [0, 20],
    ]);
  });

  it('adds link areas for safe URLs only', () => {
    expect(links('https://markmap.js.org')).toEqual([
      { kind: 'link', href: 'https://markmap.js.org', rect: { x: 0, y: 0, width: 20, height: 12 } },
    ]);
    expect(links('javascript:alert(1)')).toEqual([]);
  });

  it('places atoms on the baseline and grows the line for tall ones', () => {
    const tall: ContentPlugin = {
      name: 'tall',
      atoms: {
        // Any inline type works; footnote references stand in for formulas or icons.
        footnoteReference: {
          measure: () => ({ width: 15, height: 30, baseline: 25 }),
          render: (_inline, box) => [
            { kind: 'rect', x: box.x, y: box.y, w: box.width, h: box.height },
          ],
        },
      },
    };
    const result = layout(
      [...text('a'), { type: 'footnoteReference', identifier: 'x' }, ...text('b')],
      {
        plugins: [...defaultContentPlugins, tall],
      },
    );
    expect(result.runs.map((r) => [r.text, r.x, r.y])).toEqual([
      ['a', 0, 25],
      ['b', 25, 25],
    ]);
    expect(result.primitives.at(-1)).toEqual({ kind: 'rect', x: 10, y: 0, w: 15, h: 30 });
    expect(result.height).toBe(30);
  });

  it('adds a checkbox for task items', () => {
    const task = { ...node, content: text('todo'), data: { checked: true } };
    const content = transformContent(defaultContentPlugins, { theme, measurer: mono, node: task });
    expect(content[0]).toEqual({ type: 'checkbox', checked: true });
    const result = layout(content);
    expect(result.runs[0].x).toBeGreaterThan(8);
    expect(result.primitives.some((p) => p.kind === 'path')).toBe(true);
  });
});

describe('sanitizeUrl', () => {
  it.each([
    ['https://a.b/c', true],
    ['mailto:a@b.c', true],
    ['#anchor', true],
    ['/abs', true],
    ['./rel', true],
    ['page.html?x=1', true],
    ['javascript:alert(1)', false],
    [' JavaScript:alert(1)', false],
    ['data:text/html,x', false],
  ])('%s', (url, safe) => {
    expect(sanitizeUrl(url) !== undefined).toBe(safe);
  });
});

describe('note marker', () => {
  const withNotes: MarkmapNode = {
    ...node,
    content: text('label'),
    notes: [{ block: { type: 'paragraph', children: text('note') }, after: 0 }],
  };

  it('adds a dot and a hit area after the label', () => {
    const ctx = { theme, measurer: mono, node: withNotes };
    const content = transformContent(defaultContentPlugins, ctx);
    expect(content.at(-1)).toEqual({ type: 'noteMarker', count: 1 });
    const { primitives, width } = layout(content, { ctx });
    const dot = primitives.find((p) => p.kind === 'rect');
    const hit = primitives.find((p) => p.kind === 'hit');
    expect(dot).toMatchObject({ fill: 'var(--mm-note-dot)' });
    expect((dot as { x: number }).x).toBeGreaterThan(50);
    expect(width).toBeGreaterThan(50);
    expect(hit).toMatchObject({ action: 'notes' });
  });

  it('adds nothing without notes', () => {
    const content = transformContent(defaultContentPlugins, { theme, measurer: mono, node });
    expect(content).toEqual([]);
  });
});
