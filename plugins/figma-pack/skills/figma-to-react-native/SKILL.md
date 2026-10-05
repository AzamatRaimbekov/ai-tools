---
name: figma-to-react-native
description: Turns a Figma design into a production React Native screen for Mdigital mobile apps (Expo SDK 57 + Expo Router, New Architecture, TypeScript strict, Unistyles 3 typed theme, TanStack Query, React Hook Form + Zod, FlashList, expo-image, i18n). Consumes the platform-neutral spec from the figma-reader agent and the project design-system catalog, writes a mobile UX brief (all states, safe areas, navigation, gestures, keyboard, offline), maps Figma variables to theme tokens and Figma components to shared/ui, builds with small files, then verifies on a simulator against the Figma frame. Use when the user wants React Native / Expo code from a Figma link or mockup - "React Native по фигме", "сверстай на React Native", "мобилка по макету", "сделай экран в экспо", "перенеси макет в RN", "мобильное приложение по фигме", "figma to react native", "build this screen in Expo", "RN from Figma". Not for web React (figma-core routes that elsewhere) or Flutter (figma-to-flutter).
---

# Figma -> React Native (Expo)

Entry point is `figma-core` (router). This skill owns the React Native build. Figma is the visual target; **our rules win over Figma output** and over generated code from `get_design_context` (web/Tailwind flavoured, reference only).

Standard stack (details and reasons in `references/libraries.json`):
Expo SDK 57 (RN 0.86, React 19.2, New Architecture) - Expo Router (typed routes) - TypeScript strict - **Unistyles 3** typed theme generated from Figma variables - TanStack Query v5 - React Hook Form + Zod v4 - Reanimated 4 + Gesture Handler - safe-area-context - react-native-keyboard-controller - expo-image - FlashList v2 - lucide-react-native - react-i18next + expo-localization - Sentry (`@sentry/react-native`). Existing project: follow its installed stack if it is on the list as "conditional"; never add a "forbidden" one.

## Flow

Do the steps in order. Do not write code before step 5 is agreed (a one-line "ok" is enough for small screens).

1. **Seat check.** `whoami` (free). View/Collab seat -> say the monthly limit (6, Starter 20) and the calls this screen needs before any rate-limited call. Ask to proceed.
2. **Catalog.** Read `<project>/.figma/design-system.md` and `.figma/design-system.json` (Figma component/variable -> our component/token). Missing -> run `figma-design-system` first (it costs calls: say so); without it every component mapping in step 3 is "(assumption)".
3. **Spec.** Delegate the link to the `figma-reader` agent with `Target platforms: react-native`; phone frames (360-430) first. It returns the neutral spec (`figma-core/references/spec-template.md`): sections 1-11 plus optional 12 "Platform notes" (react-native). Catalog tokens arrive as `color.*`, `space.n`, `radius.*`, `text.*`, `font.weight.*`, `shadow.*`; layout as `stack(v|h)`, `grid(n)`, `wrap`, `fill` / `hug` / `fixed`, `overlay`. Do not re-read Figma unless confidence is low.
4. **Mobile UX brief** (write it in the chat, short):
   - Screens and the route for each (`src/app/(tabs)/orders/index.tsx`), entry points, back behaviour.
   - Navigation pattern: stack, tabs, modal, sheet. Header: native stack header unless the frame shows a custom one.
   - All states per screen: loading (skeleton matching layout), empty first-use, empty no-results, error + retry, offline, no access, partial data, pull-to-refresh, pagination end. Take spec section 8 "Missing in design" and decide each row; section 11 "Open questions" goes to the user.
   - Safe areas: which edges, behind notch/home indicator, edge-to-edge on Android (status/navigation bar colors from theme).
   - Gestures: swipe back (keep it), swipe actions, pull-to-refresh, long press; each needs a non-gesture alternative.
   - Keyboard: which inputs, next/done order, `returnKeyType`, keyboard-aware scroll, dismiss on tap outside, submit button visible above keyboard.
   - Offline: what is readable from cache, what is blocked, what a failed mutation shows.
   - Platform deltas: iOS vs Android (date picker, action sheet, haptics, back button).
