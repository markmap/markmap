# markmap-vue

![NPM](https://img.shields.io/npm/v/markmap-vue.svg)
![License](https://img.shields.io/npm/l/markmap-vue.svg)
![Downloads](https://img.shields.io/npm/dt/markmap-vue.svg)

Vue adapter for embeddable Markmap views.

## Install

```sh
npm install markmap-vue
```

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { Markmap } from 'markmap-vue';

const content = ref('# Strategy\n\n- Market\n- Product');
const theme = {
  colors: ['#0f766e', '#2563eb', '#9333ea'],
  textColor: '#172554',
  spacingHorizontal: 64,
};
</script>

<template>
  <Markmap
    class="mindmap"
    :content="content"
    :theme="theme"
    auto-fit
    auto-resize
    @ready="(embed) => console.log(embed.element)"
    @node-click="({ node }) => console.log(node.content)"
    @error="(error) => console.error(error)"
  />
</template>
```

The component creates and destroys the embed with Vue lifecycle. Use a template ref and `getEmbed()` when the host app needs direct access.

## Host iframe

Use `MarkmapHostFrame` when Vue embeds the hosted mindmap app. Set `parentOrigin` to your host app origin.

```vue
<script setup lang="ts">
import { MarkmapHostFrame } from 'markmap-vue';

const persistence = {
  load: (id: string) => localStorage.getItem(`mindmap:${id}`) || '# Strategy',
  save: (id: string, markdown: string) => {
    localStorage.setItem(`mindmap:${id}`, markdown);
  },
};
</script>

<template>
  <MarkmapHostFrame
    src="https://mindmaps.capaholdings.com/?embed=1&parentOrigin=https%3A%2F%2Fapp.example.com"
    target-origin="https://mindmaps.capaholdings.com"
    queue-until-ready
    auto-resize
    autosave
    map-id="client-123"
    :persistence="persistence"
    @ready="(connection) => connection.loadMap('client-123')"
    @autosave="(map) => console.log('saved', map.id)"
    @change="(result) => console.log(result.markdown)"
    @error="(error) => console.error(error)"
  />
</template>
```
