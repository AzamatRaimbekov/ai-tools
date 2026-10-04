---
name: react-dry
description: Mdigital rules for removing duplication in React 19 + TypeScript code without creating wrong abstractions. Covers how to detect duplicated JSX, logic, data transformations, styles, and query code; how to choose the extraction target (custom hook, pure util, component, compound component, config map, queryOptions factory, shared Zod schema); where each extracted piece goes in the src/features and src/shared structure; when NOT to abstract (rule of three, AHA, incidental vs real duplication); and anti-patterns such as boolean-prop explosion, god hooks, and utils dumping grounds. Use when writing code that resembles existing code, when copy-pasting, when refactoring similar components, or when reviewing an abstraction. Triggers - "дублирование кода", "повторяющийся код", "вынеси в хук", "вынеси в компонент", "переиспользуемый компонент", "DRY", "копипаста", "одинаковый код", "слишком много пропсов", "сделай общий компонент", "duplicate code", "repeated logic", "extract a hook", "extract component", "reusable component", "too many props", "refactor duplication", "shared util".
---

# DRY without wrong abstractions (Mdigital)

Goal: every piece of knowledge has one home, and every abstraction has one clear job. Duplication is cheaper than the wrong abstraction, so extract deliberately. Folder layout and the 150-line rule come from the `react-architecture` skill.

## 1. Before writing new code, search for existing code

Before creating a component, hook, util, query, or schema:
1. Search `src/shared/` and the current feature for something that already does it (grep by intent: `format`, `Date`, `Price`, `useDebounce`, `Empty`, `Skeleton`, `Dialog`).
2. Check `src/shared/ui/` for a shadcn primitive before building one (Button, Dialog, Sheet, Table, Badge, Skeleton, Form).
3. If something close exists, use or extend it. If it exists inside another feature, do not import its internals; promote it (section 5).

## 2. Detecting duplication

Treat these as duplication signals:
- Same JSX skeleton with different data (two cards, two empty states, two table toolbars).
- Same `useState` + handler + effect pattern in several components (open/close, debounce, pagination).
- Same data transformation (`filter`/`map`/`reduce`, date or money formatting) written more than once.
- The same `switch`/ternary chain over one union type in several places (status -> label, status -> color).
- Same `queryKey` arrays or `fetch` calls typed inline in several files.
- Same Zod fields (email, phone, password) redefined per form.
- Long identical Tailwind class strings on several elements.

## 3. Decide: extract now, wait, or keep duplicated

**Extract on the second occurrence** (duplicated *knowledge*; divergence is a bug):
- business rules and calculations (price with discount, permissions check);
- constants and enum-like mappings (status labels, route paths, limits);
- API contracts: query keys, fetchers, response types;
- validation rules (Zod schemas and fields);
- formatting of money, dates, phone numbers.

**Wait for the third occurrence** (rule of three; duplicated *shape*):
- similar-looking JSX, similar handlers, similar layouts. Two instances do not show which parts truly vary.

**Keep duplicated** when:
- the pieces look the same but change for different reasons (incidental duplication: an admin form and a public form that share fields today but will diverge);
- the abstraction would need flags or conditionals to cover each caller;
- the shared version would be harder to read than the copies;
- it is test code: prefer explicit, readable tests over clever shared setup.

Test before extracting: "If requirement X changes, must every copy change?" Yes -> extract. Not necessarily -> keep separate.

## 4. Choose the extraction target

| What repeats | Extract to | Location |
|---|---|---|
| Pure computation, no hooks | function | `features/<f>/lib/` or `shared/lib/` |
| Stateful logic using hooks | custom hook `useXxx` | `features/<f>/hooks/` or `shared/hooks/` |
| JSX + styling | component | `features/<f>/components/` or `shared/components/` |
| Visual variants of one element | `cva` variants inside that component | same file |
| Related parts sharing implicit state (Tabs, Stepper, Accordion) | compound component with context | own folder in `components/` |
| Branching over a union type | `Record<Union, Config>` map | `features/<f>/lib/` or next to the consumer |
| Query key + fetcher + options | `<entity>Queries` key factory with `queryOptions` (per `react-data-fetching`) | `features/<f>/api/<entity>.queries.ts` |
| Validation fields | Zod schema pieces | `features/<f>/lib/` or `shared/lib/validation/` |
| Repeated layout wrapper | layout component with `children` | `shared/components/` or route layout |
| Long class strings | a component (not `@apply`); merge classes with `cn` from `@/shared/lib/utils` (see `react-ui`) | `shared/components/` |

