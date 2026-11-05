import {
  type MarkmapJSONOptions,
  readJSONOptions,
  type Theme,
  unknownOptionWarnings,
  validateOptions,
} from '@markmap/core';
import type { RenderOptions } from './render';
import { classicTheme } from './themes/classic';

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
): ResolvedOptions<T & Partial<RenderOptions>> {
  const core = readJSONOptions(input);
  const result: T & Partial<RenderOptions> = { ...base };
  for (const key of RENDER_KEYS) {
    if (core.options[key] != null) result[key] = core.options[key];
  }
  const themed = configureTheme(base.theme ?? classicTheme, core.rest);
  if (themed.theme !== (base.theme ?? classicTheme)) result.theme = themed.theme;
  return {
    options: result,
    json: core.options,
    warnings: [...core.warnings, ...themed.warnings, ...unknownOptionWarnings(themed.rest)],
  };
}
