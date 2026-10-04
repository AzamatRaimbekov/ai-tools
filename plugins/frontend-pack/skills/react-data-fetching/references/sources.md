# Sources

Checked 2026-10. Latest `@tanstack/react-query` at time of writing: 5.101.x (June 2026).

## TanStack Query v5 (official docs)
- Important defaults (staleTime 0, gcTime 5 min, 3 retries with exponential backoff, refetch on focus, structural sharing): https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
- Query keys: https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
- Query options (`queryOptions`): https://tanstack.com/query/latest/docs/framework/react/guides/query-options
- Query invalidation: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
- Invalidation from mutations / updates from responses: https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations
- Optimistic updates (UI and cache variants): https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- Query cancellation (AbortSignal in queryFn): https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation
- Dependent queries / `skipToken`: https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries
- Paginated queries (`placeholderData: keepPreviousData`): https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries
- Infinite queries: https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries
- Prefetching and router integration: https://tanstack.com/query/latest/docs/framework/react/guides/prefetching
- Suspense: https://tanstack.com/query/latest/docs/framework/react/guides/suspense
- Advanced SSR (Next.js App Router, HydrationBoundary, streaming pending queries): https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
- TypeScript (Register defaultError, meta typing): https://tanstack.com/query/latest/docs/framework/react/typescript
- ESLint plugin: https://tanstack.com/query/latest/docs/eslint/eslint-plugin-query
- Testing: https://tanstack.com/query/latest/docs/framework/react/guides/testing

## TkDodo (TanStack Query maintainer) - Practical React Query series
- Series index: https://tkdodo.eu/blog/practical-react-query
- Effective React Query Keys (key factories): https://tkdodo.eu/blog/effective-react-query-keys
- The Query Options API (colocate key + fn, 2024): https://tkdodo.eu/blog/the-query-options-api
- React Query Error Handling (throwOnError, QueryCache onError, toasts only for background errors): https://tkdodo.eu/blog/react-query-error-handling
- Mastering Mutations: https://tkdodo.eu/blog/mastering-mutations-in-react-query
- Concurrent Optimistic Updates: https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query
- Automatic Query Invalidation after Mutations (MutationCache + meta): https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations
- Don't over useState (no server data copies): https://tkdodo.eu/blog/dont-over-use-state
- Type-safe React Query / Zod validation: https://tkdodo.eu/blog/type-safe-react-query
- React Query meets React Router (loaders): https://tkdodo.eu/blog/react-query-meets-react-router
- Testing React Query (MSW, fresh client, retry false): https://tkdodo.eu/blog/testing-react-query

## React
- You Might Not Need an Effect - fetching data, race conditions: https://react.dev/learn/you-might-not-need-an-effect#fetching-data
- `use` API: https://react.dev/reference/react/use
- Actions / `useActionState`: https://react.dev/reference/react/useActionState

## Routers / frameworks
- TanStack Router external data loading (ensureQueryData in loaders, defaultPreloadStaleTime: 0): https://tanstack.com/router/latest/docs/framework/react/guide/external-data-loading
- Next.js data fetching: https://nextjs.org/docs/app/getting-started/fetching-data
- Next.js caching / Cache Components (`'use cache'`, Next.js 16 dynamic by default): https://nextjs.org/docs/app/getting-started/cache-components

## HTTP, validation, codegen, testing
- Zod: https://zod.dev
- openapi-typescript / openapi-fetch: https://openapi-ts.dev
- Hey API (`@hey-api/openapi-ts`, TanStack Query and Zod plugins): https://heyapi.dev
- Orval: https://orval.dev
- Comparison orval vs openapi-typescript vs kubb (2026): https://www.pkgpulse.com/guides/orval-vs-openapi-typescript-vs-kubb-openapi-client-2026
- MSW: https://mswjs.io
- ky: https://github.com/sindresorhus/ky
- Axios cancellation via AbortSignal: https://axios-http.com/docs/cancellation

## Alternatives evaluated and rejected as second caches
- SWR: https://swr.vercel.app - smaller API, no first-class mutations/optimistic rollback, no devtools parity; a second cache next to Query.
- RTK Query: https://redux-toolkit.js.org/rtk-query/overview - requires Redux store; we do not use Redux.
- Apollo Client / urql: GraphQL normalized caches; if a GraphQL backend appears, use TanStack Query with a typed GraphQL document client instead.
- TanStack Query comparison table: https://tanstack.com/query/latest/docs/framework/react/comparison
