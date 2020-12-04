import remarkableKatex from 'remarkable-katex';
import { loadJS } from 'markmap-common';
import { IAssets, ITransformHooks } from '../types';

let loading: Promise<void>;
const autoload = () => {
  loading = loading || loadJS([{
    type: 'script',
    data: {
      src: 'https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/katex.min.js',
    },
  }]);
  return loading;
};

export const name = 'katex';
export function transform(transformHooks: ITransformHooks): IAssets {
  transformHooks.parser.tap((md, features) => {
    md.use(remarkableKatex);
    const renderKatex = (source, displayMode) => {
      const { katex } = window as any;
      if (katex) return katex.renderToString(source, { displayMode, throwOnError: false });
      autoload().then(() => {
        transformHooks.retransform.call();
      });
      return source;
    };
    md.renderer.rules.katex = (tokens, idx) => {
      const result = renderKatex(tokens[idx].content, tokens[idx].block);
      features[name] = true;
      return result;
    };
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
    scripts: [
      {
        type: 'iife',
        data: {
          fn: (getMarkmap) => {
            (window as any).WebFontConfig = {
              custom: {
                families: [
                  'KaTeX_AMS', 'KaTeX_Caligraphic:n4,n7', 'KaTeX_Fraktur:n4,n7',
                  'KaTeX_Main:n4,n7,i4,i7', 'KaTeX_Math:i4,i7', 'KaTeX_Script',
                  'KaTeX_SansSerif:n4,n7,i4', 'KaTeX_Size1', 'KaTeX_Size2', 'KaTeX_Size3',
                  'KaTeX_Size4', 'KaTeX_Typewriter',
                ],
              },
              active: () => {
                getMarkmap().refreshHook.call();
              },
            };
          },
          getParams({ getMarkmap }) {
            return [getMarkmap];
          },
        },
      },
      {
        type: 'script',
        data: {
          src: 'https://cdn.jsdelivr.net/npm/webfontloader@1.6.28/webfontloader.js',
          defer: true,
        },
      },
    ],
  };
}
