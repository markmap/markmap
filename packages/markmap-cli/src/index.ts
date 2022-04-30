import { promises as fs } from 'fs';
import { Command } from 'commander';
import open from 'open';
import { Transformer, fillTemplate } from 'markmap-lib';
import type { IMarkmapCreateOptions } from 'markmap-lib';
import { IDevelopOptions, addToolbar } from './util';
import { develop } from './dev-server';

export * from 'markmap-lib';
export { develop };

export async function createMarkmap(
  options: IMarkmapCreateOptions & IDevelopOptions
): Promise<void> {
  const transformer = new Transformer();
  const { root, features, frontmatter } = transformer.transform(
    options.content || ''
  );
  let assets = transformer.getUsedAssets(features);
  if (options.toolbar) assets = addToolbar(assets);
  const html = fillTemplate(root, assets, {
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
        });
      } else {
        await createMarkmap({
          content,
          output,
          open: cmd.open,
          toolbar: cmd.toolbar,
        });
      }
    });
  program.parse(process.argv);
}
