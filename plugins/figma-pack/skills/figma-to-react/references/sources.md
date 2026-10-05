# Sources

Researched October 2026. Figma's own skills were read through the Figma MCP (`get_figma_skill`).

## Figma (official)

- Figma skill `figma-design-to-code` (`skill://figma/figma-design-to-code/SKILL.md`) - returned code is a "high visual fidelity non-interactive prototype"; translate absolute positioning into project-native layout; reuse project components and tokens; apply Code Connect at mapped nodes; screenshot is the visual target, never an asset; download all assets, no temporary Figma URLs; sparse responses -> request child nodes. Basis for translation rules 1, 2, 6 and the asset check in visual verification.
- Figma skill `figma-code-connect` (`skill://figma/figma-code-connect/SKILL.md`) - parserless `.figma.ts` templates, exhaustive variant mapping, components must be published, Organization/Enterprise plan required. Basis for "Code Connect is authoritative" and the variant mapping rule.
- Figma MCP server - tools and prompts: https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/ - `get_design_context` defaults to React + Tailwind, framework adjustable; `get_variable_defs` returns variables and styles; `clientFrameworks` selects which Code Connect mappings the remote server returns.
- Structure your Figma file for better code: https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/ - components for anything repeated, Code Connect as "the #1 way to get consistent component reuse", variables for spacing/color/radius/type, semantic layer names, auto layout instead of absolute positioning, annotations for behavior.
- Avoid large frames: https://developers.figma.com/docs/figma-mcp-server/avoid-large-frames/ ; write effective prompts: https://developers.figma.com/docs/figma-mcp-server/write-effective-prompts/
- Variables code syntax (Web / iOS / Android names shown in Dev Mode): https://help.figma.com/hc/en-us/articles/27882809912471 - basis for "WEB code syntax = `var(--token)`" in token-mapping.
- Config 2025 grid auto layout: https://forum.figma.com/product-updates-3/let-s-talk-about-the-new-features-we-announced-at-config-2025-40301 and https://uxdesign.cc/figmas-new-grid-you-must-understand-css-grid-as-a-designer-fbb00416e1cc - grid auto layout aligns to CSS Grid in Dev Mode, not a perfect match -> map to `grid grid-cols-*` and verify.

## Tailwind CSS v4

- Theme variables: https://tailwindcss.com/docs/theme - `@theme` namespaces (`--color-*`, `--spacing`, `--radius-*`, `--text-*`, `--breakpoint-*`), `@theme inline` when a theme variable references another variable (the shadcn pattern `--color-primary: var(--primary)`), default breakpoints 640/768/1024/1280/1536. Basis for the web platform section of token-mapping and the breakpoint table.
- Responsive design (mobile-first, container queries): https://tailwindcss.com/docs/responsive-design

## Visual verification

- Playwright snapshot assertions: https://playwright.dev/docs/api/class-snapshotassertions - `maxDiffPixels`, `maxDiffPixelRatio`, `threshold`; strict pixel comparison is brittle across OS/GPU, thresholds are needed. Basis for "token-perfect, not pixel-perfect" and for keeping `toHaveScreenshot` for regression only.
- Playwright CLI `screenshot` command: https://playwright.dev/docs/test-cli (and `npx playwright screenshot --help`) - one-off captures without a project dependency.
- Playwright visual testing overview (2026): https://oneuptime.com/blog/post/2026-01-27-playwright-visual-testing/markdown

## Failure modes of AI Figma-to-code

- Figma-generated code review red flags: https://www.alphonsolabs.com/figma-generated-code-review-red-flags/amp/ - absolute positioning, hardcoded hex/px instead of tokens, div soup, detached shapes duplicating existing components, repeated inline styles.
- Figma to HTML without plugins: https://uxmagic.ai/blog/figma-to-html-no-plugins - exporters produce absolutely positioned "div soup" built to replicate a static frame.
- Figma MCP + Codex CLI, design-to-code that fits the codebase (2026): https://codex.danielvaughan.com/2026/04/18/codex-cli-figma-mcp-design-to-code/ - output quality depends on layer hygiene, components and variables; MCP sends the real tree (auto layout, variables, Code Connect) rather than pixels.
- Figma MCP complete guide (2025): https://www.seamgen.com/blog/figma-mcp-complete-guide-to-design-to-code-automation

## Internal

- `frontend-pack`: `react-page-ux` (brief, browser verification at 1280/375), `react-ui` (tokens, mobile-first, semantics, icons), `react-architecture` (150-line limit), `rules/libraries.json` (lucide-react, react-i18next, vaul, @tanstack/react-table allowed).
- Previous version of this stage: the `react-figma` skill (removed); its mode A flow, translation rules and mismatch policy were reused here.
