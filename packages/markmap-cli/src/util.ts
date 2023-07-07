import { buildCSSItem, buildJSItem } from 'markmap-common';
import { IAssets } from 'markmap-lib';

const TOOLBAR_VERSION = process.env.TOOLBAR_VERSION;
const TOOLBAR_CSS = `markmap-toolbar@${TOOLBAR_VERSION}/dist/style.min.css`;
const TOOLBAR_JS = `markmap-toolbar@${TOOLBAR_VERSION}/dist/index.umd.min.js`;

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
   * whether to open the generated markmap in browser
   */
  open: boolean;
  /**
   * whether to show default toolbar
   */
  toolbar: boolean;
}

export function addToolbar(assets: IAssets): IAssets {
  return {
    styles: [...(assets.styles || []), ...[TOOLBAR_CSS].map(buildCSSItem)],
    scripts: [
      ...(assets.scripts || []),
      ...[TOOLBAR_JS].map(buildJSItem),
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
