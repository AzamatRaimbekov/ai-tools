# Figma design practices adopted by Mdigital

Researched October 2026. Numbers in brackets point to `sources.md`. Where a source and our catalog disagree, the catalog wins (`figma-core` section 4).

## 1. Auto layout [1][2][3]

- Every container whose children relate (stacked, side by side, aligned) is an auto-layout frame. Absolute x/y is only for where a top-level frame sits on the canvas [3].
- Resizing: **Hug** = size from children (buttons, chips, cards with content height); **Fill** = take the parent's free space (only for children of auto layout, not top-level frames); **Fixed** = real constraint (icon 24, avatar 40, sidebar 280, frame width per breakpoint) [1].
- **Min/max width** instead of fixed widths for readable content: text blocks max ~640-720, inputs min 240, cards min 280 so a grid reflows instead of squashing [1].
- **Wrap** for tag/chip rows and card rows that reflow; **Grid** auto layout (2025) for two-dimensional layouts - galleries, bento, dashboards - with spans; it maps to CSS grid in Dev Mode [1][2].
- **Gap and padding** from spacing variables; "Auto" spacing (space-between) only for bars (header, toolbar) where items sit at both ends [1].
- **Ignore auto layout (absolute)** only for overlays: notification badge on an icon, close button on a dialog corner, floating action button, decorative element pinned to an edge [1].
- In scripts: append to the auto-layout parent first, then set Fill/Hug; `resize()` before sizing modes; wrapping text = `textAutoResize = 'HEIGHT'` + fixed width [3].

## 2. Variables and modes [4][5][6][7]

- Two layers: **primitives** (raw palette, hidden from publishing, empty scopes) and **semantic** variables aliased to them (`color/bg/default -> gray/0`). Designs bind only semantic variables [6][7].
- Scopes restrict where a variable appears (fill vs text vs stroke vs gap vs radius); never `ALL_SCOPES` [6][7].
- Code syntax on every variable (`var(--background)` for WEB) so Dev Mode and `get_design_context` show code names [6][7].
- **Modes** hold alternative values per collection: Light/Dark for color; Desktop/Tablet/Mobile for spacing, type size and layout widths. A frame/section/component can pin a mode; children on "Auto" inherit it up the tree, falling back to the collection default [4][5].
- Show the dark theme or the mobile density by switching the frame's mode, not by duplicating and recoloring layers [4].
- Do not detach variables or styles; if something is missing, ask the design-system owners [5].

## 3. Components, properties, slots [8][9][10][11]

- Variants for big visual differences (type, state, size); boolean, text and instance-swap properties for small customizations (show icon, label, which icon). Fewer variants, more properties - avoid combinatorial explosion (split above ~30 combinations) [8][9][7].
- Property order: Type/Variant, State, then Size last [9].
- Icons: one component per icon, chosen through an INSTANCE_SWAP property - never a variant per icon [7][8].
- **Slots** (open beta spring 2026 for Full seats, GA with Plugin API support in the 2026-06-10 update): a slot is a frame inside a component with free content editing, so instances stay linked instead of being detached. Use slot properties for content areas of cards, dialogs, list items, page templates; set `minChildren/maxChildren` where the code has limits [10][11].
- Keep the same layer names and structure across variants so overrides survive variant switches [8].
- Never detach an instance to customize it; swap, set a property, fill a slot, or propose a new variant.

## 4. Naming and layer hierarchy [12][13][7]

- Components and styles use slash paths that build folders in the assets panel: `Button`, `Form/Input`, `Heading/H1`, `color/bg/default` [12][7].
- Layers in designs are named by meaning (`Filters`, `Order card`, `Empty state`), not `Frame 427`; this is also what Dev Mode and code generation see [13].
- Variant names `Property=Value, Property=Value`; no spaces/case drift between variants [7].
- Draft frames: `[draft] <Flow> / <Screen> / <State> / <width>`; proposals: `[proposal] <Name>`.

