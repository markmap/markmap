const { getRollupPlugins, getRollupExternal } = require('@gera2ld/plaid');
const pkg = require('./package.json');

const DIST = 'dist';
const FILENAME = 'index';
const BANNER = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;

const external = [
  ...require('module').builtinModules,
  'coc.nvim',
  'markmap-cli',
  'vscode-languageserver-types',
];
const rollupConfig = [
  {
    input: {
      input: 'src/index.ts',
      plugins: getRollupPlugins({
        babelConfig: {
          root: '../..',
        },
      }),
      external,
    },
    output: {
      format: 'cjs',
      file: `${DIST}/${FILENAME}.common.js`,
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
