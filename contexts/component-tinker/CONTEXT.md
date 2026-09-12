# Component Tinker

The `@tuja/component-tinker` package and the `component-tinker` skill that drives it: one throwaway HTML page where the user retunes one `@tuja/ui` component by eye and exports the change back to the agent. Design System words (Token, Primitive, Intent) keep their meaning here.

## Language

**Tinker**:
The published artifact page for one component: canvas, layers panel, inspector, Export.
_Avoid_: preview, sandbox, editor, playground

**Layer**:
One element of the stand-in, named after the component's `stylex.create` key. The layer tree is the DOM.
_Avoid_: node, part, element (as a domain noun)

**State**:
An interaction condition, named after the pseudo-class or modifier key it maps to: `hover`, `focus`, `selected`, `checked`, `disabled`. Active states compose in the order the stand-in lists them.

**Effect toggle**:
A system effect switched on for a layer rather than set as a property: texture, wash, floating, scroll mask, glass.
_Avoid_: effect property, filter
