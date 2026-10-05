---
name: react-architecture
description: Mdigital rules for structuring React 19 + TypeScript code (Vite + TanStack Router or Next.js App Router, shadcn/ui, TanStack Query, React Hook Form + Zod). Covers the canonical src/ folder layout, the hard 150-line limit per component file with a step-by-step decomposition procedure, one component per file, naming, feature public API and import boundaries, where state should live, Rules of Hooks, avoiding unnecessary effects, purity, props design, and React 19 / React Compiler memoization guidance. Use when creating or editing React components, hooks, or features, when a file grows too large, when deciding where code or state belongs, or when reviewing structure. Triggers - "компонент слишком большой", "файл больше 150 строк", "декомпозиция", "разбей компонент", "куда положить", "структура папок", "архитектура фронтенда", "где хранить состояние", "лишний useEffect", "нужен ли useMemo", "component too big", "split this component", "decompose", "folder structure", "where should this go", "state placement", "project architecture", "feature folder".
---

# React Architecture (Mdigital)

Apply these rules to every React file you create or modify. They are mandatory unless the user explicitly overrides one.

> Precedence: if another installed skill or plugin (frontend-design, shadcn, web-design-guidelines, etc.) conflicts with `rules/libraries.json` or the Mdigital skills, the Mdigital rules win. External skills add taste, audits and tooling; they never change our libraries, folder layout, file limits or data layer.

## 1. Folder structure

```
src/
  app/              providers, router setup, global styles, app-level error boundary
  pages/            (Vite) thin route components that compose features
  app/<route>/      (Next.js App Router) page.tsx / layout.tsx stay thin
  features/<feature>/
    components/     one component per file
    hooks/          feature hooks (useXxx.ts)
    api/            <entity>.schemas.ts, .api.ts, .queries.ts, .mutations.ts
    lib/            pure helpers, constants, form Zod schemas
    types.ts        feature types
    index.ts        public API of the feature
  shared/
    ui/             shadcn primitives (generated, edit sparingly)
    components/     reusable composite components (domain-agnostic)
    hooks/          generic hooks (useDebouncedValue, useMediaQuery)
    lib/            pure utils (format, dates, cn in utils.ts)
    api/            http client, error types, queryClient
    config/         env parsing, constants, route paths
```

- Vite + TanStack Router with file-based routing: route files (`src/routes/`) only declare the route (loader, `validateSearch`) and render a page from `pages/`. In Next.js, `app/` is the routing layer and must stay thin; never put feature logic in `page.tsx`.
- Create a subfolder only when it has content. A feature with one component does not need `hooks/` or `lib/`.
- A file belongs in `shared/` only if it has no knowledge of any business domain. If it mentions `user`, `order`, `invoice`, it belongs in a feature.
- Dependency direction is one-way: `shared -> features -> pages/routes -> app`. `shared/` never imports from `features/`, `pages/`, or `app/`.

## 2. The 150-line rule

A `.tsx` component file must not exceed **150 lines** (all lines, including imports). This is enforced by ESLint `max-lines` (see `references/eslint-config.md`). Treat 120 lines as the signal to start planning a split. Exempt: `shared/ui/**` (shadcn-generated; `components/ui/**` in a default shadcn layout), `*.test.tsx`, `*.stories.tsx`.

Other signals that a component must be split even below 150 lines:
- It has more than one reason to change (data loading + form + table + dialog).
- The component function body exceeds ~80 lines.
- JSX nesting deeper than ~5 levels, or more than one `.map()` rendering non-trivial items.
- More than ~3 `useState` calls that are updated together, or any `useEffect` mixed with rendering logic.
- More than ~7 props.

### Decomposition procedure (apply in this order)

Do the cheapest, safest extractions first and re-measure after each step.

1. **List responsibilities.** Write down in one line each what the component does (fetch X, filter X, render table, edit row in dialog). Every responsibility beyond the first is an extraction candidate.
2. **Extract pure code** (no hooks, no JSX): formatters, mappers, filters, sorters, validators, form Zod schemas, constants, option lists, column definitions -> `features/<f>/lib/<name>.ts` (API response schemas live in `api/<entity>.schemas.ts`). Move to `shared/lib/` only if domain-agnostic.
3. **Extract stateful logic** (state, reducers, queries, mutations, effects, derived values, handlers) -> a custom hook `features/<f>/hooks/useXxx.ts`. The component then reads `const { ... } = useXxx()` and only renders.
4. **Extract JSX regions** into sub-components, one per file, in `features/<f>/components/`: list items/rows, card sections, toolbars, dialogs, empty/error/loading states. Name them after what they show (`OrderRow`, `OrderFilters`), never `Part1`, `Section2`, `Helper`.
5. **Flatten branching**: replace nested ternaries with early returns or a status-to-component map.
6. **Re-measure.** If still over the limit, repeat from step 1 on the largest extracted piece.

