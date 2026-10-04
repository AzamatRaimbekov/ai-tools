# ESLint configuration enforcing the architecture

ESLint 9 flat config. Add or merge into the project's `eslint.config.js`. Adjust paths if the project uses Next.js (`src/app` is the routing layer there, there is no `src/pages`).

## Packages

```bash
npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react eslint-plugin-react-hooks \
  eslint-plugin-import-x eslint-import-resolver-typescript
```

Next.js projects already get `eslint-plugin-react`, `react-hooks`, and import rules via `eslint-config-next`; add only the Mdigital-specific rules below on top.

## Config

```js
// eslint.config.js
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', '.next', 'src/routeTree.gen.ts']),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked, // type-aware: needs the parserOptions below
  reactHooks.configs.flat.recommended, // rules-of-hooks, exhaustive-deps, compiler rules (purity, refs, immutability, set-state-in-effect, static-components)

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  { files: ['**/*.{js,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked] },

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { react, 'import-x': importX },
    settings: {
      react: { version: 'detect' },
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    rules: {
      // Errors must be handled (react-error-handling); no console as a reporting channel
      '@typescript-eslint/no-floating-promises': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Layering: shared -> features -> pages/routes -> app
      'import-x/no-restricted-paths': ['error', {
        zones: [
          {
            target: './src/shared',
            from: ['./src/features', './src/pages', './src/routes', './src/app'],
            message: 'shared/ must not depend on features, pages, routes, or app.',
          },
          {
            target: './src/features',
            from: ['./src/pages', './src/routes', './src/app'],
            message: 'features/ must not depend on pages, routes, or app.',
          },
        ],
      }],
      'import-x/no-cycle': ['error', { maxDepth: 10 }],

      // Feature public API: only @/features/<name>, never deep paths
      'no-restricted-imports': ['error', {
        patterns: [
          {
            regex: '^@/features/[^/]+/.+',
            message: 'Import features only through their public API: @/features/<name>. Inside a feature use relative imports.',
          },
          {
            regex: '^@/shared/(ui|components|hooks|lib|api|config)$',
            message: 'shared/ has no barrel files. Import the concrete module, e.g. @/shared/ui/button.',
          },
        ],
      }],

      // One component per file
      'react/no-multi-comp': ['error', { ignoreStateless: false }],

      // Naming and API hygiene
      'react/jsx-pascal-case': 'error',
      'react/no-unstable-nested-components': 'error',
      'react/jsx-no-useless-fragment': 'warn',
      'react/function-component-definition': ['error', {
        namedComponents: 'function-declaration',
        unnamedComponents: 'arrow-function',
      }],
    },
  },

  // 150-line limit for component files (shadcn primitives, tests and stories exempt)
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/shared/ui/**', 'src/components/ui/**', 'src/**/*.test.tsx', 'src/**/*.stories.tsx'],
    rules: {
      'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', 4],
      'complexity': ['warn', 12],
    },
  },

  // Hooks and utils: keep them small too
  {
    files: ['src/**/*.ts'],
    ignores: ['src/routeTree.gen.ts', 'src/**/*.d.ts'],
    rules: {
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },

  // Framework files that require default exports
  {
    files: ['src/app/**/{page,layout,loading,error,not-found,template,default}.tsx'],
    rules: { 'import-x/no-default-export': 'off' },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/app/**/{page,layout,loading,error,not-found,template,default}.tsx'],
    rules: { 'import-x/no-default-export': 'error' },
  },
]);
```

## Notes

- `strictTypeChecked` needs type information (`projectService`), which makes linting slower but enables `no-floating-promises`, `no-misused-promises` and the unsafe-`any` rules. `src/components/ui/**` covers a default shadcn layout; the Mdigital layout uses `src/shared/ui/**`.

- Legacy violations can be baselined with ESLint bulk suppressions (`eslint --suppress-all`, ESLint ≥9.24) so new ones still fail.
- `max-lines` counts every physical line, matching the team rule "a component file must not exceed 150 lines". Do not switch `skipBlankLines` on to sneak past the limit.
- `react-hooks` v6+ ships the React Compiler diagnostics (`purity`, `refs`, `immutability`, `set-state-in-effect`, `static-components`, `preserve-manual-memoization`) inside `recommended`. Treat them as errors: they catch exactly the purity violations that silently disable the compiler.
- The default-export exemption lists the common Next.js file conventions; extend it with any others the project uses (`global-error`, `opengraph-image`, `icon`, `sitemap`, `robots`).
- `react/no-multi-comp` with `ignoreStateless: false` flags any second component in a file, including small function components.
- The `no-restricted-paths` zones with a path that does not exist (e.g. `src/pages` in a Next.js project) are harmless; remove them for clarity.
- Cross-feature imports are allowed only through the public API. If the team wants strict feature isolation (features never import each other, as in bulletproof-react), add one zone per feature:
  `{ target: './src/features/orders', from: './src/features', except: ['./orders'] }`.
- For FSD-style or more expressive rules, `eslint-plugin-boundaries` is an alternative; this config uses only core ESLint plus `import-x` to keep the dependency surface small.

## Running

```bash
npx eslint . --max-warnings 0
```

Add to CI and to a pre-commit hook (lint-staged) so oversized files cannot be merged.
