---
name: react-error-handling
description: Defines how Mdigital React apps (React 19, Vite + TanStack Router or Next.js App Router, TanStack Query, React Hook Form + Zod, sonner) classify, throw, catch, display, and report errors - typed ApiError in shared/api, layered error boundaries, TanStack Query retry/throwOnError/global toasts, server errors mapped to form fields, user-facing messages, and Sentry reporting with PII scrubbing. Use when writing or reviewing data fetching, mutations, forms, error boundaries, error.tsx/global-error.tsx, http clients, or logging, and when the user mentions "обработка ошибок", "error boundary", "ошибка запроса", "упало приложение", "белый экран", "sentry", "error handling", "crash", "try/catch", "toast с ошибкой", "500", "network error".
---

# React Error Handling

Every error in the app is either **expected** (part of normal operation, shown to the user, not reported) or **unexpected** (a bug or outage, caught by a boundary, reported). Decide which one before writing any `try`, `catch`, or `throw`.

## 1. Error taxonomy

| Class | Examples | Where handled | Reported? |
|---|---|---|---|
| Validation | 400/422 with field errors, Zod form errors | Form field via `setError` | No |
| Domain / expected | 401, 403, 404, 409, 429, business rule ("limit reached") | Inline UI, toast, redirect, `notFound()` | No (401/403 maybe as breadcrumb) |
| Transient | network, timeout, 502/503/504 | Retry, then inline/toast with "Retry" | Only after retries exhausted |
| Cancelled | `AbortError`, query cancellation | Ignore silently - it is not a failure | Never |
| Unexpected | 500, response fails Zod schema, `TypeError` in render, bug | Error boundary fallback | Always |

Rules:
- Model expected errors as **values or typed `ApiError` kinds**; throw only for unexpected ones.
- Never show raw `error.message`, stack traces, or server text to users. Map to a message via `getUserMessage(error)` (see section 6).
- Never swallow: no empty `catch {}`, no `catch (e) { console.log(e) }`. Every catch must do one of: recover, rethrow, map to UI state, or report.

## 2. Typed errors in `shared/api`

All HTTP goes through one client in `src/shared/api/http.ts`. It converts every failure into an `ApiError` with a `kind` discriminant, validates responses with Zod, and supports timeouts and cancellation. Full implementation: [references/api-errors.md](references/api-errors.md).

```ts
// src/shared/api/errors.ts (abridged)
export type ApiErrorKind = 'network' | 'timeout' | 'aborted' | 'http' | 'validation' | 'contract'

export class ApiError extends Error {
  override readonly name = 'ApiError'
  constructor(
    readonly kind: ApiErrorKind,
    message: string, // for developers/logs only, never shown to users
    readonly details: { status?: number; code?: string; fieldErrors?: Record<string, string[]>; requestId?: string; cause?: unknown } = {},
  ) { super(message, { cause: details.cause }) }
  get status() { return this.details.status }
  get isServerError() { return (this.status ?? 0) >= 500 || this.kind === 'contract' }
}
export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError
```

- `catch (error)` is `unknown` (strict mode). Narrow with `isApiError`, `instanceof`, or Zod - never cast `as Error`.
- Use `toError(unknown): Error` before passing anything to a reporter or boundary.
- Feature code never calls `fetch` directly and never parses error bodies itself.
- `useQuery().error` is typed `ApiError` without generics by the single `Register` declaration (`defaultError`, `queryMeta`, `mutationMeta`) in [references/tanstack-query.md](references/tanstack-query.md). Do not declare it anywhere else.

## 3. Layered error boundaries

Use `react-error-boundary` (v6+) for every boundary outside Next.js route files. Three layers:

1. **App root** (`src/app/`): last resort, full-page "Something went wrong" + reload. Plus React 19 root callbacks for reporting.
2. **Route**: TanStack Router `errorComponent` / Next.js `error.tsx`. Keeps app shell (nav, sidebar) alive.
3. **Feature widget**: wrap independent widgets (chart, table, side panel) so one failure does not blank the page.

```tsx
<WidgetBoundary resetKeys={[filters]}>  {/* QueryErrorResetBoundary + ErrorBoundary + ErrorState */}
  <OrdersTable filters={filters} />
</WidgetBoundary>
```

`WidgetBoundary` lives in `src/shared/components/` (code in [references/boundaries.md](references/boundaries.md)): it wraps `react-error-boundary` in `QueryErrorResetBoundary`, renders `<ErrorState error onRetry />` (defined in `react-ux`, which owns how errors look), and resets on `resetKeys`.

