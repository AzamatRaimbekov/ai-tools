---
name: figma-design
description: Rules and procedure for designing new screens, sites, product flows and missing states in Figma ONLY from the team's design system catalog (.figma/design-system.json) - page brief first, a frame plan covering every state and breakpoint, then building with auto layout, library component and block instances, bound variables and text styles, verified by screenshots, all as "[draft]" frames until the designer approves. Missing pieces become proposals on a "Proposals" page, never ad-hoc shapes. Executed by the figma-designer agent. Triggers - "нарисуй в фигме", "создай макет", "сделай макет страницы", "собери сайт в фигме", "нарисуй экран", "дорисуй состояния", "сделай мобильную версию в фигме", "лендинг в фигме", "design a page in Figma", "create a mockup", "build the site in Figma", "draw the missing states", "mobile version in Figma".
---

# Designing in Figma from our design system (Mdigital)

The output is an editable Figma design that a developer can build 1:1 with our components and tokens. Every layer comes from the catalog or is a named auto-layout container around catalog pieces.

Preconditions from `figma-core` section 2: **Full seat** on the target file's plan (writes), Figma skills `figma-use` + `figma-generate-design` loaded before the first `use_figma`, user confirmation before any write. The writing itself is done by the agent `figma-designer`; this skill is its rulebook.

## 1. Inputs (ask only for what is missing)

1. **Catalog**: `<project>/.figma/design-system.json` fresh (`figma-core` section 3). Missing or stale -> run `figma-design-system` first.
2. **Target file**: link to the project's design file (never the library file). None -> propose `create_new_file` with a `planKey` from `whoami` and a name `<Project> - Design`; ask first.
3. **What to design**: a page, a site (several pages), a product flow, or missing states / mobile versions of existing frames.
4. **Platform**: web, iOS, Android, or both mobile - decides breakpoints and conventions.

## 2. Brief first (posted to the user before any plan)

- **Web**: the UX brief format of `frontend-pack`'s `react-page-ux` section 1 (goal, primary action, hierarchy, data, states, adaptive 375/768/1440 frames, accessibility, copy, assumptions). Load it with the Skill tool (`frontend-pack:react-page-ux`).
- **Mobile**: the mobile brief in `references/briefs.md` (safe areas, top bar, bottom navigation, 44pt/48dp targets, keyboard, pull-to-refresh, platform patterns).
- **Site / several pages**: a site map (pages, their goal, shared header/footer blocks) then one short brief per page, from `references/briefs.md`.

Copy is real text in the product language (Russian by default) from the brief; no lorem ipsum, no "Title"/"Button" placeholders.

## 3. Frame plan

Turn the brief into a list of frames before touching Figma:

- **Pages**: one Figma page per flow (`Orders`, `Checkout`, `Landing`); drafts never go on the library's or the designer's approved pages. Proposals go on page `Proposals`.
- **Screens x states**: every async region gets `Default`, `Loading`, `Empty`, `Error`; plus `No access` for protected pages, `Validation` for forms, `Empty (no results)` for filtered lists, `Success` where the flow ends. Missing-state-only requests skip `Default`.
- **Breakpoints**: web - Desktop 1440 (with a content max-width inside), Tablet 768 when the brief says the layout changes, Mobile 375. iOS - 390 (393 for current Pro). Android - 360 (412 for large). Use the exact width of the catalog's block variants when they exist.
- **Name**: `[draft] <Flow> / <Screen> / <State> / <width>`, e.g. `[draft] Orders / List / Empty / 375`.
- **Mapping**: for every section of every frame, name the catalog block or component (with key) that builds it. A section with no catalog match is listed as a gap -> proposal (section 6).

The frame plan is part of the `figma-designer` draw plan; nothing is drawn until the user confirms it.

## 4. Build rules

Follow `figma-generate-design` steps 3-5 for the mechanics; these rules decide the content. Detail and rationale: `references/figma-best-practices.md`; scripts: `references/build-recipes.md`.

