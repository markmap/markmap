import type { MarkmapJSONOptions, Theme } from '@markmap/core';
import type { RenderOptions } from './render';
import { classicTheme } from './themes/classic';

/** A copy of `theme` whose branch colors are replaced by `colors`. */
export function withBranchColors(theme: Theme, colors: readonly string[]): Theme {
  const tokens = Object.fromEntries(
    Object.entries(theme.tokens).filter(([name]) => !/^mm-branch-\d+$/.test(name)),
  );
  colors.forEach((color, i) => {
    tokens[`mm-branch-${i}`] = color;
  });
  return { ...theme, tokens };
}

/** Render options with the rendering parts of Markdown options applied on top. */
export function applyRenderOptions<T extends Partial<RenderOptions>>(
  base: T,
  json: MarkmapJSONOptions,
): T & Partial<RenderOptions> {
  const result: T & Partial<RenderOptions> = { ...base };
  if (json.maxWidth != null) result.maxWidth = json.maxWidth;
  if (json.spacingHorizontal != null) result.spacingHorizontal = json.spacingHorizontal;
  if (json.spacingVertical != null) result.spacingVertical = json.spacingVertical;
  if (json.colorFreezeLevel != null) result.colorFreezeLevel = json.colorFreezeLevel;
  if (json.color?.length) result.theme = withBranchColors(base.theme ?? classicTheme, json.color);
  return result;
}
