import {
  type Layout,
  type MarkmapJSONOptions,
  readJSONOptions,
  type Theme,
  unknownOptionWarnings,
  validateOptions,
} from '@markmap/core';
import type { RenderOptions } from './render';
import { orgChartLayout } from './layouts/org-chart';
import { treeLayout } from './layouts/tree';
import { twoSidedLayout } from './layouts/two-sided';
import { cardsTheme } from './themes/cards';
import { classicTheme } from './themes/classic';
import { minimalTheme } from './themes/minimal';

/** Layouts Markdown can pick by name with the `layout` option. */
export const builtinLayouts: Readonly<Record<string, Layout>> = Object.freeze({
  [treeLayout.name]: treeLayout,
  [twoSidedLayout.name]: twoSidedLayout,
  [orgChartLayout.name]: orgChartLayout,
});

/** Themes Markdown can pick by name with the `theme` option. */
export const builtinThemes: Readonly<Record<string, Theme>> = Object.freeze({
  [classicTheme.name]: classicTheme,
  [cardsTheme.name]: cardsTheme,
  [minimalTheme.name]: minimalTheme,
});

export interface ResolveOptions {
  /** Layouts the `layout` option may name. Defaults to {@link builtinLayouts}. */
  layouts?: Readonly<Record<string, Layout>>;
  /** Themes the `theme` option may name. Defaults to {@link builtinThemes}. */
  themes?: Readonly<Record<string, Theme>>;
}

/** Look up a name from Markdown, warning when it is not registered. */
function pick<T>(
  kind: string,
  name: string | undefined,
  registry: Readonly<Record<string, T>>,
  warnings: string[],
): T | undefined {
  if (name == null) return undefined;
  if (Object.hasOwn(registry, name)) return registry[name];
  const names = Object.keys(registry).map((key) => `\`${key}\``);
  warnings.push(`Unknown ${kind} \`${name}\`; available: ${names.join(', ')}`);
  return undefined;
}

export interface ResolvedOptions<T> {
  options: T;
  /** The validated theme-independent options, for callers that use more of them. */
  json: MarkmapJSONOptions;
  /** Problems with the input, one per ignored value or unknown key. */
  warnings: string[];
}

/**
 * Apply the theme's own options (for example `color`) and return the keys it did not
 * claim. Themes without options leave everything in `rest`.
 */
export function configureTheme(
  theme: Theme,
  input: Record<string, unknown>,
): { theme: Theme; rest: Record<string, unknown>; warnings: string[] } {
  if (!theme.options) return { theme, rest: input, warnings: [] };
  const { options, rest, warnings } = validateOptions(input, theme.options);
  const configured =
    Object.keys(options).length && theme.configure ? theme.configure(options) : theme;
  return { theme: configured, rest, warnings };
}

/** Markdown option keys that map straight onto render options. */
const RENDER_KEYS = ['maxWidth', 'spacingHorizontal', 'spacingVertical'] as const;

/**
 * Validate untrusted Markdown options (usually `frontmatter.markmap`) and apply them on
 * top of `base`: shared keys first, then the theme's own keys. Anything left is reported.
 */
export function resolveRenderOptions<T extends Partial<RenderOptions>>(
  base: T,
  input: unknown,
  { layouts = builtinLayouts, themes = builtinThemes }: ResolveOptions = {},
): ResolvedOptions<T & Partial<RenderOptions>> {
  const core = readJSONOptions(input);
  const result: T & Partial<RenderOptions> = { ...base };
  for (const key of RENDER_KEYS) {
    if (core.options[key] != null) result[key] = core.options[key];
  }
  const pickWarnings: string[] = [];
  const layout = pick('layout', core.options.layout, layouts, pickWarnings);
  if (layout) result.layout = layout;
  // A named theme replaces the base one; its own options then apply on top.
  const baseTheme = pick('theme', core.options.theme, themes, pickWarnings) ?? base.theme;
  const themed = configureTheme(baseTheme ?? classicTheme, core.rest);
  if (themed.theme !== (base.theme ?? classicTheme)) result.theme = themed.theme;
  return {
    options: result,
    json: core.options,
    warnings: [
      ...core.warnings,
      ...pickWarnings,
      ...themed.warnings,
      ...unknownOptionWarnings(themed.rest),
    ],
  };
}
