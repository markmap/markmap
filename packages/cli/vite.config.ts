import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.optionalDependencies)];

/** The command, for Node. The pages it writes use `vite.client.config.ts`. */
export default defineConfig({
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: { cli: 'src/cli.ts' },
      formats: ['es'],
    },
    rolldownOptions: {
      external: (id) =>
        id.startsWith('node:') ||
        builtinModules.includes(id) ||
        external.some((dep) => id === dep || id.startsWith(`${dep}/`)),
      output: { banner: '#!/usr/bin/env node' },
    },
  },
});
