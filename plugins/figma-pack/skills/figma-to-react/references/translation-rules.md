# Figma -> React translation rules

Inputs: the neutral spec (`../../figma-core/references/spec-template.md`), the catalog (`.figma/design-system.md`), the reference code from `get_design_context`. Output: code that follows `frontend-pack`. Where this file and a `frontend-pack` skill disagree, the skill wins.

## 1. Reference code is a prototype, not a draft

Figma's own guidance calls the returned code "a high visual fidelity non-interactive prototype": adapt it to the project stack, translate absolute positioning into project-native layout, reuse existing components instead of recreating them with raw markup. Concretely:

- Take from it: hierarchy, which nodes are instances, auto-layout values, text content, asset URLs.
- Throw away: class strings with arbitrary values, `absolute` + coordinates, fixed frame sizes, `data-name` attributes, inline SVG paths for icons that exist in lucide, generic component names.

```tsx
// Figma reference output (do not paste)
<div className="absolute left-[120px] top-[96px] w-[1200px] flex flex-col gap-[24px]" data-name="Frame 427">
  <p className="font-['Inter:Semi_Bold'] text-[28px] text-[#09090b]">Заказы</p>
  <div className="bg-[#18181b] rounded-[8px] px-[16px] py-[8px]"><p className="text-[14px] text-white">Создать заказ</p></div>
</div>

// Ours
<section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 lg:px-8">
  <header className="flex items-center justify-between gap-4">
    <h1 className="text-3xl font-semibold tracking-tight">{t("orders.page.title")}</h1>
    <Button>{t("orders.actions.create")}</Button>
  </header>
</section>
```

28px snapped to `text-3xl` (30) and recorded in spec section 9; `#18181b` button is `Button` default variant (`bg-primary`).

## 2. Components

Order of decision for each instance in the spec's section 4:

1. **Code Connect** label `React` with a source path -> use exactly that component and its props. Figma: "ALWAYS directly reuse the connected component UNLESS it cannot be configured or extended to express the design. Styling or wiring effort is NOT an exception."
2. **Catalog row** -> the file in its `code.web` (a `shared/ui` or `shared/components` path).
3. **By role** (detached or unpublished): button-looking -> `Button`; text field -> `Input` in `Field`; chip -> `Badge`; modal -> `Dialog`/`AlertDialog`; side panel on mobile -> `Sheet`; segmented control -> `Tabs` or `ToggleGroup`; menu -> `DropdownMenu`; row skeleton -> `Skeleton`; table -> `Table` (+ TanStack Table when sortable).
4. **Not installed** -> `npx shadcn@latest add <name>`; check `components.json` and `src/shared/ui` first.
5. **No shadcn equivalent** -> new component per `react-ui` section 1 (composition, `cva`, `cn`, tokens), in `shared/components` if reused in 3+ places, else in the feature.

Variant mapping: Figma `Variant=Primary|Secondary|Ghost`, `Size=sm|md|lg`, `State=Disabled` -> props of the existing `cva` (`variant`, `size`, `disabled`). Figma states Hover/Pressed/Focused are not props; the primitive handles them. A Figma variant with no `cva` equivalent -> add the variant to the `shared/ui` file (and propose the catalog row in the final report for `figma-design-system` "update the catalog"), never `className` overrides at the call site.

Code Connect write-back for our primitives (when the plan allows: Organization/Enterprise, published library) is done by the `figma-designer` agent via `figma-core/references/design-system-sync.md`, so future `get_design_context` calls return `<Button variant="outline">` instead of divs. `.figma.ts` templates are an optional later step.

## 3. Layout

