# UI bench

Measures how well a fresh agent builds a screen with `@tuja/ui`, against a reference of the same screen in Tailwind + shadcn/ui. Use it after a change to the components, the catalogue or the styling skill, to see whether the next screen comes out better.

- `briefs/*.md`: one screen each. A brief lists content and actions only, never a layout.
- `shadcn/*.html`: the reference build of each brief.
- `shoot.cjs <url-or-html> <name> [--dark]`: full-page shots at 1360px and 390px into `shots/`.
- `compare.cjs <screen> <prefix> [suffix]`: ours beside shadcn, desktop and phone, as `shots/compare-<prefix>-<screen>.png`.

The screens an agent writes go to `apps/web/src/app/[locale]/bench/<screen>/`. That folder and `shots/` are git-ignored: a round leaves nothing to commit.

## Run a round

1. Run `pnpm dev` in `apps/web`. `node scripts/get-worktree-port.mjs` prints the port.
2. Start a fresh agent with the prompt below, with `<screen>` and `<port>` filled in. Give it nothing else.
3. Shoot its screen: `node bench/ui/shoot.cjs http://localhost:<port>/en/bench/<screen> tuja-<screen>`. Shoot the reference once: `node bench/ui/shoot.cjs bench/ui/shadcn/<screen>.html shadcn-<screen>`.
4. Compare: `node bench/ui/compare.cjs <screen> tuja`. Read the image and the agent's report: the hand-written styles and what it did not find point at what the catalogue or the components lack.

Pick a brief that no shipped pattern answers. `report`, `settings`, `transactions` and `new-transaction` are now the Dashboard, Settings, List and Form patterns, which the skill tells the agent to copy, so they no longer test anything. `accounts` and `activity` are still unseen by the patterns.

## Prompt

> Task: build one screen in this repo with its design system (`@tuja/ui`, StyleX). Work as you normally would in this repo: its instructions for styling (AGENTS.md and the project's styling skill) apply to you. Brief: `bench/ui/briefs/<screen>.md`. It lists content and actions, not a layout; layout and look are your call. Aim for a screen a user would call good-looking and clear. File: `apps/web/src/app/[locale]/bench/<screen>/page.tsx` (new; you may add sibling files in that folder). It renders full-viewport under the locale layout with no site header, so include the app navigation the brief names. Static mock data inline. English only, plain strings. Controls may be non-functional but use the real components. It must work at 1360px desktop and at 390px phone width, light theme. To look at your page: `node bench/ui/shoot.cjs http://localhost:<port>/en/bench/<screen> tuja-<screen>`. Only touch files in that bench folder; do not look at `bench/ui/shadcn` or `bench/ui/shots`. Final report: which components you used; what you hand-wrote in `stylex.create` and why; what you looked for and did not find; how it compared with writing the same screen in Tailwind + shadcn.
