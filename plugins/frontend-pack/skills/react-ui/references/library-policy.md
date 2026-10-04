# UI library policy

Machine-readable source of truth: `rules/libraries.json` (this page explains the UI part; if they disagree, the JSON wins).

Standard: shadcn/ui (on Base UI or Radix) + Tailwind CSS v4 + cva + `cn`. Anything that brings a second styling system or a second component kit is forbidden in app code.

## Allowed

| Library | Use |
|---|---|
| shadcn/ui (CLI) | All primitives, in `src/shared/ui` |
| `@base-ui/react` or `radix-ui` | Headless base behind shadcn; one per project. Direct use only for primitives shadcn lacks |
| `tailwindcss` v4, `tw-animate-css` | Styling and enter/exit animations |
| `class-variance-authority` | Variants |
| `cn` (or `clsx` + `tailwind-merge` in older projects) | Class merging, only via `@/shared/lib/utils` |
| `lucide-react` | The only icon set |
| `sonner` | Toasts (shadcn standard) |
| `next-themes` | Theme switching in Next.js |
| `recharts` via shadcn `chart` | Charts, themed with `--chart-*` tokens |
| `@tanstack/react-table` via shadcn data-table | Tables |
| `vaul` (shadcn drawer), `cmdk` (command), `embla-carousel-react` (carousel), `react-day-picker` (calendar), `input-otp` | Pulled in by their shadcn components - fine |
| Storybook (optional) | Documenting `shared/ui` and `shared/components` |

## Conditional

| Library | Condition |
|---|---|
| `motion` (`motion/react`) | Only for gestures, layout/shared-element transitions or orchestrated sequences; must respect `useReducedMotion()`. Not for simple hover/fade |

## Forbidden

| Library | Reason |
|---|---|
| MUI / Material UI | Own theme system and styling engine (emotion); duplicates shadcn and fights Tailwind |
| Chakra UI | Second component kit and theming system; style props conflict with Tailwind tokens |
| Ant Design | Heavy, own design language and CSS-in-JS theming; cannot be themed by our tokens |
| Mantine | Second complete component kit with its own styles |
| Bootstrap / react-bootstrap | Global CSS clashes with Tailwind preflight and utilities |
| styled-components | In maintenance mode since March 2025, maintainer advises against new adoption; runtime CSS-in-JS, poor RSC fit |
| Emotion | Runtime CSS-in-JS, needs client components in RSC, duplicates Tailwind |
| CSS Modules / Sass for component styling | Second styling path; tokens and utilities already cover it (globals.css only) |
| DaisyUI / Flowbite / other Tailwind kits | Parallel component classes and theme tokens next to shadcn |
| Other icon sets (react-icons, FontAwesome, Heroicons, MUI icons) | Mixed stroke styles and bundle weight; one set only. Missing glyph -> custom SVG in `shared/ui/icons` |
| framer-motion (old package name) | Superseded by `motion`; use `motion/react` |
| GSAP / react-spring / anime.js | Overlap with `motion` and CSS; need explicit lead approval for special cases (marketing pages) |
| tailwindcss-animate | Replaced by `tw-animate-css` in shadcn for Tailwind v4 |

## Adding anything else

Allowed only if: shadcn has no equivalent, it is headless or styleable via `className`, it is maintained, and it does not ship global CSS. Record the decision in the project ADRs.
