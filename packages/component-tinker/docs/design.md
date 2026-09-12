# Component tinker: design

## Purpose

The user works on one design-system component with an agent. Instead of describing a look in words, they invoke this skill. The agent writes one short config, runs one command, and publishes a single-file HTML artifact. The user opens it on any device, taps an element, picks tokens, sees the change at once, clicks Export, and pastes the copied text to the agent. The agent reads which layer, condition, property, and token changed, edits the component source, and checks the result once. The artifact is thrown away; a further tweak re-runs the skill from the updated code.

Fixed product decisions:

- User-invoked only. One component per tinker.
- The canvas shows a stand-in drawn from the config, not the real React component. It must look the same as the component in the app running locally, or extremely close.
- Values are picked from design tokens only. Enum props and content text are separate, non-token controls. A literal value in the config is shown as-is with an off-system mark and can only be replaced by a token. A CSS keyword (`transparent`, `currentColor`, `inherit`) is marked as a keyword instead, because it is a choice CSS names, and is still replaceable by a token.
- All declared states and variants render at once, static. Light/dark toggle, container width control. Motion is a preset picker only.
- No shadow control anywhere. `shadow.*` still resolves, so a stand-in transcribed from a component that sets one keeps its look, but no picker offers it and `boxShadow` is read-only.
- Layers panel mirrors the DOM one to one, with semantic names. Icons and images are opaque layers: visible in the tree, not editable.
- Cells are linked: an edit in a rest cell applies everywhere; an edit in a state cell applies to that state only.
- Export copies compact text to the clipboard. No database, no server.
- Chrome is generic, quiet, tasteful, not built from the design system. Works on a phone with touch. Minimal controls, no undo.
- Done when the segmented control and one more component (chosen after the package exists) make the full round trip. The second is the switch, which adds a per-component token var, a pseudo-element thumb, and a void host element.

## Folder layout

```
packages/component-tinker/
  package.json             @tuja/component-tinker
  vitest.config.mjs
  scripts/build.mjs        <config.tsx> -> <config-dir>/<name>.html
  scripts/tinker-vite-config.mjs   the Vite config build.mjs runs
  src/core/                config API, style resolution, edit scope, export serialisation
  src/adapter/             design-system specific: token CSS extraction, token catalogue, fonts, presets
  src/app/                 tinker UI
  examples/segmented-control.tinker.tsx
  examples/switch.tinker.tsx
  docs/design.md           this file
.claude/skills/component-tinker/
  SKILL.md                 agent instructions
.claude/skills/component-tinker-workspace/   gitignored; agent-written configs and built html
```

The package is covered like every other package in the monorepo: the root `pnpm verify` lints, formats, and type-checks it, and it has its own tests and runs in CI the same way. Its `tinker` script is deliberately not named `build`, so turbo's `build` pipeline — which chains packages by their `build` script — skips this one.

## Config API (what the agent writes)

