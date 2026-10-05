# Verify a Flutter screen against Figma

Visual target: `.figma/<fileKey>/<nodeId>.png` saved by `figma-reader`. Compare at the same logical width.

## 1. Device matching the frame

| Figma frame width | iOS simulator (pt) | Android emulator (dp) |
|---|---|---|
| 360 | - | Pixel / custom AVD 360 |
| 375 | iPhone SE (3rd generation) | custom AVD 384 - state the delta |
| 390 | iPhone 16e / 14 / 13 | Pixel with 393 width |
| 393-402 | iPhone 16 / 17 / 16 Pro | Pixel 9 (412) |
| 430-440 | iPhone 16 Pro Max / Plus | Pixel 9 Pro XL |

```bash
flutter devices
xcrun simctl list devices available | grep iPhone
xcrun simctl boot "iPhone 16e" && open -a Simulator
flutter emulators            # Android AVDs, if installed
```

## 2. Run and capture

```bash
flutter run -d "iPhone 16e"
xcrun simctl io booted screenshot .figma/<fileKey>/flutter-<nodeId>-light.png
xcrun simctl ui booted appearance dark && xcrun simctl io booted screenshot .figma/<fileKey>/flutter-<nodeId>-dark.png
xcrun simctl ui booted content_size accessibility-extra-extra-extra-large
flutter screenshot -d <android-device-id> -o .figma/<fileKey>/flutter-<nodeId>-android.png
```

Reset appearance and text size afterwards. Force hard-to-reach states (error, empty, offline) with provider overrides in a debug entry point (`lib/main_dev.dart`) or in tests - never by editing production code.

## 3. Golden screenshots (works without a simulator)

```dart
testWidgets('orders screen matches figma frame 390', (tester) async {
  await loadAppFonts();                                   // load bundled fonts, otherwise text renders as boxes
  tester.view.physicalSize = const Size(390 * 3, 844 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(ProviderScope(
    overrides: [orderRepositoryProvider.overrideWithValue(FakeOrderRepository.withOrders())],
    child: const TestApp(child: OrdersScreen()),
  ));
  await tester.pumpAndSettle();
  await expectLater(find.byType(OrdersScreen), matchesGoldenFile('goldens/orders_390_light.png'));
});
```

- `loadAppFonts()` is a small test helper that registers the fonts from `pubspec.yaml` with `FontLoader`.
- One golden per state (data, empty, error, loading) and per theme; text scale 2.0 variant via `MediaQuery(data: ...copyWith(textScaler: TextScaler.linear(2)))`.
- `flutter test --update-goldens` to create; then **Read the golden PNG and the Figma PNG** and compare them like a screenshot. Goldens differ by OS font rendering - generate them on one platform (CI) only.

## 4. Compare

Top to bottom: section order and alignment; spacing rhythm; typography roles and line breaks; colors in both themes; component variants and icons; safe areas (notch, home indicator, Android navigation bar); large text without clipping. List each delta as `fixed` or `kept: <reason>`.

## 5. Accessibility tests

```dart
final handle = tester.ensureSemantics();
await expectLater(tester, meetsGuideline(androidTapTargetGuideline));   // 48x48 dp
await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));       // 44x44 pt
await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
await expectLater(tester, meetsGuideline(textContrastGuideline));
handle.dispose();
```

## 6. Automated checks

```bash
dart run build_runner build -d
flutter gen-l10n
flutter analyze
dart format --output=none --set-exit-if-changed lib test
flutter test
find lib -name "*.dart" ! -name "*.g.dart" ! -name "*.freezed.dart" ! -name "app_localizations*.dart" -exec wc -l {} + | awk '$1 > 150 && $2 != "total"'
grep -rnE "Color\(0x|Colors\.[a-z]|fontSize: [0-9]|EdgeInsets\.[a-zA-Z]+\([0-9]|circular\([0-9]" lib --include=*.dart | grep -v "lib/shared/theme/"
grep -rnE "Widget _build[A-Z]" lib
```

The greps must print nothing.

## 7. No simulator available

Say it: "No iOS simulator / Android emulator here - device check not done." Still run goldens (section 3) and compare them with the Figma PNG, run sections 5-6, and list what the user must check on a device: keyboard, safe areas, gestures, platform dialogs, real text scaling.
