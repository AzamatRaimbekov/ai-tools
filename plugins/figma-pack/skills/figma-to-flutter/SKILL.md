---
name: figma-to-flutter
description: Turns a Figma design into production Flutter screens for Mdigital mobile apps (Flutter 3.47 + Dart 3.13, Material 3 themed from Figma variables via ThemeData + ColorScheme + ThemeExtension, MVVM with Riverpod 3, go_router, dio + freezed, gen-l10n ARB). Consumes the platform-neutral spec from the figma-reader agent and the project design-system catalog, writes a mobile UX brief (all states, safe areas, navigation, gestures, keyboard, offline), maps tokens and components to shared widgets, builds small const widgets, then verifies on a simulator or with golden screenshots against the Figma frame. Use when the user wants Flutter/Dart code from a Figma link or mockup - "сверстай в флаттер", "флаттер по макету", "мобилка по макету на Flutter", "перенеси фигму во Flutter", "экран на Dart по фигме", "figma to flutter", "build this screen in Flutter", "Flutter from Figma". Not for React web (figma-core routes it) or React Native (figma-to-react-native).
---

# Figma -> Flutter

Entry point is `figma-core` (router). This skill owns the Flutter build. Figma is the visual target; **our rules win over Figma output** and over code from `get_design_context` (web flavoured, reference only).

Standard stack (reasons in `references/packages.json`):
Flutter 3.47 stable + Dart 3.13 - Material 3 with a brand theme generated from Figma (`ThemeData` + explicit `ColorScheme` + `ThemeExtension`) - adaptive widgets where platform behaviour matters - **MVVM from the official Flutter architecture guide, with Riverpod 3** for DI and view-model state - go_router - dio + freezed/json_serializable - gen-l10n with ARB (ru, en) - very_good_analysis + riverpod_lint - sentry_flutter. Existing project: keep its state library if it is "conditional" in the JSON; never add a "forbidden" one.

## Flow

Do the steps in order. No code before step 5 is agreed (one-line "ok" is enough for a small screen).

1. **Seat check.** `whoami` (free). View/Collab seat -> state the monthly limit (6, Starter 20) and the calls this screen needs before any rate-limited call. Ask to proceed.
2. **Catalog.** Read `<project>/.figma/design-system.md` + `.figma/design-system.json`. Missing -> run `figma-design-system` first (it costs calls: say so); otherwise mark every component mapping "(assumption)".
3. **Spec.** Delegate the link to the `figma-reader` agent with `Target platforms: flutter`; phone frames (360-430) first. It returns the neutral spec (`figma-core/references/spec-template.md`): sections 1-11 plus optional 12 "Platform notes" (flutter). Tokens arrive as `color.*`, `space.n`, `radius.*`, `text.*`, `font.weight.*`, `shadow.*`; layout as `stack(v|h)`, `grid(n)`, `wrap`, `fill` / `hug` / `fixed`, `overlay`. Re-read Figma only when confidence is low.
4. **Mobile UX brief** (short, in the chat):
   - Screens, the go_router path for each, entry points, back behaviour (Android back, iOS swipe back).
   - Navigation pattern: stack, `StatefulShellRoute` tabs, modal route, bottom sheet. AppBar vs custom header.
   - All states per screen: loading (skeleton matching layout), empty first-use, empty no-results, error + retry, offline, no access, partial data, pull-to-refresh, end of pagination. Decide every row of spec section 8 "Missing in design"; section 11 "Open questions" goes to the user.
   - Safe areas and edge-to-edge (Android 15+), status bar style per theme.
   - Gestures (swipe back, dismissible rows, pull-to-refresh, long press) with non-gesture alternatives.
   - Keyboard: field order, `textInputAction`, scroll-to-focused, dismiss on tap outside, submit visible above keyboard.
   - Offline: what reads from cache, what is blocked, failed-mutation feedback.
   - Platform deltas: dialogs, pickers, switches, haptics, page transitions.
5. **Plan.** Files to create/edit, tokens to add (`references/theme-tokens.md`), widgets to reuse vs create (`references/widget-mapping.md`), ARB keys, packages (whitelist only). Every row of spec section 9 "Token mismatches" resolved as snap / ask / new token.
6. **Build** smallest pieces first: tokens/theme -> shared widgets -> repository + view model -> feature widgets -> screen -> route. Run `dart run build_runner build -d` after freezed/riverpod changes.
7. **Verify** (`references/verify.md`): simulator screenshot at the frame width (375/390) compared with `.figma/<fileKey>/<nodeId>.png`; dark theme; text scale 2.0; states. No simulator -> golden test at the same logical size and say that a device check was not done.
8. **Review** with the checklist below; report deviations from Figma with reasons.

