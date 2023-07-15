import { join } from 'path';
import { createRequire } from 'module';
import { packageDirectory } from 'pkg-dir';
import { buildCSSItem, buildJSItem, JSItem } from 'markmap-common';
import { IAssets, ITransformer } from 'markmap-lib';

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

export function addToolbar(
  transformer: ITransformer,
  assets: IAssets
): IAssets {
  return {
    styles: [
      ...(assets.styles || []),
      ...[TOOLBAR_CSS]
        .map((path) => transformer.urlBuilder.getFullUrl(path))
        .map((path) => buildCSSItem(path)),
    ],
    scripts: [
      ...(assets.scripts || []),
      ...[TOOLBAR_JS]
        .map((path) => transformer.urlBuilder.getFullUrl(path))
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

const require = createRequire(import.meta.url);

async function doResolveFile(relpath: string) {
  const parts = relpath.split('/');
  const nameOffset = parts[0].startsWith('@') ? 2 : 1;
  const name = parts.slice(0, nameOffset).join('/');
  const filepath = parts.slice(nameOffset).join('/');
  const mainPath = require.resolve(name);
  const pkgDir = await packageDirectory({
    cwd: mainPath,
  });
  if (!pkgDir) throw new Error(`File not found: ${relpath}`);
  const realpath = join(pkgDir, filepath);
  return realpath;
}

const cache: Record<string, Promise<string>> = {};

export function resolveFile(relpath: string) {
  cache[relpath] ||= doResolveFile(relpath);
  return cache[relpath];
}
