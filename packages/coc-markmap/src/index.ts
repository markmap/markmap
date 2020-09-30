import path from 'path';
import {
  ExtensionContext,
  commands,
  workspace,
} from 'coc.nvim';
import { develop, createMarkmap } from 'markmap-cli';

let devServer: ReturnType<develop>;

async function getFullText(): Promise<string> {
  const doc = await workspace.document;
  return doc.textDocument.getText();
}

async function getSelectedText(): Promise<string> {
  const doc = await workspace.document;
  const range = await workspace.getSelectedRange('v', doc);
  return doc.textDocument.getText(range);
}

async function getRangeText(line1: string, line2: string): Promise<string> {
  const { nvim } = workspace;
  const lines = await (nvim.eval(`getline(${line1},${line2})`)) as string[];
  return lines.join('\n');
}

async function createMarkmapFromVim(content: string, options?: any): Promise<void> {
  const { nvim } = workspace;
  const input = await nvim.eval('expand("%:p")');
  if (options.watch) {
    if (devServer) devServer.close();
    devServer = await develop({
      input,
      open: true,
    });
  } else {
    const basename = path.basename(input, path.extname(input));
    createMarkmap({
      ...options,
      content,
      output: basename && `${basename}.html`,
      open: true,
    });
  }
}

export function activate(context: ExtensionContext): void {
  // const config = workspace.getConfiguration('markmap');

  context.subscriptions.push(workspace.registerKeymap(
    ['n'],
    'markmap-create',
    async () => {
      await createMarkmapFromVim(await getFullText());
    },
    { sync: false },
  ));

  context.subscriptions.push(workspace.registerKeymap(
    ['v'],
    'markmap-create-v',
    async () => {
      await createMarkmapFromVim(await getSelectedText());
    },
    { sync: false },
  ));

  context.subscriptions.push(commands.registerCommand(
    'markmap.create',
    async (...args: string[]) => {
      const positional = [];
      const options: any = {};
      for (const arg of args) {
        if (['-w', '--watch'].includes(arg)) options.watch = true;
        else if (!arg.startsWith('-')) positional.push(arg);
      }
      const [line1, line2] = positional;
      const content = line1 && line2 ? await getRangeText(line1, line2) : await getFullText();
      await createMarkmapFromVim(content, options);
    },
  ));
}
