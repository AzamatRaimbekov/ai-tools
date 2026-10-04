# shadcn/ui setup and ownership

shadcn/ui is not a dependency you import from npm; the CLI copies component source into the repo. The team owns that code. That is why it lives in exactly one place (`src/shared/ui`) and is changed there.

## components.json (aliases mapped to the Mdigital layout)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/shared/components",
    "ui": "@/shared/ui",
    "utils": "@/shared/lib/utils",
    "lib": "@/shared/lib",
    "hooks": "@/shared/hooks"
  }
}
```

- Next.js App Router: `"rsc": true`, `"css": "src/app/globals.css"`.
- `tailwind.config` stays empty for Tailwind v4 (config lives in CSS).
- `style`, `tailwind.baseColor` and `tailwind.cssVariables` cannot be changed after init. Always `cssVariables: true` - tokens are the theming mechanism.
- Newer CLI versions also record the headless base (Radix or Base UI) in this file. Do not mix bases inside one project.

## The cn helper

`src/shared/lib/utils.ts` is the single entry point:

```ts
// Projects initialized after Sept 2026 (shadcn "cn" package)
export { cn } from "cn"
```

```ts
// Older projects - same API, keep until `npx shadcn@latest migrate cn`
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Application code always imports `cn` from `@/shared/lib/utils`, never directly from `cn`, `clsx` or `tailwind-merge`, so the implementation can change in one place.

## Adding and updating primitives

- Add: `npx shadcn@latest add button dialog` - files land in `src/shared/ui`.
- Before editing a primitive, check whether a variant or a wrapper solves it. Edits are fine (you own the code), but keep them minimal and comment non-obvious deviations so a future `add --overwrite` diff is reviewable.
- Updating upstream: run `npx shadcn@latest add <name> --diff` (or re-add on a branch) and merge consciously. Never blindly overwrite customized files.
- Useful newer primitives worth reaching for before writing your own: `field`, `input-group`, `button-group`, `item`, `empty`, `spinner`, `kbd`, `sonner` (toast is deprecated in favor of sonner).

## Radix vs Base UI

Since July 2026 `npx shadcn init` defaults to Base UI; Radix remains supported (`npx shadcn init -b radix`) and every new component ships for both.

| | Radix base | Base UI base |
|---|---|---|
| Package | `radix-ui` (unified package) | `@base-ui/react` |
| Composition prop | `asChild` | `render={<Comp />}` |
| Requirement for custom children | spread props + accept `ref` | spread props + accept `ref` |

Rule: follow what the project already uses. New projects follow the shadcn default unless the template says otherwise.

## Primitive authoring conventions (as shadcn ships them)

- Plain function components, no `forwardRef` (React 19 ref-as-prop).
- Props typed as `React.ComponentProps<"element">` or `React.ComponentProps<typeof Primitive.Root>`.
- Root carries `data-slot="<name>"`; variants exposed as `data-variant` / `data-size` when useful for parent selectors.
- `className` merged last via `cn`.
