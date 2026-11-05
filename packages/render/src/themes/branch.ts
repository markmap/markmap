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
