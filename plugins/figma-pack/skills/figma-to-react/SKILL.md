---
name: figma-to-react
description: Turns a Figma design into React web code for Mdigital projects (React 19 + TS, Vite/TanStack Router or Next.js, shadcn/ui + Tailwind v4) - reads the design-system catalog, gets a neutral spec from figma-reader, writes the react-page-ux brief, plans with frontend-architect, builds one responsive implementation (desktop, tablet, mobile web) with frontend-pack skills, verifies visually against Figma at 1280 and 375, then runs frontend-reviewer. Use when the target is a web app and the request contains a figma.com link or says "сверстай по макету", "сделай по фигме", "по макету на React", "перенеси макет в код", "implement this Figma design", "build this screen from Figma", "Figma to React". Usually entered through figma-core.
---

# Figma -> React web (Mdigital)

Figma says what the screen looks like. `frontend-pack` says how the code is written. The goal is **token-perfect, structure-correct and responsive**, not a pixel copy of one frame.

> Precedence: `frontend-pack` skills and `rules/libraries.json` win over Figma output (generated code, layer structure, kit components, Figma's own `figma-*` skills, `frontend-design`, shadcn defaults). Figma skills are binding on *how to call Figma tools*; they never change our libraries, folder layout, tokens, file limits or data layer.

## 0. Preconditions

1. **frontend-pack installed.** The skills `frontend-pack:react-page-ux`, `react-ui`, `react-architecture` and the agents `frontend-architect`, `frontend-reviewer` must be available. If not, tell the user: "frontend-pack не установлен: `claude plugin install frontend-pack@mdigital`, затем перезапустить Claude Code". Until then follow its rules from the repository README (`https://gitlab.mdigital.kg/front-end-deport/ai-tools`, `plugins/frontend-pack`) and say in the final report that the pack was not loaded.
2. **Seat check.** `whoami` (free). View/Collab seat = 6 reads per month (20 on Starter); a screen needs 4-10. Tell the user the estimate and ask for a Dev/Full seat before spending calls. Details: `../figma-core/references/figma-tools.md`.
3. **Node link.** `figma.com/design/<fileKey>/...?node-id=1-2` -> `1:2`. No `node-id` -> ask for a frame link. Never guess IDs.

## 1. Flow

1. **Catalog.** Read `<project>/.figma/design-system.md` (and `.json`). It maps Figma variables to our tokens and Figma components to `src/shared/ui` / `src/shared/components`. Missing -> run `figma-design-system` first (it costs calls: say so). Stale (`updated` > 30 days or another library `fileKey`) -> offer a re-run, else continue. If the user declines, continue and mark the spec `Catalog: missing`.
2. **Spec.** Spawn `figma-reader` with the link, project root, target feature/route and `Target platforms: web`. It returns the neutral spec (`../figma-core/references/spec-template.md`) and saves reference screenshots in `.figma/<fileKey>/`.
3. **Token decisions.** Resolve every row of spec section 9 with the mismatch policy (section 3) before code.
4. **Brief.** Run `frontend-pack:react-page-ux`. Hierarchy, copy and layout come from the spec; every row of spec section 8 "Missing in design" becomes a line in the brief's states/adaptive parts with an explicit assumption, or a question to the designer. Section 11 questions go into "Допущения". Post the brief.
5. **Gaps (optional).** Visual gaps (no mobile frame, no empty/error states) and the user wants them drawn first -> offer `figma-designer` drafts. Never block code on it unless the user says so.
6. **Plan.** Give `frontend-architect` the spec + brief; it returns the file plan (route file thin, page in `pages/<route>/`, sections as feature components, <= 150 lines per file). Small single components can skip this.
7. **Build** with `react-architecture`, `react-ui`, `react-ux`, `react-data-fetching`, `react-error-handling`, `react-dry`, applying section 2. One responsive implementation covers desktop, tablet and mobile web (section 4).
8. **Visual check** at 1280 and 375 against the Figma screenshots (section 5).
9. **Review.** `frontend-reviewer` on the changed files. Report the checklist.

## 2. Translation rules

Full rules with examples: `references/translation-rules.md`.

- **Generated code is reference only.** `get_design_context` returns React + Tailwind as a "non-interactive prototype": read it for structure, values and asset URLs; never paste it. Rewrite in our stack.
- **Components first.** A Code Connect mapping is authoritative: use the mapped component at that node. Otherwise map by role via the catalog to `src/shared/ui` (shadcn) or `src/shared/components`. Missing primitive -> `npx shadcn@latest add <name>`; custom only if shadcn has none (`react-ui` section 1). A detached instance that looks like a Button is a `Button`.
- **Variants.** Figma variant properties -> existing `cva` variants. A new visual variant goes into the `shared/ui` file as a variant, never a local restyle.
- **Tokens.** Every value goes Figma -> catalog token -> class (`../figma-core/references/token-mapping.md`, web section). No hex/rgb, no `text-[15px]`, `p-[13px]`, `w-[1280px]`, no `style={{}}` for static values.
- **Layout.** Auto layout -> flex/grid + `gap-*`: direction -> `flex-row`/`flex-col`; spacing -> `gap-*` (never margins between siblings); padding -> `p-*`; fill -> `flex-1`/`w-full`/`min-w-0`; hug -> no width; wrap -> `flex-wrap`; Figma grid -> `grid grid-cols-*`. Constraints left/right -> full width with padding; center -> `mx-auto`.
- **No absolute positioning** except true overlays: badges on avatars, floating action buttons, sticky/fixed headers, dropdowns, toasts (and those use our primitives). Figma x/y coordinates never become `top-[..] left-[..]`.
- **Structure.** One component per file, <= 150 lines, sections named after what they show (`OrderSummary`, not `Frame 427`). Semantic HTML: headings `h1`-`h3`, clickable = `button`/`Link`, rows of data = `table` or list, forms = `form` + `Field`.
- **Copy.** Every visible string -> i18n key `<feature>.<section>.<item>` (react-i18next); reuse existing keys. Figma sample data (names, sums, avatars) -> MSW fixtures, not keys or constants.
- **Icons and assets.** Icon -> `lucide-react` by visual match first (catalog has the mapping). Brand icons / illustrations not in lucide -> SVG component in `src/shared/ui/icons/` with `currentColor`, downloaded from the URLs `get_design_context` returns. Photos from data stay dynamic. No temporary Figma URLs in code; do not redraw or "simplify" exported SVGs.
- **Interactivity.** Figma is static: hover/focus/disabled/pressed come from primitives; loading/empty/error/validation from `react-ux` and the brief, not from the picture.

## 3. Token mismatch policy

A Figma value without a catalog token is never hard-coded silently. Spec section 9 gives value, place, nearest token and delta. For each row:

1. **Snap** when the delta is below perception and the role matches (15 vs 14px text, 18 vs 16px gap, radius 12 vs 14). State it in the plan; no question for spacing/size. Colors always get one confirmation line.
2. **Ask** when the value carries meaning (status color, brand accent, unusual radius): "Figma `#F59E0B` на бейдже pending -> токена `warning` нет. Варианты: a) добавить `--warning`/`--warning-foreground` (light + dark), b) взять `secondary`".
3. **Propose a token** in `react-ui` style (`react-ui/references/tokens-and-theming.md`): semantic name, `-foreground` pair, `oklch`, `:root` + `.dark`, mapped in `@theme inline`, contrast 4.5:1. Only after the user agrees and only for a meaning that repeats. Then update the catalog (`figma-design-system`) so the next spec matches.
4. **Never**: raw hex in `.tsx`, arbitrary `[..]` values, a parallel set named after Figma (`--figma-blue-500`), per-screen tokens.

## 4. Desktop vs mobile web

One codebase, one component tree, mobile-first classes. Details and patterns: `references/responsive.md`.

- Breakpoints are Tailwind's: unprefixed = phone (360-430 frames), `md:` 768 (tablet frames), `lg:` 1024, `xl:` 1280 (1280-1440 frames). Write the phone layout first, add prefixes upward.
- A 1440 frame is "desktop with content width X", not a 1440px page: `max-w-*` container + `mx-auto` + responsive padding.
- **Both frames exist** -> the phone frame defines base classes, the desktop frame the `lg:`/`xl:` overrides. Differences in structure (table -> cards, sidebar -> `Sheet`, tabs -> select) are separate components switched by layout, not two pages.
- **Only desktop exists** -> derive phone from `react-page-ux` rules ("mobile is not a shrunk desktop"): one column, tables become cards or scroll with sticky first column, secondary actions into a menu, filters into a `Sheet`, tap targets >= 44px preferred. The derivation is listed in the brief as assumptions.
- **Only phone exists** -> desktop = same order, constrained width (`max-w-2xl`/`max-w-4xl`), multi-column only where the content is a grid.
- **Tablet missing** (common) -> decide per section: phone layout up to `lg`, or the desktop layout from `md`. State it in the brief.
- Use container queries (`@container`, `@md:`) for cards and widgets that live in slots of different widths.
- No horizontal page scroll at 375 (or 360 when the brief explicitly targets Android). Text that is one line in Figma can wrap: `min-w-0`, `truncate`, `line-clamp-*`.

## 5. Visual verification

Token-perfect, not pixel-perfect. Procedure: `references/visual-verification.md`.

1. Dev server running; open the page with the session browser tool (Playwright MCP, Claude in Chrome or Chrome DevTools MCP) or `npx playwright screenshot` (no new dependency) at **1280x800 full page** and **375x812 full page**, same data as the Figma frame (MSW fixtures).
2. Read both screenshots next to the Figma ones from `.figma/<fileKey>/`. Compare in this order: section order and hierarchy -> layout (columns, alignment, spacing rhythm) -> component choice and variants -> typography scale -> colors -> icons/assets -> copy.
3. Report a table: `element | Figma | ours | fix / intentional (token, standard, responsive)`. Fix unintentional ones. A deviation caused by our tokens, primitives or accessibility rules is correct and is reported, not "fixed" back to Figma values.
4. Also check 768 (recommended), and every asset visible with correct proportions (Figma's rule: a missing or substituted asset is a fail).
5. No browser tool available -> say so and list the checks not done.

## 6. Failure modes to catch

| Smell in our diff | Cause | Fix |
|---|---|---|
| `absolute top-[..] left-[..]` | copied coordinates | flex/grid + gap |
| `w-[1440px]`, `h-[812px]` | frame size copied | container `max-w-*`, content height |
| `text-[15px]`, `#71717A`, `p-[13px]` | magic numbers | catalog token or mismatch policy |
| nested `div`s named after layers, no headings | div soup | semantic elements, named sections |
| hand-built button/input/card | ignored component reuse | `shared/ui` primitive / Code Connect |
| strings in JSX | copy from Figma | i18n keys |
| one 300-line page file | generated code pasted | `frontend-architect` plan, <= 150 lines |
| desktop-only classes, `sm:` meaning "mobile" | built from desktop frame | mobile-first rewrite |

## Checklist

- [ ] frontend-pack loaded (or its absence reported); `whoami` checked, budget told before spending calls
- [ ] Catalog read (or `figma-design-system` run / declined and marked)
- [ ] Spec from `figma-reader`; section 8 merged into the `react-page-ux` brief; brief posted before code
- [ ] Every section 9 mismatch resolved (snapped, asked, or token agreed); no hex or arbitrary values
- [ ] Figma components mapped to `shared/ui` / `shared/components` (Code Connect respected); nothing pasted from generated code
- [ ] Layout flex/grid + gap, mobile-first, no absolute positioning except overlays; files <= 150 lines
- [ ] Copy as i18n keys; sample data in MSW fixtures; icons from lucide or `shared/ui/icons`; no Figma URLs in code
- [ ] Visual check at 1280 and 375 (plus 768 once) against Figma; difference table reported
- [ ] `frontend-reviewer` run on changed files

## References

- `references/translation-rules.md` - Figma -> React rules with BAD/GOOD examples
- `references/responsive.md` - frame sets -> one responsive implementation
- `references/visual-verification.md` - screenshot capture and comparison procedure
- `references/sources.md` - research sources
- `../figma-core/references/spec-template.md`, `token-mapping.md`, `figma-tools.md`
