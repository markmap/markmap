import { JSItem, CSSItem } from '../types';

export const styles: CSSItem[] = [];
export const scripts: JSItem[] = [
  {
    type: 'iife',
    data: {
      fn: mathJax => {
        mathJax.options = {
          skipHtmlTags: { '[-]': ['code', 'pre'] },
          ...mathJax.options,
        };
        (window as any).MathJax = mathJax;
      },
      getParams: context => [{ ...context.mathJax }],
    },
  },
  {
    type: 'script',
    data: {
      src: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js',
    },
  },
];

export function transform(nodes, mm): void {
  (window as any).MathJax.typeset?.(nodes);
}
