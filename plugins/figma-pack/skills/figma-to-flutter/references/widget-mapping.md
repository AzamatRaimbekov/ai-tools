# Figma components -> Flutter widgets

First source is the project catalog `.figma/design-system.json`. This table is the default when the catalog has no row; list the missing row under "Proposed catalog changes" in the final report and tell the user to run `figma-design-system` "update the catalog" (only that skill writes the catalog).

## Default mapping

| Figma component (typical names) | Our widget (`lib/shared/...`) | Built on | Notes |
|---|---|---|---|
| Button / Primary, Secondary, Ghost, Destructive | `ui/app_button.dart` `AppButton(variant:, size:, isLoading:, icon:)` | `FilledButton`, `FilledButton.tonal`, `OutlinedButton`, `TextButton` | styles from component themes, not per instance |
| Icon button | `IconButton` with `tooltip` | Material | tooltip = semantics label |
| Text field (label, helper, error) | `ui/app_text_field.dart` | `TextFormField` | `InputDecoration` from theme |
| Checkbox, Radio, Switch | `Checkbox.adaptive`, `Radio.adaptive`, `Switch.adaptive` | Material/Cupertino | wrap with `CheckboxListTile` etc. for row tap targets |
| Select / Dropdown | `ui/app_select.dart` | `showModalBottomSheet` + list (or `DropdownMenu` on tablet) | |
| Date picker | `showDatePicker` / `CupertinoDatePicker` by platform | | platform delta from the brief |
| Card | `Card` / `ui/app_card.dart` | Material | `cardTheme` |
| List item / Cell | `ListTile` or feature `<entity>_tile.dart` | Material | domain rows are feature widgets |
| Avatar | `ui/app_avatar.dart` | `CircleAvatar` + `CachedNetworkImageProvider` | initials fallback |
| Badge / Chip / Tag | `Badge`, `Chip`, `FilterChip`; `ui/status_chip.dart` for tones | Material | tones from `AppColors` |
| Segmented control | `SegmentedButton` | Material | |
| Tab bar (bottom) | `NavigationBar` in `StatefulShellRoute` shell | go_router | max 5; `NavigationRail` >= 600 dp |
| Top tabs | `TabBar` + `TabBarView` | Material | |
| App bar / header | `AppBar` / `SliverAppBar` | Material | `centerTitle` follows platform default |
| Dialog / Alert | `showAdaptiveDialog` + `AlertDialog.adaptive` | Material/Cupertino | |
| Bottom sheet | `showModalBottomSheet(useSafeArea: true, showDragHandle: true)` | Material | |
| Snackbar / Toast | `ScaffoldMessenger.of(context).showSnackBar` | Material | via a shared helper |
| Skeleton | `skeletonizer` around the real widget with fake data | | shape = loaded layout |
| Spinner | `CircularProgressIndicator.adaptive` | | buttons and tiny areas only |
| Empty / Error state | `widgets/empty_state.dart`, `widgets/error_state.dart` | | message from `ApiException` kind + retry |
| Divider | `Divider` / `VerticalDivider` | Material | color `outlineVariant` |
| Carousel | `CarouselView` | Material 3 | |
| Data table (desktop) | feature card list | `SliverList.builder` | see desktop table below |

New shared widget only when used in 3+ places or it is a primitive above.

## View model (Riverpod 3, MVVM)

```dart
// features/orders/ui/view_models/orders_view_model.dart
@riverpod
class OrdersViewModel extends _$OrdersViewModel {
  @override
  Future<List<Order>> build() => ref.watch(orderRepositoryProvider).fetchOrders();

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
```

Repository (`data/order_repository.dart`) is an abstract class + implementation provided by a provider; the API service only talks HTTP. Tests override `orderRepositoryProvider` with a fake.

## Screen with all states

```dart
// features/orders/ui/screens/orders_screen.dart
class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(ordersViewModelProvider);
    return Scaffold(
      appBar: AppBar(title: Text(context.l10n.ordersTitle)),
      body: switch (orders) {
        AsyncData(:final value) when value.isEmpty => EmptyState(title: context.l10n.ordersEmptyTitle),
        AsyncData(:final value) => OrdersList(orders: value),
        AsyncError(:final error) => ErrorState(error: error, onRetry: () => ref.invalidate(ordersViewModelProvider)),
        _ => const OrdersSkeleton(),
      },
    );
  }
}
```

`OrdersList` (own file) uses `RefreshIndicator.adaptive(onRefresh: ref.read(ordersViewModelProvider.notifier).refresh, child: ListView.separated(...))` with `padding: const EdgeInsets.all(AppSpacing.s16)` and `separatorBuilder` spacing from tokens.

Route stays thin (`app/router.dart`): `GoRoute(path: Routes.orders, builder: (_, __) => const OrdersScreen())`.

## Forms and keyboard

- Form screens: `Scaffold(resizeToAvoidBottomInset: true)` + `SingleChildScrollView` / `CustomScrollView`; submit in `bottomNavigationBar` area padded with `MediaQuery.viewInsetsOf`.
- `textInputAction: TextInputAction.next` with `FocusTraversalGroup`; last field `done` submits.
- `keyboardType`, `autofillHints` (`AutofillHints.email`, `.oneTimeCode`, `.password`) wrapped in `AutofillGroup`.
- Dismiss keyboard on tap outside: `TapRegion` / `GestureDetector(onTap: FocusScope.of(context).unfocus)` at screen level.

## Material and Cupertino

Standard: Material 3 themed with Figma tokens on both platforms (the brand design is the same). Use adaptive constructors where users expect platform behaviour: `Switch.adaptive`, `Checkbox.adaptive`, `CircularProgressIndicator.adaptive`, `showAdaptiveDialog`, `RefreshIndicator.adaptive`, `Slider.adaptive`. Page transitions and scroll physics already follow the platform. Full Cupertino screens only if the Figma file is explicitly an iOS-native design.

## Icons and images

- Catalog `icons.library` is Lucide -> `Icon(LucideIcons.<name>)` (`lucide_icons_flutter`); Material Symbols -> `Icon(Icons.<name>)`. Size `AppSizes.icon`, color from `IconTheme`.
- Custom/brand icon -> `assets/icons/<name>.svg`, rendered by `AppIcon` (`SvgPicture.asset` with `ColorFilter.mode(color, BlendMode.srcIn)`), `semanticsLabel` when meaningful.
- Remote images -> `CachedNetworkImage` inside `AspectRatio` (from the Figma frame), `placeholder` = skeleton, `errorWidget` = neutral icon.
- Local raster -> `assets/images/` with `2.0x/` and `3.0x/` variants declared in `pubspec.yaml`.

## Desktop-only frames -> phone

| Desktop pattern | Phone (< 600 dp) | Tablet (>= 600 dp, only if in brief) |
|---|---|---|
| Multi-column grid | single column | `LayoutBuilder` -> two columns |
| Data table | card list, 2-3 key fields, detail route on tap | list + detail panes |
| Top nav with many items | `NavigationBar` (max 5) + "More" | `NavigationRail` |
| Hover reveal / tooltip | visible action or long-press menu | same |
| Inline filter toolbar | filter button -> bottom sheet, active filters as chips | inline row |
| Wide dialog | full-screen route (`fullscreenDialog: true`) | dialog |
| Pagination controls | infinite scroll with footer loader | same |
