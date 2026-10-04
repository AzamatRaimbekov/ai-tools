# Extraction examples

Each example shows the repeated code, the extraction, and where the file goes.

## 1. Pure function -> `lib/`

```tsx
// Repeated in OrderRow.tsx, InvoiceRow.tsx, CartSummary.tsx
<span>{(order.totalCents / 100).toFixed(2)} сом</span>
```

```ts
// shared/lib/formatPrice.ts  (no domain knowledge -> shared)
const formatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KGS' });

export function formatPrice(cents: number): string {
  return formatter.format(cents / 100);
}
```

Money formatting is duplicated knowledge: extract on the second occurrence.

## 2. Stateful logic -> custom hook

```tsx
// Repeated in three search inputs
const [value, setValue] = useState('');
const [debounced, setDebounced] = useState('');
useEffect(() => {
  const id = setTimeout(() => setDebounced(value), 300);
  return () => clearTimeout(id);
}, [value]);
```

```ts
// shared/hooks/useDebouncedValue.ts
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
```

Usage: `const debouncedSearch = useDebouncedValue(search);`. The hook has one job and a name that says it.

Feature-specific example (stays in the feature):

```ts
// features/orders/hooks/useOrderFilters.ts  (Vite + TanStack Router)
import { getRouteApi } from '@tanstack/react-router';
import type { OrderStatusFilter } from '../types';

const ordersRoute = getRouteApi('/orders');

export function useOrderFilters() {
  const { search, status } = ordersRoute.useSearch();
  const navigate = ordersRoute.useNavigate();

  function setFilters(next: { search?: string; status?: OrderStatusFilter }) {
    void navigate({ search: (prev) => ({ ...prev, ...next, page: 1 }) });
  }

  return { search, status, setFilters };
}
```

## 3. Repeated JSX -> component

```tsx
// Repeated in OrdersPage, ClientsPage, ProductsPage with different text
<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center">
  <PackageIcon className="size-10 text-muted-foreground" />
  <h3 className="text-lg font-semibold">Заказов пока нет</h3>
  <p className="text-sm text-muted-foreground">Создайте первый заказ</p>
  <Button onClick={onCreate}>Создать</Button>
</div>
```

```tsx
// shared/components/EmptyState.tsx (canonical code: react-ux async-states.md)
import type { ReactNode } from 'react';

type EmptyStateProps = { title: string; description?: string; action?: ReactNode; icon?: ReactNode };

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 py-12 text-center">
      {icon}
      <p className="font-medium">{title}</p>
      {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      {action}
    </div>
  );
}
```

`action` and `icon` are slots (`ReactNode`), not `actionLabel` + `onAction` + `actionVariant` or `icon: LucideIcon` props.

## 4. Repeated card markup -> the compound `StatCard` from `react-ui`

```tsx
// Repeated in DashboardPage, ReportsPage, ClientPage; colors hard-coded per copy
<div className="rounded-xl border border-emerald-500/40 p-4">
  <p className="text-sm text-gray-500">Выручка</p>
  <p className="text-2xl font-semibold">{revenue}</p>
</div>
```

Do not write a new card component: use `StatCard` / `StatCardLabel` / `StatCardValue` from `shared/components/StatCard/` (code in `react-ui` composition-patterns.md). Visual variants are a `cva` `tone` on the root, built on semantic tokens (`border-success/40 bg-success/5`, `border-destructive/40 bg-destructive/5`), never raw palette colors.

```tsx
import { StatCard } from '@/shared/components/StatCard/StatCard';
import { StatCardLabel } from '@/shared/components/StatCard/StatCardLabel';
import { StatCardValue } from '@/shared/components/StatCard/StatCardValue';

<StatCard tone="positive">
  <StatCardLabel>{t('dashboard.revenue')}</StatCardLabel>
  <StatCardValue>{formatPrice(revenue)}</StatCardValue>
</StatCard>
```

Bad: `<StatCard highlighted />`, `<StatCard danger />`, or three near-identical card components.

## 5. Branching over a union -> config map

```tsx
// Repeated switch in OrderRow, OrderDetails, OrderTimeline
{status === 'new' ? 'Новый' : status === 'shipped' ? 'Отправлен' : 'Отменён'}
```

