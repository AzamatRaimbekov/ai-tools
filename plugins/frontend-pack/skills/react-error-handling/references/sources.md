# Sources and version notes

Researched 2026-10-04. npm versions at that date: react 19.3.0, next 16.3.8, @tanstack/react-query 5.104.1, @tanstack/react-router 1.170.41, react-error-boundary 6.1.6, @sentry/react 11.4.0, zod 4.6.5, sonner 2.0.8.

## React
- createRoot options `onCaughtError`, `onUncaughtError`, `onRecoverableError` - https://react.dev/reference/react-dom/client/createRoot
- Error boundaries (`getDerivedStateFromError`, `componentDidCatch`) - https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

## react-error-boundary
- README, API (`ErrorBoundary`, `FallbackComponent`, `fallbackRender`, `onError`, `onReset`, `resetKeys`, `useErrorBoundary`), v6 `error: unknown`, `getErrorMessage`, React 19 transitions note - https://github.com/bvaughn/react-error-boundary

## TanStack Query
- TkDodo, "React Query Error Handling" (throwOnError function form, QueryCache onError only when data exists) - https://tkdodo.eu/blog/react-query-error-handling
- QueryErrorResetBoundary - https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary
- TypeScript `Register` (`defaultError`, `queryMeta`, `mutationMeta`) - https://tanstack.com/query/latest/docs/framework/react/typescript
- Query retries - https://tanstack.com/query/latest/docs/framework/react/guides/query-retries

## TanStack Router
- Data loading, `errorComponent`, `onError`, `router.invalidate()` vs `reset()` - https://tanstack.com/router/latest/docs/framework/react/guide/data-loading
- External data loading with `useQueryErrorResetBoundary` - https://tanstack.com/router/latest/docs/framework/react/guide/external-data-loading

## Next.js (16.3)
- Error handling guide (expected errors as values, `catchError`, event handlers, `startTransition`) - https://nextjs.org/docs/app/getting-started/error-handling
- `error.js` reference (`retry` stable in 16.3, `unstable_retry` 16.2, `reset`, `digest`, global-error) - https://nextjs.org/docs/app/api-reference/file-conventions/error

## Sentry
- React error boundary + `Sentry.reactErrorHandler` for React 19 root options - https://docs.sentry.io/platforms/javascript/guides/react/features/error-boundary/
- Next.js manual setup (`instrumentation-client.ts`, `onRequestError = Sentry.captureRequestError`, global-error capture, `withSentryConfig`) - https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
- Sensitive data scrubbing - https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/

## Web platform
- `AbortSignal.timeout()` / `AbortSignal.any()` - https://developer.mozilla.org/docs/Web/API/AbortSignal
- RFC 9457 Problem Details for HTTP APIs - https://www.rfc-editor.org/rfc/rfc9457

## Version-sensitive points
- Next.js `error.tsx` prop: `retry` (>= 16.3), `unstable_retry` (16.2), `reset` only (<= 16.1).
- react-error-boundary v6 is ESM-only and types `error` as `unknown`; v4/v5 typed it `Error`.
- TanStack Query v5 `MutationCache.onError` signature: `(error, variables, onMutateResult, mutation, context)`; older v5 minors name the third arg `context`. Position of `mutation` (4th) is unchanged.
- Zod 4: `z.looseObject`, `z.email()`, `z.flattenError`, `z.prettifyError` (v3 used `.passthrough()`, `z.string().email()`, `error.flatten()`).
