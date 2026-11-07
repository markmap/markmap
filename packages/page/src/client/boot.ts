import { MarkmapViewElement } from '@markmap/element';
import type { ParseOptions } from '@markmap/parse';
import type { ViewOptions } from '@markmap/view';
import { remarkReplaceImages } from '../mdast-images';
import type { PageData } from '../page';
import { brandHref, brandImage } from './brand';

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
  if (data.toolbar) {
    // Built into the client, not the data, so the page's data cannot change it.
    view.toolbarItems = [
      {
        label: 'Made with markmap',
        image: brandImage,
        onClick: () => window.open(brandHref, '_blank', 'noopener'),
      },
      // The toolbar's defaults, which a custom list replaces.
      'zoom-in',
      'zoom-out',
      'fit',
      'expand-all',
      'fold-level',
    ];
  }
  document.body.append(view);
}
