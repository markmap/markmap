import { hashString } from '@markmap/core';

/**
 * Pick a color index for a node from its path of ids, for themes that color by branch.
 * The node's id is hashed, so colors stay put as the tree changes. With `freezeLevel`
 * (the root is level 1), nodes deeper than that level use their ancestor's id instead.
 */
export function branchIndex(path: readonly string[], count: number, freezeLevel = 0): number {
  const id = freezeLevel > 0 && path.length > freezeLevel ? path[freezeLevel - 1] : path.at(-1)!;
  return Number.parseInt(hashString(id), 36) % Math.max(1, count);
}

/** The d3 category10 palette, used by the built-in themes. */
export const DEFAULT_COLORS: readonly string[] = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
];

/** Options shared by themes that color by branch. */
export interface BranchColorOptions {
  /** Branch colors, cycled through. One color paints every branch the same. */
  color?: string[];
  /** Nodes deeper than this level (the root is level 1) take their ancestor's color. `0` disables. */
  colorFreezeLevel?: number;
}

/** Branch color tokens and a lookup from a node's path to its `var(--mm-branch-N)`. */
export function branchColors(options: BranchColorOptions) {
  const colors = options.color?.length ? options.color : DEFAULT_COLORS;
  const freezeLevel = options.colorFreezeLevel ?? 0;
  return {
    tokens: Object.fromEntries(colors.map((color, i) => [`mm-branch-${i}`, color])),
    colorOf: (path: readonly string[]) =>
      `var(--mm-branch-${branchIndex(path, colors.length, freezeLevel)})`,
  };
}
