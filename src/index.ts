import { promises as fs } from 'fs';
import open from 'open';
import { transform } from './transform';
import { IMarkmapCreateOptions } from './types';

let template: string;

export async function createMarkmap(options: IMarkmapCreateOptions = {}): Promise<void> {
  const {
    input,
    open: openFile = true,
  } = options;
  let { content, output } = options;
  if (input) {
    content = await fs.readFile(input, 'utf8');
  }
  if (!output) {
    output = input ? `${input.replace(/\.\w*$/, '')}.html` : 'markmap.html';
  }
  if (!template) {
    template = await fs.readFile(`${__dirname}/../templates/markmap.html`, 'utf8');
  }

  const root = transform(content || '');
  const html = template.replace('{/* data */}', JSON.stringify(root));
  fs.writeFile(output, html, 'utf8');
  if (openFile) open(output);
}
