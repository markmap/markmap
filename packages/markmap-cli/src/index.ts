import { readFile, writeFile } from 'fs/promises';
import { CSSItem, JSItem, buildJSItem, mergeAssets } from 'markmap-common';
import {
  Transformer,
  type IAssets,
  type IMarkmapCreateOptions,
} from 'markmap-lib';
import { baseJsPaths, fillTemplate } from 'markmap-render';
import open from 'open';
import { resolve } from 'path';
import { IDevelopOptions } from './types';
import {
  ASSETS_PREFIX,
  config,
  localProvider,
  toolbarAssets,
} from './util/common';

export * from './types';
export * from './util/dev-server';
export { config };

export * as markmap from 'markmap-lib';

async function loadFile(path: string) {
  if (path.startsWith(ASSETS_PREFIX)) {
    const relpath = path.slice(ASSETS_PREFIX.length);
    return readFile(resolve(config.assetsDir, relpath), 'utf8');
  }
  const res = await fetch(path);
  if (!res.ok) throw res;
  return res.text();
}

async function inlineAssets(assets: IAssets): Promise<IAssets> {
  const [scripts, styles] = await Promise.all([
    Promise.all(
      (assets.scripts || []).map(
        async (item): Promise<JSItem> =>
          item.type === 'script' && item.data.src
            ? {
                type: 'script',
                data: {
                  textContent: await loadFile(item.data.src),
                },
              }
            : item,
      ),
    ),
    Promise.all(
      (assets.styles || []).map(
        async (item): Promise<CSSItem> =>
          item.type === 'stylesheet'
            ? {
                type: 'style',
                data: await loadFile(item.data.href),
              }
            : item,
      ),
    ),
  ]);
  return {
    scripts,
    styles,
  };
}

export async function createMarkmap(
  options: IMarkmapCreateOptions & IDevelopOptions & { open: boolean },
): Promise<void> {
  const transformer = new Transformer();
  if (options.offline) {
    transformer.urlBuilder.setProvider('local', localProvider);
    transformer.urlBuilder.provider = 'local';
  } else {
    try {
      await transformer.urlBuilder.findFastestProvider();
    } catch {
      // ignore
    }
  }
  const { root, features, frontmatter } = transformer.transform(
    options.content || '',
  );
  const otherAssets = mergeAssets(
    {
      scripts: baseJsPaths.map(buildJSItem),
    },
    options.toolbar ? toolbarAssets : null,
  );
  let assets = mergeAssets(
    {
      scripts: otherAssets.scripts?.map((item) => transformer.resolveJS(item)),
      styles: otherAssets.styles?.map((item) => transformer.resolveCSS(item)),
    },
    transformer.getUsedAssets(features),
  );
  if (options.offline) assets = await inlineAssets(assets);
  const html = fillTemplate(root, assets, {
    baseJs: [],
    jsonOptions: (frontmatter as any)?.markmap,
    urlBuilder: transformer.urlBuilder,
  });
  const output = options.output || 'markmap.html';
  await writeFile(output, html, 'utf8');
  if (options.open) open(output);
}
