# Error boundaries

Library: `react-error-boundary` v6 (ESM-only; in v6 the `error` in fallback props is typed `unknown` - narrow it, do not assume `Error`). Do not hand-write class boundaries except where a framework requires its own file convention (Next.js `error.tsx`).

## Placement

```
<AppErrorBoundary>                 src/app/AppErrorBoundary.tsx     full page, "Reload"
  <Providers>                      QueryClientProvider, Toaster, ...
    <RouterProvider>               route errorComponent              keeps layout/nav
      <Page>
        <WidgetBoundary>           shared/components/WidgetBoundary  card-sized fallback
          <RevenueChart />
        </WidgetBoundary>
        <WidgetBoundary resetKeys={[filters]}>
          <OrdersTable filters={filters} />
        </WidgetBoundary>
```

- Put the app boundary **outside** providers so a crashing provider is still caught - its fallback must therefore not depend on providers (no router `Link`, no query hooks, no theme context). Use a plain `<a href="/">` and `window.location.reload()`.
- Wrap a widget when it fetches its own data or renders third-party/complex UI, and the rest of the page is still useful without it.
- Do not wrap every component - a boundary per independent region is enough.

## App boundary

```tsx
// src/app/AppFallback.tsx
import type { FallbackProps } from 'react-error-boundary'
import { isApiError } from '@/shared/api/errors'

export function AppFallback({ error }: FallbackProps) {
  const supportCode = isApiError(error) ? error.details.requestId : undefined
  return (
    <main role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">Reload the page. If it happens again, contact support.</p>
      {supportCode && <p className="text-sm text-muted-foreground">Error code: {supportCode}</p>}
      <div className="flex gap-2">
        <button onClick={() => window.location.reload()}>Reload</button>
        <a href="/">Go to home</a>
      </div>
    </main>
  )
}
```

```tsx
// src/app/AppErrorBoundary.tsx
import { ErrorBoundary } from 'react-error-boundary'
import { AppFallback } from './AppFallback'

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary FallbackComponent={AppFallback}>{children}</ErrorBoundary>
}
```

Plain HTML elements are intentional here (see "outside providers"). In inner boundaries use shadcn `Button`, `Alert`.

## Shared ErrorState

One presentational component for inline errors, widget fallbacks, and route fallbacks: `import { ErrorState } from '@/shared/components/ErrorState'`. Its code (centered, `role="alert"`, i18n, Retry button) is canonical in `react-ux` - [async-states.md](../../react-ux/references/async-states.md).

## WidgetBoundary

```tsx
// src/shared/components/WidgetBoundary.tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorState } from '@/shared/components/ErrorState'

export function WidgetBoundary({ children, resetKeys, title }: {
  children: React.ReactNode
  resetKeys?: unknown[]
  title?: string
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          resetKeys={resetKeys}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorState error={error} onRetry={resetErrorBoundary} title={title} />
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
```

No `onError` reporting here: the React 19 root callbacks (`onCaughtError`) already report every caught error. In Next.js (no `createRoot`), add `onError={(error, info) => reportError(error, { componentStack: info.componentStack ?? undefined })}`.

## resetKeys

`resetKeys` resets the boundary automatically when a value changes - use it when the error depends on props/route params (filters, id). Without it, the user navigating to another item still sees the old fallback.

```tsx
<WidgetBoundary resetKeys={[orderId]}>
  <OrderDetails orderId={orderId} />
</WidgetBoundary>
```

## useErrorBoundary: escalate from handlers and async code

```tsx
const { showBoundary } = useErrorBoundary()

useEffect(() => {
  const ws = connectLiveFeed(onMessage)
  ws.addEventListener('error', () => showBoundary(new Error('Live feed connection failed')))
  return () => ws.close()
}, [showBoundary])
```

React 19 alternative for actions: errors thrown inside `startTransition(async () => ...)` or a `<form action>` propagate to the nearest boundary automatically. Still classify: expected errors should become state, not boundary crashes.

## TanStack Router

The router sets `defaultErrorComponent: RouteErrorComponent` (full config, single place: `react-data-fetching` [nextjs.md](../../react-data-fetching/references/nextjs.md), TanStack Router part):

```tsx
// src/app/router.tsx (excerpt)
defaultErrorComponent: RouteErrorComponent,
```

```tsx
// src/app/RouteErrorComponent.tsx
import { useEffect } from 'react'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { ErrorState } from '@/shared/components/ErrorState'

export function RouteErrorComponent({ error }: ErrorComponentProps) {
  const router = useRouter()
  const queryErrorResetBoundary = useQueryErrorResetBoundary()

  useEffect(() => {
    queryErrorResetBoundary.reset()
  }, [queryErrorResetBoundary])

  return <ErrorState error={error} onRetry={() => router.invalidate()} />
}
```

- Use `router.invalidate()` to retry loader errors (re-runs loaders and resets the route boundary); `reset()` only re-renders.
- For a missing entity in a loader, `throw notFound()` instead of a generic error, so `notFoundComponent` renders.
- Route `onError` is for side effects only; reporting already happens at the root.

## React 19 root callbacks

`createRoot(container, { onCaughtError, onUncaughtError, onRecoverableError })`. Each receives `(error, errorInfo)` with `errorInfo.componentStack`.

- `onCaughtError` - an error caught by a boundary.
- `onUncaughtError` - nothing caught it; the whole root unmounts (the white screen). This should never fire in our apps because the app boundary exists - if it does, the app boundary itself is broken.
- `onRecoverableError` - React recovered automatically (e.g. hydration mismatch); `error.cause` may hold the original.

Pass `Sentry.reactErrorHandler()` to all three (see logging.md). Do not combine with reporting inside `ErrorBoundary.onError`.

## Testing boundaries

- Unit: render a component that throws inside the boundary, assert fallback text and that "Retry" re-renders children after the cause is fixed. Silence expected `console.error` only within that test (`vi.spyOn(console, 'error').mockImplementation(() => {})`, restore after).
- Manual: React DevTools can toggle a boundary into the error state.
