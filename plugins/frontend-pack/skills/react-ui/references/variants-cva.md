# Variants with class-variance-authority (cva)

## Anatomy

```ts
import { cva, type VariantProps } from "class-variance-authority"

export const alertVariants = cva(
  "relative grid w-full gap-1 rounded-lg border px-4 py-3 text-sm", // base
  {
    variants: {
      tone: {
        neutral: "bg-card text-card-foreground",
        warning: "border-warning/50 bg-warning/10 text-foreground",
        danger: "border-destructive/50 text-destructive",
      },
      size: {
        sm: "px-3 py-2 text-xs",
        md: "",
      },
    },
    compoundVariants: [
      { tone: "danger", size: "sm", className: "font-medium" },
    ],
    defaultVariants: { tone: "neutral", size: "md" },
  },
)

export type AlertVariantProps = VariantProps<typeof alertVariants>
```

- `base` - always applied.
- `variants` - finite, named options. Each key becomes a typed prop.
- `compoundVariants` - classes for a combination (also accepts arrays: `tone: ["warning", "danger"]`).
- `defaultVariants` - makes the prop optional.
- `VariantProps<typeof x>` - derive prop types; never retype unions by hand.

## Component wiring

```tsx
type AlertProps = React.ComponentProps<"div"> & AlertVariantProps

export function Alert({ className, tone, size, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      data-slot="alert"
      data-tone={tone}
      className={cn(alertVariants({ tone, size }), className)}
      {...props}
    />
  )
}
```

`className` goes through `cn` (tailwind-merge) so a caller's `px-6` correctly replaces the variant's `px-4`.

## When to add a variant vs other options

| Need | Do |
|---|---|
| A new look reused in 2+ places | Add a variant to the shared component |
| A one-off spacing/width tweak at a call site | Pass `className` |
| A different element/behavior with the same look | `asChild` / `render`, or reuse `xxxVariants()` on another element |
| A look that differs in structure (extra parts) | Compose a new component in `shared/components` |
| Feature-specific look of a primitive | Variant in `shared/ui` if generic; otherwise a wrapper in the feature that passes `className` |

Never fork `button.tsx` into `features/x/components/MyButton.tsx` with copied classes.

## Extending a shadcn primitive

Edit the existing cva in `src/shared/ui/button.tsx`:

```ts
variant: {
  default: "...",
  // added: semantic success action used in checkout and payouts
  success: "bg-success text-success-foreground hover:bg-success/90",
},
```

Keep shadcn's base classes (focus ring, disabled, `aria-invalid`, svg sizing) intact.

## Reusing variant classes on another element

```tsx
import { buttonVariants } from "@/shared/ui/button"

<a href={docsUrl} className={buttonVariants({ variant: "outline", size: "sm" })}>Docs</a>
```

Prefer `<Button asChild>` / `render` when it fits; use `buttonVariants()` when you cannot wrap (e.g. a third-party link component that only takes `className`).

## Anti-patterns

```tsx
// Boolean style props - combinatorial and ambiguous (primary && danger?)
<Button primary danger small rounded />

// Class soup with nested ternaries
className={`${a ? "x" : b ? "y" : "z"} ${c && "w"}`}   // also leaks "false" into class list

// Variant named by appearance
variant: { blue: "...", bigRed: "..." }

// Dynamic class construction - Tailwind cannot detect it
className={`bg-${color}-500`}
```

Always map a variant value to a full literal class string so Tailwind's scanner sees it.

## Boolean variants

Allowed when the state is truly binary and visual, e.g. `inset: { true: "pl-8" }`. Prefer reflecting state via data/aria attributes and styling with variants: `data-[state=open]:bg-accent`, `aria-selected:bg-accent`, `aria-invalid:border-destructive` - the headless primitives already set these.
