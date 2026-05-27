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

## Banned Patterns

- **No vertical colored accent bar / stripe / rail on the leading edge of a card** to mark a category, hue, or status. It reads as AI slop. Communicate the same information with type, a token-themed background, or a contextual badge.
