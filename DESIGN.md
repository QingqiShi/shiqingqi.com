# Design system principles

Terms are defined in `contexts/design-system/CONTEXT.md`. This file holds only the design decisions that go against common practice and that the code does not enforce; the last section points to the rest.

## Visual language

- **A surface separates itself with a border, a background colour, or both — the least that does the job.** A card holding content of its own takes both; the selected row in a menu only has to stand out from its siblings, so a background alone does it, and a border there would be noise. A border stays quiet: enough to find the edge, never enough to draw the eye.
- **A radius inside a radius is reduced by the inset between them:** `inner = outer − inset`, for a surface nested at another surface's corner. A button or a badge keeps its own full radius.
- **An Intent colour appears only where it changes what the visitor does next.** Most of an interface is neutral, because colour used as decoration competes with colour that means something.
- **The padding around a group is larger than the gaps inside it — twice, by default** — so the group reads as one thing.
- **Content may sit directly on the Progressive blur, with no surface of its own** — a popover can put its title and its main action there, and keep a container only for the part that scrolls. Blur takes away detail but not brightness, so check it: where the content is not clearly legible, give it a surface instead.
- **No vertical coloured accent bar, stripe, or rail on the leading edge of a card** to mark a category, hue, or status. Its colour is decoration competing with colour that means something, and it is an edge noticed before the content. Use type, a background colour, or a Badge.
- **No confetti and no particle celebration.** It puts colour at a moment with no consequence. If a moment deserves marking, mark it once, with motion the system already has.

## Motion

- **Motion springs: it overshoots, then settles.** How far it overshoots is a brand value; the character is the same on a press, on a popover opening, and on a chip selecting.
- **A control springs on press.** One that grows under the finger has to sit above its neighbours, or the layout has to reserve the space.
- **Motion marks a change of state, and nothing else.** A hover that only restyles gets a colour transition, not a movement.
- **A component may hold colour or motion back until the pointer arrives.** A touch device cannot hover, so it gets the full state, and a held-back state still meets its contrast floor.
- **One looping animation on a screen at most**, and **shake means refusal, never success.**

## API design

- **Promote when a pattern repeats, not when it is predicted.** A second consumer varying the same internal piece earns a slot; a third callsite doing the same thing earns configuration. Before that there is nothing to generalise from, only a guess about what the next callsite will want.
- **An override that keeps reappearing is a wrong default or a missing look.** Promote what the callsites are already doing.
- **A new prop is the last resort, not the first.** A slot often says the variation more clearly, and a value that changes from one callsite to the next may belong in a token. A look list growing booleans is a component being configured for cases it cannot see.
- **A component has three layers: props, slots, and the pieces underneath** — tokens, Primitives, headless behaviour. A consumer starts at the top and drops only as far as the case needs, and each layer keeps the guarantees of the one above it. `apps/web/src/design-system/sections/examples/movie-detail-showcase.tsx` shows a screen built across all three.

## Held elsewhere

Showcase sources are under `apps/web/src/design-system/sections/`.

- Squircle corners and their fallback: `packages/ui/src/primitives/corner.stylex.ts`, enforced by the `require-corner-shape` lint rule.
- Material: `foundations/glass-showcase.tsx`, `foundations/texture-showcase.tsx` and `foundations/wash-showcase.tsx`; glass is drawn in `packages/ui/src/surfaces/glass-surface.stylex.ts`.
- Progressive blur and Scroll mask: `components/progressive-blur-showcase.tsx` and `components/scroll-mask-showcase.tsx`; the blur cap is in `packages/ui/src/surfaces/progressive-blur.tsx`.
- Measure and the reading column: `foundations/layout-showcase.tsx` and `apps/web/src/design-system/measure.stylex.ts`.
- Reduced motion: `packages/ui/src/primitives/motion.stylex.ts` and `foundations/motion-showcase.tsx`.
- Voice, copy rules and copy budgets: `foundations/voice-showcase.tsx`; banned words are enforced by the `no-banned-copy-words` lint rule.
