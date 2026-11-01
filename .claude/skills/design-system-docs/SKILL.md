---
name: design-system-docs
description: The standard for the public design-system docs on qingqi.dev: who the reader is, how long a page runs, how sections, specimens and code are shaped, and how to review a page. Use it whenever you create, edit, shorten, redesign or review a design-system doc page, a foundation page, a component, hook or primitive page, a specimen, Example, Showcase or UsageSnippet, or Lab copy: anything under `apps/web/src/app/[locale]/design-system/` or `apps/web/src/design-system/`, even a one-line copy change.
---

# Design-system docs

The pages under `/design-system` are public. Before you write, read the Principles page (`apps/web/src/app/[locale]/design-system/foundations/principles/page.tsx`) and look at it in the browser. It is the reference for voice and quality, and its principles, Restraint and Clarity first, are the test for every choice below.

## The reader

A visitor who wants to learn the design system: a designer or developer who is curious how it works and why. Not the owner, and not an agent working in this monorepo.

`@tuja/ui` is not published yet; only this site and the owner's own apps use it. So:

- When a page must say how to get the package, say it is not published yet and is coming soon. Never give install, set-up or build steps: a visitor cannot follow them.
- Leave monorepo internals out of copy and shown code: `workspace:*`, `catalog:`, pnpm, `apps/*`, repo paths, `#src/...` imports, page-local components a visitor cannot import, lint-rule names, what tests cover. Every snippet must read as `@tuja/ui` usage.
- Public import paths such as `@tuja/ui/components/button` or `@tuja/ui/tokens.stylex` are fine: they show the shape of the system.

## Length and shape

Fit a page into a reader's attention span: one to two screens, about 1,000–2,000px tall at 1440px. A page with a lot to say may run a little over if every section earns its place. Measure the height before and after a change: the `scrollHeight` of the page, or of its scroll region when the layout scrolls one.

- Three to five sections, one idea each. The heading states the idea as a sentence, like "Give colour a meaning.", not a topic label.
- Under the heading, at most two sentences, then one large specimen that shows the idea, so the picture alone carries it.
- At most one short code snippet, and only when the reader would copy it. At most three notes per section, one line each, only for what breaks or surprises. Use `GuideNote`, not a page-local list or table.
- Cut exhaustive lists (every token, prop, import path, consumer) and link to where the list lives: the code, the Lab, the component page. When a scale is the idea itself, show it as one visual, not rows of text.
- Cut background a reader does not need to act. Keep every fact about what breaks, shortened to one line. Do not hide content in a disclosure to meet the length; cut it.
- Do not end a page with hand-picked "where next" links: `DocArticle` already ends every page with a Previous/Next pager in sidebar order.

## Craft

- Generous space, large quiet specimens, a calm hierarchy from the type roles, `rhythm` tokens, precise alignment to the page column. Almost no boxes, borders or rules: let space and alignment do the grouping.
- Colour only where it carries a meaning, specimens included. Default to neutral looks: no accent fill, primary Button or Intent unless colour or that Intent is what the section teaches, because one coloured example pulls all the attention to itself. A neutral specimen must still be plainly visible in light and dark.
- Every specimen is made of real `@tuja/ui` components and tokens. Nothing fake or decorative.
- One moment of delight per page is welcome if it answers what a person does and stays at the edge of attention: the system's springs and effect-layer hooks, never decoration that plays by itself. Respect reduced motion.

## Code and preview

- Where the code is the lesson, use `Example`: one card, the live preview on top and the code that makes it below, so the two read as cause and effect. It takes no `code` prop; the specimen-source Babel plugin builds the code from its children, so it cannot drift from the preview. `Specimen` works the same way, with the code behind a disclosure.
- Use `UsageSnippet` only for code with no visual result, such as imports or `stylex.create`.
- Never hide the styles that carry the lesson: put them in the shown code.
- Under `/zh`, every code panel must match its preview. The plugin writes `t()` text in `Example` and `Specimen` code in the page's locale. Text you write by hand in a `UsageSnippet` does not localise: localise it yourself, or move the example into an `Example`.

## Copy

Plain words, one name for one thing, no em dashes. Native `en` and `zh` for every string (see `i18n-patterns`). When you shorten, keep every statement true.

## Review

Earlier reviews passed English code under a Chinese preview, a code fade that stopped short of its card edge, and links chosen for no reason. Each was visible on the page, but no checklist named it. So:

- Check at 375px and 1440px, light and dark, English and Chinese.
- Use the page, do not only look at it. Switch the locale and read every code panel against its preview. Scroll every scroller and see where its fade ends. Hover and tab through every link and control.
- Look close: zoom to 2x at the edges of every card, code block and scroller. A full-page screenshot hides gaps, clipping and misalignment.
- Ask why for every link, specimen and example. If the only answer is "it seemed good", replace it with a rule, such as the sidebar order, or remove it.
- Give at least one reviewer only the URLs and the Principles, not the brief: a reviewer with a checklist finds only what the checklist names.
