# Design System Principles

What the system looks like, how much of it fits on a line, how it speaks, and what it never does — then how it grows. Build against the first four sections. The last four are for adding to the system rather than using it, and are drawn from Spotify Engineering's writing on [customization vs configuration](https://engineering.atspotify.com/2021/4/customization-vs-configuration-in-evolving-design-systems) and [multiple layers of abstraction](https://engineering.atspotify.com/2023/05/multiple-layers-of-abstraction-in-design-systems).

## Visual Language

Surfaces are separated by drawn lines, never by light. Nothing casts a shadow — what floats defocuses the page behind it instead.

Every rule in this section is frozen, apart from the last part, which lists what a brand may change. That split is the whole idea: rebrand the system and every value moves while every rule stays put. `border.radius_3` becomes whatever a client wants it to be; "rank is carried by the hairline" does not budge.

Ground, Wash, Halo, Scrim and Scroll mask are defined in `packages/ui/CONTEXT.md`.

### Rules

- **Rank is carried by the hairline.** Rank is which surface sits above or inside which, and the 1px line is the only thing allowed to say so. Not a shadow, not a paler fill, not a heavier border on the card that matters more.
- **A surface may take its own fill** from the background tokens. The fill is not what separates it — the hairline is.
- **Nothing casts a shadow.** A shadow implies a light overhead, and a dark page has none. Depth comes from focus instead.
- **One stroke width.** 1px everywhere. A surface that matters more does not get a thicker line.
- **A corner inside a corner steps down** by the distance between the two: `inner = outer − inset`. This holds only for a surface nested at another surface's corner — a button or a badge keeps its own full radius.
- **Neutral at rest.** An Intent colour appears only where it changes what the visitor would do.
- **Padding is twice the gap.** The 2:1 ratio is frozen; the values themselves are not.
- **Contact compresses.** A control scales down while it is pressed.

### Ground

The Ground is the page plane under every surface, and the only plane that may carry a texture.

- **A surface never carries texture.** Texture a card and the edge of that texture separates it from the page instead of its hairline, which breaks the hairline rule.
- **Texture is built from the system's own marks** — 1px lines, dots of 1px or less, tint under 20%. Never an image.
- **A Wash is diluted ink, not light.** Broad and even, with no bright spot. A bright spot reads as a light source, which puts the shadow back.

### Focus

- **Blur says out of focus, not lit from above.** It darkens nothing and tints nothing, so the dark theme needs no separate answer.
- **Everything that floats gets the same Halo.** There are no levels. A popover and an Overlay differ by their Scrim, not by how far out of focus the page goes.
- **A Scroll mask marks content on its way out of view.** It never appears where nothing scrolls.

### Motion

Add motion where it earns its place. Which technique a component uses is that component's own call — these decide whether it has earned one at all.

- **Motion marks a change of state, not contact.** Contact is already answered by the press. A hover that only restyles needs a colour transition and nothing more.
- **A resting state may hold something back, and approach gives it up.** Colour may drain and looping motion may pause until hover or focus. Gate it behind `(hover: hover)`: a touch device has no way in, so it gets no resting state at all. A grid of these counts as one looping motion against the budget below, because only the row under the cursor is running. The held-back state still has to clear its contrast floor — `overview-tile.tsx` is the worked example, and it shows the numbers.
- **Shake means refusal.** It never marks success, and it always ships with the reason in copy.
- **Every preset carries its reduced-motion fallback in the base**, never at the call site. The movement goes; the state change stays.

| Scope     | Budget                                                                             |
| --------- | ---------------------------------------------------------------------------------- |
| A control | Press, plus one state transition                                                   |
| A screen  | One looping motion at most — two spinners on one screen is a bug                   |
| A flow    | One celebratory moment at most, at the point the thing is actually done            |
| Never     | Motion that delays feedback, blocks input, or fires without a state having changed |

### What a brand may change

`hue` · `typeface` · `radius` · `density values` · `motion elasticity` · `translucency` · `Ground treatment`

Everything else is frozen. Give a brand a clamped range rather than a raw token, because two of these stop behaving like dials at the ends:

- **Radius** stops at half a control's height. Past that it is a pill, which is a different look rather than a further step on the same dial.
- **Density** stops where the gap falls below about 4px. Below that the 2:1 ratio reads as a rendering fault instead of a rhythm.

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
- **English copy is en-GB.** `colour`, `centred`, `localised`, `behaviour`, `-ise` over `-ize`. An identifier keeps the spelling of the code it names, wherever it appears: the `color.*` token group, `transition.colors`, `align="center"`, the `/foundations/color` route. So the page titled "Colour" documents tokens spelled `color.*`, and both are right — one is prose, the other is a contract.

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
- **No confetti or particle celebration.** Colour at a moment with no consequence, which breaks neutral at rest. If a moment deserves marking, mark it with a drawn one.

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
