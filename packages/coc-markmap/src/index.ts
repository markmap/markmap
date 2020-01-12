import {
  ExtensionContext,
  commands,
  workspace,
} from 'coc.nvim';
import { Position, Range } from 'vscode-languageserver-types'
import { createMarkmap } from 'markmap-lib';

async function getFullText(): Promise<string> {
  const doc = await workspace.document;
  return doc.textDocument.getText();
}

async function getSelectedText(): Promise<string> {
  const { nvim } = workspace;
  const doc = await workspace.document;
  await nvim.command('normal! `<');
  const start = await workspace.getCursorPosition();
  await nvim.command('normal! `>');
  let end = await workspace.getCursorPosition();
  end = Position.create(end.line, end.character + 1);
  const range = Range.create(start, end);
  return doc.textDocument.getText(range);
}

async function getRangeText(line1: string, line2: string): Promise<string> {
  const { nvim } = workspace;
  const lines = await (nvim.eval(`getline(${line1},${line2})`)) as string[];
  return lines.join('\n');
}

async function createMarkmapFromVim(content: string, options?: any): Promise<void> {
  const { nvim } = workspace;
  const basename = await nvim.eval('expand("%:p:r")');
  createMarkmap({
    ...options,
    content,
    output: basename && `${basename}.html`,
  });
}

export function activate(context: ExtensionContext): void {
  const config = workspace.getConfiguration('markmap');

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
      const options: any = {
        mathJax: config.get<object>('mathJax'),
        prism: config.get<object>('prism'),
      };
      for (const arg of args) {
        if (arg === '--enable-mathjax') options.mathJax = true;
        else if (arg === '--enable-prism') options.prism = true;
        else if (!arg.startsWith('-')) positional.push(arg);
      }
      const [line1, line2] = positional;
      const content = line1 && line2 ? await getRangeText(line1, line2) : await getFullText();
      await createMarkmapFromVim(content, options);
    },
  ));
}
