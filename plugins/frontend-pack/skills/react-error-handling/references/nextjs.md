# Next.js App Router error handling

Verified against Next.js 16.3 docs. Next.js splits errors into **expected errors** (return them as values) and **uncaught exceptions** (throw; caught by `error.tsx`).

## File conventions

| File | Purpose | Notes |
|---|---|---|
| `app/**/error.tsx` | Segment error boundary | Must be `'use client'`. Wraps `page`, `loading`, `not-found`, nested layouts - **not** the `layout.tsx` of the same segment |
| `app/global-error.tsx` | Root layout errors | Must render its own `<html>` and `<body>`; does not get global styles/theme or `metadata` (use `<title>`) |
| `app/**/not-found.tsx` | 404 UI | Rendered by `notFound()` and unmatched URLs (root one) |
| `catchError` from `next/error` | Component-level boundary helper | Alternative to `react-error-boundary` inside App Router |

Place `error.tsx` at least in `app/` (below root layout) and in each major section (`app/(dashboard)/error.tsx`) so the shell survives.

## error.tsx

Since Next.js 16.3 the recovery prop is `retry` (re-fetches and re-renders the segment). `reset` still exists but only clears state without re-fetching. On Next.js 15 / < 16.2 use `reset`; on 16.2 it was `unstable_retry`. Check the project's `next` version before writing it.

```tsx
// app/(dashboard)/error.tsx
'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/shared/components/ErrorState'
import { reportError } from '@/shared/lib/reportError'

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    reportError(error, error.digest ? { extra: { digest: error.digest } } : {})
  }, [error])

  return (
    <div className="p-6">
      <ErrorState error={error} onRetry={retry} title="This section failed to load" />
      {error.digest && <p className="mt-2 text-sm text-muted-foreground">Error code: {error.digest}</p>}
    </div>
  )
}
```

- In production, errors from Server Components arrive with a **generic message** and a `digest` (hash to match server logs). Never rely on `error.message` there - and never show it.
- Errors from Client Components keep the original message - still never show it; use `getUserMessage`.
- In Next.js, boundaries are not created via `createRoot`, so report in `error.tsx`/`global-error.tsx` with `reportError`, and capture server errors with `onRequestError` (see logging.md). This is the one place where boundary-level reporting is correct.

## global-error.tsx

```tsx
'use client'

import { useEffect } from 'react'
import { reportError } from '@/shared/lib/reportError'

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportError(error, error.digest ? { extra: { digest: error.digest } } : {})
  }, [error])

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', padding: 24 }}>
        <title>Something went wrong</title>
        <h1>Something went wrong</h1>
        <p>Reload the page. If it happens again, contact support.</p>
        <button onClick={() => retry()}>Try again</button>
      </body>
    </html>
  )
}
```

Keep it dependency-free (inline styles, no providers, no shadcn) - it renders when the root layout itself crashed.

## notFound()

```tsx
// app/orders/[id]/page.tsx
import { notFound } from 'next/navigation'
import { isApiError } from '@/shared/api/errors'

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrder(id).catch((e: unknown) => {
    if (isApiError(e) && e.status === 404) notFound() // expected: render not-found.tsx
    throw e // anything else goes to error.tsx
  })
  return <OrderView order={order} />
}
```

A 404 is expected: do not let it reach `error.tsx`.

## Server Actions: expected errors as values

Do not throw for validation or business errors in server actions - return a typed result. Throw only for unexpected failures (goes to `error.tsx`).

```ts
// src/features/users/api/user.actions.ts
'use server'

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }

export async function createUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: 'Check the form fields.', fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }
  const res = await usersRepo.create(parsed.data)
  if (res.kind === 'email_taken') {
    return { ok: false, message: 'This email is already registered.', fieldErrors: { email: ['Email is already registered'] } }
  }
  return { ok: true, data: { id: res.id } }
}
```

On the client, with React Hook Form:

```ts
const onSubmit = form.handleSubmit(async (values) => {
  const result = await createUserAction(values)
  if (!result.ok) {
    for (const [field, msgs] of Object.entries(result.fieldErrors ?? {})) {
      form.setError(field as keyof FormValues, { type: 'server', message: msgs[0] })
    }
    form.setError('root.server', { type: 'server', message: result.message })
    return
  }
  toast.success('User created')
})
```

Never return raw `error.message` from a caught exception in an action result - it can leak DB/infra details. Log it server-side and return a generic message.

## Route handlers and Server Components fetching data

- Server Components call the same `shared/api` functions (or server-only data layer). `http()` throws `ApiError`; pages catch 404 (`isApiError(e) && e.status === 404`) and call `notFound()`, everything else goes to `error.tsx`. Server actions still return values (`ActionResult`) for expected failures.
- Route handlers (`app/api/**/route.ts`) return Problem Details JSON with a stable `code`, so the client `http()` parses it the same way as the external backend.
