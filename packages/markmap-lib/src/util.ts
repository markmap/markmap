import { CSSItem, JSItem, UrlBuilder } from 'markmap-common';

export function patchJSItem(urlBuilder: UrlBuilder, item: JSItem): JSItem {
  if (item.type === 'script' && item.data.src) {
    return {
      ...item,
      data: {
        ...item.data,
        src: urlBuilder.getFullUrl(item.data.src),
      },
    };
  }
  return item;
}

export function patchCSSItem(urlBuilder: UrlBuilder, item: CSSItem): CSSItem {
  if (item.type === 'stylesheet' && item.data.href) {
    return {
      ...item,
      data: {
        ...item.data,
        href: urlBuilder.getFullUrl(item.data.href),
      },
    };
  }
  return item;
}
