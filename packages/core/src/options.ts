/**
 * Options that can be written in Markdown frontmatter under the `markmap` key and
 * apply to every theme. Themes add their own keys, see `Theme.options`.
 */
export interface MarkmapJSONOptions {
  /** Fold nodes at this depth and deeper when first shown. Leave out to expand everything. */
  foldLevel?: number;
  /** Wrap labels wider than this, in px. `0` disables wrapping. */
  wrapWidth?: number;
  levelGap?: number;
  siblingGap?: number;
  zoom?: boolean;
  pan?: boolean;
  fitPadding?: number;
  fitMaxScale?: number;
  /** Smallest scale to zoom out to. `fit()` may go further to show everything. */
  minScale?: number;
  /** Largest scale to zoom in to. */
  maxScale?: number;
  /** Length of fold, update and fit animations, in ms. `0` disables them. */
  duration?: number;
  /** Name of a registered layout, such as `two-sided` or `org-chart`. */
  layout?: string;
  /** Name of a registered theme, such as `cards`. Its own options apply on top. */
  theme?: string;
  /** `light`, `dark`, or `auto` to follow the reader's system setting. */
  colorScheme?: 'light' | 'dark' | 'auto';
}

/**
 * Checks one untrusted option value. Return `value` to keep it (possibly normalized),
 * `warning` to report a problem, or both when part of the value was dropped.
 */
export type OptionValidator = (
  value: unknown,
  key: string,
) => { value?: unknown; warning?: string };

export type OptionSchema = Record<string, OptionValidator>;

/**
 * A CSS value that cannot break out of a declaration or a `<style>` element.
 * Colors from Markdown end up in embedded CSS, so they must pass this check.
 */
export function isSafeCSSValue(value: string): boolean {
  return value.length > 0 && value.length <= 100 && !/[;{}<>\\'"]|\/\*/.test(value);
}

export const validators = {
  number(min: number, integer = false): OptionValidator {
    return (value, key) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return { warning: `\`${key}\` must be a number` };
      }
      if (value < min || (integer && !Number.isInteger(value))) {
        return { warning: `\`${key}\` must be ${integer ? 'an integer ' : ''}>= ${min}` };
      }
      return { value };
    };
  },
  /** A short non-empty string, such as a name to look up. */
  string(): OptionValidator {
    return (value, key) =>
      typeof value === 'string' && value.trim() && value.length <= 100
        ? { value: value.trim() }
        : { warning: `\`${key}\` must be a non-empty string` };
  },
  oneOf<T extends string>(values: readonly T[]): OptionValidator {
    return (value, key) =>
      values.includes(value as T)
        ? { value }
        : { warning: `\`${key}\` must be one of ${values.map((v) => `\`${v}\``).join(', ')}` };
  },
  boolean(): OptionValidator {
    return (value, key) =>
      typeof value === 'boolean' ? { value } : { warning: `\`${key}\` must be true or false` };
  },
  /** One CSS color or a list of them; always normalized to a list. Unsafe values are dropped. */
  colors(): OptionValidator {
    return (value, key) => {
      const colors = typeof value === 'string' ? [value] : value;
      if (!Array.isArray(colors) || !colors.length) {
        return { warning: `\`${key}\` must be a color or a list of colors` };
      }
      const safe = colors
        .filter((c): c is string => typeof c === 'string' && isSafeCSSValue(c.trim()))
        .map((c) => c.trim());
      return {
        value: safe.length ? safe : undefined,
        warning:
          safe.length < colors.length
            ? `\`${key}\` has invalid colors, which were ignored`
            : undefined,
      };
    };
  },
};

const CORE_SCHEMA: OptionSchema = {
  foldLevel: validators.number(0, true),
  wrapWidth: validators.number(0),
  levelGap: validators.number(0),
  siblingGap: validators.number(0),
  zoom: validators.boolean(),
  pan: validators.boolean(),
  fitPadding: validators.number(0),
  fitMaxScale: validators.number(0.01),
  minScale: validators.number(0.001),
  maxScale: validators.number(0.01),
  duration: validators.number(0),
  layout: validators.string(),
  theme: validators.string(),
  colorScheme: validators.oneOf(['light', 'dark', 'auto']),
};

export interface ValidatedOptions<T> {
  options: T;
  /** Keys the schema does not know, left for another schema (such as the theme's). */
  rest: Record<string, unknown>;
  /** Problems found, one per ignored or partly ignored value. */
  warnings: string[];
}

/** Validate untrusted options against a schema. */
export function validateOptions<T = Record<string, unknown>>(
  input: unknown,
  schema: OptionSchema,
): ValidatedOptions<T> {
  const options: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  const warnings: string[] = [];
  if (input == null) return { options: options as T, rest, warnings };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { options: options as T, rest, warnings: ['`markmap` options must be an object'] };
  }
  for (const [key, raw] of Object.entries(input)) {
    const validate = Object.hasOwn(schema, key) ? schema[key] : undefined;
    if (!validate) {
      rest[key] = raw;
      continue;
    }
    const { value, warning } = validate(raw, key);
    if (warning) warnings.push(warning);
    if (value !== undefined) options[key] = value;
  }
  return { options: options as T, rest, warnings };
}

/** Validate the theme-independent options. Theme keys are returned in `rest`. */
export function readJSONOptions(input: unknown): ValidatedOptions<MarkmapJSONOptions> {
  return validateOptions<MarkmapJSONOptions>(input, CORE_SCHEMA);
}

/** Warnings for keys that no schema claimed. */
export function unknownOptionWarnings(rest: Record<string, unknown>): string[] {
  return Object.keys(rest).map((key) => `Unknown option \`${key}\``);
}
