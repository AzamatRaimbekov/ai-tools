# Logging and reporting (Sentry)

Team default: `@sentry/react` (Vite SPA) or `@sentry/nextjs` (Next.js). Feature code depends only on `shared/lib/reportError.ts`.

## Init (Vite SPA)

```ts
// src/app/sentry.ts - imported first in main.tsx
import * as Sentry from '@sentry/react'
import { env } from '@/shared/config/env'
import { scrubEvent } from '@/shared/lib/scrub'

Sentry.init({
  dsn: env.SENTRY_DSN,
  enabled: env.MODE === 'production' || env.MODE === 'staging',
  environment: env.MODE,
  release: env.RELEASE, // git SHA, same value used for source map upload
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: scrubEvent,
  beforeBreadcrumb: (crumb) => (crumb.category === 'console' ? null : crumb),
  ignoreErrors: ['AbortError', 'ResizeObserver loop completed with undelivered notifications'],
})
```

```tsx
// src/main.tsx
import './app/sentry'

createRoot(document.getElementById('root')!, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(<App />)
```

The SDK's global handlers already capture `window.onerror` and `unhandledrejection`. Do not add duplicate listeners.

Session Replay: only with `maskAllText: true`, `blockAllMedia: true`, and approval from the project lead (privacy review).

## Init (Next.js)

- `instrumentation-client.ts` - client `Sentry.init` (same options as above).
- `sentry.server.config.ts`, `sentry.edge.config.ts` - server/edge init, imported from `instrumentation.ts` `register()`.
- `instrumentation.ts`: `export const onRequestError = Sentry.captureRequestError` - captures errors in Server Components, route handlers, server actions, middleware.
- `error.tsx` / `global-error.tsx`: `reportError(error, ...)` in `useEffect` (never `Sentry.*` directly).
- `next.config.ts`: wrap with `withSentryConfig(nextConfig, { authToken: process.env.SENTRY_AUTH_TOKEN, widenClientFileUpload: true })`.

## reportError.ts

Vite imports `@sentry/react`; in Next.js the same file imports `@sentry/nextjs` (same wrapper API, callers do not change).

```ts
// src/shared/lib/reportError.ts
import * as Sentry from '@sentry/react' // Next.js: '@sentry/nextjs'
import { isApiError, isUnexpected, toError } from '@/shared/api/errors'

interface ReportContext {
  feature?: string
  componentStack?: string
  extra?: Record<string, string | number | boolean>
}

/** Reports unexpected errors. Returns the Sentry event id (for "Error code" in UI) or undefined. */
export function reportError(error: unknown, context: ReportContext = {}): string | undefined {
  if (!isUnexpected(error)) return undefined

  return Sentry.captureException(toError(error), (scope) => {
    if (context.feature) scope.setTag('feature', context.feature)
    if (isApiError(error)) {
      scope.setTag('api.kind', error.kind)
      scope.setTag('api.status', String(error.status ?? 'none'))
      scope.setContext('api', {
        method: error.details.method,
        url: error.details.url,
        code: error.details.code,
        requestId: error.details.requestId,
      })
    }
    if (context.componentStack) scope.setContext('react', { componentStack: context.componentStack })
    if (context.extra) scope.setContext('extra', context.extra)
    return scope
  })
}
```

Never pass form values, tokens, or full API payloads as `extra`.

## Scrubbing

```ts
// src/shared/lib/scrub.ts
import type { ErrorEvent } from '@sentry/react'

const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie|session|api[-_]?key|card|cvv|iban|phone|email/i
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/g
const LONG_DIGITS = /\b\d{9,19}\b/g // phone, card, account numbers

const scrubString = (value: string) => value.replace(EMAIL, '[email]').replace(LONG_DIGITS, '[number]')

function scrubObject(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[depth]'
  if (typeof value === 'string') return scrubString(value)
  if (Array.isArray(value)) return value.map((v) => scrubObject(v, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? '[redacted]' : scrubObject(v, depth + 1)]),
    )
  }
  return value
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.cookies
    delete event.request.data
    if (event.request.headers) event.request.headers = scrubObject(event.request.headers) as Record<string, string>
    if (event.request.url) event.request.url = event.request.url.split('?')[0]
  }
  if (event.user) event.user = { id: event.user.id }
  event.extra = scrubObject(event.extra) as typeof event.extra
  event.contexts = scrubObject(event.contexts) as typeof event.contexts
  event.exception?.values?.forEach((ex) => {
    if (ex.value) ex.value = scrubString(ex.value)
  })
  event.breadcrumbs = event.breadcrumbs?.map((b) => ({
    ...b,
    message: b.message ? scrubString(b.message) : b.message,
    data: scrubObject(b.data) as typeof b.data,
  }))
  return event
}
```

Also enable server-side data scrubbing in the Sentry project settings (defense in depth).

Identify users by id only: `Sentry.setUser({ id: user.id })` after login, `Sentry.setUser(null)` on logout.

## Source maps

- Generate maps in CI build (`build.sourcemap: 'hidden'` in Vite), upload with `@sentry/vite-plugin` using `SENTRY_AUTH_TOKEN` from CI secrets, then delete `.map` files from the deploy artifact (`sourcemaps.filesToDeleteAfterUpload`).
- `release` in `Sentry.init` must equal the release used for upload (git SHA).
- Never commit `SENTRY_AUTH_TOKEN`. The DSN is public by design and may live in `.env`.

## Console policy

- ESLint: `no-console: ['error', { allow: ['warn', 'error'] }]`.
- `console.error` is acceptable only in dev-only diagnostics or tests; production reporting goes through `reportError`.
- Strip `console.*` from production builds if desired (`esbuild.drop: ['console', 'debugger']` in Vite; `compiler.removeConsole` in Next.js) - but this is not a substitute for the lint rule.

## Related lint rules

| Rule | Why |
|---|---|
| `no-empty` (with `allowEmptyCatch: false`) | Forbids empty catch |
| `@typescript-eslint/no-floating-promises` | Unawaited promises become unhandled rejections |
| `@typescript-eslint/no-misused-promises` | Async handlers passed where void is expected |
| `@typescript-eslint/only-throw-error` | Throw `Error` subclasses only |
| `@typescript-eslint/use-unknown-in-catch-callback-variable` | `.catch((e: unknown) => ...)` |
| `prefer-promise-reject-errors` | `Promise.reject(new Error(...))` |
| tsconfig `strict` (includes `useUnknownInCatchVariables`) | `catch (e)` is `unknown` |
