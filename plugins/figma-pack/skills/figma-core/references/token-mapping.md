# Figma value -> catalog token -> platform

Three layers, always in this order:

1. **Figma** - variables, styles and raw values on nodes.
2. **Catalog** - `<project>/.figma/design-system.json` / `.md` (written by `figma-design-system`). Each Figma variable in `variables.collections[].variables[]` carries `token` = the code token name (`primary`, `muted-foreground`), `codeSyntax` and per-mode `values`; `textStyles[]`, `effectStyles[]`, `font`, `icons` and `components[]` complete it. The spec writes tokens in neutral dot form so every platform reads them the same way:
   - `color.<token>` = the catalog variable whose `token` is `<token>` (`color.primary`, `color.muted-foreground`);
   - `space.n`, `radius.*`, `text.*`, `font.weight.*`, `tracking.*`, `shadow.*`, `breakpoint.*` = the scale steps in this file (or the catalog variable bound to that step, when the file has spacing/radius variables with a `token`); a Figma text style maps to `text.*` + weight through `textStyles[]`.
   The spec (`spec-template.md`) uses only these names.
3. **Platform** - how a platform consumes a catalog token (sections at the end). The platform's own code is the source of truth for values: web global CSS, RN theme file, Flutter `ThemeData`. When the catalog and the code disagree, the code wins and the catalog is stale (re-run `figma-design-system`).

## Order of lookup (Figma -> catalog)

1. **Code syntax / Code Connect.** A Figma variable with code syntax for the target platform (WEB `var(--primary)`, iOS / Android names) maps directly to that token. Done.
2. **Catalog row.** Find the variable by `key` (or name) in `variables.collections[].variables[]`; its `token` gives the name. `token` empty -> the sync has not matched it: go to step 3 and note it for `figma-design-system`.
3. **Variable name by role.** A bound variable not in the catalog: match by meaning with the role table below.
4. **Raw value.** Unbound fill/size: match the exact value to a catalog token value; otherwise it is a mismatch row. Never round silently.

## Colors (semantic roles)

| Figma name patterns (examples) | Role | Catalog token |
|---|---|---|
| `background`, `bg/default`, `surface/page`, `base/white` as page bg | page surface | `color.background` / `color.foreground` |
| `foreground`, `text/primary`, `text/default` | main text | `color.foreground` |
| `card`, `surface/raised`, `bg/elevated` | card surface | `color.card` / `color.card-foreground` |
| `popover`, `surface/overlay` | menus, popovers, sheets | `color.popover` / `color.popover-foreground` |
| `primary`, `brand`, `action/primary` | primary action | `color.primary` / `color.primary-foreground` |
| `secondary`, `action/secondary` | secondary action | `color.secondary` / `color.secondary-foreground` |
| `muted`, `bg/subtle` | subtle surface | `color.muted` |
| `muted-foreground`, `text/secondary`, `text/muted`, `text/tertiary` | secondary text | `color.muted-foreground` |
| `accent`, `bg/hover` | hover / selected surface | `color.accent` / `color.accent-foreground` |
| `destructive`, `danger`, `error`, `red/*` used for errors | destructive / error | `color.destructive` |
| `border`, `stroke/default`, `divider` | borders, dividers | `color.border` |
| `input`, `stroke/input` | input borders | `color.input` |
| `ring`, `focus` | focus ring | `color.ring` |
| `chart/1..5` | charts | `color.chart-1..5` |
| `success`, `warning`, `info` | status | `color.success` / `color.warning` / `color.info` **only if the catalog has it**, else mismatch |
| primitive palette (`blue/500`, `gray/400`) bound directly on a node | - | mismatch: ask which semantic role it plays |

Opacity: Figma `primary` at 10% -> `color.primary` @ 10%. Dark mode: one token per role with a light and a dark value; a Figma dark-mode value that differs from the code's dark value is drift for `figma-design-system`, not a new token.

## Spacing and sizes (4px base)

| px | 2 | 4 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64 | 80 | 96 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `space.*` | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 |

`space.n` = n x 4px. A value off the table (13, 15, 18, 22) snaps to the nearest step and is listed in spec section 9. A content column width is described as "content width N, centered" or a ratio, never as the frame width.

## Typography

| Size / line-height | Catalog token |
|---|---|
| 12 / 16 | `text.xs` |
| 14 / 20 | `text.sm` |
| 16 / 24 | `text.base` |
| 18 / 28 | `text.lg` |
| 20 / 28 | `text.xl` |
| 24 / 32 | `text.2xl` |
| 30 / 36 | `text.3xl` |
| 36 / 40 | `text.4xl` |
| 48 / 48 | `text.5xl` |

Weights: 400 `font.weight.normal`, 500 `medium`, 600 `semibold`, 700 `bold`. Negative letter-spacing on headings -> `tracking.tight`. Font family must be the project font (`font.sans`, `font.mono`); a different family in Figma is a mismatch. Figma text styles (`Heading/H1`) map to one recipe (size + weight + tracking) recorded in the catalog. If the catalog defines its own type scale (common in mobile projects), use it instead of this table.

