import fs from 'fs';
import open from 'open';
import parse from 'markmap/lib/parse.markdown';
import transform from 'markmap/lib/transform.headings';

let template: string;

export interface ICreateOptions {
  open?: boolean;
  content?: string;
  input?: string;
  output?: string;
}

export async function createMarkmap(options: ICreateOptions = {}) {
  const {
    input,
    open: openFile = true,
  } = options;
  let { content, output } = options;
  if (input) {
    content = await fs.promises.readFile(input, 'utf8');
  }
  if (!output) {
    output = input ? `${input.replace(/\.\w*$/, '')}.html` : 'markmap.html';
  }
  if (!template) {
    template = await fs.promises.readFile(`${__dirname}/../templates/markmap.html`, 'utf8');
  }
  const data = transform(parse(content || ''));
  const html = template.replace('{/* data */}', JSON.stringify(data));
  fs.promises.writeFile(output, html, 'utf8');
  if (openFile) open(output);
}
