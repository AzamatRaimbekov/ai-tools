# Design-system sync: code tokens <-> Figma

Goal: Figma variables and components line up with our code tokens and shared components, so every later design-to-code read returns names we already use and every design drawn in Figma maps 1:1 to code. Run once per project, again when tokens drift. Code wins by default; a change the designer wants goes into the code token, not into components.

Inputs: the project catalog `.figma/design-system.json` (written by `figma-design-system`; no catalog -> run it first), the project root.

## 1. Audit (no extra Figma calls)

The catalog already holds the inventory: libraries, variables with modes, scopes and code syntax, components with variants, Code Connect status. Read it instead of re-calling Figma. `figma-reader` in "sync audit" mode does exactly this. Only if the catalog is `partial` and lacks variable values, one `get_variable_defs` on a token specimen frame is allowed.

## 2. Diff against code

Read the platform's token source:

| Platform | Tokens | Components |
|---|---|---|
| React web | `src/app/globals.css` or `src/index.css` (`:root`, `.dark`, `@theme inline`), `components.json` | `src/shared/ui/*.tsx`, `src/shared/components/*.tsx` |
| React Native | `src/shared/theme/tokens.ts` / theme files (see `figma-to-react-native`) | `src/shared/ui/*` |
| Flutter | `ThemeData`, `ColorScheme`, `ThemeExtension` files (see `figma-to-flutter`) | `lib/shared/ui/*` (primitives), `lib/shared/widgets/*` (composites) |

Token table:

| Our token | Code (light / dark) | Figma variable | Figma value (light / dark) | Status | Decision |
|---|---|---|---|---|---|
| `--primary` | oklch(0.205 0 0) / oklch(0.985 0 0) | `color/primary` | #171717 / #FAFAFA | match | - |
| `--muted-foreground` | oklch(0.556 0 0) | `text/secondary` | #6B7280 | value drift | ask |
| - | - | `brand/accent` | #7C3AED | Figma-only | add token or drop |
| `--chart-3` | ... | - | - | code-only | add to Figma or ignore |

Status values: `match`, `value drift`, `name only` (same value, different name), `Figma-only`, `code-only`, `mode missing` (no dark value in Figma).

Component table:

| Figma component (set) | Key | Variants (Figma) | Our file | Our variants | Status |
|---|---|---|---|---|---|
| Button | 9f1c... | Variant=Primary/Secondary/Ghost, Size=sm/md/lg | src/shared/ui/button.tsx | variant: default/secondary/ghost/outline/destructive/link; size: sm/default/lg/icon | map, rename Primary->default |
| Status chip | 3a2b... | Tone=... | - | - | missing in code: `Badge` variant `tone` or new composite |

## 3. Decisions (user)

Present both tables, then ask in one message, grouped: value drifts (code or Figma wins?), Figma-only tokens (add semantic token / drop), naming (rename in Figma / keep and map). Default recommendation: keep the code token names (shadcn names on web); Figma adopts them through code syntax. Code changes (new tokens, new variants) are normal tasks under the platform rules (`react-ui` on web).

## 4. Write-back to Figma (`figma-designer`, only after explicit confirmation, Full seat)

Describe exactly what will change, get a "yes", then:

1. **Code syntax on variables**: WEB `var(--<token>)`, ANDROID/iOS without wrapper, via `use_figma` (`variable.setVariableCodeSyntax('WEB', 'var(--primary)')`) following `figma-use` + `figma-generate-library`. Effect: `get_design_context` and Dev Mode show our names. This edits the library file: the plan must name that file, and the library owner (designer) agrees.
2. **Code Connect mappings** (Organization/Enterprise plan, published components): `get_code_connect_suggestions` on the components page -> show the proposed pairs -> on confirmation `send_code_connect_mappings` with entries `{ nodeId, componentName: "Button", source: "src/shared/ui/button.tsx", label: "React" }` (`"React Native"` / `"Flutter"` labels for mobile). Simple mappings are enough; `.figma.ts` templates are an optional later step under the `figma-code-connect` skill.
3. **No library yet**: offer to build one from code tokens with the `figma-generate-library` workflow - scope "Tokens / foundations only" first (Primitives + Color Light/Dark + Spacing + Radius collections, scopes set, code syntax), components later and only those in the shared UI folder. Requires a confirmed scope, a target file (or `create_new_file` with a confirmed `planKey`) and a Full seat. The designer team owns the library afterwards.

## 5. Record the result in the catalog

- Fill `token` (neutral name, e.g. `primary`) and `code` (per-platform names) on each mapped variable in `.figma/design-system.json`, and the "Code token" column in `.md`; fill `components[].code` with the code path per platform.
- Update `components[].codeConnect` and the Code Connect table after mappings are saved.
- Append a dated changelog entry: decisions taken (drift -> who won), tokens added, mappings created.
- Remaining items go to the catalog's "Gaps" table with an owner.

## 6. Done when

- Every Figma variable used on product screens maps to one of our tokens (or is a recorded decision).
- Every library component used on product screens has a Code Connect mapping or a recorded "no equivalent, use X".
- `get_design_context` on a sample screen returns our component names and `var(--token)` values.
