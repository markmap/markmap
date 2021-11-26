import { JSItem, CSSItem } from './types';

export function escapeHtml(html: string): string {
  return html.replace(
    /[&<"]/g,
    (m) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '"': '&quot;',
      }[m])
  );
}

export function escapeScript(content: string): string {
  return content.replace(/<(\/script>)/g, '\\x3c$2');
}

export function htmlOpen(tagName: string, attrs?: any): string {
  const attrStr = attrs
    ? Object.entries<string | boolean>(attrs)
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
  content?: string,
  attrs?: any
): string {
  if (content == null) return htmlOpen(tagName, attrs);
  return htmlOpen(tagName, attrs) + (content || '') + htmlClose(tagName);
}

export function wrapStyle(text: string, style: any): string {
  if (style.code) text = wrapHtml('code', text);
  if (style.del) text = wrapHtml('del', text);
  if (style.em) text = wrapHtml('em', text);
  if (style.strong) text = wrapHtml('strong', text);
  return text;
}

export function buildCode(fn: Function, args: any[]): string {
  const params = args
    .map((arg) => {
      if (typeof arg === 'function') return arg.toString();
      return JSON.stringify(arg ?? null);
    })
    .join(',');
  return `(${fn.toString()})(${params})`;
}

export function persistJS(items: JSItem[], context?: any): string[] {
  return items.map((item) => {
    if (item.type === 'script') return wrapHtml('script', '', item.data);
    if (item.type === 'iife') {
      const { fn, getParams } = item.data;
      return wrapHtml(
        'script',
        escapeScript(buildCode(fn, getParams?.(context) || []))
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
