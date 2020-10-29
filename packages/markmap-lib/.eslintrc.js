module.exports = {
  root: true,
  extends: [
    require.resolve('@gera2ld/plaid-common-ts/eslint'),
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    '@typescript-eslint/indent': ['error', 2, {
      ignoredNodes: ['TSTypeParameterInstantiation']
    }],
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/no-shadow': 'off',
    'import/no-cycle': 'off',
    'import/no-extraneous-dependencies': 'off',
    'no-continue': 'off',
    'object-curly-newline': 'off',
    'prefer-template': 'off',
  },
};
