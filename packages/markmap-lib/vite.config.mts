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
  'process.env.LIB_VERSION': JSON.stringify(pkg.version),
  'process.env.D3_VERSION': JSON.stringify(await getVersion('d3')),
  'process.env.VIEW_VERSION': JSON.stringify(await getVersion('markmap-view')),
  'process.env.PRISM_VERSION': JSON.stringify(await getVersion('prismjs')),
  'process.env.HLJS_VERSION': JSON.stringify(await getVersion('@highlightjs/cdn-assets/package.json')),
  'process.env.KATEX_VERSION': JSON.stringify(await getVersion('katex')),
  'process.env.WEBFONTLOADER_VERSION': JSON.stringify(await getVersion('webfontloader')),
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

const configBrowserEs = defineConfig({
  define,
  build: {
    emptyOutDir: !process.env.KEEP_DIST,
    minify: false,
    outDir: 'dist/browser',
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external,
    },
  },
  resolve: {
    extensions: ['.browser.ts', '.ts'],
  },
});

const configBrowserJs = defineConfig({
  define,
  build: {
    emptyOutDir: !process.env.KEEP_DIST,
    minify: false,
    outDir: 'dist/browser',
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['iife'],
      name: 'markmap',
    },
    rollupOptions: {
      external: [
        'katex',
        'highlight.js',
      ],
      output: {
        extend: true,
        globals: {
          katex: 'window.katex',
          'highlight.js': 'window.hljs',
        },
      },
    },
  },
  resolve: {
    extensions: ['.browser.ts', '.ts'],
  },
});

const configMap = {
  node: configNode,
  browserEs: configBrowserEs,
  browserJs: configBrowserJs,
};

export default configMap[process.env.TARGET] || configMap.node;
