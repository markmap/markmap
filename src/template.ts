import { JSItem, IMarkmapCreateOptions } from './types';
import { persistJS, persistPlugins } from './util';
import { mathJax, prism } from './plugins';

const template: string = process.env.TEMPLATE;

const baseJs: JSItem[] = [
  'https://cdn.jsdelivr.net/npm/d3@5',
  'https://cdn.jsdelivr.net/npm/markmap-lib@process.env.VERSION/dist/browser/view.min.js',
].map(src => ({
  type: 'script',
  data: {
    src,
  },
}));

export function fillTemplate(data: any, opts?: IMarkmapCreateOptions): string {
  const { js, css, initializers } = persistPlugins([
    opts?.mathJax && mathJax,
    opts?.prism && prism,
  ].filter(Boolean), opts);
  const jsList = [
    ...persistJS(baseJs),
    js,
    ...persistJS([
      {
        type: 'iife',
        data: {
          fn: (data, ...initializers) => {
            const { Markmap } = (window as any).markmap;
            initializers.forEach(initialize => initialize(Markmap));
            Markmap.create('svg#mindmap', null, data);
          },
          getParams: ({ data, initializers }) => [
            data,
            ...initializers,
          ],
        },
      },
    ], { data, initializers }),
  ];
  const html = template
    .replace('<!--CSS-->', css)
    .replace('<!--JS-->', jsList.join(''));
  return html;
}
