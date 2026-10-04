# ai-tools

Claude Code plugins of the Mdigital front-end department.

## Install

```bash
claude plugin marketplace add git@gitlab.mdigital.kg:front-end-deport/ai-tools.git
claude plugin install frontend-pack@mdigital
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

Hook: after every edit of a `.tsx`/`.jsx` file, files over 150 lines are sent back for decomposition (`shared/ui`, tests and stories are exempt; legacy files may be edited as long as they don't grow).
