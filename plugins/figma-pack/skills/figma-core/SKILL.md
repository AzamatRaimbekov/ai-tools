---
name: figma-core
description: Entry point and router for every Figma task at Mdigital - connecting a design system by one link, drawing layouts in Figma from our components, and turning a mockup into React, React Native or Flutter code. Holds the shared preconditions (seat check, call budget, mandatory Figma skills, catalog location, precedence). Use whenever the request mentions Figma or contains a figma.com link. Triggers - "фигма", "figma", "макет", "по макету", "по фигме", "дизайн", "нарисуй", "нарисуй в фигме", "создай макет", "сверстай по макету", "подключи дизайн-систему", "вот ссылка на фигму", "draw in Figma", "design a page in Figma", "implement this design", "connect our design system", "figma.com/design".
---

# Figma core (Mdigital)

Every Figma request starts here. Decide the route, check the preconditions once per session, then load the target skill.

## 1. Route the request

| Request | Route |
|---|---|
| Design-system link, "подключи дизайн-систему", "что есть в библиотеке", first Figma task in a project with no catalog | `figma-design-system` |
| "нарисуй / создай макет / страницу / сайт / экран в фигме", "дорисуй состояния", "мобильная версия в фигме" | `figma-design` + agent `figma-designer` |
| "сверстай по макету", "сделай код по фигме", "implement this design" | ask the platform if unclear, then `figma-to-react` (web), `figma-to-react-native`, or `figma-to-flutter` |
| "синхронизируй токены", tokens drift between code and Figma | `figma-design-system` section "Sync", then `references/design-system-sync.md` |

Platform is clear when the repo has `next.config.*`/`vite.config.*` + `react-dom` (web), `app.json`/`expo` or `react-native` in `package.json` (React Native), or `pubspec.yaml` (Flutter). Otherwise ask one question: "Под какую платформу: веб (React), React Native или Flutter?".

`figma-design` and the code routes both need the catalog. No `<project>/.figma/design-system.json` -> run `figma-design-system` first (it costs ~5 calls once and saves them on every later task).

## 2. Preconditions (once per session)

1. **Connection and seat.** Call `whoami` (free, never rate-limited). No answer -> ask the user to connect the Figma connector (`/mcp`) and stop. Read the seat on the plan that owns the file:

| Seat | Can do | Budget |
|---|---|---|
| View / Collab | read only | **6 calls per month** (Professional, Organization, Enterprise), 20 on Starter |
| Dev | read only (no canvas writes) | 200/day (Starter, Pro), 600/day (Org, Enterprise) |
| Full | read + write (`use_figma`, Code Connect) | same as Dev; writes are exempt from limits |

   - View/Collab: **stop and report** the seat, the 6-call monthly budget and the estimated calls of the task. Do not spend calls unless the user explicitly says to; ask for a Dev seat (read) or Full seat (write).
   - Dev: reading routes only. `figma-design` writes need a Full seat - say so before planning.
2. **Budget.** Estimate calls before starting and state them ("~6 read calls"). Rate-limited: every `get_*`, `search_design_system`, `get_libraries`, read-only `use_figma`, `download_assets`. Exempt: `whoami`, `create_new_file`, `add_code_connect_map`, canvas writes. On a rate-limit or access error: call `whoami`, report seat and limit, stop. Never retry in a loop.
3. **Link parsing.** `figma.com/design/<fileKey>/<name>?node-id=1-2` -> `fileKey`, `nodeId` `1:2`; branch URLs use `branchKey`. No `node-id` -> `get_metadata` without `nodeId` lists pages. Never guess IDs. Full table: `references/figma-tools.md`.
4. **Figma's own skills before their tools** (read with `get_figma_skill`, `skill://figma/<name>/SKILL.md`; if the Figma plugin is installed, its `/figma-*` skills are the same text):

| Before | Load |
|---|---|
| any `use_figma` | `figma-use` |
| drawing screens, states, pages | + `figma-generate-design` |
| creating variables, components, a library | + `figma-generate-library` |
| `create_new_file` | `figma-create-new-file` |
| `get_design_context` | `figma-design-to-code` |
| Code Connect | `figma-code-connect` |

   Pass `skillNames` with the `resource:` prefix on every `use_figma` call (`resource:figma-use,resource:figma-generate-design`).
5. **Writes need the user's explicit confirmation** of a written plan (agent `figma-designer` enforces it). No `create_new_file`, library edit, or Code Connect write without it.

## 3. The design-system catalog

One catalog per project, committed with the code:

- `<project>/.figma/design-system.md` - human-readable: libraries, components with variants, blocks, variables by collection and mode, text styles, icons, gaps, Code Connect status.
- `<project>/.figma/design-system.json` - the same with keys (`libraryKey`, component/set keys, variable keys, style keys) for scripts.

Written only by `figma-design-system`; read by every other Figma skill and agent before any Figma call. Fresh = `updated` within 30 days and the same library `fileKey`; stale -> offer "обновить каталог" (update procedure in `figma-design-system`). Screenshots and other caches go under `.figma/<fileKey>/`; suggested `.gitignore`: `.figma/*`, `!.figma/design-system.md`, `!.figma/design-system.json`.

No project yet (pure design work) -> keep the catalog under the current working directory's `.figma/` and say where it is.

## 4. Precedence

1. **Platform code rules win over Figma output.** For React that is `frontend-pack` (`react-ui`, `react-ux`, `react-page-ux`, `rules/libraries.json`); for React Native / Flutter the rules named in their `figma-to-*` skills. Figma's generated code, layer names and kit components are input, never the implementation.
2. **Our design system wins over Figma's generic skills.** `figma-generate-design` and `figma-use` decide how to call the Plugin API; the catalog decides which components, variables and styles are used. When a Figma skill suggests `html_to_figma`, `generate_figma_design` captures, generated images or a new token set, ours forbid it for deliverables unless the user asks.
3. **The human designer owns the library.** Agents propose (`[draft]` frames, a "Proposals" page); they never edit published library components or variables without a confirmed plan naming them.

## 5. When Figma is unavailable

No MCP or no seat -> ask for exported PNGs per frame plus Dev Mode values, follow the same formats, mark the result "from screenshot, not verified". For drawing, offer the draw plan as text so the designer can build it by hand.

## References

- `references/figma-tools.md` - tool cheat sheet, parameters, seats and rate limits, budget habits
- `references/design-system-sync.md` - code tokens <-> Figma variables, Code Connect setup
- `references/spec-template.md` - implementation spec format (design-to-code routes)
- `references/token-mapping.md` - Figma value -> code token tables
