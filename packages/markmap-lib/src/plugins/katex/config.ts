import { JSItem, buildCSSItem, buildJSItem } from 'markmap-common';

export const name = 'katex';

const preloadScripts = [
  `katex@${__define__.KATEX_VERSION}/dist/katex.min.js`,
].map((path) => buildJSItem(path));
const webfontloader = buildJSItem(
  `webfontloader@${__define__.WEBFONTLOADER_VERSION}/webfontloader.js`,
);
webfontloader.data.defer = true;
const styles = [`katex@${__define__.KATEX_VERSION}/dist/katex.min.css`].map(
  (path) => buildCSSItem(path),
);
export const config = {
  versions: {
    katex: __define__.KATEX_VERSION || '',
    webfontloader: __define__.WEBFONTLOADER_VERSION || '',
  },
  preloadScripts,
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
    webfontloader,
  ] as JSItem[],
  styles,
  resources: __define__.KATEX_RESOURCES,
};
