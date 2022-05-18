import { CSSItem, JSItem } from 'markmap-common';

export default {
  preloadScripts: [
    {
      type: 'script',
      data: {
        src: `https://cdn.jsdelivr.net/npm/katex@${process.env.KATEX_VERSION}/dist/katex.min.js`,
      },
    },
  ] as JSItem[],
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
        src: `https://cdn.jsdelivr.net/npm/webfontloader@${process.env.WEBFONTLOADER_VERSION}/webfontloader.js`,
        defer: true,
      },
    },
  ] as JSItem[],
  styles: [
    {
      type: 'stylesheet',
      data: {
        href: `https://cdn.jsdelivr.net/npm/katex@${process.env.KATEX_VERSION}/dist/katex.min.css`,
      },
    },
  ] as CSSItem[],
};
