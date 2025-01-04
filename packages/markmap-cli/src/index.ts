import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { CSSItem, JSItem, buildJSItem, mergeAssets } from 'markmap-common';
import {
  Transformer,
  type IAssets,
  type IMarkmapCreateOptions,
} from 'markmap-lib';
import { baseJsPaths, fillTemplate } from 'markmap-render';
import open from 'open';
import { basename, resolve } from 'path';
import { getPortPromise } from 'portfinder';
import { readPackageUp } from 'read-package-up';
import updateNotifier from 'update-notifier';
import { fileURLToPath } from 'url';
import { develop } from './dev-server';
import { fetchAssets } from './fetch-assets';
import { IDevelopOptions } from './types';
import { ASSETS_PREFIX, config, localProvider, toolbarAssets } from './util';

export * from './dev-server';
export * from './types';
export { config, fetchAssets };

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
    .option('--no-open', 'Do not open the output file after generation')
    .option('--no-toolbar', 'Do not show toolbar')
    .option('-o, --output <output>', 'Specify the filename of the output HTML')
    .option(
      '--offline',
      'Inline all assets to allow the generated HTML to work offline',
    )
    .option(
      '-w, --watch',
      'Watch the input file and update output on the fly, note that this feature is for development only',
    )
    .option('--port <port>', 'Set the port for the devServer to listen')
    .action(async (input: string, cmd) => {
      let { offline } = cmd;
      if (cmd.watch) offline = true;
      if (offline) await fetchAssets();
      const content = await readFile(input, 'utf8');
      const output = cmd.output || `${input.replace(/\.\w*$/, '')}.html`;
      if (cmd.watch) {
        const devServer = await develop({
          toolbar: cmd.toolbar,
          offline,
          port: +cmd.port || (await getPortPromise()),
        });
        const address = devServer.serverInfo!.address;
        const provider = devServer.addProvider({ filePath: input });
        const filename = basename(input);
        const url = `http://localhost:${address.port}/?key=${provider.key}&filename=${encodeURIComponent(filename)}`;
        console.log(`Listening at ${url}`);
        if (cmd.open) open(url);
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
