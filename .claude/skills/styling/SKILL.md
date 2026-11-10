---
name: styling
description: How to build a screen and how to style in this project, and where its design principles live. Use it before you build or change any page, screen, form, dashboard, list or other UI (it holds the component catalogue and the example screens to start from), and for any style change, even a small one: styles, the look of a component, layout, responsive behaviour, hover and focus states, or motion (StyleX, tokens, the css prop). Use it also to judge whether something follows the design principles (设计原则, 空间原则), even when no style changes.
---

# Styling

`apps/web`, `apps/finance`, `apps/assistant` and `packages/ui` style with StyleX through a `css` prop. `apps/trip-planner` uses Tailwind, and this skill does not apply there.

Import paths below are `@tuja/ui` package exports. Inside `packages/ui`, import the same files by relative path.

## Build a screen from components

A screen here comes out of components, as a shadcn screen comes out of blocks. The components carry the hierarchy: what is large, what is muted, what sits on a surface, how far apart things are. A screen that stacks them looks right. A screen that writes its own layout and type usually looks flat, because each hand-made choice is one more place where the hierarchy can slip.

**Read `references/components.md` before you write a screen.** It is the whole catalogue on one page: each component, its import path, and when to reach for it. Each group links to a file with every prop and an example, so you do not need to open the source.

**Start from the nearest pattern** and change it. Each one is a whole screen built only from components, works on a phone and on a desktop, and runs at `/design-system/patterns/<name>`:

| Screen                                                                 | Pattern in `apps/web/src/design-system/patterns/` |
| ---------------------------------------------------------------------- | ------------------------------------------------- |
| A report or dashboard: figures, cards of rows, a main and aside        | `dashboard/`                                      |
| A settings page: cards of settings rows, one Save                      | `settings/`                                       |
| A list of records: figures, filters, a table that is a list on a phone | `list/`                                           |
| A form to add or edit one thing: fields in cards, an error, actions    | `form/`                                           |

Most screens have this shape, from the outside in:

1. `TabView` is the frame of the app: a sidebar with labels on a wide window, a rail of icons on a narrower one, a tab bar on a phone. A destination can show a `count`, and `secondary` holds a list under the destinations.
2. `PageHeader` starts the page: the title, one line that says what the page is for, and the one main action of the screen (`Button look="primary"`). Other actions are quieter.
3. `StatGroup` shows the figures that the visitor came for, when the page has them.
4. The content is `Card`s, a `List`, a `Table`, or `SettingList`s. `Columns` puts a main column beside an aside, so that a wide window is used and not left empty at the sides.
5. A form ends with `FormFooter`.

To make the hierarchy clear: put first what asks the visitor to act, give secondary text `tone="muted"`, let done things recede, and keep to one main action per screen.

**A `stylex.create` in a screen file is for what only that screen has**, such as a chart or a mark of its own. If you start to write gaps, padding, type or colour for something common (a header, a row of figures, a settings row, an empty state), look in the catalogue again. If it is not there, say so when you report: the fix belongs in `@tuja/ui`, so that the next screen gets it too.

**Look at the screen before you call it done**, at a phone width and a desktop width, in light and in dark. Correct code does not show that a screen looks right.

## Read the principles first

The rest of this skill says how to write a style. The design-system pages say which style is right.

The pages are in `apps/web/src/app/[locale]/design-system/foundations/`. Many of them are short and import their content from `apps/web/src/design-system/sections/foundations/*`, so read those files too. On the site, each page is at `/design-system/foundations/<page>`.

