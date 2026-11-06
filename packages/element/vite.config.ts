import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

const external = Object.keys(pkg.dependencies);

export default defineConfig({
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rolldownOptions: {
      external: (id) => external.some((dep) => id === dep || id.startsWith(`${dep}/`)),
    },
  },
});
