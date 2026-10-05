# Figma variables -> Flutter theme

Lookup order for every value is the neutral one in `figma-core/references/token-mapping.md` (Figma -> catalog token -> platform). This file defines the **target** in a Flutter project.

## Catalog token -> Flutter

A catalog variable with `code.flutter` set maps straight to that expression; the table below is the default when it is empty.

| Spec / catalog token | Flutter |
|---|---|
| `color.<token>` | `context.colors.<ColorScheme field>` by the role table below, or `context.appColors.<role>` for roles M3 lacks |
| `color.primary` @ 10% | named role in `AppColors` (`primarySubtle`), not `withValues(alpha:)` in widgets |
| `space.n` | `AppSpacing.s<n x 4>` (`space.4` -> `AppSpacing.s16`, `space.6` -> `s24`) |
| `radius.*` | `AppRadius.sm/md/lg/xl/full` |
| `text.*` + `font.weight.*`, Figma text styles (catalog `textStyles[]`) | `context.textTheme.<role>` (typography table below) |
| `tracking.tight` | `letterSpacing` inside the `TextTheme` role |
| `shadow.*` | M3 elevation level or `AppShadows.*` |
| `breakpoint.md` / `lg` | `Breakpoints.medium` (600) / `expanded` (840) - window-size classes, not web widths |

Figma px = Flutter logical pixels. `lib/shared/theme` is the source of truth; when the catalog disagrees with it, the catalog is stale (re-run `figma-design-system`).

## Target files (`lib/shared/theme/`)

| File | Holds |
|---|---|
| `app_tokens.dart` | primitives from Figma (`AppPalette`), `AppSpacing`, `AppRadius`, `AppSizes`, font family names |
| `app_colors.dart` | `AppColors extends ThemeExtension<AppColors>`: roles Material's `ColorScheme` does not have; `light` and `dark` instances |
| `app_typography.dart` | `TextTheme` built from Figma text styles |
| `app_theme.dart` | `AppTheme.light()` / `AppTheme.dark()` -> `ThemeData` (ColorScheme, TextTheme, extensions, component themes) |
| `theme_context.dart` | `extension on BuildContext { colors, appColors, textTheme }` |
| `breakpoints.dart` | `abstract final class Breakpoints { static const medium = 600.0; static const expanded = 840.0; }` |

Only `lib/shared/theme/**` may contain `Color(0x...)` or raw numbers for spacing, radius and font sizes.

Imports: Flutter 3.47 ships Material as the `material_ui` package (core `flutter/material.dart` still works and is scheduled for deprecation in the November release). Follow the project: if `material_ui` is in `pubspec.yaml`, import `package:material_ui/material_ui.dart`; migrate with `dart fix --apply --code=migrate_design_widgets` only as a separate agreed change.

## app_tokens.dart

```dart
abstract final class AppPalette {         // Figma primitive collection, names kept
  static const gray50 = Color(0xFFFAFAFA);
  static const gray200 = Color(0xFFE4E4E7);
  static const gray500 = Color(0xFF71717A);
  static const gray900 = Color(0xFF18181B);
  static const blue600 = Color(0xFF2563EB);
  static const red600 = Color(0xFFDC2626);
  static const green600 = Color(0xFF16A34A);
  static const white = Color(0xFFFFFFFF);
}

abstract final class AppSpacing {         // full space.* scale (token-mapping.md), same steps as web and RN (s24 = space.6 = gap-6)
  static const s2 = 2.0, s4 = 4.0, s6 = 6.0, s8 = 8.0, s10 = 10.0, s12 = 12.0, s16 = 16.0, s20 = 20.0;
  static const s24 = 24.0, s32 = 32.0, s40 = 40.0, s48 = 48.0, s64 = 64.0, s80 = 80.0, s96 = 96.0;
  static const screen = s16;              // horizontal screen padding on phones
}

abstract final class AppRadius {
  static const sm = 6.0, md = 8.0, lg = 10.0, xl = 14.0, full = 999.0;
}
```

## ColorScheme from Figma roles

Build the `ColorScheme` explicitly from Figma variables (Light and Dark modes). Use `ColorScheme.fromSeed` only when Figma defines nothing but a brand color, and then list it as an assumption.

| Figma role (as in token-mapping.md) | `ColorScheme` field |
|---|---|
| `primary` / `primary-foreground` | `primary` / `onPrimary` |
| `secondary` / `secondary-foreground` | `secondary` / `onSecondary` (or `secondaryContainer` / `onSecondaryContainer` for tonal buttons) |
| `background`, `surface/page` / `foreground` | `surface` / `onSurface` |
| `card`, `surface/raised` | `surfaceContainerLow` (cards), `surfaceContainer` / `surfaceContainerHigh` (sheets, dialogs) |
| `muted` | `surfaceContainerHighest` |
| `muted-foreground`, `text/secondary` | `onSurfaceVariant` |
| `destructive`, `error` / foreground | `error` / `onError` |
| `border`, `divider` | `outlineVariant` |
| `input`, strong stroke | `outline` |
| `accent`, `bg/hover` | `secondaryContainer` / `onSecondaryContainer` or `AppColors.accent` |
| `ring`, `focus` | `primary` (focus colors come from component themes) |
| `success`, `warning`, `info`, brand-specific | `AppColors` extension (with `on*` pairs) |

