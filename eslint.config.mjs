import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/*.d.ts'],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // projectService resolve o tsconfig mais proximo de cada arquivo, o que e o que faz
        // uma unica config na raiz atender apps com tsconfigs diferentes.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    // arquivo de configuracao nao pertence a nenhum tsconfig e nao precisa de regra com tipos
    files: ['**/*.mjs', '**/*.mts', '**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
);
