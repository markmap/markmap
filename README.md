# markmap-lib

![NPM](https://img.shields.io/npm/v/markmap-lib.svg)
![License](https://img.shields.io/npm/l/markmap-lib.svg)
![Downloads](https://img.shields.io/npm/dt/markmap-lib.svg)

Visualize your Markdown as mindmaps.

This project is heavily inspired by [Markmap](https://github.com/dundalek/markmap).

[Try it out](https://markmap.js.org/repl).

Node.js >= 10 is required.

## Usage

### Command-line

#### Installation

Install globally:

```sh
$ yarn global add markmap-lib
# or
$ npm install markmap-lib -g
```

or use with `npx`:

```sh
$ npx markmap-lib
```

#### Commands

```
Usage: markmap [options] <input>

Create a markmap from a Markdown input file

Options:
  -V, --version          output the version number
  -o, --output <output>  specify filename of the output HTML
  --enable-mathjax       enable MathJax support
  --enable-prism         enable PrismJS support
  --no-open              do not open the output file after generation
  -h, --help             display help for command
```

Suppose we have a Markdown file named `note.md`.

Run the following command to get an interactive mindmap:

```sh
$ markmap note.md

# without global installation
$ npx markmap-lib note.md
```

Then we get `note.html` in the same directory, and hopefully it will be open in your default browser.

### API

#### Installation

```sh
$ yarn add markmap-lib
# or
$ npm install markmap-lib
```

#### Transform

Transform Markdown to markmap data:

```js
import { transform } from 'markmap-lib/dist/transform';

const data = transform(markdown);
```

Now we get the data for rendering in `data`.

#### Render

Render a markmap from transformed data:

Create an SVG element with explicit width and height:

```html
<svg id="markmap" style="width: 800px; height: 800px"></svg>
```

Render a markmap to the SVG element:

```js
import { Markmap } from 'markmap-lib/dist/view';

Markmap.create('#markmap', null, data);

// or pass an SVG element directly
const svgEl = document.querySelector('#markmap');
Markmap.create(svgEl, null, data);
```

### Plugins

- `mathJax` - MathJax
- `prism` - PrismJS

#### Command-line

To enable plugins in command line, just add the related option, for example:

```sh
$ markmap note.md --enable-mathjax --enable-prism
```

#### API

`loadPlugins` loads necessary CSS and JavaScript files.

```js
import { Markmap, loadPlugins } from 'markmap-lib/dist/view';

loadPlugins([
  'mathJax',
  'prism',
])
.then(() => {
  Markmap.create('#markmap', null, data);
});
```

MathJax options can be changed in the second parameter:

```js
loadPlugins([
  'mathJax',
  'prism',
], {
  mathJax: {
    tex: {
      inlineMath: [['$','$'], ['\\(','\\)']],
    },
  },
});
```

## Related

- Use with Vim / Neovim: [coc-markmap](https://github.com/gera2ld/coc-markmap)
- Use with GatsbyJS: [gatsby-remark-markmap](https://github.com/gera2ld/gatsby-remark-markmap)
