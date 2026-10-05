# Figma MCP tool cheat sheet

Tool names below are as exposed by the claude.ai Figma connector: `mcp__claude_ai_Figma__<tool>`. Other installs use another prefix for the same tools (`mcp__figma__<tool>` for `claude mcp add figma ...`, `mcp__plugin_<plugin>_figma__<tool>` for a plugin-bundled server). The agents' `tools:` lines already list all three variants (`mcp__claude_ai_Figma__`, `mcp__figma__`, `mcp__plugin_design_figma__`); names that do not exist in a session are ignored. If a teammate's Figma server uses yet another prefix (check `/mcp`), add it to both agents.

## URL -> parameters

| URL | fileKey | nodeId |
|---|---|---|
| `figma.com/design/<fileKey>/<name>?node-id=12-34` | `<fileKey>` | `12:34` |
| `figma.com/design/<fileKey>/branch/<branchKey>/<name>?node-id=..` | `<branchKey>` | from `node-id` |
| `figma.com/design/<fileKey>/<name>` (no node-id) | `<fileKey>` | none: call `get_metadata` without `nodeId` to list pages, then ask which frame |
| `figma.com/make/<key>/..` | `<key>` | `0:1`, `get_design_context` only |
| `figma.com/board/..` (FigJam) | not a UI mockup; read with `get_figjam` if needed |

Never pass an empty or guessed `nodeId`.

## Read tools (rate-limited)

| Tool | Required params | Use for | Notes |
|---|---|---|---|
| `get_design_context` | `fileKey`, `nodeId` | Main design-to-code read: reference code (React+Tailwind flavoured), screenshot, asset download URLs, Code Connect snippets | Load `skill://figma/figma-design-to-code/SKILL.md` first (via `get_figma_skill`); pass `clientFrameworks` / `clientLanguages` of the target (`react`+`typescript`, `react-native`+`typescript`, `flutter`+`dart`) and `skillNames: "resource:figma-design-to-code"`. Keep the screenshot (do not set `excludeScreenshot`). If the answer is "sparse"/metadata only, request child nodes separately. |
| `get_screenshot` | `fileKey`, `nodeId` | Visual target for the 1280/375 check | `maxDimension` default 1024, set 1280-2048 for full screens. Returns a short-lived URL + curl command; `enableBase64Response: true` only if you cannot fetch URLs. |
| `get_metadata` | `fileKey` (`nodeId` optional) | Tree overview: IDs, names, types, positions, sizes | Without `nodeId` lists pages. Cheap way to find frames per breakpoint and states. |
| `get_variable_defs` | `fileKey`, `nodeId` | Variables used under a node: `{'color/bg/primary': '#FFFFFF', ...}` | Main input for token mapping. |
| `search_design_system` | `fileKey`, `queries: [{entity, query}]` | Find library components / variables / styles | `entity` is exactly `component`, `variable` or `style`. One intent per query, batch in one call. `includeLibraryKeys` to scope. |
| `get_libraries` | `fileKey` | Libraries added to the file + available to add (`libraryKey`) | Call before `search_design_system`. Org libraries page by 20 (`offset` = `libraries_available_to_add_next_offset`); community kits only on page 1. |
| `get_code_connect_map` | `fileKey`, `nodeId` | `{nodeId: {codeConnectSrc, codeConnectName}}` | Authoritative Figma component -> our component mapping. |
| `get_code_connect_suggestions` | `fileKey`, `nodeId` | Unmapped published components in a selection | `excludeMappingPrompt: true` for a light list. |
| `get_context_for_code_connect` | `fileKey`, `nodeId` | Properties/variants of one component | For mapping props to our `cva` variants. |
| `list_file_components_for_code_connect` | `fileKey` | All published components of a library file + dependencies | Sync mode inventory. |
| `download_assets` | `fileKey`, `nodeId` | Export render, raw images, SVGs of a node | Only for assets `get_design_context` did not return. URLs are temporary. |
| `get_figma_skill` | `uri` (`skill://...`) | Read Figma's own skills | `skill://index.json` lists them. |
| `whoami` | - | User, plans (`key`), seats | Not rate-limited. Call first and on any access/limit error. |

