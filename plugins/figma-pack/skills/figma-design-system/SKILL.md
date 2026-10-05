---
name: figma-design-system
description: Connects a project to the team's Figma design system from ONE link (the library file, or any file that uses the library) and writes the project catalog `.figma/design-system.md` + `.figma/design-system.json` - libraries and keys, components with variants and properties, blocks/sections (header, hero, pricing, table toolbar, form layouts), variables by collection and mode, text and effect styles, icons, Code Connect status and a gap report. Also updates a stale catalog and starts the code<->Figma token sync. Use before any Figma design or design-to-code work in a project without a fresh catalog. Triggers - "подключи дизайн-систему", "вот ссылка на дизайн-систему", "вот наша библиотека в фигме", "что есть в дизайн-системе", "какие компоненты есть в фигме", "обнови каталог", "чего не хватает в дизайн-системе", "connect our design system", "here is our Figma library", "inventory the design system", "update the catalog", "design system gaps".
---

# Figma design system -> project catalog (Mdigital)

Goal: one link in, one catalog out. After this skill, every other Figma task knows which components, blocks, variables and styles exist (with keys) without spending calls on discovery.

Preconditions from `figma-core` section 2 apply (seat check, budget, Figma skills). This skill only reads Figma; it writes local files.

## 1. Inputs

- One Figma link. Best: the library file itself (`figma.com/design/<libraryFileKey>/...`). Also fine: any product file that uses the library - then the library file is located from it.
- The project root (where `.figma/` goes). No project -> current working directory.
- Existing catalog: if `.figma/design-system.json` exists and is fresh (`figma-core` section 3), show its summary and ask "обновить или использовать как есть?" before any call.

## 2. Plan the calls (state the estimate first)

Pick the path by link type and seat; full scripts and call order in `references/inventory.md`.

| Path | When | Calls |
|---|---|---|
| A. Library file, Full seat | link is the library file and `use_figma` is allowed | `get_metadata` (pages) -> `get_libraries` -> 1 read-only `use_figma` full inventory -> `get_code_connect_map` or `list_file_components_for_code_connect` -> optional `get_screenshot` of the Blocks page. **4-5** |
| B. Product file | link is a file that uses the library | `get_libraries` -> one batched `search_design_system` (scoped `includeLibraryKeys`) -> 1 read-only `use_figma` inventory of instances on the linked page -> `get_variable_defs` on one representative frame. **4**, catalog marked "partial"; ask for the library link to complete |
| C. Dev seat / `use_figma` refused | no write access | `get_metadata` -> `get_libraries` -> one batched `search_design_system` -> `get_variable_defs` on a token specimen frame -> `list_file_components_for_code_connect`. **5**, keys for variables/styles may be missing |

Rules: batch all `search_design_system` queries into one call, one intent per query, never retry synonyms after an empty result; switch pages at most once per `use_figma` call (or `figma.loadAllPagesAsync()` once); never conclude "no variables" from local variables alone (library variables are remote). Stop and report on any rate-limit or access error.

## 3. Inventory: what to capture

For each item record name, key, node ID and page; the catalog format is fixed in `references/catalog-format.md`.

1. **Libraries**: name, `libraryKey`, library `fileKey` if known, role (`primary`, `icons`, `kit`). Mark libraries "available but not added" separately.
2. **Components**: every published component set and standalone component (skip names starting with `.` or `_` - private). Per item: set key, variant properties with their options, boolean/text/instance-swap/slot properties, default variant, description, page, Code Connect mapping.
3. **Blocks (sections)**: components or sets on pages named like "Blocks", "Sections", "Patterns", "Templates", "Блоки", or named `Block/...`, `Section/...`. Classify by `category`: `header`, `footer`, `nav`, `hero`, `features`, `pricing`, `testimonials`, `faq`, `cta`, `table-toolbar`, `table`, `form-layout`, `filters`, `empty-state`, `dialog`, `card-grid`, `sidebar`, `page-template`, `other`. Record breakpoints available (from variants `Breakpoint=Desktop/Tablet/Mobile` or names) and which components each contains. Frames that look like blocks but are not components -> listed as "frame only, copy not instance" and a gap.
4. **Variables**: per collection - name, key, modes; per variable - name, key, type, scopes, code syntax (WEB/ANDROID/iOS), value per mode (aliases resolved to the target name). Identify the roles: color (semantic vs primitive), spacing, radius, size, typography, breakpoint/layout.
5. **Styles**: text styles (family, weight, size, line height, letter spacing), effect styles (shadows, blurs), legacy paint styles. The product font = the family of the body text style.
6. **Icons**: strategy (one component per icon + INSTANCE_SWAP, or a variant set), library, count, sizes, names list (or a pointer to the JSON list if > 60).
7. **Code Connect**: per component - mapped or not, `source`, `label`.

