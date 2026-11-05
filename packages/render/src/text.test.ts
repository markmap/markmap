import type { FontStyle, Inline, Measurer } from '@markmap/core';
import { describe, expect, it } from 'vitest';
import { approximateMeasurer, createCanvasMeasurer, fontToCss, layoutText } from '.';

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
const lines = (content: Inline[], maxWidth: number) => {
  const result = layoutText(content, { font, measurer: mono, maxWidth });
  const byLine = new Map<number, string>();
  for (const run of result.runs) byLine.set(run.y, (byLine.get(run.y) ?? '') + run.text);
  return [...byLine.values()];
};

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
    const result = layoutText(text('hello world'), { font, measurer: mono });
    expect(result).toMatchObject({ width: 110, height: 12, lines: 1 });
  });

  it('wraps at spaces and trims them at line ends', () => {
    expect(lines(text('aaa bbb ccc'), 70)).toEqual(['aaa bbb', 'ccc']);
    expect(layoutText(text('aaa bbb ccc'), { font, measurer: mono, maxWidth: 70 }).width).toBe(70);
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

  it('splits styles into runs with their own fonts', () => {
    const { runs } = layoutText(
      [
        ...text('a '),
        { type: 'strong', children: text('b') },
        { type: 'emphasis', children: text('c') },
        { type: 'inlineCode', value: 'd' },
      ],
      { font, measurer: mono },
    );
    expect(runs.map((r) => [r.text, r.x, r.font.weight, r.font.style])).toEqual([
      ['a ', 0, 400, 'normal'],
      ['b', 20, 700, 'normal'],
      ['c', 30, 400, 'italic'],
      ['d', 40, 400, 'normal'],
    ]);
  });
});