Read-only `use_figma` scripts (inventories) also count as reads. Before any discovery call, read the project catalog `.figma/design-system.json` (`figma-core` section 3): a fresh catalog replaces `get_libraries` + `search_design_system`.

## Write tools (figma-designer only, after user confirmation)

| Tool | Required params | Before calling |
|---|---|---|
| `use_figma` | `fileKey`, `code`, `description`, `skillNames` | Load `skill://figma/figma-use/SKILL.md` and, for visible design changes, `skill://figma/figma-generate-design/SKILL.md`; for variables/components `skill://figma/figma-generate-library/SKILL.md`. Pass `skillNames` with the `resource:` prefix, e.g. `resource:figma-use,resource:figma-generate-design`. Mutating calls are strictly sequential, never parallel; every script returns created/mutated IDs. Recipes: `figma-design/references/build-recipes.md`. |
| `create_new_file` | `fileName`, `planKey`, `editorType` | Load `skill://figma/figma-create-new-file/SKILL.md`. `planKey` from `whoami` (`team::...` / `organization::...`); several plans -> ask the user which. Not rate-limited, but always ask before creating. |
| `send_code_connect_mappings` | `fileKey`, `nodeId`, `mappings[]` | Load `skill://figma/figma-code-connect/SKILL.md`. Each mapping: `nodeId`, `componentName`, `source`, `label: "React"`. |
| `add_code_connect_map` | `fileKey`, `nodeId`, `source`, `componentName`, `label` | Single mapping. Not rate-limited. |
| `upload_assets` | `fileKey`, `count` | Not used by our agents (needs raw byte POSTs); ask the designer to place images. |
| `generate_figma_design`, `html_to_figma`, `generate_image` | - | Not used for deliverables: they produce layers not linked to our library (or spend AI credits). Only on the user's explicit request, as a throwaway visual reference that is deleted afterwards. |

## Mandatory Figma skill loading

The server requires its skills before certain tools. Read them with `get_figma_skill`:

| Before | Read |
|---|---|
| `get_design_context` | `skill://figma/figma-design-to-code/SKILL.md` |
| any `use_figma` | `skill://figma/figma-use/SKILL.md` |
| drawing screens/states | + `skill://figma/figma-generate-design/SKILL.md` |
| creating variables/components/library | + `skill://figma/figma-generate-library/SKILL.md` |
| `create_new_file` | `skill://figma/figma-create-new-file/SKILL.md` |
| Code Connect | `skill://figma/figma-code-connect/SKILL.md` |

Their guidance on *how to call Figma* is binding. Their guidance on *what code to write* is overridden by the Mdigital skills, and their choice of components/tokens by our catalog (see `figma-core` section 4, precedence).

## Rate limits and seats (Figma docs, rate-limits-access page)

| Seat | Starter | Professional | Organization | Enterprise |
|---|---|---|---|---|
| View, Collab | 20 / month | 6 / month | 6 / month | 6 / month |
| Dev, Full | 200 / day, 10 / min | 200 / day, 15 / min | 600 / day, 20 / min | 600 / day, 20 / min |

- Limits apply to tools that read from Figma (including read-only `use_figma`). Exempt: `whoami`, `create_new_file`, `add_code_connect_map`, and tools that write to Figma files.
- A typical screen costs 4-10 calls (metadata, design context per frame, variables, screenshots, Code Connect); a catalog (`figma-design-system` path A) costs 4-5 once. With a View/Collab seat (6 per month on paid plans), stop, report and ask for a Dev/Full seat.
- Editing a design file (`use_figma`) requires edit permission on that file - a Full seat on paid plans. Dev seats are read-only for design files. Slots and annotations also need a Full seat.
- Code Connect requires an Organization or Enterprise plan and components **published** to a team library.
- You can only read files the user can open; "no access" means share the file with the account `whoami` shows.

## Budget habits

- Catalog first: `.figma/design-system.json` holds library, component, variable and style keys - no discovery calls when it is fresh.

- `get_metadata` once for the page, then `get_design_context` only on the frames you implement.
- Batch `search_design_system` queries in one call; do not retry with synonyms after an empty result.
- Save screenshots to `.figma/<fileKey>/<nodeId>.png` (gitignored) and reuse them for the visual check instead of re-requesting.
