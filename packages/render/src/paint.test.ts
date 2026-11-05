import { describe, expect, it } from 'vitest';
import { classicTheme } from './themes/classic';
import { resolvePaint, themeTokens } from './paint';

const tokens = { 'mm-a': '#111', 'mm-b': 'var(--mm-a)', 'mm-loop': 'var(--mm-loop)' };

describe('resolvePaint', () => {
  it('keeps plain colors', () => {
    expect(resolvePaint('red', tokens)).toBe('red');
    expect(resolvePaint('rgb(1, 2, 3)', tokens)).toBe('rgb(1, 2, 3)');
    expect(resolvePaint(undefined, tokens)).toBeUndefined();
  });

  it('replaces variables, also inside other functions and tokens', () => {
    expect(resolvePaint('var(--mm-a)', tokens)).toBe('#111');
    expect(resolvePaint('var(--mm-b)', tokens)).toBe('#111');
    expect(resolvePaint('color-mix(in srgb, var(--mm-a) 50%, white)', tokens)).toBe(
      'color-mix(in srgb, #111 50%, white)',
    );
  });

  it('uses fallbacks, which may hold variables and commas', () => {
    expect(resolvePaint('var(--mm-x, blue)', tokens)).toBe('blue');
    expect(resolvePaint('var(--mm-x, var(--mm-a))', tokens)).toBe('#111');
    expect(resolvePaint('var(--mm-x, rgb(1, 2, 3))', tokens)).toBe('rgb(1, 2, 3)');
  });

  it('gives up on missing values, loops and broken syntax', () => {
    expect(resolvePaint('var(--mm-x)', tokens)).toBeUndefined();
    expect(resolvePaint('var(--mm-loop)', tokens)).toBeUndefined();
    expect(resolvePaint('var(--mm-a', tokens)).toBeUndefined();
    expect(resolvePaint('var(mm-a)', tokens)).toBeUndefined();
  });

  it('accepts a lookup function', () => {
    expect(resolvePaint('var(--mm-a)', (name) => (name === 'mm-a' ? ' #222 ' : undefined))).toBe(
      '#222',
    );
  });
});

describe('themeTokens', () => {
  it('lets dark tokens override light ones', () => {
    const light = themeTokens(classicTheme);
    const dark = themeTokens(classicTheme, 'dark');
    expect(light['mm-bg']).toBe(classicTheme.tokens['mm-bg']);
    expect(dark['mm-bg']).toBe(classicTheme.darkTokens!['mm-bg']);
    expect(dark['mm-branch-0']).toBe(classicTheme.tokens['mm-branch-0']);
  });
});
