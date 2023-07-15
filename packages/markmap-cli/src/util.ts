import { buildCSSItem, buildJSItem, JSItem } from 'markmap-common';
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
      } as JSItem,
    ],
  };
}

function removeVersionString(part: string) {
  return part.replace(/@.+$/, '');
}

export function localProvider(path: string) {
  const parts = path.split('/');
  // xxx@0.0.0-alpha.0+aaaaaa
  // @scope/xxx@0.0.0-alpha.0+aaaaaa
  if (parts[0].startsWith('@')) {
    parts[1] = removeVersionString(parts[1]);
  } else {
    parts[0] = removeVersionString(parts[0]);
  }
  path = parts.join('/');
  return `/node_modules/${path}`;
}
