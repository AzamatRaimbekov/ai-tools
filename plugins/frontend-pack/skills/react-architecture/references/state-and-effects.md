# State structure and effect replacements

## Minimal state: three questions

For each piece of data, it is NOT state if any answer is yes:
1. Does it stay unchanged over time? -> constant.
2. Is it passed from a parent via props? -> prop.
3. Can it be computed from existing state or props? -> derive during render.

## Structure rules

### Replace contradictory booleans with a status union

```tsx
// Bad: isSending and isSent can both be true
const [isSending, setIsSending] = useState(false);
const [isSent, setIsSent] = useState(false);

// Good
type Status = 'typing' | 'sending' | 'sent';
const [status, setStatus] = useState<Status>('typing');
```

For async server work, do not hand-roll status at all: use `useMutation`'s `isPending` / `isSuccess`.

### Store ids, not copies

```tsx
// Bad: selectedItem goes stale when items refetch
const [selectedItem, setSelectedItem] = useState<Item | null>(null);

// Good
const [selectedId, setSelectedId] = useState<Item['id'] | null>(null);
const selectedItem = items.find((item) => item.id === selectedId) ?? null;
```

### Do not mirror props

```tsx
// Bad: ignores later prop updates by accident
function Message({ color }: { color: string }) {
  const [currentColor, setCurrentColor] = useState(color);
}

// Good when you need it in render: use the prop directly.
// Good when the prop is intentionally only an initial value: name it so.
function ColorPicker({ initialColor }: { initialColor: string }) {
  const [color, setColor] = useState(initialColor);
}
```

### Group values that change together

```tsx
// Bad
const [x, setX] = useState(0);
const [y, setY] = useState(0);

// Good
const [position, setPosition] = useState({ x: 0, y: 0 });
```

Use `useReducer` when there are 3+ related transitions or the next state depends on several fields.

### Keep state flat

Normalize nested trees into `Record<Id, Node>` plus id arrays when you need to update deep items.

## Effect replacements

### Derived data

```tsx
// Bad
const [fullName, setFullName] = useState('');
useEffect(() => setFullName(`${first} ${last}`), [first, last]);

// Good
const fullName = `${first} ${last}`;
```

Expensive derivation: just compute it if React Compiler is on; otherwise `useMemo` after measuring.

### Reset all state when an entity changes

```tsx
// Bad
useEffect(() => { setComment(''); }, [userId]);

// Good: in the parent
<ProfileForm key={userId} userId={userId} />
```

### Event-specific logic

```tsx
// Bad: fires on mount and on every product change, not on click
useEffect(() => {
  if (product.isInCart) toast(`Added ${product.name}`);
}, [product]);

// Good
function handleAddClick() {
  addToCart.mutate(product.id, { onSuccess: () => toast(`Added ${product.name}`) });
}
```

### Notifying the parent

```tsx
// Bad
useEffect(() => { onChange(isOn); }, [isOn, onChange]);

// Good
function handleToggle(next: boolean) {
  setIsOn(next);
  onChange(next);
}
```

Better still: make the component fully controlled (`isOn` + `onChange` props) and remove local state.

### Data fetching

```tsx
// Bad: race conditions, no cache, no retry
useEffect(() => {
  fetch(`/api/users/${id}`).then((r) => r.json()).then(setUser);
}, [id]);

// Good
const { data: user } = useQuery(userQueries.detail(id));
```

### Legitimate effect: wrap it in a named hook

```ts
// shared/hooks/useMediaQuery.ts
import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
```

Prefer `useSyncExternalStore` over `useEffect` + `useState` for subscribing to external stores and browser APIs.

### Latest callback inside an effect

```ts
import { useEffect, useEffectEvent } from 'react';

export function useInterval(onTick: () => void, ms: number) {
  const tick = useEffectEvent(onTick);
  useEffect(() => {
    const id = setInterval(() => tick(), ms);
    return () => clearInterval(id);
  }, [ms]);
}
```

## URL state

Filters, pagination, sort, tabs, and selected ids belong in the URL.

```ts
// TanStack Router route file: src/routes/orders.tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { OrdersPage } from '@/pages/orders/OrdersPage';

const ordersSearchSchema = z.object({
  search: z.string().catch(''),
  status: z.enum(['all', 'new', 'shipped', 'cancelled']).catch('all'),
  page: z.number().int().min(1).catch(1),
});

export const Route = createFileRoute('/orders')({
  validateSearch: ordersSearchSchema,
  component: OrdersPage,
});
```

In Next.js App Router, read `searchParams` in `page.tsx` (Server Component) and pass values down, or use `nuqs` (`useQueryState`) in a client component.
