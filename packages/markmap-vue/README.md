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
</script>

<template>
  <Markmap
    class="mindmap"
    :content="content"
    auto-fit
    @ready="(embed) => console.log(embed.element)"
    @error="(error) => console.error(error)"
  />
</template>
```

The component creates and destroys the embed with Vue lifecycle. Use a template ref and `getEmbed()` when the host app needs direct access.

