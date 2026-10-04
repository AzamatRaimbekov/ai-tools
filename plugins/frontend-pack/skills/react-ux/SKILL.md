---
name: react-ux
description: Defines the Mdigital UX behaviour standard for React screens - loading, error, empty and success states, skeletons vs spinners, pagination that keeps previous data, optimistic updates, form UX with React Hook Form + Zod, destructive-action confirmation or undo, toast rules, URL state for filters/tabs/pagination, focus management, aria-live, reduced motion and microcopy. Use when building or reviewing any screen that fetches data, submits a form, deletes something or shows feedback, and when the user mentions "UX", "состояние загрузки", "пустое состояние", "форма", "валидация формы", "скелетон", "toast", "оптимистичное обновление", "loading state", "empty state", "form UX", "skeleton", "spinner", "undo", "confirm dialog", "filters in URL". Not for visual styling (react-ui) or error boundaries and logging (react-error-handling).
---

# React UX standard

This skill covers how the product **behaves**: what the user sees while waiting, after failing, when there is nothing, and after acting. Visual styling lives in `react-ui`. Error boundaries, logging and error typing live in `react-error-handling`; this skill only covers how errors are **presented**.

Stack: React 19, TypeScript strict, shadcn/ui + Tailwind, TanStack Query, React Hook Form + Zod, sonner, TanStack Router (Vite) or Next.js App Router.

## 1. Every async view has four states

Loading, error, empty, success. A view that renders only the success branch is unfinished. Use `QueryState` for standard list/page views; explicit branching is fine when one error needs custom UI (e.g. 404).

Place these in `src/shared/components/` (one component per file):

| File | Purpose |
|---|---|
| `QueryState.tsx` | Picks one of the four states from a `UseQueryResult` |
| `Delayed.tsx` | Renders children only after a delay (no spinner flash) |
| `EmptyState.tsx` | Title, explanation, primary action |
| `ErrorState.tsx` | Human message + Retry button |

```tsx
// src/shared/components/QueryState.tsx
import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Delayed } from './Delayed'
import { ErrorState } from './ErrorState'

type QueryStateProps<T> = {
  query: UseQueryResult<T>
  loading: ReactNode // skeleton shaped like the final content
  empty?: ReactNode
  isEmpty?: (data: T) => boolean
  children: (data: T) => ReactNode
}

export function QueryState<T>({ query, loading, empty, isEmpty, children }: QueryStateProps<T>) {
  if (query.isPending) return <Delayed>{loading}</Delayed>
  if (query.isError && query.data === undefined) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  }
  const data = query.data as T
  if (empty && isEmpty?.(data)) return <>{empty}</>
  return <>{children(data)}</>
}
```

```tsx
// usage in src/features/orders/components/OrdersList.tsx
const query = useQuery(orderQueries.list(filters))
return (
  <QueryState
    query={query}
    loading={<OrdersListSkeleton />}
    isEmpty={(d) => d.items.length === 0}
    empty={<EmptyState title={t('orders.empty.title')} action={<CreateOrderButton />} />}
  >
    {(data) => <OrdersTable orders={data.items} isRefreshing={query.isFetching} />}
  </QueryState>
)
```

Rules:
- `isPending` (no data yet) shows the skeleton. `isFetching` with data shows the old data plus a subtle indicator; never blank the view on refetch.
- An error with cached data is not a full-screen error: keep the data, show an inline banner or toast.
- Distinguish "no data yet" from "nothing matches your filters": the second empty state offers "Clear filters".
- With `useSuspenseQuery`, use `<Suspense fallback={<Skeleton/>}>` + an error boundary from `react-error-handling`; empty still needs handling in the component.

Details, Suspense variant and the `Delayed` implementation: `references/async-states.md`.

## 2. Loading indicators

Thresholds (Nielsen): <100 ms feels instant; <1 s keeps flow; >10 s loses attention.

- **Under ~300 ms**: show nothing. Delay every fallback by 200-300 ms (`<Delayed>`), so fast responses never flash a spinner.
- **Full page or list, 1-10 s**: skeleton that matches the final layout's size. Never a frame-only skeleton (header plus blank body).
- **Small module, button or inline region**: spinner. On buttons, keep the label and width stable (spinner + "Saving...").
- **Over 10 s, uploads, exports**: determinate progress bar with percent and a Cancel action.
- Reserve space: skeletons, images and async blocks have fixed dimensions so nothing shifts when data arrives (CLS ≤ 0.1).
- Navigations and tab switches go through `startTransition`/router transitions so already-visible content is not replaced by a fallback.

