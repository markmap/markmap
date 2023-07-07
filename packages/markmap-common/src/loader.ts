import { cdnUrl, getFastestProvider, providers } from 'npm2url';
import { JSItem, JSScriptItem, CSSItem, CSSStylesheetItem } from './types';
import { memoize } from './util';

function createElement(
  tagName: string,
  props?: Record<string, string | boolean | ((...args: unknown[]) => void)>,
  attrs?: Record<string, string>
): HTMLElement {
  const el = document.createElement(tagName);
  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      el[key] = value;
    });
  }
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
  }
  return el;
}

const memoizedPreloadJS = memoize((url: string) => {
  document.head.append(
    createElement('link', {
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
          createElement('script', {
            ...item.data,
            onload: resolve,
            onerror: reject,
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
      createElement('style', {
        textContent: item.data,
      })
    );
  } else if (item.type === 'stylesheet') {
    document.head.append(
      createElement('link', {
        rel: 'stylesheet',
        ...item.data,
      })
    );
  }
}

export async function loadJS(items: JSItem[], context?: object): Promise<void> {
  const needPreload = items.filter(
    (item) => item.type === 'script' && item.data?.src
  ) as JSScriptItem[];
  if (needPreload.length > 1)
    needPreload.forEach((item) => memoizedPreloadJS(item.data.src));
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
}

export function setProvider(name: string, factory?: (path: string) => string) {
  if (factory) {
    providers[name] = factory;
  }
  provider = name;
}

export function getFullUrl(path: string) {
  if (path.includes('://')) return path;
  return cdnUrl(provider, path);
}

export function buildJSItem(path: string): JSScriptItem {
  return {
    type: 'script',
    data: {
      src: getFullUrl(path),
    },
  };
}

export function buildCSSItem(path: string): CSSStylesheetItem {
  return {
    type: 'stylesheet',
    data: {
      href: getFullUrl(path),
    },
  };
}
