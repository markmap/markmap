/** Options that can be written in Markdown frontmatter under the `markmap` key. */
export interface MarkmapJSONOptions {
  /** Branch colors, cycled through. One color paints every branch the same. */
  color?: string[];
  /** Nodes deeper than this level (the root is level 1) take the color of their ancestor at this level. `0` disables. */
  colorFreezeLevel?: number;
  /** Fold nodes at this depth and deeper when first shown. `-1` expands everything. */
  initialExpandLevel?: number;
  /** Wrap labels wider than this, in px. `0` disables wrapping. */
  maxWidth?: number;
  spacingHorizontal?: number;
  spacingVertical?: number;
  zoom?: boolean;
  pan?: boolean;
  fitPadding?: number;
  maxFitScale?: number;
}

export interface JSONOptionsResult {
  options: MarkmapJSONOptions;
  /** Problems found, one per ignored value. */
  warnings: string[];
}

interface NumberRule {
  min: number;
  integer?: boolean;
}

const NUMBERS: Record<string, NumberRule> = {
  colorFreezeLevel: { min: 0, integer: true },
  initialExpandLevel: { min: -1, integer: true },
  maxWidth: { min: 0 },
  spacingHorizontal: { min: 0 },
  spacingVertical: { min: 0 },
  fitPadding: { min: 0 },
  maxFitScale: { min: 0.01 },
};

const BOOLEANS = new Set(['zoom', 'pan']);

/**
 * A CSS value that cannot break out of a declaration or a `<style>` element.
 * Colors from Markdown end up in embedded CSS, so they must pass this check.
 */
export function isSafeCSSValue(value: string): boolean {
  return value.length > 0 && value.length <= 100 && !/[;{}<>\\'"]|\/\*/.test(value);
}

/** Validate untrusted options, keeping valid values and reporting the rest. */
export function readJSONOptions(input: unknown): JSONOptionsResult {
  const options: MarkmapJSONOptions = {};
  const warnings: string[] = [];
  if (input == null) return { options, warnings };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { options, warnings: ['`markmap` options must be an object'] };
  }
  const target = options as Record<string, unknown>;

  for (const [key, value] of Object.entries(input)) {
    const rule = NUMBERS[key];
    if (rule) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        warnings.push(`\`${key}\` must be a number`);
      } else if (value < rule.min || (rule.integer && !Number.isInteger(value))) {
        warnings.push(`\`${key}\` must be ${rule.integer ? 'an integer ' : ''}>= ${rule.min}`);
      } else target[key] = value;
    } else if (BOOLEANS.has(key)) {
      if (typeof value === 'boolean') target[key] = value;
      else warnings.push(`\`${key}\` must be true or false`);
    } else if (key === 'color') {
      const colors = typeof value === 'string' ? [value] : value;
      if (!Array.isArray(colors) || !colors.length) {
        warnings.push('`color` must be a color or a list of colors');
        continue;
      }
      const safe = colors.filter(
        (c): c is string => typeof c === 'string' && isSafeCSSValue(c.trim()),
      );
      if (safe.length < colors.length)
        warnings.push('`color` has invalid colors, which were ignored');
      if (safe.length) options.color = safe.map((c) => c.trim());
    } else {
      warnings.push(`Unknown option \`${key}\``);
    }
  }
  return { options, warnings };
}
