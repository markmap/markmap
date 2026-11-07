---
title: '@markmap/element'
---

The `<markmap-view>` web component: the easiest way to add a map to an app, with any framework or none.

## Installation

```sh
npm install @markmap/element
```

```js
import '@markmap/element';
```

Importing it on a server does nothing, so frameworks can prerender pages that use it.

## Usage

Markdown can come from a script inside the element, a `src` URL or the `markdown` property. The property wins over `src`, and `src` wins over a script:

```html
<markmap-view src="./notes.md" theme="cards" toolbar></markmap-view>

<markmap-view layout="two-sided">
  <script type="text/markdown">
    # Trip

    ## Before

    ## During
  </script>
</markmap-view>
```

```js
document.querySelector('markmap-view').markdown = '# Trip';
```

The element is 400px high by default. Set `height` in CSS to change it.

## Attributes

These update the map live, and win over the document's frontmatter.

| Attribute      | Description                         |
| -------------- | ----------------------------------- |
| `src`          | URL of a Markdown file              |
| `theme`        | `classic`, `cards` or `minimal`     |
| `layout`       | `tree`, `two-sided` or `org-chart`  |
| `color-scheme` | `light`, `dark` or `auto`           |
| `renderer`     | `svg` (default) or `canvas`         |
| `toolbar`      | Show the [toolbar](view.md#toolbar) |

## Properties

| Property       | Description                                                          |
| -------------- | -------------------------------------------------------------------- |
| `markdown`     | Markdown to show, ahead of `src` and inline Markdown                 |
| `options`      | `ViewOptions`, for what attributes cannot express, such as `plugins` |
| `parseOptions` | Options for `parse`, such as `plugins`                               |
| `toolbarItems` | What the toolbar shows                                               |
| `mm`           | The [`Markmap`](view.md) while the element is on the page            |
| `warnings`     | Options that were ignored in the last update                         |

## Events

`render` and `fold` carry the view event's value as `detail`. `error` fires when `src` cannot be loaded. `gfmfallback` fires after an update when the browser could not run GFM, so tables, task lists, strikethrough and bare links show as plain text.

```js
view.addEventListener('fold', (event) => {
  console.log([...event.detail]);
});
```

## Styling

The map lives in a shadow root, so page CSS stays out. Set `--mm-*` properties on the element to [override colors](../guide/themes-and-layouts.md#change-colors-with-css), and use `::part(toolbar)` to move the toolbar.

```css
markmap-view {
  height: 600px;
  --mm-bg: #fffdf5;
}

markmap-view::part(toolbar) {
  top: 8px;
  bottom: auto;
}
```
