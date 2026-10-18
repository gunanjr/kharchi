const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  globalIgnores(['dist/*', 'android/*', 'ios/*', '.expo/*', 'node_modules/*']),
  {
    rules: {
      // React-Compiler advisory rules: the code is correct (effects sync external state); keeping them as noise-free.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/use-memo': 'off',
      // We use `cond && sideEffect()` and comma sequences deliberately in a few terse spots.
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
