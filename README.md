# markmap

[![Join the chat at https://gitter.im/gera2ld/markmap](https://badges.gitter.im/gera2ld/markmap.svg)](https://gitter.im/gera2ld/markmap?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Visualize your Markdown as mindmaps.

This project is heavily inspired by [dundalek's markmap](https://github.com/dundalek/markmap).

👉 [Try it out](https://markmap.js.org/repl).

👉 [Read the documentation](https://markmap.js.org/docs) for more detail.

## Packages

- [markmap-common](https://github.com/markmap/markmap/tree/master/packages/markmap-common)
  ![NPM](https://img.shields.io/npm/v/markmap-common.svg)

Common types and utility functions used by markmap packages.

- [markmap-lib](https://github.com/markmap/markmap/tree/master/packages/markmap-lib)
  ![NPM](https://img.shields.io/npm/v/markmap-lib.svg)

  Transform Markdown to data used by markmap.

- [markmap-view](https://github.com/markmap/markmap/tree/master/packages/markmap-view)
  ![NPM](https://img.shields.io/npm/v/markmap-view.svg)

  Render markmap in browser.

- [markmap-autoloader](https://github.com/markmap/markmap/tree/master/packages/markmap-autoloader)
  ![NPM](https://img.shields.io/npm/v/markmap-autoloader.svg)

  Load markmaps automatically in HTML.

- [markmap-toolbar](https://github.com/markmap/markmap/tree/master/packages/markmap-toolbar)
  ![NPM](https://img.shields.io/npm/v/markmap-toolbar.svg)

  Extensible toolbar for markmap.

- [markmap-cli](https://github.com/markmap/markmap/tree/master/packages/markmap-cli)
  ![NPM](https://img.shields.io/npm/v/markmap-cli.svg)

  Use markmap in command-line.

## Related

Markmap is also available in:

- [VSCode](https://marketplace.visualstudio.com/items?itemName=gera2ld.markmap-vscode) and [Open VSX](https://open-vsx.org/extension/gera2ld/markmap-vscode)
- Vim / Neovim: [coc-markmap](https://github.com/gera2ld/coc-markmap) ![NPM](https://img.shields.io/npm/v/coc-markmap.svg) - powered by [coc.nvim](https://github.com/neoclide/coc.nvim)
- Emacs: [eaf-markmap](https://github.com/emacs-eaf/eaf-markmap) -- powered by [EAF](https://github.com/emacs-eaf/emacs-application-framework)

## Usage

### Transform

Transform Markdown to markmap data:

```js
import { Transformer } from 'markmap-lib';

const transformer = new Transformer();

// 1. transform markdown
const { root, features } = transformer.transform(markdown);

// 2. get assets
// either get assets required by used features
const { styles, scripts } = transformer.getUsedAssets(features);
// or get all possible assets that could be used later
const { styles, scripts } = transformer.getAssets();
```

Now we are ready for rendering a markmap in browser.

### Render

Create an SVG element with explicit width and height:

```html
<script src="https://cdn.jsdelivr.net/npm/d3@6"></script>
<script src="https://cdn.jsdelivr.net/npm/markmap-view"></script>

<svg id="markmap" style="width: 800px; height: 800px"></svg>
```

Render a markmap to the SVG element:

```js
// We got { root } data from transforming, and possible extraneous assets { styles, scripts }.

const { Markmap, loadCSS, loadJS } = window.markmap;

// 1. load assets
if (styles) loadCSS(styles);
if (scripts) loadJS(scripts, { getMarkmap: () => window.markmap });

// 2. create markmap

Markmap.create('#markmap', null, root);

// or pass an SVG element directly
const svgEl = document.querySelector('#markmap');
Markmap.create(svgEl, null, data);
```
