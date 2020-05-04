module.exports = {
  root: true,
  extends: [
    require.resolve('@gera2ld/plaid-common-ts/eslint'),
  ],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
  },
};
