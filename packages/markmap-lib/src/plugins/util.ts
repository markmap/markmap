/**
 * Find NPM paths and resolve them to full URLs with the same package version as in this library.
 */
export function addDefaultVersions(
  paths: string[],
  name: string,
  version: string,
) {
  return paths.map((path) => {
    if (typeof path === 'string' && !path.includes('://')) {
      if (!path.startsWith('npm:')) {
        path = `npm:${path}`;
      }
      const prefixLength = 4 + name.length;
      if (path.startsWith(`npm:${name}/`)) {
        path = `${path.slice(0, prefixLength)}@${version}${path.slice(
          prefixLength,
        )}`;
      }
    }
    return path;
  });
}
