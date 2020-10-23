module.exports = {
  extends: require.resolve('@gera2ld/plaid/config/babelrc-base'),
  presets: [
    ['@babel/preset-typescript', {
      isTSX: true,
      allExtensions: true,
    }],
  ],
  plugins: [

    // react
    '@babel/plugin-transform-react-jsx',
  ].filter(Boolean),
};
