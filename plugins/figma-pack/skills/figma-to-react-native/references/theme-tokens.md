# Figma variables -> React Native theme (Unistyles 3)

Lookup order for every value is the neutral one in `figma-core/references/token-mapping.md` (Figma -> catalog token -> platform). This file only defines the **target**: where the token lives in a React Native project and how it is written.

## Catalog token -> React Native

A catalog variable with `code.rn` set maps straight to that expression; the table below is the default when it is empty.

| Spec / catalog token | React Native |
|---|---|
| `color.primary`, `color.muted-foreground` | `theme.colors.primary`, `theme.colors.mutedForeground` (kebab -> camelCase) |
| `color.primary` @ 10% | a named role `theme.colors.primarySubtle` (light + dark), not runtime alpha |
| `space.n` | `theme.space[n]` = n x 4 pt |
| `radius.sm/md/lg/xl/full` | `theme.radius.*` (numbers, base from the project) |
| `text.*` + `font.weight.*` (or a Figma text style via catalog `textStyles[]`) | `theme.typography.<role>` through `<Text variant>` |
| `tracking.tight` | `letterSpacing` inside the typography role |
| `shadow.*` | `theme.shadow.*` (`boxShadow` strings) |
| `breakpoint.md` / `lg` | Unistyles breakpoints `md` (600) / `lg` (840) - window-size classes, not web widths |

Figma px = RN points (density-independent). The theme files are the source of truth; when the catalog disagrees with them, the catalog is stale (re-run `figma-design-system`).

## Target files

```
src/shared/theme/
  tokens.ts        primitives generated from Figma variables (palette, scale numbers) - no meaning
  themes.ts        light + dark: semantic roles -> primitives; space, radius, typography, shadow
  breakpoints.ts   phone / tablet widths
  unistyles.ts     StyleSheet.configure + TypeScript augmentation (imported once in index / root layout)
```

Only `src/shared/theme/**` may contain hex values or raw numbers for colors, spacing, radius, font sizes.

## tokens.ts (primitives)

Generated from the Figma primitive collection (`blue/500`, `gray/50`...). Keep Figma names, camelCased. Never used by components directly.

```ts
export const palette = {
  gray50: '#FAFAFA', gray200: '#E4E4E7', gray500: '#71717A', gray900: '#18181B',
  blue600: '#2563EB', red600: '#DC2626', green600: '#16A34A', white: '#FFFFFF',
} as const;

// Family from .figma/design-system.json font.family; '<CatalogFont>' is a placeholder, never hard-code a font here
export const fontFamily = { regular: '<CatalogFont>-Regular', medium: '<CatalogFont>-Medium', semibold: '<CatalogFont>-SemiBold', bold: '<CatalogFont>-Bold' } as const;
```

Custom fonts: one family name per weight (load with `expo-font` config plugin). Do not rely on `fontWeight` with a custom family on Android.

## themes.ts (semantic roles)

Role names are the same as on web (`frontend-pack` react-ui) so one Figma variable maps to one name on every platform.

```ts
import { palette, fontFamily } from './tokens';

const base = {
  space: { 0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96 },
  // catalog space.n -> theme.space[n] = n x 4 pt (space.6 = 24, same steps as web gap-6)
  radius: { none: 0, sm: 6, md: 8, lg: 10, xl: 14, full: 9999 },
  typography: {
    display: { fontFamily: fontFamily.bold, fontSize: 30, lineHeight: 36 },
    title:   { fontFamily: fontFamily.semibold, fontSize: 20, lineHeight: 28 },
    body:    { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
    label:   { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20 },
    caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
  },
  minTouch: 44,                                    // iOS HIG 44pt; Material asks 48dp, reach it with hitSlop on Android
} as const;

export const lightTheme = {
  ...base,
  colors: {
    background: palette.white, foreground: palette.gray900,
    card: palette.white, cardForeground: palette.gray900,
    primary: palette.blue600, primaryForeground: palette.white,
    muted: palette.gray50, mutedForeground: palette.gray500,
    destructive: palette.red600, destructiveForeground: palette.white,
    success: palette.green600, border: palette.gray200, input: palette.gray200, ring: palette.blue600,
  },
  shadow: { sm: '0 1px 2px rgba(0,0,0,0.06)', md: '0 4px 12px rgba(0,0,0,0.08)' },
} as const;

export const darkTheme = { ...lightTheme, colors: { /* same keys, dark values */ } } as const;
```

