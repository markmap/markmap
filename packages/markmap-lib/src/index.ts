import { promises as fs } from 'fs';
import { transform } from './transform';
import { fillTemplate } from './template';
import { IMarkmapCreateOptions } from './types';

export async function createMarkmap(options: IMarkmapCreateOptions = {}): Promise<string> {
  const {
    input,
    ...rest
  } = options;
  let { content, output } = options;
  if (input) {
    content = await fs.readFile(input, 'utf8');
  }
  if (!output) {
    output = input ? `${input.replace(/\.\w*$/, '')}.html` : 'markmap.html';
  }

  const root = transform(content || '');
  const html = fillTemplate(root, rest);
  await fs.writeFile(output, html, 'utf8');
  return output;
}
