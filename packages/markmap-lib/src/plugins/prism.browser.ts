import Prism from 'prismjs';
import { loadJS } from 'markmap-common';
import { IAssets, ITransformHooks } from '../types';

let loading: Promise<void>;
const autoload = () => {
  loading = loading || loadJS([{
    type: 'script',
    data: {
      src: `https://cdn.jsdelivr.net/npm/prismjs@${process.env.PRISM_VERSION}/plugins/autoloader/prism-autoloader.min.js`,
    },
  }]);
  return loading;
};

export const name = 'prism';
export function transform(transformHooks: ITransformHooks): IAssets {
  transformHooks.parser.tap((md, features) => {
    md.set({
      highlight: (str, lang) => {
        features[name] = true;
        const grammar = Prism.languages[lang];
        if (!grammar) {
          autoload().then(() => {
            Prism.plugins.autoloader.loadLanguages([lang], () => {
              transformHooks.retransform.call();
            });
          });
          return '';
        }
        return Prism.highlight(str, grammar, lang);
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
