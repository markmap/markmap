import { JSItem, INode, persistJS, persistCSS } from 'markmap-common';
import { IAssets } from './types';

const template: string = process.env.TEMPLATE;

const BASE_JS: JSItem[] = [
  `https://cdn.jsdelivr.net/npm/d3@${process.env.D3_VERSION}`,
  `https://cdn.jsdelivr.net/npm/markmap-view@${process.env.VIEW_VERSION}`,
].map((src) => ({
  type: 'script',
  data: {
    src,
  },
}));

export function fillTemplate(
  data: INode | undefined,
  assets: IAssets,
  extra?: {
    baseJs?: JSItem[],
    getOptions?: () => any,
  } | (() => any),
): string {
  if (typeof extra === 'function') {
    extra = { getOptions: extra };
  }
  extra = {
    baseJs: BASE_JS,
    ...extra,
  };
  const { scripts, styles } = assets;
  const cssList = [
    ...styles ? persistCSS(styles) : [],
  ];
  const context = {
    getMarkmap: () => (window as any).markmap,
    getOptions: extra.getOptions,
    data,
  };
  const jsList = [
    ...persistJS(extra.baseJs),
    ...persistJS([
      ...scripts || [],
      {
        type: 'iife',
        data: {
          fn: (getMarkmap, getOptions, data) => {
            const { Markmap } = getMarkmap();
            (window as any).mm = Markmap.create('svg#mindmap', getOptions?.(), data);
          },
          getParams: ({ getMarkmap, getOptions, data }) => {
            return [getMarkmap, getOptions, data];
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
