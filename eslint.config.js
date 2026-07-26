// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'valid-typeof': 'error',
    },
  },
]);
