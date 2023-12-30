import { builtinModules } from 'module';
import { defineConfig } from 'vite';
import { versionLoader } from '../../util.mjs';
import pkg from './package.json' assert { type: 'json' };

const getVersion = versionLoader(import.meta.url);

const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

const define = {
  'process.env.TREE_PARSER_VERSION': JSON.stringify(pkg.version),
};

const configNode = defineConfig({
  define,
  build: {
    emptyOutDir: !process.env.KEEP_DIST,
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
    emptyOutDir: !process.env.KEEP_DIST,
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
