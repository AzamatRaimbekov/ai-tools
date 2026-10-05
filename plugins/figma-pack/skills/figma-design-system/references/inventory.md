# Inventory procedure

Each call below is rate-limited unless marked free. Keep the count; report it at the end. Load `figma-use` before any `use_figma` (read-only calls still need it for the API rules) and pass `skillNames: "resource:figma-use"`.

## Path A - library file link (Full seat)

| # | Call | Purpose |
|---|---|---|
| 0 | `whoami` (free) | seat on the plan that owns the file |
| 1 | `get_metadata` `{fileKey}` (no nodeId) | pages and top-level frames: find "Cover", "Foundations", "Components", "Blocks", "Icons", "Proposals" |
| 2 | `get_libraries` `{fileKey}` | libraries this file consumes (icon libraries, base kits) and whether the file is itself the primary library (it has local published components and no primary library added) |
| 3 | `use_figma` read-only, script A1 | full inventory: components, blocks, variables, styles with keys |
| 4 | `list_file_components_for_code_connect` `{fileKey}` (Org/Enterprise) or `get_code_connect_map` `{fileKey, nodeId: <components page>}` | Code Connect status |
| 5 | optional `get_screenshot` `{fileKey, nodeId: <Blocks page frame>, maxDimension: 2048}` | visual reference of blocks for the designer agent, saved to `.figma/<fileKey>/blocks.png` |

If A1's response is too large (libraries with > 300 sets): split into A1-components and A1-foundations (2 calls) instead of retrying.

## Path B - product file link

| # | Call | Purpose |
|---|---|---|
| 1 | `get_libraries` `{fileKey}` | find the primary library (`libraries_added_to_file`); page with `offset` if `libraries_available_to_add_next_offset` is set and the user named a library you have not seen |
| 2 | `search_design_system` `{fileKey, includeLibraryKeys: [<primary>], queries: Q}` | one batched call with query set Q below |
| 3 | `use_figma` read-only, script B1 on the linked page | instances actually used (remote component keys), bound variables, text/effect styles |
| 4 | `get_variable_defs` `{fileKey, nodeId: <representative frame>}` | variable names and resolved values |

Then ask: "Пришлите ссылку на сам файл библиотеки - каталог будет полным (ещё ~3 вызова)". Mark the catalog `"completeness": "partial"`.

## Path C - no `use_figma` (Dev seat, view access)

`get_metadata` -> `get_libraries` -> `search_design_system` (Q) -> `get_variable_defs` on a token specimen frame (a frame on the Foundations page that uses all colors; ask for its link if unclear) -> `list_file_components_for_code_connect`. Variables and styles may lack keys; components come with keys from search results. Mark `"completeness": "partial"`.

## Query set Q (one call, one intent per entry)

```json
[
  {"entity":"component","query":"button"}, {"entity":"component","query":"input"},
  {"entity":"component","query":"select"}, {"entity":"component","query":"checkbox"},
  {"entity":"component","query":"card"}, {"entity":"component","query":"dialog"},
  {"entity":"component","query":"table"}, {"entity":"component","query":"tabs"},
  {"entity":"component","query":"header"}, {"entity":"component","query":"hero"},
  {"entity":"component","query":"pricing"}, {"entity":"component","query":"footer"},
  {"entity":"component","query":"empty state"}, {"entity":"component","query":"skeleton"},
  {"entity":"component","query":"icon"},
  {"entity":"variable","query":"color"}, {"entity":"variable","query":"background"},
  {"entity":"variable","query":"spacing"}, {"entity":"variable","query":"radius"},
  {"entity":"style","query":"heading"}, {"entity":"style","query":"body"},
  {"entity":"style","query":"shadow"}
]
```

Extend with the roles the user named ("table toolbar", "form layout", "sidebar"). Do not re-run with synonyms after an empty result; record the gap instead.

## Script A1 - full library inventory (read-only)

