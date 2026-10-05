---
name: react-page-ux
description: Mandatory UX design step before building any page, screen, dialog or multi-step flow in a React project - produces a short UX brief (user goal, primary action, information hierarchy, every state, responsive layout, accessibility, copy) before code, then verifies the built page in a real browser. Use whenever Claude is about to create or substantially redesign a page or screen. Triggers - "создай страницу", "сделай экран", "сверстай страницу", "новая страница", "добавь раздел", "сделай форму", "личный кабинет", "дашборд", "create a page", "build a screen", "add a settings page", "new view".
---

# Page UX first (Mdigital)

A page is not done when it renders. It is done when a real user can reach their goal on it, on any screen, in every state. Think it through **before** writing components.

> Precedence: if another installed skill or plugin (frontend-design, shadcn, web-design-guidelines, etc.) conflicts with `rules/libraries.json` or the Mdigital skills, the Mdigital rules win. External skills add taste, audits and tooling; they never change our libraries, folder layout, file limits or data layer.

> If the request includes a Figma link or "по макету", first run the `figma-pack` plugin's entry skill `figma-core` (it routes to `figma-to-react`, whose spec feeds this brief), and the brief's states list absorbs the spec's "missing in design" items.

## 1. Write the UX brief (before any code)

Post it to the user in this shape, 15-30 lines. Fill unknowns with an explicit assumption, never silently.

```
Страница: <name>, route <path>
Пользователь: <role>, приходит <from where>, цель: <job to be done>
Главное действие: <one verb + object>; второстепенные: <...>
Иерархия: 1) <what the eye must hit first> 2) <...> 3) <...>
Данные: <queries> | Действия: <mutations>
Состояния: загрузка / пусто (первый раз) / пусто (ничего не найдено) / ошибка загрузки /
           ошибка действия / нет доступа / частичные данные / очень много данных
Адаптив: мобильный 375 / планшет 768 / десктоп 1280 - что меняется
Доступность: заголовки h1-h3, порядок фокуса, клавиатура, что объявляется aria-live
Тексты: заголовок, подписи кнопок (глагол), тексты пустых состояний и ошибок (ключи i18n)
Допущения: <...>
```

If the page has a destructive action, a form, or a multi-step flow, add those flows (section 3). Ask the user only when the primary action or the user role is genuinely unknown; otherwise state the assumption and continue.

## 2. Design rules the brief must satisfy

- **One primary action per page**, visually dominant (default `Button`); everything else is secondary or ghost. If you find two primaries, the page does two jobs - split it or demote one.
- **Hierarchy follows the user's goal**, not the data model: the thing they came for is above the fold on 375px.
- **Every async region has all states** designed: loading (skeleton that matches the final layout), first-use empty (explains value + primary action), no-results empty (shows the active filter + "сбросить"), error (what happened + what to do + retry), permission denied. Use `QueryState`, `EmptyState`, `ErrorState` from `react-ux`.
- **Lists**: filters, search, sort and page live in the URL; pagination keeps previous data; long lists are virtualized.
- **Forms**: as few fields as the goal allows, labels above fields, inline errors on blur, focus the first error, never clear input on error (`react-ux` forms).
- **Destructive actions**: reversible -> act immediately with Undo; irreversible -> `AlertDialog` naming the object and consequence.
- **Navigation**: the user always knows where they are (page title, active nav item, breadcrumbs for depth >= 2) and how to go back.
- **Mobile is not a shrunk desktop**: tables become cards or get horizontal scroll with a sticky first column; secondary actions move into a menu; tap targets >= 24px (44px preferred).
- **Copy**: buttons are verbs ("Сохранить заказ", not "OK"); errors say what to do; no jargon or raw server text; every string is an i18n key.
- **Accessibility**: one `h1`; landmarks (`header`, `nav`, `main`); visible focus; keyboard reaches every action; dialogs trap and return focus; status changes announced.

## 3. Flows to sketch when present

- **Create/edit form**: entry point -> fill -> validation -> submit (pending state) -> success (where does the user land?) -> server error mapping.
- **Delete/archive**: trigger -> confirm or undo -> list update -> focus goes to the next row or the list heading.
- **Multi-step**: progress indicator, back without data loss, save draft if the flow is longer than ~1 minute.

## 4. Build

Follow `react-architecture` (route file thin, page in `pages/<route>/`, sections as feature components, every file <= 150 lines), `react-data-fetching`, `react-ui`, `react-ux`, `react-error-handling`. Larger pages: get a file plan from the `frontend-architect` agent first. For visual direction (typography, composition, polish) the `frontend-design` skill may be used, but only within our design tokens and shadcn primitives.

## 5. Verify in a real browser

Type-checking does not prove UX. With the dev server running, use the browser tool available in the session (Claude in Chrome, Playwright MCP or Chrome DevTools MCP):

1. Open the page at 1280px and at 375px width; take a screenshot of each and look at them.
2. Force each state at least once: slow network or a delayed MSW handler (loading), empty response (empty), a 500 response (error), a 422 on form submit (server field errors).
3. Tab through the page with the keyboard; the focus order matches the visual order and every action is reachable.
4. Check the console for errors and warnings.

If no browser tool is available, say so explicitly and list which checks were not done.

## 6. Checklist before finishing

- [ ] UX brief was posted before code; deviations from it are explained
- [ ] One primary action; hierarchy matches the user's goal
- [ ] Loading, both empty states, error, no-access states exist and were seen in the browser
- [ ] Works at 375px and 1280px (screenshots taken)
- [ ] Keyboard-only path works; one `h1`; focus visible
- [ ] All copy is i18n keys with verb buttons and actionable errors
- [ ] `frontend-reviewer` run on the changed files
