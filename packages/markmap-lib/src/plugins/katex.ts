import remarkableKatex from 'remarkable-katex';
import { IAssets, ITransformHooks } from '../types';
import { wrapFunction, defer } from '../util';

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
    scripts: [
      {
        type: 'iife',
        data: {
          fn: (defer, getMarkmap) => {
            const deferred = defer();
            getMarkmap().registerRefreshPromise(deferred.promise);
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
                deferred.resolve();
              },
            };
          },
          getParams({ getMarkmap }) {
            return [defer, getMarkmap];
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
