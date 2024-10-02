import { builtinModules } from 'module';
import { readPackageUp } from 'read-package-up';
import { defineConfig } from 'vite';
import { versionLoader } from '../../util.mjs';

const { packageJson: pkg } = await readPackageUp();
const getVersion = versionLoader(import.meta.url);

const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

const define = {
  'process.env.LIB_VERSION': JSON.stringify(pkg.version),
  'process.env.VIEW_VERSION': JSON.stringify(await getVersion('markmap-view')),
  'process.env.PRISM_VERSION': JSON.stringify(await getVersion('prismjs')),
  'process.env.HLJS_VERSION': JSON.stringify(
    await getVersion('@highlightjs/cdn-assets/package.json'),
  ),
  'process.env.KATEX_VERSION': JSON.stringify(await getVersion('katex')),
  'process.env.WEBFONTLOADER_VERSION': JSON.stringify(
    await getVersion('webfontloader'),
  ),
  'process.env.NO_PLUGINS': 'false',
};

const configNode = defineConfig({
  define,
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: {
        index: 'src/index.ts',
        plugins: 'src/plugins/index.ts',
      },
      fileName: '[name]',
      formats: ['cjs', 'es'],
    },
    rollupOptions: {
      external,
    },
  },
});

// Without any built-in plugins
const configNodeLight = defineConfig({
  define: {
    ...define,
    'process.env.NO_PLUGINS': 'true',
  },
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      fileName: 'index.no-plugins',
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
    emptyOutDir: false,
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
    emptyOutDir: false,
    minify: false,
    outDir: 'dist/browser',
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['iife'],
      name: 'markmap',
    },
    rollupOptions: {
      external: ['katex', 'highlight.js'],
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
  nodeLight: configNodeLight,
  browserEs: configBrowserEs,
  browserJs: configBrowserJs,
};

export default configMap[process.env.TARGET] || configMap.node;
