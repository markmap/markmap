import { defineConfig } from 'vite';

/** The page builder. The scripts it inlines use `vite.client.config.ts`. */
export default defineConfig({
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
  },
});
