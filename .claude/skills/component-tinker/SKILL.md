---
name: component-tinker
description: Builds and publishes a throwaway HTML tinker for one @tuja/ui component, where the user retunes it by eye against the real design tokens and exports the changes back for you to apply to the source.
disable-model-invocation: true
---

# Component tinker

One round trip: pick the component, write a config, build, publish, the user tweaks and exports, you apply the export to the source.

## 1. Pick the component

One component per tinker. Take it from the conversation; ask once if it is not obvious. Open its source — you transcribe from it, never from memory, because the page is worth nothing if it does not match the app.

## 2. Write the config

Write to `.claude/skills/component-tinker-workspace/<component>.tinker.tsx`. The folder is gitignored; create it if it is missing.

The config is one default export with this shape:

```tsx
import { tinker } from "@tuja/component-tinker";

function Control({
  size,
  selected,
}: {
  size: "sm" | "md";
  selected?: boolean;
}) {
  return (
    <button
      data-layer="option"
      data-variant={size}
      data-state={selected ? "selected" : ""}
    >
      <span data-layer="icon" />
    </button>
  );
}

export default tinker({
  component: "SegmentedControl",
  source: "packages/ui/src/components/forms/segmented-control.tsx",
  layers: {
    option: {
      presets: ["buttonReset.base", "corner.radius_1"],
      base: { color: "color.textMuted" },
      variants: { sm: { paddingInline: "controlSize._2" } },
      states: {
        selected: { color: "color.textMain" },
        "selected sm": { gap: "space._0" },
      },
    },
    icon: { opaque: true, base: { inlineSize: "1em" } },
  },
  cells: [{ title: "sm", tree: <Control size="sm" /> }],
});
```

`layers` is keyed by the component's `stylex.create` keys. Every style value sits in exactly one condition of its layer: `base`, a key of `variants`, a key of `states`, or a compound key in `states`. `cells` are the framed renderings on the canvas, one set of props each.

Both examples are verified pixel-exact against the app. An example for the component itself is the config: check it against the source declaration by declaration, copy it, and transcribe only what has moved since. For another component, copy the nearer example as the model. `packages/component-tinker/examples/segmented-control.tinker.tsx` is a row of options inside a track. `packages/component-tinker/examples/switch.tinker.tsx` has a per-component token var, a pseudo-element thumb, and a void host.

- Markup uses real host tags, so the layer tree is the DOM. `data-layer` names the layer after its `stylex.create` key.
- `data-state` lists the active states, space separated, each named after the pseudo-class or modifier key it maps to: `hover`, `focus`, `selected`, `checked`, `disabled`. States compose in that order, so a modifier comes after the pseudo-class it beats: `optionSelected` pins `":hover"` to its `default`, so `selected` is listed after `hover`, with no `"selected hover"` compound key.
- `data-variant` lists the active variants, space separated, each named after the prop value (`sm`, `md`) or, for a boolean prop, after the prop (`fullWidth`, `hideLabels`). The same names key `variants`.
- A compound key in `states` names one state and one or more variants, space separated — `"checked sm"` — for a value that changes with both; it applies only where every part is active. Where the source derives a state value from a per-component token var that each size sets, write one compound key per size: `"checked sm": { transform: "translateX({controlSize._8})" }`, then `"checked md"` with `controlSize._9`.
- A style value is a token reference (`"color.bgSurface"`), a CSS literal (`"inline-flex"`), or an expression with token references in braces (`"calc({controlSize._8} - {border.size_1})"`).
- A transition is a `transition.*` preset, or the component's own string with its `duration.*` and `easing.*` tokens in braces: `"background-color {duration._200} {easing.ease}"`.
- `presets` copy a primitive verbatim and are named `<export>.<member>`: `buttonReset.base`, `a11y.focusRingInset`, `truncate.base`, `corner.radius_2`, `transition.colors`. A preset applies to the whole layer, so a primitive that a prop swaps in — `a11y.srOnly` behind `hideLabels` — is transcribed as its declarations inside `variants.hideLabels`, not as a preset.
- A preset brings its own states with it: `a11y.focusRing` paints the ring while `focus` is active, so never copy `outlineColor` into `states.focus`.
- A per-component token var (`switchTokens.trackHeight`) is transcribed as the global token it holds, not as the var.
- A pseudo-element the component draws — a thumb on `::before` — becomes a real child element in the stand-in, named after the pseudo-element (`before`), so an export line maps back to the right rule.
- Where the real host is a void element, the stand-in uses a `div` with the same `role`, and the layer keeps the name of the input's style key, so the export maps back.
- Where the source expresses one effect two ways — a var the parent sets on `:hover` and the shadow the child reads from it — transcribe it once, on the layer that paints it. Step 5 says how that line maps back.
- `opaque: true` for icons and images: they show in the tree and have nothing to edit.
- Cells cover what is worth comparing side by side: each size, each interaction state, and the awkward content (icon-only, long label, full width).
- The functions that build a cell's `tree` are plain functions. No hook, no context, no imported component — the stand-in is rendered by calling them.
- `shadow.*` resolves, so a component that sets one keeps its look, but no picker offers a shadow. The only edit to a `boxShadow` is Remove, which exports `-> (unset)`.
- The five effect toggles — texture, wash, floating, scroll mask, glass — are offered on every layer. The config declares nothing for them.

