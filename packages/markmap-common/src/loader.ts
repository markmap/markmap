import { JSItem, JSScriptItem, CSSItem } from './types';
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

function loadJSItem(item: JSItem, context: unknown): Promise<void> {
  if (item.type === 'script') {
    return new Promise((resolve, reject) => {
      document.head.append(
        createElement('script', {
          ...item.data,
          onload: resolve,
          onerror: reject,
        })
      );
      // Run inline script synchronously
      if (!item.data?.src) resolve();
    });
  }
  if (item.type === 'iife') {
    const { fn, getParams } = item.data;
    fn(...(getParams?.(context) || []));
  }
}

function loadCSSItem(item: CSSItem): void {
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
