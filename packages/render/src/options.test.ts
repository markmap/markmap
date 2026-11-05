import { describe, expect, it } from 'vitest';
import { parse } from '@markmap/parse';
import {
  applyRenderOptions,
  approximateMeasurer,
  classicTheme,
  computeBranches,
  paletteSize,
  renderTree,
  tokensToCSS,
  toSVGString,
  withBranchColors,
} from '.';

const md = '# R\n\n## A\n\n- a1\n  - a1x\n- a2\n\n## B\n\n- b1';

describe('branch colors', () => {
  it('counts the theme palette', () => {
    expect(paletteSize(classicTheme)).toBe(10);
    expect(paletteSize(withBranchColors(classicTheme, ['red', 'blue']))).toBe(2);
    expect(paletteSize({ ...classicTheme, tokens: {} })).toBe(1);
  });

  it('keeps indices inside the palette', () => {
    const { root } = parse(md);
    const theme = withBranchColors(classicTheme, ['red', 'blue', 'green']);
    for (const branch of computeBranches(root, theme).values()) {
      expect(branch).toBeGreaterThanOrEqual(0);
      expect(branch).toBeLessThan(3);
    }
  });

  it('freezes colors below a level', () => {
    const { root } = parse(md);
    const branches = computeBranches(root, classicTheme, 2);
    const [a, b] = root.children;
    // Level 2 is A and B; everything under them shares their color.
    expect(branches.get(a.children[0].id)).toBe(branches.get(a.id));
    expect(branches.get(a.children[0].children[0].id)).toBe(branches.get(a.id));
    expect(branches.get(b.children[0].id)).toBe(branches.get(b.id));
  });
});

describe('applyRenderOptions', () => {
  it('maps Markdown options onto render options', () => {
    const result = applyRenderOptions(
      { maxWidth: 100, spacingVertical: 5 },
      { maxWidth: 200, colorFreezeLevel: 3, color: ['#f00'] },
    );
    expect(result).toMatchObject({ maxWidth: 200, spacingVertical: 5, colorFreezeLevel: 3 });
    expect(result.theme?.tokens['mm-branch-0']).toBe('#f00');
    expect(result.theme?.tokens['mm-branch-1']).toBeUndefined();
  });

  it('paints every branch with a single color', () => {
    const { root } = parse(md);
    const options = applyRenderOptions({ measurer: approximateMeasurer }, { color: ['#123456'] });
    const svg = toSVGString(renderTree(root, options));
    expect(svg).toContain('--mm-branch-0:#123456;');
    expect(svg.match(/var\(--mm-branch-(\d+)\)/g)?.every((v) => v === 'var(--mm-branch-0)')).toBe(
      true,
    );
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
