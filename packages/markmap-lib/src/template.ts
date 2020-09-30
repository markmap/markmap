import { JSItem, INode, IAssets } from './types';
import { persistJS, persistCSS } from './util';

const template: string = process.env.TEMPLATE;
const version: string = process.env.VERSION;

const baseJs: JSItem[] = [
  'https://cdn.jsdelivr.net/npm/d3@5',
  `https://cdn.jsdelivr.net/npm/markmap-lib@${version}/dist/browser/view.min.js`,
].map((src) => ({
  type: 'script',
  data: {
    src,
  },
}));

export function fillTemplate(data: INode, opts: IAssets): string {
  const { scripts, styles } = opts;
  const cssList = [
    ...styles ? persistCSS(styles) : [],
  ];
  const context = {
    getMarkmap: () => (window as any).markmap,
    data,
    opts,
  };
  const jsList = [
    ...persistJS(baseJs),
    ...scripts ? persistJS(scripts, context) : [],
    ...persistJS([
      {
        type: 'iife',
        data: {
          fn: (getMarkmap, data, init, items, opts) => {
            const { Markmap, loadPlugins } = getMarkmap();
            (init ? init(loadPlugins, items, opts) : Promise.resolve())
              .then(() => {
                (window as any).mm = Markmap.create('svg#mindmap', null, data);
              });
          },
          getParams: ({ getMarkmap, data, opts }) => {
            const items = [
              opts?.mathJax && 'mathJax',
              opts?.prism && 'prism',
            ].filter(Boolean);
            const args = [getMarkmap, data];
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
    ], context),
  ];
  const html = template
    .replace('<!--CSS-->', () => cssList.join(''))
    .replace('<!--JS-->', () => jsList.join(''));
  return html;
}
