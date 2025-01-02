import { join } from 'path';
import { readPackageUp } from 'read-package-up';

export function versionLoader(pkgDir: string) {
  /**
   * @param {string} module must be a resolvable path
   */
  return async function getVersion(module: string) {
    const { packageJson } = await readPackageUp({
      cwd: join(pkgDir, 'node_modules', module),
    });
    return packageJson.version;
  };
}
