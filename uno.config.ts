import { defineConfig, presetUno } from 'unocss';

export default defineConfig({
  content: {
    filesystem: ['src/**/*.{html,js,ts,jsx,tsx,vue,svelte,astro}'],
  },
  presets: [presetUno()],
});
