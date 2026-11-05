import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    // Use workspace sources directly, so edits show up without a build.
    alias: [
      {
        find: /^@markmap\/([^/]+)$/,
        replacement: fileURLToPath(new URL('../packages/$1/src/index.ts', import.meta.url)),
      },
    ],
  },
});