5. **Plan.** List files to create/edit with their folder, tokens to add (`references/theme-tokens.md`), components to reuse vs create (`references/component-mapping.md`), i18n keys, libraries to install (only from the whitelist). Every row of spec section 9 "Token mismatches" is resolved as snap / ask / new token.
6. **Build** following the code rules below, smallest pieces first: tokens -> shared/ui primitives -> feature components -> screen -> route file.
7. **Verify** on a simulator/emulator (`references/verify.md`): screenshot at the Figma frame width (375 or 390), compare with the frame PNG from `.figma/<fileKey>/`, fix visible deltas, check dark mode, largest font scale, and states. No simulator available -> say so explicitly and list what was not visually checked.
8. **Review** with the checklist at the end. Report deviations from Figma with reasons.

## Translation rules

| Spec (neutral) | React Native |
|---|---|
| `color.<token>` (section 3) | `theme.colors.<camelCase token>` from `src/shared/theme/themes.ts` (light/dark), primitives in `tokens.ts`. `color.primary` @ 10% -> a `primarySubtle` role. `references/theme-tokens.md`. |
| `space.n`, `radius.*`, `shadow.*` | `theme.space[n]` (n x 4 pt), `theme.radius.*`, `theme.shadow.*` (`boxShadow` style, New Architecture). |
| `text.*` + `font.weight.*`, Figma text styles | `theme.typography.<role>` + `<Text variant="title">` in `shared/ui/Text.tsx`. Never a raw `fontSize` in a feature. |
| `stack(v)` / `stack(h)` + gap, padding | `<View>` with `flexDirection: 'column'` / `'row'`, `gap: theme.space[n]`, `padding*` from tokens. `hug` = no size; `fill` = `flex: 1` or `alignSelf: 'stretch'`; `fixed` only for icons, avatars, controls, side panels. |
| `wrap`, `grid(n)` | `flexWrap: 'wrap'` + `gap`; grids on phone = `FlashList numColumns={n}` for data, wrapped rows for static. |
| `overlay` | `position: 'absolute'` only for overlays (badges on avatars, FAB). Anything else is rebuilt as flex. |
| Scrolling frame | `ScrollView` for short static content; `FlashList` for any data list. |
| Section 4 "Catalog component" | Catalog `components[]` mapping -> `src/shared/ui/*` or feature component. Variants -> Unistyles `variants`. Table in `references/component-mapping.md`. |
| Section 6 icons | catalog `icons.library` Lucide -> `lucide-react-native` by name; custom icons -> `shared/ui/icons/<Name>.tsx` via `react-native-svg`, color from `color` prop. |
| Images | `expo-image` with `contentFit`, `placeholder` (blurhash/thumbhash), explicit aspect ratio. Static assets -> `assets/images/` @1x/@2x/@3x or SVG. |
| Desktop-only frames (section 2, no phone frame) | Re-flow for 375: one column, side panels -> separate screen or bottom sheet, tables -> card list, hover -> pressed state, top nav -> tabs (max 5) or drawer, multi-step dialogs -> stack screens. Record every adaptation in the brief. |

Figma px = RN points, and spacing keeps the web step scale (`space.6` = `theme.space[6]` = 24), so the spec's catalog-token column maps 1:1. Section 12 "Platform notes" (react-native), when present, overrides these defaults.

## Code rules

Folder structure (mirrors `frontend-pack` react-architecture; Expo Router treats every file in `src/app/` as a route):

```
src/
  app/                    routes only: _layout.tsx, (tabs)/, [id].tsx - thin, compose features
  features/<feature>/
    components/           one component per file
    hooks/                useXxx.ts (screen view-model hooks)
    api/                  <entity>.schemas.ts, .api.ts, .queries.ts, .mutations.ts
    lib/                  pure helpers, form Zod schemas
    index.ts              public API
  shared/
    ui/                   primitives: Text, Button, Input, Card, Icon, Skeleton, Screen
    components/           composites: EmptyState, ErrorState, ListFooter, FormField
    hooks/ lib/ api/      http client + ApiError, queryClient
    theme/                tokens.ts, themes.ts, breakpoints.ts, unistyles.ts
    i18n/                 i18n.ts, locales/ru.json, en.json
  providers/              AppProviders.tsx (Query, Keyboard, Gesture, SafeArea, i18n)
```

