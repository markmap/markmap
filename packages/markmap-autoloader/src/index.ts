import {
  buildCSSItem,
  buildJSItem,
  loadCSS,
  loadJS,
  urlBuilder,
} from 'markmap-common';
import type { Transformer } from 'markmap-lib';
import type { AutoLoaderOptions } from './types';

export * from './types';

const enabled: Record<string, boolean> = {};

const autoLoaderOptions = {
  baseJs: [
    `d3@${__define__.D3_VERSION}`,
    `markmap-lib@${__define__.LIB_VERSION}`,
    `markmap-view@${__define__.VIEW_VERSION}`,
    `markmap-toolbar@${__define__.TOOLBAR_VERSION}`,
  ],
  baseCss: [`markmap-toolbar@${__define__.TOOLBAR_VERSION}/dist/style.css`],
  manual: false,
  toolbar: false,
  ...(window.markmap?.autoLoader as Partial<AutoLoaderOptions>),
};

async function initialize() {
  if (typeof autoLoaderOptions.provider === 'function') {
    urlBuilder.setProvider(
      (urlBuilder.provider = 'autoLoader'),
      autoLoaderOptions.provider,
    );
  } else if (typeof autoLoaderOptions.provider === 'string') {
    urlBuilder.provider = autoLoaderOptions.provider;
  } else {
    try {
      await urlBuilder.findFastestProvider();
    } catch {
      // ignore
    }
  }
  await Promise.all([
    loadJS(
      autoLoaderOptions.baseJs.map((item) =>
        typeof item === 'string'
          ? buildJSItem(urlBuilder.getFullUrl(item))
          : item,
      ),
    ),
    loadCSS(
      autoLoaderOptions.baseCss.map((item) =>
        typeof item === 'string'
          ? buildCSSItem(urlBuilder.getFullUrl(item))
          : item,
      ),
    ),
  ]);
  const { markmap } = window;
  const style = document.createElement('style');
  style.textContent = markmap.globalCSS;
  // Insert global CSS to body so it has higher priority than prism.css, etc.
  document.body.prepend(style);
  autoLoaderOptions.onReady?.();
}

export const ready = initialize();

function transform(transformer: Transformer, content: string) {
  const result = transformer.transform(content);
  const keys = Object.keys(result.features).filter((key) => !enabled[key]);
  keys.forEach((key) => {
    enabled[key] = true;
  });
  const { styles, scripts } = transformer.getAssets(keys);
  const { markmap } = window;
  if (styles) markmap.loadCSS(styles);
  if (scripts) markmap.loadJS(scripts);
  return result;
}

export function render(el: HTMLElement) {
  const { Transformer, Markmap, deriveOptions, Toolbar } = window.markmap;
  const lines = el.textContent?.split('\n') || [];
  let indent = Infinity;
  lines.forEach((line) => {
    const spaces = line.match(/^\s*/)?.[0].length || 0;
    if (spaces < line.length) indent = Math.min(indent, spaces);
  });
  const content = lines
    .map((line) => line.slice(indent))
    .join('\n')
    .trim();
  const transformer = new Transformer(autoLoaderOptions.transformPlugins);
  transformer.urlBuilder = urlBuilder;
  el.innerHTML = '<svg></svg>';
  const svg = el.firstChild as SVGElement;
  const mm = Markmap.create(svg, { embedGlobalCSS: false });
  if (autoLoaderOptions.toolbar) {
    const { el: toolbar } = Toolbar.create(mm);
    Object.assign(toolbar.style, {
      position: 'absolute',
      right: '20px',
      bottom: '20px',
    });
    el.append(toolbar);
  }
  const doRender = async () => {
    const { root, frontmatter } = transform(transformer, content);
    const markmapOptions = frontmatter?.markmap;
    const frontmatterOptions = deriveOptions(markmapOptions);
    await mm.setData(root, frontmatterOptions);
    mm.fit();
  };
  transformer.hooks.retransform.tap(doRender);
  doRender();
}

export async function renderAllUnder(container: ParentNode) {
  await ready;
  container.querySelectorAll<HTMLElement>('.markmap').forEach(render);
}

export function renderAll() {
  return renderAllUnder(document);
}

if (!autoLoaderOptions.manual) {
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => {
      renderAll();
    });
  else renderAll();
}
