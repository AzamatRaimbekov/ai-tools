# Tokens and theming (Tailwind v4 + shadcn)

## How it fits together

1. Raw values live as CSS variables on `:root` (light) and `.dark` (dark).
2. `@theme inline` maps them to Tailwind theme variables (`--color-*`, `--radius-*`, `--font-*`), which generates utilities (`bg-primary`, `rounded-lg`, `font-sans`).
3. Components use only the utilities. Switching theme = swapping variable values; no component changes.

## globals.css skeleton

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  /* + secondary, accent, popover, chart-1..5, sidebar-* from shadcn init */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* every token from :root redefined */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ...one line per token */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}
```

Use what `shadcn init` generates; the snippet shows structure, not exact values.

## Naming convention

- Pairs: `<name>` is the surface, `<name>-foreground` is text/icons on it. Always use them together: `bg-primary text-primary-foreground`.
- Semantic, never visual: `--success`, `--warning`, `--info`, `--brand` - not `--green`, `--blue-light`.
- Values in `oklch()` (perceptually uniform, what shadcn and Tailwind v4 use).

## Adding a token (example: warning)

```css
:root {
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
}
.dark {
  --warning: oklch(0.41 0.11 46);
  --warning-foreground: oklch(0.99 0.02 95);
}
@theme inline {
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

Same shape for success (used by `StatCard` tone `positive`: `border-success/40 bg-success/5`):

```css
:root {
  --success: oklch(0.6 0.15 150);
  --success-foreground: oklch(0.98 0.02 150);
}
.dark {
  --success: oklch(0.5 0.13 150);
  --success-foreground: oklch(0.98 0.02 150);
}
@theme inline {
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
}
```

Now `bg-warning text-warning-foreground` works in both themes. Check contrast of the pair in both modes (4.5:1 for text).

## Rules

- Tokens are defined only in the global CSS file. No colors in `.tsx`, no per-feature CSS files with colors.
- Add a token when a meaning is reused; do not add one per screen.
- Do not use `@theme` (non-inline) for values that reference other variables - use `@theme inline`, otherwise the variable resolves in the wrong scope.
- Do not reset whole namespaces (`--color-*: initial`) unless the design system explicitly bans the default palette; if you do, lint for raw palette usage instead of fighting it.
- Brand theme from design (Figma variables): map designer variables onto the shadcn token names, do not invent a parallel set.

## Spacing, type, radius

- Spacing derives from `--spacing` (default `0.25rem`): `p-4` = 1rem. Do not override `--spacing` per project without a design reason - it rescales everything.
- Type scale: Tailwind defaults (`text-xs` .. `text-6xl`). Custom sizes go into `@theme` as `--text-*` with a name, never inline `text-[15px]`.
- Fonts: load with `next/font` (Next.js) or `@fontsource-variable/*` (Vite), expose as a CSS variable, map to `--font-sans` in `@theme inline`.

## Dark mode

- Class strategy: `.dark` on `<html>`; `@custom-variant dark (&:is(.dark *));` makes `dark:` follow the class instead of the OS media query.
- Next.js: `next-themes` `ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange`, plus `suppressHydrationWarning` on `<html>`.
- Vite: shadcn's `ThemeProvider` (context + localStorage + `matchMedia`) in `src/app/providers`. Add the inline head script that sets the class before paint to avoid a flash.
- Offer three options: light, dark, system.
- Components should not contain `dark:bg-*` / `dark:text-*`. If a component needs a different color in dark, the token value is wrong, or a new token is needed.
- Images/illustrations that break in dark: provide a dark variant or use `currentColor` SVGs.
