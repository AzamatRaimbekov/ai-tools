# Async states: details and code

## Shared components

### `src/shared/components/Delayed.tsx`

Hides a fallback for the first `ms` so fast responses never flash a loader.

```tsx
import { useEffect, useState, type ReactNode } from 'react'

type DelayedProps = { children: ReactNode; ms?: number }

export function Delayed({ children, ms = 250 }: DelayedProps) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), ms)
    return () => clearTimeout(id)
  }, [ms])
  return visible ? <>{children}</> : null
}
```

When the delayed area must keep its size (to avoid layout shift), render an empty box with the skeleton's dimensions instead of `null`: wrap the call site in a container with `min-h-*`.

Optional: if a spinner did appear, keep it visible for at least ~400 ms to avoid a "blink" (show → hide in 50 ms). Only add this for spinners on buttons/modules, not skeletons.

### `src/shared/components/ErrorState.tsx`

Canonical `ErrorState` for the whole pack (boundaries in `react-error-handling` import this one).

```tsx
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import { getUserMessage } from '@/shared/lib/getUserMessage'

type ErrorStateProps = { error: unknown; onRetry?: () => void; title?: string }

export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="font-medium">{title ?? t('errors.loadFailed.title')}</p>
      <p className="text-muted-foreground text-sm">{getUserMessage(error)}</p>
      {onRetry && <Button variant="outline" onClick={onRetry}>{t('common.retry')}</Button>}
    </div>
  )
}
```

`getUserMessage` maps typed errors (network, 403, 404, 5xx) to human copy. It is defined by `react-error-handling`; never print `error.message` from the server directly.

- 403: say the user has no access and who to ask; no Retry.
- 404: say the item doesn't exist or was deleted; link back to the list.
- Network/5xx: Retry button.

### `src/shared/components/EmptyState.tsx`

```tsx
type EmptyStateProps = { title: string; description?: string; action?: ReactNode; icon?: ReactNode }

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 py-12 text-center">
      {icon}
      <p className="font-medium">{title}</p>
      {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      {action}
    </div>
  )
}
```

Three kinds of empty state (NN/g):
1. **First use** - nothing created yet: explain the value + primary "Create" action.
2. **No results** - filters/search matched nothing: echo the query, offer "Clear filters".
3. **Cleared** - user finished everything (inbox zero): positive confirmation, no action needed.

## Suspense variant

Use when the route loader or `useSuspenseQuery` already owns the data.

```tsx
import { WidgetBoundary } from '@/shared/components/WidgetBoundary'   // from react-error-handling

<WidgetBoundary>
  <Suspense fallback={<Delayed><OrdersListSkeleton /></Delayed>}>
    <OrdersList />   {/* uses useSuspenseQuery; handles empty itself */}
  </Suspense>
</WidgetBoundary>
```

At route level the router's `RouteErrorComponent` is the boundary (see `react-error-handling` boundaries.md). Never wrap queries in a plain `ErrorBoundary`: without `QueryErrorResetBoundary`, Retry re-renders the cached error.

- Put Suspense boundaries around independent regions so one slow widget does not block the page.
- Trigger navigation/filter changes inside `startTransition` (TanStack Router and Next.js navigations already are transitions). React then keeps the current UI instead of falling back to the skeleton; show `isPending` from `useTransition` as a subtle indicator.
- `useDeferredValue(searchText)` keeps typing responsive while the result list re-renders.

## isPending vs isFetching (TanStack Query v5)

| Flag | Meaning | UI |
|---|---|---|
| `isPending` | no data in cache yet | skeleton |
| `isFetching` | any request in flight (incl. background) | small indicator, keep data |
| `isPlaceholderData` | showing previous page's data | dim list, disable Next |
| `isError && data` | refetch failed, stale data present | keep data + inline warning |
| `isRefetchError` | same as above | same |

For mutations: `mutation.isPending` disables the trigger and shows inline progress on it.

## Optimistic updates

Mutations live in feature hooks (`features/<f>/api/<entity>.mutations.ts`). Errors and rollbacks are announced by the global `MutationCache` toast; a hook that shows its own error toast must set `meta: { skipGlobalErrorToast: true }`.

### A. Via variables (one place on screen)

```tsx
// features/comments/api/comment.mutations.ts
export function useAddComment(postId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: [...commentQueries.all(), 'add'],
    mutationFn: postComment,
    onSettled: () => queryClient.invalidateQueries({ queryKey: commentQueries.list(postId).queryKey }),
  })
}

// component
const addComment = useAddComment(postId)

<ul>
  {comments.map((c) => <CommentItem key={c.id} comment={c} />)}
  {addComment.isPending && <CommentItem comment={addComment.variables} pending />}
</ul>
```

Use `useMutationState({ filters: { mutationKey: [...commentQueries.all(), 'add'], status: 'pending' } })` when the pending item renders in another component.

### B. Via cache (many places read the same data)

```tsx
// features/tasks/api/task.mutations.ts
export function useToggleTaskDone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleTaskDone,
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: taskQueries.all() })
      const previous = queryClient.getQueryData(taskQueries.list().queryKey)
      queryClient.setQueryData(taskQueries.list().queryKey, (old = []) =>
        old.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)),
      )
      return { previous }
    },
    onError: (_err, _task, ctx) => {
      queryClient.setQueryData(taskQueries.list().queryKey, ctx?.previous) // global toast tells the user
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskQueries.all() }),
  })
}
```

### C. React 19 `useOptimistic` (form actions / Next.js server actions)

```tsx
const [optimisticItems, addOptimistic] = useOptimistic(items, (state, item: Item) => [...state, item])

function onAdd(item: Item) {
  startTransition(async () => {
    addOptimistic({ ...item, pending: true })
    const result = await addItemAction(item)
    if (!result.ok) toast.error(t('items.addFailed'))   // optimistic state reverts automatically
  })
}
```

Mark optimistic rows visually (reduced opacity, "Saving..." label) and disable actions on them until they have a real ID.

## Layout stability

- Skeleton = same height/width as real content (rows count = page size, fixed avatar/image sizes).
- Images: always `width`/`height` or `aspect-ratio`.
- Do not insert banners above content after load; reserve the slot or overlay.
- Target CLS ≤ 0.1 and INP ≤ 200 ms (Core Web Vitals). Long list renders: virtualize (`@tanstack/react-virtual`) rather than freezing input.