## 5. Frames per breakpoint [14][15]

| Target | Frames | Notes |
|---|---|---|
| Web desktop | 1440 (or 1280) | content max 1200-1280 centered; 12 columns |
| Web tablet | 768 | 8 columns; only if the layout changes |
| Web mobile | 375 | 4 columns, 16-20 side padding; also check 360 for Android browsers when tables/cards are tight |
| iOS | 390 / 393 | safe areas: status bar ~54-59 on Dynamic Island devices, home indicator 34 |
| Android | 360 / 412 | status bar ~24-32, gesture/navigation bar ~24-48 |

Each breakpoint is its own frame with the breakpoint variable mode set; mobile is redesigned (cards instead of tables, actions in a menu, bottom bar) not shrunk.

## 6. Grids and spacing [1][2][14]

- One spacing scale (4/8 base) from variables; section rhythm uses one or two values per page.
- Layout grids (columns + gutters + margins) on the wrapper frames match the code container; Grid auto layout for card/bento sections.
- Align text baselines and edges to the column grid; avoid one-off offsets.

## 7. Text styles [7][16]

- All text uses library text styles; a size/weight not in the library is a gap, not an inline value.
- Product font from the library body style; never default to Inter [3][16].
- One H1 per screen; 2-3 heading levels per page; body 14-16 on product UI, 16-18 on marketing pages; line length 45-80 characters.

## 8. Accessibility [17][18][19][20]

- Contrast: 4.5:1 for normal text, 3:1 for large text (>= 24px regular / 18.66px bold) and for UI component boundaries and focus indicators (WCAG 2.2 SC 1.4.3, 1.4.11) [17].
- Target size: at least 24x24 CSS px on web (WCAG 2.2 SC 2.5.8, AA), 44x44 pt on iOS (Apple HIG), 48x48 dp on Android (Material) [17][18][19].
- Visible focus state on interactive components; error states not by color alone (icon + text).
- Annotate accessibility details (labels for icon-only buttons, reading order, landmarks) with the Accessibility annotation category [20].

## 9. Handoff and Dev Mode [20][21]

- Group each screen's frames in a Section; the designer marks the Section **Ready for dev** after approval; developers see changes since that status [21].
- Annotations (categories Development, Interaction, Accessibility, Content) carry behavior that the picture cannot: what happens on click, validation rules, loading duration, empty-state logic. Adding them needs a Full seat with edit access; Dev seats can view [20].
- Measurements only where spacing is non-obvious; variables already document values.

## 10. Avoiding the generic "AI look" [22][23][24]

AI output drifts to the statistical average: Inter, purple-indigo gradients, a centered hero with three rounded cards, same large radius on everything, glowing blobs, wide letter spacing, fake "Live/New" badges, stock-like illustrations [22][23][24]. Our counter-rules:

- The catalog is the style: its font, palette, radius per role and shadows. Nothing outside it unless the brief asks.
- Layout follows the brief's hierarchy (what the user needs first), not a landing-page template. Product screens are dense and task-first.
- Gradients, glows, glass and illustrations only if the library has them, and at most one focal accent per screen.
- Radius by role from variables (inputs and buttons small, cards medium, pills full) - never one big radius everywhere [23].
- Real copy from the brief in the product language; realistic data (names, amounts, dates) and real edge cases (long names, zero values).
- Badges and labels only when they carry information.
- Final check: if someone would say "an AI made this" at a glance, revisit hierarchy, density and accents before reporting.

## 11. File and page organisation [12][13][25]

- Project design file pages: `Cover`, `<Flow>` pages (one per flow), `Proposals`, `Archive`. The library file keeps `Foundations`, `Components`, `Blocks`, `Icons`.
- Inside a flow page: one Section per screen; frames left to right by breakpoint, states top to bottom; flow arrows or numbering only if the brief has a multi-step flow.
- Drafts never land on approved pages or in the library; move to Archive instead of deleting someone else's work.
