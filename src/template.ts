import { JSItem, IMarkmapCreateOptions } from './types';
import { persistJS } from './util';

const template: string = process.env.TEMPLATE;
const version: string = process.env.VERSION;

const baseJs: JSItem[] = [
  'https://cdn.jsdelivr.net/npm/d3@5',
  `https://cdn.jsdelivr.net/npm/markmap-lib@${version}/dist/browser/view.min.js`,
].map(src => ({
  type: 'script',
  data: {
    src,
  },
}));

export function fillTemplate(data: any, opts?: IMarkmapCreateOptions): string {
  const jsList = [
    ...persistJS(baseJs),
    ...persistJS([
      {
        type: 'iife',
        data: {
          fn: (data, init, items, opts) => {
            const { Markmap, loadPlugins } = (window as any).markmap;
            (init ? init(loadPlugins, items, opts) : Promise.resolve())
            .then(() => {
              Markmap.create('svg#mindmap', null, data);
            });
          },
          getParams: ({ data, opts }) => {
            const items = [
              opts?.mathJax && 'mathJax',
              opts?.prism && 'prism',
            ].filter(Boolean);
            const args = [data];
            if (items.length) {
              args.push(
                (loadPlugins, items, opts) => loadPlugins(items, opts),
                items,
                opts,
              );
            }
            return args;
          },
        },
      },
    ], { data, opts }),
  ];
  const html = template
    .replace('<!--CSS-->', '')
    .replace('<!--JS-->', () => jsList.join(''));
  return html;
}
