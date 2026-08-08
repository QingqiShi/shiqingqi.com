# Design system principles

Terms are defined in `packages/ui/CONTEXT.md`.

## Visual language

### Surfaces

- **A surface separates itself with a border, a background colour, or both.** Use the least that does the job. A card holding content of its own takes both; the selected row in a menu only has to stand out from its siblings, so a background alone does it, and a border there would be noise.
- **A border stays quiet.** Thin, and close in colour to what it borders — enough to find the edge, never enough to draw the eye. A border you notice before the content is too heavy.
- **Nothing casts a shadow.** There is no light above the page, so nothing is separated by one.
- **Every fixed-radius corner is a squircle.** The corner curve is a superellipse rather than a circular arc: it leaves the edge gradually, with no tangent point where flat turns to curved. The full-round radius is the exception: clamped into a pill or a circle, a superellipse cap reads as neither, so pills and circles keep circular caps. The shape is fixed — radius is a brand dial, shape is not. A browser without `corner-shape` falls back to circular corners.
- **A radius inside a radius is reduced by the inset between them:** `inner = outer − inset`. This applies to a surface nested at another surface's corner. A button or a badge keeps its own full radius.
- **A scroll region uses a progressive blur at its edge.** Content on its way out of view blurs rather than stopping at a line, so the region reads as continuing. That is a Scroll mask, and it never appears where nothing scrolls.

### Colour

- **Use colour with restraint.** Most of an interface is neutral. Colour used as decoration competes with colour that means something, and the meaning is what matters.
- **An Intent colour appears only where it changes what the visitor does next.**

### Space

- **Space follows the hierarchy: what belongs together sits closer than what does not.** The padding around a group is larger than the gaps inside it — twice, by default — so the group reads as one thing.
- **One scale, and the same steps at every level.** Spacing tuned per component stops the rhythm from carrying across a screen.

### Measure

- **Text runs at a width the eye can return across.** At the end of a line the eye jumps back to the start of the next one, and the longer that jump, the more often it lands on a line it has already read. The references disagree on where that starts, and they disagree by script: around 65 Latin characters by typographic convention, 80 Latin or 40 Chinese by WCAG. No single width sits on all three.
- **The cap is 41em: 41 Chinese characters at any type size, and around 88 Latin.** It sits on the Chinese ceiling and runs past the Latin one. That is one measure serving both scripts rather than a measure per script, and the Latin cost is the price of the single value.
- **The unit is `em` — never a fraction of the viewport, never `rem`, and never `ch`.** `em` tracks the size of the text it caps, which is what holds the character count still. A `rem` cap holds the width still instead, so the same cap lets small print run longer than body copy. `ch` is the width of a Latin zero, so it never tracks Chinese at all.
- **A cap that tracks its text gives up a shared right edge.** Blocks set at different sizes end in different places. That is what the steady character count costs, and it is the right way round: the measure belongs to the text, not to the column.
- **A page's width is not derived from the measure.** A page is sized to hold its widest specimen, and a paragraph caps itself. Deriving one from the other lets a decision about text squeeze a diagram.
- **Type does not scale up to fill a wide screen.** Larger type in a wider column holds the character count and lengthens the jump, so it makes the return worse rather than better.
- **The space beside a paragraph is either a margin or a column.** Small enough to hold nothing, or actually holding something. In between it reads as a column with content missing, which is what a capped paragraph in a much wider container looks like.
- **Anything that needs more width scrolls inside its own surface** — a table, a code block, a specimen. Widening the page to fit one of them leaves every paragraph on it stranded.

### Texture and Wash

- **Never nest one texture inside another.** A textured card on a textured page puts two patterns in line, and neither one reads as the surface it belongs to.
- **A texture is one mark at one size.** A line or a dot, never both, and never two sizes of the same mark.
- **The mark's size and spacing are set per surface.** A texture drawn for a full page reads as noise on a small card, so a smaller surface takes a finer mark.
- **Keep it faint.** Its contrast against the surface is low enough that it never resolves into a pattern with a name. If it reads as graph paper, or as a ledger, it is too strong.
- **The mark is drawn, never an image** — a 1px line, or a dot of 1px or less.
- **A Wash is a broad gradient that gives a surface some volume** — one tone drifting across it, with no bright spot anywhere. A bright spot reads as a light source.

