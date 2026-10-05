# Figma design spec - template (platform-neutral)

`figma-reader` returns exactly these sections, in this order, for any target platform (web React, React Native, Flutter). The spec describes the **design**; it does not prescribe code. Platform code skills (`figma-to-react`, `figma-to-react-native`, `figma-to-flutter`) translate it using their own rules.

Rules:
- Sections 1-11 are always present. Empty section -> write "none" (never drop or renumber). Section 12 "Platform notes" is optional.
- Every value not read from Figma is marked `(assumption)`.
- Values are given twice: the Figma value and the **catalog token** from `<project>/.figma/design-system.json` (written by `figma-design-system`). Catalog tokens use neutral dot names: `color.<token>` for catalog variables (`token` field of the JSON, e.g. `color.primary`), and scale steps `space.4`, `radius.lg`, `text.sm`, `font.weight.medium`, `shadow.sm` (definition: `token-mapping.md`). Platform class/style names appear only in section 12.
- Layout is described in neutral terms: `stack(v|h)`, `grid(cols)`, `gap`, `padding`, `fill` / `hug` / `fixed`, `align`, `wrap`, `overlay`. Never in CSS, Tailwind, Flexbox-RN or Flutter widget names.

````markdown
# Figma spec: <screen name>

Source: <figma URL> | fileKey `<key>` | nodes `<id>, <id>` | read <YYYY-MM-DD>
Target platforms: web | react-native | flutter (from the caller)
Catalog: `.figma/design-system.json` v<version>, updated <updated>, fileKey <source.fileKey> | stale (> 30 days or other fileKey) | missing (ran without catalog, confidence <= medium)
Libraries in file: <names or "none"> | Code Connect: <N components, labels: React / ... | none>
Confidence: high | medium (sparse context, values inferred) | low (screenshot only)

## 1. Frames
| Frame | nodeId | Width | Form factor | State | Screenshot |
|---|---|---|---|---|---|
| Orders / Desktop | 12:34 | 1440 | desktop | default | .figma/<key>/12-34.png |
| Orders / Mobile | 12:90 | 375 | phone | default | .figma/<key>/12-90.png |

Form factors by frame width (same rule as `catalog-format.md`): < 600 phone (typically 360-430), 600-1023 tablet (744-834), >= 1024 desktop (1280-1440). A web "mobile" frame and a native phone frame are both "phone"; the platform skill decides what it means.
Feature/route guess: `orders`, entry `/orders` (assumption)

## 2. Layout per form factor
Top to bottom, per form factor, sections and their layout in neutral terms. Use real section names, not layer names.
- **phone (375)**: `Header` stack(h) [title fill, action hug] -> `Filters` collapsed behind a button (opens bottom sheet) -> `OrderList` stack(v) gap `space.3`, items = `OrderCard`
- **tablet (768)**: not designed -> see section 8
- **desktop (1440)**: content width 1200 centered, side padding 120 -> grid(2) [main fill | aside fixed 320] gap `space.8`
Constraints worth keeping: aside 320 fixed (real), sticky header, list scrolls, footer pinned to bottom (overlay).
Resizing: `fill` = takes remaining space, `hug` = sized by content, `fixed` = only when the design means it (avatars, icons, side panels); full frame widths are never fixed sizes.

## 3. Tokens
| Figma variable / value | Used on | Catalog token | Status |
|---|---|---|---|
| `color/bg/default` #FFFFFF | page background | `color.background` | match |
| `color/text/muted` #71717A | captions | `color.muted-foreground` | match |
| 24 gap | between sections | `space.6` | match |
| 15 text | table cells | `text.sm` (14) | snap, see 9 |
| `Heading/H1` text style | page title | `text.2xl` + `font.weight.semibold` | match |

## 4. Components
| Figma component (instance) | nodeId | Catalog component | Code Connect | Variant / props | Notes |
|---|---|---|---|---|---|
| Button / Primary / md | 12:40 | `Button` | React: `src/shared/ui/button.tsx` | variant=default, size=md | |
| Status chip | 12:52 | `Badge` | none | tone=success / warning | `color.warning` missing -> 9 |
| Order card | 12:60 | none (feature composite) | none | - | new `OrderCard` in feature |
| Data table | 12:70 | `Table` | none | - | in Figma library, no code component yet (catalog `codeConnect: null`, no `code.web`) |
| Detached rectangle styled as button | 12:77 | `Button` (by role) | - | variant=outline | detached instance, flagged |

