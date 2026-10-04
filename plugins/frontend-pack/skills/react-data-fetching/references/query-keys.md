# Query keys and queryOptions

## Why a factory

Keys are the cache address and the dependency list of the query function. Hand-typed keys drift
(`['order', id]` vs `['orders', id]`) and silently break invalidation. One factory per feature
gives: a single place to change, prefix-based invalidation, and full type inference for
`getQueryData`/`setQueryData` (keys produced by `queryOptions` carry the data type).

## Shape

```ts
// features/orders/api/order.queries.ts
import { queryOptions, infiniteQueryOptions, skipToken } from '@tanstack/react-query';

export const orderQueries = {
  all: () => ['orders'] as const,

  lists: () => [...orderQueries.all(), 'list'] as const,
  list: (filters: OrderFilters) =>
    queryOptions({
      queryKey: [...orderQueries.lists(), filters] as const,
      queryFn: ({ signal }) => getOrders(filters, signal),
    }),
  infinite: (filters: OrderFilters) =>
    infiniteQueryOptions({
      queryKey: [...orderQueries.lists(), 'infinite', filters] as const,
      queryFn: ({ pageParam, signal }) => getOrdersPage({ ...filters, cursor: pageParam }, signal),
      initialPageParam: null as string | null,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    }),

  details: () => [...orderQueries.all(), 'detail'] as const,
  detail: (id: string | undefined) =>
    queryOptions({
      queryKey: [...orderQueries.details(), id] as const,
      queryFn: id ? ({ signal }) => getOrder(id, signal) : skipToken,
      staleTime: 60_000,
    }),
};
```

## Rules

1. First segment = feature name in plural (`'orders'`). Must be unique across features.
2. Hierarchy generic -> specific: `all > lists > list(filters)`, `all > details > detail(id)`.
3. Every value the `queryFn` reads (ids, filters, page, locale, tenant) is in the key. The
   `@tanstack/eslint-plugin-query` rule `exhaustive-deps` enforces this.
4. Filters go in as one object at the end; Query hashes objects deterministically, key order
   inside the object does not matter. No functions, class instances or Dates - use ISO strings.
5. Do not put `undefined` filters in through optional chaining shortcuts that change shape; pass a
   normalized filters object.
6. Per-query options that are part of the data contract (`staleTime`, `select` for a stable shape)
   go in the factory; view-specific options (`placeholderData`, `enabled`, `select` for one
   component) are spread at the call site:
   ```ts
   useQuery({ ...orderQueries.list(filters), placeholderData: keepPreviousData });
   ```
7. Other features and pages import the factory from the feature's `index.ts`; files inside the
   feature import it relatively (never their own `index.ts`). Another feature invalidates via that
   factory, never a literal.

## Invalidation by prefix

```ts
queryClient.invalidateQueries({ queryKey: orderQueries.all() });      // everything about orders
queryClient.invalidateQueries({ queryKey: orderQueries.lists() });    // all lists, any filters
queryClient.invalidateQueries({ queryKey: orderQueries.detail(id).queryKey, exact: true });
```

`invalidateQueries` marks matches stale and refetches only the active ones; inactive ones refetch
when used again. Use `removeQueries` only on logout/tenant switch (or `queryClient.clear()`).

## Reading/writing the cache with types

```ts
const order = queryClient.getQueryData(orderQueries.detail(id).queryKey); // Order | undefined
queryClient.setQueryData(orderQueries.detail(id).queryKey, (old) => old && { ...old, status: 'paid' });
```

Always use the updater form and return a new object; never mutate `old`.

## Seeding details from lists

Show the row from an already-loaded list while the detail request runs:

```ts
const queryClient = useQueryClient();
const { data } = useQuery({
  ...orderQueries.detail(id),
  placeholderData: () =>
    queryClient
      .getQueriesData<Order[]>({ queryKey: orderQueries.lists() })
      .flatMap(([, orders]) => orders ?? [])
      .find((o) => o.id === id),
});
```

Prefer `placeholderData` over `initialData` here: placeholder data is never cached as fresh, so
the real fetch still runs and the list item (which may have fewer fields) is replaced.

## staleTime guide

| Data | staleTime |
|---|---|
| Reference data (countries, enums, feature flags per session) | `Infinity` |
| Normal CRUD entities | 30 s - 5 min |
| Dashboards, statuses that change often | `0` + `refetchInterval` if live |
| Current user / permissions | 5 min, invalidate on login/logout |

`gcTime` must be >= `staleTime` for the staleTime to matter after unmount; default 5 min is fine
unless `staleTime` is longer.
