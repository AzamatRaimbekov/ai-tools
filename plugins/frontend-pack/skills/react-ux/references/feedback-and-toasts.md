# Feedback, toasts, destructive actions

## Which feedback channel

| Situation | Channel |
|---|---|
| Field invalid | Inline under field |
| Form failed for non-field reason | Inline alert above submit |
| Page/section failed to load | Inline `ErrorState` with Retry |
| Action succeeded, result not visible on screen | Toast (success) |
| Action succeeded, result visible (row added/updated) | No toast; optional brief highlight |
| Background mutation failed | Toast (error) with Retry |
| Reversible destructive action done | Toast with **Undo** |
| Irreversible action about to happen | `AlertDialog` |
| Persistent condition (offline, trial ending, read-only mode) | Banner at top of the region |
| Long job (export, import) | Progress inline + toast on completion |

## sonner setup

Mount `<Toaster />` once in `src/app` (shadcn's `shared/ui/sonner.tsx`, themed). Do not mount per page.

```tsx
// one toast that evolves; no "Saving..." + "Saved" pair
toast.promise(saveSettings(values), {
  loading: t('settings.saving'),
  success: t('settings.saved'),
  error: (e) => getUserMessage(e),
})

// update an existing toast
const id = toast.loading(t('export.running'))
toast.success(t('export.ready'), { id, action: { label: t('export.download'), onClick: download } })
```

Rules:
- Default duration 4 s for success; ≥ 8 s or `Infinity` for errors and anything with an action.
- Max one line of text + optional description; no forms, no lists inside toasts.
- Don't toast initial-load query errors (show `ErrorState` inline). A failed background refetch with cached data gets the global toast from `QueryCache`.
- Don't rely on the toast as the only record: if the user must find it later, it belongs in the UI (status column, notifications page).
- Don't use toasts for confirmations ("Are you sure?").

## Undo pattern

Soft delete (`archived_at`) + `restore` endpoint: the action commits immediately, survives tab close, and Undo calls restore.

```tsx
// features/orders/api/order.mutations.ts
export function useArchiveOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (order: Order) => archiveOrder(order.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderQueries.lists() }),
  })
}

export function useRestoreOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: restoreOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderQueries.lists() }),
  })
}

// component: the hook owns the cache, the component owns the toast
const archive = useArchiveOrder()
const restore = useRestoreOrder()

archive.mutate(order, {
  onSuccess: () =>
    toast(t('orders.archived', { name: order.name }), {
      duration: 8000,
      action: { label: t('common.undo'), onClick: () => restore.mutate(order.id) },
    }),
})
```

Do not hand-edit filtered lists with `setQueryData`; invalidate `orderQueries.lists()`. Errors from either mutation get the global `MutationCache` toast.

## Confirmation dialog

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild><Button variant="destructive">{t('project.delete')}</Button></AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t('project.deleteConfirm.title', { name: project.name })}</AlertDialogTitle>
      <AlertDialogDescription>
        {t('project.deleteConfirm.body', { tasks: project.taskCount })}  {/* "All 42 tasks and files will be deleted. This can't be undone." */}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{t('project.keep')}</AlertDialogCancel>
      <AlertDialogAction onClick={onDelete} disabled={deleteProject.isPending}>{t('project.delete')}</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- Title states the action and the object: "Delete project Alpha?"
- Body states the consequence in numbers if possible, and whether it is reversible.
- Buttons are verbs ("Delete project" / "Keep project"); the destructive button is visually distinct; default focus on Cancel (Radix AlertDialog does this).
- Severe cases: require typing the object name before enabling the action.
- Keep the dialog open with a pending state while the request runs; close on success; show error inside the dialog on failure.

## Copy templates

| Case | EN | RU |
|---|---|---|
| Save failed | Couldn't save changes. Check your connection and try again. | Не удалось сохранить изменения. Проверьте соединение и попробуйте ещё раз. |
| No access | You don't have access to this project. Ask the owner to invite you. | У вас нет доступа к проекту. Попросите владельца пригласить вас. |
| Not found | This order doesn't exist or was deleted. | Заказ не найден или был удалён. |
| Empty first use | No orders yet. Create the first one to start tracking sales. | Заказов пока нет. Создайте первый, чтобы начать учёт продаж. |
| No results | Nothing matches "{query}". | По запросу «{query}» ничего не найдено. |
| Archived | Order archived. [Undo] | Заказ перенесён в архив. [Отменить] |
