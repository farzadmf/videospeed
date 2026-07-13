import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.webextensions,
        chrome: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
      curly: 'error',
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'arrow-spacing': 'error',
      'no-duplicate-imports': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'no-unreachable': 'error',
      'no-useless-return': 'error',
    },
  },
  // Upstream has test-specific overrides for vitest globals (describe, it,
  // expect, beforeEach, afterEach, beforeAll, afterAll, vi) and disables
  // no-unused-expressions for test files. Enable these when our tests are
  // set up to run with a compatible test framework.
  // {
  //   files: ['tests/**/*.js'],
  //   languageOptions: {
  //     globals: {
  //       describe: 'readonly',
  //       it: 'readonly',
  //       expect: 'readonly',
  //       beforeEach: 'readonly',
  //       afterEach: 'readonly',
  //       beforeAll: 'readonly',
  //       afterAll: 'readonly',
  //       vi: 'readonly',
  //     },
  //   },
  //   rules: {
  //     'no-unused-expressions': 'off',
  //   },
  // },
  // React/TypeScript UI. The TS parser needs jsx enabled explicitly; without it
  // the parser rejects TSX with a "configured jsx" error.
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'src/assets/**', 'tests/**'],
  },
];