## Translation rules

| Spec (neutral) | Flutter |
|---|---|
| `color.<token>` (section 3, light/dark) | `ColorScheme` roles + `AppColors extends ThemeExtension` for roles M3 lacks (success, warning, brand surfaces). Read via `context.colors` / `context.appColors`. `references/theme-tokens.md`. |
| `space.n`, `radius.*` | `AppSpacing.s<n x 4>` (`space.4` -> `s16`), `AppRadius.*`, `AppSizes.*` - const doubles in `abstract final class`es, same steps as web. |
| `text.*` + `font.weight.*`, Figma text styles | `TextTheme` roles (`headlineSmall`, `titleMedium`, `bodyMedium`, `labelLarge`...) built from Figma styles; read `context.textTheme.titleMedium`. |
| `stack(v)` / `stack(h)` + gap, padding | `Column` / `Row` with `spacing: AppSpacing.s16`, `mainAxisAlignment`, `crossAxisAlignment`; padding via `Padding` + `EdgeInsets` from `AppSpacing`. `fill` = `Expanded`/`Flexible` or `CrossAxisAlignment.stretch`; `hug` = `MainAxisSize.min`; `fixed` only for icons, avatars, controls, side panels. |
| `wrap`, `grid(n)` | `Wrap(spacing:, runSpacing:)`; data grids `SliverGrid.builder` / `GridView.builder`. |
| `overlay` | `Stack` + `Positioned` only for overlays (badges, FAB); everything else re-flowed. |
| Scrolling frame | `CustomScrollView` + slivers for screens with headers and lists; `ListView.builder` / `SliverList.builder` for data. |
| Section 4 "Catalog component" | Catalog `components[]` -> `lib/shared/ui/*` (primitives), `lib/shared/widgets/*` (composites) or a feature widget; Figma variants -> constructor enums. `references/widget-mapping.md`. |
| Component styling | Component themes in `ThemeData` (`filledButtonTheme`, `inputDecorationTheme`, `cardTheme`...) so instances need no style args. |
| Section 6 icons | catalog `icons.library` Lucide -> `lucide_icons_flutter`; Material Symbols -> `Icons.*`; custom -> SVG in `assets/icons/` via `flutter_svg` wrapped in `AppIcon`, color from theme. |
| Images | `cached_network_image` with placeholder and `AspectRatio`; local raster at 1x/2.0x/3.0x folders; SVG via `flutter_svg`. |
| Desktop-only frames (section 2, no phone frame) | One column under 600 dp; side panels -> separate route or bottom sheet; tables -> card list; hover -> pressed/long-press; wide dialogs -> full-screen route; top nav -> `NavigationBar` (max 5). Tablet 600+ -> `NavigationRail` and two panes only if the brief asks. |
| `shadow.*` | M3 elevation + `surfaceContainer*` tones; custom shadows only as `AppShadows` tokens. |

Figma px = logical pixels, so catalog tokens map 1:1 (`references/theme-tokens.md`). Section 12 "Platform notes" (flutter), when present, overrides these defaults.

## Code rules

Feature-first layout (MVVM layers of the official guide inside each feature; mirrors `frontend-pack`):

```
lib/
  main.dart                bootstrap: SentryFlutter.init, ProviderScope, runApp
  app/                     app.dart (MaterialApp.router), router.dart, routes.dart (paths)
  features/<feature>/
    data/                  models/ (freezed), <entity>_api.dart (service), <entity>_repository.dart
    ui/
      view_models/         <screen>_view_model.dart (Notifier / AsyncNotifier)
      screens/             <screen>_screen.dart (thin: watches VM, switches on state)
      widgets/             one widget per file
  shared/
    ui/                    primitives: AppButton, AppTextField, AppCard, AppIcon, AppSkeleton
    widgets/               composites: EmptyState, ErrorState, LoadingList, FormFieldBlock
    theme/                 app_tokens.dart, app_colors.dart, app_typography.dart, app_theme.dart, breakpoints.dart
    api/                   api_client.dart (dio), api_exception.dart (sealed)
    l10n/                  app_ru.arb, app_en.arb (+ generated), l10n.dart (context.l10n)
    utils/
```