| Figma | Tailwind |
|---|---|
| Auto layout vertical / horizontal | `flex flex-col` / `flex flex-row` (or `flex items-center` for a row) |
| Item spacing N | `gap-{N/4}` on the parent; "space between" -> `justify-between` |
| Padding T R B L | `p-*` / `px-* py-*` / `pt-*` ... |
| Fill container (main axis) | `flex-1 min-w-0` |
| Fill container (cross axis) | `self-stretch` / `w-full` |
| Hug contents | no size class |
| Fixed size on a real constraint (avatar, icon, side panel) | `size-*`, `w-80`, `basis-80 shrink-0` |
| Min / max width | `min-w-*` / `max-w-*` |
| Wrap | `flex-wrap` |
| Auto layout grid (Config 2025) | `grid grid-cols-{n} gap-*`; spans -> `col-span-*`; responsive cols mobile-first |
| Absolute child inside auto layout | overlay: `relative` parent + `absolute` child with token offsets (`top-2 right-2`) |
| Constraints Left & Right / Scale | `w-full` with container padding |
| Constraints Center | `mx-auto` |
| Frame with no auto layout | infer the flex/grid structure from positions; never copy x/y |
| Clip content | `overflow-hidden` only when the design clips (cards with images) |
| Scrollable area in prototype | `overflow-auto` on that region; page scroll stays on the body |

Rhythm check after mapping: `gap-2` inside controls, `gap-4` inside cards, `gap-6`/`gap-8` between sections (`react-ui` section 5). A spec value that breaks the rhythm by one step is snapped.

## 4. Text

- Text style -> class recipe from the catalog (`Heading/H1` -> `text-3xl font-semibold tracking-tight`). Recipe used 3+ times -> a `Heading`/`Text` component in `shared/components`.
- Font family is the project font. Figma "Inter Semi Bold" -> `font-semibold`, never `font-['Inter']`.
- Text that looks like a heading is a heading element; one `h1` per page.
- Line breaks in Figma text are not `<br>`; let text wrap. Fixed-width text boxes become `max-w-prose` or nothing.
- Truncation in Figma (`...`) -> `truncate` / `line-clamp-*` with `min-w-0` on the flex child.

## 5. Copy and data

- Every visible string -> `t("<feature>.<section>.<item>")`. Key names describe the role, not the text (`orders.empty.title`, not `orders.noOrdersYet`).
- Locale files get the Russian text from Figma; other locales get the same key with a TODO only if the project already has them.
- Sample content (people, amounts, dates, product names, avatars) -> MSW fixtures and factories. Formatting (currency, dates) uses `Intl` through the project's helpers, not the string from Figma.

## 6. Icons and assets

1. Icon instance -> catalog mapping -> `lucide-react` named import. No mapping -> compare the shape with lucide (same metaphor and stroke) and list the match under "Proposed catalog changes" in the final report and tell the user to run `figma-design-system` "update the catalog" (only that skill writes the catalog). Size `size-4`/`size-5`, color `currentColor`, decorative -> `aria-hidden`.
2. Not in lucide (brand logos, custom glyphs) -> download the SVG through the URL `get_design_context` returned (or `download_assets`), turn it into a component in `src/shared/ui/icons/<Name>.tsx` with `fill="currentColor"` (or `stroke`) when single-color; keep root `width`/`height`/`viewBox`; never redraw or edit paths.
3. Illustrations and raster images -> `public/` (Vite) or `next/image` with explicit size (Next.js); `alt` text from i18n; 2x resolution for raster.
4. Data images (avatars, product photos) are props, never exported files. Placeholder = the `Avatar` fallback or a token-colored box.
5. The Figma screenshot is a visual target, never an asset in code.

## 7. Behaviour the picture does not show

- States: loading skeleton matching the final layout, empty (first use / no results), error with retry, no access - from the brief, using `QueryState`, `EmptyState`, `ErrorState` (`react-ux`).
- Forms: RHF + Zod, labels above fields, inline errors (`react-ux/references/forms.md`), even if Figma shows only the happy path.
- Lists: filters/sort/page in URL; pagination keeps previous data.
- Prototype links -> router `Link` to the real route; Figma "overlay" interactions -> `Dialog`/`Sheet`/`Popover`.
- Motion: Figma smart-animate is a hint; use primitives' animations and respect `motion-reduce`.

## 8. Accessibility regardless of the mockup

`react-ui` sections 8-9 apply: landmarks, one `h1`, visible focus, accessible names on icon buttons, contrast 4.5:1 (a Figma color pair that fails contrast is a mismatch row: ask), tap targets >= 24px (44 preferred on touch).
