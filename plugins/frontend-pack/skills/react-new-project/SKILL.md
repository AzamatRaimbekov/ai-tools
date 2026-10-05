---
name: react-new-project
description: Creates a new Mdigital React project from scratch with the official CLIs (Vite or Next.js, Tailwind v4, shadcn/ui) and lays down the pack's foundation - folder structure, http client, QueryClient, shared async-state components, ESLint rules. Use when the user explicitly asks to start, scaffold or create a new React or Next.js project, admin panel, CRM, dashboard or landing from scratch. Triggers - "создай новый проект", "новый фронтенд", "сделай проект с нуля", "заведи React проект", "new React project", "scaffold a Next.js app", "start a new frontend". Do not use for changes inside an existing project.
---

# New React project (Mdigital)

Create the project with official tools only. Never scaffold over existing code.

## 1. Check the target

- The target directory must not exist or must be empty. If it contains a project, stop and ask.
- Node.js >= 22 (`node -v`). Use npm unless the user names pnpm.

## 2. Choose the stack

| Signal in the request | Stack |
|---|---|
| Admin panel, CRM, dashboard, internal tool, anything behind login | **Vite SPA** + TanStack Router + TanStack Query |
| Public site that needs SEO, landing, marketing pages, SSR | **Next.js App Router** + TanStack Query |

If both apply or the request is unclear, ask one question: "Нужна ли индексация в поисковиках (SEO)?". Do not decide on a backend; this skill creates the frontend only.

## 3. Scaffold with the official CLIs

Check each CLI's current flags with `--help` before running; flags change between versions.

**Vite SPA**

```bash
npm create vite@latest <dir> -- --template react-ts
cd <dir> && npm install
npm install tailwindcss @tailwindcss/vite @tanstack/react-query @tanstack/react-router \
  react-hook-form @hookform/resolvers zod sonner react-error-boundary react-i18next i18next lucide-react
npm install -D @tanstack/router-plugin @tanstack/react-query-devtools @tanstack/eslint-plugin-query \
  vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom msw
npx shadcn@latest init
```

Configure the `@/*` path alias in `tsconfig.app.json` and `vite.config.ts` before `shadcn init` (the shadcn Vite guide shows both files).

**Next.js**

```bash
npx create-next-app@latest <dir> --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd <dir>
npm install @tanstack/react-query react-hook-form @hookform/resolvers zod sonner \
  react-error-boundary react-i18next i18next lucide-react nuqs
npm install -D @tanstack/react-query-devtools @tanstack/eslint-plugin-query \
  vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom msw
npx shadcn@latest init
```

Every package must be in `rules/libraries.json` (allowed). Add Sentry only when the user has a DSN.

## 4. Lay down the foundation

Create these files, taking the code from the owning skill. Do not invent alternatives.

| File | Source |
|---|---|
| `src/` folder layout (`app/`, `pages/` or Next `app/`, `features/`, `shared/{ui,components,hooks,lib,api,config}`) | `react-architecture` section 1 |
| `components.json` aliases: `ui` -> `@/shared/ui`, `utils` -> `@/shared/lib/utils`, `hooks` -> `@/shared/hooks` | `react-ui` references/shadcn-setup.md |
| `shared/api/errors.ts`, `errorBody.ts`, `http.ts` | `react-error-handling` references/api-errors.md |
| `shared/api/queryClient.ts` (Vite) or `getQueryClient.ts` (Next.js) | `react-error-handling` references/tanstack-query.md |
| `shared/lib/getUserMessage.ts`, `applyServerErrors.ts`, `reportError.ts` | `react-error-handling` |
| `shared/components/QueryState.tsx`, `ErrorState.tsx`, `EmptyState.tsx`, `Delayed.tsx` | `react-ux` references/async-states.md |
| `shared/components/WidgetBoundary.tsx`, `app/AppErrorBoundary.tsx`, `app/AppFallback.tsx` | `react-error-handling` references/boundaries.md |
| Router with `defaultPreload: 'intent'` and `defaultErrorComponent` (Vite) | `react-data-fetching` references/nextjs.md |
| `shared/config/env.ts`: parse `import.meta.env` (Vite) or `process.env` (Next.js) with a Zod schema, export typed `env` | this skill |
| `eslint.config.js` (max-lines 150, hooks, query, import boundaries) | `react-architecture` references/eslint-config.md |
| i18n setup with `ru` as default locale | `react-ux` |

Remove the scaffold's demo code (counter, logos, default page content).

## 5. Project instructions

Write `CLAUDE.md` in the project root (keep it under 30 lines):

- stack and the commands `npm run dev`, `npm run build`, `npm run lint`
- "This project follows the mdigital frontend-pack plugin; load its skills before writing code"
- "Before creating any page, run the `react-page-ux` skill"
- project-specific facts only (API base URL variable, auth method) once known

## 6. Verify before handing back

Run and fix until all pass:

```bash
npx tsc --noEmit -p .        # Vite: -p tsconfig.app.json
npm run lint
npm run build
npx vitest run --passWithNoTests
node <frontend-pack>/scripts/check-file-size.mjs src
```

Report what was created, the chosen stack and why, and the output of these checks. Do not start feature work unless the user asked for it; when they did, start with `react-page-ux` for the first page.