```js
await figma.loadAllPagesAsync();
const pageOf = n => { let p = n; while (p && p.type !== 'PAGE') p = p.parent; return p ? p.name : null; };
const hex = c => '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
  + (c.a !== undefined && c.a < 1 ? Math.round(c.a * 255).toString(16).padStart(2, '0').toUpperCase() : '');
const BLOCK_PAGE = /block|section|pattern|template|блок|секци|шаблон/i;
const BLOCK_NAME = /^(block|section|блок)\s*\//i;

// Components and component sets (owners of property definitions only)
const owners = figma.root.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })
  .filter(n => !(n.type === 'COMPONENT' && n.parent && n.parent.type === 'COMPONENT_SET'));
let unboundPaints = 0;
const components = [], blocks = [];
for (const n of owners) {
  const props = {};
  for (const [k, d] of Object.entries(n.componentPropertyDefinitions)) {
    props[k] = d.type === 'VARIANT' ? d.variantOptions : d.type;
  }
  const page = pageOf(n);
  for (const c of n.findAll(x => 'fills' in x && Array.isArray(x.fills))) {
    for (const f of c.fills) if (f.type === 'SOLID' && !(f.boundVariables && f.boundVariables.color) && !c.fillStyleId) unboundPaints++;
  }
  const item = {
    name: n.name, type: n.type, key: n.key, nodeId: n.id, page,
    private: /^[._]/.test(n.name),
    description: (n.description || '').slice(0, 160),
    variantCount: n.type === 'COMPONENT_SET' ? n.children.length : 1,
    defaultVariant: n.type === 'COMPONENT_SET' && n.defaultVariant ? n.defaultVariant.name : null,
    properties: props,
  };
  (BLOCK_PAGE.test(page || '') || BLOCK_NAME.test(n.name) ? blocks : components).push(item);
}
// Frames on block pages that are not components (gap: copy, not instance)
const frameBlocks = figma.root.children.filter(p => BLOCK_PAGE.test(p.name))
  .flatMap(p => p.children.filter(c => c.type === 'FRAME').map(c => ({ name: c.name, nodeId: c.id, page: p.name })));

// Variables
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const nameById = Object.fromEntries(vars.map(v => [v.id, v.name]));
const collections = cols.map(c => ({
  name: c.name, key: c.key, modes: c.modes.map(m => m.name),
  variables: vars.filter(v => v.variableCollectionId === c.id).map(v => ({
    name: v.name, key: v.key, type: v.resolvedType, scopes: v.scopes,
    codeSyntax: v.codeSyntax, hidden: v.hiddenFromPublishing,
    values: Object.fromEntries(c.modes.map(m => {
      const val = v.valuesByMode[m.modeId];
      const out = val && typeof val === 'object'
        ? (val.type === 'VARIABLE_ALIAS' ? '-> ' + (nameById[val.id] || val.id) : ('r' in val ? hex(val) : val))
        : val;
      return [m.name, out];
    })),
  })),
}));

// Styles
const textStyles = (await figma.getLocalTextStylesAsync()).map(s => ({
  name: s.name, key: s.key, family: s.fontName.family, style: s.fontName.style, size: s.fontSize,
  lineHeight: s.lineHeight.unit === 'AUTO' ? 'auto' : s.lineHeight.value + (s.lineHeight.unit === 'PERCENT' ? '%' : ''),
  letterSpacing: s.letterSpacing.value + (s.letterSpacing.unit === 'PERCENT' ? '%' : ''),
}));
const effectStyles = (await figma.getLocalEffectStylesAsync()).map(s => ({ name: s.name, key: s.key, effects: s.effects.map(e => e.type) }));
const paintStyles = (await figma.getLocalPaintStylesAsync()).map(s => ({ name: s.name, key: s.key }));

return {
  pages: figma.root.children.map(p => ({ id: p.id, name: p.name })),
  components, blocks, frameBlocks, unboundPaints,
  collections, textStyles, effectStyles, paintStyles,
};
```

Icons: components whose page or name matches `/icon|иконк/i` are moved from `components` to `icons` when writing the catalog; note whether they are one component per icon (good, use INSTANCE_SWAP) or one variant set (gap if > 30 variants).

## Script B1 - inventory of a product page (read-only)

Use the inventory script from `figma-generate-design` step 2a-iii, scoped to the linked node: replace the `frame` lookup with `const frame = await figma.getNodeByIdAsync("<nodeId>")`. It returns used component keys (remote), bound variables with keys, and text/effect styles with keys - exactly what path B needs.

## Detecting states and breakpoints

- States: variant property named `State`/`Status`/`Состояние` -> options; boolean properties like `Disabled`, `Loading`. Missing roles -> gaps (see SKILL section 4).
- Breakpoints: variant property `Breakpoint`/`Device`/`Size` with `Desktop/Tablet/Mobile` (or widths), or name suffixes `/ Desktop`, `/ Mobile`, or a variable collection with modes named after devices.
- Contrast check (no extra calls): for each semantic text/background pair in the JSON, compute WCAG contrast per mode from the resolved hex values.
