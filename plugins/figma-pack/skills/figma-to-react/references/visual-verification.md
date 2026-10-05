# Visual verification against Figma

Goal: prove the page matches the design **in structure and tokens** at the two reference widths, and explain every difference. Pixel-perfect diffing against a Figma export is not the gate: fonts render differently in browsers, our tokens are intentionally snapped, real data differs from sample data, and Playwright's own docs treat strict pixel comparison as too brittle even between two runs of the same app.

## 1. Inputs

- Figma screenshots saved by `figma-reader` in `.figma/<fileKey>/<nodeId>.png` (one per form-factor frame). Do not request them again; that costs rate-limited calls.
- The page running locally (`npm run dev`) with MSW fixtures that resemble the Figma sample data (same number of rows, similar text lengths).

## 2. Capture ours

Preferred: the browser tool of the session (Playwright MCP, Claude in Chrome, Chrome DevTools MCP) - resize to the width, full-page screenshot, read it.

Without a browser MCP, use the Playwright CLI once through `npx` (no dependency added to the project):

```bash
npx -y playwright@latest install chromium   # first time only
npx -y playwright@latest screenshot --viewport-size=1280,800 --full-page --wait-for-timeout=1000 http://localhost:5173/orders .figma/check/orders-1280.png
npx -y playwright@latest screenshot --viewport-size=375,812  --full-page --wait-for-timeout=1000 http://localhost:5173/orders .figma/check/orders-375.png
```

Save under `.figma/check/` (gitignored with the other screenshots). Use the light theme unless the Figma frame is dark.

If the project already uses `@playwright/test`, `toHaveScreenshot()` baselines are for **regression after** the page is accepted, not for comparing with Figma.

## 3. Compare

Read the Figma image and ours for each width. Walk in this order and stop at the first level that differs, because lower levels follow from it:

1. **Sections**: same sections, same order, nothing missing or extra.
2. **Layout**: columns, alignment, what is side by side vs stacked, content width, sticky elements.
3. **Spacing rhythm**: gaps between sections and inside cards look like the same steps (exact px differences of one step are expected snaps).
4. **Components**: same primitive and variant (primary vs outline, badge tone, input style).
5. **Typography**: heading levels, size steps, weights; line wraps can differ.
6. **Color**: surfaces and text roles; status colors.
7. **Icons and assets**: every asset present, correct one, correct proportions, not stretched or cropped.
8. **Copy**: texts match the i18n values from the spec.

## 4. Report

```
Visual check: /orders, 1280 and 375, Figma nodes 12:34, 12:90
| Element | Figma | Ours | Verdict |
|---|---|---|---|
| Page title | 28px semibold | text-3xl (30) | intentional: token snap (spec 9) |
| Filters (375) | inline row | Sheet behind button | intentional: responsive rule |
| Status badge | amber | secondary | intentional: user chose b) in mismatch |
| Card gap (375) | 12 | 16 | fix -> gap-3 |
| Logo | 120x32 | 120x24 | fix: keep SVG viewBox ratio |
Fixed: 2. Intentional: 3. Not checked: dark mode (no Figma frame).
```

Fix every "fix" row and re-capture. Never change tokens or primitives to chase a Figma pixel value; that goes through the mismatch policy.

## 5. Optional numeric diff

When the user explicitly wants a pixel overlay (marketing pages, pixel-sensitive landing blocks), compare same-size crops of one section, not the full page, and treat it as a hint: a diff under ~1-2% of pixels in a section is rendering noise; a larger diff points to a layout or asset problem worth reading by eye. Do not add image-diff libraries to the project for this; ask first.