### Floating elements

- **A floating element blurs the page around it instead of darkening it.** Where another system would dim everything behind a popover, this one leaves the brightness alone and takes the sharpness instead: the blur is strongest nearest the element and eases back to sharp further out. Attention lands on the element, and the screen never goes dark.
- **The blur belongs to the page, not to the element.** It is not the element's own background letting a blurred page show through. A brand may make an element translucent, but that is a separate choice, and it is not what does this.
- **The element keeps a crisp edge.** Where it ends is never in question, because that is what tells a visitor what dismisses it.
- **The blur radius is set per element, within a cap.** A small popover and a full-width sheet do not want the same radius. The cap is there because a large radius is expensive to composite.
- **Content may sit directly on the blurred area, with no surface of its own** — a popover can put its title and its main action there, and keep a container only for the part that scrolls. Blur takes away detail but not brightness, so check it: where the content is not clearly legible, give it a surface instead.

### Motion

Add motion where it does a job. Each component picks its own technique; these rules decide whether it gets one at all, and how it should feel.

- **Motion springs: it overshoots, then settles.** How far it overshoots is a brand value. The character is the same on a press, on a popover opening, and on a chip selecting.
- **A control springs on press.** Which way it moves is the component's choice. A control that grows under the finger has to sit above its neighbours, or the layout has to reserve the space.
- **Motion marks a change of state, and nothing else.** A hover that only restyles gets a colour transition, not a movement.
- **A component may hold colour or motion back until the pointer arrives.** Colour may drain, and a looping animation may pause, until hover or focus. A touch device cannot hover, so it gets the full state instead. A held-back state still has to meet its contrast floor.
- **One looping animation on a screen at most.** Two spinners at once is a bug.
- **Shake means refusal, never success.**
- **Reduced motion is handled once, where the motion is defined, not at each use.** The movement goes; the state change stays.

## Theming

The visual language holds still while a brand varies its expression. Variation has two scopes: a brand dial moves every callsite at once, while Customisation changes one component in one consumer.

### Brand configuration

A brand may configure hue, typeface, radius, density, spring, translucency, border colour, texture and Wash. Nothing else moves.

Give a brand a clamped range rather than a raw Token, because three of these stop working as dials at the ends:

- **Radius** stops at half a control's height. Past that it is a pill, which is a different look rather than more of the same one.
- **Density** stops where the gap falls below about 4px. Below that the padding no longer reads as larger than the gap.
- **Border colour** is clamped at both ends. Too close to what it borders and there is no edge at all; far enough to notice and it reads as a heavy line.

### Customisation

Customisation is styles or markup in the consumer that override a component. It trades the consumer's autonomy against the system's cohesion.

- **Customise while the design has not settled**, when a deadline rules out negotiating a system change, or when the case is genuinely one-off. Customisation buys speed and independence, and costs duplication, drift, and an upgrade every consumer has to redo.

### Banned visual patterns

These follow from the visual language. They are named because they keep coming back.

- **No vertical coloured accent bar, stripe, or rail on the leading edge of a card** to mark a category, hue, or status. It reads as AI slop. Communicate the same information with type, a background colour, or a Badge.
- **No confetti and no particle celebration.** It puts colour at a moment with no consequence. If a moment deserves marking, mark it once, with motion the system already has.

## API design

`@tuja/ui` is published, so most of what gets built with it is for a case its authors have not seen. A consumer has to be able to fit a component to that case without leaving the visual language. Configuration, composition and copy are all part of the component's public API surface.

### Configuration and promotion

Configuration is the props, Variants and Tokens the component exposes itself. It changes one callsite while keeping the variation in the system rather than in the consumer.

