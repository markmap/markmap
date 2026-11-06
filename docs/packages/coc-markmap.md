---
title: coc-markmap
---

![NPM](https://img.shields.io/npm/v/coc-markmap.svg)

## Installation

Make sure [coc.nvim](https://github.com/neoclide/coc.nvim) is started.

Then install with the Vim command:

```viml
:CocInstall coc-markmap
```

## Usage

Open a Markdown file in Vim / Neovim, and execute:

```viml
:CocCommand markmap.create
```

An HTML file with the same basename as the Markdown file will be created and opened in your default browser.

Visualization of selected text is also supported.
