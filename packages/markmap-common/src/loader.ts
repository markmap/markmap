import { hm } from '@gera2ld/jsx-dom';
import { cdnUrl, getFastestProvider, providers } from 'npm2url';
import { JSItem, JSScriptItem, CSSItem, CSSStylesheetItem } from './types';
import { memoize } from './util';

const memoizedPreloadJS = memoize((url: string) => {
  document.head.append(
    hm('link', {
      rel: 'preload',
      as: 'script',
      href: url,
    })
  );
});

async function loadJSItem(item: JSItem, context: unknown): Promise<void> {
  if (!item.loaded) {
    if (item.type === 'script') {
      item.loaded = new Promise((resolve, reject) => {
        document.head.append(
          hm('script', {
            ...item.data,
            onLoad: resolve,
            onError: reject,
          })
        );
        // Run inline script synchronously
        if (!item.data?.src) resolve(undefined);
      }).then(() => {
        item.loaded = true;
      });
    }
    if (item.type === 'iife') {
      const { fn, getParams } = item.data;
      fn(...(getParams?.(context) || []));
      item.loaded = true;
    }
  }
  await item.loaded;
}

function loadCSSItem(item: CSSItem): void {
  if (item.loaded) return;
  item.loaded = true;
  if (item.type === 'style') {
    document.head.append(
      hm('style', {
        textContent: item.data,
      })
    );
  } else if (item.type === 'stylesheet') {
    document.head.append(
      hm('link', {
        rel: 'stylesheet',
        ...item.data,
      })
    );
  }
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

export function loadCSS(items: CSSItem[]): void {
  for (const item of items) {
    loadCSSItem(item);
  }
}

let provider = 'jsdelivr';

export async function findFastestProvider() {
  provider = await getFastestProvider();
  return provider;
}

export function setProvider(name: string, factory?: (path: string) => string) {
  if (factory) {
    providers[name] = factory;
  }
  provider = name;
  return provider;
}

export function getFullUrl(path: string, overrideProvider = provider) {
  if (path.includes('://')) return path;
  return cdnUrl(overrideProvider, path);
}

export function buildJSItem(
  path: string,
  overrideProvider?: string
): JSScriptItem {
  return {
    type: 'script',
    data: {
      src: getFullUrl(path, overrideProvider),
    },
  };
}

export function buildCSSItem(
  path: string,
  overrideProvider?: string
): CSSStylesheetItem {
  return {
    type: 'stylesheet',
    data: {
      href: getFullUrl(path, overrideProvider),
    },
  };
}
