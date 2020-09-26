import remarkableKatex from 'remarkable-katex';
import { IAssets } from '../types';
import { wrapFunction } from '../util';
import { transformHooks } from './base';

export const name = 'katex';
export function transform(): IAssets {
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
