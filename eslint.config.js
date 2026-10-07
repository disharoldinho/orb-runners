// ESLint flat config (ESLint 10, typescript-eslint, React hooks).
// Lints the game client (src/) and the Node game server (server/). Formatting is left to
// Prettier (eslint-config-prettier turns off stylistic rules that would fight it).
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default defineConfig(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.tmp/**'],
  },

  // Browser client: TypeScript + React
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // The classic hooks rules only. The plugin's newer React Compiler rules (refs, purity,
      // immutability, ...) flag the mutable-ref patterns @react-three/fiber code relies on.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },

  // Node game server
  {
    files: ['server/**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },

  // Style-only findings in existing code (dead `let` locals, overwritten initial values):
  // reported, but not CI-blocking. Tighten to 'error' once they are cleaned up.
  {
    rules: {
      'prefer-const': 'warn',
      'no-useless-assignment': 'warn',
    },
  },

  prettier
);