## 3. Pagination, filtering, search

- Use `placeholderData: keepPreviousData` on paginated or filtered queries. Show old results dimmed while `isFetching`; disable "Next" while `isPlaceholderData`.
- Debounce free-text search 250-400 ms; keep the input itself responsive (controlled input updates immediately, the query key uses the debounced value).
- Keep page, filters, sort, tab and search in the URL (see section 7).

```tsx
const { data, isFetching, isPlaceholderData } = useQuery({
  ...orderQueries.list(filters), // key factory from react-data-fetching
  placeholderData: keepPreviousData,
})
```

## 4. Optimistic updates

Use optimistic UI only when **all** are true: the action almost always succeeds, it is cheap to reverse, and the result is visible immediately (toggle, like, rename, reorder, add comment). Do **not** use it for payments, irreversible actions, or anything where the server computes the result (prices, IDs shown to the user, permissions).

- Single place on screen: render `mutation.variables` while `isPending` (no cache surgery).
- Several places read the same data: `onMutate` → `cancelQueries` → snapshot → `setQueryData`; `onError` rollback; the global `MutationCache` toast informs the user (or set `meta.skipGlobalErrorToast` and toast locally); `onSettled` invalidate.
- Form actions in React 19: `useOptimistic` inside an Action / `startTransition`; it reverts automatically on failure.
- Always tell the user when an optimistic change was rolled back.

Code for all three: `references/async-states.md#optimistic-updates`.

## 5. Forms (React Hook Form + Zod)

```tsx
const form = useForm<OrderFormValues>({
  resolver: zodResolver(orderFormSchema),
  mode: 'onTouched',          // first validation on blur, then live re-validation
  defaultValues,              // always provide, never undefined -> controlled warnings
})
const createOrder = useCreateOrder() // meta: { skipGlobalErrorToast: true }
const onSubmit = (values: OrderFormValues) =>
  createOrder.mutate(values, {
    onSuccess: (order) => navigate({ to: '/orders/$id', params: { id: order.id } }),
    onError: (error) => applyServerErrors(error, form.setError, orderFormSchema.keyof().options),
  })

<form onSubmit={form.handleSubmit(onSubmit)} noValidate>
  {/* shadcn <FormField>/<FormMessage> wires aria-invalid + aria-describedby */}
  <Button type="submit" disabled={createOrder.isPending}>
    {createOrder.isPending ? t('common.saving') : t('orders.create')}
  </Button>
</form>
```

- Validate on blur (`onTouched`), never on first keystroke; re-validate on change once a field has an error.
- Errors appear inline under the field, in text (not colour only), and say how to fix: "Enter an email like name@company.com", not "Invalid".
- On submit with errors, focus the first invalid field (`shouldFocusError` is on by default; keep it). For long forms, also show a summary at the top linking to fields.
- Keep the submit button **enabled** while the form is invalid (clicking it reveals what is missing). Disable it **only while `mutation.isPending`** to prevent double submit. Use `mutateAsync` only when awaiting is truly needed.
- Server validation errors are mapped by `applyServerErrors` (from `react-error-handling`) in `onError`; the form's mutation sets `meta: { skipGlobalErrorToast: true }`. Anything not field-specific lands in `root.server`, shown above the submit button.
- Never clear user input on error. Warn before leaving a dirty form (`formState.isDirty` + router blocker).
- Use correct `type`, `autoComplete`, `inputMode`; labels are always visible (placeholders are not labels); mark optional fields, not required ones, when most are required.

More (server error mapping, multi-step, dirty-guard, `useActionState` in Next.js): `references/forms.md`.

## 6. Destructive actions, toasts, feedback

**Destructive actions**
- Reversible (archive, remove from list, delete a draft): act immediately and offer **Undo** in a toast (5-10 s). Implement as soft delete or delayed commit.
- Irreversible or high-impact (delete account, delete with dependants, bulk delete): shadcn `AlertDialog` naming the object and consequence. Buttons say the action ("Delete project" / "Keep project"), not "Yes/No"/"OK". Focus starts on the safe option. For the most severe cases require typing the name.
- Never confirm routine actions; confirmation fatigue makes users click through the real ones.

