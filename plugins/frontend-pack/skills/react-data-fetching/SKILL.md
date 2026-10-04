---
name: react-data-fetching
description: Mdigital rules for loading, caching and mutating server data in React 19 with TanStack Query v5, including the library whitelist and blacklist, query key factories, queryOptions in features/<feature>/api, QueryClient defaults, invalidation, optimistic updates, pagination, prefetching, cancellation, typed API errors and Zod validation. Use when writing or reviewing any code that calls a backend, reads or writes the query cache, or chooses a fetching library - "запрос к API", "загрузка данных", "кэш", "react query", "tanstack query", "инвалидация", "оптимистичное обновление", "пагинация", "fetch data", "caching", "invalidate", "useQuery", "useMutation", "prefetch", "axios", "SWR".
---

# React data fetching and caching

Server state belongs to TanStack Query. Components never own a copy of it. Every request goes
through `shared/api/http.ts`, is validated with Zod and is described once by `queryOptions` in
`features/<feature>/api/`. Libraries are checked against `rules/libraries.json`.

## 1. Libraries: whitelist and blacklist

| Status | Library / approach | Why |
|---|---|---|
| allowed | `@tanstack/react-query` v5 (+ devtools, `@tanstack/eslint-plugin-query`) | The single cache for server state: dedupe, stale-while-revalidate, retries, cancellation |
| allowed | native `fetch` wrapped in `shared/api/http.ts` | Zero deps, AbortSignal native, works in RSC and Node |
| allowed | `zod` | Validate responses at the boundary, infer types from schemas |
| allowed | `openapi-typescript` + `openapi-fetch` | When the backend has an OpenAPI spec: generated types, no hand-written DTOs |
| allowed | TanStack Router loaders, Next.js Server Components + `HydrationBoundary` | Start requests before render; no loading waterfalls |
| allowed | `msw` | Mock the network in tests and Storybook, not the hooks |
| conditional | `axios`, `ky` | Only inside `shared/api/http.ts` of a project that already uses it; ky retry off |
| conditional | `@hey-api/openapi-ts`, `orval` | Codegen allowed if it emits `queryOptions`/fetchers, not hooks with their own key scheme |
| conditional | Next.js Server Actions, React 19 `use()` | Next.js only; see section 11 |
| conditional | `@tanstack/react-query-persist-client` | Offline/PWA requirement only |
| forbidden | `fetch`/`axios` inside `useEffect` + `useState` | Race conditions, no cache, no dedupe, no cancel, double requests in StrictMode |
| forbidden | server data copied into `useState`, Zustand, Redux, Context | Second source of truth that goes stale |
| forbidden | `swr`, RTK Query, Apollo Client, urql | A second cache next to TanStack Query; one cache per app |
| forbidden | `react-query` v3, `@tanstack/react-query` v4 APIs | Removed overloads, `cacheTime`, `isLoading` semantics differ |
| forbidden | `node-fetch`, `isomorphic-fetch`, `cross-fetch`, `superagent`, `jquery.ajax` | Native fetch exists everywhere we run |
| forbidden | `setInterval` polling, `localStorage` as a data cache | Use `refetchInterval`, persistence plugin |

Before adding a network-related dependency, read `rules/libraries.json`; if unlisted, ask.

## 2. Never fetch in useEffect

```tsx
// BAD: races, no cache, no cancel, duplicated in every component that needs it
const [user, setUser] = useState<User | null>(null);
useEffect(() => { fetch(`/api/users/${id}`).then(r => r.json()).then(setUser); }, [id]);

// GOOD
const { data: user } = useQuery(userQueries.detail(id));
```

## 3. Never copy server data into local state

```tsx
// BAD: stops updating after refetch or invalidation
const { data } = useQuery(userQueries.detail(id));
const [name, setName] = useState(data?.name ?? '');

// GOOD: derive during render; forms get it via RHF `values`/`defaultValues` on mount
const { data } = useQuery(userQueries.detail(id));
const fullName = data ? `${data.firstName} ${data.lastName}` : '';
```

Zustand/Context hold client state only (UI flags, selected ids). Filters go in the URL and the key.

## 4. File layout inside a feature

