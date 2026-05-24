# markmap-embed

![NPM](https://img.shields.io/npm/v/markmap-embed.svg)
![License](https://img.shields.io/npm/l/markmap-embed.svg)
![Downloads](https://img.shields.io/npm/dt/markmap-embed.svg)

Embed a Markmap view inside another application without globals or CDN scripts.

## Install

```sh
npm install markmap-embed
```

## Usage

```ts
import { createMindmap } from 'markmap-embed';

const controller = new AbortController();
const embed = await createMindmap(document.querySelector('#mindmap')!, {
  content: '# Strategy\n\n- Market\n- Product\n- Operations',
  autoFit: true,
  autoResize: true,
  signal: controller.signal,
  onReady: (embed) => {
    console.log(embed.element);
  },
  onError: (error) => {
    console.error(error);
  },
});

await embed.update('# Updated\n\n- New branch');
controller.abort();
```

`createMindmap` owns the SVG inside the host element and removes it on `destroy` or `AbortSignal` abort. Use `autoResize` when the host layout can resize the mindmap panel after mount.
