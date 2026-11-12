---
name: styling
description: How to build a screen and how to style in this project, and where its design principles live. Use it before you build or change any page, screen, form, dashboard, list or other UI, and for any style change, even a small one: styles, the look of a component, layout, responsive behaviour, hover and focus states, or motion (StyleX, tokens, the css prop). Use it also to judge whether something follows the design principles (设计原则, 空间原则), even when no style changes.
---

# Styling

`apps/web`, `apps/finance`, `apps/assistant` and `packages/ui` style with StyleX through a `css` prop. `apps/trip-planner` uses Tailwind, and this skill does not apply there.

Import paths below are `@tuja/ui` package exports. Inside `packages/ui`, import the same files by relative path.

## Build a screen from components

`@tuja/ui` has the part here that shadcn/ui has in a Tailwind repo, and it reaches further. It also has components for what a shadcn screen writes by hand with utility classes: the frame of the app (`TabView`), the top of a page (`PageHeader`), a row of figures (`StatGroup`), a row of a list (`ListRow`), a settings row, an empty state. The components carry the hierarchy, so a screen that stacks them looks right. A screen that writes its own layout and type usually looks flat.

- The components are the `./components/*` exports of `packages/ui/package.json`. The props of each one, with their doc comments, are in its source under `packages/ui/src/`.
- Start from the nearest whole screen in `apps/web/src/design-system/patterns/`: `dashboard/`, `settings/`, `list/` or `form/`. Each one has only components, and works on a phone and on a desktop.
- A `stylex.create` in a screen file is for what only that screen has, such as a chart. If you start to write gaps, type or colour for something common, look in the exports again. If it is not there, say so when you report: the fix belongs in `@tuja/ui`, so that the next screen gets it too.
- Look at the screen before you call it done, at a phone width and a desktop width.

## Navigation

Every screen outside the home page and `apps/trip-planner` sits in the same three shells, as in SwiftUI. Do not build a sidebar, a drawer, a header bar or a back link by hand.

| The screen has                                   | Use                   |
| ------------------------------------------------ | --------------------- |
| The app's few top-level destinations             | `TabView`, once       |
| A list beside its content, or a detail of a pick | `NavigationSplitView` |
| One page, with or without a way back             | `NavigationStack`     |

- The destinations and the list of a screen share one sidebar, the only region with the `color.sidebar` fill. From 48rem it stands beside the content, and the visitor can collapse it to a rail of icons. From 34rem to 48rem the destinations are that rail, and below 34rem a tab bar; there the list is the first page of the screen, and the content opens over it.
- The list beside its content is the data of the screen, such as accounts or reports, as a list of links, not the page of the list made narrow: a `NavList` of one-line rows, each a name and at most one figure, with no page title, because the destination above it names the place. Figures, charts and actions go in the content. A `NavList` shows as a `List` where it is a page. Where the page needs more than that, such as two-line rows, give each form in `UnlessStacked` and `StackedOnly`, as `net-worth-sidebar.tsx` in `apps/finance` does.
- The sections of Settings are not such a list. Settings is a page: its content is a `List` of the sections in groups, and a section opens over it with a link back, at every width. `settings-menu-page.tsx` in `apps/finance` shows this.
- A detail is a column beside the content where all fit, makes the sidebar give way to the rail where they do not, and is a sheet on a narrow screen. The shells never show the rail, a list column and the content side by side.
- To open on the content where the list has no room, give the list a URL of its own (`sidebar.href`) and the content a `back` to it, as the docs site and `patterns/dashboard/` do.
- A screen that follows another passes `back`. The shells then draw the back link, play the push and the pop, and follow a swipe from the edge.
- In an app with a server, read `SIDEBAR_COLLAPSED_COOKIE` and pass it as `defaultCollapsed`, so that the first paint has the visitor's choice.
- The `TabView` draws its `header` and `footer` more than once, and the copy in the sidebar of a screen mounts again with that screen. Hold their state, such as an open menu, above the `TabView`, as `MemberMenuProvider` in `apps/finance` does.
- For two forms of one content by the room that the view has, such as a `Table` and a `List`, use `show.wide` and `show.narrow`.

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

## Start from a component

Prefer a component. When you style an element yourself, compose primitives before you write a style of your own, such as `css={[flex.row, align.end]}`. A link or button of more than one line takes `Pager`, `Button` or `cardSurface.interactive`, so that hover responds across the whole target. `references/primitives.md` says which primitive to choose.

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

- `references/primitives.md`: which primitive to choose and in which order to compose them; the motion engine and flow blocks; Hover and Icons with code; `data-prose`; a class that a third-party stylesheet needs.
- `references/tokens.md`: where each token group is defined, and how to choose between close tokens.
