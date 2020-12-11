import { loadJS } from 'markmap-common';

const enabled = {};

function transform(transformer, content) {
  const { root, features } = transformer.transform(content);
  const keys = Object.keys(features).filter(key => !enabled[key]);
  keys.forEach(key => { enabled[key] = true; });
  const { styles, scripts } = transformer.getAssets(keys);
  const { loadJS, loadCSS } = window.markmap;
  if (styles) loadCSS(styles);
  if (scripts) loadJS(scripts);
  return root;
}

function initialize(el) {
  const { Transformer, Markmap } = window.markmap;
  const lines = el.textContent.split('\n');
  let indent = Infinity;
  lines.forEach(line => {
    const spaces = line.match(/^\s*/)[0].length;
    if (spaces < line.length) indent = Math.min(indent, spaces);
  });
  const content = lines.map(line => line.slice(indent)).join('\n');
  const transformer = new Transformer();
  el.innerHTML = '<svg></svg>';
  const svg = el.firstChild;
  const mm = Markmap.create(svg);
  const render = () => {
    const root = transform(transformer, content);
    mm.setData(root);
    mm.fit();
  };
  transformer.hooks.retransform.tap(render);
  render();
}

async function main() {
  await loadJS([
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
  ]);
  document.querySelectorAll('.markmap').forEach(initialize);
}

main();
