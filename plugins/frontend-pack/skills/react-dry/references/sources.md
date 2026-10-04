# Sources

Read while writing this skill (October 2026).

## Abstraction and duplication

- Kent C. Dodds, AHA Programming - https://kentcdodds.com/blog/aha-programming (avoid hasty abstractions; wait for the pattern, ideally 3+ uses; optimize for change)
- Sandi Metz, The Wrong Abstraction - https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction ("prefer duplication over the wrong abstraction"; inline, remove unused branches, re-extract)

## React official documentation

- Reusing Logic with Custom Hooks - https://react.dev/learn/reusing-logic-with-custom-hooks (when to extract, `use` prefix only for functions that call hooks, hooks share logic not state, no lifecycle hooks, concrete high-level purpose)
- Thinking in React - https://react.dev/learn/thinking-in-react (single responsibility for components)
- Sharing State Between Components - https://react.dev/learn/sharing-state-between-components
- React 19 release - https://react.dev/blog/2024/12/05/react-19 (`<Context value>` as provider, `use(Context)`)

## Composition and component APIs

- Vercel composition patterns agent skill - https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns (no boolean props for behavior, compound components with shared context, explicit variants, children over renderX props)
- Summary of the same patterns - https://mcpservers.org/agent-skills/vercel/composition-patterns ("each boolean prop doubles the number of possible states")

## Structure and sharing

- bulletproof-react project structure - https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md (features compose at app level, shared code flows one way)
- Feature-Sliced Design, Public API - https://feature-sliced.design/docs/reference/public-api (per-module indices for shared, no wildcard re-exports)
- TkDodo, React Query as a State Manager - https://tkdodo.eu/blog/react-query-as-a-state-manager (share server data by calling the same query hook; requests are deduplicated)
