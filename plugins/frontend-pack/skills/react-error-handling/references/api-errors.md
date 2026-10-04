# Typed API errors and the HTTP client (`src/shared/api`)

Files:

```
src/shared/api/    no barrel: import concrete modules (@/shared/api/http, @/shared/api/errors)
  errors.ts        ApiError, ApiErrorKind, guards, toError
  errorBody.ts     Zod schema for the backend error body (single place to adapt)
  http.ts          http<T>() - the only fetch wrapper in the app
  queryClient.ts   QueryClient with team defaults (see tanstack-query.md)
src/shared/lib/
  getUserMessage.ts
  applyServerErrors.ts
  reportError.ts
```

## errors.ts

```ts
export type ApiErrorKind =
  | 'network'    // fetch rejected: DNS, offline, CORS
  | 'timeout'    // our timeout fired
  | 'aborted'    // caller cancelled (unmount, key change) - not a failure
  | 'http'       // non-2xx response without field errors
  | 'validation' // 400/422 with field errors
  | 'contract'   // 2xx but body failed the Zod schema: backend/frontend mismatch

export interface ApiErrorDetails {
  status?: number
  code?: string
  fieldErrors?: Record<string, string[]>
  requestId?: string
  method?: string
  url?: string // path only, no query string (may contain PII)
  cause?: unknown
}

export class ApiError extends Error {
  override readonly name = 'ApiError'

  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly details: ApiErrorDetails = {},
  ) {
    super(message, { cause: details.cause })
  }

  get status(): number | undefined {
    return this.details.status
  }

  get isServerError(): boolean {
    return (this.status ?? 0) >= 500 || this.kind === 'contract'
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError

export const isCancelled = (error: unknown): boolean =>
  (isApiError(error) && error.kind === 'aborted') ||
  (error instanceof DOMException && error.name === 'AbortError')

export function isRetryable(error: unknown): boolean {
  if (!isApiError(error)) return false
  if (error.kind === 'network' || error.kind === 'timeout') return true
  const status = error.status ?? 0
  return status === 408 || status === 429 || status >= 500
}

/** Unexpected = should reach an error boundary and be reported. */
export function isUnexpected(error: unknown): boolean {
  if (isCancelled(error)) return false
  if (!isApiError(error)) return true // TypeError, bug in queryFn, etc.
  return error.isServerError
}

/** Normalize anything thrown into an Error (for reporters and boundaries). */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string') return new Error(value)
  try {
    return new Error(JSON.stringify(value))
  } catch {
    return new Error(String(value)) // circular structures; String() is always safe
  }
}
```

Why a class with a `kind` discriminant, not a plain union: `instanceof` survives `throw`/`catch` and TanStack Query, `cause` chains work, and Sentry groups by `name`. Use `switch (error.kind)` for exhaustive handling; add a `never` default when you need exhaustiveness checks.

## errorBody.ts

Adapt this schema to the backend contract once. Default assumes RFC 9457 Problem Details with an `errors` extension; the fallback accepts `{ message }`.

```ts
import { z } from 'zod'

export const errorBodySchema = z.looseObject({
  title: z.string().optional(),
  detail: z.string().optional(),
  message: z.string().optional(),
  code: z.string().optional(),
  requestId: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
})

export type ErrorBody = z.infer<typeof errorBodySchema>
```

## http.ts