Rules:
- Every color role exists in both themes with the same keys (TypeScript enforces it if `darkTheme` is typed as `typeof lightTheme`).
- Foreground pairs: a surface role (`primary`) always has `primaryForeground`; contrast >= 4.5:1 for text, 3:1 for large text and icons.
- Figma modes: Light/Dark mode values must match `lightTheme`/`darkTheme`; a difference is a drift for the design-system sync, not a local fix.
- Opacity variants (Figma `primary` at 10%): add a role (`primarySubtle`) instead of computing alpha in components.

## unistyles.ts

```ts
import { StyleSheet } from 'react-native-unistyles';
import { lightTheme, darkTheme } from './themes';
import { breakpoints } from './breakpoints';

type AppThemes = { light: typeof lightTheme; dark: typeof darkTheme };
type AppBreakpoints = typeof breakpoints;

declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  themes: { light: lightTheme, dark: darkTheme },
  breakpoints,
  settings: { adaptiveThemes: true },   // follows the OS appearance, no re-render
});
```

`breakpoints.ts`: `{ xs: 0, md: 600, lg: 840 } as const` (phone / tablet / large tablet, same window-size classes as Material and Flutter).

## Typography from Figma text styles

| Figma text style (examples) | Role | Usage |
|---|---|---|
| `Display`, `H1`, `Heading/XL` | `display` | `<Text variant="display">` |
| `H2`, `H3`, `Title`, `Heading/M` | `title` | screen and section titles |
| `Body`, `Paragraph`, `Text/M` | `body` | default |
| `Label`, `Button`, `Text/S medium` | `label` | buttons, inputs, tabs |
| `Caption`, `Footnote`, `Text/XS` | `caption` | meta, helper text |

Add a role only when Figma has a distinct style used in 3+ places. Line height comes from Figma (px); percentage line heights are converted to px. Letter spacing: Figma % -> `letterSpacing = fontSize * percent / 100`.

`shared/ui/Text.tsx` is the only place that applies `theme.typography`; it also forwards `maxFontSizeMultiplier` and defaults `color` to `theme.colors.foreground`.

## Spacing, size, radius

| Figma px | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 |
|---|---|---|---|---|---|---|---|---|---|
| `space.n` -> theme | `space[1]` | `space[2]` | `space[3]` | `space[4]` | `space[5]` | `space[6]` | `space[8]` | `space[10]` | `space[12]` |

- Off-scale (13, 15, 18, 22) -> nearest step, listed in the spec "Token mismatches" section as `snap`.
- Radius: map to `theme.radius.*` by the table in `figma-core/references/token-mapping.md`, recomputed to numbers; pills -> `full`.
- Sizes of icons/avatars/controls: add to `base` as `size: { icon: 20, avatar: 40, control: 48 }` when repeated; one-off fixed sizes stay in the component's style with a comment naming the Figma node.
- Screen padding: one token (`space[4]` = 16 on phones, `space[6]` from `md`), applied by `shared/ui/Screen.tsx`, not per screen.

## Mismatch handling

Same three outcomes as web: **snap** (within one step, same role), **ask** (meaningful color, visible delta), **new token** (repeated meaning; added to `tokens.ts` + both themes; applied only after the user agrees). Do not edit `.figma/design-system.*`: list it under "Proposed catalog changes" in the final report and tell the user to run `figma-design-system` "update the catalog" (only that skill writes the catalog), so the next screen reuses the decision.
