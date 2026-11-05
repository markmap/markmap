import { describe, expect, it } from 'vitest';
import { isSafeCSSValue, readJSONOptions } from '.';

describe('readJSONOptions', () => {
  it('keeps valid options', () => {
    const input = {
      color: ['#f00', 'rgb(0, 128, 0)'],
      colorFreezeLevel: 2,
      initialExpandLevel: -1,
      maxWidth: 300,
      spacingHorizontal: 60,
      spacingVertical: 8,
      zoom: false,
      pan: true,
      fitPadding: 10,
      maxFitScale: 1.5,
    };
    expect(readJSONOptions(input)).toEqual({ options: input, warnings: [] });
  });

  it('accepts a single color', () => {
    expect(readJSONOptions({ color: ' #333 ' }).options).toEqual({ color: ['#333'] });
  });

  it('reports and drops invalid values', () => {
    const { options, warnings } = readJSONOptions({
      maxWidth: '300',
      initialExpandLevel: 1.5,
      spacingVertical: -1,
      zoom: 'yes',
      color: [],
      foo: 1,
    });
    expect(options).toEqual({});
    expect(warnings).toEqual([
      '`maxWidth` must be a number',
      '`initialExpandLevel` must be an integer >= -1',
      '`spacingVertical` must be >= 0',
      '`zoom` must be true or false',
      '`color` must be a color or a list of colors',
      'Unknown option `foo`',
    ]);
  });

  it('drops colors that could inject CSS or markup', () => {
    const { options, warnings } = readJSONOptions({
      color: ['red', 'red;}</style><script>alert(1)</script>', 'url("x")', 42],
    });
    expect(options.color).toEqual(['red']);
    expect(warnings).toHaveLength(1);
  });

  it('ignores missing options and rejects non-objects', () => {
    expect(readJSONOptions(undefined)).toEqual({ options: {}, warnings: [] });
    expect(readJSONOptions([1]).warnings).toEqual(['`markmap` options must be an object']);
  });
});

describe('isSafeCSSValue', () => {
  it.each([
    ['#fff', true],
    ['rgb(1, 2, 3)', true],
    ['var(--x)', true],
    ['', false],
    ['red; color: blue', false],
    ['red}', false],
    ['</style>', false],
    ['red/* x */', false],
    ['x'.repeat(101), false],
  ])('%s', (value, safe) => {
    expect(isSafeCSSValue(value)).toBe(safe);
  });
});
