import { loadCSS, loadJS } from 'markmap-common';

const enabled: Record<string, boolean> = {};

export const ready = loadJS([
  {
    type: 'script',
    data: {
      src: `https://cdn.jsdelivr.net/npm/d3@${process.env.D3_VERSION}`,
    },
  },
  {
    type: 'script',
    data: {
      src: `https://cdn.jsdelivr.net/combine/npm/markmap-lib@${process.env.LIB_VERSION},npm/markmap-view@${process.env.VIEW_VERSION}`,
    },
  },
]).then(() => {
  const { markmap } = window;
  loadCSS([
    {
      type: 'style',
      data: markmap.globalCSS,
    },
  ]);
  markmap.autoLoader?.onReady?.();
});

function transform(
  transformer: import('markmap-lib').Transformer,
  content: string
) {
  const { root, features } = transformer.transform(content);
  const keys = Object.keys(features).filter((key) => !enabled[key]);
  keys.forEach((key) => {
    enabled[key] = true;
  });
  const { styles, scripts } = transformer.getAssets(keys);
  const { markmap } = window;
  if (styles) markmap.loadCSS(styles);
  if (scripts) markmap.loadJS(scripts);
  return root;
}

export function render(el: HTMLElement) {
  const { Transformer, Markmap, autoLoader } = window.markmap;
  const lines = el.textContent.split('\n');
  let indent = Infinity;
  lines.forEach((line) => {
    const spaces = line.match(/^\s*/)[0].length;
    if (spaces < line.length) indent = Math.min(indent, spaces);
  });
  const content = lines.map((line) => line.slice(indent)).join('\n');
  const transformer = new Transformer(autoLoader?.transformPlugins);
  el.innerHTML = '<svg></svg>';
  const svg = el.firstChild as SVGElement;
  const mm = Markmap.create(svg, { embedGlobalCSS: false });
  const doRender = () => {
    const root = transform(transformer, content);
    mm.setData(root);
    mm.fit();
  };
  transformer.hooks.retransform.tap(doRender);
  doRender();
}

export async function renderAllUnder(container: ParentNode) {
  await ready;
  container.querySelectorAll('.markmap').forEach(render);
}

export function renderAll() {
  return renderAllUnder(document);
}

if (!window.markmap?.autoLoader?.manual) {
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => {
      renderAll();
    });
  else renderAll();
}
