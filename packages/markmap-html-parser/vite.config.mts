import { builtinModules } from 'module';
import { readPackageUp } from 'read-package-up';
import { defineConfig } from 'vite';

const { packageJson: pkg } = await readPackageUp({ cwd: import.meta.dirname });

const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

const define = {
  '__define__.HTML_PARSER_VERSION': JSON.stringify(pkg.version),
};

const configNode = defineConfig({
  define,
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['cjs', 'es'],
    },
    rollupOptions: {
      external,
    },
  },
});

const configBrowserJs = defineConfig({
  define,
  build: {
    emptyOutDir: false,
    minify: false,
    outDir: 'dist',
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['iife'],
      name: 'markmap.htmlParser',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
  resolve: {
    extensions: ['.browser.ts', '.ts'],
  },
});

const configMap = {
  node: configNode,
  browserJs: configBrowserJs,
};

export default configMap[process.env.TARGET] || configMap.node;