**Toasts (sonner only)**
- Toasts are for transient, non-blocking feedback about an action the user just took: "Saved", "Link copied", "Order archived - Undo", background mutation failed.
- Never put in a toast: form validation errors (inline), page-level load errors (inline `ErrorState`), anything the user must read or act on later, or long text.
- One toast per action; use `toast.promise` or update by `id` instead of stacking "Saving..." + "Saved".
- Errors in toasts stay until dismissed or longer (≥ 8 s) and include a Retry/action if possible.
- Do not toast what is already visible (a row appearing in a list is its own success feedback).

Details and copy templates: `references/feedback-and-toasts.md`.

## 7. URL is state

Anything the user would expect to survive reload, back button, or sharing a link goes in the URL: filters, search, sort, page, active tab, selected item / open detail panel.

- TanStack Router: `validateSearch` with a Zod schema on the route; read with `Route.useSearch()`, write with `navigate({ search: (prev) => ({ ...prev, page: 1 }) })`.
- Next.js App Router: `nuqs` (`useQueryState`, `parseAsInteger.withDefault(1)`).
- Reset `page` to 1 when filters change. Use `replace` for typing in search, `push` for discrete choices (tab, page) so Back works as expected.
- Keep ephemeral UI (hover, open dropdown, unsaved input) in component state, not in the URL.

Examples: `references/url-state.md`.

## 8. Accessibility of behaviour (WCAG 2.2 AA)

- **Focus after navigation**: move focus to the new page's `<h1>` (tabIndex={-1}) or main region; announce the route title.
- **Dialogs**: focus moves into the dialog and returns to the trigger on close (Radix/shadcn does this; do not break it with conditional unmounting of the trigger).
- **After deleting an item**, move focus to the next item, or the list heading if empty; never leave focus on `<body>`.
- **Async updates**: result counts, "Saved", loading done → a polite live region (`role="status"`). Errors needing attention → `role="alert"`. sonner already uses a live region.
- **Keyboard**: every action reachable and operable by keyboard; visible focus ring; focused element not hidden under sticky headers (2.4.11).
- **Reduced motion**: respect `prefers-reduced-motion` (Tailwind `motion-safe:` / `motion-reduce:`); skeleton shimmer and transitions turn into static states.
- **Targets**: interactive targets ≥ 24×24 px (2.5.8); no drag-only interactions (2.5.7) - provide buttons for reorder.

Details: `references/accessibility-ux.md`.

## 9. Microcopy

- Every user-facing string goes through the i18n layer (`t('key')`); no string concatenation, use ICU plurals and interpolation: `t('orders.count', { count })`.
- Error = what happened + why (if known) + what to do: "Couldn't save the order. Check your connection and try again." Never show raw `error.message`, status codes or stack traces.
- Buttons are verbs naming the outcome: "Create order", "Delete 3 files". Avoid "OK", "Submit", "Yes".
- Empty states: what this place is for + how to fill it + a primary action button.
- Don't blame the user ("You entered an invalid..."). No ALL CAPS, no exclamation marks in errors.
- Leave room for 30-40% longer translations (RU/KZ strings are longer than EN); never truncate actions.

## Checklist before finishing

- [ ] Every query-driven view renders loading (skeleton, delayed), error (with Retry), empty (with action) and success via `QueryState` or Suspense + boundary
- [ ] No spinner flashes for fast responses; no layout shift when data arrives
- [ ] Refetch, pagination and filtering keep previous data visible (`keepPreviousData`), never blank the screen
- [ ] Filters, search, sort, page and tab live in the URL and survive reload/back/share
- [ ] Forms: Zod schema, `onTouched` validation, inline errors with fix hints, focus to first error, submit disabled only while submitting, server errors mapped via `setError`, input preserved on failure
- [ ] Optimistic updates only for safe, reversible actions and roll back with a visible message
- [ ] Destructive actions have Undo (reversible) or a specific AlertDialog (irreversible)
- [ ] Toasts only for transient feedback via sonner; no validation or page errors in toasts
- [ ] Focus is managed after navigation, dialog close and item deletion; async results are announced
- [ ] `prefers-reduced-motion` respected; everything works by keyboard
- [ ] All copy goes through i18n, uses plurals, explains how to recover from errors

Sources: `references/sources.md`.
