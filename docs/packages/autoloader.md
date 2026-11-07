---
title: '@markmap/autoloader'
---

One script that turns each `.markmap` block on a page into a map as it scrolls into view. The script is small, and the map code loads only when a map gets close.

## Usage

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

Blocks may also hold the Markdown as plain text, or point to it with `data-src`. A block keeps its `id`, classes and styles, and is 400px high unless your CSS says otherwise.

## Block attributes

| Attribute           | Description                                 |
| ------------------- | ------------------------------------------- |
| `data-src`          | URL of a Markdown file                      |
| `data-theme`        | `classic`, `cards` or `minimal`             |
| `data-layout`       | `tree`, `two-sided` or `org-chart`          |
| `data-color-scheme` | `light`, `dark` or `auto`                   |
| `data-renderer`     | `svg` or `canvas`                           |
| `data-toolbar`      | Show the toolbar                            |
| `data-math`         | Load math, which is off because of its size |

## Set defaults

Call `configure` right after importing:

```html
<script type="module">
  import { configure } from 'https://cdn.jsdelivr.net/npm/@markmap/autoloader@1/+esm';

  configure({ theme: 'cards', toolbar: true, math: true });
</script>
```

It takes `theme`, `layout`, `colorScheme`, `renderer`, `toolbar` and `math`, and `options` for [`ViewOptions`](view.md#options). A block's attributes win over these.

## Content added later

`renderAll` shows every block now, including ones added since the page loaded:

```js
import { renderAll } from 'https://cdn.jsdelivr.net/npm/@markmap/autoloader@1/+esm';

await renderAll();
```