Root reporting (Vite SPA, `src/main.tsx`):

```tsx
createRoot(document.getElementById('root')!, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(<App />)
```

If you use root callbacks for reporting, do **not** also report in `ErrorBoundary.onError` - pick one place, otherwise every error is sent twice. Team default (Vite SPA): root callbacks report; `onError` is only for local side effects. Next.js has no `createRoot`, so there `error.tsx` and widget `onError` report via `reportError`.

Details, TanStack Router and `resetKeys` patterns: [references/boundaries.md](references/boundaries.md). Next.js `error.tsx`, `global-error.tsx`, `not-found.tsx`, server actions: [references/nextjs.md](references/nextjs.md).

## 4. What boundaries do NOT catch

Boundaries only catch errors thrown **during render, in lifecycle/effects, and inside `startTransition` / form actions** (React 19). They do not catch:

- Event handlers (`onClick`, `onSubmit`) - handle in place or call `showBoundary` from `useErrorBoundary`.
- Async code outside React: `setTimeout`, `.then()` callbacks, un-awaited promises.
- Errors in the boundary's own fallback (they go to the next boundary up).
- SSR errors for `react-error-boundary` (Next.js `error.tsx` handles those).

```tsx
const { showBoundary } = useErrorBoundary()

async function onExport() {
  try {
    await exportReport(id)
  } catch (error) {
    if (isApiError(error) && !error.isServerError) {
      toast.error(getUserMessage(error)) // expected: tell the user
      return
    }
    showBoundary(error) // unexpected: escalate
  }
}
```

Prefer `mutation.mutate()` in handlers - errors flow to `onError` and the global `MutationCache` handler. If you use `mutateAsync`, you must `await` it inside `try/catch`. Floating promises are forbidden (`@typescript-eslint/no-floating-promises`).

## 5. TanStack Query integration