```ts
import type { z } from 'zod'
import { env } from '@/shared/config/env'
import { ApiError } from './errors'
import { errorBodySchema } from './errorBody'

const DEFAULT_TIMEOUT_MS = 15_000

interface HttpOptions<S extends z.ZodType> extends Omit<RequestInit, 'body'> {
  schema: S
  body?: unknown
  timeoutMs?: number
}

export async function http<S extends z.ZodType>(
  path: string,
  { schema, body, timeoutMs = DEFAULT_TIMEOUT_MS, signal, headers, ...init }: HttpOptions<S>,
): Promise<z.infer<S>> {
  const method = init.method ?? 'GET'
  const meta = { method, url: path.split('?')[0] }
  const timeout = AbortSignal.timeout(timeoutMs)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

  let res: Response
  try {
    res = await fetch(`${env.API_URL}${path}`, {
      ...init,
      method,
      signal: combined,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    if (signal?.aborted) throw new ApiError('aborted', 'Request aborted', { ...meta, cause })
    if (timeout.aborted) throw new ApiError('timeout', `Timed out after ${timeoutMs}ms`, { ...meta, cause })
    throw new ApiError('network', 'Network request failed', { ...meta, cause })
  }

  const requestId = res.headers.get('x-request-id') ?? undefined

  if (!res.ok) {
    const raw: unknown = await res.json().catch(() => undefined) // non-JSON error page
    const parsed = errorBodySchema.safeParse(raw)
    const errorBody = parsed.success ? parsed.data : {}
    const fieldErrors = errorBody.errors
    const kind = fieldErrors && (res.status === 400 || res.status === 422) ? 'validation' : 'http'
    throw new ApiError(kind, `${method} ${meta.url} -> ${res.status}`, {
      ...meta,
      status: res.status,
      code: errorBody.code,
      fieldErrors,
      requestId: errorBody.requestId ?? requestId,
    })
  }

  if (res.status === 204) return schema.parse(undefined)

  const json: unknown = await res.json().catch((cause: unknown) => {
    throw new ApiError('contract', 'Response is not valid JSON', { ...meta, status: res.status, requestId, cause })
  })
  const result = schema.safeParse(json)
  if (!result.success) {
    throw new ApiError('contract', `Response for ${meta.url} does not match schema`, {
      ...meta,
      status: res.status,
      requestId,
      cause: result.error, // ZodError: issues go to Sentry, never to the user
    })
  }
  return result.data
}
```

Notes:
- `ApiError.message` is for developers and logs. It must not contain request bodies, tokens, or query strings. Users see `getUserMessage(error)` only.
- The server's `detail`/`message` text is deliberately **not** shown to users: it may be technical, untranslated, or leak internals. Map by `code` instead. If the backend guarantees user-safe localized text for a specific `code`, whitelist that code explicitly.
- `AbortSignal.any` and `AbortSignal.timeout` are Baseline 2024; if you must support older browsers, add a small polyfill in `shared/lib`, do not drop the timeout.
- A 401 handler (refresh token / redirect to login) lives in `http.ts` or in the router's auth guard - not in each feature.

## Feature API usage

Follows the `react-data-fetching` layout: `features/<f>/api/<entity>.schemas.ts`, `.api.ts`, `.queries.ts`.

```ts
// src/features/users/api/user.schemas.ts
import { z } from 'zod'

export const userSchema = z.object({ id: z.string(), name: z.string(), email: z.email() })
export type User = z.infer<typeof userSchema>

// src/features/users/api/user.api.ts
import { http } from '@/shared/api/http'
import { userSchema } from './user.schemas'

export const getUser = (id: string, signal?: AbortSignal) =>
  http(`/users/${id}`, { schema: userSchema, signal })

// src/features/users/api/user.queries.ts
import { queryOptions } from '@tanstack/react-query'
import { getUser } from './user.api'

export const userQueries = {
  all: () => ['users'] as const,
  details: () => [...userQueries.all(), 'detail'] as const,
  detail: (id: string) =>
    queryOptions({ queryKey: [...userQueries.details(), id] as const, queryFn: ({ signal }) => getUser(id, signal) }),
}
```

## Result type (when to use)

Use a `Result` union only where an operation has **expected** failure outcomes that callers must branch on and that are not HTTP errors - e.g. Next.js server actions, parsing user-uploaded files, multi-step client workflows.

```ts
export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E }
```

Do not wrap every HTTP call in `Result`: TanStack Query already gives `{ data, error, status }`, and the query layer needs thrown errors for retries and boundaries. Do not add `neverthrow`/`fp-ts`/`effect` for this.

## applyServerErrors.ts (with field whitelist)

```ts
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/shared/api/errors'
import { getUserMessage } from './getUserMessage'

export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): void {
  const fieldErrors = isApiError(error) ? error.details.fieldErrors : undefined
  let unmatched = !fieldErrors
  let shouldFocus = true

  for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
    if ((knownFields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message: messages[0] }, { shouldFocus })
      shouldFocus = false // focus only the first matched field
    } else {
      unmatched = true
    }
  }
  if (unmatched) setError('root.server', { type: 'server', message: getUserMessage(error) })
}
```

Pass `knownFields` from the Zod form schema: `formSchema.keyof().options`. Field messages from the server are shown only if the backend contract guarantees they are user-safe; otherwise map by code per field.
