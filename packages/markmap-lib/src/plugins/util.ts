/**
 * Find NPM paths and resolve them to full URLs with the same package version as in this library.
 */
export function resolveNpmPaths(
  paths: string[],
  name: string,
  version: string
) {
  return paths.map((path) => {
    if (typeof path === 'string' && path.startsWith(`${name}/`)) {
      return `https://cdn.jsdelivr.net/npm/${name}@${version}${path.slice(
        name.length
      )}`;
    }
    return path;
  });
}
