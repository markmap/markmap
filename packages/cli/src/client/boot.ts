import { MarkmapViewElement } from '@markmap/element';
import type { ParseOptions } from '@markmap/parse';
import type { ViewOptions } from '@markmap/view';
import { remarkReplaceImages } from '../mdast-images';
import type { PageData } from '../page';

/** Show the map described by the page's data. */
export function boot(options: ViewOptions = {}, parseOptions: ParseOptions = {}): void {
  const data = JSON.parse(document.querySelector('#markmap-data')!.textContent!) as PageData;
  const view = new MarkmapViewElement();
  view.options = options;
  view.parseOptions = {
    plugins: [
      ...(parseOptions.plugins ?? []),
      remarkReplaceImages(new Map(Object.entries(data.images))),
    ],
  };
  view.markdown = data.markdown;
  view.toolbar = data.toolbar;
  document.body.append(view);
}