| When you                                                                  | Read                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Judge a component or a change, or decide how something looks or moves     | `principles`: Restraint, Clarity, Space, Harmony, Inclusion, Delight                 |
| Add or change motion, or open or close anything                           | `motion`: presets, the motion engine, spring roles, reduced motion. Also Space above |
| Choose a length, a gap, a breakpoint, a line length or a z-index          | `layout`                                                                             |
| Style text                                                                | `typography`: `Text` and `Heading`, type roles, weights, fluid roles                 |
| Choose a colour                                                           | `color`: when the component picks it, the job of each Intent, foreground pairs       |
| Paint a card, panel or menu, round a corner, or add a shadow              | `surfaces`: skins, corner steps, nested corners, what casts a shadow, floating       |
| Add a finish to a surface                                                 | `material`: Glass, Wash, Texture                                                     |
| Add or size an icon, or name an icon-only control                         | `iconography`                                                                        |
| Build or review for keyboard, touch or a screen reader                    | `accessibility`: focus ring, 44px tap, what a screen reader reads                    |
| Change how a `@tuja/ui` component looks, or build your own from its parts | `customization`: props, then `css` and Tokens, then your own element                 |

Before you say that a component follows or breaks a principle, read that principle on the page. Correct tokens do not show that a result follows a principle, so do not judge from memory or from the tokens. Then check each lead of the principle against the running component: open it, press it, interrupt it.

## Motion

**Choose the mechanism.**

- A simple state change (hover, press, focus, selected, colour, a small cue) or a loop: CSS, with `transition.*` or `animate.*`.
- A motion that can be interrupted, follows a gesture, or is measured from layout: the motion engine, because a new target starts from where the value is, at its speed.
- An element that goes to a new place in the layout: `captureLayout`, change the layout, then `playLayout`.
- A panel that opens in place: `Disclosure`. In `packages/ui`, a new one takes the internal `useFlowPanel`, as `Disclosure` and `NavGroup` do.

**Choose the spring.** The system has one spring: take the `springRoles` member for the thing that moves, and do not write your own stiffness, damping or duration. `packages/ui/src/motion/spring-roles.ts` and the Motion page describe the roles and `easing.spring` for CSS.

**Under reduced motion,** drop the movement and keep changes of colour and opacity. The engine's `to()` snaps, or takes a `reduced` tween. The presets handle it, except `animate.expand` and `animate.collapse`. A motion of your own needs a `motionConstants.REDUCED_MOTION` branch.

**Do not animate layout.** Do not animate `height`, `block-size`, `width`, `inline-size`, margins, padding, insets, `grid-template-rows` or another property that triggers layout. Assume that it janks and drops frames. Layout runs on the main thread in each frame and its cost grows with the page, so a smooth run on a fast machine says nothing about a long page on a phone. Do not measure to decide this direction. Do not buy performance by cutting the spring: no height cap, no early finish, no change to a fade. A fade replaces a move only under reduced motion. Change the layout once, then move with `translate`, `transform` and `opacity`. `@tuja/no-layout-animation` refuses an animated `height` or `block-size`. It does not see the other properties, so they stay your job.

**Register what moves.** When a panel opens in place, what lies below it moves too. Each box registers itself and moves itself, on its own `translate`.

- A component takes `useFlowBlock` from `@tuja/ui/hooks/use-flow-block`.
- Other content, also a paragraph of `Text` or `Heading`, goes in `FlowBlock` from `@tuja/ui/components/flow-block`.
- Register at the coarsest level that moves as one. `Card`, `List`, `Section`, `Divider`, `Disclosure`, `Pager` and sticky boxes are blocks already.
- A block that paints a surface and can hold a `Disclosure` takes `surface`, so that its lower edge moves with the panel.
- A motion writes styles only on the element that it owns, and production code does not walk the DOM to find what moves. Each block writes only its own element, so it stays clear which code owns each style. A walk of the document at each press costs more as the page grows, so only the development check walks it, and it does not ship.

In development, that check runs at each press and warns in the console with the prefix `Flow:`. After you change what lies below a panel, press the panel and read those warnings. To see how this works, read `packages/ui/src/motion/use-flow-block.tsx`, `packages/ui/src/surfaces/flow-block.tsx` and `packages/ui/src/surfaces/disclosure.tsx`.

## Style an element yourself

