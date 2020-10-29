# markmap-lib

![NPM](https://img.shields.io/npm/v/markmap-lib.svg)
![License](https://img.shields.io/npm/l/markmap-lib.svg)
![Downloads](https://img.shields.io/npm/dt/markmap-lib.svg)

Visualize your Markdown as mindmaps.

This project is heavily inspired by [dundalek's markmap](https://github.com/dundalek/markmap).

[Try it out](https://markmap.js.org/repl).

Node.js >= 10 is required.

## Install

```sh
$ yarn add markmap-lib
```

`d3` is also required if you are using `dist/view.js` with bundlers:

```sh
$ yarn add d3
```

See [markmap-cli](https://github.com/gera2ld/markmap/tree/master/packages/markmap-cli) for command-line usage.

## API

### Transform

Transform Markdown to markmap data:

```js
import { transform, getUsedAssets, getAssets } from 'markmap-lib/dist/transform';

// 1. transform markdown
const { root, features } = transform(markdown);

// 2. get assets
// either get assets required by used features
const { styles, scripts } = getUsedAssets(features);
// or get all possible assets that could be used later
const { styles, scripts } = getAssets();
```

Now we have the data for rendering.

### Render

Render a markmap from transformed data:

Create an SVG element with explicit width and height:

```html
<script src="https://cdn.jsdelivr.net/npm/d3@5"></script>
<script src="https://cdn.jsdelivr.net/npm/markmap-lib/dist/browser/view.min.js"></script>

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
