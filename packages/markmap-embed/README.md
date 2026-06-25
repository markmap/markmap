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
  theme: {
    colors: ['#0f766e', '#2563eb', '#9333ea'],
    font: '400 15px/20px Inter, sans-serif',
    textColor: '#172554',
    maxWidth: 520,
    spacingHorizontal: 64,
  },
  signal: controller.signal,
  onReady: (embed) => {
    console.log(embed.element);
  },
  onNodeClick: ({ node }) => {
    console.log(node.content);
  },
  onNodeToggle: ({ node }) => {
    console.log(node.payload?.fold);
  },
  onError: (error) => {
    console.error(error);
  },
});

await embed.update('# Updated\n\n- New branch');
await embed.setTheme({ textColor: '#111827', linkColor: '#2563eb' });
controller.abort();
```

`createMindmap` owns the SVG inside the host element and removes it on `destroy` or `AbortSignal` abort. Use `autoResize` when the host layout can resize the mindmap panel after mount.
