import { loadJS } from 'markmap-common';
import { IAssets, ITransformHooks } from '../types';

let loading: Promise<void>;
const autoload = () => {
  loading ||= loadJS([
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
    window.Prism.plugins.autoloader.loadLanguages([lang], () => {
      transformHooks.retransform.call();
    });
  });
}

export const name = 'prism';
export function transform(transformHooks: ITransformHooks): IAssets {
  let enableFeature = () => {};
  transformHooks.parser.tap((md) => {
    md.set({
      highlight: (str, lang) => {
        enableFeature();
        const { Prism } = window;
        const grammar = Prism?.languages?.[lang];
        if (!grammar) {
          loadLanguageAndRefresh(lang, transformHooks);
          return '';
        }
        return Prism.highlight(str, grammar, lang);
      },
    });
  });
  transformHooks.transform.tap((_, context) => {
    enableFeature = () => {
      context.features[name] = true;
    };
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
