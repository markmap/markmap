---
title: markmap
---

## What is markmap?

Markmap turns Markdown into an interactive mind map. Headings and list items become branches you can fold, zoom and pan. Other text, such as paragraphs and code, stays with its branch as a note.

```markmap
# Trip

## Before

- Book flights
- Pack

## During

- See the sights
```

The easiest way to try it is the 👉 [editor](/editor). You can also use it in:

- [VS Code](https://marketplace.visualstudio.com/items?itemName=gera2ld.markmap-vscode) 🚀
- the command line, with [@markmap/cli](packages/cli.md)
- Vim / Neovim, with [coc-markmap](packages/coc-markmap.md)
- [many other tools](related-projects.md)

## Learn the basics

- [Writing maps](guide/writing.md): what becomes a branch, a note, or part of a label
- [Themes and layouts](guide/themes-and-layouts.md): the looks and shapes a map can take
- [Options](guide/options.md): settings you can keep in the document itself
- [Magic comments](guide/magic-comments.md): fold chosen branches

## Add maps to your own pages

| You want to                       | Use                                           |
| --------------------------------- | --------------------------------------------- |
| Show maps on a page with a script | [@markmap/autoloader](packages/autoloader.md) |
| Add a map to an app               | [@markmap/element](packages/element.md)       |
| Control everything from code      | [@markmap/view](packages/view.md)             |
| Render without a browser          | [Use with Node.js](guide/use-with-nodejs.md)  |

Coming from `markmap-lib` and `markmap-view`? See [Migrating from 0.18](migration.md).

## Support

See the [FAQ](faq.md) for common questions. If you still need help, feel free to ask in [GitHub Discussions](https://github.com/markmap/markmap/discussions).

## Credits

Originally inspired by [dundalek's markmap](https://github.com/dundalek/markmap).
