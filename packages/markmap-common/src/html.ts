import { JSItem, CSSItem } from './types';

const escapeChars: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '"': '&quot;',
};

export function escapeHtml(html: string): string {
  return html.replace(/[&<"]/g, (m) => escapeChars[m]);
}

export function escapeScript(content: string): string {
  return content.replace(/<(\/script>)/g, '\\x3c$2');
}

export function htmlOpen(
  tagName: string,
  attrs?: Record<string, string | boolean>,
): string {
  const attrStr = attrs
    ? Object.entries(attrs)
        .map(([key, value]) => {
          if (value == null || value === false) return;
          key = ` ${escapeHtml(key)}`;
          if (value === true) return key;
          return `${key}="${escapeHtml(value)}"`;
        })
        .filter(Boolean)
        .join('')
    : '';
  return `<${tagName}${attrStr}>`;
}

export function htmlClose(tagName: string): string {
  return `</${tagName}>`;
}

export function wrapHtml(
  tagName: string,
  content?: string | null,
  attrs?: Record<string, string | boolean>,
): string {
  if (content == null) return htmlOpen(tagName, attrs);
  return htmlOpen(tagName, attrs) + (content || '') + htmlClose(tagName);
}

export function buildCode<T extends unknown[]>(
  fn: (...args: T) => void,
  args: T,
): string {
  const params = args
    .map((arg) => {
      if (typeof arg === 'function') return arg.toString();
      return JSON.stringify(arg ?? null);
    })
    .join(',');
  return `(${fn.toString()})(${params})`;
}

export function persistJS(items: JSItem[], context?: unknown): string[] {
  return items.map((item) => {
    if (item.type === 'script') {
      const { textContent, ...rest } = item.data;
      return wrapHtml(
        'script',
        textContent || '',
        rest as Record<string, string | boolean>,
      );
    }
    if (item.type === 'iife') {
      const { fn, getParams } = item.data;
      return wrapHtml(
        'script',
        escapeScript(buildCode(fn, getParams?.(context) || [])),
      );
    }
    return '';
  });
}

export function persistCSS(items: CSSItem[]): string[] {
  return items.map((item) => {
    if (item.type === 'stylesheet') {
      return wrapHtml('link', null, {
        rel: 'stylesheet',
        ...item.data,
      });
    }
    /* else if (item.type === 'style') */ return wrapHtml('style', item.data);
  });
}