```tsx
import { tinker } from "@tuja/component-tinker";

function Control({
  size,
  selected,
  hover,
}: {
  size: "sm" | "md";
  selected: number;
  hover?: number;
}) {
  const options = ["Day", "Week", "Month"];
  return (
    <div data-layer="track" data-variant={size} role="radiogroup">
      {options.map((label, index) => (
        <button
          key={label}
          data-layer="option"
          data-variant={size}
          data-state={[
            index === selected && "selected",
            index === hover && "hover",
          ]
            .filter(Boolean)
            .join(" ")}
          role="radio"
          aria-checked={index === selected}
        >
          <span data-layer="label">{label}</span>
        </button>
      ))}
    </div>
  );
}

export default tinker({
  component: "SegmentedControl",
  source: "packages/ui/src/components/forms/segmented-control.tsx",
  layers: {
    track: {
      base: {
        display: "inline-flex",
        gap: "space._00",
        backgroundColor: "color.bgSurfaceSunken",
        borderWidth: "border.size_1",
        borderStyle: "solid",
        borderColor: "color.neutralBorder",
        borderRadius: "border.radius_2",
      },
      variants: {
        sm: {
          padding:
            "calc(({controlSize._8} - {controlSize._7}) / 2 - {border.size_1})",
        },
        md: {
          padding:
            "calc(({controlSize._9} - {controlSize._8}) / 2 - {border.size_1})",
        },
      },
    },
    option: {
      presets: ["buttonReset.base", "a11y.focusRingInset", "transition.colors"],
      base: {
        backgroundColor: "transparent",
        color: "color.textMuted",
        fontWeight: "font.weight_5",
        borderRadius: "border.radius_1",
      },
      variants: {
        sm: {
          minBlockSize: "controlSize._7",
          paddingInline: "controlSize._2",
          fontSize: "font.uiCaption",
        },
        md: {
          minBlockSize: "controlSize._8",
          paddingInline: "controlSize._3",
          fontSize: "font.uiBodySmall",
        },
      },
      states: {
        hover: {
          backgroundColor: "color.bgInteractiveHover",
          color: "color.textMain",
        },
        selected: {
          backgroundColor: "color.bgSurface",
          color: "color.textMain",
          fontWeight: "font.weight_6",
        },
      },
    },
    icon: { opaque: true, base: { inlineSize: "1em", blockSize: "1em" } },
    label: { base: {} },
  },
  cells: [
    { title: "Medium", tree: <Control size="md" selected={1} /> },
    { title: "Small", tree: <Control size="sm" selected={1} /> },
    { title: "Hover", tree: <Control size="md" selected={1} hover={0} /> },
  ],
});
```

Rules:

- Markup uses real host tags, so the layer tree is the DOM. `data-layer` names the layer. `data-state` lists active interaction states, `data-variant` lists active variants, both space separated.
- Layer names and condition names must match the code: a layer is named after its `stylex.create` key (`track`, `option`), a state after the pseudo-class or modifier key it maps to (`hover`, `selected`, `focus`, `disabled`, `checked`), a variant after the prop value (`sm`, `md`, `fullWidth`). The export uses these names, so the agent knows where to apply.
- Style values are camelCase CSS properties. A value is a token reference (`"color.bgSurface"`, `"space._2"`, `"font.weight_6"`), a literal CSS string, or an expression with token references in braces (`"calc({space._2} - {border.size_1})"`).
- `presets` names design-system primitives copied verbatim into the stand-in. A preset is named `<export>.<member>` for any exported `stylex.create` object in `packages/ui/src/primitives` or in `glass-surface.stylex.ts`: `buttonReset.base`, `a11y.focusRingInset`, `transition.colors`, `truncate.base`, `corner.radius_2`, `glassSurface.base`. They are applied as the compiled class names of the real primitive and are shown read-only in the inspector. Setting `borderRadius` to a `border.radius_*` token automatically pairs it with `corner-shape: squircle` (`round` for `radius_round`), matching the `corner` primitive.
- A preset applies to the whole layer, so a variant that swaps a primitive in — `a11y.srOnly` behind a `hideLabels` prop — transcribes that primitive's declarations into the variant instead.
- A preset's pseudo-class branches are conditions of their own. The adapter reads the `:hover`, `:focus-visible` / `:focus`, `:active`, `:disabled`, `:checked` and `:indeterminate` value inside each of a primitive's properties, resolves it to a token reference, and the tinker applies it when the matching state is active. The stand-in forces its states with attributes, so the primitive's own rule never matches; without this, `a11y.focusRing` would paint no ring and the config would have to copy `outlineColor` into `states.focus` by hand. The inspector shows such a value with the preset as its source; an edit to it writes to the state, as any other state-cell edit does.
- A key in `states` can be compound — one state and one or more variants, space separated, `"checked sm"` — for a value that changes with both. It applies only where every part is active on the element. A component that derives a state value from a per-component token var (`switchTokens.thumbPosition` reads `switchTokens.trackHeight`, which each size sets) has one such value per size, and a compound key is how the stand-in says so.
- Composition order for one element: presets, then `base`, then each active variant in the order written on the element, then each active state in the order written on the element — each state preceded by whatever its presets paint — then each active compound key in the order written in `states`.
- An `opaque` layer is shown in the tree and can be selected, but has no editable properties.
- Unknown token references and unknown presets fail the build with a message that names the nearest valid name. So does a compound key whose parts are not the layer's variants and states, except for the one part that names the state the compound applies to, which a layer can declare in compound keys alone.

