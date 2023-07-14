import { buildCSSItem, buildJSItem } from 'markmap-common';
import { IAssets } from 'markmap-lib';

const TOOLBAR_VERSION = process.env.TOOLBAR_VERSION;
const TOOLBAR_CSS = `markmap-toolbar@${TOOLBAR_VERSION}/dist/style.css`;
const TOOLBAR_JS = `markmap-toolbar@${TOOLBAR_VERSION}/dist/index.js`;

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

export function addToolbar(assets: IAssets): IAssets {
  return {
    styles: [
      ...(assets.styles || []),
      ...[TOOLBAR_CSS].map((path) => buildCSSItem(path)),
    ],
    scripts: [
      ...(assets.scripts || []),
      ...[TOOLBAR_JS].map((path) => buildJSItem(path)),
      {
        type: 'iife',
        data: {
          fn: (r: () => void) => {
            setTimeout(r);
          },
          getParams: () => [renderToolbar],
        },
      },
    ],
  };
}

export class Defer<T> {
  resolve: (value: T) => void;

  reject: (err: Error) => void;

  promise = new Promise((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}

export function localProvider(path: string) {
  const parts = path.split('/');
  parts[0] = parts[0].replace(/@[\d.]+$/, '');
  path = parts.join('/');
  return `/node_modules/${path}`;
}
