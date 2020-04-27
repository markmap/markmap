# markmap-lib

![NPM](https://img.shields.io/npm/v/markmap-lib.svg)
![License](https://img.shields.io/npm/l/markmap-lib.svg)
![Downloads](https://img.shields.io/npm/dt/markmap-lib.svg)

Visualize your Markdown as mindmaps.

This project is heavily inspired by [Markmap](https://github.com/dundalek/markmap).

See [online demo](https://markmap.js.org/repl).

Requires Node.js >= 10.

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
  --no-open              do not open the output file after generation
  -h, --help             display help for command
```

Suppose you have a Markdown file named `note.md`.

Run the following command to get an interactive mindmap:

```sh
$ markmap note.md

# without global installation
$ npx markmap-lib note.md
```

Then you will get a `note.html` in the same directory, and hopefully it will be open in your default browser.

#### MathJax

To enable MathJax support for your Markdown, pass `--enable-mathjax`:

```sh
$ markmap --enable-mathjax note.md
```

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
import { transform } from 'markmap-lib/dist/transform.common';

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
import { markmap } from 'markmap-lib/dist/view.common';

markmap('#markmap', data);

// or pass an SVG element directly
const svgEl = document.querySelector('#markmap');
markmap(svgEl, data);
```

#### MathJax

To enable MathJax, you need to load MathJax before rendering markmap:

```html
<script>
window.MathJax = {
  options: {
    skipHtmlTags: {
      '[-]': ['code', 'pre']
    }
  }
};
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
```

and process Html with MathJax in `options.processHtml`:

```js
import { markmap } from 'markmap-lib/dist/view.common';

markmap('#markmap', data, {
  processHtml: nodes => {
    if (window.MathJax.typeset) MathJax.typeset(nodes);
  },
});
```

**Note**:

- The `skipHtmlTags` option is required because inline code generated from Markdown is always wrapped in `<code>`, which is ignored by MathJax by default.
- The MathJax library should better be loaded synchronously so that we can just use it in `options.processHtml` without a flash.

## Related

- Use with Vim / Neovim: [coc-markmap](https://github.com/gera2ld/coc-markmap)
- Use with GatsbyJS: [gatsby-remark-markmap](https://github.com/gera2ld/gatsby-remark-markmap)
