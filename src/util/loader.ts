import { JSItem, JSScriptItem, CSSItem, IMarkmapPlugin } from '../types';
import { escapeScript, wrapHtml } from './html';

export function buildCode(fn: Function, ...args: any[]): string {
  const params = args.map(arg => {
    if (typeof arg === 'function') return arg.toString();
    return JSON.stringify(arg ?? null);
  }).join(',');
  return `(${fn.toString()})(${params})`;
}

export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = {};
  return function memoized(...args: any[]): T {
    const key = `${args[0]}`;
    let data = cache[key];
    if (!data) {
      data = {
        value: fn(...args),
      };
      cache[key] = data;
    }
    return data.value;
  } as T;
}

function createElement(tagName: string, props?: any, attrs?: { [key: string]: string }): HTMLElement {
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
  document.head.append(createElement('link', {
    rel: 'preload',
    as: 'script',
    href: url,
  }));
});

function loadJSItem(item: JSItem, context: any): Promise<any> {
  if (item.type === 'script') {
    return new Promise((resolve, reject) => {
      document.head.append(createElement('script', {
        ...item.data,
        onload: resolve,
        onerror: reject,
      }));
    });
  } else if (item.type === 'iife') {
    const { fn, getParams } = item.data;
    fn(...getParams?.(context) || []);
  }
}

function loadCSSItem(item: CSSItem): void {
  if (item.type === 'style') {
    document.head.append(createElement('style', {
      textContent: item.data,
    }));
  } else if (item.type === 'stylesheet') {
    document.head.append(createElement('link', {
      rel: 'stylesheet',
      ...item.data,
    }));
  }
}

export async function loadJS(items: JSItem[], options: any): Promise<void> {
  const needPreload = items.filter(item => item.type === 'script') as JSScriptItem[];
  if (needPreload.length > 1) needPreload.forEach(item => memoizedPreloadJS(item.data.src));
  for (const item of items) {
    await loadJSItem(item, options);
  }
}

export function loadCSS(items: CSSItem[]): void {
  for (const item of items) {
    loadCSSItem(item);
  }
}

export async function initializePlugins(plugins: IMarkmapPlugin[], options): Promise<Function[]> {
  options = { ...options };
  await Promise.all(plugins.map(plugin => {
    loadCSS(plugin.styles);
    return loadJS(plugin.scripts, options);
  }));
  return plugins.map(({ transform }) => transform);
}

export function persistJS(items: JSItem[], context?: any): string[] {
  return items.map(item => {
    if (item.type === 'script') return wrapHtml('script', '', item.data);
    if (item.type === 'iife') {
      const { fn, getParams } = item.data;
      return wrapHtml('script', escapeScript(buildCode(fn, ...getParams?.(context) || [])));
    }
  });
}

export function persistCSS(items: CSSItem[]): string[] {
  return items.map(item => {
    if (item.type === 'stylesheet') {
      return wrapHtml('link', null, {
        rel: 'stylesheet',
        ...item.data,
      });
    }
    /* else if (item.type === 'style') */ return wrapHtml('style', item.data);
  });
}

export function persistPlugins(plugins: IMarkmapPlugin[], context?: any) {
  const js = plugins.flatMap(plugin => persistJS(plugin.scripts, context)).join('');
  const css = plugins.flatMap(plugin => persistCSS(plugin.styles)).join('');
  const processors = plugins.map(({ transform }) => transform);
  return {
    js,
    css,
    processors,
  };
}