When no component fits and you style an element yourself, compose primitives before you write a style of your own, such as `css={[flex.row, align.end]}`. A link or button of more than one line takes `Pager`, `Button` or `cardSurface.interactive`, so that hover responds across the whole target. `references/primitives.md` says which primitive to choose.

## Traps that lint does not catch

**`css` compiles only on lowercase elements** (`div`, `svg`). On a component it is a plain runtime prop that holds raw StyleX styles. The type check does not always catch a mistake, because `css` is on `HTMLAttributes`, which many component props extend.

- A component that takes styles declares `css?: StyleProp` (from `@tuja/ui/types`) and composes it last on its root: `css={[styles.base, css]}`. Every `@tuja/ui` component works this way, and none takes `className` or `style`.
- Do not pass `css` to a third-party or app component that does not declare it, such as `Link`, `next/image` or a Phosphor icon. Spread instead: `<Link {...stylex.props(styles.cta)}>`.
- Do not put `className=` or `style=` beside `css=` on one element, because the compiled spread and the attribute overwrite each other. A runtime value goes in a dynamic style: `stylex.create({ swatch: (bg: string) => ({ backgroundColor: bg }) })`, then `css={[styles.tone, styles.swatch(hex)]}`. A custom property takes the same form, with a `stylex.defineVars` name: `(x: string) => ({ [vars.x]: x })`.

**StyleX ranks styles by its own order.**

- A gated hover outranks `:active` and `:focus`, because a media query ranks above each pseudo-class. Gate the press too: `":active": { default: pressed, [pointer.canHover]: pressed }`. `:focus-visible` and `:focus-within` already rank below `:hover`.
- Sibling media queries exclude each other. A `[breakpoints.md]` value beside a `[pointer.canHover]` branch stops applying on a device that can hover. Wrap the hover value instead, or repeat the sibling keys inside the branch.
- A longhand such as `paddingInline` beats the shorthand `padding`, whatever the order.

**A custom property split over two styles fails.** StyleX writes a custom property with a plain value outside its cascade layers, and one under a media or container query inside them. If one style on an element sets the plain value and another sets the conditional value, the plain value wins, whatever their order in `css`. Give the property one object, `{ default, [query] }`. Or let the `defineVars` default or an ancestor give the plain value, and give the element only the conditional value, with `default: null`.

**Order in the `css` array matters.** Compose a type role first, so a later style can change the weight. Compose `buttonReset.base` before `quietSurface.interactive`, and your own styles after it.

**A `.stylex.ts` file cannot re-export another file's tokens,** because StyleX hashes a variable from the file that defines it. Import `color` from `@tuja/ui/color.stylex` and each other token from `@tuja/ui/tokens.stylex`.

## Lint

Lint reports the design-system rules. Fix each one as its message says. The rules are in `packages/eslint-plugin/src/design-system/`, and `eslint.config.mjs` says which files each one checks.

## What lint does not check

- **Focus:** each focusable element draws the system ring. A hand-built `<button>` starts from `buttonReset.base`; anything else composes `a11y.focusRing`. Do not set `outline: none`.
- **Touch:** each control takes a 44px tap on touch. `buttonReset.base` carries it. Anything else composes `a11y.touchTarget`, or `a11y.touchRow` when it abuts its neighbours. Keep a small control away from what its hit area would cover, and out of an ancestor that clips overflow.
- **Selected state:** set `aria-pressed`, `aria-checked`, `aria-selected` or `aria-current`, and compose `quietSurface.interactive` or `selected.marked`. Do not write `isActive && styles.active`.
- **Hover that reveals:** touch gets a reveal of something the visitor needs in full. A reveal of emphasis alone stays at rest on touch, and a colour also shows on `:active`.

## References

- `references/components.md`: the catalogue of components, with a detail file for each group. It is generated: `pnpm --filter web codegen:agent-index`.
- `references/primitives.md`: which primitive to choose and in which order to compose them; the motion engine and flow blocks; Hover and Icons with code; `data-prose`; a class that a third-party stylesheet needs.
- `references/tokens.md`: where each token group is defined, and how to choose between close tokens.
