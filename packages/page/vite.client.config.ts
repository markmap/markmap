import { defineConfig } from 'vite';

/**
 * The script inlined in a page: one file, everything bundled, as
 * the page must work offline. `--mode math` builds the variant with math.
 */
export default defineConfig(({ mode }) => {
  const name = mode === 'math' ? 'client-math' : 'client';
  return {
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      emptyOutDir: false,
      lib: {
        entry: `src/client/${name}.ts`,
        formats: ['iife'],
        name: 'markmapClient',
        fileName: () => `${name}.js`,
      },
      rolldownOptions: { output: { inlineDynamicImports: true } },
    },
  };
});
