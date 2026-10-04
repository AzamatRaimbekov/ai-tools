# HTTP client, typed errors, Zod validation

One wrapper in `src/shared/api/http.ts`. Features never call `fetch` directly.

## Why native fetch

- Available in browsers, Node 18+, Next.js Server Components and route handlers; Next.js
  instruments `fetch` for its own caching.
- `AbortSignal` support is native; TanStack Query hands a signal to every `queryFn`.
- It does not reject on 4xx/5xx, so the wrapper must throw - Query only sees a failure when the
  promise rejects.
- axios/ky add interceptors and retries. Interceptors are replaced by the wrapper; retries
  belong to TanStack Query (one retry policy, not two). Keep axios/ky only in projects that
  already depend on them, and only inside `shared/api/`.

## shared/api/http.ts and ApiError

Canonical implementation: `react-error-handling` - [api-errors.md](../../react-error-handling/references/api-errors.md)
(`errors.ts`, `errorBody.ts`, `http.ts`). Do not write a second one. What fetchers rely on:

- `http(path, { schema, signal, method, body, timeoutMs })` parses the response with `schema` and returns `z.infer<S>`.
- Every failure is an `ApiError(kind, message, details)` with `kind` `network | timeout | aborted | http | validation | contract`;
  `error.status` is a getter over `details.status`. Timeouts use `AbortSignal.timeout`; an aborted caller signal becomes `kind: 'aborted'`.
- Guards from `@/shared/api/errors`: `isApiError`, `isCancelled`, `isRetryable` (network, timeout, 408, 429, 5xx), `isUnexpected`, `toError`.

Auth (token refresh, 401 -> redirect to login) is handled in `http.ts` or the router's auth guard, never per component.

## Schemas and fetchers

```ts
// features/orders/api/order.schemas.ts
export const orderSchema = z.object({
  id: z.string(),
  status: z.enum(['new', 'paid', 'shipped']),
  total: z.number(),
  createdAt: z.coerce.date(),
});
export type Order = z.infer<typeof orderSchema>;

export const orderPageSchema = z.object({ items: z.array(orderSchema), nextCursor: z.string().nullable() });

// shared/lib/toSearchParams.ts
export function toSearchParams(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, String(value));
  return search.toString();
}

// features/orders/api/order.api.ts
export const getOrders = (filters: OrderFilters, signal?: AbortSignal) =>
  http(`/orders?${toSearchParams(filters)}`, { schema: z.array(orderSchema), signal });

export const updateOrder = ({ id, ...patch }: UpdateOrderInput) =>
  http(`/orders/${id}`, { method: 'PATCH', body: patch, schema: orderSchema });
```

Rules:
- Types come from `z.infer`, or from OpenAPI codegen. Never hand-write a DTO that duplicates a schema.
- Do not use `as Order` / `as any` on responses.
- Use `z.looseObject()` / `.loose()` (Zod 4) only when the UI really needs unknown fields; default strip is fine.
- A `contract` error means the backend changed - surface it (Sentry), do not retry. The `ZodError` is in `error.cause`.

## Error typing in components

The shared `queryClient.ts` registers `defaultError: ApiError` (honest because every `queryFn` goes
through `http()`; see `react-error-handling` [tanstack-query.md](../../react-error-handling/references/tanstack-query.md)),
so `error.status` is typed. Outside query results (`catch (error)`), narrow first:

```tsx
if (isApiError(error) && error.status === 404) return <NotFound />;
```

## With OpenAPI

If the backend publishes an OpenAPI spec, generate types with `openapi-typescript` and use
`openapi-fetch` inside `shared/api/` (or generate Zod schemas with `@hey-api/openapi-ts`'s zod
plugin / orval's zod output). Fetchers still live in `features/<f>/api/*.api.ts` and still feed
`queryOptions`; generated per-endpoint hooks with their own key scheme are not used because they
bypass the feature key factory and invalidation conventions.
