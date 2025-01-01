import { hm } from '@gera2ld/jsx-dom';
import {
  CSSItem,
  CSSStylesheetItem,
  IAssets,
  JSItem,
  JSScriptItem,
} from './types';
import { defer, memoize } from './util';

const memoizedPreloadJS = memoize((url: string) => {
  document.head.append(
    hm('link', {
      rel: 'preload',
      as: 'script',
      href: url,
    }),
  );
});

const jsCache: Record<string, Promise<void> | undefined> = {};
const cssCache: Record<string, Promise<void> | undefined> = {};

async function loadJSItem(item: JSItem, context: unknown) {
  const src = (item.type === 'script' && item.data?.src) || '';
  item.loaded ||= jsCache[src];
  if (!item.loaded) {
    const deferred = defer<void>();
    item.loaded = deferred.promise;
    if (item.type === 'script') {
      document.head.append(
        hm('script', {
          ...item.data,
          onLoad: () => deferred.resolve(),
          onError: deferred.reject,
        }),
      );
      if (!src) {
        // Run inline script synchronously
        deferred.resolve();
      } else {
        jsCache[src] = item.loaded;
      }
    }
    if (item.type === 'iife') {
      const { fn, getParams } = item.data;
      fn(...(getParams?.(context) || []));
      deferred.resolve();
    }
  }
  await item.loaded;
}

async function loadCSSItem(item: CSSItem) {
  const url = (item.type === 'stylesheet' && item.data.href) || '';
  item.loaded ||= cssCache[url];
  if (!item.loaded) {
    const deferred = defer<void>();
    item.loaded = deferred.promise;
    if (url) cssCache[url] = item.loaded;
    if (item.type === 'style') {
      document.head.append(
        hm('style', {
          textContent: item.data,
        }),
      );
      deferred.resolve();
    } else if (url) {
      document.head.append(
        hm('link', {
          rel: 'stylesheet',
          ...item.data,
        }),
      );
      fetch(url)
        .then((res) => {
          if (res.ok) return res.text();
          throw res;
        })
        .then(() => deferred.resolve(), deferred.reject);
    }
  }
  await item.loaded;
}

export async function loadJS(items: JSItem[], context?: object): Promise<void> {
  items.forEach((item) => {
    if (item.type === 'script' && item.data?.src) {
      memoizedPreloadJS(item.data.src);
    }
  });
  context = {
    getMarkmap: () => window.markmap,
    ...context,
  };
  for (const item of items) {
    await loadJSItem(item, context);
  }
}

export async function loadCSS(items: CSSItem[]) {
  await Promise.all(items.map((item) => loadCSSItem(item)));
}

export function buildJSItem(path: string): JSScriptItem {
  return {
    type: 'script',
    data: {
      src: path,
    },
  };
}

export function buildCSSItem(path: string): CSSStylesheetItem {
  return {
    type: 'stylesheet',
    data: {
      href: path,
    },
  };
}

export function extractAssets(assets: IAssets) {
  return [
    ...(assets.scripts?.map(
      (item) => (item.type === 'script' && item.data.src) || '',
    ) || []),
    ...(assets.styles?.map(
      (item) => (item.type === 'stylesheet' && item.data.href) || '',
    ) || []),
  ].filter(Boolean);
}

export function mergeAssets(...args: (IAssets | null | undefined)[]): IAssets {
  return {
    styles: args.flatMap((arg) => arg?.styles || []),
    scripts: args.flatMap((arg) => arg?.scripts || []),
  };
}
