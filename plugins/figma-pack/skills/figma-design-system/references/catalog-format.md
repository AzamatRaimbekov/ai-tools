# Catalog format

Two files per project, both written by `figma-design-system`, read by every Figma skill and agent:

- `<project>/.figma/design-system.md` - for people and for prompts
- `<project>/.figma/design-system.json` - for scripts (`importComponentSetByKeyAsync`, `importVariableByKeyAsync`, `importStyleByKeyAsync`)

Never drop a section; write "none". Names are copied exactly as in Figma (including `/` paths and casing).

## design-system.md

````markdown
# Design system catalog: <library name>

Source: <figma URL> | library fileKey `<key>` | libraryKey `<lk-...>`
Updated: <YYYY-MM-DD> | completeness: full | partial (<why>) | read with seat <Full/Dev>
Product font: <family> (body text style `<name>`) | Icons: <library>, <n>, <strategy>

## 1. Libraries
| Library | libraryKey | fileKey | Role | Added to product files |
|---|---|---|---|---|
| Mdigital DS | lk-... | AbC123 | primary | yes |
| Lucide icons | lk-... | - | icons | yes |

## 2. Components
| Component | Type | Key | Variant properties | Other properties | States covered | Code Connect |
|---|---|---|---|---|---|---|
| Button | set | 9f1c... | Variant=primary/secondary/ghost/destructive; Size=sm/md/lg | Label (text), Icon left (swap), Loading (bool) | default, hover, focus, disabled | `src/shared/ui/button.tsx` |
| Input | set | 77ab... | State=default/focus/error/disabled; Size=md | Label, Hint (text) | + error | - |

## 3. Blocks
| Block | Category | Key | Breakpoints | Contains | Notes |
|---|---|---|---|---|---|
| Header / Marketing | header | 1a2b... | Desktop, Mobile | Logo, Nav, Button | slot `Actions` |
| Pricing / 3 plans | pricing | ... | Desktop | Card, Badge, Button | no Mobile -> gap |
| Table toolbar | table-toolbar | ... | Desktop, Tablet | Input (search), Select, Button | |
| Form / Two columns | form-layout | ... | Desktop | Input, Select, Checkbox, Button | |
| Hero (frame only) | hero | - (frame 12:40) | Desktop | - | not a component -> gap |

