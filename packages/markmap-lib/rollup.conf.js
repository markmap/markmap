const fs = require('fs');
const { getRollupPlugins, getRollupExternal, defaultOptions } = require('@gera2ld/plaid');
const viewVersion = require('markmap-view/package.json').version;
const d3Version = require('d3/package.json').version;
const prismVersion = require('prismjs/package.json').version;
const pkg = require('./package.json');

const DIST = defaultOptions.distDir;
const BANNER = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;
const TEMPLATE = fs.readFileSync('templates/markmap.html', 'utf8');

const replaceValues = {
  'process.env.D3_VERSION': JSON.stringify(d3Version),
  'process.env.VIEW_VERSION': JSON.stringify(viewVersion),
  'process.env.TEMPLATE': JSON.stringify(TEMPLATE),
  'process.env.PRISM_VERSION': JSON.stringify(prismVersion),
};

const external = getRollupExternal([
  ...require('module').builtinModules,
  ...Object.keys(pkg.dependencies),
]);
const bundleOptions = {
  extend: true,
  esModule: false,
};
const rollupConfig = [
  {
    input: {
      input: 'src/index.ts',
      external,
      plugins: getRollupPlugins({
        extensions: defaultOptions.extensions,
        babelConfig: {
          root: '../..',
        },
        replaceValues,
      }),
    },
    output: {
      format: 'cjs',
      file: `${DIST}/index.js`,
      ...bundleOptions,
    },
  },
  {
    input: {
      input: 'src/index.ts',
      external,
      plugins: getRollupPlugins({
        esm: true,
        extensions: defaultOptions.extensions,
        babelConfig: {
          root: '../..',
        },
        replaceValues,
      }),
    },
    output: {
      format: 'esm',
      file: `${DIST}/index.esm.js`,
      ...bundleOptions,
    },
  },
  ...[false, true].map(minimize => ({
    input: {
      input: 'src/index.ts',
      external: [
        'katex',
      ],
      plugins: getRollupPlugins({
        minimize,
        esm: true,
        extensions: [
          '.browser.ts',
          ...defaultOptions.extensions,
        ],
        babelConfig: {
          root: '../..',
        },
        replaceValues,
      }),
    },
    output: {
      format: 'umd',
      file: `${DIST}/browser/index${minimize ? '.min' : ''}.js`,
      name: 'markmap',
      globals: {
        katex: 'window.katex',
      },
      ...bundleOptions,
    },
  })),
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

module.exports = rollupConfig.map(({ input, output }) => ({
  ...input,
  output,
}));
