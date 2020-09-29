import remarkableKatex from 'remarkable-katex';
import { IAssets, ITransformHooks } from '../types';
import { wrapFunction } from '../util';

export const name = 'katex';
export function transform(transformHooks: ITransformHooks): IAssets {
  transformHooks.parser.tap((md, features) => {
    md.use(remarkableKatex);
    md.renderer.rules.katex = wrapFunction(md.renderer.rules.katex, {
      after: () => {
        features[name] = true;
      },
    });
  });
  return {
    styles: [
      {
        type: 'stylesheet',
        data: {
          href: 'https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/katex.min.css',
        },
      },
    ],
  };
}
