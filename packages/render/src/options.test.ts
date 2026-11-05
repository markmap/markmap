import { parse } from '@markmap/parse';
import { describe, expect, it } from 'vitest';
import {
  approximateMeasurer,
  branchIndex,
  classicTheme,
  configureTheme,
  createClassicTheme,
  renderTree,
  resolveRenderOptions,
  tokensToCSS,
  toSVGString,
} from '.';

const md = '# R\n\n## A\n\n- a1\n  - a1x\n- a2\n\n## B\n\n- b1';
const branchesIn = (svg: string) => new Set(svg.match(/var\(--mm-branch-\d+\)/g));

describe('branchIndex', () => {
  it('stays inside the palette', () => {
    for (const id of ['root', 'a', 'b', 'c', 'd']) {
      const index = branchIndex(['root', id], 3);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(3);
    }
    expect(branchIndex(['x'], 0)).toBe(0);
  });

  it('uses the ancestor at the freeze level for deeper nodes', () => {
    const deep = ['root', 'a', 'a1', 'a1x'];
    expect(branchIndex(deep, 10, 2)).toBe(branchIndex(['root', 'a'], 10));
    expect(branchIndex(deep.slice(0, 2), 10, 2)).toBe(branchIndex(['root', 'a'], 10));
    // Shallower than the freeze level: own color.
    expect(branchIndex(['root'], 10, 2)).toBe(branchIndex(['root'], 10));
  });
});

describe('classic theme options', () => {
  it('declares its options and configures a copy', () => {
    expect(Object.keys(classicTheme.options ?? {})).toEqual(['color', 'colorFreezeLevel']);
    const theme = classicTheme.configure!({ color: ['red', 'blue'] });
    expect(theme).not.toBe(classicTheme);
    expect(tokensToCSS(theme)).toContain('--mm-branch-0:red;--mm-branch-1:blue;');
    expect(tokensToCSS(theme)).not.toContain('--mm-branch-2');
    expect(tokensToCSS(classicTheme)).toContain('--mm-branch-9:');
  });

  it('freezes colors below a level', () => {
    const { root } = parse(md);
    const render = (theme = classicTheme) =>
      renderTree(root, { measurer: approximateMeasurer, theme });
    const frozen = render(createClassicTheme({ colorFreezeLevel: 2 }));
    const stroke = (id: string) =>
      JSON.stringify(
        frozen.primitives.find((p) => p.kind === 'group' && p.key === `edge:${id}`),
      ).match(/var\(--mm-branch-\d+\)/)?.[0];
    const [a, b] = root.children;
    expect(stroke(a.children[0].id)).toBe(stroke(a.id));
    expect(stroke(a.children[0].children[0].id)).toBe(stroke(a.id));
    expect(stroke(b.children[0].id)).toBe(stroke(b.id));
  });
});

describe('configureTheme', () => {
  it('validates theme keys and returns the rest', () => {
    const { theme, rest, warnings } = configureTheme(classicTheme, {
      color: 'red',
      colorFreezeLevel: -1,
      other: 1,
    });
    expect(tokensToCSS(theme)).toContain('--mm-branch-0:red;');
    expect(rest).toEqual({ other: 1 });
    expect(warnings).toEqual(['`colorFreezeLevel` must be an integer >= 0']);
  });

  it('passes everything through for themes without options', () => {
    const plain = { ...classicTheme, options: undefined, configure: undefined };
    expect(configureTheme(plain, { color: 'red' })).toEqual({
      theme: plain,
      rest: { color: 'red' },
      warnings: [],
    });
  });
});

describe('resolveRenderOptions', () => {
  it('applies shared and theme options, and reports the rest', () => {
    const { options, json, warnings } = resolveRenderOptions(
      { maxWidth: 100, spacingVertical: 5 },
      { maxWidth: 200, zoom: false, color: ['#f00'], bogus: 1 },
    );
    expect(options).toMatchObject({ maxWidth: 200, spacingVertical: 5 });
    expect(json).toEqual({ maxWidth: 200, zoom: false });
    expect(tokensToCSS(options.theme!)).toContain('--mm-branch-0:#f00;');
    expect(warnings).toEqual(['Unknown option `bogus`']);
  });

  it('keeps the base theme when no theme option is set', () => {
    const { options } = resolveRenderOptions({}, { maxWidth: 1 });
    expect(options.theme).toBeUndefined();
  });

  it('paints every branch with a single color', () => {
    const { root } = parse(md);
    const { options } = resolveRenderOptions(
      { measurer: approximateMeasurer },
      { color: '#123456' },
    );
    const svg = toSVGString(renderTree(root, options));
    expect(svg).toContain('--mm-branch-0:#123456;');
    expect(branchesIn(svg)).toEqual(new Set(['var(--mm-branch-0)']));
  });
});

describe('tokensToCSS', () => {
  it('drops tokens that could break out of the style element', () => {
    const theme = {
      ...classicTheme,
      tokens: { ok: 'red', bad: 'red;}</style><script>x</script>', 'bad name;': 'red' },
    };
    expect(tokensToCSS(theme)).toBe('--ok:red;');
  });
});
