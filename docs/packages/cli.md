---
title: '@markmap/cli'
---

The `markmap` command writes a map of a Markdown file. It is a one-shot tool for scripts and CI. For live preview, use the [VS Code extension](https://marketplace.visualstudio.com/items?itemName=gera2ld.markmap-vscode) or the [editor](/editor).

## Installation

```sh
npm install -g @markmap/cli
```

Or run it with `npx`:

```sh
npx @markmap/cli notes.md
```

## Usage

```sh
markmap notes.md
```

This writes `notes.html`, one file that works offline, and opens it. Images in the Markdown file's folder are built in, and math comes along only when the document uses it.

```
Usage: markmap [options] <file.md>

Options:
  -o, --output <file>  Where to write; - for stdout. Defaults to the input's name.
      --svg            Write an SVG image instead
      --png            Write a PNG image instead
      --no-open        Do not open the page in a browser
      --no-toolbar     Leave the toolbar off the page
  -h, --help           Show this help
  -v, --version        Show the version
```

Use `-` as the file to read from stdin. Images honor frontmatter and folds.

`--png` needs `@napi-rs/canvas`, and `--svg` measures text better with it:

```sh
npm install -g @napi-rs/canvas
```
