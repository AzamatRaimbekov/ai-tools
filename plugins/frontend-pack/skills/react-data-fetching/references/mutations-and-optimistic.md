# Mutations, invalidation, optimistic updates

## Where mutations live

`features/<f>/api/<entity>.mutations.ts` exports one hook per operation. The hook owns cache
side effects; the component owns UI side effects.

```ts
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      queryClient.setQueryData(orderQueries.detail(order.id).queryKey, order);
      return queryClient.invalidateQueries({ queryKey: orderQueries.lists() });
    },
  });
}

// component
const createOrder = useCreateOrder();
const onSubmit = (values: OrderForm) =>
  createOrder.mutate(values, { onSuccess: (order) => navigate({ to: '/orders/$id', params: { id: order.id } }) });
```

- Hook-level callbacks always run; `mutate`-level callbacks do not run if the component unmounted.
  So cache work goes in the hook, navigation/toasts/closing dialogs in `mutate`.
- Use `mutateAsync` only when you need to `await` (e.g. sequential steps) and wrap in try/catch.
- Disable the submit button with `isPending`; do not track a separate `isSubmitting` state.
- Show field errors from `ApiError.details` via React Hook Form `setError` (see `react-ux` (forms) and `applyServerErrors` in `react-error-handling`).

## Choosing between invalidate and setQueryData

| Situation | Do |
|---|---|
| Response returns the full updated entity | `setQueryData(detail)` + invalidate `lists()` |
| Created/deleted item affects sorted/paged/filtered lists | invalidate `lists()` |
| Mutation changes aggregates (counters, totals) elsewhere | invalidate those features' keys |
| Response is empty (204) | invalidate `detail` and `lists()` |
| Logout / tenant switch | `queryClient.clear()` |

Returning the promise from `onSuccess`/`onSettled` keeps `isPending` true until refetch completes,
which prevents the UI from flashing old data.

## Automatic invalidation via meta (optional, project-wide)

For projects with many mutations, a single `MutationCache` handler can invalidate declared keys.
`meta.invalidates` is already typed by the one `Register` declaration in `react-error-handling`
[tanstack-query.md](../../react-error-handling/references/tanstack-query.md); do not declare it again.
Add `onSuccess` next to the existing `onError` in `src/shared/api/queryClient.ts`:

```ts
mutationCache: new MutationCache({
  onError: (error, _v, _c, mutation) => { /* global toast, unchanged */ },
  onSuccess: (_d, _v, _c, mutation) =>
    Promise.all((mutation.meta?.invalidates ?? []).map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
}),

useMutation({ mutationFn: archiveOrder, meta: { invalidates: [orderQueries.all()] } });
```

Use either this or per-hook invalidation in a project, not both.

## Optimistic update - UI variant (preferred)

No cache writes; render the pending variables. Nothing to roll back.

```tsx
const addComment = useAddComment(postId);           // invalidates comments in onSettled
const { data: comments } = useQuery(commentQueries.list(postId));

<ul>
  {comments?.map((c) => <CommentItem key={c.id} comment={c} />)}
  {addComment.isPending && <CommentItem comment={{ id: 'pending', text: addComment.variables.text }} pending />}
</ul>
```

If the pending item is rendered in a different component, read it with
`useMutationState({ filters: { mutationKey: [...commentQueries.all(), 'add'], status: 'pending' }, select: (m) => m.state.variables })`.

## Optimistic update - cache variant

Use when many components show the changed data (e.g. a toggle visible in list and detail).

```ts
export function useToggleTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleTodo,
    onMutate: async ({ id, done }) => {
      const key = todoQueries.detail(id).queryKey;
      await queryClient.cancelQueries({ queryKey: key });          // stop in-flight refetch overwriting us
      const previous = queryClient.getQueryData(key);              // snapshot
      queryClient.setQueryData(key, (old) => old && { ...old, done });
      return { previous, key };                                    // becomes onMutateResult/context
    },
    onError: (_error, _vars, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.previous);     // rollback
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: todoQueries.all() }), // resync
  });
}
```

Rules:
- Always `cancelQueries` first, snapshot, write with an updater, return the snapshot.
- Always roll back in `onError` and invalidate in `onSettled` (runs on success and error).
- On rollback; the global `MutationCache` toast informs the user (or set `meta.skipGlobalErrorToast` and toast locally) - silent reverts look like bugs.
- Do not use optimistic updates for payments, irreversible actions or anything validated
  server-side in ways the client cannot predict.
- Recent v5 versions pass a `context` object with `client` as the last callback argument; using
  `useQueryClient()` as above works on every v5 version.

## Concurrency

- Rapid repeated mutations on the same entity: give them a `scope: { id: 'todo-' + id }` so
  they run serially.
- Avoid over-invalidation storms when many optimistic mutations run: only invalidate when
  `queryClient.isMutating({ mutationKey }) === 1`.