Never solve the limit by: putting two components in one file, cramming JSX onto long lines, deleting types, or moving code into a generic `utils.ts`.

See `references/decomposition-example.md` for a full before/after walkthrough.

## 3. One component per file

- Each `.tsx` file exports exactly one component. Private helpers used only by it may live in the same file only if they are not components and the file stays under 150 lines.
- Never define a component inside another component's body (it remounts on every render and loses state).

```tsx
// Bad: nested component definition
function OrderList({ orders }: OrderListProps) {
  const Row = ({ order }: { order: Order }) => <li>{order.id}</li>;
  return <ul>{orders.map((o) => <Row key={o.id} order={o} />)}</ul>;
}

// Good: OrderRow lives in components/OrderRow.tsx
function OrderList({ orders }: OrderListProps) {
  return <ul>{orders.map((o) => <OrderRow key={o.id} order={o} />)}</ul>;
}
```

## 4. Naming

| Kind | File name | Export |
|------|-----------|--------|
| Component | `OrderRow.tsx` (PascalCase = component name) | `export function OrderRow` |
| Hook | `useOrderFilters.ts` | `export function useOrderFilters` |
| Pure util | `formatPrice.ts` (camelCase) | named export |
| Types | `types.ts` | named types |
| Feature API (`react-data-fetching`) | `api/order.schemas.ts`, `order.api.ts`, `order.queries.ts`, `order.mutations.ts` (entity lowercase) | named exports |
| shadcn primitive | keep generated name (`button.tsx`) | as generated |

- Shared files follow the same rules: `ErrorState.tsx`, `getUserMessage.ts`, `queryClient.ts`; `cn` comes from `@/shared/lib/utils` (shadcn default).
- Use named exports. Default exports only where the framework requires them (Next.js `page.tsx`, `layout.tsx`, lazy route modules).
- Props type: `<Component>Props`. Callback props: `onXxx`. Handlers inside: `handleXxx`. Booleans: `isXxx`, `hasXxx`, `canXxx`.
- Prefix `use` only for functions that call hooks. A function without hooks is a plain function (`getSortedOrders`, not `useSortedOrders`).

## 5. Feature public API and import boundaries

- Other code imports a feature only through its `index.ts`: `import { OrderTable } from '@/features/orders'`. Never `@/features/orders/components/OrderTable`.
- `index.ts` uses explicit named re-exports. Never `export *`. Export only what pages or other features need.
- Inside a feature, use relative imports to the concrete file. Never import from your own feature's `index.ts` (causes cycles).
- Prefer composing features in pages over features importing each other. If feature A must use feature B, import only B's public API and never create a cycle.
- `shared/` has no barrel files. Import concrete modules: `@/shared/ui/button`, `@/shared/lib/formatPrice`.
- When two features need the same code, promote it to `shared/` (if domain-agnostic) instead of reaching into the other feature.

## 6. State placement

Choose the first option that fits:

1. **Not state at all.** If it can be computed from props or other state, compute it during render.
2. **Local state** (`useState`, `useReducer` for related transitions) in the component that uses it.
3. **Lift state up** to the closest common parent when siblings must stay in sync.
4. **Composition before context.** Pass `children` or slots to avoid prop drilling before reaching for context.
5. **URL state** for anything that should survive reload or be shareable: filters, search, pagination, sorting, active tab, selected id. TanStack Router (Vite): `validateSearch` with Zod. Next.js: `nuqs`.
6. **Server state** lives only in the TanStack Query cache. Never copy query data into `useState`, context, or a store; read it via a hook that wraps `useQuery(orderQueries.detail(id))` (key factory per `react-data-fetching`).
7. **Form state** belongs to React Hook Form, not to parallel `useState`.
8. **Context** for low-frequency, app-wide client values: theme, session, locale.
9. **Global client store** (Zustand) last, only for genuinely global client state not covered above.

State structure rules: group values that change together; replace contradictory booleans with one `status` union; store ids, not copies of objects; do not mirror props into state (name it `initialXxx` if you intentionally do). Details in `references/state-and-effects.md`.

