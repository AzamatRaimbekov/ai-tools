# Composition patterns

Goal: components that grow by composition (new children) instead of by props.

## 1. children first

```tsx
// BAD: every new need becomes a prop
<EmptyBlock
  title="No orders" titleSize="lg" showIcon iconPosition="top"
  actionLabel="Create" onAction={create}
  secondaryActionLabel="Import" onSecondaryAction={openImport}
/>

// GOOD
<Empty>
  <EmptyTitle>No orders</EmptyTitle>
  <EmptyDescription>Create your first order</EmptyDescription>
  <Button onClick={create}>Create</Button>
</Empty>
```

A small fixed-layout API is fine: the shared `EmptyState` (`title`, `description?`, `action?`, `icon?` slots; defined in `react-ux`) is not prop explosion, because `action` and `icon` are `ReactNode` slots.

## 2. Compound components (shadcn style)

Each part is a small styled element with a `data-slot`; the parent uses the slots for layout.

```tsx
// src/shared/components/StatCard/StatCard.tsx
const statCardVariants = cva("grid gap-1 rounded-xl border bg-card p-4 text-card-foreground", {
  variants: {
    tone: {
      default: "",
      positive: "border-success/40 bg-success/5",
      negative: "border-destructive/40 bg-destructive/5",
    },
  },
  defaultVariants: { tone: "default" },
})

type StatCardProps = React.ComponentProps<"div"> & VariantProps<typeof statCardVariants>

export function StatCard({ className, tone, ...props }: StatCardProps) {
  return <div data-slot="stat-card" className={cn(statCardVariants({ tone }), className)} {...props} />
}

// StatCardLabel.tsx
export function StatCardLabel({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="stat-card-label" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

// StatCardValue.tsx
export function StatCardValue({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="stat-card-value" className={cn("text-2xl font-semibold tabular-nums", className)} {...props} />
}

```

Usage stays flexible without new props:

```tsx
<StatCard>
  <StatCardLabel>Revenue</StatCardLabel>
  <StatCardValue>{formatPrice(total)}</StatCardValue>
  <TrendBadge value={delta} />
</StatCard>
```

One component per file (pack rule); group parts in a folder and import each from its file (`shared/` has no barrel `index.ts`).

Parent-aware styling without props: `has-data-[slot=card-action]:grid-cols-[1fr_auto]`, `*:data-[slot=icon]:size-4`.

Only add React context to a compound component when parts need shared state (e.g. selected tab). Pure layout parts need none.

## 3. Slot props for fixed regions

When a component has a strict structure and limited freedom, named node props are fine:

```tsx
<PageHeader title="Orders" actions={<Button>New order</Button>} />
```

Keep it to a couple of `ReactNode` slots. If slots start needing their own config props, switch to compound parts.

## 4. Polymorphism: asChild / render

Radix base:

```tsx
<Button asChild>
  <Link to="/orders/new"><Plus aria-hidden="true" /> New order</Link>
</Button>
```

Base UI base:

```tsx
<Button render={<Link to="/orders/new" />}>
  <Plus aria-hidden="true" /> New order
</Button>
```

Writing your own `asChild` component (Radix projects):

```tsx
import { Slot } from "radix-ui"

type ChipProps = React.ComponentProps<"span"> & { asChild?: boolean }

export function Chip({ asChild = false, className, ...props }: ChipProps) {
  const Comp = asChild ? Slot.Root : "span"
  return <Comp data-slot="chip" className={cn("rounded-full bg-muted px-2 text-xs", className)} {...props} />
}
```

Requirements for any component used as the child/render target: spread all props onto the DOM node and accept `ref` (React 19: just a prop). Changing the element is your responsibility for semantics - do not turn a trigger into a non-focusable `div`.

Do not build generic `as` props (`<Box as="a" href>`) with complex polymorphic typings; `asChild`/`render` covers it.

## 5. Layout primitives

Create only when the same recipe appears 3+ times. Keep them thin:

```tsx
const stackVariants = cva("flex flex-col", {
  variants: { gap: { sm: "gap-2", md: "gap-4", lg: "gap-6", xl: "gap-8" } },
  defaultVariants: { gap: "md" },
})

export function Stack({ className, gap, ...props }: React.ComponentProps<"div"> & VariantProps<typeof stackVariants>) {
  return <div className={cn(stackVariants({ gap }), className)} {...props} />
}
```

Typical set in `shared/components/layout/`: `PageContainer` (max width + gutters), `PageHeader`, `Stack`, `Cluster` (wrapping row), `Section`. Do not wrap every `div` - plain Tailwind flex/grid is fine for one-offs.

## 6. Container vs presentational

```
features/orders/components/
  OrdersTableSection.tsx     // uses useQuery(orderQueries.list(...)), handles states, passes data down
  OrdersTable.tsx            // pure: (rows, onSort) => markup
  OrderStatusBadge.tsx       // pure: (status) => Badge with tone mapping
```

- Presentational: props in, JSX out, no query hooks, no stores, no `fetch`. Easy to render in Storybook or tests.
- Mapping domain values to visuals (status -> tone) lives in a small pure function or component in the feature, not inside `shared/ui`.

## 7. Prop explosion smell list

Refactor when you see:
- `showHeader`, `showFooter`, `hideIcon`, `withBorder` flags
- `headerClassName`, `bodyClassName`, `footerClassName` (expose parts instead)
- `renderLeft`, `renderRight`, `renderEmpty` callbacks for static content
- Props that are only forwarded to a nested child
- More than ~6-8 visual props on one component
