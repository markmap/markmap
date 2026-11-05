import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Test against workspace sources, not stale builds.
    alias: [
      {
        find: /^@markmap\/([^/]+)$/,
        replacement: fileURLToPath(new URL('./packages/$1/src/index.ts', import.meta.url)),
      },
    ],
  },
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
