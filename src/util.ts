export function escapeHtml(html: string): string {
  return html.replace(/[&<"]/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '"': '&quot;',
  }[m]));
}

export function htmlOpen(tagName: string, attrs?: any): string {
  const attrStr = attrs ? Object.entries<string | boolean>(attrs)
    .map(([key, value]) => {
      if (value == null || value === false) return;
      key = ` ${escapeHtml(key)}`;
      if (value === true) return key;
      return `${key}="${escapeHtml(value)}"`;
    })
    .filter(Boolean)
    .join('') : '';
  return `<${tagName}${attrStr}>`;
}

export function htmlClose(tagName: string): string {
  return `</${tagName}>`;
}

export function wrapHtml(tagName: string, content?: string, attrs?: any): string {
  return htmlOpen(tagName, attrs) + (content || '') + htmlClose(tagName);
}

export function wrapStyle(text: string, style: any): string {
  if (style.code) text = wrapHtml('code', text);
  if (style.del) text = wrapHtml('del', text);
  if (style.em) text = wrapHtml('em', text);
  if (style.strong) text = wrapHtml('strong', text);
  return text;
}
