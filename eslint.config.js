import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Pre-existing violations when `npm run lint` was introduced. They are
      // reported as warnings so the gate passes today; tighten back to
      // 'error' as each count reaches zero.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'prefer-const': 'warn',
      'no-prototype-builtins': 'warn',
      'no-dupe-else-if': 'warn',
      // Diagnostics go through YGOPlayerLogger so they reach YGOConfig.onError.
      'no-console': 'error',
    },
  },
  {
    files: ['src/YGOPlayer/core/YGOPlayerLogger.ts', '**/*.test.{ts,tsx}'],
    rules: { 'no-console': 'off' },
  },
  {
    // core/ is the engine side of the player; it must not depend on the React
    // UI. Shared types and pure helpers live in domain/.
    files: ['src/YGOPlayer/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ui', '**/ui/**'],
              message: 'core/ must not import from ui/. Move shared types/helpers to domain/.',
            },
          ],
        },
      ],
    },
  },
)
