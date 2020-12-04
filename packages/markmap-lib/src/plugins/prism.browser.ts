import { loadJS } from 'markmap-common';
import { IAssets, ITransformHooks } from '../types';

let loading: Promise<void>;
const autoload = () => {
  loading = loading || loadJS([
    {
      type: 'script',
      data: {
        src: `https://cdn.jsdelivr.net/npm/prismjs@${process.env.PRISM_VERSION}/components/prism-core.min.js`,
      },
    },
    {
      type: 'script',
      data: {
        src: `https://cdn.jsdelivr.net/npm/prismjs@${process.env.PRISM_VERSION}/plugins/autoloader/prism-autoloader.min.js`,
      },
    },
  ]);
  return loading;
};

function loadLanguageAndRefresh(lang: string, transformHooks: ITransformHooks) {
  autoload().then(() => {
    (window as any).Prism.plugins.autoloader.loadLanguages([lang], () => {
      transformHooks.retransform.call();
    });
  });
}

export const name = 'prism';
export function transform(transformHooks: ITransformHooks): IAssets {
  transformHooks.parser.tap((md, features) => {
    md.set({
      highlight: (str, lang) => {
        features[name] = true;
        const { Prism } = window as any;
        const grammar = Prism?.languages?.[lang];
        if (!grammar) {
          loadLanguageAndRefresh(lang, transformHooks);
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