- **File size:** every `.tsx` <= 150 lines, start splitting at 120; component body <= ~80 lines. Decompose in `frontend-pack` order: pure code -> hook -> JSX regions -> flatten branching.
- **One component per file**, named export, `<Name>Props`; never define a component inside another.
- **Styles:** `StyleSheet.create((theme, rt) => ...)` from `react-native-unistyles` at the bottom of the same file. No inline style objects except computed animated values. No hex, rgb, raw numbers for spacing/radius/font in features. `Platform.select` only inside `shared/ui`.
- **Route files** (`src/app/**`) <= 40 lines: read params, render a feature screen. No queries, no styles.
- **Data:** TanStack Query only; `queryOptions` factories in `api/*.queries.ts`; one `http.ts` with typed `ApiError` (same contract as `frontend-pack` react-error-handling). `focusManager` on `AppState`, `onlineManager` on NetInfo. Never copy server data into state.
- **Forms:** RHF + `zodResolver`; `Controller` around our `Input`; server errors mapped to fields; submit disabled while pending.
- **All states:** each data screen renders loading / error / empty / data explicitly (status map, not nested ternaries). Pull-to-refresh on lists. Mutations show pending and failure.
- **Accessibility:** `accessibilityRole`, `accessibilityLabel` (from i18n) on every pressable without visible text, `accessibilityState` for selected/disabled/checked; hit area >= 44x44 pt on iOS and 48x48 dp on Android (`hitSlop` when the visual is smaller); font scaling stays on (never `allowFontScaling={false}`; cap with `maxFontSizeMultiplier` only on tight controls); layouts must survive 200% text; contrast 4.5:1; respect `useReducedMotion()` in Reanimated.
- **i18n:** every visible string via `t('<feature>.<section>.<item>')`; no concatenation, use interpolation and plurals; dates/numbers via `Intl` with the current locale.
- **Errors:** route-level `export function ErrorBoundary` in Expo Router layouts; `Sentry.wrap` on the root layout; feature-level fallback with retry; no `console.log`.
- **Performance:** `FlashList` with stable `keyExtractor`, memo-free by default (React Compiler), `expo-image` caching, Reanimated for animations on the UI thread.

## Checklist before finishing

- [ ] Seat checked; calls used reported.
- [ ] Spec from `figma-reader` used; all "Missing in design" rows decided in the brief.
- [ ] No file in `src/` over 150 lines (`references/verify.md` has the command); route files thin.
- [ ] No hex/rgb/hard-coded sizes outside `shared/theme`; grep is clean.
- [ ] Light and dark themes both render; new tokens were agreed with the user.
- [ ] Loading, empty, error, offline states exist and were seen on the simulator.
- [ ] Safe areas correct on a notched iPhone and Android edge-to-edge; keyboard never covers the focused input or submit.
- [ ] Every pressable >= 44 pt, labelled, with role; screen usable at largest font scale and with VoiceOver/TalkBack focus order.
- [ ] All strings in locale files (ru + en); no literal text in JSX.
- [ ] Only whitelisted libraries; `npx expo install --check` clean; `tsc --noEmit` and lint pass; tests pass.
- [ ] Simulator screenshot compared with the Figma frame (or "no simulator" stated); deviations listed with reasons.

## References

- `references/theme-tokens.md` - Figma variables / text styles -> `src/shared/theme/*`, Unistyles setup, mismatches.
- `references/component-mapping.md` - Figma components -> shared/ui, screen skeleton with states, desktop -> mobile.
- `references/verify.md` - simulator screenshots, comparison, automated checks.
- `references/libraries.json` - allowed / conditional / forbidden libraries with reasons.
- `references/sources.md` - documentation used.
- Shared: `figma-core/references/spec-template.md`, `figma-core/references/token-mapping.md` (lookup order), `frontend-pack` react-architecture, react-data-fetching, react-error-handling (same contracts on mobile).
