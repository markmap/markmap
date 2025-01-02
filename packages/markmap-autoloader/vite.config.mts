import { defineConfig } from 'vite';
import { versionLoader } from '../../util.mts';

const getVersion = versionLoader(import.meta.dirname);

export default defineConfig({
  define: {
    '__define__.D3_VERSION': JSON.stringify(await getVersion('d3')),
    '__define__.LIB_VERSION': JSON.stringify(await getVersion('markmap-lib')),
    '__define__.VIEW_VERSION': JSON.stringify(await getVersion('markmap-view')),
    '__define__.TOOLBAR_VERSION': JSON.stringify(
      await getVersion('markmap-toolbar'),
    ),
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
