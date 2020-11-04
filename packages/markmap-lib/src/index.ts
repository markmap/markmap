import { promises as fs } from 'fs';
import { transform, getUsedAssets } from './transform';
import { fillTemplate } from './template';
import { IMarkmapCreateOptions } from './types';

export * from './types';

export * from './template';
export * from './transform';

export async function createMarkmap(options: IMarkmapCreateOptions = {}): Promise<string> {
  const { root, features } = transform(options.content || '');
  const assets = getUsedAssets(features);
  const html = fillTemplate(root, assets);
  const output = options.output || 'markmap.html';
  await fs.writeFile(output, html, 'utf8');
  return output;
}
