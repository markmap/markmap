import yaml from 'js-yaml';
import { wrapFunction } from 'markmap-common';
import { IAssets, ITransformHooks } from '../types';

export const name = 'frontmatter';
export function transform(transformHooks: ITransformHooks): IAssets {
  transformHooks.transform.tap((md, context) => {
    const origParse = md.parse;
    md.parse = wrapFunction(origParse, {
      before(ctx) {
        const [content] = ctx.args;
        if (!content.startsWith('---\n')) return;
        const endOffset = content.indexOf('\n---\n');
        if (endOffset < 0) return;
        const raw = content.slice(4, endOffset);
        try {
          context.frontmatter = yaml.load(raw);
        } catch {
          return;
        }
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
