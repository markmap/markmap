import { readFile } from 'fs/promises';
import { builtinModules } from 'module';
import { defineConfig } from 'vite';
import { versionLoader } from '../../util.mjs';
import pkg from './package.json' assert { type: 'json' };

const getVersion = versionLoader(import.meta.url);

const TEMPLATE = await readFile('templates/markmap.html', 'utf8');
const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

const define = {
  'process.env.TEMPLATE': JSON.stringify(TEMPLATE),
  'process.env.D3_VERSION': JSON.stringify(await getVersion('d3')),
  'process.env.VIEW_VERSION': JSON.stringify(await getVersion('markmap-view')),
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
