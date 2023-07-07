import {
  JSItem,
  INode,
  IMarkmapOptions,
  IMarkmapJSONOptions,
  persistJS,
  persistCSS,
} from 'markmap-common';
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
  root: INode | undefined,
  assets: IAssets,
  extra?: {
    baseJs?: JSItem[];
    jsonOptions?: IMarkmapJSONOptions;
    getOptions?: (jsonOptions: IMarkmapJSONOptions) => Partial<IMarkmapOptions>;
  }
): string {
  extra = {
    baseJs: BASE_JS,
    ...extra,
  };
  const { scripts, styles } = assets;
  const cssList = [...(styles ? persistCSS(styles) : [])];
  const context = {
    getMarkmap: () => window.markmap,
    getOptions: extra.getOptions,
    jsonOptions: extra.jsonOptions,
    root,
  };
  const jsList = [
    ...persistJS(
      [
        ...extra.baseJs,
        ...(scripts || []),
        {
          type: 'iife',
          data: {
            fn: (
              getMarkmap: (typeof context)['getMarkmap'],
              getOptions: (typeof context)['getOptions'],
              root: (typeof context)['root'],
              jsonOptions: IMarkmapJSONOptions
            ) => {
              const markmap = getMarkmap();
              window.mm = markmap.Markmap.create(
                'svg#mindmap',
                (getOptions || markmap.deriveOptions)(jsonOptions),
                root
              );
            },
            getParams: ({ getMarkmap, getOptions, root, jsonOptions }) => {
              return [getMarkmap, getOptions, root, jsonOptions];
            },
          },
        },
      ],
      context
    ),
  ];
  const html = template
    .replace('<!--CSS-->', () => cssList.join(''))
    .replace('<!--JS-->', () => jsList.join(''));
  return html;
}
