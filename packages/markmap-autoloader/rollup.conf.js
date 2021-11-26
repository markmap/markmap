const { getRollupPlugins, getRollupExternal, defaultOptions } = require('@gera2ld/plaid');
const viewVersion = require('markmap-view/package.json').version;
const libVersion = require('markmap-lib/package.json').version;
const d3Version = require('d3/package.json').version;
const pkg = require('./package.json');

const DIST = defaultOptions.distDir;
const BANNER = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;

const replaceValues = {
  'process.env.D3_VERSION': JSON.stringify(d3Version),
  'process.env.LIB_VERSION': JSON.stringify(libVersion),
  'process.env.VIEW_VERSION': JSON.stringify(viewVersion),
};

const globalList = [
];
const external = getRollupExternal(globalList);
const bundleOptions = {
  extend: true,
  esModule: false,
};
const rollupConfig = [
  ...[false, true].map(minimize => ({
    input: {
      input: 'src/index.ts',
      external: globalList,
      plugins: getRollupPlugins({
        minimize,
        esm: true,
        extensions: defaultOptions.extensions,
        babelConfig: {
          rootMode: 'upward',
        },
        replaceValues,
      }),
    },
    output: {
      format: 'iife',
      file: `${DIST}/index${minimize ? '.min' : ''}.js`,
      name: 'markmap.autoLoader',
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