## Edit scope

When the user edits property P on an element whose active variants are V (in order) and active states are S (in order, with the active compound keys after them):

1. The last state in S that already defines P.
2. Else the last variant in V that already defines P.
3. Else the last plain state in S, if any.
4. Else `base`.

A compound key counts as a state in step 1, so a size-specific state value stays size-specific. A property no condition defines yet lands on a plain state, which is the broader of the two. A value a preset paints is defined by no condition of the layer, so it too lands on the state.

The inspector shows, for each property, the condition that supplies its current value and the condition an edit would write to. This gives the fixed product rule: a rest-cell edit applies everywhere, a state-cell edit applies to that state only, and a size-specific property stays size-specific.

## Token catalogue and property types

The adapter compiles `packages/ui/src/tokens.stylex.ts`, `breakpoints.stylex.ts`, `primitives/*.stylex.ts`, and `components/surfaces/glass-surface.stylex.ts` with `@stylexjs/babel-plugin` (including `@tuja/babel-plugins/stylex-breakpoints` with `rootDir` = `packages/ui`, and `unstable_moduleResolution` rooted at the monorepo root), and emits the same CSS the app ships for those files. The plugin options themselves come from `@tuja/babel-plugins/stylex-options`, the one place both `apps/web/babel.config.js` and the adapter read them from, so the two builds cannot drift apart. The adapter loads Babel from `@stylexjs/babel-plugin`'s own dependencies, because that is the Babel `@stylexjs/postcss-plugin` runs to produce the app's shipped CSS, and the adapter must run that same Babel to reproduce it. A token reference resolves to `var(--...)` from that build, so light/dark, responsive font sizes, and `corner-shape` fallbacks behave exactly as in the app. Light/dark on the canvas is `color-scheme` on the cell frame, as in `apps/web/src/components/design-system/theme-frame.tsx`.

Pickers offer, per property type:

| Property type                                                                                                                                                   | Token groups                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| colour (`backgroundColor`, `color`, `borderColor`, `outlineColor`, `caretColor`, `fill`, `stroke`)                                                              | `color.*`, subset by role first (`bg*`/`*Surface` for backgrounds, `text*`/`*On`/`*Text` for text, `*Border` for borders), with show all |
| length (`padding*`, `gap`, `margin*`, `inset*`, `top/left/...`, `inlineSize`, `blockSize`, `width`, `height`, `min*`, `max*`, `outlineOffset`)                  | `space.*`, `controlSize.*`, `border.size_*`                                                                                              |
| border/outline width                                                                                                                                            | `border.size_*`                                                                                                                          |
| radius                                                                                                                                                          | `border.radius_*`                                                                                                                        |
| `fontSize`                                                                                                                                                      | `font.ui*`, `font.vp*`, `font.cq*`                                                                                                       |
| `fontWeight`                                                                                                                                                    | `font.weight_*`                                                                                                                          |
| `lineHeight`                                                                                                                                                    | `font.lineHeight_*`                                                                                                                      |
| `letterSpacing`                                                                                                                                                 | `font.tracking*`                                                                                                                         |
| `fontFamily`                                                                                                                                                    | `font.family`, `font.familyMono`                                                                                                         |
| `zIndex`                                                                                                                                                        | `layer.*`                                                                                                                                |
| `opacity`                                                                                                                                                       | `opacity.*`                                                                                                                              |
| `aspectRatio`                                                                                                                                                   | `ratio.*`                                                                                                                                |
| `transition`                                                                                                                                                    | `transition.*` presets (applied as class names)                                                                                          |
| `transitionDuration` / `animationDuration`                                                                                                                      | `duration.*`                                                                                                                             |
| `transitionTimingFunction` / `animationTimingFunction`                                                                                                          | `easing.*`                                                                                                                               |
| enums (`display`, `flexDirection`, `alignItems`, `justifyContent`, `borderStyle`, `textAlign`, `overflow`, `position`, `whiteSpace`, `textTransform`, `cursor`) | the CSS keywords, not tokens                                                                                                             |