## 4. Variables
### Collection "Color" - modes: Light, Dark
| Variable | Key | Light | Dark | Scopes | WEB code syntax | Code token |
|---|---|---|---|---|---|---|
| color/bg/default | 3c4d... | -> gray/0 (#FFFFFF) | -> gray/950 (#0A0A0A) | FRAME_FILL, SHAPE_FILL | var(--background) | background |

### Collection "Spacing" - modes: Value (or Desktop, Tablet, Mobile)
| Variable | Key | Value(s) | Scopes | Code syntax |
|---|---|---|---|---|
| spacing/4 | ... | 16 | GAP, WIDTH_HEIGHT | var(--spacing-4) |

(one table per collection: Primitives, Color, Spacing, Radius, Typography, Layout/Breakpoints)

## 5. Text styles
| Style | Key | Family / weight | Size / line height | Letter spacing | Use |
|---|---|---|---|---|---|
| Heading/H1 | ... | Manrope SemiBold | 40 / 48 | -1% | page title |

## 6. Effect styles
| Style | Key | Effects | Use |
|---|---|---|---|
| Shadow/Card | ... | DROP_SHADOW x2 | cards, popovers |

## 7. Icons
Strategy: one component per icon, swapped via INSTANCE_SWAP property `Icon` | variant set (gap if > 30)
Sizes: 16, 20, 24. Count: <n>. Full list with keys in the JSON (`icons.items`).

## 8. Code Connect
| Component | Key | Mapped | Source | Label |
|---|---|---|---|---|
| Button | 9f1c... | yes | src/shared/ui/button.tsx | React |
| Input | 77ab... | no | - | - |
Coverage: <n>/<n>

## 9. Gaps
| # | Severity | Area | Item | Detail | Proposal | Owner |
|---|---|---|---|---|---|---|
| 1 | blocker | modes | Color | no Dark mode | add Dark mode to "Color", alias primitives | designer |
| 2 | major | responsive | Pricing / 3 plans | no Mobile variant | add `Breakpoint=Mobile` (375, stacked cards) | designer |
| 3 | major | states | Input | no Loading/disabled | add State=disabled | designer |
| 4 | minor | tokens | 42 variables | ALL_SCOPES | set scopes per role | designer |
| 5 | minor | handoff | 18 components | not in Code Connect | map after sync | frontend |

## 10. Changelog
- <YYYY-MM-DD> created (path A, 5 calls)
````

## design-system.json

```json
{
  "version": 1,
  "updated": "2026-10-06",
  "completeness": "full",
  "source": { "url": "https://www.figma.com/design/AbC123/Mdigital-DS", "fileKey": "AbC123", "libraryKey": "lk-...", "libraryName": "Mdigital DS" },
  "libraries": [{ "name": "Mdigital DS", "libraryKey": "lk-...", "fileKey": "AbC123", "role": "primary", "added": true }],
  "font": { "family": "Manrope", "source": "text style Body/M" },
  "variables": {
    "collections": [{
      "name": "Color", "key": "...", "modes": ["Light", "Dark"],
      "variables": [{
        "name": "color/bg/default", "key": "...", "type": "COLOR",
        "scopes": ["FRAME_FILL", "SHAPE_FILL"],
        "codeSyntax": { "WEB": "var(--background)" },
        "values": { "Light": "-> gray/0", "Dark": "-> gray/950" },
        "resolved": { "Light": "#FFFFFF", "Dark": "#0A0A0A" },
        "token": "background",
        "code": { "web": { "cssVar": "--background", "class": "bg-background" }, "rn": "theme.colors.background", "flutter": "context.colors.surface" }
      }]
    }]
  },
  "textStyles": [{ "name": "Heading/H1", "key": "...", "family": "Manrope", "style": "SemiBold", "size": 40, "lineHeight": "48", "letterSpacing": "-1%" }],
  "effectStyles": [{ "name": "Shadow/Card", "key": "...", "effects": ["DROP_SHADOW", "DROP_SHADOW"] }],
  "components": [{
    "name": "Button", "type": "COMPONENT_SET", "key": "...", "nodeId": "1:20", "page": "Components",
    "variantProps": { "Variant": ["primary", "secondary", "ghost"], "Size": ["sm", "md", "lg"] },
    "properties": { "Label#2:0": "TEXT", "Icon left#4:1": "INSTANCE_SWAP", "Loading#4:2": "BOOLEAN" },
    "defaultVariant": "Variant=primary, Size=md",
    "states": ["default", "hover", "focus", "disabled"],
    "codeConnect": { "source": "src/shared/ui/button.tsx", "name": "Button", "label": "React" },
    "code": { "web": "src/shared/ui/button.tsx", "rn": null, "flutter": null }
  }],
  "blocks": [{
    "name": "Pricing / 3 plans", "category": "pricing", "type": "COMPONENT_SET", "key": "...", "nodeId": "40:2",
    "breakpoints": ["Desktop"], "contains": ["Card", "Badge", "Button"], "slots": []
  }],
  "icons": { "strategy": "component-per-icon", "library": "Lucide icons", "count": 240, "sizes": [16, 20, 24],
             "items": [{ "name": "icon/plus", "key": "..." }] },
  "codeConnect": { "mapped": 12, "total": 30 },
  "gaps": [{ "severity": "blocker", "area": "modes", "item": "Color", "detail": "no Dark mode", "proposal": "add Dark mode", "owner": "designer" }],
  "changelog": [{ "date": "2026-10-06", "change": "created (path A, 5 calls)" }]
}
```

Field rules:

- `key` is the publish key used for imports (set key for component sets). `nodeId` is only valid inside the library file.
- `token` is the platform-neutral semantic name agreed in the sync (`design-system-sync.md`), bare and kebab-case (`primary`, `primary-foreground`, `muted-foreground`); `null` until then. The spec and other skills refer to it in neutral dot form `color.<token>`; scale steps (`space.4`, `radius.lg`, `text.sm`, `font.weight.medium`, `shadow.sm`, `breakpoint.md`) are defined in `figma-core/references/token-mapping.md`. Figma variable names (`color/bg/default`) stay in `name` and are never used as the neutral id.
- `code` (optional, filled by the sync) holds per-platform names: variables `web.cssVar` + `web.class`, `rn`, `flutter` (the widget-side accessor `figma-to-flutter` uses: `context.colors.<role>`, `context.appColors.<role>`, `AppSpacing.s16`, `AppRadius.md`); components the code path per platform. `null` for platforms the project does not have.
- `values` keep aliases (`-> name`); `resolved` holds final hex/numbers for contrast checks.
- `states` lists normalized roles found among variants/booleans: `default`, `hover`, `focus`, `pressed`, `disabled`, `error`, `loading`, `selected`.
- `blocks[].breakpoints` uses `Desktop`, `Tablet`, `Mobile` (normalized from widths: >= 1024 Desktop, 600-1023 Tablet, < 600 Mobile).
- Unknown values: `null`, never invented.
