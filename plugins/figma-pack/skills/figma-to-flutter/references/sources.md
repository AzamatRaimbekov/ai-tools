# Sources

Read while writing this skill (October 2026). Re-check when a new Flutter stable ships (next: November 2026, where core Material/Cupertino libraries are due for deprecation).

## Flutter releases

- What's new in Flutter 3.47 - https://flutter.dev/blog/whats-new-in-flutter-3-47 (material_ui / cupertino_ui packages, `dart fix --code=migrate_design_widgets`, core libraries deprecated in the next fall release, GlobalMaterialLocalizations.delegates now includes Cupertino and Widgets)
- Flutter 3.47.0 release notes - https://docs.flutter.dev/release/release-notes/release-notes-3.47.0 (August 2026, Dart 3.13, iOS 15 minimum, Widget Previews stable)
- What's new in the docs - https://docs.flutter.dev/release/whats-new (3.38 dot shorthands, 3.44 at Google I/O 2026)
- Dot shorthands - https://dart.dev/language/dot-shorthands

## Architecture and state

- Guide to app architecture - https://docs.flutter.dev/app-architecture/guide (UI layer: views + view models; data layer: repositories + services)
- Architecture recommendations - https://docs.flutter.dev/app-architecture/recommendations (MVVM, repositories, unidirectional flow, immutable models with freezed, DI, go_router for most apps, ChangeNotifier conditional, flutter_lints)
- State management options - https://docs.flutter.dev/data-and-backend/state-mgmt/options
- Riverpod 3.0 - https://riverpod.dev/docs/whats_new and changelog https://pub.dev/packages/flutter_riverpod/changelog (stable Sept 2025; retry, offline/mutations, Ref.mounted, legacy StateProvider moved)
- Migrate Riverpod 2 -> 3 - https://startdebugging.net/2026/07/migrate-from-riverpod-2-x-to-riverpod-3-0-in-flutter/

## UI, theming, adaptive, accessibility

- Use themes to share colors and font styles - https://docs.flutter.dev/cookbook/design/themes (ThemeData, ColorScheme, ThemeExtension)
- ThemeExtension API - https://api.flutter.dev/flutter/material/ThemeExtension-class.html
- General approach to adaptive apps - https://docs.flutter.dev/ui/adaptive-responsive/general (MediaQuery.sizeOf vs LayoutBuilder, 600/840 breakpoints, decide by window size, never lock orientation)
- Accessibility - https://docs.flutter.dev/ui/accessibility (Semantics, 48x48 targets, text scaling, meetsGuideline tests)
- Performance best practices - https://docs.flutter.dev/perf/best-practices (split into widgets rather than helper functions, const constructors, keep build cheap)
- Material 3 in Flutter - https://m3.material.io/develop/flutter
- Layout spacing on Row/Column - https://api.flutter.dev/flutter/widgets/Flex/spacing.html

## Data, i18n, errors, lint

- Internationalizing Flutter apps - https://docs.flutter.dev/ui/accessibility-and-internationalization/internationalization (gen-l10n, ARB, l10n.yaml)
- go_router - https://pub.dev/packages/go_router
- dio - https://pub.dev/packages/dio ; freezed - https://pub.dev/packages/freezed
- Sentry for Flutter - https://docs.sentry.io/platforms/dart/guides/flutter/
- very_good_analysis - https://pub.dev/packages/very_good_analysis ; flutter_lints - https://pub.dev/packages/flutter_lints

## House rules

- `frontend-pack` react-architecture (150-line rule, decomposition order, feature folders), react-error-handling (ApiError kinds), react-ui (token roles). This skill keeps those contracts in Dart.
