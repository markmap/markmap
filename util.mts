import { readFile } from 'fs/promises';
import { join } from 'path';

export function versionLoader(pkgDir: string) {
  /**
   * @param {string} module must be a resolvable path
   */
  return async function getVersion(module: string) {
    const packageJson = JSON.parse(
      await readFile(
        join(pkgDir, 'node_modules', module, 'package.json'),
        'utf8',
      ),
    );
    return packageJson.version;
  };
}
