import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import open from 'open';
import updateNotifier from 'update-notifier';
import { readPackageUp } from 'read-pkg-up';
import { CSSItem, JSItem, buildJSItem } from 'markmap-common';
import {
  Transformer,
  baseJsPaths,
  type IMarkmapCreateOptions,
  type IAssets,
} from 'markmap-lib';
import {
  IDevelopOptions,
  addToolbar,
  localProvider,
  resolveFile,
} from './util';
import { develop } from './dev-server';

export * from 'markmap-lib';
export { develop };

async function loadFile(path: string) {
  if (path.startsWith('/node_modules/')) {
    const relpath = path.slice(14);
    return readFile(await resolveFile(relpath), 'utf8');
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
            : item
      )
    ),
    Promise.all(
      (assets.styles || []).map(
        async (item): Promise<CSSItem> =>
          item.type === 'stylesheet'
            ? {
                type: 'style',
                data: await loadFile(item.data.href),
              }
            : item
      )
    ),
  ]);
  return {
    scripts,
    styles,
  };
}

export async function createMarkmap(
  options: IMarkmapCreateOptions & IDevelopOptions
): Promise<void> {
  const transformer = new Transformer();
  if (options.offline) {
    transformer.urlBuilder.setProvider('local', localProvider);
    transformer.urlBuilder.provider = 'local';
  } else {
    await transformer.urlBuilder.findFastestProvider();
  }
  const { root, features, frontmatter } = transformer.transform(
    options.content || ''
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
    assets = addToolbar(transformer, assets);
  }
  if (options.offline) {
    assets = await inlineAssets(assets);
  }
  const html = transformer.fillTemplate(root, assets, {
    baseJs: [],
    jsonOptions: (frontmatter as any)?.markmap,
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
      'Inline all assets to allow the generated HTML to work offline'
    )
    .option(
      '-w, --watch',
      'watch the input file and update output on the fly, note that this feature is for development only'
    )
    .action(async (input, cmd) => {
      const content = await readFile(input, 'utf8');
      const output = cmd.output || `${input.replace(/\.\w*$/, '')}.html`;
      if (cmd.watch) {
        await develop(input, {
          open: cmd.open,
          toolbar: cmd.toolbar,
          offline: true,
        });
      } else {
        await createMarkmap({
          content,
          output,
          open: cmd.open,
          toolbar: cmd.toolbar,
          offline: cmd.offline,
        });
      }
    });
  program.parse(process.argv);
}
