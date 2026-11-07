# Markmap

Turn Markdown into interactive mind maps.

```markdown
# Trip

## Before

- Book flights
- Pack

## During

- See the sights
```

Headings and list items become branches you can fold, zoom and pan. Other text, such as paragraphs and code, stays with its branch as a note that opens in a popover.

## Where to use it

- **[VS Code](https://marketplace.visualstudio.com/items?itemName=gera2ld.markmap-vscode):** preview a map beside your Markdown as you type.
- **[The website](https://markmap.js.org/editor):** try it in the browser with nothing to install.

To add maps to your own pages and tools, read on.

## Features

- **Rich content:** bold, links, code, highlights, task lists, images and math.
- **Themes:** `classic`, `cards` and `minimal`, each with a dark mode, and every color can be changed with CSS.
- **Layouts:** `tree`, `two-sided` and `org-chart`.
- **Large maps:** an SVG renderer for most maps and a canvas renderer for very large ones.
- **Export:** save a map as SVG or PNG, in the browser or in Node.
- **Options in the document:** set them in frontmatter, and fold a node with `<!-- markmap: fold -->`.

```markdown
---
markmap:
  theme: cards
  layout: two-sided
  colorScheme: auto
  foldLevel: 2
---
```

## On a web page

One script turns each `.markmap` block into a map as it scrolls into view:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@markmap/autoloader@1/+esm"></script>

<div class="markmap" data-theme="cards" data-toolbar>
  <script type="text/markdown">
    # Trip

    ## Before

    ## During
  </script>
</div>
```

## In an app

Use the web component:

```js
import '@markmap/element';
```

```html
<markmap-view src="./notes.md" theme="cards" toolbar></markmap-view>
```

Or use the view directly:

```js
import { parse } from '@markmap/parse';
import { Markmap } from '@markmap/view';

const { root } = parse('# Trip\n\n## Before\n\n## During');
Markmap.create(document.querySelector('svg'), root);
```

## From the command line

```bash
markmap notes.md
```

This writes `notes.html`, one file that works offline, and opens it. Use `--svg` or `--png` for an image, or `markmap --help` for the other options.

## Packages

| Package                | What it does                       |
| ---------------------- | ---------------------------------- |
| `@markmap/parse`       | Markdown to a tree                 |
| `@markmap/render`      | Layouts, themes and SVG output     |
| `@markmap/view`        | The interactive map                |
| `@markmap/canvas`      | Canvas renderer and PNG export     |
| `@markmap/plugin-math` | Math with MathJax                  |
| `@markmap/element`     | The `<markmap-view>` web component |
| `@markmap/toolbar`     | Zoom and fold controls             |
| `@markmap/autoloader`  | One script for any web page        |
| `@markmap/page`        | One offline HTML file              |
| `@markmap/cli`         | The `markmap` command              |

## Documentation

The [documentation](https://markmap.js.org/docs) is written in [`docs/`](docs), and pull requests are welcome.

## License

MIT