- **Configure where consistency across surfaces matters more than local freedom**, or where the component is being maintained centrally anyway. Configuration buys consistency and an upgrade that lands at every callsite, and costs slower iteration and a dependency on whoever maintains the component.
- **Promote when a pattern repeats, not when it is predicted.** A second consumer varying the same internal piece earns a Slot; a third callsite doing the same thing earns Configuration. Before that there is nothing to generalise from, only a guess about what the next callsite will want.
- **An override that keeps reappearing is a wrong default or a missing Variant.** Promote what the callsites are already doing.
- **A new prop is the last resort, not the first.** A Slot often says the variation more clearly, and a value that changes from one callsite to the next may belong in a Token rather than in a component's API. A Variant list growing booleans is a component being configured for cases it cannot see, and a Slot puts that decision back at the callsite.

### Layers of abstraction

A component is not one entry point but three. A consumer starts at the top and drops only as far as the case needs.

- **Config layer — props only.** The default, and where most callsites end. The consumer passes data; the component decides structure and style. The least code at the callsite.
- **Slot layer — a subcomponent passed in.** The consumer replaces one internal piece, an Icon or a header or an action, and the parent keeps layout, accessibility, and state. This is the layer for a targeted deviation that does not justify a new Variant or a rebuild.
- **Custom layer — the pieces underneath.** The system hands over Tokens, Primitives, headless behaviour, and accessible base elements; the consumer composes the rest. The most freedom, and the least done for you.

Accessibility, keyboard behaviour, focus management and Tokens ship in the base, and each layer keeps the guarantees of the one above it, so dropping down never means assembling them again. Each layer also has an Escape hatch to the one below, so a consumer who needs what the layer cannot express drops a level instead of forking the component.

Local code shows whether a consumer is on the right layer: a component that reads as mostly setup with a little distinctive work is one where the abstractions are pulling their weight, and one that reads as mostly fighting the system is a layer too high. A page that reaches the custom layer for a bespoke marketing surface or a one-off transition is the layers working rather than the config layer failing.

### Voice and copy contracts

The words are part of the component. A button whose label does not say what happens is a broken button.

#### Four qualities

Every string has to pass all four.

- **Plain** — the shortest wording that is still true.
- **Specific** — name the thing, the number, or the consequence.
- **Calm** — nothing shouts. No exclamation marks, no apologies.
- **Honest** — say what it does, and what it does not.

#### Writing a string

- **Sentence case, and no full stop on a label.** Capitalise the first word, leave the rest alone. Chinese has no case, so what carries over there is the punctuation half. Uppercase styling is a type treatment, and not a licence to write the copy in caps.
- **Name the outcome, not the mechanism.** "Add to watchlist", not "Submit". The label is what a screen reader announces, and what a scanning reader reads instead of the paragraph around it.
- **Errors: what happened, then what to do.** Blame the system rather than the reader, and skip the apology.
- **Say it once.** A field's label, description and error answer three different questions. Filling two with the same sentence doubles the form without clarifying it.
- **An empty state names what would fill the space**, then gives the control that puts it there.
- **One concept, one word** — in the copy, the prop names, and the code. The glossary records which word won.
- **English copy is en-GB.** `colour`, `centred`, `localised`, `behaviour`, `-ise` over `-ize`. An Identifier keeps the spelling of the code it names, so a page titled "Colour" documents Tokens spelled `color.*`, and both are right: one is prose, the other a contract.

#### Copy budgets

Going past these does not overflow. It degrades quietly, and differently on every screen.

- **Badge** — 1–2 words. It never wraps, so a third word pushes the layout.
- **Chip** — 1–3 words.
- **Button** — 1–3 words, verb first.
- **Callout title** — one line.
- **Callout body** — 1–2 sentences.
- **Heading** — one line at `md`.

#### Words that don't ship

`simply` · `just` · `easy` · `oops` · `sorry` · `please` · `click here` · `here` · `invalid` · `illegal` · `forbidden` · `powerful` · `seamless` · `effortless`
