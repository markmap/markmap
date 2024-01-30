import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import open from 'open';
import updateNotifier from 'update-notifier';
import { readPackageUp } from 'read-package-up';
import { CSSItem, JSItem, buildJSItem } from 'markmap-common';
import {
  Transformer,
  type IMarkmapCreateOptions,
  type IAssets,
} from 'markmap-lib';
import { baseJsPaths, fillTemplate } from 'markmap-render';
import { ASSETS_PREFIX, addToolbar, config, localProvider } from './util';
import { IDevelopOptions } from './types';
import { develop } from './dev-server';
import { fetchAssets } from './fetch-assets';

export * from 'markmap-lib';
export * from './types';
export { config, develop, fetchAssets };

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
  options: IMarkmapCreateOptions & IDevelopOptions,
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
  let assets = transformer.getUsedAssets(features);
  assets = {
    ...assets,
    scripts: [
      ...baseJsPaths
        .map((path) => transformer.urlBuilder.getFullUrl(path))
        .map((path) => buildJSItem(path)),
      ...(assets.scripts || []),
    ],
  };
  if (options.toolbar) {
    assets = addToolbar(transformer.urlBuilder, assets);
  }
  if (options.offline) {
    assets = await inlineAssets(assets);
  }
  const html = fillTemplate(root, assets, {
    baseJs: [],
    jsonOptions: (frontmatter as any)?.markmap,
    urlBuilder: transformer.urlBuilder,
  });
  const output = options.output || 'markmap.html';
  await writeFile(output, html, 'utf8');
  if (options.open) open(output);
}

export async function main() {
  const pkg = (
    await readPackageUp({
      cwd: fileURLToPath(import.meta.url),
    })
  )?.packageJson;
  if (!pkg) throw new Error('package.json not found');

  const notifier = updateNotifier({ pkg });
  notifier.notify();

  const program = new Command();
  program
    .version(pkg.version)
    .description('Create a markmap from a Markdown input file')
    .arguments('<input>')
    .option('--no-open', 'do not open the output file after generation')
    .option('--no-toolbar', 'do not show toolbar')
    .option('-o, --output <output>', 'specify filename of the output HTML')
    .option(
      '--offline',
      'Inline all assets to allow the generated HTML to work offline',
    )
    .option(
      '-w, --watch',
      'watch the input file and update output on the fly, note that this feature is for development only',
    )
    .action(async (input, cmd) => {
      let { offline } = cmd;
      if (cmd.watch) offline = true;
      if (offline) await fetchAssets();
      const content = await readFile(input, 'utf8');
      const output = cmd.output || `${input.replace(/\.\w*$/, '')}.html`;
      if (cmd.watch) {
        await develop(input, {
          open: cmd.open,
          toolbar: cmd.toolbar,
          offline,
        });
      } else {
        await createMarkmap({
          content,
          output,
          open: cmd.open,
          toolbar: cmd.toolbar,
          offline,
        });
      }
    });
  program.parse(process.argv);
}
