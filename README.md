# markmap-lib

Visualize your Markdown as mindmaps.

This project is heavily inspired by [Markmap](https://github.com/dundalek/markmap).

It is a complete reimplementation with some additional features:

- command-line usage
- multiline text
- text styles
- links
- friendly to browsers

<img src="https://user-images.githubusercontent.com/3139113/72221499-52476a80-3596-11ea-8d15-c57fdfe04ce0.png" alt="markdown" width="300"> <img src="https://user-images.githubusercontent.com/3139113/72221508-7014cf80-3596-11ea-9b59-b8a97bba8e1c.png" alt="mindmap" width="300">

## Installation

```sh
$ yarn global add markmap-lib
# or
$ npm i markmap-lib -g
```

## Usage

Suppose you have a Markdown file named `README.md`.

Run the command below:

```sh
$ markmap README.md

# without installation
$ npx markmap-lib README.md
```

Then you will get a `README.html` in the same directory, and hopefully it will be open in your default browser.

## Related

- [coc-markmap](https://github.com/gera2ld/coc-markmap) - Vim / NeoVim plugin powered by [coc.nvim](https://github.com/neoclide/coc.nvim)
