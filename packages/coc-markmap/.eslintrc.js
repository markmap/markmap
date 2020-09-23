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
    '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
    'import/no-cycle': 'off',
    'no-continue': 'off',
    'no-shadow': 'off',
    'object-curly-newline': 'off',
    'prefer-template': 'off',
    'import/no-extraneous-dependencies': 'off',
  },
};
