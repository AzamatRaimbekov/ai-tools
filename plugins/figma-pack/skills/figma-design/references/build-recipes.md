# Build recipes (use_figma)

Snippets for the `figma-designer` agent. They follow `figma-use` rules: top-level `await`, `return` all IDs, colors 0-1, one page switch per call, fonts loaded before text edits. Keys come from `.figma/design-system.json`; IDs from earlier calls are pasted as string literals. By default every call passes `skillNames: "resource:figma-use,resource:figma-generate-design"`. Exception: recipe 7, when the proposal is built as a local component, also loads `resource:figma-generate-library`.

## 1. Inspect the target file (read-only, phase 1)

```js
return figma.root.children.map(p => ({ id: p.id, name: p.name, top: p.children.length }));
```

Then, on the target page only, the inventory script of `figma-generate-design` step 2a-iii if an existing screen should be matched.

## 2. Flow page, Section and breakpoint frames (first write of a screen)

```js
let page = figma.root.children.find(p => p.name === "Orders");
if (!page) { page = figma.createPage(); page.name = "Orders"; }
await figma.setCurrentPageAsync(page);

let maxX = 0;
for (const n of page.children) maxX = Math.max(maxX, n.x + n.width);

const section = figma.createSection();
section.name = "Orders / List";
section.x = maxX + 200; section.y = 0;

const widths = [1440, 768, 375];
const frames = [];
let x = 80;
for (const w of widths) {
  const f = figma.createAutoLayout("VERTICAL", { name: `[draft] Orders / List / Default / ${w}` });
  f.resize(w, 100);
  f.primaryAxisSizingMode = "AUTO";          // height hugs content
  f.counterAxisSizingMode = "FIXED";         // width fixed per breakpoint
  f.x = x; f.y = 80; x += w + 120;
  section.appendChild(f);
  frames.push(f.id);
}
section.resizeWithoutConstraints(x, 2000);
return { pageId: page.id, sectionId: section.id, createdNodeIds: [section.id, ...frames] };
```

Columns (match the code container; values from the Layout variables when present):

```js
frame.layoutGrids = [{ pattern: "COLUMNS", alignment: "STRETCH", count: 12, gutterSize: 24, offset: 120, visible: true }];
// tablet: count 8, gutter 16, offset 32; mobile: count 4, gutter 16, offset 16
```

## 3. Import catalog assets (start of every build call)

```js
const [frame, headerSet, buttonSet, bgVar, gapVar, padVar, h1Style] = await Promise.all([
  figma.getNodeByIdAsync("FRAME_ID"),
  figma.importComponentSetByKeyAsync("HEADER_BLOCK_KEY"),   // blocks[].key
  figma.importComponentSetByKeyAsync("BUTTON_SET_KEY"),     // components[].key
  figma.variables.importVariableByKeyAsync("COLOR_BG_DEFAULT_KEY"),
  figma.variables.importVariableByKeyAsync("SPACING_SECTION_KEY"),
  figma.variables.importVariableByKeyAsync("SPACING_PAGE_PADDING_KEY"),
  figma.importStyleByKeyAsync("HEADING_H1_KEY"),
]);
```

Import `radiusVar`, `borderVar` and any other variable used below the same way. Standalone components use `importComponentByKeyAsync`. A rejected import means the catalog is stale: stop the screen and report.

## 4. Pick a variant and fill properties

```js
const pick = (set, wanted) => set.children.find(c => c.type === "COMPONENT" &&
  Object.entries(wanted).every(([k, v]) => c.name.includes(`${k}=${v}`))) || set.defaultVariant;

const header = pick(headerSet, { Breakpoint: "Desktop" }).createInstance();
frame.appendChild(header);
header.layoutSizingHorizontal = "FILL";               // after appendChild

const btn = pick(buttonSet, { Variant: "primary", Size: "md" }).createInstance();
const propKey = name => Object.keys(btn.componentProperties).find(k => k.split("#")[0] === name);
btn.setProperties({ [propKey("Label")]: "Создать заказ" });
```

Nested instances with their own text properties: find them with `instance.findAllWithCriteria({ types: ["INSTANCE"] })` and call `setProperties` on them. Slots (when the component has a `SLOT` property): append content into the instance's `SlotNode`; never detach.

