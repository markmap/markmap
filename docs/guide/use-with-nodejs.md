---
title: Use with Node.js
---

Everything but the interactive view runs without a browser.

## Render a PNG

`renderPNG` needs [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas):

```sh
npm install @markmap/parse @markmap/canvas @markmap/render @napi-rs/canvas
```

```ts
import { renderPNG } from '@markmap/canvas/node';
import { parse } from '@markmap/parse';
import { resolveRenderOptions } from '@markmap/render';
import { readFile, writeFile } from 'node:fs/promises';

async function renderMarkmap(file: string, outFile: string) {
  const { root, frontmatter } = parse(await readFile(file, 'utf8'));
  const { options } = resolveRenderOptions({}, frontmatter.markmap);
  const png = await renderPNG(root, { ...options, baseDir: '.' });
  await writeFile(outFile, png);
}

await renderMarkmap('notes.md', 'notes.png');
```

Local images are read only from `baseDir`, and remote ones are fetched only if `allow` returns `true`, so Markdown from someone else cannot read this machine or reach the network unless you say so.

## Render an SVG

```sh
npm install @markmap/parse @markmap/render
```

```ts
import { parse } from '@markmap/parse';
import { approximateMeasurer, renderTreeAsync, toSVGString } from '@markmap/render';

const { root } = parse(markdown);
const result = await renderTreeAsync(root, { measurer: approximateMeasurer });
const svg = toSVGString(result);
```

## From a script

The [CLI](../packages/cli.md) does all of this in one line, including math and local images:

```sh
markmap notes.md --png --no-open
```