## app_colors.dart (ThemeExtension)

```dart
@immutable
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({required this.success, required this.onSuccess, required this.warning, required this.onWarning});
  final Color success, onSuccess, warning, onWarning;

  static const light = AppColors(success: AppPalette.green600, onSuccess: AppPalette.white, warning: Color(0xFFD97706), onWarning: AppPalette.white);
  static const dark = AppColors(success: Color(0xFF4ADE80), onSuccess: AppPalette.gray900, warning: Color(0xFFFBBF24), onWarning: AppPalette.gray900);

  @override
  AppColors copyWith({Color? success, Color? onSuccess, Color? warning, Color? onWarning}) => AppColors(
        success: success ?? this.success, onSuccess: onSuccess ?? this.onSuccess,
        warning: warning ?? this.warning, onWarning: onWarning ?? this.onWarning);

  @override
  AppColors lerp(AppColors? other, double t) => other == null ? this : AppColors(
        success: Color.lerp(success, other.success, t)!, onSuccess: Color.lerp(onSuccess, other.onSuccess, t)!,
        warning: Color.lerp(warning, other.warning, t)!, onWarning: Color.lerp(onWarning, other.onWarning, t)!);
}
```

Warning hex values above belong in `AppPalette` in a real project. Every role exists in both instances; every surface role has an `on*` pair with contrast >= 4.5:1.

## Typography

| Figma text style (examples) | `TextTheme` role |
|---|---|
| `Display`, `H1` (28-36) | `headlineLarge` / `headlineMedium` |
| `H2`, `H3`, screen title (20-24) | `headlineSmall` / `titleLarge` |
| Section / card title (16-18, medium-semibold) | `titleMedium` |
| `Body` (16) / `Body S` (14) | `bodyLarge` / `bodyMedium` |
| `Caption`, `Footnote` (12) | `bodySmall` |
| `Button`, `Label` (14 medium) | `labelLarge` |
| Chip, tab, badge text (12 medium) | `labelMedium` / `labelSmall` |

```dart
TextTheme appTextTheme(Color onSurface) => TextTheme(
  titleMedium: TextStyle(fontFamily: AppFonts.sans, fontSize: 16, height: 24 / 16, fontWeight: FontWeight.w600, color: onSurface),
  bodyMedium: TextStyle(fontFamily: AppFonts.sans, fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w400, color: onSurface),
  // ... every role the design uses; unused roles fall back to Material defaults
);
```

- `height` = Figma line height px / font size. Figma letter spacing % -> `letterSpacing: fontSize * percent / 100`.
- Fonts bundled in `assets/fonts/` and declared in `pubspec.yaml` with weights; no runtime font fetching.
- A Figma style with no role used in 3+ places -> an `AppTextStyles` entry in the extension, not an ad-hoc `TextStyle` in a widget.

## app_theme.dart

```dart
abstract final class AppTheme {
  static ThemeData light() => _build(_lightScheme, AppColors.light);
  static ThemeData dark() => _build(_darkScheme, AppColors.dark);

  static ThemeData _build(ColorScheme scheme, AppColors app) => ThemeData(
    colorScheme: scheme,
    textTheme: appTextTheme(scheme.onSurface),
    extensions: [app],
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(
      minimumSize: const Size.fromHeight(AppSizes.control),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(AppRadius.md))))),
    inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)))),
    cardTheme: const CardThemeData(margin: EdgeInsets.zero),
  );
}
```

`MaterialApp.router(theme: AppTheme.light(), darkTheme: AppTheme.dark(), themeMode: ThemeMode.system)`. Material 3 is the default; never set `useMaterial3: false`.

## Spacing, radius, sizes

| Figma px | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 |
|---|---|---|---|---|---|---|---|---|---|
| Flutter | `AppSpacing.s4` | `s8` | `s12` | `s16` | `s20` | `s24` | `s32` | `s40` | `s48` |

- Off-scale (13, 15, 18, 22) -> nearest step, recorded as `snap` in the spec's "Token mismatches".
- Radius -> `AppRadius` by the neutral table; pills -> `StadiumBorder()`.
- Icon/avatar/control sizes -> `AppSizes` (`icon = 24`, `avatar = 40`, `control = 48`).

## Mismatches

**snap** (one step, same role), **ask** (meaningful color, visible delta), **new token** (repeated meaning; added to `AppPalette` + both `AppColors`/schemes; only after the user agrees). Do not edit `.figma/design-system.*`: list it under "Proposed catalog changes" in the final report and tell the user to run `figma-design-system` "update the catalog" (only that skill writes the catalog).