```
src/shared/api/http.ts          http() wrapper (ApiError + guards in errors.ts)
src/shared/api/queryClient.ts   the one QueryClient with team defaults
src/features/orders/api/
  order.schemas.ts              Zod schemas + z.infer types
  order.api.ts                  fetchers: (args, signal) => Promise<T>, no React
  order.queries.ts              key factory + queryOptions / infiniteQueryOptions
  order.mutations.ts            useCreateOrder, useUpdateOrder ... (with invalidation)
src/features/orders/index.ts    exports queries, mutations and types; never fetchers' internals
```

Other features and pages import `orderQueries` / `useCreateOrder` from the feature's public `index.ts`;
files inside the feature import relatively (never their own `index.ts`). Never call `http()` or
write a `queryKey` literal inside a component.

## 5. Query key factory + queryOptions

```ts
// features/orders/api/order.queries.ts
export const orderQueries = {
  all: () => ['orders'] as const,
  lists: () => [...orderQueries.all(), 'list'] as const,
  list: (filters: OrderFilters) =>
    queryOptions({
      queryKey: [...orderQueries.lists(), filters] as const,
      queryFn: ({ signal }) => getOrders(filters, signal),
    }),
  details: () => [...orderQueries.all(), 'detail'] as const,
  detail: (id: string) =>
    queryOptions({
      queryKey: [...orderQueries.details(), id] as const,
      queryFn: ({ signal }) => getOrder(id, signal),
      staleTime: 60_000,
    }),
};
```

Rules: keys are arrays, hierarchical from generic to specific, first segment is the feature
name; every variable the `queryFn` reads is in the key; objects in keys are plain and
serializable. Reuse the same `queryOptions` for `useQuery`, `useSuspenseQuery`, `prefetchQuery`,
`ensureQueryData`, `getQueryData`, `setQueryData`. Details: `references/query-keys.md`.

## 6. HTTP client, typed errors, Zod at the boundary

```ts
// features/orders/api/order.api.ts
export const getOrder = (id: string, signal?: AbortSignal) =>
  http(`/orders/${id}`, { schema: orderSchema, signal });
```

`http()` throws `ApiError` with a `kind` (`network | timeout | aborted | http | validation |
contract`; `error.status` for HTTP) and parses JSON with the given Zod schema. Timeouts use
`AbortSignal.timeout`; the `signal` is always passed through and an aborted request becomes kind
`'aborted'`. Never `return res.json() as Order`. Narrow with `isApiError(error)`; never `any`.
ApiError and `http()` are owned by `react-error-handling` ([api-errors.md](../react-error-handling/references/api-errors.md));
summary here: `references/http-client.md`.

## 7. QueryClient defaults

```ts
// src/shared/api/queryClient.ts (abridged)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,                                         // default 0 refetches on every mount
      retry: (count, error) => count < 2 && isRetryable(error),  // network, timeout, 408, 429, 5xx
      throwOnError: (error, query) => query.state.data === undefined && isUnexpected(error),
    },
    mutations: { retry: false },
  },
  queryCache: new QueryCache({ onError: toastIfDataCached }),        // toast only when stale data is on screen
  mutationCache: new MutationCache({ onError: toastUnlessSkipped }), // global toast unless meta.skipGlobalErrorToast
});
```

Full code: `react-error-handling` [tanstack-query.md](../react-error-handling/references/tanstack-query.md).
Keep `gcTime` (5 min) and `refetchOnWindowFocus` defaults. Override `staleTime` per query
(`Infinity` for reference data, `0` for live data) instead of disabling refetching globally.
Create the client once (module scope in Vite, `src/shared/api/getQueryClient.ts` in Next.js), never per render.

## 8. Mutations and invalidation

```ts
// features/orders/api/order.mutations.ts
export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOrder,
    onSuccess: (order) => {
      queryClient.setQueryData(orderQueries.detail(order.id).queryKey, order);
      return queryClient.invalidateQueries({ queryKey: orderQueries.lists() });
    },
  });
}
```

- Invalidate the narrowest prefix that covers every affected view (`lists()`, not `all()`,
  unless the detail also changed in ways the response does not show).
- Return the invalidation promise when the UI must stay pending until fresh data arrives.
- If the response contains the updated entity, write it with `setQueryData`; never hand-edit
  lists you cannot reproduce exactly (sorting, paging) - invalidate them.
- Mutations that affect other features invalidate those features' keys via their exported
  factories, never via string literals.
- Cache logic lives in the hook; components pass UI-only callbacks to `mutate` (close, navigate).

