module.exports = {
  root: true,
  extends: [
    require.resolve('@gera2ld/plaid-common-ts/eslint'),
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
};
