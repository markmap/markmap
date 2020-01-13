const babel = require('rollup-plugin-babel');
const replace = require('@rollup/plugin-replace');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const alias = require('@rollup/plugin-alias');
const pkg = require('../package.json');

const values = {
  'process.env.VERSION': pkg.version,
};
const extensions = ['.ts', '.tsx', '.js'];

const rollupPluginMap = {
  alias: aliases => alias(aliases),
  babel: ({ babelConfig, esm }) => babel({
    // import helpers from '@babel/runtime'
    runtimeHelpers: true,
    plugins: [
      ['@babel/plugin-transform-runtime', {
        useESModules: esm,
        version: '^7.5.0', // see https://github.com/babel/babel/issues/10261#issuecomment-514687857
      }],
    ],
    exclude: 'node_modules/**',
    extensions,
    ...babelConfig,
  }),
  replace: () => replace({ values }),
  resolve: () => resolve({ extensions }),
  commonjs: () => commonjs(),
};

function getRollupPlugins({ babelConfig, esm, aliases } = {}) {
  return [
    aliases && rollupPluginMap.alias(aliases),
    rollupPluginMap.babel({ babelConfig, esm }),
    rollupPluginMap.replace(),
    rollupPluginMap.resolve(),
    rollupPluginMap.commonjs(),
  ].filter(Boolean);
}

function getExternal(externals = []) {
  return id => {
    if (/^@babel\/runtime[-/]/.test(id)) return true;
    return externals.some(pattern => {
      if (pattern && typeof pattern.test === 'function') return pattern.test(id);
      return id === pattern || id.startsWith(pattern + '/');
    });
  };
}

exports.getRollupPlugins = getRollupPlugins;
exports.getExternal = getExternal;
exports.DIST = 'dist';
