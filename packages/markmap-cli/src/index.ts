import { promises as fs } from 'fs';
import open from 'open';
import {
  transform, getUsedAssets, fillTemplate,
} from 'markmap-lib';
import type { IMarkmapCreateOptions } from 'markmap-lib';

export * from 'markmap-lib';
export * from './dev-server';

export async function createMarkmap(options: IMarkmapCreateOptions & {
  /**
   * whether to open the generated markmap in browser
   */
  open?: boolean;
} = {}): Promise<void> {
  const { root, features } = transform(options.content || '');
  const assets = getUsedAssets(features);
  const html = fillTemplate(root, assets);
  const output = options.output || 'markmap.html';
  await fs.writeFile(output, html, 'utf8');
  if (options.open) open(output);
}
