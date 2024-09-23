import {
  IAssets,
  IMarkmapOptions,
  IPureNode,
  JSItem,
  UrlBuilder,
  buildJSItem,
  urlBuilder as defaultUrlBuilder,
  persistCSS,
  persistJS,
} from 'markmap-common';
import { IMarkmapJSONOptions } from 'markmap-view';

export const template = process.env.TEMPLATE || '';

export const baseJsPaths = [
  `d3@${process.env.D3_VERSION}/dist/d3.min.js`,
  `markmap-view@${process.env.VIEW_VERSION}/dist/browser/index.js`,
];

export function fillTemplate(
  root: IPureNode | null,
  assets: IAssets,
  extra?: {
    baseJs?: JSItem[];
    jsonOptions?: IMarkmapJSONOptions;
    getOptions?: (jsonOptions: IMarkmapJSONOptions) => Partial<IMarkmapOptions>;
    urlBuilder?: UrlBuilder;
  },
): string {
  extra = {
    ...extra,
  };
  const urlBuilder = extra.urlBuilder ?? defaultUrlBuilder;
  extra.baseJs ??= baseJsPaths
    .map((path) => urlBuilder.getFullUrl(path))
    .map((path) => buildJSItem(path));
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
              jsonOptions: IMarkmapJSONOptions,
            ) => {
              const markmap = getMarkmap();
              window.mm = markmap.Markmap.create(
                'svg#mindmap',
                (getOptions || markmap.deriveOptions)(jsonOptions),
                root,
              );
            },
            getParams: ({ getMarkmap, getOptions, root, jsonOptions }) => {
              return [getMarkmap, getOptions, root, jsonOptions];
            },
          },
        } as JSItem,
      ],
      context,
    ),
  ];
  const html = template
    .replace('<!--CSS-->', () => cssList.join(''))
    .replace('<!--JS-->', () => jsList.join(''));
  return html;
}
