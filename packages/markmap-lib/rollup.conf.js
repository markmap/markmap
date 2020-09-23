const { terser } = require('rollup-plugin-terser');
const { getRollupPlugins, getRollupExternal, defaultOptions } = require('@gera2ld/plaid');
const pkg = require('./package.json');

const DIST = defaultOptions.distDir;
const BANNER = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;

const globalList = [
  'd3',
];
const external = getRollupExternal();
const bundleOptions = {
  extend: true,
  esModule: false,
};
const rollupConfig = [
  {
    input: {
      input: 'src/view.ts',
      external: globalList,
      plugins: getRollupPlugins({
        esm: true,
        extensions: defaultOptions.extensions,
        babelConfig: {
          root: '../..',
        },
      }),
    },
    output: {
      format: 'iife',
      file: `${DIST}/browser/view.js`,
      name: 'markmap',
      globals: {
        d3: 'd3',
      },
      ...bundleOptions,
    },
    minify: true,
  },
  {
    input: {
      input: 'src/transform.ts',
      external: globalList,
      plugins: getRollupPlugins({
        esm: true,
        extensions: defaultOptions.extensions,
        babelConfig: {
          root: '../..',
        },
      }),
    },
    output: {
      format: 'iife',
      file: `${DIST}/browser/transform.js`,
      name: 'markmap',
      ...bundleOptions,
    },
    minify: true,
  },
];
// Generate minified versions
rollupConfig.filter(({ minify }) => minify)
.forEach(config => {
  rollupConfig.push({
    input: {
      ...config.input,
      plugins: [
        ...config.input.plugins,
        terser(),
      ],
    },
    output: {
      ...config.output,
      file: config.output.file.replace(/\.js$/, '.min.js'),
    },
  });
});

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
