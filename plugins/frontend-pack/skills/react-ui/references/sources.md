# Sources (checked October 2026)

## shadcn/ui
- Theming (CSS variables, background/foreground pairs, adding tokens): https://ui.shadcn.com/docs/theming
- Tailwind v4 + React 19 (no forwardRef, data-slot, tw-animate-css, size-*, sonner): https://ui.shadcn.com/docs/tailwind-v4
- components.json (aliases, fields fixed after init): https://ui.shadcn.com/docs/components-json
- Dark mode, Vite ThemeProvider / Next.js next-themes: https://ui.shadcn.com/docs/dark-mode/vite , https://ui.shadcn.com/docs/dark-mode/next
- Changelog (radix-ui unified package Jun 2025, CLI 3.0 + MCP Aug 2025, `shadcn create` Dec 2025): https://ui.shadcn.com/docs/changelog
- Base UI default, Radix still supported, `render` vs `asChild` (Jul 2026): https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- `cn` package replaces `twMerge(clsx())` (Sep 2026): https://ui.shadcn.com/docs/changelog/2026-09-cn
- Button source (cva + Slot + data-slot reference implementation): https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/button.tsx

## Tailwind CSS v4
- Theme variables, `@theme`, `@theme inline`, namespaces, `--spacing`: https://tailwindcss.com/docs/theme
- Dark mode with `@custom-variant`: https://tailwindcss.com/docs/dark-mode
- Responsive design, mobile-first, container queries: https://tailwindcss.com/docs/responsive-design

## Variants and class merging
- class-variance-authority: https://cva.style/docs/getting-started/variants
- tailwind-merge: https://github.com/dcastil/tailwind-merge

## Headless primitives and composition
- Radix composition / asChild: https://www.radix-ui.com/primitives/docs/guides/composition
- Base UI composition / render prop: https://base-ui.com/react/handbook/composition

## React 19
- ref as a prop, ref cleanup: https://react.dev/blog/2024/12/05/react-19

## Accessibility
- WAI-ARIA APG, "No ARIA is better than bad ARIA": https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/
- WCAG 2.2 (contrast 1.4.3/1.4.11, focus 2.4.7/2.4.11, target size 2.5.8): https://www.w3.org/TR/WCAG22/

## Libraries
- lucide-react: https://lucide.dev/guide/packages/lucide-react
- motion for React: https://motion.dev/docs/react
- styled-components maintenance mode (Mar 2025): https://opencollective.com/styled-components/updates/a-whole-new-world
