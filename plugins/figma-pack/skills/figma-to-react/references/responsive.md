# From Figma frames to one responsive implementation

Designers draw fixed frames (375, 768, 1280/1440). The web has a continuous range of widths. We build **one component tree with mobile-first Tailwind classes**, never one page per frame and never `if (isMobile)` branches for layout.

## Frame width -> breakpoint

| Figma frame | Means | Tailwind |
|---|---|---|
| 360-430 | phone | unprefixed classes |
| 744-834 | tablet portrait | `md:` (768) |
| 1024 | tablet landscape / small laptop | `lg:` (1024) |
| 1280 | desktop | `xl:` (1280) |
| 1440, 1920 | desktop, wider canvas | `xl:` / `2xl:` (1536) + content max-width |

The class at a breakpoint applies **from** that width up. A design value at 768 that must not apply at 1280 needs a reset at `xl:`.

## Content width

A 1440 frame with 1200 content and 120 side padding means: content `max-w-7xl` (1280, nearest container) or the project's container class, `mx-auto`, padding `px-4 md:px-6 lg:px-8`. The body background spans the full width. Never `w-[1440px]`, never `min-w` on the page.

## Recipes

| Desktop frame | Phone frame (or derived) | Implementation |
|---|---|---|
| 3-4 card grid | 1 column | `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` |
| sidebar + content | content, sidebar in drawer | `lg:grid lg:grid-cols-[16rem_1fr]`; below `lg` the sidebar is a `Sheet` opened from the header |
| content + right panel 320 | panel below content | `flex flex-col gap-6 lg:flex-row` + panel `lg:w-80 lg:shrink-0` |
| data table | cards | `<OrdersTable className="hidden md:block" />` + `<OrdersCardList className="md:hidden" />`, same data hook; or a table with horizontal scroll and sticky first column when columns must be compared |
| toolbar with 4 actions | primary + menu | primary `Button` always visible; secondary in `DropdownMenu` below `md` |
| horizontal tabs | tabs scroll or select | `TabsList` with `overflow-x-auto`, or `Select` below `sm` for 6+ tabs |
| inline filters row | filters button -> `Sheet` | filter state in URL in both cases |
| dialog | full-screen sheet | `Dialog` on `md+`, `Drawer`/`Sheet` side="bottom" on phone (one wrapper component) |
| hero with image right | image below or hidden | `flex flex-col md:flex-row`; decorative image `hidden md:block` |
| footer 4 columns | accordion or stacked | `grid grid-cols-1 gap-8 md:grid-cols-4` |

Switching two components by breakpoint with `hidden md:block` is fine when the structure truly differs; when only spacing or columns change, use one component with responsive classes.

## Container queries

Cards, widgets and form sections that live in slots of different widths (main column vs sidebar vs dialog) respond to their container, not the viewport: parent `@container`, child `@md:flex-row`. Use them when the same component appears in two layouts in the frames.

## Missing frames

- **Desktop only**: derive phone with `react-page-ux` rules; write every derivation into the brief as an assumption ("таблица -> карточки ниже md").
- **Phone only**: desktop keeps the order, constrains width (`max-w-2xl` for forms and reading, `max-w-7xl` for dashboards), uses multiple columns only for grids of equal items.
- **Tablet missing**: per section pick "phone layout up to `lg`" (dense data, forms) or "desktop layout from `md`" (grids, dashboards). State it.
- **Desktop and phone differ in content** (an element exists only on desktop): confirm with the designer; default is to keep the element on phone in a menu or lower position, not to delete it.

## Verify

Screenshots at 375 and 1280 compared with Figma; also look at 768 (recommended; no horizontal scroll, nothing clipped), and at 1024 if the layout switches at `lg`. Resize once through the whole range to catch a breakpoint where the layout breaks between frames.
