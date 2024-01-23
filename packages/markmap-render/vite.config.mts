import { readFile } from 'fs/promises';
import { builtinModules } from 'module';
import { defineConfig } from 'vite';
import pkg from './package.json' assert { type: 'json' };

const TEMPLATE = await readFile('templates/markmap.html', 'utf8');
const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

const define = {
  'process.env.TEMPLATE': JSON.stringify(TEMPLATE),
};

export default defineConfig({
  define,
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: {
        index: 'src/index.ts',
      },
      fileName: '[name]',
      formats: ['cjs', 'es'],
    },
    rollupOptions: {
      external,
    },
  },
});
