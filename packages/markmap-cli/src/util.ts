import { IAssets } from 'markmap-lib';

const TOOLBAR_VERSION = process.env.TOOLBAR_VERSION;
const TOOLBAR_CSS = `npm/markmap-toolbar@${TOOLBAR_VERSION}/dist/style.min.css`;
const TOOLBAR_JS = `npm/markmap-toolbar@${TOOLBAR_VERSION}/dist/index.umd.min.js`;

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
    styles: [
      ...(assets.styles || []),
      {
        type: 'stylesheet',
        data: {
          href: `https://cdn.jsdelivr.net/${TOOLBAR_CSS}`,
        },
      },
    ],
    scripts: [
      ...(assets.scripts || []),
      {
        type: 'script',
        data: {
          src: `https://cdn.jsdelivr.net/${TOOLBAR_JS}`,
        },
      },
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
