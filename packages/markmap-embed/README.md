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

## Host iframe SDK

Use `connectMindmap` when the mindmap runs inside an iframe and the host app owns persistence, routing, or permissions.

```ts
import { connectMindmap } from 'markmap-embed';

const iframe = document.querySelector<HTMLIFrameElement>('#mindmap-frame')!;

const connection = connectMindmap(iframe, {
  targetOrigin: 'https://mindmaps.capaholdings.com',
  queueUntilReady: true,
  autoResize: true,
  persistence: {
    load: (id) => localStorage.getItem(`mindmap:${id}`) || '# Strategy',
    save: (id, markdown) => {
      localStorage.setItem(`mindmap:${id}`, markdown);
    },
  },
});

connection.onChange((result) => {
  console.log(result.markdown);
});

await connection.ready();
await connection.loadMap('client-123');
connection.editNode({ id: 'node-1', content: 'Updated node' });
await connection.saveMap('client-123');
```

## Web Component

Use the custom element when the host app is plain HTML, Angular, Rails, Laravel, or any stack that can load an ES module.

```html
<markmap-host-frame
  id="client-map"
  src="https://mindmaps.capaholdings.com/?embed=1"
  target-origin="https://mindmaps.capaholdings.com"
  queue-until-ready
  auto-resize
  autosave
  map-id="client-123"
  autosave-debounce-ms="800"
></markmap-host-frame>

<script type="module">
  import { defineMindmapHostFrame } from 'markmap-embed';

  defineMindmapHostFrame();

  const frame = document.querySelector('#client-map');

  frame.persistence = {
    load: (id) => localStorage.getItem(`mindmap:${id}`) || '# Strategy',
    save: (id, markdown) => {
      localStorage.setItem(`mindmap:${id}`, markdown);
    },
  };

  frame.addEventListener('ready', (event) => {
    event.detail.connection.loadMap('client-123');
  });

  frame.addEventListener('autosave', (event) => {
    console.log('saved', event.detail.id);
  });
</script>
```
