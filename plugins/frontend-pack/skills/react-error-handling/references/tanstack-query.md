# TanStack Query error handling (v5)

## QueryClient

```ts
// src/shared/api/queryClient.ts
import { MutationCache, QueryCache, QueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isCancelled, isRetryable, isUnexpected, type ApiError } from '@/shared/api/errors'
import { getUserMessage } from '@/shared/lib/getUserMessage'

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
    queryMeta: { errorMessage?: string }
    mutationMeta: { skipGlobalErrorToast?: boolean; errorMessage?: string; invalidates?: QueryKey[] }
  }
}
// The only Register declaration in the app. `invalidates`: see react-data-fetching mutations-and-optimistic.md.

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // default 0 refetches on every mount
      retry: (failureCount, error) => failureCount < MAX_RETRIES && isRetryable(error),
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      throwOnError: (error, query) => query.state.data === undefined && isUnexpected(error),
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data === undefined || isCancelled(error)) return
      toast.error(query.meta?.errorMessage ?? getUserMessage(error))
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
      if (mutation.meta?.skipGlobalErrorToast || isCancelled(error)) return
      toast.error(mutation.meta?.errorMessage ?? getUserMessage(error))
    },
  }),
})
```

`defaultError: ApiError` is honest only because every `queryFn` goes through `http()`. If a `queryFn` can throw something else (third-party SDK, `JSON.parse`), wrap it in `ApiError`/`toError` there, or keep `defaultError` as `unknown` for that project.

## Decision table

| Situation | Behaviour |
|---|---|
| First load, 5xx / contract / bug | Retries (5xx only), then `throwOnError` -> nearest boundary |
| First load, 4xx (403, 404) | No retry, no throw. Component renders `query.error` inline or not-found UI |
| Background refetch fails, data cached | Keep stale data, toast via `QueryCache.onError` |
| Network / timeout | Retry up to 2, then inline `ErrorState` or boundary |
| Query cancelled (unmount / key change) | Nothing |
| Mutation fails, form handles it | `meta.skipGlobalErrorToast`, `onError` -> `setError` |
| Mutation fails, no special handling | Global toast from `MutationCache` |

## Inline handling of expected errors

```tsx
import { Link } from '@tanstack/react-router'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'

function OrderPage({ id }: { id: string }) {
  const { t } = useTranslation()
  const { data, error, isPending, refetch } = useQuery(orderQueries.detail(id))
  if (isPending) return <OrderSkeleton />
  if (error?.status === 404) {
    return <EmptyState title={t('orders.notFound')} action={<Link to="/orders">{t('orders.backToList')}</Link>} />
  }
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  return <OrderView order={data} />
}
```

## Suspense queries

`useSuspenseQuery` always throws errors to the boundary (no `throwOnError` option). Therefore every component using it must sit under a boundary wrapped in `QueryErrorResetBoundary` (`WidgetBoundary` does this). Handle expected 404s in the route loader (`throw notFound()`) or use `useQuery` instead.

## Mutations

```tsx
// features/orders/api/order.mutations.ts
export function useDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteOrder, // from order.api.ts
    meta: { errorMessage: 'Could not delete the order. Try again.' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderQueries.lists() }),
  })
}

// component
const deleteOrder = useDeleteOrder()
<Button onClick={() => deleteOrder.mutate(order.id)} disabled={deleteOrder.isPending}>Delete</Button>
```

- Prefer `mutate`. With `mutateAsync`, always `try { await ... } catch` - otherwise you get an unhandled rejection in addition to the global toast.
- Per-mutation `onError` in `useMutation` runs together with the `MutationCache` handler; use `meta.skipGlobalErrorToast` to avoid double messages.
- Optimistic updates: roll back in `onError` using the `onMutate` result; still let the global toast inform the user.

## Retry policy rationale

Default v5 query retry is 3 with exponential backoff, for every error. Retrying 4xx just delays a deterministic failure by ~7 seconds, so we restrict retries to transient errors (network, timeout, 408, 429, 5xx) and cap at 2. Mutations default to no retry; keep it that way unless the endpoint is idempotent (PUT with full payload, or backend idempotency key).

## Offline

`networkMode: 'online'` (default) pauses queries and mutations while offline instead of failing them. Show one global banner:

```tsx
// src/shared/hooks/useOnline.ts
import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

export const useOnline = () =>
  useSyncExternalStore(onlineManager.subscribe.bind(onlineManager), () => onlineManager.isOnline(), () => true)
```
