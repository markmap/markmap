import { defineConfig } from 'vite';

const configEs = defineConfig({
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['markmap-common'],
    },
  },
});

const configJs = defineConfig({
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      fileName: () => 'index.js',
      formats: ['iife'],
      name: 'markmap',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});

export default process.env.TARGET === 'es' ? configEs : configJs;
