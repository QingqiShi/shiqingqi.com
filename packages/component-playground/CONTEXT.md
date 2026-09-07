# Component Playground

The `@tuja/component-playground` package, and the `component-playground` skill that drives it: together they build one throwaway HTML page where the user retunes one `@tuja/ui` component by eye and exports the change back to the agent. Design System words (Token, Primitive, Intent) keep their meaning here; the words below are this context's own.

## Language

**Playground**:
The published artifact page for one component: canvas, layers panel, inspector, Export.
_Avoid_: preview, sandbox, editor

**Stand-in**:
The copy of the component the canvas draws from the config. Not the real React component, and never imported from `@tuja/ui`.
_Avoid_: mock, replica, demo

**Layer**:
One element of the stand-in, named after the component's `stylex.create` key. The layer tree is the DOM.
_Avoid_: node, part, element (as a domain noun)

**Cell**:
One framed rendering of the stand-in on the canvas, with a title, its own theme frame, and one set of props.
_Avoid_: example, story, variant (for this sense)

**State**:
An interaction condition, named after the pseudo-class or modifier key it maps to: `hover`, `focus`, `selected`, `checked`, `disabled`. Active states compose in the order the stand-in lists them.

**Variant**:
A prop-value condition, named after the value: `sm`, `md`, `fullWidth`.
_Avoid_: modifier, size (as the condition word)

**Condition**:
`base`, a variant, a state, or a compound key — the slot a style value is read from and written to.
_Avoid_: rule, selector

**Compound key**:
A key in `states` that names one state and one or more variants, space separated (`"checked sm"`), for a value that changes with both. It applies where every part is active, and composes after every plain state.
_Avoid_: combined state, multi-condition, and/selector

**Preset**:
A design-system primitive applied to a whole layer verbatim, named `<export>.<member>` (`buttonReset.base`, `corner.radius_2`). Read-only in the inspector. Its pseudo-class branches are conditions too: what `a11y.focusRing` paints on `:focus-visible` is applied while the `focus` state is active, and is shown with the preset as its source.
_Avoid_: mixin, class

**Token reference**:
A value written as a token name (`color.bgSurface`), alone or inside braces in an expression. The only kind of value a picker writes.
_Avoid_: var, variable

**Off-system value**:
A literal the design system does not name (`0`, `2px`). Marked as such, and replaceable only by a token. A value CSS itself names (`transparent`, `currentColor`, `inherit`) is a keyword, not one of these, and is marked apart.
_Avoid_: hardcoded value, magic value

**Opaque layer**:
A layer that shows in the tree and has nothing to edit: an icon or an image.
_Avoid_: locked layer, static layer

**Effect toggle**:
A system effect switched on for a layer rather than set as a property: texture, wash, floating, scroll mask.
_Avoid_: effect property, filter

**Export**:
The text the Export button copies: the header, then one line per change and nothing the config already says.
_Avoid_: diff, patch, output

**Edit scope**:
The condition an edit writes to, chosen from the element's active conditions. A rest-cell edit lands in `base` and applies everywhere; a state-cell edit lands in that state.
_Avoid_: target, cascade
