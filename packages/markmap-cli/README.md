# markmap-cli

![NPM](https://img.shields.io/npm/v/markmap-cli.svg)
![License](https://img.shields.io/npm/l/markmap-cli.svg)
![Downloads](https://img.shields.io/npm/dt/markmap-cli.svg)

Use [markmap-lib](https://markmap.js.org/) in command-line.

## Installation

```sh
$ yarn global add markmap-cli
# or
$ npm install -g markmap-cli
```

You can also use with `npx` without installation:

```sh
$ npx markmap-cli
```

## Command-line Usage

```
Usage: markmap [options] <input>

Create a markmap from a Markdown input file

Options:
  -V, --version          output the version number
  --no-open              do not open the output file after generation
  --no-toolbar           do not show toolbar
  -o, --output <output>  specify filename of the output HTML
  -w, --watch            watch the input file and update output on the fly, note that this feature is for development only
  -h, --help             display help for command
```

### Creating a markmap

Suppose we have a Markdown file named `note.md`.

Run the following command to get an interactive mindmap:

```sh
$ markmap note.md

# without global installation
$ npx markmap-lib note.md
```

Then we get `note.html` in the same directory, and hopefully it will be open in your default browser.

### Watching changes

Enable watching mode by `-w`:

```sh
$ markmap -w note.md
```

A markmap will be created and opened in your browser, and will be updated as soon as changes are saved to the source file.