Rules for each target:
- **Function vs hook:** if it does not call a hook, it is a function and must not start with `use`.
- **Hook scope:** one concrete purpose per hook (`useOrderFilters`, `useDebouncedValue`), returning a small object. A hook that returns more than ~6 values or manages unrelated concerns is a god hook; split it.
- **Hooks share logic, not state.** Two components calling `useCart()` get separate state unless the hook reads from TanStack Query, context, or a store.
- **Component API:** narrow typed props, `children` for content, one union `variant` prop instead of booleans, extend native props when wrapping a native element.
- **Config maps:** type with `Record<Union, ...>` so adding a union member fails compilation until configured.

Code examples for every target: `references/extraction-examples.md`.

## 5. Where extracted code lives (promotion path)

1. **Start local.** First extraction goes in the same feature: `features/<f>/lib|hooks|components`.
2. **Promote to `shared/`** only when a second feature needs it *and* it has no domain knowledge. Strip domain names during promotion (`OrderEmptyState` -> `EmptyState` with `title`, `description`, `action` props).
3. **Domain logic used by two features** stays in the owning feature and is exported from its `index.ts`, or both features are composed in the page. Never deep-import another feature's internals.
4. **Never promote speculatively.** `shared/` is not a staging area for code that "might be reused".

## 6. Anti-patterns (do not do these)

**Boolean-prop explosion.** Each boolean doubles the possible states.

```tsx
// Bad
<UserCard user={u} compact showAvatar={false} isAdmin withActions hideEmail />

// Good: explicit variants and composition
<UserCard user={u} variant="compact">
  <UserCardActions user={u} />
</UserCard>
```

**Configuration mega-component.** A `<DataTable>` or `<FormBuilder>` with 25 props and render callbacks for every cell. Prefer small composable pieces (shadcn `Table` + feature-specific `OrdersTable`) over one component driven by a giant config.

**God hook.** `usePage()` that fetches, filters, paginates, handles dialogs and toasts. Split by concern: `useOrderFilters`, `useOrdersQuery`, `useEditOrderDialog`.

**Utils dumping ground.** `utils.ts`, `helpers.ts`, `common.ts` with unrelated functions. Name files after what they do (`formatPrice.ts`, `groupByDate.ts`) and group by domain.

**Wrong abstraction growth.** Adding a parameter or `if (caller === ...)` to make shared code fit a new caller. When an abstraction needs per-caller branches: inline it back into callers, delete what each caller does not need, then re-extract what is truly common.

**Thin wrappers.** A component that only renames props of another (`<MyButton>` that forwards everything to `<Button>`). Use the primitive directly or add a real `cva` variant.

**Lifecycle hooks.** `useMount`, `useUpdateEffect`, `useDidUpdate`. They hide dependencies from the linter. Write the effect (if one is needed at all) inside a hook named for its purpose.

**`use` prefix on plain functions.** `useFormatDate` with no hooks inside is a function: `formatDate`.

**Copying server data to share it.** Do not put query results into context or a store to "avoid duplication". Call the same query hook in each component; TanStack Query deduplicates requests and shares the cache.

**Premature generics.** `<T extends Record<string, unknown>>` components and hooks written for one caller. Add generics when the second real caller appears.

## 7. Refactoring procedure

1. Find all copies (grep for distinctive lines, class strings, query keys).
2. Diff them; list what is identical and what varies.
3. If what varies is only data -> parameters/props. If what varies is structure -> `children`/slots or separate components. If what varies is behavior per case -> config map or separate components, not flags.
4. Extract into the location from section 5 with a name that describes the job.
5. Replace every copy, run `tsc --noEmit`, ESLint, and tests.
6. Verify every touched `.tsx` file is still at most 150 lines and that no new import crosses a feature boundary.

## Checklist before finishing

- [ ] I searched `shared/` and the current feature for existing code before writing new code.
- [ ] Duplicated knowledge (business rules, constants, query keys, schemas, formatting) has exactly one source.
- [ ] Shape-only duplication was extracted only at the third occurrence, or deliberately kept.
- [ ] Each extraction uses the right target from section 4 and lives in the right folder per section 5.
- [ ] `shared/` contains no domain names; nothing deep-imports another feature.
- [ ] No new boolean props for variants; no component with more than ~7 props; no hook returning more than ~6 values.
- [ ] No `utils.ts`/`helpers.ts` dumping files; no `use` prefix on non-hooks; no lifecycle hooks.
- [ ] Extracted code has no `if (caller is X)` branches.
- [ ] Types, lint, and tests pass.

## References

- `references/extraction-examples.md` - before/after code for each extraction target.
- `references/sources.md` - sources this skill is based on.