## 3. Build

```
pnpm --filter @tuja/component-tinker tinker <config.tinker.tsx>
```

Run it from the repo root, with the config path root-relative or absolute. It writes `<dir>/<name>.html` and prints the path. An unknown token, preset, layer, variant or state fails the build, exit code 1, with the nearest valid name — fix the config and run it again.

## 4. Publish

Publish the HTML with the Artifact tool. The file is already a fragment with its own `<title>`, so pass the path as it is, with a favicon and a one-sentence description.

Give the user the link and the workflow in two lines: tap a layer and pick tokens, the canvas updates at once; press Export and paste the copied text back here.

## 5. Apply the export

The text is a header and one line per change:

```
component-tinker v1
component: SegmentedControl
source: packages/ui/src/components/forms/segmented-control.tsx
track.borderColor: color.neutralBorder -> color.neutral
option[selected].backgroundColor: color.bgSurface -> color.bgSurfaceRaised
option[sm].paddingInline: controlSize._2 -> controlSize._3
option[hover].backgroundColor: (unset) -> color.bgInteractiveHover
option[selected].boxShadow: shadow._1 -> (unset)
before[checked sm].transform: translateX({controlSize._8}) -> translateX({controlSize._9})
option.texture: none -> dot space._1 color.neutralBorder
```

Read `layer[condition].property: before -> after` back into the source:

- **layer** — the `stylex.create` key of that name in the file `source:` names.
- **[condition]** — a state is the pseudo-class inside that property's value map (`{ default: …, ":hover": … }`) or the modifier style key the component applies; a variant is the size or variant style object. Two names — `[checked sm]` — is that state's value inside that one variant. No brackets means the base declaration.
- **before** — the value to find, so you edit the right one of several. `(unset)` means the property is new to that condition.
- A state the tinker holds as one value can be two branches in the source: `optionSelected.backgroundColor` pins `":hover"` to its `default` so the selected segment holds still under the pointer. A line on that state rewrites both branches.
- **after** — the token to write, or `(unset)` to delete that declaration from that condition's style map. A token is written through the `styling` skill's conventions: `color.bgSurface` is `color.bgSurface` imported from `#src/tokens.stylex.ts`; a `border.radius_*` goes through the `corner` primitive, never a bare radius token.
- A line on a layer that only reads a var the parent sets — `before[hover].boxShadow` in the switch — edits the parent rule that sets the var: `styles.switch`'s `[switchTokens.thumbShadow]: { ":hover": shadow._3 }`. Follow the var to where the source sets it.
- A toggle line — `layer.texture`, `.wash`, `.floating`, `.scrollMask`, `.glass` — asks for a system effect, not a property. Build it the way `DESIGN.md` builds that effect. For `.glass` at 100% and the default tokens, that is `glassSurface.base` spread into the layer's `css` array alongside the layer's `corner.*` preset or its own radius. A non-default colour or a reduced opacity is a `glassTokens.fill` (or `.border`/`.highlight`) override in the layer's local `stylex.create` — `color-mix(in srgb, color.x N%, transparent)` for a reduced opacity — because `glassTokens` is Glass's own dial. A radius other than 8px is a `glassTokens.blur` override the same way: a step from 4px to 32px is `"<N>px"`; `off` is `"0px"`, cancelling the blur `glassSurface.base` carries — `indicatorNoBlur` in `segmented-control.tsx` is the shipped example, for a Glass over an opaque fill with nothing to sample. A layer that does not compose `glassSurface.base` simply gets no `glassTokens.blur` override for `off`.

Apply each line as written, even where it leaves a neighbour stale — a `calc` that still subtracts a border the export removed, or a comment that explains the old value — and tell the user what it left behind; that is the user's next round, not a hand-tune.

Then run the app and look at the component once, in the conditions the export touched; tests cannot judge this. If the app does not match the tinker, the transcription in this skill is wrong, not the source: revert the edit, tell the user, and fix the config before another round. Never hand-tune the source to make it match.

A further round starts over from step 2 against the updated source.
