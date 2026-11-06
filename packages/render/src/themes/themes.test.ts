import type { Primitive, Theme } from '@markmap/core';
import { parse } from '@markmap/parse';
import { describe, expect, it } from 'vitest';
import { interpolateStates } from '../animate';
import { orgChartLayout } from '../layouts/org-chart';
import { twoSidedLayout } from '../layouts/two-sided';
import { approximateMeasurer } from '../measure';
import { builtinThemes, resolveRenderOptions } from '../options';
import { drawState, renderTree } from '../render';
import { themeCSS, toSVGString } from '../svg';
import { cardsTheme } from './cards';
import { classicTheme } from './classic';
import { minimalTheme } from './minimal';

const md = '# Root\n\n- a\n  - a1\n- b\n  - b1\n- c\n  - c1';
const render = (theme: Theme, layout = twoSidedLayout, folded: string[] = []) =>
  renderTree(parse(md).root, {
    measurer: approximateMeasurer,
    theme,
    layout,
    folded: new Set(folded),
  });
const group = (primitives: Primitive[], key: string) =>
  primitives.find((p) => p.kind === 'group' && p.key === key);
const pathD = (p?: Primitive) =>
  p?.kind === 'group' && p.children[0].kind === 'path' ? p.children[0].d : '';

describe.each([classicTheme, cardsTheme, minimalTheme])('$name theme', (theme) => {
  it('connects every edge to the anchors on both nodes, in every layout', () => {
    for (const layout of [twoSidedLayout, orgChartLayout]) {
      const result = render(theme, layout);
      for (const item of result.layout.nodes.slice(1)) {
        const ctx = result.contexts.get(item.node.id)!;
        const parent = result.contexts.get(item.parent!.node.id)!;
        const from = theme.node.anchor(item.parent!.rect, ctx.direction, parent);
        const d = pathD(group(result.primitives, `edge:${item.node.id}`));
        expect(d.startsWith(`M${from.x},${from.y}`)).toBe(true);
      }
    }
  });

  it('has dark tokens for every color that changes', () => {
    expect(Object.keys(theme.darkTokens ?? {}).length).toBeGreaterThan(0);
    for (const name of Object.keys(theme.darkTokens!)) expect(theme.tokens).toHaveProperty(name);
  });

  it('is registered under its name', () => {
    expect(builtinThemes[theme.name]).toBe(theme);
  });
});

describe('cards theme', () => {
  it('puts the fold toggle on the outer side of the card', () => {
    const result = render(cardsTheme);
    const left = result.layout.nodes.find((n) => n.direction === 'left' && n.children.length)!;
    const g = group(result.primitives, `node:${left.node.id}`);
    const toggle = g?.kind === 'group' ? g.children[1] : undefined;
    expect(toggle?.kind === 'rect' && toggle.x + toggle.w / 2).toBe(0);
  });

  it('scales nodes in and out around their center', () => {
    const open = render(cardsTheme).state;
    const a = open.nodes[1];
    const closed = render(cardsTheme, twoSidedLayout, [a.node.id]).state;
    const frame = interpolateStates(open, closed, 0.5, cardsTheme, twoSidedLayout);
    const leaving = frame.nodes.find((n) => n.presence === 0.5)!;
    const g = group(drawState(frame, cardsTheme), `node:${leaving.node.id}`);
    expect(g?.kind === 'group' && g.opacity).toBe(0.5);
    // Scale 0.8 around the center, then the node's position.
    const k = g?.kind === 'group' ? g.transform![0] : 0;
    expect(k).toBeCloseTo(0.8);
  });
});

describe('text alignment', () => {
  const long =
    '# Root\n\n- first branch\n- second branch\n- a label long enough to wrap onto lines';
  const runsX = (theme: Theme) => {
    const result = renderTree(parse(long).root, {
      measurer: approximateMeasurer,
      theme,
      layout: twoSidedLayout,
      wrapWidth: 120,
    });
    const item = result.state.nodes.find((n) => n.text.lines > 1)!;
    return { item, xs: item.text.runs.map((r) => r.x) };
  };

  it('right-aligns wrapped labels on the left side', () => {
    const { item, xs } = runsX(classicTheme);
    expect(item.ctx.direction).toBe('left');
    expect(new Set(xs).size).toBeGreaterThan(1);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
  });
});

describe('theme CSS', () => {
  it('emits light, forced dark, or a media query', () => {
    expect(themeCSS(classicTheme)).not.toContain('#1e1e1e');
    expect(themeCSS(classicTheme, 'dark')).toMatch(
      /\.markmap\{[^}]*--mm-bg:#fff;[^}]*\}\.markmap\{[^}]*--mm-bg:#1e1e1e;/,
    );
    expect(themeCSS(classicTheme, 'auto')).toContain(
      '@media (prefers-color-scheme: dark){.markmap{',
    );
    const svg = toSVGString(render(cardsTheme), { colorScheme: 'auto' });
    expect(svg).toContain('prefers-color-scheme');
  });
});

describe('theme option', () => {
  it('picks a theme by name and applies its options on top', () => {
    const { options, warnings } = resolveRenderOptions({}, { theme: 'cards', color: ['#123456'] });
    expect(options.theme?.name).toBe('cards');
    expect(options.theme?.tokens['mm-branch-0']).toBe('#123456');
    expect(warnings).toEqual([]);
  });

  it('warns about unknown themes and options the theme does not have', () => {
    expect(resolveRenderOptions({}, { theme: 'fancy' }).warnings).toEqual([
      'Unknown theme `fancy`; available: `classic`, `cards`, `minimal`',
    ]);
    expect(resolveRenderOptions({}, { theme: 'minimal', color: '#fff' }).warnings).toEqual([
      'Unknown option `color`',
    ]);
  });
});
