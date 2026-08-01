# Design System Principles

Principles for evolving the design system, drawn from Spotify Engineering's writing on [customization vs configuration](https://engineering.atspotify.com/2021/4/customization-vs-configuration-in-evolving-design-systems) and [multiple layers of abstraction](https://engineering.atspotify.com/2023/05/multiple-layers-of-abstraction-in-design-systems).

## Customization vs Configuration

Two ways to vary a component:

- **Customization** — external styles or markup that override the component. Low abstraction. Lives in the consumer.
- **Configuration** — props, variants, and tokens exposed by the component itself. High abstraction. Lives in the system.

Neither is universally better. The choice is a trade between autonomy and cohesion.

### When to customize

- The feature is experimental and the design has not settled.
- A deadline rules out negotiating a system change.
- The use case is genuinely one-off.

Customization buys speed and independence at the cost of duplication, drift, and harder upgrades.

### When to configure

- A pattern has appeared in two or more places.
- Consistency across surfaces matters more than local freedom.
- The component is being upgraded or maintained centrally.

Configuration buys consistency and easier upgrades at the cost of slower iteration and tighter coupling to system owners.

### Default bias

Favour customization while a feature is finding its shape; promote to configuration once a pattern is real. Don't pre-emptively configure for hypothetical reuse — three similar callsites is the earliest a shared abstraction should appear.

## Layers of Abstraction

Treat abstraction as a spectrum, not a binary. A component should offer multiple entry points so the consumer can pick the level that matches their need.

### Config layer (props only)

The default. The consumer passes data; the component decides structure and style. Best for standard cases — covers most callsites with the least code at the callsite.

### Slot layer (subcomponents as props)

The consumer replaces a specific subcomponent (icon, header, action) while the parent still owns layout, accessibility, and state. Best for small, targeted deviations that don't justify a new variant prop or a full rebuild.

### Custom layer (base primitives)

The system provides primitives — tokens, hooks, headless behaviour, accessible base elements — and the consumer composes the rest. Best for complex, distinctive cases. Maximum freedom, minimum free lunch.

A consumer should be able to start at the config layer and drop down only as far as they need. Each layer below should reuse the guarantees (accessibility, state, tokens) of the one above.

## Working Principles

- **Defaults do the heavy lifting.** Accessibility, keyboard behaviour, focus management, and tokens ship in the base — not bolted on per use.
- **Slots over flag soup.** When a variant prop list starts growing booleans, expose a slot instead. Targeted composition beats accumulating configuration in the parent.
- **Watch the overrides.** Repeated customizations of the same property are evidence that the default is wrong or a variant is missing. Promote what people are already doing.
- **Local code should show what's different.** If a consumer's component reads as mostly setup and only a little distinctive work, the abstractions are pulling their weight. If it reads as mostly fighting the system, drop a layer.
- **Don't trap consumers.** Every layer should have an escape hatch to the one below. A consumer who needs custom layout should not have to fork the component.

## Applying This Here

- New shared components default to the config layer. Add slots when a second consumer needs to vary the same internal piece.
- Reach for the custom layer (raw primitives, tokens, headless hooks) when a page is doing something genuinely distinctive — bespoke marketing surfaces, one-off transitions, experimental layouts.
- Before adding a prop, check whether a slot would express the variation more clearly. Before adding a slot, check whether the variation belongs in a token.
- Treat the design system as evolving. Patterns earn promotion from customization → slot → config by showing up repeatedly, not by being predicted.

## Measure

Line length is capped because the eye has to jump back to the start of the next line, and the longer that jump, the more often it lands on the wrong one. Scaling the type up on a wide screen holds the character count and lengthens the jump, so it makes the problem worse rather than better. The full statement, with the diagram, is the Layout foundation page (`/design-system/foundations/layout`).

- **Prose caps at `measure.prose` (41rem)** — around 65 Latin characters, or 41 han. In rem, never `ch`: `ch` is the width of a Latin zero, so one value lands somewhere different at every type size and in every script.
- **The space beside a paragraph is either a margin or a column.** Small enough to hold nothing, or actually holding something. In between, it reads as a column with content missing — which is what a capped paragraph in a much wider container looks like.
- **Design-system pages cap at `measure.reading` (48rem)** rather than filling `layout.maxInlineSize`. One left edge for headings, prose and specimens, and the leftover beside a paragraph stays a margin.
- **A specimen that needs more room scrolls inside its own card** (`scrollX.base`, or the snippet scroller). Widening the page to fit one specimen re-strands every paragraph on it.

## Voice

The words are part of the component. A button whose label doesn't say what happens is a broken button. These are the headline rules; the full standard, with examples, is the Voice foundation page (`/design-system/foundations/voice`).

### Four qualities

Hold any string against these and the answer is yes or no.

- **Plain** — the shortest wording that is still true.
- **Specific** — name the thing, the number, or the consequence.
- **Calm** — nothing shouts. No exclamation marks, no apologies.
- **Honest** — say what it does, and what it doesn't.

### Rules

- **Sentence case, and no full stop on a label.** Capitalise the first word, leave the rest alone. Chinese has no case, so what carries over there is the punctuation half. `Text` `variant="overline"` / `transform="uppercase"` is a type treatment, not a licence to write in caps.
- **Name the outcome, not the mechanism.** "Add to watchlist", not "Submit". The label is what a screen reader announces and what a scanning reader reads instead of the paragraph around it.
- **Errors: what happened, then what to do.** Blame the system rather than the reader, and skip the apology.
- **Say it once.** A field's label, description and error answer three different questions. Filling two with the same sentence doubles the form without clarifying it.
- **Empty states name what would be here**, then give the control that puts it there.
- **One concept, one word** — in the copy, the prop names, and the code. `CONTEXT-MAP.md` records which word won.

### Copy budgets

Writing past these doesn't overflow. It degrades quietly, differently on every screen.

| Slot          | Budget                                                  |
| ------------- | ------------------------------------------------------- |
| Badge         | 1–2 words (`nowrap`, so a third word pushes the layout) |
| Chip          | 1–3 words                                               |
| Button        | 1–3 words, verb first                                   |
| Callout title | one line, no full stop                                  |
| Callout body  | 1–2 sentences                                           |
| Heading       | one line at `md`                                        |

### Words that don't ship

`simply` · `just` · `easy` · `oops` · `sorry` · `please` · `click here` · `here` · `invalid` · `illegal` · `forbidden` · `powerful` · `seamless` · `effortless`

## Banned Patterns

- **No vertical colored accent bar / stripe / rail on the leading edge of a card** to mark a category, hue, or status. It reads as AI slop. Communicate the same information with type, a token-themed background, or a contextual badge.
