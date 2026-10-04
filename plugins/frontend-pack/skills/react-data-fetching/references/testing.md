# Testing data fetching with MSW

Mock the network, not the hooks. The real `queryOptions`, fetchers, Zod schemas and cache logic
run in tests.

```ts
// features/orders/api/__mocks__/order.handlers.ts
import { http, HttpResponse } from 'msw'; // msw's `http`, not shared/api/http
export const orderHandlers = [
  http.get('*/orders', () => HttpResponse.json([orderFixture()])),
  http.patch('*/orders/:id', async ({ request, params }) =>
    HttpResponse.json({ ...orderFixture({ id: String(params.id) }), ...((await request.json()) as object) })),
];

// src/test/server.ts
export const server = setupServer(...orderHandlers /*, ...other features */);
// vitest.setup.ts: beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); afterEach(() => server.resetHandlers()); afterAll(() => server.close());

// src/test/render.tsx
export function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return { queryClient, ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>) };
}
```

Test cases to write for each feature with server state:
- success renders data (`await screen.findByText(...)`)
- error path: `server.use(http.get('*/orders', () => HttpResponse.json({ message: 'x' }, { status: 500 })))`
  shows the error state and retry works
- empty list shows the empty state
- mutation invalidates: after submit, the list shows the new item (override the GET handler)
- optimistic update rolls back on a 4xx/5xx response
- contract break: a response missing a field yields an `ApiError` of kind `contract`

Rules:
- A fresh `QueryClient` per test (no shared cache between tests).
- `retry: false` in tests, otherwise error tests wait for backoff.
- `onUnhandledRequest: 'error'` so unmocked requests fail loudly.
- Reuse the same handlers in Storybook (`msw-storybook-addon`) and local dev if the backend is not ready.
