import { resolve } from 'path';
import { packageDirectory } from 'pkg-dir';
import { buildCSSItem, buildJSItem, JSItem, UrlBuilder } from 'markmap-common';
import { IAssets } from 'markmap-lib';

const TOOLBAR_VERSION = process.env.TOOLBAR_VERSION;
const TOOLBAR_CSS = `markmap-toolbar@${TOOLBAR_VERSION}/dist/style.css`;
const TOOLBAR_JS = `markmap-toolbar@${TOOLBAR_VERSION}/dist/index.js`;

export const ASSETS_PREFIX = '/assets/';

const renderToolbar = () => {
  const { markmap, mm } = window;
  const toolbar = new markmap.Toolbar();
  toolbar.attach(mm);
  const el = toolbar.render() as HTMLElement;
  el.setAttribute('style', 'position:absolute;bottom:20px;right:20px');
  document.body.append(el);
};

export interface IDevelopOptions {
  /**
   * Whether to open the generated markmap in browser
   */
  open: boolean;
  /**
   * Whether to show the default toolbar
   */
  toolbar: boolean;
  /**
   * Whether to inline all assets to make the HTML work offline.
   * Ignored in watching mode.
   */
  offline: boolean;
}

export function addToolbar(urlBuilder: UrlBuilder, assets: IAssets): IAssets {
  return {
    styles: [
      ...(assets.styles || []),
      ...[TOOLBAR_CSS]
        .map((path) => urlBuilder.getFullUrl(path))
        .map((path) => buildCSSItem(path)),
    ],
    scripts: [
      ...(assets.scripts || []),
      ...[TOOLBAR_JS]
        .map((path) => urlBuilder.getFullUrl(path))
        .map((path) => buildJSItem(path)),
      {
        type: 'iife',
        data: {
          fn: (r: () => void) => {
            setTimeout(r);
          },
          getParams: () => [renderToolbar],
        },
      } as JSItem,
    ],
  };
}

export function localProvider(path: string) {
  return `${ASSETS_PREFIX}${path}`;
}

export const rootDirPromise = packageDirectory({
  cwd: new URL(import.meta.url).pathname,
});

export const assetsDirPromise = rootDirPromise.then((rootDir) => {
  if (!rootDir) throw new Error('Could not find root dir');
  return resolve(rootDir, `.${ASSETS_PREFIX}`);
});
