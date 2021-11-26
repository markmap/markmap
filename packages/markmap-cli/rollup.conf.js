const { getRollupPlugins, defaultOptions } = require('@gera2ld/plaid');
const pkg = require('./package.json');

const DIST = defaultOptions.distDir;
const BANNER = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;
const TOOLBAR_VERSION = require('markmap-toolbar/package.json').version;

const replaceValues = {
  'process.env.TOOLBAR_VERSION': JSON.stringify(TOOLBAR_VERSION),
};

// Bundle @babel/runtime to avoid requiring esm version in the output
const external = [
  ...require('module').builtinModules,
  ...Object.keys(pkg.dependencies),
];
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
        esm: true,
        extensions: defaultOptions.extensions,
        babelConfig: {
          rootMode: 'upward',
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