Texture, Wash and Glass are drawn from the design system's own declarations rather than from a copy of them, through the same mechanism a preset uses. `glass-surface.stylex.ts` is a preset source beside `primitives/*.stylex.ts`, so `texture.dot`, `texture.line`, `wash.toBottom` and its three siblings, and `glassSurface.base` are all in `catalogue.presets` with the class the design system compiled, and the compiled CSS is already on the page — the Glass rim's `::before` with it. Switching a toggle on puts that class on the layer and sets only the dials in the layer's inline style: `textureTokens.pitch` and `.ink`, `washTokens.tone`, and `glassTokens.fill`, `.border`, `.highlight` and `.blur`. A part the user leaves on its own token reads `glassTokens.fill: {color.glassFill}`, which is the design system's own default written out rather than a var that refers to itself; a part at a reduced opacity step reads `color-mix(in srgb, {token} N%, transparent)`, and the Glass radius `off` sets the blur to `0px`. A change to a treatment in `@tuja/ui` therefore reaches the tinker on its own.

A Texture and a Wash are both one `background-image`, so two classes on one element would leave only the later one drawn. The Wash goes on the layer and the Texture draws on a box of its own inside it — absolutely positioned over the layer's area, at `z-index: -1` inside the layer's own stacking context, so it paints over the layer's background and under its content. The dials go on whichever box carries the class, because `texture.line` sets its own wider pitch and an inherited value would not replace it.

Every `defineVars` member in the design system resolves, not only the dials the toggles turn, so a layer that applies `corner.squircle_round` reads `cornerTokens.height` and a stand-in transcribed from a component that sets a shadow reads `shadow._N`. None of them is offered by a picker.

System toggles, shown on a layer as switches rather than properties:

- Texture: one drawn mark (`dot` or `line`) at one spacing from `space.*` in one colour from `color.*`. Follows DESIGN.md: one mark, one size, never nested.
- Wash: one colour token drifting to transparent across the element, direction named after the `wash` member it switches on. No bright spot.
- Floating: progressive blur of the page around the element, radius capped at 32px, five layers doubling in radius, drawn behind the element as the design system does. Needs page content behind the cell, so the cell renders sample text under a floating element and grows to a minimum height to hold it. One blur plane per layer per cell: every instance of the layer in that cell shares one plane, drawn around the union of their boxes.
- Scroll mask: progressive blur at the edge of a scrolling layer.
- Glass: `glassSurface.base` as the design system paints it, with `glassTokens.blur` set to a radius capped at 32px, or to `0px` for a Glass over an opaque fill that has nothing to sample. Each of fill, border and highlight picks a colour token and an opacity step; the steps scale the token's own alpha, they do not add a second one. The rim is the design system's `::before`; the toggle sets `position: relative` on its own layer, so that layer is always the rim's containing block.

Guardrails warn and never block: text on its background under 4.5:1; radius above half the element's height; gap under 4px. Radius and gap are reported only for a value the user changed, because the component already ships the config's value and the user cannot answer for it here. Contrast is about a pair, so an edit to either half can break a value that was correct, and it is always reported.

## Canvas

Cells wrap in rows. Each cell has a title, a frame that pins `color-scheme` from the theme toggle, the app's page background (`color.bgCanvas`), `modern-normalize`, and the app's font faces (Inter inlined as data URIs). Container width control: 320, 375, 768, 1080, full, starting at full. A fixed width sets the cell's width; at full the cell takes the width of its stand-in with a 260px floor, so several cells sit side by side. Zoom: 1x, 1.5x, 2x, plus pinch on touch; the canvas scrolls; no free pan. Hover shows a hairline outline on the layer under the pointer; the selected element shows a stronger outline with its layer name. Tap or click selects the deepest layer under the pointer. A breadcrumb above the canvas shows the ancestor chain of the selection and is clickable.

