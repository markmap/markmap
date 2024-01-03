import { defineConfig } from 'vite';
import { versionLoader } from '../../util.mjs';

const getVersion = versionLoader(import.meta.url);

export default defineConfig({
  define: {
    'process.env.D3_VERSION': JSON.stringify(await getVersion('d3')),
    'process.env.LIB_VERSION': JSON.stringify(await getVersion('markmap-lib')),
    'process.env.VIEW_VERSION': JSON.stringify(await getVersion('markmap-view')),
    'process.env.TOOLBAR_VERSION': JSON.stringify(await getVersion('markmap-toolbar')),
  },
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['iife'],
      name: 'markmap.autoLoader',
      fileName: () => 'index.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
