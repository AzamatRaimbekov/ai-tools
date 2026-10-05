# ai-tools

Claude Code plugins of the Mdigital front-end department.

## Install

```bash
claude plugin marketplace add git@gitlab.mdigital.kg:front-end-deport/ai-tools.git
claude plugin install frontend-pack@mdigital
claude plugin install figma-pack@mdigital
```

Restart Claude Code after installing. Update later with `claude plugin marketplace update mdigital`.

## Plugins

### frontend-pack

React 19 + TypeScript standards (Vite + TanStack Router or Next.js, shadcn/ui, Tailwind v4, TanStack Query, React Hook Form + Zod).

| Skill | Covers |
|---|---|
| `react-new-project` | New project from official CLIs plus the team foundation |
| `react-page-ux` | UX brief before every page, browser verification after |
| `react-architecture` | Folder layout, 150-line limit, decomposition, state placement |
| `react-dry` | Removing duplication, and when not to abstract |
| `react-data-fetching` | TanStack Query, query keys, cache, invalidation |
| `react-ui` | shadcn, Tailwind tokens, variants, accessibility |
| `react-ux` | Loading/empty/error states, forms, feedback, URL state |
| `react-error-handling` | ApiError, error boundaries, reporting |

Agents: `frontend-architect` (plans a feature), `frontend-reviewer` (reviews code, read-only).

Library whitelist/blacklist: `plugins/frontend-pack/rules/libraries.json`.

Hooks:
- before creating a new page file (`src/pages/<route>/*.tsx`, Next.js `page.tsx`), a `UX.md` brief must exist next to it (disable per project with `MDIGITAL_UX_BRIEF=off`);
- after every edit of a `.tsx`/`.jsx` file, files over 150 lines are sent back for decomposition (`shared/ui`, tests and stories are exempt; legacy files may be edited as long as they don't grow).

Reports: `docs/reports/`.

### figma-pack

Figma workflow through the Figma MCP. Entry skill: `figma-core` (routes every Figma request).

| Skill | Covers |
|---|---|
| `figma-core` | Router, seat and rate-limit checks, shared rules |
| `figma-design-system` | Connect the design system by one link → project catalog `.figma/design-system.{md,json}` |
| `figma-design` | Design screens and sites in Figma only from catalog components, blocks and variables |
| `figma-to-react` | Figma → React web (desktop + mobile web), following frontend-pack |
| `figma-to-react-native` | Figma → React Native (Expo, Expo Router, Unistyles) |
| `figma-to-flutter` | Figma → Flutter (MVVM, Riverpod, go_router, ThemeData from variables) |

Agents: `figma-reader` (read-only, produces a platform-neutral spec), `figma-designer` (draws in Figma after an explicit "yes").

Figma seats: View = 6 MCP calls/month on Enterprise (not usable); Dev = reading (design → code); Full = reading and drawing.
