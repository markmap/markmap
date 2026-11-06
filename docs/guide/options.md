---
title: Options
---

Options go in the frontmatter of your Markdown, under `markmap`:

```md
---
markmap:
  theme: cards
  layout: two-sided
  foldLevel: 2
---

# Markdown content here
```

Values that are invalid or unknown are ignored and reported as warnings. The [editor](/editor) lists them below the map. In code, `resolveViewOptions` returns them.

## Look

### theme

Type: `string`, default: `classic`

One of `classic`, `cards` and `minimal`. See [Themes and layouts](themes-and-layouts.md).

### layout

Type: `string`, default: `tree`

One of `tree`, `two-sided` and `org-chart`.

### colorScheme

Type: `'light' | 'dark' | 'auto'`, default: `light`

`auto` follows the reader's system setting.

### color

Type: `string | string[]`, default: the d3 category10 palette

Branch colors, cycled through. One color paints every branch the same. For the `classic` and `cards` themes.

### colorDepth

Type: `number`, default: `0`

Nodes deeper than this level take their ancestor's color, where the root is level 1. `0` disables this. For the `classic` and `cards` themes.

## Layout

### wrapWidth

Type: `number`, default: `0`

Wrap labels wider than this, in px. `0` disables wrapping.

### levelGap

Type: `number`, default: `80`

The gap between levels.

### siblingGap

Type: `number`, default: `5`

The gap between siblings. The org chart keeps siblings three times this far apart.

## Behavior

### foldLevel

Type: `number`, default: none

Fold nodes at this depth and deeper when they first appear. The root is depth 0, so `1` shows only the root's children. To fold chosen branches instead, see [Magic comments](magic-comments.md).

### duration

Type: `number`, default: `500`

Length of fold, update and fit animations, in ms. `0` disables them, and so does the reader's `prefers-reduced-motion` setting.

### zoom

Type: `boolean`, default: `true`

Allow zooming with the wheel or a pinch.

### pan

Type: `boolean`, default: `true`

Allow panning by dragging.

### minScale

Type: `number`, default: `0.1`

The smallest scale to zoom out to. `fit()` may go further to show everything.

### maxScale

Type: `number`, default: `8`

The largest scale to zoom in to.

### fitPadding

Type: `number`, default: `20`

Space kept around the drawing when fitting it to the view, in px.

### fitMaxScale

Type: `number`, default: `2`

The largest scale `fit()` zooms in to.

## In code

The same options, and a few more such as `plugins`, are `ViewOptions` in [@markmap/view](../packages/view.md#options).
