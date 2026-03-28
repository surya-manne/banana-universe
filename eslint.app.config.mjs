/**
 * Shared ESLint flat config for workspace example apps (type-aware TypeScript + Prettier).
 * Each app uses a tiny eslint.config.mjs that calls createBananaAppEslintConfig(appRoot).
 */
import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

/**
 * @param {string} appRoot Absolute path to the app directory (where tsconfig.app.json lives)
 */
export function createBananaAppEslintConfig(appRoot) {
  return tseslint.config(
    { ignores: ['dist/**', 'node_modules/**'] },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: appRoot,
        },
      },
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': [
          'error',
          { checksVoidReturn: { attributes: false } },
        ],
      },
    },
    {
      files: ['**/__tests__/**/*.ts', '**/*.test.ts'],
      rules: {
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
      },
    },
    eslintConfigPrettier,
  )
}
