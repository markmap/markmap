import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: !process.env.KEEP_DIST,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['cjs', 'es'],
      fileName: 'index',
    },
  },
});
