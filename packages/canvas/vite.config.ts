import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

export default defineConfig({
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: { index: 'src/index.ts', node: 'src/node.ts' },
      formats: ['es'],
    },
    rolldownOptions: {
      external: (id) =>
        id.startsWith('node:') ||
        builtinModules.includes(id) ||
        external.some((dep) => id === dep || id.startsWith(`${dep}/`)),
    },
  },
});