## 9. Optimistic updates

Only for frequent, low-risk actions (toggle, like, reorder). Prefer the UI variant (render
`variables` while `isPending`). Cache variant: `cancelQueries` -> snapshot -> `setQueryData` ->
rollback in `onError` -> invalidate in `onSettled`. See `references/mutations-and-optimistic.md`.

## 10. Lists, pagination, dependent and parallel queries

```ts
// paginated table: keep showing the previous page while the next loads
useQuery({ ...orderQueries.list({ page, status }), placeholderData: keepPreviousData });

// infinite feed - in the factory: orderQueries.infinite(filters)
infinite: (filters: OrderFilters) =>
  infiniteQueryOptions({
    queryKey: [...orderQueries.lists(), 'infinite', filters] as const,
    queryFn: ({ pageParam, signal }) => getOrdersPage({ ...filters, cursor: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  }),

// dependent - in the factory: skipToken keeps types correct (no `enabled` + `id!`)
detail: (id: string | undefined) =>
  queryOptions({
    queryKey: [...userQueries.details(), id] as const,
    queryFn: id ? ({ signal }) => getUser(id, signal) : skipToken,
  }),
```

Parallel: several `useQuery` calls run in parallel; several `useSuspenseQuery` calls in one
component run in sequence - use `useSuspenseQueries` or prefetch in the loader. Use `select` to
derive a slice (a module-level `select` function, or rely on React Compiler).

## 11. Prefetching and frameworks

- Vite + TanStack Router: put `queryClient` in router context, `loader: ({ context }) =>
  context.queryClient.ensureQueryData(orderQueries.detail(params.id))`, read with
  `useSuspenseQuery` in the component. Set `defaultPreload: 'intent'` and
  `defaultPreloadStaleTime: 0` so Query, not the router, decides freshness.
- Hover/focus prefetch: `onMouseEnter={() => queryClient.prefetchQuery(orderQueries.detail(id))}`.
- Next.js App Router: prefetch in a Server Component, wrap the client subtree in
  `<HydrationBoundary state={dehydrate(queryClient)}>`. Display-only data may be fetched
  directly in a Server Component without Query; do not render the same data both ways.
  Server Actions are allowed for mutations; after them call `queryClient.invalidateQueries` on
  the client (and `revalidatePath`/`revalidateTag` on the server if RSC shows the data).
  `use(promise)` only for promises created in a Server Component and passed down, never for a
  promise created during render. Details: `references/nextjs.md`.

## 12. Cancellation and races

Always forward `signal` from the `queryFn` context to `http()`; Query aborts it when the key
changes or nobody observes the query. Debounce the search term and put the debounced value in the key.

## 13. Loading and error states (wiring only)

```tsx
const { data, isPending, isError, error, refetch } = useQuery(orderQueries.list(filters));
if (isPending) return <OrdersTableSkeleton />;
if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
return <OrdersTable orders={data} />;
```

Use `isPending` for "no data yet", `isFetching` for background refresh indicators. With
`useSuspenseQuery`, put `<Suspense>` + error boundary (`QueryErrorResetBoundary`) around the
route section. Visuals are defined by `react-ux`; error boundaries by `react-error-handling`.

## 14. Testing

MSW handlers per feature, a fresh `QueryClient` per test with `retry: false`, render inside a
`QueryClientProvider` wrapper. Never mock `useQuery`. See `references/testing.md`.

## Checklist before finishing

- [ ] No `useEffect` that fetches; no server data in `useState`/Zustand/Redux/Context
- [ ] Every new library is `allowed` in `rules/libraries.json` (or the user approved it)
- [ ] Fetchers live in `features/<f>/api/*.api.ts`, call `http()`, forward `signal`, parse with Zod
- [ ] Every query uses the feature's key factory + `queryOptions`; no inline key literals
- [ ] Every variable used by `queryFn` is in the `queryKey`
- [ ] Each mutation invalidates or updates every affected key (including other features)
- [ ] Optimistic updates have rollback and `onSettled` invalidation
- [ ] `staleTime` chosen deliberately for the data; retries skip 4xx
- [ ] Pending, error and empty states are handled; `isPending` vs `isFetching` used correctly
- [ ] Route-level data is prefetched in the loader / Server Component, not fetched after mount
- [ ] `@tanstack/eslint-plugin-query` passes; tests use MSW, not hook mocks
