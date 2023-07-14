import { promises as fs } from 'fs';
import { Command } from 'commander';
import open from 'open';
import {
  CSSItem,
  JSItem,
  buildJSItem,
  findFastestProvider,
  setProvider,
} from 'markmap-common';
import {
  Transformer,
  baseJsPaths,
  fillTemplate,
  type IMarkmapCreateOptions,
  type IAssets,
} from 'markmap-lib';
import { IDevelopOptions, addToolbar, localProvider } from './util';
import { develop } from './dev-server';

export * from 'markmap-lib';
export { develop };

async function loadFile(path: string) {
  if (path.startsWith('/node_modules/')) {
    const relpath = path.slice(14);
    return fs.readFile(require.resolve(relpath), 'utf8');
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
  if (options.offline) {
    setProvider('local', localProvider);
  } else {
    await findFastestProvider();
  }
  const transformer = new Transformer();
  const { root, features, frontmatter } = transformer.transform(
    options.content || ''
  );
  let assets = transformer.getUsedAssets(features);
  assets = {
    ...assets,
    scripts: [
      ...baseJsPaths.map((path) => buildJSItem(path)),
      ...(assets.scripts || []),
    ],
  };
  if (options.toolbar) {
    assets = addToolbar(assets);
  }
  if (options.offline) {
    assets = await inlineAssets(assets);
  }
  const html = fillTemplate(root, assets, {
    baseJs: [],
    jsonOptions: (frontmatter as any)?.markmap,
  });
  const output = options.output || 'markmap.html';
  await fs.writeFile(output, html, 'utf8');
  if (options.open) open(output);
}

export function main(version: string) {
  const program = new Command();
  program
    .version(version)
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
      const content = await fs.readFile(input, 'utf8');
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
