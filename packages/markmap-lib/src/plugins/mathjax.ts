import { JSItem, CSSItem, IMarkmap, IMarkmapPlugin } from '../types';

const styles: CSSItem[] = [];
const scripts: JSItem[] = [
  {
    type: 'iife',
    data: {
      fn: (mathJax) => {
        mathJax.options = {
          skipHtmlTags: { '[-]': ['code', 'pre'] },
          ...mathJax.options,
        };
        mathJax.startup = {
          typeset: false,
          ...mathJax.startup,
        };
        (window as any).MathJax = mathJax;
      },
      getParams: (context) => [{ ...context.mathJax }],
    },
  },
  {
    type: 'script',
    data: {
      src: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js',
    },
  },
];

function initialize(Markmap: IMarkmap, options): void {
  Markmap.transformHtml.tap((mm, nodes) => {
    (window as any).MathJax.typeset?.(nodes);
  });
}

export const plugin: IMarkmapPlugin = {
  styles,
  scripts,
  initialize,
};
