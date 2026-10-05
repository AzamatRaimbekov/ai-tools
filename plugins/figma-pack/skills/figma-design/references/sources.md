# Sources

Checked 2026-10-06. Figma's own skills were read through the Figma MCP (`get_figma_skill`), not copied; re-read them before each run because they change.

## Figma official

1. Guide to auto layout - https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout (hug/fill/fixed, min/max, wrap, grid flow, ignore auto layout)
2. What's new from Config 2025 (grid auto layout) - https://help.figma.com/hc/en-us/articles/30965205437975-What-s-new-from-Config-2025
3. Figma MCP skills `figma-use`, `figma-generate-design`, `figma-generate-library` - `skill://figma/<name>/SKILL.md` via `get_figma_skill`; also https://skills.sh/figma/mcp-server-guide
4. Modes for variables - https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables
6. Variables types / code syntax (REST and Plugin API) - https://developers.figma.com/docs/rest-api/variables-types
11. Plugin API update 2026-06-10, Slots GA (`SlotNode`, `createSlot`, `SLOT` component property) - https://developers.figma.com/docs/plugins/updates/2026/06/10/update/
20. Add measurements and annotations in Dev Mode - https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotations-in-Dev-Mode
21. Guide to Dev Mode (sections, Ready for dev status) - https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode
26. MCP server rate limits and access - https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/

## Design-system practice

5. Red Hat Design System, Figma variables and styles - https://ux.redhat.com/get-started/designers/figma-variables-and-styles
7. Design System Mastery with Figma Variables: the 2025/2026 playbook - https://www.designsystemscollective.com/design-system-mastery-with-figma-variables-the-2025-2026-best-practice-playbook-da0500ca0e66
8. Guide to Figma component properties - https://uxdesign.cc/guide-to-figma-component-properties-d786cc382e18
9. Arc XP, Figma component design (property order) - https://design.arcxp.com/guides/figmacomponents
10. Figma launches Slots in open beta - https://www.createwith.com/tool/figma/updates/figma-launches-slots-in-open-beta-to-eliminate-detaching-components
12. How to organize Figma files - https://designproject.io/blog/how-to-organize-figma-files/
13. Figma forum, what makes a file easy for others to work with - https://forum.figma.com/share-your-feedback-26/what-makes-a-figma-file-easy-for-others-to-understand-and-work-with-58435
14. Responsive UI design with Figma variables and modes - https://uxdesign.cc/responsive-ui-design-with-figmas-variables-and-modes-2f97a36be6f7
15. Figma forum, variable modes for breakpoints and light/dark - https://forum.figma.com/ask-the-community-7/variable-mode-best-practice-for-responsive-design-breakpoints-dark-light-mode-32355
16. `figma-generate-design` reference `discover-product-font.md` (do not default to Inter) - `skill://figma/figma-generate-design/references/discover-product-font.md`

## Accessibility and platforms

17. WCAG 2.2 - https://www.w3.org/TR/WCAG22/ (1.4.3 contrast, 1.4.11 non-text contrast, 2.5.8 target size minimum 24x24)
18. Apple Human Interface Guidelines, Accessibility (44x44 pt) - https://developer.apple.com/design/human-interface-guidelines/accessibility
19. Material Design 3, Accessibility (48x48 dp touch targets) - https://m3.material.io/foundations/designing/structure

## Avoiding the generic AI look

22. Why AI design looks generic - https://www.superdesign.dev/blog/why-ai-design-looks-generic and https://superdesign.dev/blog/how-to-make-ai-ui-look-less-generic
23. AI design slop: overused UI patterns and fixes (2026-06-04) - https://noqta.tn/en/blog/ai-design-slop-overused-ui-patterns-fix-2026
24. Impeccable, anti-patterns - https://www.mintlify.com/pbakaus/impeccable/concepts/anti-patterns

## Skills ecosystem surveyed

25. `npx skills find figma` (skills.sh, 2026-10-06): top results are Figma's official `figma/mcp-server-guide` skills (`figma-generate-library`, `figma-create-new-file`, `figma-code-connect`, `figma-design-to-code`, `figma-use-figjam`, `figma-use-slides`, `figma-swiftui`, `figma-implement-motion`), mirrored by `openai/skills@figma-use`; community `figwright` (`figma-build`, `figma-codegen`). None encodes a team catalog; we use Figma's skills for API mechanics and our catalog for content. Anthropic's `claude-plugins-official` marketplace ships a Figma plugin that bundles the same MCP and skills (tool prefix `mcp__plugin_<plugin>_figma__`).
