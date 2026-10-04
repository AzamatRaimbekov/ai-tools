# Sources

Read while writing this skill (October 2026).

## React official documentation

- Thinking in React - https://react.dev/learn/thinking-in-react (component hierarchy by single responsibility, minimal state, where state lives)
- Rules of React - https://react.dev/reference/rules (purity, React calls components and hooks, Rules of Hooks)
- Keeping Components Pure - https://react.dev/learn/keeping-components-pure
- You Might Not Need an Effect - https://react.dev/learn/you-might-not-need-an-effect
- Choosing the State Structure - https://react.dev/learn/choosing-the-state-structure
- Sharing State Between Components - https://react.dev/learn/sharing-state-between-components
- Reusing Logic with Custom Hooks - https://react.dev/learn/reusing-logic-with-custom-hooks (naming, no lifecycle hooks, useEffectEvent)
- React Compiler introduction - https://react.dev/learn/react-compiler/introduction (new code relies on compiler; keep existing memoization; useMemo/useCallback as escape hatch)
- React 19 release - https://react.dev/blog/2024/12/05/react-19 (Actions, useActionState, useOptimistic, use, ref as prop, Context as provider, metadata)
- eslint-plugin-react-hooks reference - https://react.dev/reference/eslint-plugin-react-hooks
- eslint-plugin-react-hooks README - https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/README.md (flat config `configs.flat.recommended`)

## Architecture

- bulletproof-react project structure - https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md (feature folders, unidirectional shared -> features -> app, no cross-feature imports)
- bulletproof-react ESLint config - https://github.com/alan2207/bulletproof-react/blob/master/apps/react-vite/.eslintrc.cjs (import/no-restricted-paths zones, import/no-cycle)
- Feature-Sliced Design, Public API - https://feature-sliced.design/docs/reference/public-api (explicit re-exports, no `export *`, no barrel for shared, relative imports inside a slice)
- TkDodo, Please Stop Using Barrel Files - https://tkdodo.eu/blog/please-stop-using-barrel-files (circular imports, dev performance; barrels only as package entry points)
- TkDodo, React Query as a State Manager - https://tkdodo.eu/blog/react-query-as-a-state-manager (server state stays in the query cache)
- Next.js project structure - https://nextjs.org/docs/app/getting-started/project-structure (src folder, colocation, private folders, keeping app/ for routing)

## Tooling

- ESLint max-lines - https://eslint.org/docs/latest/rules/max-lines
- ESLint no-restricted-imports - https://eslint.org/docs/latest/rules/no-restricted-imports
- eslint-plugin-import-x - https://github.com/un-ts/eslint-plugin-import-x (no-cycle, no-restricted-paths, resolver-next)
- eslint-plugin-react no-multi-comp - https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-multi-comp.md
- eslint-plugin-boundaries - https://github.com/javierbrea/eslint-plugin-boundaries (alternative for layer rules)
