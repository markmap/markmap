module.exports = {
  extends: require.resolve('@gera2ld/plaid/config/babelrc-base'),
  presets: [
    '@babel/preset-typescript',
  ],
  plugins: [
    ['@babel/plugin-proposal-object-rest-spread', { loose: true, useBuiltIns: true }],
    ['module-resolver', {
      alias: {
        '#': './src',
      },
    }],
  ].filter(Boolean),
};
