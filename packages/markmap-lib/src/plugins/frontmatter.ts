import yaml from 'js-yaml';
import { wrapFunction, IMarkmapJSONOptions } from 'markmap-common';
import { IAssets, ITransformHooks } from '../types';

export const name = 'frontmatter';
export function transform(transformHooks: ITransformHooks): IAssets {
  transformHooks.beforeParse.tap((md, context) => {
    const origParse = md.parse;
    md.parse = wrapFunction(origParse, {
      before(ctx) {
        const [content] = ctx.args;
        if (!content.startsWith('---\n')) return;
        const endOffset = content.indexOf('\n---\n');
        if (endOffset < 0) return;
        const raw = content.slice(4, endOffset);
        let frontmatter: typeof context.frontmatter;
        try {
          frontmatter = yaml.load(raw);
          if (frontmatter?.markmap) {
            frontmatter.markmap = normalizeMarkmapJsonOptions(
              frontmatter.markmap
            );
          }
        } catch {
          return;
        }
        context.frontmatter = frontmatter;
        const offset = endOffset + 5;
        ctx.args[0] = content.slice(offset);
      },
      after() {
        md.parse = origParse;
      },
    });
  });
  return {};
}

function normalizeMarkmapJsonOptions(options?: IMarkmapJSONOptions) {
  if (!options) return;
  ['color', 'extraJs', 'extraCss'].forEach((key) => {
    if (options[key] != null) options[key] = normalizeStringArray(options[key]);
  });
  ['duration', 'maxWidth', 'initialExpandLevel'].forEach((key) => {
    if (options[key] != null) options[key] = normalizeNumber(options[key]);
  });
  return options;
}

function normalizeStringArray(value: string | string[]) {
  let result: string[];
  if (typeof value === 'string') result = [value];
  else if (Array.isArray(value))
    result = value.filter((item) => item && typeof item === 'string');
  return result?.length ? result : undefined;
}

function normalizeNumber(value: number | string) {
  if (isNaN(+value)) return;
  return +value;
}
