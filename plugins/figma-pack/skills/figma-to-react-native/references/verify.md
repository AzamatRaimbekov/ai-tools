# Verify a React Native screen against Figma

Visual target: the PNG saved by `figma-reader` in `.figma/<fileKey>/<nodeId>.png`. Compare at the same logical width.

## 1. Pick a device that matches the frame width

| Figma frame width | iOS simulator (points) | Android emulator (dp) |
|---|---|---|
| 375 | iPhone SE (3rd generation), 375 | custom AVD 360 or 384 - state the delta |
| 390 | iPhone 16e / 14 / 13, 390 | Pixel with 393 width (closest) |
| 393-402 | iPhone 16 / 17 / 16 Pro | Pixel 9, 412 |
| 430-440 | iPhone 16 Pro Max / Plus | Pixel 9 Pro XL |

```bash
xcrun simctl list devices available | grep -E "iPhone"     # what exists on this Mac
xcrun simctl boot "iPhone 16e" && open -a Simulator
emulator -list-avds                                          # Android, if the SDK is installed
```

Width differs from the frame by more than 15 pt -> say so in the report and compare proportions, not absolute positions.

## 2. Run and capture

```bash
npx expo run:ios --device "iPhone 16e"        # dev build; Expo Go is fine if no custom native modules
xcrun simctl io booted screenshot .figma/<fileKey>/rn-<nodeId>-light.png
xcrun simctl ui booted appearance dark && xcrun simctl io booted screenshot .figma/<fileKey>/rn-<nodeId>-dark.png
xcrun simctl ui booted content_size extra-extra-extra-large   # largest standard text size; accessibility sizes: accessibility-extra-extra-extra-large
adb exec-out screencap -p > .figma/<fileKey>/rn-<nodeId>-android.png
adb shell settings put system font_scale 2.0                 # Android 200% text
```

Reset after checks: `xcrun simctl ui booted appearance light`, `xcrun simctl ui booted content_size large`, `adb shell settings put system font_scale 1.0`.

States that are hard to reach (error, empty, offline): add a dev-only MSW handler or a query override in a test build, never edit production code to force a state. Offline: toggle network link conditioner / `adb shell svc wifi disable`.

## 3. Compare

Read both images (Figma PNG and the simulator screenshot) and check, top to bottom:
1. Section order and alignment; nothing missing or extra.
2. Spacing rhythm: gaps and paddings follow the same steps (exact pixels may differ by device scale).
3. Typography: role, weight, line breaks at this width.
4. Colors: semantic roles, both themes.
5. Components: right variant and size; icons correct.
6. Safe areas: content not under the notch, status bar readable, home indicator clear.
7. Large text: no clipped or overlapping text; rows grow instead of truncating critical info.

List each delta as `fixed` or `kept: <reason>` (platform convention, token snap, a11y).

## 4. Automated checks

```bash
npx tsc --noEmit
npx expo lint
npx expo install --check                      # versions match the SDK
npx jest --watchAll=false                     # jest-expo + @testing-library/react-native
find src -name "*.tsx" -not -path "*/shared/ui/icons/*" -exec wc -l {} + | awk '$1 > 150 && $2 != "total"'
grep -rnE "#[0-9A-Fa-f]{3,8}\b|rgba?\(" src --include=*.tsx | grep -v "src/shared/theme/"
grep -rnE "fontSize: [0-9]|(margin|padding|gap)[A-Za-z]*: [0-9]{2,}" src --include=*.tsx | grep -v "src/shared/theme/"
grep -rn "allowFontScaling={false}" src
```

Each grep must print nothing (or only lines with a justifying comment).

## 5. No simulator available

Say it plainly: "No iOS simulator / Android emulator available here - visual comparison not done." Then still run section 4, render each state in a `@testing-library/react-native` test (asserts text, roles, labels), and list what the user should check on a device: the screens, the 375/390 width, dark mode, largest text, keyboard on form screens.
