# markmap-svelte

![NPM](https://img.shields.io/npm/v/markmap-svelte.svg)
![License](https://img.shields.io/npm/l/markmap-svelte.svg)
![Downloads](https://img.shields.io/npm/dt/markmap-svelte.svg)

Svelte action for embeddable Markmap views.

## Install

```sh
npm install markmap-svelte
```

## Usage

```svelte
<script lang="ts">
  import { markmap } from 'markmap-svelte';

  let content = '# Strategy\n\n- Market\n- Product';
  const theme = {
    colors: ['#0f766e', '#2563eb', '#9333ea'],
    textColor: '#172554',
    spacingHorizontal: 64,
  };
</script>

<div
  class="mindmap"
  use:markmap={{
    content,
    theme,
    autoFit: true,
    autoResize: true,
    onReady: (embed) => console.log(embed.element),
    onNodeClick: ({ node }) => console.log(node.content),
    onError: (error) => console.error(error),
  }}
/>
```

The action creates and destroys the embed with Svelte lifecycle. The action return value exposes `getEmbed()` for direct host-app access.
