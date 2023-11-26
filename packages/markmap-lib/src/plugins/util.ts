import { CSSItem, JSItem } from 'markmap-common';
import { ITransformer } from '../types';

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

export function patchJSItem(transformer: ITransformer, item: JSItem) {
  if (item.type === 'script' && item.data.src) {
    return {
      ...item,
      data: {
        ...item.data,
        src: transformer.urlBuilder.getFullUrl(item.data.src),
      },
    };
  }
  return item;
}

export function patchCSSItem(transformer: ITransformer, item: CSSItem) {
  if (item.type === 'stylesheet' && item.data.href) {
    return {
      ...item,
      data: {
        ...item.data,
        href: transformer.urlBuilder.getFullUrl(item.data.href),
      },
    };
  }
  return item;
}
