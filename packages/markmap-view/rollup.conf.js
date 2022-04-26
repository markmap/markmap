const { getRollupPlugins, getRollupExternal, defaultOptions } = require('@gera2ld/plaid');
const pkg = require('./package.json');

const DIST = defaultOptions.distDir;
const BANNER = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;

const globalList = [
  'd3',
];
const external = getRollupExternal(globalList);
const bundleOptions = {
  extend: true,
  esModule: false,
};
const postcssOptions = {
  ...require('@gera2ld/plaid/config/postcssrc'),
  inject: false,
  minimize: true,
};
const rollupConfig = [
  ...[false, true].map(minimize => ({
    input: {
      input: 'src/index.ts',
      external: globalList,
      plugins: getRollupPlugins({
        minimize,
        esm: true,
        postcss: postcssOptions,
        extensions: defaultOptions.extensions,
        babelConfig: {
          rootMode: 'upward',
        },
      }),
    },
    output: {
      format: 'iife',
      file: `${DIST}/index${minimize ? '.min' : ''}.js`,
      name: 'markmap',
      globals: {
        d3: 'd3',
      },
      ...bundleOptions,
    },
  })),
  {
    input: {
      input: 'src/index.ts',
      external: globalList,
      plugins: getRollupPlugins({
        postcss: postcssOptions,
        extensions: defaultOptions.extensions,
        babelConfig: {
          rootMode: 'upward',
        },
      }),
    },
    output: {
      format: 'cjs',
      file: `${DIST}/index.cjs.js`,
      name: 'markmap',
      ...bundleOptions,
    },
  },
  {
    input: {
      input: 'src/index.ts',
      external,
      plugins: getRollupPlugins({
        esm: true,
        postcss: postcssOptions,
        extensions: defaultOptions.extensions,
        babelConfig: {
          rootMode: 'upward',
        },
      }),
    },
    output: {
      format: 'esm',
      file: `${DIST}/index.esm.js`,
      name: 'markmap',
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

module.exports = rollupConfig.map(({ input, output }) => ({
  ...input,
  output,
}));
