import { readFile } from 'fs/promises';
import { builtinModules } from 'module';
import plaid from '@gera2ld/plaid';
import { versionLoader } from '../../util.mjs';
import pkg from './package.json' assert { type: 'json' };

const { getRollupPlugins, getRollupExternal, defaultOptions } = plaid;
const getVersion = versionLoader(import.meta.url);

export default async () => {
  const DIST = defaultOptions.distDir;
  const BANNER = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;
  const TEMPLATE = await readFile('templates/markmap.html', 'utf8');

  const replaceValues = {
    'process.env.TEMPLATE': JSON.stringify(TEMPLATE),
    'process.env.LIB_VERSION': JSON.stringify(pkg.version),
    'process.env.D3_VERSION': JSON.stringify(await getVersion('d3')),
    'process.env.VIEW_VERSION': JSON.stringify(await getVersion('markmap-view')),
    'process.env.PRISM_VERSION': JSON.stringify(await getVersion('prismjs')),
    'process.env.HLJS_VERSION': JSON.stringify(await getVersion('highlight.js')),
    'process.env.KATEX_VERSION': JSON.stringify(await getVersion('katex')),
    'process.env.WEBFONTLOADER_VERSION': JSON.stringify(await getVersion('webfontloader')),
  };

  const external = getRollupExternal([
    ...builtinModules,
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.peerDependencies),
  ]);
  const bundleOptions = {
    extend: true,
    esModule: false,
  };
  const rollupConfig = [
    {
      input: 'src/index.ts',
      external,
      plugins: getRollupPlugins({
        extensions: defaultOptions.extensions,
        babelConfig: {
          rootMode: 'upward',
        },
        replaceValues,
      }),
      output: {
        format: 'cjs',
        file: `${DIST}/index.js`,
        ...bundleOptions,
      },
    },
    {
      input: 'src/index.ts',
      external,
      plugins: getRollupPlugins({
        esm: true,
        extensions: defaultOptions.extensions,
        babelConfig: {
          rootMode: 'upward',
        },
        replaceValues,
      }),
      output: {
        format: 'esm',
        file: `${DIST}/index.mjs`,
        ...bundleOptions,
      },
    },
    {
      input: 'src/index.ts',
      external,
      plugins: getRollupPlugins({
        esm: true,
        extensions: [
          '.browser.ts',
          ...defaultOptions.extensions,
        ],
        babelConfig: {
          rootMode: 'upward',
        },
        replaceValues,
      }),
      output: {
        format: 'esm',
        file: `${DIST}/browser/index.mjs`,
        name: 'markmap',
        ...bundleOptions,
      },
    },
    {
      input: 'src/index.ts',
      external: [
        'katex',
        'highlight.js',
      ],
      plugins: getRollupPlugins({
        esm: true,
        extensions: [
          '.browser.ts',
          ...defaultOptions.extensions,
        ],
        babelConfig: {
          rootMode: 'upward',
        },
        replaceValues,
      }),
      output: {
        format: 'umd',
        file: `${DIST}/browser/index.js`,
        name: 'markmap',
        globals: {
          katex: 'window.katex',
          'highlight.js': 'window.hljs',
        },
        ...bundleOptions,
      },
    },
  ];

  rollupConfig.forEach((item) => {
    item.output = {
      indent: false,
      // If set to false, circular dependencies and live bindings for external imports won't work
      externalLiveBindings: false,
      ...item.output,
      ...BANNER && {
        banner: BANNER,
      },
    };
  });

  return rollupConfig;
};
