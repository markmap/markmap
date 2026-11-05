import type { Paint, Theme } from '@markmap/core';

/** Finds a token's value by name, without the leading `--`. */
export type TokenLookup = Readonly<Record<string, string>> | ((name: string) => string | undefined);

/** Nesting depth at which token references are assumed to loop. */
const MAX_DEPTH = 8;

/**
 * Resolve CSS custom properties in a paint, for drawing outside CSS (canvas, PNG export).
 * Every `var(--name)` and `var(--name, fallback)` is replaced by the token's value, which
 * may refer to other tokens, or else by its fallback. Anything else is kept as is.
 * Returns `undefined` when a variable has neither, or tokens refer to each other in a loop.
 */
export function resolvePaint(paint: Paint | undefined, tokens: TokenLookup): string | undefined {
  if (paint == null) return undefined;
  const lookup = typeof tokens === 'function' ? tokens : (name: string) => tokens[name];
  return substitute(paint, lookup, 0);
}

function substitute(
  value: string,
  lookup: (name: string) => string | undefined,
  depth: number,
): string | undefined {
  if (depth > MAX_DEPTH) return undefined;
  let out = '';
  let from = 0;
  for (;;) {
    const start = value.indexOf('var(', from);
    if (start < 0) return out + value.slice(from);
    const end = closingParen(value, start + 4);
    if (end < 0) return undefined;
    const inner = value.slice(start + 4, end);
    const comma = topLevelComma(inner);
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
    if (!name.startsWith('--')) return undefined;
    const token = lookup(name.slice(2))?.trim();
    const replacement = token
      ? substitute(token, lookup, depth + 1)
      : comma < 0
        ? undefined
        : substitute(inner.slice(comma + 1).trim(), lookup, depth + 1);
    if (replacement == null) return undefined;
    out += value.slice(from, start) + replacement;
    from = end + 1;
  }
}

/** Index of the `)` closing a parenthesis opened just before `from`, or -1. */
function closingParen(value: string, from: number): number {
  let depth = 1;
  for (let i = from; i < value.length; i += 1) {
    if (value[i] === '(') depth += 1;
    else if (value[i] === ')' && --depth === 0) return i;
  }
  return -1;
}

function topLevelComma(value: string): number {
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '(') depth += 1;
    else if (value[i] === ')') depth -= 1;
    else if (value[i] === ',' && depth === 0) return i;
  }
  return -1;
}

/** A theme's tokens for one color scheme: dark tokens override light ones. */
export function themeTokens(
  theme: Pick<Theme, 'tokens' | 'darkTokens'>,
  scheme: 'light' | 'dark' = 'light',
): Record<string, string> {
  return scheme === 'dark' ? { ...theme.tokens, ...theme.darkTokens } : { ...theme.tokens };
}