Repeated pieces not in the catalog (seen 3+ times): <...> -> candidates for the shared layer.

## 5. Copy (i18n)
| Key | Text (from Figma) | Where |
|---|---|---|
| `orders.page.title` | Заказы | page title (h1) |
| `orders.actions.create` | Создать заказ | primary button |
| `orders.empty.title` | (missing in design) | see 8 |
Sample data (names, sums, dates, avatars) -> fixtures/mocks, not keys.

## 6. Icons and assets
| Asset | nodeId | Kind | Decision |
|---|---|---|---|
| plus icon | 12:41 | icon | catalog `icons.items` `plus`, strategy `<icons.strategy>` (web: lucide `Plus`) |
| logo | 12:10 | brand vector | export SVG, single color -> recolorable |
| product photo | 12:63 | content image | dynamic from API, placeholder only |
| hero illustration | 12:15 | illustration | export SVG (or PNG @2x/@3x if raster) |

## 7. States and interactions shown in Figma
- default; hover on rows (`color.accent`); selected row; disabled "Создать" when no permission; prototype links: card -> `/orders/:id`; annotations: <quoted>

## 8. Missing in design
| Missing | Where | Proposed handling (for the UX brief) |
|---|---|---|
| loading | list | skeleton matching the card layout |
| empty (first use) | list | empty state + primary action |
| empty (no results) | list with filters | active filter + reset |
| error | list | error state + retry |
| no access | page | 403 view |
| phone (375) | page | present: Orders / Mobile |
| tablet (768) | page | assumption: phone layout up to 1024, desktop above |
| hover / focus / pressed / disabled | buttons, rows | from catalog components |
| validation errors | form | inline under field |
| long text | names, addresses | truncate 1 line / clamp 2 lines |
| many items | list | pagination (web) / infinite scroll (native), 20 per page |
| dark mode | all | via tokens; Figma has dark mode: yes / no |

## 9. Token mismatches
| Figma value | Used on (nodeId) | Nearest catalog token | Delta | Proposal |
|---|---|---|---|---|
| 15 font size | table cells (12:71) | `text.sm` 14 | 1 | snap |
| #F59E0B | pending badge (12:52) | none | new meaning | ask: add `color.warning` + `color.warning-foreground`, or use `color.secondary` |
| radius 12 | cards (12:60) | `radius.xl` 14 | 2 | snap |

## 10. Reference code observations
Generated code from `get_design_context` is reference only. Observations: <absolute positions in header, fixed 1440 width, detached instances, unnamed layers "Frame 427", raster text, ...>

## 11. Open questions
- For the designer: <...>
- For the product owner: <...>
- Needs `figma-designer` (drafts to draw): <missing states / form factors> | none

## 12. Platform notes (optional)
Only for the platforms in "Target platforms", only facts the platform skill cannot derive from sections 1-11.
- **web**: catalog tokens resolve to `bg-background`, `text-muted-foreground`, `gap-6` (see `.figma/design-system.md`); table on desktop, cards on phone.
- **react-native**: bottom sheet for filters; safe-area on header; list is virtualized.
- **flutter**: <...>
````

Filling rules:
- Section 1 lists every frame of the requested screen, including state frames (Empty, Error, Loading, Hover). Skip exact duplicates and say so.
- Section 3 lists each distinct value once, with all places it is used. Status is `match`, `snap` or `mismatch`; every non-match also appears in section 9.
- Section 4 "Catalog component" is the catalog `name` (Button, Input, Badge) of a component present in the catalog; "none" otherwise. Its code path per platform comes from `components[].code` (shown only in section 12). Code Connect column gives `codeConnect.label` + `codeConnect.source` from the catalog component (or from `get_code_connect_map` when the catalog is missing/stale), exactly as recorded.
- Copy keys follow `<feature>.<section>.<item>`; reuse keys already present in the project's locale files (Grep them).
- Section 8 always contains all 12 rows; covered ones say "present: <frame>".
- Without a catalog (user declined `figma-design-system`), section 3/4 use the project's own token and component names and the header says `Catalog: missing`.
