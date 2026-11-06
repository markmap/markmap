---
title: Themes and layouts
---

A **layout** decides where nodes go, and a **theme** decides how they look. Any layout works with any theme. Set both in the frontmatter:

```md
---
markmap:
  layout: two-sided
  theme: cards
---
```

## Layouts

### tree

The default. Children grow to the right of their parent.

```markmap layout="tree"
# Project
## Plan
- Goals
- Budget
## Build
- Design
- Code
```

### two-sided

The root's first branches go right and the rest go left, split so both sides are about the same size. Folding never moves a branch across.

```markmap layout="two-sided"
# Project
## Plan
- Goals
- Budget
## Build
- Design
- Code
## Launch
- Docs
## Review
- Metrics
```

### org-chart

Top-down, for hierarchies. `levelGap` is the gap between levels.

```markmap layout="org-chart"
# Project
## Plan
- Goals
- Budget
## Build
- Design
- Code
```

## Themes

### classic

Underlined labels, curved edges and fold circles. Takes `color` and `colorDepth`.

```markmap theme="classic"
# Project
## Plan
- Goals
## Build
- Code
```

### cards

Rounded cards with a scale-in animation. Takes `color` and `colorDepth`.

```markmap theme="cards"
# Project
## Plan
- Goals
## Build
- Code
```

### minimal

Plain text, thin gray edges and fold dots.

```markmap theme="minimal"
# Project
## Plan
- Goals
## Build
- Code
```

## Colors

`color` sets the branch colors, and one color paints every branch the same. `colorDepth` makes nodes below a level take their ancestor's color, where the root is level 1.

```markmap
---
markmap:
  color: ['#2980b9', '#c0392b']
  colorDepth: 2
---

# Project

## Plan

- Goals
  - This year

## Build

- Code
  - Tests
```

## Dark mode

Each theme has a dark set of colors. `colorScheme` picks `light`, `dark`, or `auto`, which follows the reader's system. The default is `light`, so a map never turns dark on a light page by surprise. On this website, a map follows the site unless its document says otherwise.

## Change colors with CSS

Colors are CSS variables, so a page can override them on the map's element. Exported SVG keeps them too.

```css
markmap-view {
  --mm-link: rebeccapurple;
  --mm-bg: #fffdf5;
}
```

| Token                                                                                                                             | Used for               |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `--mm-text`, `--mm-bg`                                                                                                            | Text, background       |
| `--mm-branch-0` and up                                                                                                            | Branch colors          |
| `--mm-link`                                                                                                                       | Links                  |
| `--mm-code-bg`, `--mm-code-text`                                                                                                  | Inline code            |
| `--mm-mark-bg`                                                                                                                    | Highlights             |
| `--mm-checkbox`, `--mm-note-dot`                                                                                                  | Checkboxes, note dots  |
| `--mm-toggle-bg`                                                                                                                  | Fold circles (classic) |
| `--mm-card-bg`                                                                                                                    | Cards (cards)          |
| `--mm-syntax-keyword`, `--mm-syntax-string`, `--mm-syntax-comment`, `--mm-syntax-number`, `--mm-syntax-title`, `--mm-syntax-attr` | Code in popovers       |
