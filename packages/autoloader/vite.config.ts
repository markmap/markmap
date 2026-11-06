import { defineConfig } from 'vite';

/**
 * Everything is bundled, for use from a CDN. The script itself stays small: the map code
 * is in chunks beside it, which load when the first map is needed.
 */
export default defineConfig({
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
  },
});
