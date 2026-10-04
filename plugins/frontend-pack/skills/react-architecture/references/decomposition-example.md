# Decomposition walkthrough

A realistic oversized component and how to split it with the procedure from SKILL.md section 2.

## Before: `features/orders/components/OrdersPanel.tsx` (~230 lines)

Abbreviated. The real file mixes everything:

```tsx
export function OrdersPanel() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [editing, setEditing] = useState<Order | null>(null);
  const [filtered, setFiltered] = useState<Order[]>([]);           // redundant state
  const { data: orders = [], isPending, error } = useQuery({
    queryKey: ['orders'],                                            // inline key
    queryFn: () => fetch('/api/orders').then((r) => r.json()),     // no schema, no signal
  });

  useEffect(() => {                                                  // effect for derived data
    setFiltered(
      orders.filter((o) =>
        (status === 'all' || o.status === status) &&
        o.customer.toLowerCase().includes(search.toLowerCase()),
      ),
    );
  }, [orders, search, status]);

  const formatPrice = (cents: number) =>                             // pure helper inline
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KGS' }).format(cents / 100);

  if (isPending) return <div>...30 lines of skeleton markup...</div>;
  if (error) return <div>...error markup...</div>;

  return (
    <div>
      {/* 40 lines of toolbar: search input, status select, export button */}
      {/* 60 lines of table with row markup, status badge switch, actions menu */}
      {/* 50 lines of edit dialog with a form */}
    </div>
  );
}
```

## Step 1: list responsibilities

1. Load orders from the server.
2. Hold filter values (search, status).
3. Filter orders.
4. Format prices and status labels.
5. Render toolbar.
6. Render table and rows.
7. Render loading / error states.
8. Edit an order in a dialog.

Eight responsibilities -> at least five files.

## Step 2: pure code -> `lib/`

```ts
// features/orders/lib/filterOrders.ts
import type { Order, OrderStatusFilter } from '../types';

export function filterOrders(orders: Order[], search: string, status: OrderStatusFilter): Order[] {
  const query = search.trim().toLowerCase();
  return orders.filter(
    (order) =>
      (status === 'all' || order.status === status) &&
      order.customer.toLowerCase().includes(query),
  );
}
```

```ts
// shared/lib/formatPrice.ts  (domain-agnostic -> shared)
const priceFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KGS' });

export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}
```

## Step 3: stateful logic -> `hooks/` and `api/`

Server data goes through a `queryOptions` factory in `api/` (see the team data-fetching skill for key conventions). Filters go to the URL because they should survive reload.

```ts
// features/orders/api/order.queries.ts (fetcher getOrders in order.api.ts, schema in order.schemas.ts)
import { queryOptions } from '@tanstack/react-query';
import { getOrders } from './order.api';

export const orderQueries = {
  all: () => ['orders'] as const,
  lists: () => [...orderQueries.all(), 'list'] as const,
  list: () =>
    queryOptions({ queryKey: orderQueries.lists(), queryFn: ({ signal }) => getOrders(signal) }),
};
```

```ts
// features/orders/hooks/useFilteredOrders.ts
import { useQuery } from '@tanstack/react-query';
import { orderQueries } from '../api/order.queries';
import { filterOrders } from '../lib/filterOrders';
import type { OrderStatusFilter } from '../types';

export function useFilteredOrders(search: string, status: OrderStatusFilter) {
  return useQuery({
    ...orderQueries.list(),
    select: (orders) => filterOrders(orders, search, status), // derived from the cache, no effect
  });
}
```

The redundant `filtered` state and its `useEffect` are gone: filtering is derived from the cached list via `select`.

## Step 4: JSX regions -> `components/`

```
features/orders/components/
  OrdersPanel.tsx          composes the pieces below (~50 lines)
  OrdersToolbar.tsx        search + status select, receives values and onChange
  OrdersTable.tsx          table shell, maps rows
  OrderRow.tsx             one row
  OrderStatusBadge.tsx     status -> badge via config map
  OrdersTableSkeleton.tsx  loading state
  EditOrderDialog.tsx      dialog + form (form logic in hooks/useEditOrderForm.ts)
```

```tsx
// features/orders/components/OrdersPanel.tsx
import { useState } from 'react';
import { QueryState } from '@/shared/components/QueryState';
import { useFilteredOrders } from '../hooks/useFilteredOrders';
import type { Order, OrderStatusFilter } from '../types';
import { EditOrderDialog } from './EditOrderDialog';
import { OrdersTable } from './OrdersTable';
import { OrdersTableSkeleton } from './OrdersTableSkeleton';
import { OrdersToolbar } from './OrdersToolbar';

type OrdersPanelProps = {
  search: string;
  status: OrderStatusFilter;
  onFiltersChange: (next: { search?: string; status?: OrderStatusFilter }) => void;
};

export function OrdersPanel({ search, status, onFiltersChange }: OrdersPanelProps) {
  const [editingId, setEditingId] = useState<Order['id'] | null>(null);
  const query = useFilteredOrders(search, status);

  return (
    <section className="flex flex-col gap-4">
      <OrdersToolbar search={search} status={status} onChange={onFiltersChange} />
      <QueryState query={query} loading={<OrdersTableSkeleton />}>
        {(orders) => <OrdersTable orders={orders} onEdit={setEditingId} />}
      </QueryState>
      {editingId !== null && (
        <EditOrderDialog key={editingId} orderId={editingId} onClose={() => setEditingId(null)} />
      )}
    </section>
  );
}
```

Notes:
- `QueryState` (shared, from `react-ux`) renders skeleton / `ErrorState` with Retry / data.
- `editingId` stores an id, not a copy of the order; the dialog reads fresh data by id.
- `key={editingId}` resets the dialog form state when a different order is opened, with no effect.
- The page (`pages/orders/OrdersPage.tsx` or the Next `page.tsx`) reads search params and passes `search`, `status`, `onFiltersChange`.

## Step 5: flatten branching

```tsx
// features/orders/components/OrderStatusBadge.tsx
import { Badge } from '@/shared/ui/badge';
import type { OrderStatus } from '../types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  new: { label: 'Новый', variant: 'default' },
  shipped: { label: 'Отправлен', variant: 'secondary' },
  cancelled: { label: 'Отменён', variant: 'destructive' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, variant } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
```

`Record<OrderStatus, ...>` makes TypeScript fail when a new status is added and not configured.

## Step 6: public API

```ts
// features/orders/index.ts
export { OrdersPanel } from './components/OrdersPanel';
export { orderQueries } from './api/order.queries';
export type { Order, OrderStatus, OrderStatusFilter } from './types';
```

Everything else stays private to the feature.

## Result

| File | Lines (approx.) |
|------|-----------------|
| OrdersPanel.tsx | 35 |
| OrdersToolbar.tsx | 45 |
| OrdersTable.tsx | 40 |
| OrderRow.tsx | 40 |
| OrderStatusBadge.tsx | 18 |
| EditOrderDialog.tsx | 80 |
| useFilteredOrders.ts, useEditOrderForm.ts | 15, 50 |
| filterOrders.ts, order.queries.ts | 12, 15 |

Each file has one reason to change and can be read without scrolling.
