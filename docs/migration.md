---
title: Migrating from 0.18
---

Markmap was rebuilt so that a node holds structured content instead of an HTML string. That is what makes clean exports, canvas, and rendering without a browser possible. It is a clean break: the `markmap-*` packages are replaced by `@markmap/*`, with new APIs.

## Packages

| Before               | Now                                                            |
| -------------------- | -------------------------------------------------------------- |
| `markmap-lib`        | `@markmap/parse`                                               |
| `markmap-view`       | [@markmap/view](packages/view.md)                              |
| `markmap-render`     | `@markmap/render` for layout and SVG, `@markmap/page` for HTML |
| `markmap-toolbar`    | `@markmap/toolbar`                                             |
| `markmap-autoloader` | [@markmap/autoloader](packages/autoloader.md)                  |
| `markmap-cli`        | [@markmap/cli](packages/cli.md)                                |

## Code

```js
// Before
const transformer = new Transformer();
const { root } = transformer.transform(markdown);
Markmap.create(svg, undefined, root);

// Now
const { root } = parse(markdown);
Markmap.create(svg, root);
```

There are no assets to load from a CDN any more: everything comes with the packages. Other changes:

| Before                       | Now                                                                         |
| ---------------------------- | --------------------------------------------------------------------------- |
| `mm.setData(root, options)`  | `mm.setTree(root, options)`                                                 |
| `deriveOptions(json)`        | `resolveViewOptions(options, json)`                                         |
| `mm.rescale(k)`              | `mm.zoomBy(k)`, `mm.zoomIn()`, `mm.zoomOut()`                               |
| `mm.toggleNode(node)`        | `mm.toggle(id)`, `mm.setFolded(id, folded)`                                 |
| `mm.ensureVisible(node)`     | `mm.focusNode(id)`                                                          |
| `fillTemplate(root, assets)` | [`markmap file.md`](packages/cli.md) for one HTML file, or `<markmap-view>` |

## Options

| Before                | Now                                                 |
| --------------------- | --------------------------------------------------- |
| `initialExpandLevel`  | `foldLevel`, where the root is depth 0, and no `-1` |
| `maxWidth`            | `wrapWidth`                                         |
| `spacingHorizontal`   | `levelGap`                                          |
| `spacingVertical`     | `siblingGap`                                        |
| `colorFreezeLevel`    | `colorDepth`                                        |
| `paddingX`            | Set by the theme                                    |
| `lineWidth`           | Set by the theme                                    |
| `extraJs`, `extraCss` | Removed. Use plugins in code                        |
| `embedAssets`         | Removed. Exported HTML always works offline         |
| `htmlParser`          | Removed. Only headings and list items become nodes  |
| `activeNode`          | Removed                                             |

## Markdown

- Raw HTML is dropped, except [magic comments](guide/magic-comments.md) and a single [`<img>` tag](guide/writing.md#images).
- Paragraphs, code blocks and tables are now [notes](guide/writing.md#notes), not nodes.
- Math uses MathJax instead of KaTeX, and still needs no setup on this site.
- Autoloader blocks use `<script type="text/markdown">` instead of `text/template`, and there is no `window.markmap.autoLoader`.
