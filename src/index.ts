import fs from 'fs';
import open from 'open';
import parse from 'markmap/lib/parse.markdown';
import transform from 'markmap/lib/transform.headings';

let template: string;

export interface ICreateOptions {
  open?: boolean;
  output?: string;
}

export async function createMarkmap(input: string, options: ICreateOptions = {}) {
  const text = await fs.promises.readFile(input, 'utf8');
  const {
    open: openFile = true,
  } = options;
  let { output } = options;
  if (!output) output = `${input.replace(/\.\w*$/, '')}.html`;
  if (!template) {
    template = await fs.promises.readFile(`${__dirname}/../templates/markmap.html`, 'utf8');
  }
  const data = transform(parse(text));
  const html = template.replace('{/* data */}', JSON.stringify(data));
  fs.promises.writeFile(output, html, 'utf8');
  if (openFile) open(output);
}
