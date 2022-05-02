import type { Remarkable } from 'remarkable';
import remarkableKatex from 'remarkable-katex';
import { loadJS } from 'markmap-common';
import { IAssets, ITransformHooks } from '../types';

let loading: Promise<void>;
const autoload = () => {
  loading ||= loadJS([
    {
      type: 'script',
      data: {
        src: 'https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/katex.min.js',
      },
    },
  ]);
  return loading;
};

export const name = 'katex';
export function transform(transformHooks: ITransformHooks): IAssets {
  const renderKatex = (source: string, displayMode: boolean) => {
    const { katex } = window;
    if (katex) {
      return katex.renderToString(source, {
        displayMode,
        throwOnError: false,
      });
    }
    autoload().then(() => {
      transformHooks.retransform.call();
    });
    return source;
  };
  let enableFeature = () => {};
  transformHooks.parser.tap((md) => {
    md.use(remarkableKatex);
    md.renderer.rules.katex = (
      tokens: Remarkable.ContentToken[],
      idx: number
    ) => {
      enableFeature();
      const result = renderKatex(tokens[idx].content, tokens[idx].block);
      return result;
    };
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
          href: 'https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/katex.min.css',
        },
      },
    ],
    scripts: [
      {
        type: 'iife',
        data: {
          fn: (getMarkmap: () => typeof import('markmap-view')) => {
            window.WebFontConfig = {
              custom: {
                families: [
                  'KaTeX_AMS',
                  'KaTeX_Caligraphic:n4,n7',
                  'KaTeX_Fraktur:n4,n7',
                  'KaTeX_Main:n4,n7,i4,i7',
                  'KaTeX_Math:i4,i7',
                  'KaTeX_Script',
                  'KaTeX_SansSerif:n4,n7,i4',
                  'KaTeX_Size1',
                  'KaTeX_Size2',
                  'KaTeX_Size3',
                  'KaTeX_Size4',
                  'KaTeX_Typewriter',
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