## 4. Gap analysis

Check and list every gap with severity (`blocker` stops screen work, `major` forces ad-hoc work, `minor` is hygiene) and a concrete proposal:

- **Modes**: no Dark mode in the color collection; no breakpoint modes (spacing/typography per Desktop/Tablet/Mobile).
- **Responsive**: blocks without a Mobile (375/390) variant; no tablet (768) layout.
- **States**: components missing `Hover`, `Focus`, `Disabled`, `Error`, `Loading` where the role needs them (Button, Input, Select, Checkbox, Tabs, Table row); no Skeleton, EmptyState, ErrorState, Toast/Alert components.
- **Tokens hygiene**: variables with `ALL_SCOPES`; no WEB code syntax; semantic colors bound straight to raw values instead of primitives; components with unbound fills/padding/radius (count from the inventory).
- **Structure**: blocks that are frames, not components; icons as a variant per icon; variant matrices > 30 combinations; unnamed layers (`Frame 123`) in components.
- **Accessibility**: text/background semantic pairs below 4.5:1 (3:1 for large text and UI parts) in any mode; controls smaller than 24x24 (44pt/48dp on mobile).
- **Handoff**: components without description; no Code Connect for components that exist in code.

## 5. Write the catalog

1. `mkdir -p .figma` and write `.figma/design-system.md` and `.figma/design-system.json` exactly in the format of `references/catalog-format.md`. Values not read from Figma are marked `(assumption)`; path B/C catalogs carry `"completeness": "partial"`.
2. If `.gitignore` lacks the `.figma` lines from `figma-core` section 3, show them; edit `.gitignore` only if the user agrees.
3. Report to the user in this shape:

```
Каталог дизайн-системы: .figma/design-system.md (+ .json)
Библиотека: <name> (<libraryKey>), файл <url>
Компоненты: <n> (наборов вариантов <n>), блоки: <n> по категориям <...>
Переменные: <n> в <n> коллекциях, режимы: <Light/Dark, Desktop/Mobile>
Стили текста: <n>, шрифт: <family>; иконки: <n> (<strategy>)
Code Connect: <n>/<n> компонентов связаны с кодом
Пробелы: blocker <n>, major <n>, minor <n> - топ-5 ниже
Вызовов Figma потрачено: <n> (<list>)
```

4. Gap report for the team lead / designers: the table from `references/catalog-format.md` section "Gaps", sorted by severity, each row with an owner suggestion (designer, frontend, both) and the proposal. Offer `figma-design` "Proposals" drafts for blocker/major component gaps (only with a Full seat and confirmation).

## 6. Update the catalog ("обнови каталог")

Run when the library publishes changes, when `updated` is older than 30 days, or when a `use_figma` import by key fails.

1. Read the current JSON; keep it as the baseline.
2. Re-run only the inventory call of the original path (path A: 1 `use_figma` + 1 Code Connect call).
3. Diff by key: added, removed (key gone), renamed (same key, new name), changed (variant options, property names, variable values per mode, new modes).
4. Rewrite both files; append a dated entry to the "Changelog" section of the `.md` with the diff; bump `updated`.
5. Removed or renamed components used by existing `[draft]` frames or by code (Code Connect sources) -> list them as follow-ups.

## 7. Sync with code (optional, web projects first)

When the project has code tokens (`globals.css`, `index.css`, `theme.ts`, `ThemeData`), diff the catalog against them with `references/design-system-sync.md` (from `figma-core`). Fill each variable's `token` field with the agreed code token. The write-back (code syntax on variables, Code Connect mappings) is done by the `figma-designer` agent after explicit confirmation.

## Checklist

- [ ] `whoami` checked; call estimate stated; budget respected (<= 5 calls for path A)
- [ ] Every component, block, variable and style has a key in the JSON
- [ ] Blocks categorized; breakpoints per block recorded
- [ ] Modes listed per collection; product font identified
- [ ] Gaps with severity, owner and proposal; Code Connect table filled
- [ ] Both catalog files written; user got the summary and the calls spent

## References

- `references/inventory.md` - call order per path, read-only inventory scripts, search query sets
- `references/catalog-format.md` - exact `.md` and `.json` formats, gap and Code Connect tables
- `../figma-core/references/design-system-sync.md` - token and component sync with code
- `../figma-design/references/sources.md` - sources for the rules above
