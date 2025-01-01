import { readdir } from 'fs/promises';
import { builtinModules } from 'module';
import { join } from 'path';
import { readPackageUp } from 'read-package-up';
import { defineConfig } from 'vite';
import { versionLoader } from '../../util.mts';

const getVersion = versionLoader(import.meta.dirname);
const { packageJson: pkg } = await readPackageUp({ cwd: import.meta.dirname });

const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

const katexVersion = await getVersion('katex');
const katexResources = (
  await readdir(join(import.meta.dirname, 'node_modules/katex/dist/fonts'))
)
  .filter((item) => item.endsWith('.woff2'))
  .map((file) => `katex@${katexVersion}/dist/fonts/${file}`);

const define = {
  '__define__.LIB_VERSION': JSON.stringify(pkg.version),
  '__define__.VIEW_VERSION': JSON.stringify(await getVersion('markmap-view')),
  '__define__.PRISM_VERSION': JSON.stringify(await getVersion('prismjs')),
  '__define__.HLJS_VERSION': JSON.stringify(
    await getVersion('@highlightjs/cdn-assets'),
  ),
  '__define__.KATEX_VERSION': JSON.stringify(katexVersion),
  '__define__.KATEX_RESOURCES': JSON.stringify(katexResources),
  '__define__.WEBFONTLOADER_VERSION': JSON.stringify(
    await getVersion('webfontloader'),
  ),
  '__define__.NO_PLUGINS': 'false',
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
    '__define__.NO_PLUGINS': 'true',
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
