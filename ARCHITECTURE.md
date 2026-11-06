# Architecture

A map goes through a pipeline of pure functions. Everything except the final drawing runs in Node.

```
Markdown ──remark──▶ mdast ──toTree──▶ Markmap tree (JSON)
   ──measure──▶ sizes ──layout──▶ rects + edge anchors ──render──▶ Primitive[]
                                                                    ├─▶ SVG DOM      (interactive)
                                                                    ├─▶ SVG string   (export)
                                                                    └─▶ Canvas2D     (interactive, PNG)
```

The tree is plain data, so it can be stored or sent anywhere. Primitives are a small set of drawing instructions, such as `rect`, `path`, `text` and `image`, and every backend has to implement the ones it claims.

## Packages

| Package                | Role                                                |
| ---------------------- | --------------------------------------------------- |
| `@markmap/core`        | Types, tree utilities, theme and plugin contracts   |
| `@markmap/parse`       | Markdown to a tree                                  |
| `@markmap/render`      | Measuring, layouts, themes, primitives, SVG strings |
| `@markmap/view`        | Zoom, pan, folding, animation and hit testing       |
| `@markmap/canvas`      | Canvas backend and PNG export                       |
| `@markmap/plugin-math` | Math, as a parser plugin and a content plugin       |
| `@markmap/element`     | The `<markmap-view>` web component                  |
| `@markmap/toolbar`     | Zoom and fold controls                              |
| `@markmap/autoloader`  | One script that renders maps on any page            |
| `@markmap/page`        | One offline HTML file, in Node or a browser         |
| `@markmap/cli`         | The `markmap` command                               |

`core`, `parse` and `render` need no DOM.

## Extension points

| Point            | Shape                                                                |
| ---------------- | -------------------------------------------------------------------- |
| Parse            | Unified plugins                                                      |
| Content renderer | `{ measure, render }` for inline content, such as math               |
| Layout           | Sized tree to rects and anchors, with an optional `interpolate` hook |
| Theme            | Tokens, fonts, node chrome and edges                                 |

Any layout works with any theme. A layout decides where nodes go and hands anchors to the theme's edge renderer. A theme decides how nodes and edges look, and its colors are CSS variables, so a page can override them and dark mode survives export.

## Animation

The view owns the clock, including duration, easing, reduced motion and canceling. It eases between draw states and hands each frame to the backend. The layout decides the path of each node, and the theme decides how entering and leaving nodes look. Folding pans on each frame to keep the toggled node still.

## Releases

Changesets handles versions and changelogs. All packages share one version, because the autoloader and `@markmap/page` bundle other packages through `devDependencies`, which do not trigger a bump.