## Layers panel

The tree of the selected cell (default: first cell). Each row: layer name, tag, chips for active states and variants, a lock mark for opaque layers. A state chip carries the pseudo-class colon (`:selected`), so it never reads as the tree's own selection. Click selects that instance. Desktop only; on a phone the breadcrumb replaces it and the tree is the Layers tab of the bottom sheet.

## Inspector

Header: layer name, tag, active condition chips — variants, states, and the compound keys they activate — and the condition an edit writes to. Collapsible groups: Background, Text, Border, Spacing, Size, Layout, Effects (opacity, texture, wash, floating, scroll mask), Motion, Stacking. Each property row: name, value chip (token name with a split light/dark swatch for colours, a px hint for lengths), source condition in muted text, Remove, and Reset when changed. Remove drops the declaration from the condition it comes from, as deleting it from `stylex.create` would: the row stays, reads unset, and Reset puts the config's value back. A "+" per group adds an unset property. Tapping a value opens the picker: search, group filter, tokens as rows with swatch and value hint, off-system literal shown at the top as read-only.

## Export

Top bar button. Copies text; shows "Copied". If the clipboard API fails, opens a dialog with the text selected. Format, one change per line, only changes from the config:

```
component-tinker v1
component: SegmentedControl
source: packages/ui/src/components/forms/segmented-control.tsx
option[selected].backgroundColor: color.bgSurface -> color.bgSurfaceRaised
track.borderColor: color.neutralBorder -> color.neutral
option[sm].paddingInline: controlSize._2 -> controlSize._3
option[hover].backgroundColor: (unset) -> color.bgInteractiveHover
option[selected].boxShadow: shadow._1 -> (unset)
before[checked sm].transform: translateX({controlSize._8}) -> translateX({controlSize._9})
option.texture: none -> dot space._1 color.neutralBorder
```

`(unset)` before the arrow is a property new to that condition; after the arrow it is a declaration to delete from that condition. Edits autosave to localStorage keyed by a hash of the config. "Reset all" reverts to the config.

## Build output

`pnpm --filter @tuja/component-tinker tinker <config.tinker.tsx>` bundles the config with the app into one HTML file next to the config. pnpm runs the package script from the package directory and puts the caller's own directory in `INIT_CWD`, so the config path resolves against `INIT_CWD` and a root-relative or absolute path given from the monorepo root still works. Vite makes an IIFE library build with every asset inlined, and the script assembles the HTML around it, rather than a single-file plugin. A config lives outside this package, so React would otherwise resolve against whatever `node_modules` sits above it; a resolver hook in both the esbuild validation pass and the Vite build pins it to this package's copy. The Artifact tool wraps the file in its own doctype, html, head, and body, so the output is a fragment: `<title>`, `<style>`, the root element, one inline `<script>`. No external requests of any kind; the build fails if the output would fetch anything. The chrome supports the viewer's theme the way the design system does: `:root` sets `color-scheme: light dark` and declares each chrome colour once with `light-dark()`. The theme toggle starts from the theme the page is shown in and then switches the chrome and the canvas together, by stamping `data-theme` on the document root, which pins `color-scheme`.

## Chrome brief

Quiet and near-monochrome: warm grey ground, hairline dividers, Inter at 12 to 13px for UI text, generous whitespace, one accent for the selection outline and focus, colour otherwise only in swatches and the canvas. Desktop at 768px and up: layers 240px, canvas flexible, inspector 300px, a slim top bar with component name, theme toggle, width, zoom, export. Below 768px: top bar with name, theme, Export — no width and no zoom buttons, because zoom is pinch and the canvas is already the phone's width, and "Reset all" moves into the sheet; breadcrumb under it; canvas full-bleed; one bottom sheet with a drag handle (peek at about 40%, expanded at about 85%) and two tabs, Inspector and Layers. The handle changes the size only and the tabs change the panel only, so a drag down never changes what the sheet shows. Touch targets at least 44px, and every text field at 16px there, because Safari zooms the page into a smaller one. Safe-area insets respected. The page never scrolls horizontally.