## Radius (default base 10px; read the project value)

| Figma | Catalog token |
|---|---|
| 0 | `radius.none` |
| ~6 | `radius.sm` (base - 4) |
| ~8 | `radius.md` (base - 2) |
| ~10 | `radius.lg` (base) |
| ~14 | `radius.xl` (base + 4) |
| 9999 / pill | `radius.full` |

## Effects and borders

- Drop shadows -> `shadow.xs` / `sm` / `md` / `lg` by visual weight; a custom shadow is a mismatch.
- 1px stroke -> border with `color.border`; 2px -> border width 2. Input strokes come from the `Input` component.
- Background blur -> only on overlays (sticky headers, sheets, dialogs).

## Form factors and breakpoints

| Figma frame width | Form factor | Catalog breakpoint |
|---|---|---|
| < 600 (typically 360-430) | phone | base (no breakpoint) |
| 600-1023 (typically 744-834) | tablet | `breakpoint.md` (768) |
| 1024-1279 | desktop (small laptop) | `breakpoint.lg` (1024) |
| >= 1280 (typically 1440) | desktop | `breakpoint.xl` (1280); content width from the design, never the frame width |

## Mismatch rows

Every value that is not a match goes into spec section 9 as one row:

`| <Figma value or variable> | <where used, nodeId> | <nearest catalog token> | <delta> | snap / ask / new token |`

- **snap**: spacing, size, radius or type within one step and the same role. Colors are never snapped without one line of user confirmation.
- **ask**: the value carries meaning (status, brand, emphasis) or the delta is visible.
- **new token**: proposed only for a meaning that repeats; semantic name, paired `-foreground` for surfaces, light + dark values, contrast 4.5:1 for text. Added in code first (platform section below), then proposed in the final report for `figma-design-system` "update the catalog". Applied only after the user agrees.
- Never: raw values in components, a parallel token set named after Figma (`figma-blue-500`), per-screen tokens.

## Platform: web (React, Tailwind v4 + shadcn/ui)

When a catalog variable has `code.web` (`{ cssVar, class }`, filled by the sync), use it directly; the table below is the fallback. Source of truth: `src/app/globals.css` or `src/index.css` (`frontend-pack` `react-ui/references/tokens-and-theming.md`). Colors live as CSS variables in `:root` and `.dark` (`oklch`) and are exposed to Tailwind through `@theme inline { --color-primary: var(--primary); }`.

| Catalog | Web |
|---|---|
| `color.primary` / `color.primary-foreground` | `--primary` -> `bg-primary text-primary-foreground` (also `text-primary`, `border-primary`, `ring-primary`) |
| `color.muted-foreground` | `text-muted-foreground` |
| `color.border` | `border-border` (default via base layer) |
| `color.primary` @ 10% | `bg-primary/10` |
| `space.6` | `gap-6`, `p-6`, `space-y-6` (Tailwind `--spacing` = 0.25rem) |
| squares | `size-*` |
| `text.sm` + `font.weight.medium` | `text-sm font-medium` |
| `tracking.tight` | `tracking-tight` |
| `radius.lg` | `rounded-lg` (`--radius`) |
| `shadow.sm` | `shadow-sm` |
| `breakpoint.md` / `lg` / `xl` | `md:` / `lg:` / `xl:` (unprefixed = phone) |
| content width 1200 | `max-w-7xl mx-auto px-4 lg:px-8` (nearest container, not `w-[1200px]`) |

Figma WEB code syntax should be `var(--<token>)` with the shadcn variable name; then `get_design_context` already emits our names. A new token is added as a pair in `:root` + `.dark`, mapped in `@theme inline`. Never `text-[15px]`, `p-[13px]`, hex in `.tsx`, or `style={{}}` for static values.

## Platform: React Native

Use the catalog variable's `code.rn` when present; otherwise consumed through the project's theme object (see `figma-to-react-native`): `color.primary` -> `theme.colors.primary`, `space.4` -> `theme.space[4]` / 16, `text.sm` -> the theme text variant. Values are density-independent points, equal to the Figma px values.

## Platform: Flutter

Use the catalog variable's `code.flutter` when present (same widget-side accessor format); otherwise (see `figma-to-flutter`): colors -> `ColorScheme` roles via `context.colors` (`color.primary` -> `context.colors.primary`), plus the `AppColors` `ThemeExtension` via `context.appColors` for roles Material 3 lacks (`color.success` -> `context.appColors.success`); `text.*` -> a `TextTheme` role; `space.n` -> `AppSpacing.s<n x 4>` (`space.4` -> `AppSpacing.s16`) and `radius.*` -> `AppRadius.*`, const classes in `lib/shared/theme/app_tokens.dart`. Values are logical pixels, equal to the Figma px values.
