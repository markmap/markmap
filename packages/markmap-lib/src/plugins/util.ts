const npmPrefix = 'https://cdn.jsdelivr.net/npm/';

/**
 * Find NPM paths and resolve them to full URLs with the same package version as in this library.
 */
export function resolveNpmPaths(
  paths: string[],
  name: string,
  version: string
) {
  return paths.map((path) => {
    if (typeof path === 'string') {
      if (path.startsWith(`${name}/`)) {
        path = `${npmPrefix}${name}@${version}${path.slice(name.length)}`;
      } else if (path.startsWith(`${name}@`)) {
        path = `${npmPrefix}${path}`;
      }
    }
    return path;
  });
}