```ts
// features/orders/lib/orderStatusConfig.ts
import type { OrderStatus } from '../types';

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badge: 'default' | 'secondary' | 'destructive' }
> = {
  new: { label: 'Новый', badge: 'default' },
  shipped: { label: 'Отправлен', badge: 'secondary' },
  cancelled: { label: 'Отменён', badge: 'destructive' },
};
```

Adding `'returned'` to `OrderStatus` now fails compilation here until it is configured.

## 6. Query code -> key factory and `queryOptions`

```tsx
// Repeated inline in several components
useQuery({ queryKey: ['orders', id], queryFn: () => getOrder(id) });
```

```ts
// features/orders/api/order.queries.ts
import { queryOptions } from '@tanstack/react-query';
import { getOrder } from './order.api';
import type { Order } from './order.schemas';

export const orderQueries = {
  all: () => ['orders'] as const,
  details: () => [...orderQueries.all(), 'detail'] as const,
  detail: (id: Order['id']) =>
    queryOptions({ queryKey: [...orderQueries.details(), id] as const, queryFn: ({ signal }) => getOrder(id, signal) }),
};
```

Use the same factory in components (`useQuery(orderQueries.detail(id))`), route loaders (`queryClient.ensureQueryData(orderQueries.detail(id))`), and invalidation (`queryClient.invalidateQueries({ queryKey: orderQueries.all() })`). Follow the `react-data-fetching` skill for detailed conventions.

## 7. Validation -> shared Zod pieces

```ts
// shared/lib/validation/fields.ts
import { z } from 'zod';

export const phoneField = z.string().trim().regex(/^\+996\d{9}$/, { error: 'validation.phone.format' }); // i18n keys, translated in <FormMessage>
export const requiredString = z.string().trim().min(1, { error: 'validation.required' });
```

```ts
// features/clients/lib/clientSchema.ts
import { z } from 'zod';
import { phoneField, requiredString } from '@/shared/lib/validation/fields';

export const clientSchema = z.object({ name: requiredString, phone: phoneField });
export type ClientFormValues = z.infer<typeof clientSchema>;
```

Share field rules, not whole form schemas: forms diverge, fields do not.

## 8. Related parts with implicit shared state -> compound component

Use when consumers need to arrange parts freely and the parts share state (wizard steps, filter panel with apply/reset, selectable list).

```tsx
// features/checkout/components/CheckoutSteps/CheckoutStepsContext.ts
import { createContext, use } from 'react';

type CheckoutStepsValue = { step: number; goTo: (step: number) => void; total: number };

export const CheckoutStepsContext = createContext<CheckoutStepsValue | null>(null);

export function useCheckoutSteps(): CheckoutStepsValue {
  const value = use(CheckoutStepsContext);
  if (!value) throw new Error('useCheckoutSteps must be used inside <CheckoutSteps>');
  return value;
}
```

```tsx
// features/checkout/components/CheckoutSteps/CheckoutSteps.tsx
import { useState, type ReactNode } from 'react';
import { CheckoutStepsContext } from './CheckoutStepsContext';

type CheckoutStepsProps = { total: number; children: ReactNode };

export function CheckoutSteps({ total, children }: CheckoutStepsProps) {
  const [step, setStep] = useState(0);
  return <CheckoutStepsContext value={{ step, goTo: setStep, total }}>{children}</CheckoutStepsContext>;
}
```

```tsx
// features/checkout/components/CheckoutSteps/CheckoutStep.tsx
import type { ReactNode } from 'react';
import { useCheckoutSteps } from './CheckoutStepsContext';

export function CheckoutStep({ index, children }: { index: number; children: ReactNode }) {
  const { step } = useCheckoutSteps();
  return step === index ? <section>{children}</section> : null;
}
```

Each part is its own file (one component per file). Do not attach parts as static properties (`CheckoutSteps.Step`); export them as named components.

## 9. Undoing a wrong abstraction

```tsx
// Shared component that grew per-caller flags
<EntityForm entity="client" showTaxId={false} isAdminMode hidePhone={entity === 'lead'} />
```

1. Inline `EntityForm` into `ClientForm`, `LeadForm`, `AdminClientForm`.
2. Delete from each copy the branches that caller never takes.
3. Look at what is left. Usually only field definitions are common: extract those (example 7) and let each form be its own component.
