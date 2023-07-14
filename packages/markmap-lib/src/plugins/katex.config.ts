import { JSItem, buildJSItem, buildCSSItem } from 'markmap-common';

export function getConfig() {
  const preloadScripts = [
    `katex@${process.env.KATEX_VERSION}/dist/katex.min.js`,
  ].map((path) => buildJSItem(path));
  const webfontloader = buildJSItem(
    `webfontloader@${process.env.WEBFONTLOADER_VERSION}/webfontloader.js`
  );
  webfontloader.data.defer = true;
  const styles = [`katex@${process.env.KATEX_VERSION}/dist/katex.min.css`].map(
    (path) => buildCSSItem(path)
  );
  return {
    versions: {
      katex: process.env.KATEX_VERSION,
      webfontloader: process.env.WEBFONTLOADER_VERSION,
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
  };
}
