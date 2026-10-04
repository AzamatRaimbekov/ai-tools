# Accessibility of behaviour (WCAG 2.2 AA)

Static a11y (contrast, semantics of components) belongs to `react-ui`. This file covers behaviour: focus, announcements, keyboard, motion.

## Focus management

| Event | Where focus goes |
|---|---|
| Route change | Page `<h1 tabIndex={-1}>` (or `<main>`); document title updated |
| Dialog open | First focusable element, or the safe action in AlertDialog |
| Dialog close | Back to the trigger |
| Item deleted from list | Next item, previous if last, list heading if empty |
| Form submit with errors | First invalid field (RHF `shouldFocusError`) |
| Inline edit saved | Back to the edit button / the row |
| Content loaded after skeleton | Do not move focus; announce instead |

```tsx
// src/shared/hooks/useFocusOnMount.ts
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return ref
}
// <h1 ref={useFocusOnMount<HTMLHeadingElement>()} tabIndex={-1} className="outline-none">...
```

Don't focus on initial app load (it would skip the skip-link); only after client-side navigation.

## Announcing async updates (SC 4.1.3)

- Results count / filters applied / "Saved": `role="status"` (polite).
- Errors that block the task: `role="alert"` (assertive), used sparingly.
- The live region must exist in the DOM **before** its text changes; render the container always and swap its text.

```tsx
<p role="status" className="sr-only">{isFetching ? '' : t('orders.resultsCount', { count: total })}</p>
```

sonner's toaster is a live region already - don't double-announce the same message.

## Keyboard

- Every action works with keyboard; custom clickable `div`s are forbidden - use `<button>`/`<a>`.
- Visible focus indicator always (`focus-visible:ring`); never `outline: none` without replacement.
- Focus not obscured by sticky headers/footers (SC 2.4.11): add `scroll-margin-top` to focus targets.
- Drag-and-drop has a non-drag alternative (move up/down buttons or menu) (SC 2.5.7).
- Esc closes overlays; Enter submits single-line forms; don't hijack browser shortcuts.
- Target size ≥ 24×24 CSS px (SC 2.5.8).
- Don't require re-entering info already given in the same process (SC 3.3.7 Redundant Entry).
- Authentication: allow paste and password managers; no cognitive puzzles (SC 3.3.8).

## Motion

- Respect `prefers-reduced-motion`: Tailwind `motion-safe:animate-pulse`, `motion-reduce:transition-none`.
- For JS animations (`motion`/framer): `useReducedMotion()` → instant transitions.
- No auto-playing carousels without pause; nothing flashes more than 3 times/second.
- Animations ≤ 200-300 ms for UI transitions; never delay the user's next action for decoration.

## Timeouts and sessions

- Warn before session timeout and allow extending; preserve form data across re-login.
