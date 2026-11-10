---
title: '@markmap/view'
---

The interactive map: zoom, pan, fold, animation and note popovers. For most apps, [@markmap/element](element.md) is simpler and uses this underneath.

## Installation

```sh
npm install @markmap/parse @markmap/view
```

## Usage

```html
<svg id="map" style="width: 800px; height: 600px"></svg>
```

```js
import { parse } from '@markmap/parse';
import { Markmap } from '@markmap/view';

const { root } = parse(markdown);
const mm = Markmap.create(document.querySelector('#map'), root);
```

To update the map, call `mm.setTree(root)`. Folded branches stay folded, so this suits live editing.

## Options

Pass `ViewOptions` as the third argument of `Markmap.create`, or with `setTree` and `setOptions`. They include everything in [Options](../guide/options.md), where `theme` and `layout` are objects instead of names, plus:

| Option      | Type              | Description                                                   |
| ----------- | ----------------- | ------------------------------------------------------------- |
| `plugins`   | `ContentPlugin[]` | Inline content renderers. Defaults to `defaultContentPlugins` |
| `highlight` | `boolean`         | Color code in notes. Defaults to `true`                       |
| `measurer`  | `Measurer`        | How text is measured. Defaults to a canvas measurer           |
| `gestures`  | `Gestures, false` | How input drives the map. See [Gestures](#gestures)           |

To apply options from a document, including names and theme options:

```js
import { parse } from '@markmap/parse';
import { Markmap, resolveViewOptions } from '@markmap/view';

const { root, frontmatter } = parse(markdown);
const { options, warnings } = resolveViewOptions({}, frontmatter.markmap);
const mm = Markmap.create(svg, root, options);
```

## Methods

| Method                                | Description                                                           |
| ------------------------------------- | --------------------------------------------------------------------- |
| `setTree(root, options?)`             | Show a new tree, keeping folds for ids that still exist               |
| `setOptions(options)`                 | Replace all options and redraw                                        |
| `fit()`                               | Scale and center the drawing to fill the element                      |
| `zoomIn()`, `zoomOut()`, `zoomBy(k)`  | Zoom around the center                                                |
| `toggle(id)`, `setFolded(id, folded)` | Fold or unfold a node                                                 |
| `expandAll(id?)`, `foldAll(id?)`      | Fold or unfold a subtree, the whole tree by default                   |
| `foldToLevel(level)`                  | Show the tree down to a level                                         |
| `setFoldedIds(ids, { animate })`      | Restore a saved fold state                                            |
| `focusNode(id, { scale, animate })`   | Unfold a node's ancestors and center on it                            |
| `openNotes(id)`, `closeNotes()`       | Show or hide a node's notes                                           |
| `on(type, listener)`                  | Listen to `render`, `zoom` or `fold`; returns an unsubscribe function |
| `destroy()`                           | Remove the map                                                        |

## Gestures

The map only offers actions, such as `toggle` and `expandAll`. The `gestures` option decides which input triggers them. By default, `defaultGestures` pans and zooms, toggles a branch when you click its circle, and toggles everything below it on Ctrl or Cmd + click.

A set of gestures is a function that connects input to the map and returns a function that disconnects it. `mm.layoutPoint(clientX, clientY)` and `mm.hitAt(x, y)` tell you what the pointer is on, which can be a `toggle`, `action`, `link` or `node`. To make a click on a node's text fold it, and keep panning and zooming:

```js
import { combineGestures, Markmap, panZoomGestures } from '@markmap/view';

const clickText = (mm) => {
  const onClick = ({ clientX, clientY }) => {
    const hit = mm.hitAt(...mm.layoutPoint(clientX, clientY));
    if (hit?.kind === 'node') mm.toggle(hit.nodeId);
  };
  mm.element.addEventListener('click', onClick);
  return () => mm.element.removeEventListener('click', onClick);
};

Markmap.create(svg, root, { gestures: combineGestures(panZoomGestures, clickText) });
```

`pointerGestures` is the click and hover half of the default. Pass `gestures: false` to connect no input at all.

## Render result

`mm.result` is the latest render, which you can pass to `toSVGString` or `toPNG`. `mm.foldedIds` and the node ids make links to a particular view easy to build.

## Export

```js
import { toPNG } from '@markmap/canvas';
import { toSVGString } from '@markmap/render';

const svg = toSVGString(mm.result);
const png = await toPNG(mm.result, { colorScheme: 'dark' });
```

An image whose server does not allow cross-origin use shows its alt text in a PNG. To export without a browser, see [Use with Node.js](../guide/use-with-nodejs.md).

## Math

`remarkMath` parses `$…$`, and `mathContent` draws it. MathJax is loaded the first time a formula is drawn, so maps without math do not pay for it.

```sh
npm install @markmap/plugin-math
```

```js
import { parse } from '@markmap/parse';
import { mathContent, remarkMath } from '@markmap/plugin-math';
import { defaultContentPlugins } from '@markmap/render';
import { Markmap } from '@markmap/view';

const { root } = parse(markdown, { plugins: [remarkMath] });
Markmap.create(svg, root, { plugins: [...defaultContentPlugins, mathContent] });
```

With `<markmap-view>`:

```js
view.parseOptions = { plugins: [remarkMath] };
view.options = { plugins: [...defaultContentPlugins, mathContent] };
```

## Toolbar

With `<markmap-view>`, add the `toolbar` attribute. Otherwise:

```sh
npm install @markmap/toolbar
```

```js
import { createToolbar } from '@markmap/toolbar';

const toolbar = createToolbar(mm);
document.body.append(toolbar.element);
```

The element is not positioned, so style `.markmap-toolbar` to place it. `items` takes `zoom-in`, `zoom-out`, `fit`, `expand-all` and `fold-level`, in the order you want them, and buttons of your own:

```js
createToolbar(mm, {
  items: ['zoom-in', 'zoom-out', { label: 'Save', onClick: (mm) => save(mm.foldedIds) }],
});
```

## Canvas

For very large maps, pass a canvas backend instead of an element. With `<markmap-view>`, set `renderer="canvas"`.

```sh
npm install @markmap/canvas
```

```js
import { CanvasBackend } from '@markmap/canvas';
import { Markmap } from '@markmap/view';

const mm = new Markmap(new CanvasBackend(canvas), options);
```

Canvas skips what is out of view and draws small text as bars, so it stays smooth with thousands of nodes. It has no accessibility tree yet, so use SVG unless your map needs this.
