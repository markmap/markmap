import { dirname } from 'path';
import { createRequire } from 'module';
import { readPackageUp } from 'read-package-up';

export function versionLoader(source) {
  /**
   * @param {string} module must be a resolvable path
   */
  return async function getVersion(module) {
    const require = createRequire(source);
    const cwd = dirname(require.resolve(module));
    const { packageJson } = await readPackageUp({ cwd });
    return packageJson.version;
  }
}
