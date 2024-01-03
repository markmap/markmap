import { builtinModules } from 'module';
import { defineConfig } from 'vite';
import { versionLoader } from '../../util.mjs';
import pkg from './package.json' assert { type: 'json' };

const getVersion = versionLoader(import.meta.url);

// Bundle @babel/runtime to avoid requiring esm version in the output
const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies),
];

export default defineConfig({
  define: {
    'process.env.TOOLBAR_VERSION': JSON.stringify(await getVersion('markmap-toolbar')),
  },
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external,
    },
  },
});