## 5. Bind variables and styles

```js
const section = figma.createAutoLayout("VERTICAL", { name: "Orders list" });
frame.appendChild(section);
section.layoutSizingHorizontal = "FILL";
section.setBoundVariable("itemSpacing", gapVar);
for (const side of ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"]) section.setBoundVariable(side, padVar);
section.fills = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 1, g: 1, b: 1 } }, "color", bgVar)];
section.setBoundVariable("topLeftRadius", radiusVar); // and the other three corners

await figma.loadFontAsync(h1Style.fontName);
const title = figma.createText();
section.appendChild(title);
await title.setTextStyleIdAsync(h1Style.id);
title.characters = "Заказы";
title.layoutSizingHorizontal = "FILL";
title.textAutoResize = "HEIGHT";
```

Effect styles: `await node.setEffectStyleIdAsync(style.id)`.

## 6. Variable modes on a frame (dark theme, mobile density)

```js
const anyColorVar = await figma.variables.importVariableByKeyAsync("COLOR_BG_DEFAULT_KEY");
const coll = await figma.variables.getVariableCollectionByIdAsync(anyColorVar.variableCollectionId);
const dark = coll && coll.modes.find(m => m.name === "Dark");
if (coll && dark) frame.setExplicitVariableModeForCollection(coll, dark.modeId);
return { mode: dark ? dark.name : "not found", frameId: frame.id };
```

Do the same with the Layout/Spacing collection and its `Mobile` mode on 375 frames. If the collection or mode is not found, report it as a gap; do not recolor layers.

## 7. Missing piece placeholder and proposal

```js
const missing = figma.createAutoLayout("VERTICAL", { name: "Missing: Stepper" });
parent.appendChild(missing);
missing.layoutSizingHorizontal = "FILL";
missing.resize(missing.width, 64);
missing.strokes = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8 } }, "color", borderVar)];
missing.dashPattern = [6, 4];
```

On page `Proposals` (separate call, one page switch), build `[proposal] Stepper` from catalog primitives and variables; if the confirmed plan includes making it a local component, pass `skillNames: "resource:figma-use,resource:figma-generate-design,resource:figma-generate-library"` and follow `figma-generate-library` (variants, properties, bindings) and set `component.description` to: why, where used, variants/states needed, code counterpart.

## 8. Handoff annotations (optional, Full seat)

```js
const cats = await figma.annotations.getAnnotationCategoriesAsync();
const a11y = cats.find(c => c.label === "Accessibility");
iconButton.annotations = [{ labelMarkdown: "aria-label: «Удалить заказ»", categoryId: a11y ? a11y.id : undefined }];
```

Use for behavior the picture cannot show: validation rules, what a click does, loading/empty logic, labels for icon-only buttons.

## 9. Audit before the report (read-only, last call)

```js
const root = await figma.getNodeByIdAsync("SECTION_ID");
const inInstance = n => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const all = root.findAll(n => !inInstance(n));   // content of instances belongs to the library
const rawFills = all.filter(n => "fills" in n && Array.isArray(n.fills) && n.type !== "INSTANCE" &&
  n.fills.some(f => f.type === "SOLID" && !(f.boundVariables && f.boundVariables.color)));
const rawSpacing = all.filter(n => n.type === "FRAME" && n.layoutMode !== "NONE" &&
  (n.itemSpacing > 0 && !(n.boundVariables && n.boundVariables.itemSpacing)));
const unstyledText = all.filter(n => n.type === "TEXT" && !n.textStyleId);
const generic = all.filter(n => /^(Frame|Group|Rectangle) \d+$/.test(n.name));
return {
  instances: all.filter(n => n.type === "INSTANCE").length,
  rawFills: rawFills.map(n => ({ id: n.id, name: n.name })),
  rawSpacing: rawSpacing.map(n => ({ id: n.id, name: n.name, gap: n.itemSpacing })),
  unstyledText: unstyledText.map(n => ({ id: n.id, chars: n.characters.slice(0, 30) })),
  genericNames: generic.map(n => n.id),
};
```

Fix what can be bound; list the rest as raw values in the report. Remove `placeholder = true` shimmers if any were set.
