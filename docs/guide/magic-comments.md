---
title: Magic comments
---

Magic comments set the initial state of a node. They are invisible in other Markdown renderers.

```markmap
## heading 1

- item 1 <!-- markmap: foldAll -->
  - item 1.1
    - item 1.1.1
  - item 1.2
    - item 1.2.1
- item 2

## heading 2 <!-- markmap: fold -->

- item 3
  - item 3.1
- item 4
  - item 4.1
```

A magic comment starts with `markmap:` and is followed by an action.

## Supported actions

### fold

Fold the current node only.

### foldAll

Fold the current node and all its descendants, so unfolding reveals one level at a time.
