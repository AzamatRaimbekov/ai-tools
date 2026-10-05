# Figma components -> React Native components

First source is the project catalog `.figma/design-system.json` (Figma component key -> our component). This table is the default when the catalog has no row; list the missing row under "Proposed catalog changes" in the final report and tell the user to run `figma-design-system` "update the catalog" (only that skill writes the catalog).

## Default mapping

| Figma component (typical names) | Our component (`src/shared/...`) | Built on | Notes |
|---|---|---|---|
| Text styles / any text layer | `ui/Text` (`variant`) | RN `Text` | only place with typography |
| Button / Primary, Secondary, Ghost, Destructive; sizes | `ui/Button` (`variant`, `size`, `loading`, `icon`) | `Pressable` + Unistyles variants | pressed state = Figma hover/pressed; `accessibilityRole="button"` |
| Icon button | `ui/IconButton` | `Pressable` | `accessibilityLabel` required, hit area >= 44 |
| Input / Text field (label, helper, error) | `ui/Input` + `components/FormField` | `TextInput` | `FormField` wires RHF `Controller`, label, error text |
| Textarea | `ui/Input multiline` | `TextInput` | |
| Checkbox, Radio, Switch | `ui/Checkbox`, `ui/RadioGroup`, `ui/Switch` | `Pressable` / RN `Switch` | `accessibilityState={{ checked }}` |
| Select / Dropdown | `ui/Select` | bottom sheet with list | no web-style dropdown on phones |
| Date picker | `ui/DateField` | `@expo/ui` date picker | native picker per platform |
| Card, List item, Cell | `ui/Card`, `components/ListItem` | `View` / `Pressable` | list rows are feature components when they show domain data |
| Avatar | `ui/Avatar` | `expo-image` | initials fallback |
| Badge / Chip / Tag | `ui/Badge` (`tone`) | `View` + `Text` | tones = theme roles |
| Tabs (segmented) | `ui/SegmentedControl` | `Pressable` row | top-level tabs are routes, not this |
| Bottom navigation / Tab bar | Expo Router `(tabs)/_layout.tsx` | `Tabs` | max 5, icons + labels |
| Top app bar / Navigation bar | Expo Router `Stack` header options | native header | custom header only if the frame needs it |
| Modal / Dialog | route with `presentation: 'modal'` or `ui/Dialog` for confirm | Expo Router / `Modal` | destructive confirm = `Alert.alert` is acceptable |
| Bottom sheet / Drawer | `ui/Sheet` | `@expo/ui` sheet (or `@gorhom/bottom-sheet`) | |
| Toast / Snackbar | `toast()` | `sonner-native` | one `<Toaster />` in providers |
| Skeleton / Shimmer | `ui/Skeleton` | `View` + Reanimated opacity | shape matches the loaded layout |
| Empty state | `components/EmptyState` | `Text`, `Button` | title, description, action |
| Error state | `components/ErrorState` | `Text`, `Button` | message from `ApiError` kind, retry |
| Progress / Spinner | `ui/Spinner` | `ActivityIndicator` | only inside buttons or tiny areas; screens use skeletons |
| Divider | `ui/Divider` | `View` hairline | `StyleSheet.hairlineWidth` |
| Carousel | `components/Carousel` | `FlashList horizontal` + paging | |
| Table (desktop) | feature card list | `FlashList` | see "Desktop-only frames" |

New shared component only when used in 3+ places or when it is a primitive above; otherwise it is a feature component.

## Screen skeleton with all states

```tsx
// src/features/orders/components/OrdersScreen.tsx
export function OrdersScreen({ filters }: { filters: OrderFilters }) {
  const { t } = useTranslation();
  const orders = useInfiniteQuery(orderQueries.infinite(filters)); // key factory per react-data-fetching

  if (orders.isPending) return <OrdersSkeleton />;
  if (orders.isError) return <ErrorState error={orders.error} onRetry={orders.refetch} />;
  const items = orders.data.pages.flatMap((page) => page.items);
  if (items.length === 0) return <EmptyState title={t('orders.empty.title')} />;

  return (
    <FlashList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <OrderRow order={item} />}
      onEndReached={orders.fetchNextPage}
      refreshing={orders.isRefetching}
      onRefresh={orders.refetch}
      ListFooterComponent={<ListFooter isLoading={orders.isFetchingNextPage} />}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  list: { padding: theme.space[4], paddingBottom: rt.insets.bottom + theme.space[4] },
}));
```

Route file stays thin:

```tsx
// src/app/(tabs)/orders/index.tsx
import { useLocalSearchParams } from 'expo-router';
import { OrdersScreen, orderFiltersSchema } from '@/features/orders';

export default function OrdersRoute() {
  const params = useLocalSearchParams();
  return <OrdersScreen filters={orderFiltersSchema.parse(params)} />; // Zod schema with .catch() defaults
}
```

## Forms and keyboard

- Wrap form screens in `KeyboardAwareScrollView` (react-native-keyboard-controller); `KeyboardProvider` lives in `AppProviders`.
- Each field: `returnKeyType="next"` and `onSubmitEditing` focusing the next ref; last field `returnKeyType="done"` submits.
- `keyboardType`, `autoComplete`, `textContentType` from the field meaning (email, phone, one-time-code, password).
- Sticky submit button: `KeyboardStickyView` or bottom area inside the scroll with `rt.insets.bottom`.

## Icons and images

- Catalog `icons.library` is Lucide (or the Figma icon is named like one) -> `lucide-react-native` component, `size` from `theme.size.icon`, `color` from theme role.
- Custom/brand icon -> export SVG (spec "Icons and assets" section) -> `shared/ui/icons/<Name>.tsx` with `react-native-svg`, fills replaced by `color` prop. Multicolor illustrations -> `assets/images/*.svg` rendered with `expo-image`.
- Raster images from API -> `expo-image` with `placeholder`, `transition={200}`, `contentFit="cover"`, explicit `aspectRatio` from the Figma frame.
- App icon and splash -> `app.json` (`expo-splash-screen` plugin), never a screen.

## Desktop-only frames -> phone

| Desktop pattern in Figma | Phone rendering |
|---|---|
| Multi-column grid | single column; side panel -> separate route or sheet |
| Data table | card list (`FlashList`), 2-3 key fields per row, detail on tap |
| Top navigation bar with many items | tabs (max 5) + "More" screen |
| Hover tooltips / hover reveal | always visible or long-press; never hover-only |
| Inline filters toolbar | filter button -> sheet; active filters as chips |
| Wide modal dialog | full-screen modal route |
| Pagination controls | infinite scroll with footer loader |
| Breadcrumbs | stack header with back button |

Tablets (`md` breakpoint 600+): use Unistyles breakpoints to switch to two columns only if the design or the brief asks for tablet support.