1. **Compose from blocks, then components.** Use a catalog block for a whole section when one exists (header, hero, pricing, table toolbar, form layout, footer); otherwise compose the section from catalog components. Never rebuild what a block or component already is. Never detach an instance; text goes through component properties (`setProperties`), alternative content through instance-swap or slot properties.
2. **Auto layout everywhere.** Each frame is a vertical auto-layout wrapper; every section and group is an auto-layout frame. Children use Fill for stretch, Hug for content-sized, Fixed only for real constraints (sidebar 280, icon 24, avatar 40) with min/max widths for readable content (text columns max ~720). Wrap for chip/tag rows. Absolute position only for overlays: badges on avatars, floating action buttons, close icons, sticky elements' shadows.
3. **Variables, never raw values.** Fills, strokes, padding, gap, radius and sizes are bound to catalog variables (`setBoundVariable`, `setBoundVariableForPaint`); typography uses catalog text styles; shadows use effect styles. A raw hex/px is allowed only when no variable exists, and each one is listed in the report.
4. **Modes, not copies.** Dark theme and breakpoint values come from variable modes set on the frame (`setExplicitVariableModeForCollection`), not from duplicated, recolored layers. Show a dark frame only when the brief asks for it or the catalog has a Dark mode to verify.
5. **Spacing and grid.** Spacing only from the catalog scale (usually 4/8-based). Desktop: 12-column content area (max 1200-1280, side margins from the Layout variables), Tablet 8 columns, Mobile 4 columns with 16-20 side padding. Section rhythm is consistent (one section gap value per page).
6. **Hierarchy and copy.** One primary action per screen (primary variant once); heading levels from text styles (one H1); buttons are verbs; errors say what to do.
7. **Accessibility.** Text contrast >= 4.5:1 (3:1 large text and UI parts) in every mode shown; targets >= 24x24 on web, 44x44 pt iOS, 48x48 dp Android; focus state shown on at least one control per form frame; icons that act alone have a label in an annotation.
8. **Naming and structure.** Layers named by what they are (`Order card`, `Filters`, `Empty state`), never `Frame 427`; no hidden junk layers; frames for one screen grouped in a Section named after the screen, placed left to right Desktop -> Tablet -> Mobile, states top to bottom.
9. **Font.** Use the catalog font; never default to Inter. Verify the family after building (`figma-generate-design` step 5).
10. **No generic AI look.** No purple/indigo gradients, glow blobs, glassmorphism, emoji icons or same-radius-everything unless the catalog defines them; no centered-hero-plus-three-cards layout by reflex; real content density for product UI. Checklist in `references/figma-best-practices.md` section 10.
11. **Images.** Content images become placeholder frames bound to a muted surface variable, named `Image: <what>`; never generate images without asking (it spends Figma AI credits).

## 5. Write and verify (agent `figma-designer`)

1. Load `figma-use` and `figma-generate-design` (and `figma-generate-library` only for proposals that are new components); pass `skillNames: "resource:figma-use,resource:figma-generate-design"` on every `use_figma` call.
2. `use_figma` calls are **strictly sequential**; each returns created node IDs. One call per screen (all its sections) when safe to retry; split only at page switches or after a failure. Obey `safeToRetryWithoutCanvasRead`.
3. Import by key from the JSON (`importComponentSetByKeyAsync`, `importComponentByKeyAsync`, `importVariableByKeyAsync`, `importStyleByKeyAsync`). An import that fails -> the catalog is stale: stop that screen, report, suggest "обнови каталог".
4. After each screen: one `get_screenshot` of its Section (or `node.screenshot()` inside the script). Check clipped text, overlaps, leftover placeholder text, wrong variants, wrong font, raw values. At most one targeted fix and one re-screenshot per screen.
5. Before reporting: a read-only audit in the last call - instance count, bound-variable count, nodes with unbound fills/padding (should be 0 or listed), text nodes without a text style.

## 6. When the design system lacks something

- Never draw an ad-hoc look-alike inside a draft. Put a clearly marked placeholder (`Missing: <component>` instance-sized auto-layout frame, dashed stroke bound to the border variable) in the draft.
- On page `Proposals`, draft the missing component or block from catalog primitives and variables, named `[proposal] <Name>`, with a description: why it is needed, where used, variants and states it needs, code counterpart if any. Build it as a local component only if the confirmed plan says so (`figma-generate-library` rules).
- Add the gap to the report; the designer decides whether it goes into the library. Publishing to the library is never done by the agent.

## 7. Report

```
Макет в Figma: <file name>
Страница <Flow>: <link>
  - [draft] Orders / List / Default / 1440 - https://www.figma.com/design/<fileKey>/?node-id=<id-with-dash>
  - ...
Из каталога: блоков <n>, компонентов <n> (<n> экземпляров), переменных привязано <n>, стилей текста <n>
Сырые значения: <list or "нет">
Пробелы -> Proposals: <list with links or "нет">
Допущения: <...>
Вызовов: записи <n>, чтения <n>
Дальше: дизайнер проверяет черновики; утверждённые - снимает префикс [draft], отмечает Ready for dev.
```

Approval belongs to the human designer: they rename approved frames (drop `[draft]`), mark the Section "Ready for dev", and only then the frames become input for `figma-to-react` / `figma-to-react-native` / `figma-to-flutter`.

## Checklist

- [ ] Catalog fresh; Full seat; target file is not the library
- [ ] Brief posted; frame plan lists every screen x state x breakpoint with catalog mapping
- [ ] User confirmed the draw plan before the first write
- [ ] Only catalog blocks/components/variables/styles; raw values listed; no detached instances
- [ ] Auto layout everywhere; absolute only for overlays; layers named
- [ ] Contrast and target sizes pass; product font verified
- [ ] Screenshot checked per screen; links reported; gaps on "Proposals"

## References

- `references/figma-best-practices.md` - researched Figma practices behind the rules (auto layout, variables and modes, components and slots, naming, breakpoints, grids, type, accessibility, handoff, file organisation, anti-AI-look)
- `references/build-recipes.md` - `use_figma` snippets for catalog imports, modes, bindings, sections, proposals, annotations, audit
- `references/briefs.md` - mobile brief, site map and per-page brief formats
- `references/sources.md` - sources (2025-2026)
