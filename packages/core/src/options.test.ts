import { describe, expect, it } from 'vitest';
import {
  isSafeCSSValue,
  readJSONOptions,
  unknownOptionWarnings,
  validateOptions,
  validators,
} from '.';

describe('readJSONOptions', () => {
  it('keeps valid shared options and leaves other keys for the theme', () => {
    const input = {
      initialExpandLevel: -1,
      maxWidth: 300,
      spacingHorizontal: 60,
      spacingVertical: 8,
      zoom: false,
      pan: true,
      fitPadding: 10,
      maxFitScale: 1.5,
      color: ['#f00'],
    };
    const { color, ...shared } = input;
    expect(readJSONOptions(input)).toEqual({ options: shared, rest: { color }, warnings: [] });
  });

  it('reports and drops invalid values', () => {
    const { options, warnings } = readJSONOptions({
      maxWidth: '300',
      initialExpandLevel: 1.5,
      spacingVertical: -1,
      zoom: 'yes',
    });
    expect(options).toEqual({});
    expect(warnings).toEqual([
      '`maxWidth` must be a number',
      '`initialExpandLevel` must be an integer >= -1',
      '`spacingVertical` must be >= 0',
      '`zoom` must be true or false',
    ]);
  });

  it('ignores missing options and rejects non-objects', () => {
    expect(readJSONOptions(undefined)).toEqual({ options: {}, rest: {}, warnings: [] });
    expect(readJSONOptions([1]).warnings).toEqual(['`markmap` options must be an object']);
  });

  it('does not treat inherited properties as known keys', () => {
    expect(readJSONOptions({ toString: 1 }).rest).toEqual({ toString: 1 });
  });
});

describe('validators.colors', () => {
  const schema = { color: validators.colors() };

  it('accepts one color or a list', () => {
    expect(validateOptions({ color: ' #333 ' }, schema).options).toEqual({ color: ['#333'] });
    expect(validateOptions({ color: ['red', 'blue'] }, schema).options).toEqual({
      color: ['red', 'blue'],
    });
  });

  it('drops colors that could inject CSS or markup', () => {
    const { options, warnings } = validateOptions(
      { color: ['red', 'red;}</style><script>alert(1)</script>', 'url("x")', 42] },
      schema,
    );
    expect(options).toEqual({ color: ['red'] });
    expect(warnings).toEqual(['`color` has invalid colors, which were ignored']);
  });

  it('rejects empty and non-color values', () => {
    expect(validateOptions({ color: [] }, schema).warnings).toEqual([
      '`color` must be a color or a list of colors',
    ]);
    expect(validateOptions({ color: ['<'] }, schema).options).toEqual({});
  });
});

describe('unknownOptionWarnings', () => {
  it('names every unclaimed key', () => {
    expect(unknownOptionWarnings({ a: 1, b: 2 })).toEqual([
      'Unknown option `a`',
      'Unknown option `b`',
    ]);
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
