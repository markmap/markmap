---
title: Writing maps
---

Markmap reads ordinary Markdown, with [GFM](https://github.github.com/gfm/) extensions, so a document you already have is usually a map already.

## Branches

Only headings and list items become nodes. A single `# Heading` becomes the root. Otherwise the root comes from `title` in the frontmatter, or stays empty.

```md
---
title: Used when there is no single H1
---

## A heading is a branch

- So is a list item
  - Nest them as deep as you like
```

## Labels

A label can hold:

| Syntax                     | Shows                                              |
| -------------------------- | -------------------------------------------------- |
| `**bold**`, `*italic*`     | Bold, italic                                       |
| `~~strike~~`               | Strikethrough                                      |
| `==highlight==`            | Highlight                                          |
| `` `code` ``               | Inline code                                        |
| `[text](url)`              | A link                                             |
| `- [x] done`, `- [ ] open` | A task list checkbox                               |
| `![alt](url)`              | An image                                           |
| `$e^{i\pi}$`               | Math, with [plugin-math](../packages/view.md#math) |

Raw HTML is dropped, with two exceptions: [magic comments](magic-comments.md) and a single `<img>` tag, described below.

## Notes

Anything else, such as paragraphs, code blocks, tables and quotes, becomes a **note** on the node that owns it. A note is a small dot beside the label. Click it to read the note in a popover.

- A paragraph under a heading belongs to that heading.
- In a list item with several paragraphs, the first is the label and the rest are notes.
- Blocks before the first heading belong to the root.

````markmap
# Release

## Checklist

Run these in order, and stop if one fails.

- Tag the version

  ```sh
  git tag v1.0.0
  ```

- Tell people

````

Notes keep the map small and leave your document whole. Code in a note is highlighted, and exported images keep the dot but not the note's content.

## Images

`![alt](url)` loads the image to find its size. To lay it out at once, give the size with an `<img>` tag:

```md
- Logo <img src="logo.png" width="120" height="80" alt="Logo">
```

Only `src`, `alt`, `width` and `height` are kept. Every image is capped at the wrap width and keeps its aspect ratio. An image that fails to load shows its alt text.

## Math

Math works in labels and in notes, on the website and with the [CLI](../packages/cli.md). In your own code, add [@markmap/plugin-math](../packages/view.md#math).

```markmap
# Math

- Euler: $e^{i\pi} + 1 = 0$
- Sum: $\sum_{k=1}^{n} k = \frac{n(n+1)}{2}$
```
