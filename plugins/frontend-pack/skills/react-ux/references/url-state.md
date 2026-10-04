# URL as state

Put in the URL: filters, search query, sort, page / cursor, page size, active tab, selected item or open detail panel, date range, view mode (table/board).

Keep out of the URL: unsaved form input, hover/open menus, secrets or PII, anything huge (use an ID instead).

## TanStack Router (Vite SPA)

```tsx
// src/routes/orders.tsx - declares the route only (react-architecture section 1)
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { OrdersPage } from '@/pages/orders/OrdersPage'

const ordersSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  q: z.string().catch(''),
  status: z.enum(['all', 'open', 'closed']).catch('all'),
  sort: z.enum(['created', '-created']).catch('-created'),
})

export const Route = createFileRoute('/orders')({
  validateSearch: ordersSearchSchema,
  component: OrdersPage,
})
```

```tsx
// src/pages/orders/OrdersPage.tsx
import { getRouteApi } from '@tanstack/react-router'

const route = getRouteApi('/orders') // typed access without importing the route file

export function OrdersPage() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const setStatus = (status: typeof search.status) =>
    navigate({ search: (prev) => ({ ...prev, status, page: 1 }) })
  const query = useQuery(orderQueries.list(search)) // search object is the query key input
  // ...
}
```

`.catch()` defaults make malformed links degrade gracefully instead of throwing. Strip defaults from the URL with `search.middlewares: [stripSearchParams(defaults)]` to keep links clean.

## Next.js App Router

Use `nuqs` (adapter `NuqsAdapter` in the root layout).

```tsx
const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
const [status, setStatus] = useQueryState('status', parseAsStringLiteral(['all', 'open', 'closed']).withDefault('all'))
const [q, setQ] = useQueryState('q', parseAsString.withDefault('').withOptions({ throttleMs: 300 }))
```

- Use `shallow: false` only when a Server Component must re-render with the new params.
- Group related params with `useQueryStates` so one change updates them atomically (e.g. status + page reset).

## History rules

| Change | History |
|---|---|
| Typing in search | `replace` (debounced) |
| Tab, page, filter chip, sort | `push` - Back undoes it |
| Normalizing invalid params | `replace` |

## Behaviour rules

- Changing filters/search/sort resets page to 1.
- After a deep link, the UI reflects every param (selected chips, filled search box, active tab).
- Scroll to top of list on page change; restore scroll on Back (router scroll restoration).
- Provide "Clear filters" whenever any filter is non-default.