- **File size:** every `.dart` file in `lib/` <= 150 lines (generated `*.g.dart`, `*.freezed.dart`, `app_localizations*.dart` exempt); split at 120. `build` methods <= ~60 lines, nesting <= ~6 levels.
- **One public widget per file**, file name = snake_case of the class. A `StatefulWidget` and its `State` share a file.
- **Extract widgets, not helper methods.** `_buildHeader()` returning a widget is forbidden; create `OrdersHeader` (a class) so it gets its own element, `const` and rebuild boundary.
- **const everywhere it compiles** (constructors and instances); `super.key` on every public widget.
- **No logic in widgets:** formatting, validation, data loading live in the view model or `utils/`. Widgets read state and call view-model methods.
- **No hard-coded values in features:** no `Color(0x...)`, `Colors.*`, raw `EdgeInsets.all(13)`, `TextStyle(fontSize:)`, `BorderRadius.circular(12)`. Use `context.colors`, `AppSpacing`, `AppRadius`, `context.textTheme`.
- **State:** server data lives in Riverpod `AsyncNotifier`/`FutureProvider` (cache, auto-dispose, `ref.invalidate` = refetch); never copied into `setState`. `setState` only for ephemeral UI state (expanded, selected tab).
- **Retry:** one policy on `ProviderScope(retry: (count, error) => ...)` (Riverpod 3; returns a backoff `Duration` or `null`): retry only `ApiException` kinds network, timeout, http 408/429/5xx, at most 2 times; never other 4xx, validation or contract (same as web `isRetryable`). Riverpod's default retries every error - always override it.
- **Data:** one `ApiClient` (dio) maps every failure to a sealed `ApiException` (network | timeout | aborted | http(status) | validation(fields) | contract) - same kind names as web `ApiError`. Repositories return models, never `Response`.
- **All states:** screens switch on `AsyncValue` with `switch` expressions (`AsyncData`, `AsyncError`, loading) - empty is a branch inside data. `RefreshIndicator` on lists.
- **Forms:** `Form` + `TextFormField` via `AppTextField`; validators from the view model; server field errors shown under the field; submit disabled while pending.
- **Accessibility:** tap targets >= 48x48 dp (keep `MaterialTapTargetSize.padded`); `tooltip`/`semanticLabel` on icon-only buttons and images; `Semantics` for custom controls (`button`, `selected`, `checked`, `header` for titles); `MergeSemantics` for rows; layouts survive `TextScaler.linear(2.0)` (never clamp below 1.0 or disable scaling); contrast 4.5:1; honour `MediaQuery.disableAnimationsOf`.
- **i18n:** all strings through `context.l10n.<key>` from ARB (camelCase keys mirroring web, e.g. `ordersEmptyTitle`); plurals/selects in ICU; dates/numbers via `intl` `DateFormat`/`NumberFormat` with the current locale.
- **Responsive:** decide by window size (`MediaQuery.sizeOf`) or parent constraints (`LayoutBuilder`), breakpoints 600 / 840 in `breakpoints.dart`; never by device type or `Platform`; never lock orientation without a product reason.
- **Errors:** `SentryFlutter.init` with `FlutterError.onError` and `PlatformDispatcher.instance.onError` handled by Sentry; go_router `errorBuilder`; feature `ErrorState` with retry; no `print`.

## Checklist before finishing

- [ ] Seat checked; calls used reported.
- [ ] Spec from `figma-reader` used; every "Missing in design" row decided in the brief.
- [ ] No hand-written `.dart` file over 150 lines; no `_buildX()` widget methods; `const` lints clean.
- [ ] No `Color(0x`, `Colors.`, raw `fontSize`, raw `EdgeInsets` numbers outside `lib/shared/theme`.
- [ ] Light and dark `ThemeData` both built from tokens; new tokens agreed with the user.
- [ ] Loading, empty, error, offline states exist and were seen (simulator or goldens).
- [ ] Safe areas and keyboard correct; Android back and iOS swipe back work.
- [ ] Tap targets 48 dp, semantics labels present, screen usable at text scale 2.0 and with TalkBack/VoiceOver.
- [ ] All strings in ARB (ru + en); `flutter gen-l10n` output committed per project policy.
- [ ] Only whitelisted packages; `flutter analyze` clean; `dart format` applied; `flutter test` passes.
- [ ] Screenshot compared with the Figma frame (or "no simulator" stated); deviations listed with reasons.

## References

- `references/theme-tokens.md` - Figma variables and text styles -> ThemeData, ColorScheme, ThemeExtension, spacing classes.
- `references/widget-mapping.md` - Figma components -> shared widgets, screen with all states, view model, adaptive widgets.
- `references/verify.md` - simulator screenshots, goldens, accessibility guideline tests, grep checks.
- `references/packages.json` - allowed / conditional / forbidden packages with reasons.
- `references/sources.md` - documentation used.
- Shared: `figma-core/references/spec-template.md`, `figma-core/references/token-mapping.md` (lookup order), `frontend-pack` react-architecture / react-error-handling (same decomposition and error contracts).
