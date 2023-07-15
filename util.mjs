import { dirname } from 'path';
import { createRequire } from 'module';
import { readPackageUp } from 'read-pkg-up';

export function versionLoader(source) {
  return async function getVersion(module) {
    const require = createRequire(source);
    const cwd = dirname(require.resolve(module));
    const { packageJson } = await readPackageUp({ cwd });
    return packageJson.version;
  }
}