## 7. Rules of Hooks and purity

- Call hooks only at the top level of components and custom hooks, never in conditions, loops, nested functions, or after an early return.
- Components and hooks must be pure: same props/state/context -> same JSX. No mutation of props, state, hook arguments, or module variables during render. No side effects during render (fetching, subscribing, writing to storage, `Math.random()` or `Date.now()` used for output).
- Never call a component as a function (`OrderRow(props)`); render it as `<OrderRow />`.
- Never mutate state; create new objects/arrays.

## 8. Effects are the last resort

Before writing `useEffect`, check this list. You do not need an effect to:
- derive data from props/state -> compute in render;
- reset state when a prop changes -> pass `key={id}` to the component;
- respond to a user action -> do it in the event handler;
- notify a parent -> call `onChange` in the same handler that sets state;
- chain state updates -> compute the next state in one handler;
- fetch data -> use TanStack Query (`useQuery`, route loaders with `ensureQueryData`).

Effects are for synchronizing with external systems only (DOM APIs, subscriptions, third-party widgets, analytics on view). Wrap each such effect in a named custom hook (`useWindowSize`, `useDocumentTitle`). Do not write lifecycle wrappers like `useMount`. To read the latest callback inside an effect without re-subscribing, use `useEffectEvent` (React 19.2+).

## 9. Props design

- Type props with an explicit `type XxxProps = { ... }`; no `any`, no `React.FC`.
- Prefer one union prop over several booleans: `variant: 'primary' | 'danger'`, not `isPrimary`, `isDanger`.
- Accept `children` for content instead of `renderHeader`, `title2`, `subtitleNode` props.
- Pass data the component needs, not whole parent objects "just in case". Pass ids to components that fetch their own data via a query hook.
- Extend native element props when wrapping one: `type Props = React.ComponentProps<'button'> & { ... }`.
- React 19: `ref` is a regular prop. Do not use `forwardRef` in new code. Render context as `<ThemeContext value={...}>`.

## 10. Memoization and React Compiler

- When React Compiler is enabled (Vite: `babel-plugin-react-compiler`; Next.js: `reactCompiler: true`), do not add `useMemo`, `useCallback`, or `memo` in new code by default. Use them only as an escape hatch: a value used as an effect dependency, or a measured performance problem.
- Do not remove existing memoization in unrelated edits; removing it can change compiled output. Remove only with testing.
- Without the compiler: memoize only when profiling shows a problem or a stable reference is required by a dependency array.
- The compiler only optimizes code that follows the Rules of React. Purity violations silently disable it for that component.

## 11. React 19 features: when to use

- `use(promise)` / `use(Context)`: reading context conditionally; promises passed from Server Components in Next.js. In the Vite SPA, keep data loading in TanStack Query.
- `useActionState`, `useFormStatus`, `useOptimistic`: acceptable with Next.js Server Actions. Default forms are React Hook Form + Zod; optimistic updates in the SPA go through TanStack Query mutations.
- Document metadata (`<title>`, `<meta>`) can be rendered inside the page component.

## Checklist before finishing

- [ ] Every new `.tsx` file is ≤150 lines and contains one component; an existing file over the limit did not grow (split it when the task touches its structure).
- [ ] No component is defined inside another component.
- [ ] Pure logic is in `lib/`, stateful logic in `hooks/`, JSX regions in `components/`.
- [ ] Files are in the correct layer; nothing in `shared/` mentions a business domain.
- [ ] Cross-feature imports go through `@/features/<name>` only; no `export *`; no imports of my own feature's `index.ts`.
- [ ] No state that can be derived; no props mirrored into state; server data is not copied out of TanStack Query.
- [ ] Every `useEffect` synchronizes with an external system and has a reason; none derives state or handles events.
- [ ] Hooks are called unconditionally at top level; render is pure.
- [ ] No new `useMemo`/`useCallback`/`memo` without a stated reason (if Compiler is on); no `forwardRef`.
- [ ] Names follow section 4; `use` prefix only on functions that call hooks.
- [ ] `tsc --noEmit` and ESLint pass.

## References

- `references/decomposition-example.md` - full before/after split of an oversized component.
- `references/state-and-effects.md` - state structure and effect replacement patterns with code.
- `references/eslint-config.md` - ESLint flat config enforcing 150 lines, hooks rules, boundaries.
- `references/sources.md` - sources this skill is based on.
