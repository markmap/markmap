import open from 'open';
import { createMarkmap as createMarkmapFile } from 'markmap-lib';
import type { IMarkmapCreateOptions } from 'markmap-lib';

export * from 'markmap-lib';
export * from './dev-server';

export async function createMarkmap(options: IMarkmapCreateOptions & {
  /**
   * whether to open the generated markmap in browser
   */
  open?: boolean;
} = {}): Promise<void> {
  const output = await createMarkmapFile(options);
  if (options.open) open(output);
}
