# Sources

Read while writing this skill (October 2026). Re-check versions when Expo ships a new SDK.

## Expo and React Native

- Expo SDK 57 changelog - https://expo.dev/changelog/sdk-57 (RN 0.86, React 19.2, non-breaking upgrade; 57.0.17 fixes the SDK 56 Hermes V1 memory regression with Reanimated/worklets)
- Expo SDK reference, latest = 57 - https://docs.expo.dev/versions/latest/ (iOS 16.4+, Android 7+, Node 22.13+)
- Expo SDK 56 changelog - https://expo.dev/changelog/sdk-56 (Expo Router forks React Navigation core, Expo UI production-ready, @expo/vector-icons replaced, TypeScript 6)
- Expo keyboard handling guide - https://docs.expo.dev/guides/keyboard-handling/ and keyboard-controller - https://docs.expo.dev/versions/latest/sdk/keyboard-controller/
- Expo localization guide - https://docs.expo.dev/guides/localization/ (expo-localization + i18n library: i18next, Lingui; RTL default from SDK 58)
- Using Sentry with Expo - https://docs.expo.dev/guides/using-sentry/ (wizard, EAS source maps)
- Expo Router docs - https://docs.expo.dev/router/introduction/ (src/app, layouts, ErrorBoundary export, typed routes)
- React Native accessibility - https://reactnative.dev/docs/accessibility (accessibilityRole/Label/State, font scaling)
- Apple HIG, layout and accessibility - https://developer.apple.com/design/human-interface-guidelines/accessibility (44x44 pt targets, Dynamic Type)
- Material 3 accessibility - https://m3.material.io/foundations/designing/structure (48x48 dp targets)

## Styling choice

- Unistyles 3 getting started - https://www.unistyl.es/v3/start/getting-started (RN 0.81+, New Architecture, Expo SDK 54+, nitro modules, babel plugin, StyleSheet.configure)
- NativeWind v5 docs - https://www.nativewind.dev/v5 (pre-release, not for production; stable is v4.2.x on Tailwind 3)
- React Native Styling in 2026: NativeWind vs Unistyles vs Tamagui - https://reactnativerelay.com/article/react-native-styling-2026-nativewind-unistyles-tamagui-compared (adoption, TS typing, performance, when to pick each)

## Libraries

- FlashList v2 - https://shopify.engineering/flashlist-v2 (New Architecture only, no estimatedItemSize)
- TanStack Query React Native - https://tanstack.com/query/latest/docs/framework/react/react-native (focusManager, onlineManager)
- Reanimated docs - https://docs.swmansion.com/react-native-reanimated/ (v4, worklets, useReducedMotion)
- expo-image - https://docs.expo.dev/versions/latest/sdk/image/
- Expo UI - https://docs.expo.dev/versions/latest/sdk/ui/

## House rules

- `frontend-pack` skills react-architecture, react-data-fetching, react-error-handling, react-ui and `rules/libraries.json` - folder layout, 150-line rule, query factories, ApiError, token roles. This skill keeps those contracts on mobile.
