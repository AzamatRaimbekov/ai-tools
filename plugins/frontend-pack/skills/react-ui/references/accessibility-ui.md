# Accessibility in UI code

Target: WCAG 2.2 AA. Most of it comes free if you use semantic HTML and the shadcn primitives without breaking them.

## Order of preference

1. Native element (`button`, `a`, `input`, `select`, `dialog`, `details`, `table`).
2. shadcn primitive (Base UI / Radix underneath) for complex widgets.
3. Custom widget with ARIA - last resort, follow the WAI-ARIA APG pattern exactly.

"No ARIA is better than bad ARIA": a `role` promises keyboard behavior the browser will not add for you.

## Accessible names

```tsx
// Icon-only button
<Button variant="ghost" size="icon" aria-label="Delete order">
  <Trash2 aria-hidden="true" />
</Button>

// Visible label for inputs
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" autoComplete="email" />

// Landmarks with more than one instance need labels
<nav aria-label="Primary">...</nav>
<nav aria-label="Breadcrumb">...</nav>
```

- Placeholder is not a label.
- Link text must make sense out of context: not "click here".
- Images: meaningful `alt`; decorative `alt=""`.
- `Dialog`/`Sheet` need a `DialogTitle` (visually hidden with `sr-only` if the design has none) and ideally a `DialogDescription`.

## Focus

- Keep the visible focus style: `focus-visible:ring-[3px] focus-visible:ring-ring/50` (from shadcn). Never `outline-none` without a replacement.
- Use `focus-visible`, not `focus`, so mouse clicks do not show rings.
- Do not use positive `tabIndex`. `tabIndex={-1}` only for programmatic focus targets.
- Dialogs/menus trap and restore focus via the primitive - do not reimplement.
- Focused element must not be hidden behind sticky headers (WCAG 2.4.11): add `scroll-mt-*` to anchor targets.

## Contrast and color

- Text 4.5:1, large text (>= 24px, or >= 18.66px bold) 3:1.
- Non-text UI (input borders, focus rings, icons conveying meaning) 3:1 against adjacent colors.
- Verify both light and dark token pairs when adding tokens.
- Never convey state by color only - add an icon, text or pattern (error = red border + message + icon).
- Do not fade text with `opacity-50` for "secondary" text; use `text-muted-foreground`. `opacity-50` is for disabled controls only.

## Target size and motion

- Pointer targets at least 24x24 CSS px (WCAG 2.5.8); shadcn `size="icon"` (36px) is a good default; on touch-first screens prefer 44px.
- Animations: wrap non-essential motion with `motion-safe:` or add `motion-reduce:animate-none`; with `motion` use `useReducedMotion`.

## Forms (visual side)

- Use shadcn `Field` / `Form` parts: they wire `id`, `htmlFor`, `aria-describedby`, `aria-invalid`.
- Style invalid state with `aria-invalid:` variants (already in shadcn inputs), not separate `error` props.
- Required fields: `required` attribute plus a visible marker; group related controls in `fieldset` + `legend`.

## Visually hidden content

`sr-only` for text that screen readers need but sighted users get from context. Never `display:none`/`hidden` for that - it hides from AT too.

## Custom widget checklist (only if no primitive exists)

- [ ] Pattern chosen from WAI-ARIA APG and followed (roles, states, properties)
- [ ] Full keyboard support per pattern (Tab, Enter/Space, Arrows, Esc, Home/End)
- [ ] Focus management (roving tabindex or `aria-activedescendant`)
- [ ] State exposed (`aria-expanded`, `aria-selected`, `aria-checked`, `aria-controls`)
- [ ] Tested with keyboard only and a screen reader (VoiceOver / NVDA)

## Quick tooling

- `eslint-plugin-jsx-a11y` in lint.
- axe DevTools / Lighthouse accessibility audit on new screens.
- Storybook `@storybook/addon-a11y` if the project has Storybook.