Configure once in `src/shared/api/queryClient.ts` (Vite) or `getQueryClient.ts` (Next.js), same defaults; `react-data-fetching` uses the same files. Full code: [references/tanstack-query.md](references/tanstack-query.md).

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => failureCount < 2 && isRetryable(error),
      // Boundary only for unexpected errors when there is nothing to show
      throwOnError: (error, query) => query.state.data === undefined && isUnexpected(error),
    },
    mutations: { retry: false },
  },
  queryCache: new QueryCache({
    // Background refetch failed but stale data is on screen: toast, keep data
    onError: (error, query) => {
      if (query.state.data !== undefined && !isCancelled(error)) toast.error(getUserMessage(error))
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.skipGlobalErrorToast || isCancelled(error)) return
      toast.error(mutation.meta?.errorMessage ?? getUserMessage(error))
    },
  }),
})
```

- `isRetryable`: `network`, `timeout`, 408, 429, 5xx. **Never retry 4xx** - it will not succeed and only delays the message.
- `isUnexpected`: 5xx, `contract`. Expected 4xx stay local: render `query.error` inline (`<ErrorState>`), or map 404 to a not-found view.
- Mutations do not retry by default (non-idempotent). Enable per mutation only for idempotent endpoints.
- Every boundary that contains queries must be inside `QueryErrorResetBoundary` (or call `useQueryErrorResetBoundary().reset()`), otherwise "Retry" re-renders the cached error.

## 6. User-facing messages

Message = **what happened + what to do**. One mapping function in `src/shared/lib/getUserMessage.ts` (no `t` parameter - it uses the app i18n instance internally), keyed by `kind` / `status` / backend `code`:

```ts
export function getUserMessage(error: unknown): string {
  if (!isApiError(error)) return 'Something went wrong. Reload the page and try again.'
  if (error.details.code && codeMessages[error.details.code]) return codeMessages[error.details.code]
  switch (error.kind) {
    case 'network': return 'No connection. Check your internet and try again.'
    case 'timeout': return 'The server is taking too long. Try again in a minute.'
    case 'validation': return 'Some fields are filled in incorrectly. Check the form.'
  }
  if (error.status === 401) return 'Your session has expired. Sign in again.'
  if (error.status === 403) return 'You do not have access to this action.'
  if (error.status === 404) return 'This item was not found or was deleted.'
  if (error.status === 409) return 'The data was changed by someone else. Refresh and try again.'
  if (error.status === 429) return 'Too many requests. Wait a moment and try again.'
  return 'Something went wrong on our side. We are already looking into it.'
}
```

- Use the project's i18n if it exists; messages above are templates, not literal copy.
- Show `requestId` (or Sentry event id) in the fallback as "Error code: ..." for support - never the stack.
- Fallback UI always offers an action: "Try again", "Reload", "Go to home", or "Contact support".
- Use `role="alert"` for inline errors; sonner toasts are already announced.

## 7. Forms: server errors to fields

Validate client-side with Zod; still expect the server to reject. Map `fieldErrors` into React Hook Form and suppress the global toast for that mutation:

```ts
const mutation = useMutation({
  mutationFn: createUser,
  meta: { skipGlobalErrorToast: true },
  onError: (error) => applyServerErrors(error, form.setError, formSchema.keyof().options),
})
```

`applyServerErrors` (in `src/shared/lib/`, full code in [references/api-errors.md](references/api-errors.md)) sets `setError(field, { type: 'server', message })` for each field the form knows; unknown fields or non-validation errors go to `root.server` with `getUserMessage(error)` - never silently dropped.

Render `form.formState.errors.root?.server?.message` above the submit button with `role="alert"`. Next.js server actions return `{ ok: false, fieldErrors }` instead of throwing - see [references/nextjs.md](references/nextjs.md).

## 8. Logging and reporting

- One reporter: `src/shared/lib/reportError.ts` wraps Sentry. Feature code calls `reportError(error, context)`, never `Sentry.*` directly.
- Report only unexpected errors. Do not report cancelled, validation, or 4xx domain errors (use breadcrumbs if useful).
- `sendDefaultPii: false`; scrub in `beforeSend`: auth headers, cookies, tokens, emails, phones, form values, request bodies. Set user as `{ id }` only.
- Never put PII or tokens into error messages - messages end up in logs.
- Upload source maps in CI (`@sentry/vite-plugin` / `withSentryConfig`) and delete them from the deployed bundle.
- No `console.log` in committed code. ESLint: `no-console: ['error', { allow: ['warn', 'error'] }]`; in production `console.*` is not a reporting channel.
- Unhandled promise rejections and `window.onerror` are captured by the Sentry SDK globally - do not add your own duplicate listeners.

Setup, scrubbing code, Next.js `onRequestError`: [references/logging.md](references/logging.md).

## 9. Network, offline, timeouts, cancellation

- Every request has a timeout (default 15 s) via `AbortSignal.timeout`, combined with the caller's signal via `AbortSignal.any`.
- Always pass TanStack Query's `signal` into `http()` so unmounts and key changes cancel requests.
- `AbortError` from the caller's signal is `kind: 'aborted'`: never toast, never report.
- Offline: TanStack Query pauses queries (`networkMode: 'online'`); show a global offline banner from `onlineManager`, not per-request errors.

## Anti-patterns (reject in review)

- `catch {}` / `catch (e) {}` / `.catch(() => {})` / `catch (e) { console.log(e) }`
- `catch (e: any)`, `(e as Error).message`, `throw 'string'` or throwing plain objects
- `toast.error(error.message)` or rendering `error.message` / server text directly
- `throwOnError: true` globally (sends every 404 to a boundary)
- Retrying 4xx; retrying non-idempotent mutations
- `fetch` in feature code or components; parsing error JSON outside `shared/api`
- A single root boundary only (one widget crash = white screen)
- Reporting in both `onError` and root callbacks; reporting `AbortError`
- `Sentry.setUser({ email })`, logging request bodies or tokens

## Checklist before finishing

- [ ] Each new error path is classified: validation / domain / transient / cancelled / unexpected.
- [ ] All HTTP goes through `shared/api/http.ts`; responses are Zod-validated; failures are `ApiError`.
- [ ] No empty catch, no `any` in catch, no `console.log`, no floating promises.
- [ ] App root boundary + route `errorComponent`/`error.tsx` + widget boundaries around independent widgets.
- [ ] Boundaries containing queries are wrapped in `QueryErrorResetBoundary`; retry actually refetches.
- [ ] Event handler and async errors are handled in place or escalated with `showBoundary`.
- [ ] Query retry skips 4xx; `throwOnError` only for unexpected errors without cached data.
- [ ] Mutations surface errors exactly once (global toast or form `setError`, not both).
- [ ] Server field errors land on the right fields; unknown ones go to `root.server`.
- [ ] User messages say what happened and what to do; no raw server text, stack, or status codes alone.
- [ ] Fallbacks have a recovery action and, for unexpected errors, a support code.
- [ ] Unexpected errors reach Sentry exactly once, with PII scrubbed; aborted/4xx are not reported.
- [ ] Next.js: `error.tsx` is a Client Component, `global-error.tsx` renders `<html><body>`, `notFound()` used for missing data.

Sources and version notes: [references/sources.md](references/sources.md).
