import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'dist-viewer', 'release']),
  {
    files: ['**/*.{ts,tsx,cts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
      }],
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
      'no-irregular-whitespace': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: ['src/viewer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/HomePage', '**/HomePage.tsx'],
            message: 'HomePage is desktop-shell UI; the web viewer must not import it.',
          },
          {
            group: ['**/electronApi', '**/electronApi.ts'],
            message: 'electronApi is the Electron bridge; the web viewer must not import it.',
          },
          {
            group: ['**/electron/*', '*electron*'],
            message: 'Electron main/preload modules must not be imported by the web viewer.',
          },
        ],
      }],
    },
  },
  {
    files: ['electron/**/*.cts', 'test/**/*.cts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])
