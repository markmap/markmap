---
markmap:
  colorDepth: 2
---

# markmap

## Parse

- remark + **gfm**
- frontmatter
- _Notes_ collected

## Render

- Measure
  - Canvas in the browser
  - Approximation in Node
- Layout with flextree
- Classic theme
  - Underlines
  - Curved edges
  - Fold circles

## View <!-- markmap: fold -->

- Zoom and pan
- Fold and fit

## 中文标题

- 支持中日韩文字换行，这是一段比较长的文本，用来测试自动换行是否正常工作

## Inline

- `inline code` and [a link][docs]
- ~~strikethrough~~ and ==highlight==
- [x] Done task
- [ ] Open task with **==bold highlight==**

## Notes

- Notes under a node

  Extra paragraphs, `code`, ==highlights== and [links](https://markmap.js.org) open in a popover.

  ```js
  const mm = Markmap.create(svg, root);
  ```

  | Block | Shown in    |
  | ----- | ----------- |
  | Table | the popover |

## Math

- Euler $e^{i\pi} + 1 = 0$
- $\sum_{k=1}^{n} k = \frac{n(n+1)}{2}$
- Notes with math

  Inline $a^2 + b^2 = c^2$, and on its own line:

  $$
  \int_0^1 x^2 \, dx = \frac{1}{3}
  $$

## Images

- Sized: <img src="sample.png" width="48" height="32" alt="sized">
- Loaded first ![natural](sample.png)
- Width only <img src="sample.png" width="72">
- Broken ![alt text instead](missing.png)
- In notes

  <img src="sample.png" width="120">

[docs]: https://markmap.js.org
