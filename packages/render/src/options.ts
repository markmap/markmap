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
import { classicTheme } from './themes/classic';

/** Layouts Markdown can pick by name with the `layout` option. */
export const builtinLayouts: Readonly<Record<string, Layout>> = Object.freeze({
  [treeLayout.name]: treeLayout,
  [twoSidedLayout.name]: twoSidedLayout,
  [orgChartLayout.name]: orgChartLayout,
});

export interface ResolveOptions {
  /** Layouts the `layout` option may name. Defaults to {@link builtinLayouts}. */
  layouts?: Readonly<Record<string, Layout>>;
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
  { layouts = builtinLayouts }: ResolveOptions = {},
): ResolvedOptions<T & Partial<RenderOptions>> {
  const core = readJSONOptions(input);
  const result: T & Partial<RenderOptions> = { ...base };
  for (const key of RENDER_KEYS) {
    if (core.options[key] != null) result[key] = core.options[key];
  }
  const layoutWarnings: string[] = [];
  if (core.options.layout != null) {
    const layout = Object.hasOwn(layouts, core.options.layout)
      ? layouts[core.options.layout]
      : undefined;
    if (layout) result.layout = layout;
    else {
      const names = Object.keys(layouts).map((name) => `\`${name}\``);
      layoutWarnings.push(
        `Unknown layout \`${core.options.layout}\`; available: ${names.join(', ')}`,
      );
    }
  }
  const themed = configureTheme(base.theme ?? classicTheme, core.rest);
  if (themed.theme !== (base.theme ?? classicTheme)) result.theme = themed.theme;
  return {
    options: result,
    json: core.options,
    warnings: [
      ...core.warnings,
      ...layoutWarnings,
      ...themed.warnings,
      ...unknownOptionWarnings(themed.rest),
    ],
  };
}
