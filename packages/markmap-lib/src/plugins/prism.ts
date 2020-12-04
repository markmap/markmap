import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/';
import { IAssets, ITransformHooks } from '../types';

export const name = 'prism';
export function transform(transformHooks: ITransformHooks): IAssets {
  transformHooks.parser.tap((md, features) => {
    md.set({
      highlight: (str, lang) => {
        features[name] = true;
        let grammar = Prism.languages[lang];
        if (!grammar) {
          loadLanguages([lang]);
          grammar = Prism.languages[lang];
        }
        if (grammar) {
          return Prism.highlight(str, grammar, lang);
        }
        return '';
      },
    });
  });
  return {
    styles: [
      {
        type: 'stylesheet',
        data: {
          href: `https://cdn.jsdelivr.net/npm/prismjs@${process.env.PRISM_VERSION}/themes/prism.css`,
        },
      },
    ],
  };
}
