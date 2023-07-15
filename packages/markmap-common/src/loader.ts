import { hm } from '@gera2ld/jsx-dom';
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

const jsCache: Record<string, Promise<void>> = {};
const cssCache: Record<string, boolean> = {};

async function loadJSItem(item: JSItem, context: unknown): Promise<void> {
  const src = (item.type === 'script' && item.data?.src) || '';
  item.loaded ||= jsCache[src];
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
        if (!src) {
          // Run inline script synchronously
          resolve(undefined);
        }
      }).then(() => {
        item.loaded = true;
      });
      if (src) jsCache[src] = item.loaded;
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
  const url = (item.type === 'stylesheet' && item.data.href) || '';
  item.loaded ||= cssCache[url];
  if (item.loaded) return;
  item.loaded = true;
  if (url) cssCache[url] = true;
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
